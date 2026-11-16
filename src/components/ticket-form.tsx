"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BOTTOM_FIELDS,
  GDPR_NOTE,
  GRID_FIELDS,
  TOP_FIELDS,
  type FieldName,
  type TicketValues,
} from "@/lib/ticket-fields";
import type { Attachment } from "@/lib/types";
import { deleteDraft, saveTicket } from "@/app/(app)/technical-support/actions";
import { AttachedList } from "./attached-list";
import { Field, Row, type FormFieldDef } from "./form-field";

export function TicketForm({
  ticketId,
  initialValues,
  attachments,
}: {
  ticketId: string;
  initialValues: TicketValues;
  attachments: Attachment[];
}) {
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [missing, setMissing] = useState<string[]>([]);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"save" | "submit" | "delete" | null>(null);

  function set(name: FieldName, value: string) {
    setValues((v) => ({ ...v, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }));
  }

  function run(submit: boolean) {
    setMode(submit ? "submit" : "save");
    setMessage(null);
    startTransition(async () => {
      const res = await saveTicket(ticketId, values, submit);
      if (res.ok) {
        setErrors({});
        setMissing([]);
        if (submit) router.refresh();
        else setMessage({ kind: "ok", text: "Ciorna a fost salvată." });
      } else {
        setErrors(res.fieldErrors ?? {});
        setMissing(res.missingAttachments ?? []);
        setMessage({ kind: "error", text: res.error });
      }
    });
  }

  function remove() {
    if (!window.confirm("Ștergi definitiv această ciornă?")) return;
    setMode("delete");
    startTransition(() => deleteDraft(ticketId));
  }

  const field = (f: FormFieldDef & { name: FieldName }) => (
    <Field key={f.name} def={f} value={values[f.name]} error={errors[f.name]} onChange={(v) => set(f.name, v)} />
  );

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
          {TOP_FIELDS.map(field)}
          <div className="grid gap-x-6 gap-y-3 lg:grid-cols-2">
            {GRID_FIELDS.map((f) =>
              f === "no" ? (
                <Row key="no" label="No.">
                  <span className="py-1.5 text-sm text-gray-600">Not Generated Yet</span>
                </Row>
              ) : (
                field(f)
              ),
            )}
          </div>
          {BOTTOM_FIELDS.map(field)}
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">Attached List</h2>
        <div className="space-y-5 px-6 py-6">
          <p className="text-sm leading-7 text-gray-700">{GDPR_NOTE}</p>
          <AttachedList ticketId={ticketId} initial={attachments} editable missing={missing} />
        </div>
      </section>

      <div className="card sticky bottom-0 flex flex-wrap items-center gap-3 px-6 py-4">
        <button type="button" onClick={remove} disabled={pending} className="btn btn-danger">
          {pending && mode === "delete" ? "Se șterge…" : "Șterge ciorna"}
        </button>
        {message && (
          <p role="status" className={`text-sm ${message.kind === "ok" ? "text-green-700" : "text-danger"}`}>
            {message.text}
          </p>
        )}
        <div className="ml-auto flex gap-3">
          <button type="button" onClick={() => run(false)} disabled={pending} className="btn">
            {pending && mode === "save" ? "Saving…" : "Save"}
          </button>
          <button type="submit" disabled={pending} className="btn btn-primary">
            {pending && mode === "submit" ? "Submitting…" : "Save And Submit"}
          </button>
        </div>
      </div>
    </form>
  );
}
