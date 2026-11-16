import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "importer" | "dealer";

export type Profile = {
  id: string;
  role: Role;
  dealer_id: string | null;
  full_name: string;
  email: string;
  dealer: { id: string; name: string; code: string | null } | null;
};

/** Current user's profile, or null when signed out / no profile row. */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, dealer_id, full_name, email, dealer:dealers(id, name, code)")
    .eq("id", userId)
    .maybeSingle();

  return (profile as unknown as Profile) ?? null;
});

export async function requireProfile(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/no-access");
  return profile;
}

export async function requireImporter(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== "importer") redirect("/technical-support");
  return profile;
}
