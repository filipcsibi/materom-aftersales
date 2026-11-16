import { requireImporter } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DealerForm, ResetPasswordForm, UserForm } from "./forms";

type UserRow = {
  id: string;
  role: "importer" | "dealer";
  full_name: string;
  email: string;
  dealer: { name: string } | null;
};

export default async function AdminPage() {
  await requireImporter();
  const supabase = await createClient();

  const [{ data: dealerData }, { data: userData }] = await Promise.all([
    supabase.from("dealers").select("id, name, code").order("name"),
    supabase.from("profiles").select("id, role, full_name, email, dealer:dealers(name)").order("full_name"),
  ]);
  const dealers = dealerData ?? [];
  const users = (userData ?? []) as unknown as UserRow[];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Dealeri și conturi</h1>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <section className="card">
          <h2 className="card-title">Dealer nou</h2>
          <div className="p-6">
            <DealerForm />
          </div>
        </section>
        <section className="card">
          <h2 className="card-title">Cont nou</h2>
          <div className="p-6">
            <UserForm dealers={dealers.map((d) => ({ id: d.id, name: d.name }))} />
          </div>
        </section>
      </div>

      <section className="card">
        <h2 className="card-title">Dealeri ({dealers.length})</h2>
        {dealers.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">Niciun dealer încă. Adaugă primul dealer mai sus.</p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {dealers.map((d) => (
              <li key={d.id} className="flex gap-3 px-6 py-2.5">
                <span className="font-medium">{d.name}</span>
                {d.code && <span className="text-gray-500">{d.code}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2 className="card-title">Conturi ({users.length})</h2>
        <ul className="divide-y divide-line text-sm">
          {users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-6 py-2.5">
              <span className="font-medium">{u.full_name}</span>
              <span className="text-gray-600">{u.email}</span>
              <span className="badge bg-gray-100 text-gray-700">
                {u.role === "importer" ? "Importator" : (u.dealer?.name ?? "Dealer")}
              </span>
              <span className="ml-auto">
                <ResetPasswordForm userId={u.id} />
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
