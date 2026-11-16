import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { signOut } from "../login/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();

  return (
    <>
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/technical-support" className="font-semibold">
            Lepas Aftersales
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/technical-support" className="hover:text-primary">
              Technical After Services
            </Link>
            <Link href="/claims" className="hover:text-primary">
              Claim Management
            </Link>
            {profile.role === "importer" && (
              <Link href="/admin" className="hover:text-primary">
                Dealeri și conturi
              </Link>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <Link href="/account" className="text-right leading-tight hover:text-primary">
              <span className="block font-medium">{profile.full_name}</span>
              <span className="block text-xs text-gray-500">
                {profile.role === "importer" ? "Importator" : (profile.dealer?.name ?? "Dealer")}
              </span>
            </Link>
            <form action={signOut}>
              <button className="btn">Deconectare</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}
