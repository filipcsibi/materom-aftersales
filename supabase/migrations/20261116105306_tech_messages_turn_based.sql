-- Technical support messages are turn-based, not a free chat:
-- the importer can always write; the dealer can write only when the last
-- message on the ticket is from the importer (one reply per importer message,
-- and nothing until the importer has answered the request).

drop policy "messages: post on open ticket" on public.tech_messages;

create policy "messages: importer anytime, dealer only in reply"
on public.tech_messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1 from public.tech_tickets t
    where t.id = ticket_id
      and t.status = 'open'
      and ((select private.is_importer()) or t.last_message_role = 'importer')
  )
);
