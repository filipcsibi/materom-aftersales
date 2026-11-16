import { requireProfile } from "@/lib/auth";
import { PasswordForm } from "./password-form";

export default async function AccountPage() {
  const profile = await requireProfile();
  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-xl font-semibold">Contul meu</h1>
      <section className="card p-6 text-sm">
        <p className="font-medium">{profile.full_name}</p>
        <p className="text-gray-600">{profile.email}</p>
        <p className="mt-1 text-gray-500">
          {profile.role === "importer" ? "Importator" : `Dealer · ${profile.dealer?.name ?? ""}`}
        </p>
      </section>
      <section className="card">
        <h2 className="card-title">Schimbă parola</h2>
        <div className="p-6">
          <PasswordForm />
        </div>
      </section>
    </div>
  );
}
