import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { signOut } from "../login/actions";

export default async function NoAccessPage() {
  if (await getProfile()) redirect("/technical-support");

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="card w-full max-w-sm p-8">
        <h1 className="text-lg font-semibold">Cont fără acces</h1>
        <p className="mb-6 mt-2 text-sm text-gray-600">
          Contul tău nu este asociat unui dealer sau importatorului. Contactează importatorul.
        </p>
        <form action={signOut}>
          <button className="btn w-full">Deconectare</button>
        </form>
      </div>
    </main>
  );
}
