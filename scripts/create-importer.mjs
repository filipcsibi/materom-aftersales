// Creates the first importer account (afterwards, accounts are created from /admin).
// Usage: node --env-file=.env.local scripts/create-importer.mjs <email> <password> "<full name>"
import { createClient } from "@supabase/supabase-js";

const [email, password, fullName] = process.argv.slice(2);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

if (!email || !password || !fullName) {
  console.error('Usage: node --env-file=.env.local scripts/create-importer.mjs <email> <password> "<full name>"');
  process.exit(1);
}
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set (see .env.example).");
  process.exit(1);
}
if (password.length < 10) {
  console.error("Password must be at least 10 characters.");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
if (error) {
  console.error("Could not create user:", error.message);
  process.exit(1);
}

const { error: profileError } = await admin
  .from("profiles")
  .insert({ id: data.user.id, role: "importer", dealer_id: null, full_name: fullName, email });
if (profileError) {
  await admin.auth.admin.deleteUser(data.user.id);
  console.error("Could not create profile:", profileError.message);
  process.exit(1);
}

console.log(`Importer account created: ${email}`);
