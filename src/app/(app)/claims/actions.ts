"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  CLAIM_DEFAULT_BRAND,
  IMPORTER_STATUSES,
  claimToRow,
  parseClaim,
  validateClaimForSubmit,
  type ClaimFieldName,
} from "@/lib/claim-fields";
import { CLAIM_SOURCE } from "@/lib/sources";

export type ClaimSaveResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
      fieldErrors?: Partial<Record<ClaimFieldName, string>>;
      listErrors?: string[];
    };

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function createClaimDraft() {
  const profile = await requireProfile();
  if (profile.role !== "dealer") redirect("/claims");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("claims")
    .insert({ brand: CLAIM_DEFAULT_BRAND, dealer_id: profile.dealer_id, created_by: profile.id })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  redirect(`/claims/${data.id}`);
}

export async function saveClaim(id: string, input: unknown, submit: boolean): Promise<ClaimSaveResult> {
  const profile = await requireProfile();
  if (profile.role !== "dealer") return { ok: false, error: "Doar dealerul poate edita cererea." };
  if (!uuid.test(id)) return { ok: false, error: "Cerere invalidă." };

  const values = parseClaim(input);
  if (!values) return { ok: false, error: "Date invalide." };

  const supabase = await createClient();

  const { data: current } = await supabase.from("claims").select("status").eq("id", id).maybeSingle();
  if (!current) return { ok: false, error: "Cerere invalidă." };
  if (current.status === "approved") return { ok: false, error: "Cererea este aprobată și nu mai poate fi editată." };
  // "Save" without validation exists only for drafts; a submitted claim must stay complete.
  if (current.status !== "draft") submit = true;

  if (submit) {
    const errors = validateClaimForSubmit(values);
    if (Object.keys(errors.fields).length > 0 || errors.lists.length > 0) {
      // Keep what was typed even though it cannot be submitted yet.
      if (current.status === "draft") {
        await supabase.from("claims").update(claimToRow(values)).eq("id", id).eq("status", "draft");
      }
      return {
        ok: false,
        error: "Completează câmpurile obligatorii marcate cu *.",
        fieldErrors: errors.fields,
        listErrors: errors.lists,
      };
    }
  }

  const { data, error } = await supabase
    .from("claims")
    .update({ ...claimToRow(values), status: submit ? "pending" : "draft" })
    .eq("id", id)
    .neq("status", "approved")
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) return { ok: false, error: "Cererea nu mai poate fi editată." };

  revalidatePath("/claims");
  revalidatePath(`/claims/${id}`);
  return { ok: true };
}

export async function deleteClaimDraft(id: string) {
  const profile = await requireProfile();
  if (profile.role !== "dealer" || !uuid.test(id)) redirect("/claims");

  const supabase = await createClient();
  const { data: claim } = await supabase
    .from("claims")
    .select("id")
    .eq("id", id)
    .eq("status", "draft")
    .maybeSingle();
  if (!claim) redirect("/claims");

  const { data: atts } = await supabase.from("claim_attachments").select("storage_path").eq("claim_id", id);
  const paths = (atts ?? []).map((a) => a.storage_path);
  if (paths.length > 0) await supabase.storage.from(CLAIM_SOURCE.bucket).remove(paths);

  const { error } = await supabase.from("claims").delete().eq("id", id).eq("status", "draft");
  if (error) throw new Error(error.message);

  revalidatePath("/claims");
  redirect("/claims?status=draft");
}

export async function setClaimStatus(id: string, formData: FormData) {
  const profile = await requireProfile();
  if (profile.role !== "importer" || !uuid.test(id)) return;

  const status = String(formData.get("status") ?? "");
  if (!(IMPORTER_STATUSES as string[]).includes(status)) return;
  const note = String(formData.get("status_note") ?? "").trim().slice(0, 2000);

  const supabase = await createClient();
  const { error } = await supabase
    .from("claims")
    .update({ status, status_note: note || null })
    .eq("id", id)
    .neq("status", "draft");
  if (error) throw new Error(error.message);

  revalidatePath("/claims");
  revalidatePath(`/claims/${id}`);
}
