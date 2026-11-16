import { z } from "zod";

/**
 * Definition of the Technical After Services form.
 * Labels mirror the manufacturer's platform so a ticket can be copied 1:1.
 *
 * Dropdown values are copied from the manufacturer platform, spelling included
 * (e.g. "Opertion Vehicle"), so they match when a ticket is re-entered there.
 */
export const OPTIONS = {
  vehicle_attribute: ["Opertion Vehicle", "Private Vehicle"],
  transmission_type: ["All", "None", "MT", "AT", "CVT", "DCT", "DHT"],
  import_information: ["CBU", "KD"],
  consultation_type: ["P(POWER)", "E(ELECTRIC)", "B(BODY)", "C(CHASSIS)", "O(OTHER)"],
  road_conditions: ["Rough Road", "Uphill", "Downhill", "Highway", "Suburban Roads", "Other"],
  working_condition: ["Stationary (Vehicle Started but Not Moving)", "Dynamic (Vehicle in Motion)"],
  seriousness: ["R1", "R2", "R3", "R4"],
  third_party_equipment: ["Yes", "No"],
} as const;

export const DEFAULT_BRAND = "LEPAS";

export type FieldName =
  | "vin"
  | "engine_no"
  | "trans_no"
  | "dtc_code"
  | "vehicle_attribute"
  | "customer_issue_description"
  | "inspection_process"
  | "theme"
  | "brand"
  | "vehicle_type_no"
  | "engine_model"
  | "transmission_type"
  | "notification_no"
  | "import_information"
  | "production_date"
  | "sale_date"
  | "consultation_type"
  | "first_failure_date"
  | "fault_mileage"
  | "software_version"
  | "road_conditions"
  | "working_condition"
  | "seriousness"
  | "main_parts"
  | "supplier"
  | "third_party_equipment"
  | "equipment_added"
  | "responsibility_unit"
  | "diagnosis_results";

export type FieldDef = {
  name: FieldName;
  label: string;
  type: "text" | "textarea" | "select" | "date" | "number";
  required?: boolean;
  placeholder?: string;
  options?: readonly string[];
};

/** Full-width fields at the top of "Basic Information". */
export const TOP_FIELDS: FieldDef[] = [
  { name: "vin", label: "VIN", type: "text", required: true },
  { name: "engine_no", label: "Engine Model", type: "text" },
  { name: "trans_no", label: "Trans. No.", type: "text" },
  { name: "dtc_code", label: "DTC Code", type: "text" },
  {
    name: "vehicle_attribute",
    label: "Vehicle Attribute",
    type: "select",
    options: OPTIONS.vehicle_attribute,
  },
  {
    name: "customer_issue_description",
    label: "Description Of Customer-Reported Issues",
    type: "textarea",
    required: true,
    placeholder:
      "The Information About The Vehicle's Fault Phenomena Needs To Be Described Completely And Accurately, Such As The Fault Phenomena Of Relevant Modules Of The Entire Vehicle System And The Dtc Code.",
  },
  {
    name: "inspection_process",
    label: "Service Station Inspection Process",
    type: "textarea",
    required: true,
    placeholder:
      "Sort Out The Diagnostic Process Based On The Vehicle's Fault Phenomena, Express The Ideas And Specific Steps For Inspecting The Vehicle One By One, And Provide Temporary Solution.",
  },
  { name: "theme", label: "Theme", type: "text", required: true },
];

/** Two-column block, in reading order (left, right, left, right…). "no" is the generated ticket number. */
export const GRID_FIELDS: (FieldDef | "no")[] = [
  "no",
  { name: "brand", label: "Brand", type: "text", required: true },
  { name: "vehicle_type_no", label: "Vehicle Type No.", type: "text" },
  { name: "engine_model", label: "Engine Model", type: "text", required: true },
  {
    name: "transmission_type",
    label: "Transmission Type",
    type: "select",
    required: true,
    options: OPTIONS.transmission_type,
  },
  { name: "notification_no", label: "Notification No.", type: "text" },
  {
    name: "import_information",
    label: "Import Information",
    type: "select",
    required: true,
    options: OPTIONS.import_information,
  },
  { name: "production_date", label: "Production Date", type: "date", required: true },
  { name: "sale_date", label: "Sale Date", type: "date", required: true },
  {
    name: "consultation_type",
    label: "Type Of Consultation",
    type: "select",
    required: true,
    options: OPTIONS.consultation_type,
  },
  { name: "first_failure_date", label: "First Time Of The Failure", type: "date", required: true },
  { name: "fault_mileage", label: "Fault Mileage", type: "number", required: true },
  { name: "software_version", label: "Version Of Software", type: "text" },
  {
    name: "road_conditions",
    label: "Road Conditions During The Fault",
    type: "select",
    required: true,
    options: OPTIONS.road_conditions,
  },
  {
    name: "working_condition",
    label: "Working Condition",
    type: "select",
    required: true,
    options: OPTIONS.working_condition,
  },
  { name: "seriousness", label: "Seriousness Of Problem", type: "select", options: OPTIONS.seriousness },
  { name: "main_parts", label: "Main Parts", type: "text" },
  { name: "supplier", label: "Supplier", type: "text" },
  {
    name: "third_party_equipment",
    label: "Whether To Install Third Party Equipment",
    type: "select",
    required: true,
    options: OPTIONS.third_party_equipment,
  },
  { name: "equipment_added", label: "What Equipment Was Added", type: "text" },
];

/** Full-width fields at the bottom of "Basic Information". */
export const BOTTOM_FIELDS: FieldDef[] = [
  {
    name: "responsibility_unit",
    label: "Responsibility Unit",
    type: "text",
    placeholder: "Please Enter The Name Or Number Of The Responsibility Units For Query",
  },
  {
    name: "diagnosis_results",
    label: "Diagnosis Results and Implemented Measures",
    type: "textarea",
    required: true,
  },
];

export const ALL_FIELDS: FieldDef[] = [
  ...TOP_FIELDS,
  ...GRID_FIELDS.filter((f): f is FieldDef => f !== "no"),
  ...BOTTOM_FIELDS,
];

export const FIELD_NAMES = ALL_FIELDS.map((f) => f.name);

export type TicketValues = Record<FieldName, string>;

export function emptyValues(): TicketValues {
  const v = Object.fromEntries(FIELD_NAMES.map((n) => [n, ""])) as TicketValues;
  v.brand = DEFAULT_BRAND;
  return v;
}

export const ATTACHMENT_CATEGORIES = [
  { key: "basic_vehicle_info", label: "Basic Vehicle Information: Vehicle Mileage, VIN", required: true },
  { key: "fault_info", label: "Vehicle Fault Information: Fault Video, Dtc", required: true },
  { key: "module_version", label: "Module Version Update, Configuration Code Information", required: false },
  { key: "data_flow", label: "Fault Related Data Flow", required: false },
] as const;

export type AttachmentCategory = (typeof ATTACHMENT_CATEGORIES)[number]["key"];

export const BUCKET = "tech-attachments";
export const MAX_FILE_BYTES = 50 * 1024 * 1024;

// --- Validation -------------------------------------------------------------

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

/** Turns form strings into a DB row. Empty strings become null. */
export function toRow(values: Partial<TicketValues>) {
  const row: Record<string, string | number | null> = {};
  for (const f of ALL_FIELDS) {
    const raw = (values[f.name] ?? "").toString().trim();
    if (raw === "") row[f.name] = null;
    else if (f.type === "number") {
      const n = Number(raw);
      row[f.name] = Number.isFinite(n) ? Math.trunc(n) : null;
    } else if (f.type === "date") row[f.name] = isoDate.test(raw) ? raw : null;
    else if (f.name === "vin") row[f.name] = raw.toUpperCase();
    else row[f.name] = raw;
  }
  return row;
}

const valuesSchema = z.record(z.string(), z.string().max(10000));

/** Shape check for anything coming from the browser (drafts included). */
export function parseValues(input: unknown): Partial<TicketValues> | null {
  const parsed = valuesSchema.safeParse(input);
  if (!parsed.success) return null;
  const out: Partial<TicketValues> = {};
  for (const name of FIELD_NAMES) {
    if (name in parsed.data) out[name] = parsed.data[name];
  }
  return out;
}

/** Field-level errors that block "Save And Submit". */
export function validateForSubmit(values: Partial<TicketValues>): Partial<Record<FieldName, string>> {
  const errors: Partial<Record<FieldName, string>> = {};
  for (const f of ALL_FIELDS) {
    const raw = (values[f.name] ?? "").trim();
    if (f.required && raw === "") {
      errors[f.name] = "Required";
      continue;
    }
    if (raw === "") continue;
    if (f.type === "select" && f.options && !f.options.includes(raw)) errors[f.name] = "Invalid option";
    if (f.type === "date" && !isoDate.test(raw)) errors[f.name] = "Invalid date";
    if (f.type === "number" && !(Number.isInteger(Number(raw)) && Number(raw) >= 0 && Number(raw) < 10_000_000))
      errors[f.name] = "Must be a whole number";
  }
  const vin = (values.vin ?? "").trim();
  if (vin && !/^[A-HJ-NPR-Z0-9]{17}$/i.test(vin)) errors.vin = "VIN must have 17 characters (no I, O, Q)";
  return errors;
}

export const STATUS_LABEL: Record<"draft" | "open" | "closed", string> = {
  draft: "Ciornă",
  open: "Deschis",
  closed: "Închis",
};

export const GDPR_NOTE =
  "File Upload (Friendly Reminder): In order to comply with the 'General Rules for Personal Data Compliance' (including but not limited to management requirements of EU General Data Protection Regulation (GDPR), China Personal Information Protection Law (PIPL), and other regulations), dealers please avoid customer's unnecessary personal data when uploading image or file attachment. If included, please mask or de-identify the relevant part. Otherwise, the application may be rejected.";

