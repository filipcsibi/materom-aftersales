/** Where a module keeps its attachments, files and (if it has a chat) messages. */
export type Source = { messages?: string; attachments: string; fk: string; bucket: string };

export const TECH_SOURCE: Source = {
  messages: "tech_messages",
  attachments: "tech_attachments",
  fk: "ticket_id",
  bucket: "tech-attachments",
};

export const CLAIM_SOURCE: Source = {
  attachments: "claim_attachments",
  fk: "claim_id",
  bucket: "claim-attachments",
};
