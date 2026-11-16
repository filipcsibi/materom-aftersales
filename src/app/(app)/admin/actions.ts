"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActionState = { ok: boolean; message: string } | null;

async function assertImporter() {
  const profile = await getProfile();
  return profile?.role === "importer";
}

const dealerSchema = z.object({
  name: z.string().trim().min(2, "Numele dealerului este obligatoriu.").max(120),
  code: z.string().trim().max(40),
});

export async function createDealer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await assertImporter())) return { ok: false, message: "Acces interzis." };
  const parsed = dealerSchema.safeParse({ name: formData.get("name"), code: formData.get("code") ?? "" });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("dealers")
    .insert({ name: parsed.data.name, code: parsed.data.code || null });
  if (error) {
    return { ok: false, message: error.code === "23505" ? "Există deja un dealer cu acest cod." : error.message };
  }
  revalidatePath("/admin");
  return { ok: true, message: `Dealerul „${parsed.data.name}” a fost adăugat.` };
}

const userSchema = z.object({
  full_name: z.string().trim().min(2, "Numele este obligatoriu.").max(120),
  email: z.email("Email invalid.").trim().toLowerCase(),
  password: z.string().min(10, "Parola trebuie să aibă cel puțin 10 caractere.").max(72),
  role: z.enum(["dealer", "importer"]),
  dealer_id: z.string(),
});

export async function createUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await assertImporter())) return { ok: false, message: "Acces interzis." };
  const parsed = userSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    dealer_id: formData.get("dealer_id") ?? "",
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { full_name, email, password, role } = parsed.data;
  const dealer_id = role === "dealer" ? parsed.data.dealer_id : null;
  if (role === "dealer" && !z.uuid().safeParse(dealer_id).success) {
    return { ok: false, message: "Alege dealerul pentru acest cont." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) {
    return { ok: false, message: error?.message ?? "Contul nu a putut fi creat." };
  }
  const { error: profileError } = await admin
    .from("profiles")
    .insert({ id: data.user.id, role, dealer_id, full_name, email });
  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { ok: false, message: profileError.message };
  }

  revalidatePath("/admin");
  return { ok: true, message: `Contul ${email} a fost creat. Transmite-i parola utilizatorului.` };
}

const passwordSchema = z.object({
  user_id: z.uuid(),
  password: z.string().min(10, "Parola trebuie să aibă cel puțin 10 caractere.").max(72),
});

export async function resetPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await assertImporter())) return { ok: false, message: "Acces interzis." };
  const parsed = passwordSchema.safeParse({
    user_id: formData.get("user_id"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(parsed.data.user_id, {
    password: parsed.data.password,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Parola a fost schimbată." };
}
