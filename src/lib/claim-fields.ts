import { z } from "zod";
import type { FormFieldDef } from "@/components/form-field";

/**
 * Definition of the Claim Management (warranty) form.
 * Labels mirror the manufacturer's platform so a claim can be copied 1:1.
 */

/** Values seen on the manufacturer platform. Both lists are longer there, so these
 *  are suggestions only — the dealer can type any other value. */
export const FAILURE_CODES = ["Metal impact noise", "Poor sound quality", "Noise"] as const;
export const FAILURE_REASONS = [
  "(C01) broken,split,torn",
  "(C02) abnormal or excessive wear",
  "(C03) deformed (bent,twisted,etc)",
  "(C04) cracked",
  "(C05) flaw in material",
  "(C06) internal failure",
  "(C07) loosed fitting",
  "(C08) burnt fluid",
  "(C09) burnt, melted",
  "(C10) leaking - seal",
] as const;

export const DISTRIBUTOR = "(1082WC)MATEROM SRL";
export const CLAIM_DEFAULT_BRAND = "LEPAS";

export type ClaimFieldName =
  | "vin"
  | "brand"
  | "kilometre"
  | "claim_type"
  | "repair_order_no"
  | "arrival_time"
  | "repair_date"
  | "actual_selling_date"
  | "delivery_date"
  | "production_date"
  | "failure_code"
  | "failure_reasons"
  | "fault_description"
  | "technical_diagnosis"
  | "maintenance_plan"
  | "other_fee"
  | "other_fee_reason"
  | "model_no"
  | "engine_no"
  | "trans_no"
  | "supplier"
  | "fault_type";

export type ClaimFieldDef = FormFieldDef & { name: ClaimFieldName };

export const VIN_FIELD: ClaimFieldDef = {
  name: "vin",
  label: "Vin",
  type: "text",
  required: true,
  placeholder: "Please enter VIN",
};

/** Two-column block. "app_no" and "dealer" are read-only cells; null leaves a cell empty. */
export const BASIC_GRID: (ClaimFieldDef | "app_no" | "dealer" | null)[] = [
  { name: "brand", label: "Brand", type: "text", required: true },
  "app_no",
  { name: "kilometre", label: "Kilometre", type: "number", required: true },
  { name: "claim_type", label: "Claim Types", type: "text", required: true },
  { name: "repair_order_no", label: "Repair Order No.", type: "text", required: true },
  { name: "arrival_time", label: "arrival Time", type: "date" },
  { name: "repair_date", label: "Repair Date", type: "date", required: true },
  "dealer",
  { name: "actual_selling_date", label: "Actual Selling Date", type: "date" },
  { name: "delivery_date", label: "Delivery Date", type: "date" },
  { name: "production_date", label: "Production Date", type: "date" },
  null,
];

export const BASIC_WIDE: ClaimFieldDef[] = [
  {
    name: "failure_code",
    label: "Failure Code",
    type: "text",
    placeholder: "Please enter no. or names for query",
    suggestions: FAILURE_CODES,
  },
  {
    name: "failure_reasons",
    label: "Failure Reasons",
    type: "text",
    placeholder: "Please enter the failure reasons or number for query",
    suggestions: FAILURE_REASONS,
  },
  { name: "fault_description", label: "Fault Description", type: "textarea", required: true, maxLength: 4000 },
  { name: "technical_diagnosis", label: "technical diagnosis", type: "textarea", required: true, maxLength: 2000 },
  { name: "maintenance_plan", label: "maintenance plan", type: "textarea", required: true, maxLength: 2000 },
];

export const OTHER_FEE: ClaimFieldDef = { name: "other_fee", label: "OtherFee", type: "decimal" };
export const OTHER_FEE_REASON: ClaimFieldDef = {
  name: "other_fee_reason",
  label: "OtherFee Reason",
  type: "textarea",
  maxLength: 2000,
};

export const VEHICLE_FIELDS: ClaimFieldDef[] = [
  { name: "model_no", label: "Model No.", type: "text" },
  { name: "engine_no", label: "Engine No.", type: "text" },
  { name: "trans_no", label: "Trans. No.", type: "text" },
];

export const MATERIAL_HEADER_FIELDS: ClaimFieldDef[] = [
  { name: "supplier", label: "Supplier", type: "text" },
  { name: "fault_type", label: "Fault Type", type: "text" },
];

export const CLAIM_FIELDS: ClaimFieldDef[] = [
  VIN_FIELD,
  ...BASIC_GRID.filter((f): f is ClaimFieldDef => typeof f === "object" && f !== null),
  ...BASIC_WIDE,
  OTHER_FEE,
  OTHER_FEE_REASON,
  ...VEHICLE_FIELDS,
  ...MATERIAL_HEADER_FIELDS,
];

export const CLAIM_FIELD_NAMES = CLAIM_FIELDS.map((f) => f.name);

// --- Line items -------------------------------------------------------------

export type Column = { key: string; label: string; type: "text" | "number" | "checkbox"; width?: string };
export type LineRow = Record<string, string | boolean>;

export const MATERIAL_COLUMNS: Column[] = [
  { key: "part_no", label: "Old Spare part No.", type: "text", width: "11rem" },
  { key: "part_name", label: "Part Name", type: "text", width: "12rem" },
  { key: "main_damaged", label: "Main Damaged Part", type: "checkbox" },
  { key: "real_estate_parts", label: "Real estate parts", type: "text", width: "9rem" },
  { key: "part_policy", label: "Part Policy", type: "text", width: "9rem" },
  { key: "quantity", label: "Quantity", type: "number", width: "6rem" },
  { key: "unit_price", label: "Unit Price", type: "number", width: "7rem" },
  { key: "landed_cost", label: "Landed Cost", type: "number", width: "7rem" },
  { key: "administration_fee", label: "Administration Fee", type: "number", width: "7rem" },
];

export const LABOR_COLUMNS: Column[] = [
  { key: "part_no", label: "Spare part No.", type: "text", width: "11rem" },
  { key: "repair_item_no", label: "Repair Item No.", type: "text", width: "10rem" },
  { key: "repair_item", label: "Repair Item", type: "text", width: "14rem" },
  { key: "vehicle_type", label: "Vehicle Type", type: "text", width: "9rem" },
  { key: "labor_hour", label: "Labor Hour", type: "number", width: "6rem" },
  { key: "unit_price", label: "Unit Price Of Labor Hour", type: "number", width: "8rem" },
  { key: "labor_hour_rate", label: "Labor Hour Rate", type: "number", width: "7rem" },
  { key: "remarks", label: "Remarks", type: "text", width: "12rem" },
];

export const SUB_MATERIAL_COLUMNS: Column[] = [
  { key: "part_no", label: "Old Spare part No.", type: "text", width: "11rem" },
  { key: "part_name", label: "Part Name", type: "text", width: "12rem" },
  { key: "part_policy", label: "Part Policy", type: "text", width: "9rem" },
  { key: "unit", label: "Units Of Measurement", type: "text", width: "8rem" },
  { key: "quantity", label: "Claim Quantity Consumed", type: "number", width: "8rem" },
  { key: "max_quantity", label: "Max Quantity", type: "number", width: "7rem" },
  { key: "unit_price", label: "Unit Price", type: "number", width: "7rem" },
];

export const CLAIM_CATEGORIES = [{ key: "photo", label: "Photo", required: false }] as const;

export type ClaimValues = {
  fields: Record<ClaimFieldName, string>;
  no_part: boolean;
  materials: LineRow[];
  labor_items: LineRow[];
  sub_materials: LineRow[];
};

export function emptyClaimFields(): Record<ClaimFieldName, string> {
  const v = Object.fromEntries(CLAIM_FIELD_NAMES.map((n) => [n, ""])) as Record<ClaimFieldName, string>;
  v.brand = CLAIM_DEFAULT_BRAND;
  return v;
}

export function emptyRow(columns: Column[]): LineRow {
  return Object.fromEntries(columns.map((c) => [c.key, c.type === "checkbox" ? false : ""]));
}

// --- Money ------------------------------------------------------------------

export function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : 0;
}

/** Indicative totals. The manufacturer platform recalculates the official amounts. */
export function claimAmounts(v: Pick<ClaimValues, "materials" | "labor_items" | "sub_materials"> & { other_fee: unknown }) {
  const material = v.materials.reduce((s, r) => s + num(r.quantity) * num(r.unit_price), 0);
  const administration = v.materials.reduce((s, r) => s + num(r.administration_fee), 0);
  const labor = v.labor_items.reduce((s, r) => s + num(r.labor_hour) * num(r.unit_price), 0);
  const subMaterial = v.sub_materials.reduce((s, r) => s + num(r.quantity) * num(r.unit_price), 0);
  const other = num(v.other_fee);
  return { labor, material, subMaterial, administration, other, total: labor + material + subMaterial + administration + other };
}

export function money(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// --- Validation -------------------------------------------------------------

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

const rowSchema = z.record(z.string().max(40), z.union([z.string().max(500), z.boolean()]));
const inputSchema = z.object({
  fields: z.record(z.string(), z.string().max(10000)),
  no_part: z.boolean(),
  materials: z.array(rowSchema).max(100),
  labor_items: z.array(rowSchema).max(100),
  sub_materials: z.array(rowSchema).max(100),
});

function cleanRows(rows: LineRow[], columns: Column[]): LineRow[] {
  return rows
    .map((r) => {
      const out: LineRow = {};
      for (const c of columns) {
        const raw = r[c.key];
        out[c.key] = c.type === "checkbox" ? raw === true : String(raw ?? "").trim();
      }
      return out;
    })
    .filter((r) => columns.some((c) => (c.type === "checkbox" ? false : r[c.key] !== "")));
}

/** Shape check + normalisation for anything coming from the browser. */
export function parseClaim(input: unknown): ClaimValues | null {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return null;
  const fields = emptyClaimFields();
  for (const name of CLAIM_FIELD_NAMES) fields[name] = (parsed.data.fields[name] ?? "").trim();
  return {
    fields,
    no_part: parsed.data.no_part,
    materials: parsed.data.no_part ? [] : cleanRows(parsed.data.materials, MATERIAL_COLUMNS),
    labor_items: cleanRows(parsed.data.labor_items, LABOR_COLUMNS),
    sub_materials: cleanRows(parsed.data.sub_materials, SUB_MATERIAL_COLUMNS),
  };
}

export function claimToRow(v: ClaimValues) {
  const row: Record<string, unknown> = {
    no_part: v.no_part,
    materials: v.materials,
    labor_items: v.labor_items,
    sub_materials: v.sub_materials,
  };
  for (const f of CLAIM_FIELDS) {
    const raw = v.fields[f.name];
    if (raw === "") row[f.name] = null;
    else if (f.type === "number") row[f.name] = Number.isFinite(Number(raw)) ? Math.trunc(Number(raw)) : null;
    else if (f.type === "decimal") row[f.name] = Number.isFinite(Number(raw)) ? Math.round(Number(raw) * 100) / 100 : null;
    else if (f.type === "date") row[f.name] = isoDate.test(raw) ? raw : null;
    else if (f.name === "vin") row[f.name] = raw.toUpperCase();
    else row[f.name] = raw;
  }
  return row;
}

export type ClaimErrors = { fields: Partial<Record<ClaimFieldName, string>>; lists: string[] };

function badNumbers(rows: LineRow[], columns: Column[]) {
  return rows.some((r) =>
    columns.some((c) => c.type === "number" && r[c.key] !== "" && !(Number(r[c.key]) >= 0)),
  );
}

export function validateClaimForSubmit(v: ClaimValues): ClaimErrors {
  const fields: ClaimErrors["fields"] = {};
  for (const f of CLAIM_FIELDS) {
    const raw = v.fields[f.name];
    if (f.required && raw === "") {
      fields[f.name] = "Required";
      continue;
    }
    if (raw === "") continue;
    if (f.type === "date" && !isoDate.test(raw)) fields[f.name] = "Invalid date";
    if (f.type === "number" && !(Number.isInteger(Number(raw)) && Number(raw) >= 0 && Number(raw) < 10_000_000))
      fields[f.name] = "Must be a whole number";
    if (f.type === "decimal" && !(Number(raw) >= 0 && Number(raw) < 10_000_000)) fields[f.name] = "Invalid amount";
    if (f.maxLength && raw.length > f.maxLength) fields[f.name] = `Maximum ${f.maxLength} characters`;
  }
  if (v.fields.vin && !/^[A-HJ-NPR-Z0-9]{17}$/i.test(v.fields.vin))
    fields.vin = "VIN must have 17 characters (no I, O, Q)";

  const lists: string[] = [];
  if (!v.no_part && v.materials.length === 0)
    lists.push('Adaugă cel puțin un material sau alege "No Part WorkItem".');
  if (v.materials.some((r) => r.part_no === "" && r.part_name === ""))
    lists.push("Fiecare material trebuie să aibă Spare part No. sau Part Name.");
  if (
    badNumbers(v.materials, MATERIAL_COLUMNS) ||
    badNumbers(v.labor_items, LABOR_COLUMNS) ||
    badNumbers(v.sub_materials, SUB_MATERIAL_COLUMNS)
  )
    lists.push("Cantitățile și prețurile din liste trebuie să fie numere pozitive.");
  return { fields, lists };
}

// --- Status -----------------------------------------------------------------

export type ClaimStatus = "draft" | "pending" | "rejected" | "approved";

export const CLAIM_STATUS_LABEL: Record<ClaimStatus, string> = {
  draft: "Ciornă",
  pending: "În așteptare",
  rejected: "Respins",
  approved: "Aprobat",
};

/** What the importer can set. Once approved, the dealer can no longer edit the claim. */
export const IMPORTER_STATUSES: ClaimStatus[] = ["pending", "rejected", "approved"];
