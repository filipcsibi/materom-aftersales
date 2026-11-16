import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { emptyValues, FIELD_NAMES, GDPR_NOTE } from "@/lib/ticket-fields";
import { formatDateTime } from "@/lib/format";
import type { Attachment, Message, Ticket } from "@/lib/types";
import { TicketForm } from "@/components/ticket-form";
import { TicketDetails } from "@/components/ticket-details";
import { AttachedList } from "@/components/attached-list";
import { Chat } from "@/components/chat";
import { StatusBadge } from "@/components/status-badge";
import { setTicketStatus } from "../actions";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.test(id)) notFound();

  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: ticketData }, { data: attData }] = await Promise.all([
    supabase.from("tech_tickets").select("*, dealer:dealers(name)").eq("id", id).maybeSingle(),
    supabase
      .from("tech_attachments")
      .select("id, category, kind, storage_path, file_name, mime_type, size_bytes")
      .eq("ticket_id", id)
      .order("created_at"),
  ]);
  if (!ticketData) notFound();

  const ticket = ticketData as unknown as Ticket & { dealer: { name: string } | null };
  const attachments = (attData ?? []) as Attachment[];

  const back = (
    <Link href="/technical-support" className="text-sm text-gray-500 hover:text-primary">
      ← Technical After Services
    </Link>
  );

  if (ticket.status === "draft") {
    const values = emptyValues();
    for (const name of FIELD_NAMES) {
      const v = ticket[name];
      values[name] = v === null || v === undefined ? "" : String(v);
    }
    return (
      <div className="space-y-4">
        {back}
        <TicketForm ticketId={ticket.id} initialValues={values} attachments={attachments} />
      </div>
    );
  }

  const { data: msgData } = await supabase
    .from("tech_messages")
    .select("id, sender_id, sender_role, sender_name, body, attachments, created_at")
    .eq("ticket_id", id)
    .order("created_at");
  const messages = (msgData ?? []) as Message[];
  const isImporter = profile.role === "importer";
  const nextStatus = ticket.status === "open" ? "closed" : "open";

  return (
    <div className="space-y-4">
      {back}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">{ticket.ticket_no}</h1>
        <StatusBadge status={ticket.status} />
        <span className="text-sm text-gray-500">
          {ticket.dealer?.name} · trimis {formatDateTime(ticket.submitted_at)}
        </span>
        {isImporter && (
          <form action={setTicketStatus.bind(null, ticket.id, nextStatus)} className="ml-auto">
            <button className="btn">{nextStatus === "closed" ? "Închide tichetul" : "Redeschide tichetul"}</button>
          </form>
        )}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="space-y-4">
          <section className="card">
            <h2 className="card-title">Basic Information</h2>
            <div className="px-6 py-6">
              <TicketDetails ticket={ticket} />
            </div>
          </section>
          <section className="card">
            <h2 className="card-title">Attached List</h2>
            <div className="px-6 py-6">
              <AttachedList ticketId={ticket.id} initial={attachments} editable={false} />
            </div>
          </section>
          <p className="text-xs leading-5 text-gray-400">{GDPR_NOTE}</p>
        </div>

        <section className="card flex h-[70dvh] min-h-96 flex-col lg:sticky lg:top-4 lg:h-[calc(100dvh-11rem)]">
          <h2 className="card-title">Mesaje</h2>
          <div className="min-h-0 flex-1">
            <Chat
              ticketId={ticket.id}
              initial={messages}
              myId={profile.id}
              myRole={profile.role}
              canPost={ticket.status === "open"}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
