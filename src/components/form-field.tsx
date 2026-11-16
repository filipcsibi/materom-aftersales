"use client";

export type FormFieldDef = {
  name: string;
  label: string;
  type: "text" | "textarea" | "select" | "date" | "number" | "decimal";
  required?: boolean;
  placeholder?: string;
  options?: readonly string[];
  /** Free text with suggestions (for lists we only know partially). */
  suggestions?: readonly string[];
  maxLength?: number;
};

export function Row({
  label,
  required,
  htmlFor,
  children,
}: {
  label: string;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid items-start gap-x-3 gap-y-1 sm:grid-cols-[13rem_minmax(0,1fr)]">
      <label htmlFor={htmlFor} className="py-1.5 text-sm sm:text-right">
        {required && <span className="mr-1 text-danger">*</span>}
        {label}:
      </label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Field({
  def,
  value,
  error,
  onChange,
}: {
  def: FormFieldDef;
  value: string;
  error?: string;
  onChange: (v: string) => void;
}) {
  const id = `f-${def.name}`;
  const cls = `input ${error ? "input-error" : ""}`;
  const common = {
    id,
    name: def.name,
    value,
    "aria-invalid": Boolean(error),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      onChange(e.target.value),
  };

  let control: React.ReactNode;
  if (def.type === "textarea") {
    control = (
      <>
        <textarea {...common} rows={3} placeholder={def.placeholder} maxLength={def.maxLength} className={cls} />
        {def.maxLength && (
          <p className="mt-0.5 text-right text-xs text-gray-400">
            {value.length}/{def.maxLength}
          </p>
        )}
      </>
    );
  } else if (def.type === "select") {
    control = (
      <select {...common} className={cls}>
        <option value="" />
        {def.options?.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  } else if (def.type === "date") {
    control = <input {...common} type="date" className={cls} />;
  } else if (def.type === "number" || def.type === "decimal") {
    control = (
      <input
        {...common}
        type="number"
        min={0}
        step={def.type === "decimal" ? "0.01" : 1}
        inputMode={def.type === "decimal" ? "decimal" : "numeric"}
        className={cls}
      />
    );
  } else {
    control = (
      <>
        <input
          {...common}
          type="text"
          placeholder={def.placeholder}
          maxLength={def.name === "vin" ? 17 : 500}
          list={def.suggestions ? `${id}-list` : undefined}
          className={`${cls} ${def.name === "vin" ? "font-mono uppercase" : ""}`}
        />
        {def.suggestions && (
          <datalist id={`${id}-list`}>
            {def.suggestions.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        )}
      </>
    );
  }

  return (
    <Row label={def.label} required={def.required} htmlFor={id}>
      {control}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </Row>
  );
}
