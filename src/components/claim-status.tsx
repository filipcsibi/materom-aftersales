import { CLAIM_STATUS_LABEL, type ClaimStatus } from "@/lib/claim-fields";

const styles: Record<ClaimStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  pending: "bg-amber-50 text-amber-800",
  rejected: "bg-red-50 text-red-700",
  approved: "bg-green-50 text-green-700",
};

const dots: Record<ClaimStatus, string> = {
  draft: "bg-gray-400",
  pending: "bg-amber-500",
  rejected: "bg-red-500",
  approved: "bg-green-500",
};

export function ClaimStatusBadge({ status }: { status: ClaimStatus }) {
  return (
    <span className={`badge gap-1.5 ${styles[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dots[status]}`} />
      {CLAIM_STATUS_LABEL[status]}
    </span>
  );
}

const banner: Record<ClaimStatus, { box: string; text: string }> = {
  draft: { box: "border-line bg-white", text: "Ciornă — cererea nu a fost trimisă încă importatorului." },
  pending: {
    box: "border-amber-200 bg-amber-50",
    text: "În așteptare — importatorul nu a decis încă. Poți modifica cererea în continuare.",
  },
  rejected: {
    box: "border-red-200 bg-red-50",
    text: "Respins — corectează cererea și retrimite-o.",
  },
  approved: { box: "border-green-200 bg-green-50", text: "Aprobat — cererea nu mai poate fi modificată." },
};

/** What the dealer sees at the top of a claim: the status and the importer's note. */
export function ClaimStatusBanner({ status, note }: { status: ClaimStatus; note: string | null }) {
  const b = banner[status];
  return (
    <div className={`rounded-md border px-4 py-3 text-sm ${b.box}`}>
      <p className="font-medium">{b.text}</p>
      {note && (
        <p className="mt-1.5 whitespace-pre-wrap break-words">
          <span className="text-gray-600">Notă importator: </span>
          {note}
        </p>
      )}
    </div>
  );
}
