import type { FieldName } from "./ticket-fields";
import type { Role } from "./auth";

export type TicketStatus = "draft" | "open" | "closed";

export type Ticket = {
  id: string;
  ticket_no: string | null;
  dealer_id: string;
  created_by: string;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  closed_at: string | null;
  last_message_at: string | null;
  last_message_role: Role | null;
} & Record<FieldName, string | number | null>;

export type Attachment = {
  id: string;
  category: string;
  kind: "image" | "file";
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
};

export type MessageFile = { path: string; name: string; mime: string | null; size: number | null };

export type Message = {
  id: string;
  sender_id: string;
  sender_role: Role;
  sender_name: string;
  body: string;
  attachments: MessageFile[];
  created_at: string;
};
