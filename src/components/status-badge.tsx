import { STATUS_LABEL } from "@/lib/ticket-fields";
import type { TicketStatus } from "@/lib/types";

const styles: Record<TicketStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  open: "bg-blue-50 text-blue-700",
  closed: "bg-green-50 text-green-700",
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  return <span className={`badge ${styles[status]}`}>{STATUS_LABEL[status]}</span>;
}
