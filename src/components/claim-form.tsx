"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BASIC_GRID,
  BASIC_WIDE,
  CLAIM_CATEGORIES,
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
  money,
  type ClaimFieldDef,
  type ClaimFieldName,
  type ClaimStatus,
  type ClaimValues,
} from "@/lib/claim-fields";
import { GDPR_NOTE } from "@/lib/ticket-fields";
import { CLAIM_SOURCE } from "@/lib/sources";
import type { Attachment } from "@/lib/types";
import { deleteClaimDraft, saveClaim } from "@/app/(app)/claims/actions";
import { AttachedList } from "./attached-list";
import { Field, Row } from "./form-field";
import { LineItems } from "./line-items";

export function ClaimForm({
  claimId,
  claimNo,
  status,
  dealerName,
  initial,
  attachments,
}: {
  claimId: string;
  claimNo: string | null;
  status: ClaimStatus;
  dealerName: string;
  initial: ClaimValues;
  attachments: Attachment[];
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<ClaimFieldName, string>>>({});
  const [listErrors, setListErrors] = useState<string[]>([]);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"save" | "submit" | "delete" | null>(null);
  const isDraft = status === "draft";

  function setField(name: ClaimFieldName, value: string) {
    setValues((v) => ({ ...v, fields: { ...v.fields, [name]: value } }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }));
  }

  function run(submit: boolean) {
    setMode(submit ? "submit" : "save");
    setMessage(null);
    startTransition(async () => {
      const res = await saveClaim(claimId, values, submit);
      if (res.ok) {
        setErrors({});
        setListErrors([]);
        if (!isDraft) setMessage({ kind: "ok", text: "Modificările au fost trimise importatorului." });
        else if (!submit) setMessage({ kind: "ok", text: "Ciorna a fost salvată." });
        if (submit) router.refresh();
      } else {
        setErrors(res.fieldErrors ?? {});
        setListErrors(res.listErrors ?? []);
        setMessage({ kind: "error", text: res.error });
      }
    });
  }

  function remove() {
    if (!window.confirm("Ștergi definitiv această ciornă?")) return;
    setMode("delete");
    startTransition(() => deleteClaimDraft(claimId));
  }

  const field = (f: ClaimFieldDef) => (
    <Field
      key={f.name}
      def={f}
      value={values.fields[f.name]}
      error={errors[f.name]}
      onChange={(v) => setField(f.name, v)}
    />
  );

  const amounts = claimAmounts({ ...values, other_fee: values.fields.other_fee });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(true);
      }}
      noValidate
    >
      <section className="card">
        <h2 className="card-title">Basic Information</h2>
        <div className="space-y-3 px-6 py-6">
          {field(VIN_FIELD)}
          <div className="grid gap-x-6 gap-y-3 lg:grid-cols-2">
            {BASIC_GRID.map((f, i) =>
              f === null ? (
                <div key={i} className="hidden lg:block" />
              ) : f === "app_no" ? (
                <Row key="app_no" label="App No.">
                  <span className="block py-1.5 text-sm text-gray-600">{claimNo ?? "Not Generated Yet"}</span>
                </Row>
              ) : f === "dealer" ? (
                <Row key="dealer" label="Dealer" required>
                  <input value={dealerName} disabled aria-label="Dealer" className="input" />
                </Row>
              ) : (
                field(f)
              ),
            )}
          </div>
          {BASIC_WIDE.map(field)}
          <div className="grid gap-x-6 gap-y-3 lg:grid-cols-2">{field(OTHER_FEE)}</div>
          {field(OTHER_FEE_REASON)}
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">Vehicle Info</h2>
        <div className="space-y-3 px-6 py-6">
          <div className="grid gap-x-6 gap-y-3 lg:grid-cols-2">
            {VEHICLE_FIELDS.map(field)}
            <Row label="Distributor">
              <span className="block py-1.5 text-sm text-gray-600">{DISTRIBUTOR}</span>
            </Row>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-6 py-4">
          <h2 className="text-base font-semibold">Material List</h2>
          <span className="text-sm text-gray-500">
            please directly select “No Part WorkItem” if the no part warranty occur
          </span>
          <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={values.no_part}
              onChange={(e) => setValues((v) => ({ ...v, no_part: e.target.checked }))}
              className="h-4 w-4"
            />
            No Part WorkItem
          </label>
        </div>
        <div className="space-y-4 px-6 py-6">
          <div className="grid gap-x-6 gap-y-3 lg:grid-cols-2">{MATERIAL_HEADER_FIELDS.map(field)}</div>
          {values.no_part ? (
            <p className="rounded-md bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
              No Part WorkItem — fără materiale pe această cerere.
            </p>
          ) : (
            <LineItems
              columns={MATERIAL_COLUMNS}
              rows={values.materials}
              onChange={(materials) => setValues((v) => ({ ...v, materials }))}
              addLabel="Add Material"
              total={{ label: "Total Material Fees", multiply: ["quantity", "unit_price"] }}
            />
          )}
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">Attached List</h2>
        <div className="space-y-5 px-6 py-6">
          <p className="text-sm leading-7 text-gray-700">{GDPR_NOTE}</p>
          <AttachedList
            ticketId={claimId}
            initial={attachments}
            editable
            source={CLAIM_SOURCE}
            categories={CLAIM_CATEGORIES}
          />
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">Item List</h2>
        <div className="px-6 py-6">
          <LineItems
            columns={LABOR_COLUMNS}
            rows={values.labor_items}
            onChange={(labor_items) => setValues((v) => ({ ...v, labor_items }))}
            addLabel="Add An Item"
            total={{ label: "Labor Fee", multiply: ["labor_hour", "unit_price"] }}
          />
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">Sub-Material List</h2>
        <div className="px-6 py-6">
          <LineItems
            columns={SUB_MATERIAL_COLUMNS}
            rows={values.sub_materials}
            onChange={(sub_materials) => setValues((v) => ({ ...v, sub_materials }))}
            addLabel="Add Sub-Material"
            total={{ label: "Total Material Fees", multiply: ["quantity", "unit_price"] }}
          />
        </div>
      </section>

      <ClaimAmount amounts={amounts} />

      {listErrors.length > 0 && (
        <ul className="card list-disc space-y-1 border-danger px-10 py-4 text-sm text-danger">
          {listErrors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <div className="card sticky bottom-0 flex flex-wrap items-center gap-3 px-6 py-4">
        {isDraft && (
          <button type="button" onClick={remove} disabled={pending} className="btn btn-danger">
            {pending && mode === "delete" ? "Se șterge…" : "Șterge ciorna"}
          </button>
        )}
        {message && (
          <p role="status" className={`text-sm ${message.kind === "ok" ? "text-green-700" : "text-danger"}`}>
            {message.text}
          </p>
        )}
        <div className="ml-auto flex gap-3">
          {isDraft && (
            <button type="button" onClick={() => run(false)} disabled={pending} className="btn">
              {pending && mode === "save" ? "Saving…" : "Save"}
            </button>
          )}
          <button type="submit" disabled={pending} className="btn btn-primary">
            {pending && mode === "submit" ? "Submitting…" : isDraft ? "Save And Submit" : "Save And Resubmit"}
          </button>
        </div>
      </div>
    </form>
  );
}

export function ClaimAmount({ amounts }: { amounts: ReturnType<typeof claimAmounts> }) {
  const items: [string, number][] = [
    ["Labor Fee", amounts.labor],
    ["Material Fee", amounts.material],
    ["Sub-material Fee", amounts.subMaterial],
    ["Administration Fee", amounts.administration],
    ["Other Fee", amounts.other],
    ["Total Fees", amounts.total],
  ];
  return (
    <section className="card">
      <h2 className="card-title">Claim Amount</h2>
      <dl className="grid gap-x-6 gap-y-3 px-6 py-6 sm:grid-cols-2">
        {items.map(([label, value]) => (
          <div key={label} className="flex items-baseline gap-3">
            <dt className="w-40 text-sm text-gray-600 sm:text-right">{label}:</dt>
            <dd className={`tabular-nums ${label === "Total Fees" ? "font-semibold" : ""}`}>{money(value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
