import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { ClaimStatusBadge } from "@/components/claim-status";
import type { ClaimStatus } from "@/lib/claim-fields";
import { createClaimDraft } from "./actions";

type Row = {
  id: string;
  claim_no: string | null;
  status: ClaimStatus;
  vin: string | null;
  claim_type: string | null;
  repair_order_no: string | null;
  updated_at: string;
  submitted_at: string | null;
  dealer: { name: string } | null;
};

export default async function ClaimsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const profile = await requireProfile();
  const sp = await searchParams;
  const isDealer = profile.role === "dealer";

  const tabs = [
    { key: "pending", label: "În așteptare" },
    { key: "rejected", label: "Respinse" },
    { key: "approved", label: "Aprobate" },
    ...(isDealer ? [{ key: "draft", label: "Ciorne" }] : []),
    { key: "all", label: "Toate" },
  ];
  const status = tabs.some((t) => t.key === sp.status) ? sp.status! : "all";
  // Strip characters that have a meaning in PostgREST filter syntax.
  const q = (sp.q ?? "").replace(/[^\p{L}\p{N}\s\-_.]/gu, "").trim().slice(0, 60);

  const supabase = await createClient();
  let query = supabase
    .from("claims")
    .select(
      "id, claim_no, status, vin, claim_type, repair_order_no, updated_at, submitted_at, dealer:dealers(name)",
    )
    .order("updated_at", { ascending: false })
    .limit(200);
  if (status !== "all") query = query.eq("status", status);
  if (q) query = query.or(`vin.ilike.%${q}%,claim_no.ilike.%${q}%,repair_order_no.ilike.%${q}%`);

  const { data, error } = await query;
  const rows = (data ?? []) as unknown as Row[];

  const href = (s: string) => {
    const p = new URLSearchParams();
    if (s !== "all") p.set("status", s);
    if (q) p.set("q", q);
    const qs = p.toString();
    return qs ? `/claims?${qs}` : "/claims";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">Claim Management</h1>
        {isDealer && (
          <form action={createClaimDraft} className="ml-auto">
            <button className="btn btn-primary">+ Cerere nouă</button>
          </form>
        )}
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
          <div className="flex gap-1 text-sm">
            {tabs.map((t) => (
              <Link
                key={t.key}
                href={href(t.key)}
                className={`rounded-md px-3 py-1.5 ${
                  status === t.key ? "bg-primary/10 font-medium text-primary" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {t.label}
              </Link>
            ))}
          </div>
          <form className="ml-auto flex gap-2" action="/claims">
            {status !== "all" && <input type="hidden" name="status" value={status} />}
            <input name="q" defaultValue={q} placeholder="Caută VIN, număr, comandă" className="input w-56" />
            <button className="btn">Caută</button>
          </form>
        </div>

        {error ? (
          <p className="p-6 text-sm text-danger">Eroare la încărcare: {error.message}</p>
        ) : rows.length === 0 ? (
          <p className="p-10 text-center text-sm text-gray-500">Nicio cerere.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2 font-medium">App No.</th>
                  {!isDealer && <th className="px-4 py-2 font-medium">Dealer</th>}
                  <th className="px-4 py-2 font-medium">VIN</th>
                  <th className="px-4 py-2 font-medium">Claim Types</th>
                  <th className="px-4 py-2 font-medium">Repair Order No.</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Ultima activitate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((t) => {
                  return (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5">
                        <Link href={`/claims/${t.id}`} className="font-medium text-primary hover:underline">
                          {t.claim_no ?? "Ciornă"}
                        </Link>
                      </td>
                      {!isDealer && <td className="px-4 py-2.5">{t.dealer?.name ?? "—"}</td>}
                      <td className="px-4 py-2.5 font-mono text-xs">{t.vin ?? "—"}</td>
                      <td className="max-w-xs truncate px-4 py-2.5">{t.claim_type ?? "—"}</td>
                      <td className="px-4 py-2.5">{t.repair_order_no ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <ClaimStatusBadge status={t.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-gray-600">
                        {formatDateTime(t.updated_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
