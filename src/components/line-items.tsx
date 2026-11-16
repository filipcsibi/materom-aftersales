"use client";

import type { Column, LineRow } from "@/lib/claim-fields";
import { emptyRow, money, num } from "@/lib/claim-fields";

/** Computed last column: the product of two numeric columns (plain data, so it can cross the server/client boundary). */
export type RowTotal = { label: string; multiply: [string, string] };
const rowTotal = (t: RowTotal, r: LineRow) => num(r[t.multiply[0]]) * num(r[t.multiply[1]]);

/** Editable table of rows (materials, repair items, sub-materials). */
export function LineItems({
  columns,
  rows,
  onChange,
  addLabel,
  total,
  disabled,
}: {
  columns: Column[];
  rows: LineRow[];
  onChange: (rows: LineRow[]) => void;
  addLabel: string;
  total?: RowTotal;
  disabled?: boolean;
}) {
  const set = (i: number, key: string, value: string | boolean) =>
    onChange(rows.map((r, j) => (j === i ? { ...r, [key]: value } : r)));

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-md border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs text-gray-600">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="whitespace-nowrap px-2 py-2 font-medium">
                  {c.label}
                </th>
              ))}
              {total && <th className="whitespace-nowrap px-2 py-2 text-right font-medium">{total.label}</th>}
              <th className="w-10 px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 2} className="px-3 py-8 text-center text-sm text-gray-400">
                  No Data
                </td>
              </tr>
            )}
            {rows.map((row, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td key={c.key} className="px-1.5 py-1.5 align-top" style={{ minWidth: c.width }}>
                    {c.type === "checkbox" ? (
                      <input
                        type="checkbox"
                        aria-label={`${c.label}, row ${i + 1}`}
                        checked={row[c.key] === true}
                        disabled={disabled}
                        onChange={(e) => set(i, c.key, e.target.checked)}
                        className="ml-2 mt-2 h-4 w-4"
                      />
                    ) : (
                      <input
                        type={c.type === "number" ? "number" : "text"}
                        min={c.type === "number" ? 0 : undefined}
                        step={c.type === "number" ? "any" : undefined}
                        aria-label={`${c.label}, row ${i + 1}`}
                        value={String(row[c.key] ?? "")}
                        disabled={disabled}
                        maxLength={300}
                        onChange={(e) => set(i, c.key, e.target.value)}
                        className="input px-2"
                      />
                    )}
                  </td>
                ))}
                {total && (
                  <td className="whitespace-nowrap px-2 py-3 text-right align-top tabular-nums">
                    {money(rowTotal(total, row))}
                  </td>
                )}
                <td className="px-1 py-2 align-top">
                  <button
                    type="button"
                    disabled={disabled}
                    aria-label={`Șterge rândul ${i + 1}`}
                    onClick={() => onChange(rows.filter((_, j) => j !== i))}
                    className="rounded px-2 py-1 text-gray-400 hover:text-danger"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" disabled={disabled} onClick={() => onChange([...rows, emptyRow(columns)])} className="btn">
        + {addLabel}
      </button>
    </div>
  );
}

/** Read-only version for submitted claims. */
export function LineItemsView({
  columns,
  rows,
  total,
}: {
  columns: Column[];
  rows: LineRow[];
  total?: RowTotal;
}) {
  if (rows.length === 0) return <p className="text-sm text-gray-400">No Data</p>;
  return (
    <div className="overflow-x-auto rounded-md border border-line">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-xs text-gray-600">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="whitespace-nowrap px-3 py-2 font-medium">
                {c.label}
              </th>
            ))}
            {total && <th className="whitespace-nowrap px-3 py-2 text-right font-medium">{total.label}</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c.key} className={`px-3 py-2 ${c.type === "number" ? "tabular-nums" : ""}`}>
                  {c.type === "checkbox" ? (row[c.key] === true ? "Yes" : "") : String(row[c.key] ?? "") || "—"}
                </td>
              ))}
              {total && <td className="px-3 py-2 text-right tabular-nums">{money(rowTotal(total, row))}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
