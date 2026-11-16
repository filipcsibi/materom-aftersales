-- Claims: no chat. The importer sets a status (+ optional note) that the dealer sees,
-- and the dealer can keep editing the claim until it is approved.

-- 1. Remove the chat -----------------------------------------------------------

alter publication supabase_realtime drop table public.claim_messages;
drop table public.claim_messages;
drop function private.claim_messages_touch_claim();

-- 2. Policies that reference claims.status must go before the type changes ------

drop policy "claims: dealer reads own, importer reads submitted" on public.claims;
drop policy "claims: dealer creates" on public.claims;
drop policy "claims: dealer edits drafts" on public.claims;
drop policy "claims: importer updates submitted" on public.claims;
drop policy "claims: dealer deletes drafts" on public.claims;
drop policy "claim attachments: dealer adds to draft" on public.claim_attachments;
drop policy "claim attachments: dealer removes from draft" on public.claim_attachments;
drop policy "claim files: upload to visible, not closed claim" on storage.objects;

-- 3. New status model ----------------------------------------------------------

create type public.claim_status as enum ('draft', 'pending', 'rejected', 'approved');

drop index public.claims_status_idx;

alter table public.claims
  alter column status drop default,
  alter column status type public.claim_status using (
    case status::text
      when 'open' then 'pending'
      when 'closed' then 'approved'
      else 'draft'
    end
  )::public.claim_status,
  alter column status set default 'draft',
  add column status_note text,
  add column status_changed_at timestamptz,
  drop column closed_at,
  drop column last_message_at,
  drop column last_message_role;

create index claims_status_idx on public.claims (status);

create or replace function private.claims_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if tg_op = 'INSERT' then
    if uid is not null then
      new.created_by := uid;
      new.dealer_id := private.my_dealer_id();
      if new.dealer_id is null then
        raise exception 'Only dealer accounts can create claims';
      end if;
    end if;
    new.claim_no := null;
    new.submitted_at := null;
    new.status_note := null;
    new.status_changed_at := null;
  else
    new.dealer_id := old.dealer_id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.claim_no := old.claim_no;
    new.submitted_at := old.submitted_at;
    new.status_changed_at := old.status_changed_at;

    -- A dealer never decides the outcome: the note stays as the importer wrote it,
    -- and any edit of a submitted claim puts it back in the importer's queue.
    if uid is not null and not private.is_importer() then
      new.status_note := old.status_note;
      if old.status <> 'draft' then
        new.status := 'pending';
      end if;
    end if;

    if old.status <> 'draft' and new.status = 'draft' then
      raise exception 'A submitted claim cannot go back to draft';
    end if;
    if new.status is distinct from old.status then
      new.status_changed_at := now();
    end if;
    new.updated_at := now();
  end if;

  -- Number the claim the first time it is submitted.
  if new.status <> 'draft' and new.claim_no is null then
    new.claim_no := 'WC' || to_char(now(), 'YYYY') || '-'
      || lpad(nextval('private.claim_no_seq')::text, 5, '0');
    new.submitted_at := now();
  end if;

  return new;
end;
$$;

revoke execute on all functions in schema private from public;
grant execute on function private.is_importer() to authenticated;
grant execute on function private.my_dealer_id() to authenticated;

-- 4. Policies -----------------------------------------------------------------

create policy "claims: dealer reads own, importer reads submitted"
on public.claims for select to authenticated
using (
  dealer_id = (select private.my_dealer_id())
  or ((select private.is_importer()) and status <> 'draft')
);

create policy "claims: dealer creates"
on public.claims for insert to authenticated
with check (dealer_id = (select private.my_dealer_id()) and status in ('draft', 'pending'));

-- Editable by the dealer until approved; a dealer can only leave it as draft or pending.
create policy "claims: dealer edits until approved"
on public.claims for update to authenticated
using (dealer_id = (select private.my_dealer_id()) and status <> 'approved')
with check (dealer_id = (select private.my_dealer_id()) and status in ('draft', 'pending'));

create policy "claims: importer updates submitted"
on public.claims for update to authenticated
using ((select private.is_importer()) and status <> 'draft')
with check ((select private.is_importer()) and status <> 'draft');

create policy "claims: dealer deletes drafts"
on public.claims for delete to authenticated
using (dealer_id = (select private.my_dealer_id()) and status = 'draft');

create policy "claim attachments: dealer adds until approved"
on public.claim_attachments for insert to authenticated
with check (
  uploaded_by = (select auth.uid())
  and exists (
    select 1 from public.claims c
    where c.id = claim_id and c.status <> 'approved'
      and c.dealer_id = (select private.my_dealer_id())
  )
);

create policy "claim attachments: dealer removes until approved"
on public.claim_attachments for delete to authenticated
using (
  exists (
    select 1 from public.claims c
    where c.id = claim_id and c.status <> 'approved'
      and c.dealer_id = (select private.my_dealer_id())
  )
);

-- Only the dealer uploads claim files now (there is no chat), and only until approval.
create policy "claim files: dealer uploads until approved"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'claim-attachments'
  and exists (
    select 1 from public.claims c
    where c.id::text = (storage.foldername(objects.name))[1]
      and c.status <> 'approved'
      and c.dealer_id = (select private.my_dealer_id())
  )
);
