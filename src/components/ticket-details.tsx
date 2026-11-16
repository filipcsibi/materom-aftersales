import { BOTTOM_FIELDS, GRID_FIELDS, TOP_FIELDS, type FieldDef } from "@/lib/ticket-fields";
import type { Ticket } from "@/lib/types";
import { CopyButton } from "./copy-button";

/** Read-only rendering of a submitted ticket, in the same order as the form. */
export function TicketDetails({ ticket }: { ticket: Ticket }) {
  const item = (f: FieldDef, wide: boolean) => {
    const raw = ticket[f.name];
    const value = raw === null || raw === "" ? "" : String(raw);
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

  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {TOP_FIELDS.map((f) => item(f, true))}
      {GRID_FIELDS.map((f) =>
        f === "no" ? (
          <div key="no">
            <dt className="text-xs text-gray-500">No.</dt>
            <dd className="mt-0.5 text-sm font-medium">{ticket.ticket_no}</dd>
          </div>
        ) : (
          item(f, false)
        ),
      )}
      {BOTTOM_FIELDS.map((f) => item(f, true))}
    </dl>
  );
}
