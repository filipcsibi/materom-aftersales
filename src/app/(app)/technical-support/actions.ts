"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  ATTACHMENT_CATEGORIES,
  BUCKET,
  DEFAULT_BRAND,
  parseValues,
  toRow,
  validateForSubmit,
  type FieldName,
} from "@/lib/ticket-fields";

export type SaveResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
      fieldErrors?: Partial<Record<FieldName, string>>;
      missingAttachments?: string[];
    };

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function createDraft() {
  const profile = await requireProfile();
  if (profile.role !== "dealer") redirect("/technical-support");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tech_tickets")
    .insert({ brand: DEFAULT_BRAND, dealer_id: profile.dealer_id, created_by: profile.id })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  redirect(`/technical-support/${data.id}`);
}

export async function saveTicket(id: string, input: unknown, submit: boolean): Promise<SaveResult> {
  const profile = await requireProfile();
  if (profile.role !== "dealer") return { ok: false, error: "Doar dealerul poate edita tichetul." };
  if (!uuid.test(id)) return { ok: false, error: "Tichet invalid." };

  const values = parseValues(input);
  if (!values) return { ok: false, error: "Date invalide." };

  const supabase = await createClient();

  if (submit) {
    const fieldErrors = validateForSubmit(values);

    const { data: atts, error: attErr } = await supabase
      .from("tech_attachments")
      .select("category")
      .eq("ticket_id", id);
    if (attErr) return { ok: false, error: attErr.message };
    const present = new Set((atts ?? []).map((a) => a.category));
    const missingAttachments = ATTACHMENT_CATEGORIES.filter((c) => c.required && !present.has(c.key)).map(
      (c) => c.key,
    );

    if (Object.keys(fieldErrors).length > 0 || missingAttachments.length > 0) {
      // Keep what was typed even though it cannot be submitted yet.
      await supabase.from("tech_tickets").update(toRow(values)).eq("id", id).eq("status", "draft");
      return {
        ok: false,
        error: "Completează câmpurile obligatorii și atașamentele marcate cu *.",
        fieldErrors,
        missingAttachments,
      };
    }
  }

  const { data, error } = await supabase
    .from("tech_tickets")
    .update({ ...toRow(values), status: submit ? "open" : "draft" })
    .eq("id", id)
    .eq("status", "draft")
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) return { ok: false, error: "Tichetul nu mai poate fi editat." };

  revalidatePath("/technical-support");
  revalidatePath(`/technical-support/${id}`);
  return { ok: true };
}

export async function deleteDraft(id: string) {
  const profile = await requireProfile();
  if (profile.role !== "dealer" || !uuid.test(id)) redirect("/technical-support");

  const supabase = await createClient();
  const { data: ticket } = await supabase
    .from("tech_tickets")
    .select("id")
    .eq("id", id)
    .eq("status", "draft")
    .maybeSingle();
  if (!ticket) redirect("/technical-support");

  const { data: atts } = await supabase.from("tech_attachments").select("storage_path").eq("ticket_id", id);
  const paths = (atts ?? []).map((a) => a.storage_path);
  if (paths.length > 0) await supabase.storage.from(BUCKET).remove(paths);

  const { error } = await supabase.from("tech_tickets").delete().eq("id", id).eq("status", "draft");
  if (error) throw new Error(error.message);

  revalidatePath("/technical-support");
  redirect("/technical-support?status=draft");
}

export async function setTicketStatus(id: string, status: "open" | "closed") {
  const profile = await requireProfile();
  if (profile.role !== "importer" || !uuid.test(id)) return;
  if (status !== "open" && status !== "closed") return;

  const supabase = await createClient();
  const { error } = await supabase.from("tech_tickets").update({ status }).eq("id", id).neq("status", "draft");
  if (error) throw new Error(error.message);

  revalidatePath("/technical-support");
  revalidatePath(`/technical-support/${id}`);
}
