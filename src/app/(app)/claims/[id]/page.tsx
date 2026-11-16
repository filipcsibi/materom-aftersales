import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  BASIC_GRID,
  BASIC_WIDE,
  CLAIM_CATEGORIES,
  CLAIM_FIELD_NAMES,
  DISTRIBUTOR,
  LABOR_COLUMNS,
  MATERIAL_COLUMNS,
  MATERIAL_HEADER_FIELDS,
  OTHER_FEE,
  OTHER_FEE_REASON,
  SUB_MATERIAL_COLUMNS,
  VEHICLE_FIELDS,
  VIN_FIELD,
  claimAmounts,
  emptyClaimFields,
  CLAIM_STATUS_LABEL,
  IMPORTER_STATUSES,
  type ClaimFieldDef,
  type ClaimFieldName,
  type ClaimStatus,
  type LineRow,
} from "@/lib/claim-fields";
import { CLAIM_SOURCE } from "@/lib/sources";
import { formatDateTime } from "@/lib/format";
import type { Attachment } from "@/lib/types";
import { ClaimAmount, ClaimForm } from "@/components/claim-form";
import { LineItemsView } from "@/components/line-items";
import { AttachedList } from "@/components/attached-list";
import { CopyButton } from "@/components/copy-button";
import { ClaimStatusBadge, ClaimStatusBanner } from "@/components/claim-status";
import { setClaimStatus } from "../actions";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Claim = {
  id: string;
  claim_no: string | null;
  status: ClaimStatus;
  status_note: string | null;
  status_changed_at: string | null;
  submitted_at: string | null;
  no_part: boolean;
  materials: LineRow[];
  labor_items: LineRow[];
  sub_materials: LineRow[];
  dealer: { name: string } | null;
} & Record<ClaimFieldName, string | number | null>;

export default async function ClaimPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.test(id)) notFound();

  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: claimData }, { data: attData }] = await Promise.all([
    supabase.from("claims").select("*, dealer:dealers(name)").eq("id", id).maybeSingle(),
    supabase
      .from("claim_attachments")
      .select("id, category, kind, storage_path, file_name, mime_type, size_bytes")
      .eq("claim_id", id)
      .order("created_at"),
  ]);
  if (!claimData) notFound();

  const claim = claimData as unknown as Claim;
  const attachments = (attData ?? []) as Attachment[];
  const text = (name: ClaimFieldName) => {
    const v = claim[name];
    return v === null || v === undefined ? "" : String(v);
  };

  const back = (
    <Link href="/claims" className="text-sm text-gray-500 hover:text-primary">
      ← Claim Management
    </Link>
  );

  const isImporter = profile.role === "importer";

  // The dealer keeps editing until the importer approves the claim.
  if (!isImporter && claim.status !== "approved") {
    const fields = emptyClaimFields();
    for (const name of CLAIM_FIELD_NAMES) fields[name] = text(name);
    return (
      <div className="space-y-4">
        {back}
        {claim.status !== "draft" && (
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold">{claim.claim_no}</h1>
            <ClaimStatusBadge status={claim.status} />
          </div>
        )}
        <ClaimStatusBanner status={claim.status} note={claim.status_note} />
        <ClaimForm
          key={claim.status}
          claimId={claim.id}
          claimNo={claim.claim_no}
          status={claim.status}
          dealerName={claim.dealer?.name ?? ""}
          attachments={attachments}
          initial={{
            fields,
            no_part: claim.no_part,
            materials: claim.materials,
            labor_items: claim.labor_items,
            sub_materials: claim.sub_materials,
          }}
        />
      </div>
    );
  }

  const item = (f: ClaimFieldDef, wide = false) => {
    const value = text(f.name);
    return (
      <div key={f.name} className={wide ? "sm:col-span-2" : ""}>
        <dt className="text-xs text-gray-500">{f.label}</dt>
        <dd className="group mt-0.5 flex items-start gap-2 text-sm">
          <span className="min-w-0 whitespace-pre-wrap break-words">{value || "—"}</span>
          {value && <CopyButton text={value} />}
        </dd>
      </div>
    );
  };
  const fixed = (label: string, value: string) => (
    <div key={label}>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm">{value || "—"}</dd>
    </div>
  );

  return (
    <div className="space-y-4">
      {back}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">{claim.claim_no}</h1>
        <ClaimStatusBadge status={claim.status} />
        <span className="text-sm text-gray-500">
          {claim.dealer?.name} · trimis {formatDateTime(claim.submitted_at)}
        </span>
      </div>

      {isImporter ? (
        <form action={setClaimStatus.bind(null, claim.id)} className="card space-y-3 px-6 py-5">
          <h2 className="text-base font-semibold">Status cerere</h2>
          <div className="grid gap-3 sm:grid-cols-[14rem_minmax(0,1fr)]">
            <div>
              <label htmlFor="claim-status" className="mb-1 block text-sm font-medium">
                Status
              </label>
              <select id="claim-status" name="status" defaultValue={claim.status} className="input">
                {IMPORTER_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {CLAIM_STATUS_LABEL[st]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="claim-note" className="mb-1 block text-sm font-medium">
                Notă pentru dealer <span className="font-normal text-gray-400">(opțional)</span>
              </label>
              <textarea
                id="claim-note"
                name="status_note"
                rows={2}
                maxLength={2000}
                defaultValue={claim.status_note ?? ""}
                placeholder="De exemplu: ce trebuie corectat"
                className="input"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button className="btn btn-primary">Salvează statusul</button>
            <span className="text-xs text-gray-500">
              Dealerul poate modifica cererea cât timp nu este „Aprobat”.
              {claim.status_changed_at && ` Ultima schimbare: ${formatDateTime(claim.status_changed_at)}.`}
            </span>
          </div>
        </form>
      ) : (
        <ClaimStatusBanner status={claim.status} note={claim.status_note} />
      )}

      <div>
        <div className="min-w-0 space-y-4">
          <section className="card">
            <h2 className="card-title">Basic Information</h2>
            <dl className="grid gap-x-6 gap-y-4 px-6 py-6 sm:grid-cols-2">
              {item(VIN_FIELD, true)}
              {BASIC_GRID.map((f) =>
                f === null
                  ? null
                  : f === "app_no"
                    ? fixed("App No.", claim.claim_no ?? "")
                    : f === "dealer"
                      ? fixed("Dealer", claim.dealer?.name ?? "")
                      : item(f),
              )}
              {BASIC_WIDE.map((f) => item(f, true))}
              {item(OTHER_FEE)}
              {item(OTHER_FEE_REASON, true)}
            </dl>
          </section>

          <section className="card">
            <h2 className="card-title">Vehicle Info</h2>
            <dl className="grid gap-x-6 gap-y-4 px-6 py-6 sm:grid-cols-2">
              {VEHICLE_FIELDS.map((f) => item(f))}
              {fixed("Distributor", DISTRIBUTOR)}
            </dl>
          </section>

          <section className="card">
            <h2 className="card-title">Material List</h2>
            <div className="space-y-4 px-6 py-6">
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">{MATERIAL_HEADER_FIELDS.map((f) => item(f))}</dl>
              {claim.no_part ? (
                <p className="text-sm font-medium">No Part WorkItem</p>
              ) : (
                <LineItemsView
                  columns={MATERIAL_COLUMNS}
                  rows={claim.materials}
                  total={{ label: "Total Material Fees", multiply: ["quantity", "unit_price"] }}
                />
              )}
            </div>
          </section>

          <section className="card">
            <h2 className="card-title">Attached List</h2>
            <div className="px-6 py-6">
              <AttachedList
                ticketId={claim.id}
                initial={attachments}
                editable={false}
                source={CLAIM_SOURCE}
                categories={CLAIM_CATEGORIES}
              />
            </div>
          </section>

          <section className="card">
            <h2 className="card-title">Item List</h2>
            <div className="px-6 py-6">
              <LineItemsView
                columns={LABOR_COLUMNS}
                rows={claim.labor_items}
                total={{ label: "Labor Fee", multiply: ["labor_hour", "unit_price"] }}
              />
            </div>
          </section>

          <section className="card">
            <h2 className="card-title">Sub-Material List</h2>
            <div className="px-6 py-6">
              <LineItemsView
                columns={SUB_MATERIAL_COLUMNS}
                rows={claim.sub_materials}
                total={{ label: "Total Material Fees", multiply: ["quantity", "unit_price"] }}
              />
            </div>
          </section>

          <ClaimAmount amounts={claimAmounts({ ...claim, other_fee: claim.other_fee })} />
        </div>
      </div>
    </div>
  );
}
