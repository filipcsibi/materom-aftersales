-- Claim Management (warranty): claims with line items, photos and chat.
-- Same access model as tech_tickets.

create sequence private.claim_no_seq;

create table public.claims (
  id uuid primary key default gen_random_uuid(),
  claim_no text unique,
  dealer_id uuid not null references public.dealers (id) on delete restrict,
  created_by uuid not null references public.profiles (id) on delete restrict,
  status public.ticket_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  closed_at timestamptz,
  last_message_at timestamptz,
  last_message_role public.user_role,

  -- Basic Information
  vin text,
  brand text,
  kilometre integer,
  claim_type text,
  repair_order_no text,
  arrival_time date,
  repair_date date,
  actual_selling_date date,
  delivery_date date,
  production_date date,
  failure_code text,
  failure_reasons text,
  fault_description text,
  technical_diagnosis text,
  maintenance_plan text,
  other_fee numeric(12, 2),
  other_fee_reason text,

  -- Vehicle Info
  model_no text,
  engine_no text,
  trans_no text,

  -- Material Info
  supplier text,
  fault_type text,
  no_part boolean not null default false,
  materials jsonb not null default '[]'::jsonb,
  labor_items jsonb not null default '[]'::jsonb,
  sub_materials jsonb not null default '[]'::jsonb,

  constraint claims_lists_are_arrays check (
    jsonb_typeof(materials) = 'array'
    and jsonb_typeof(labor_items) = 'array'
    and jsonb_typeof(sub_materials) = 'array'
  )
);

create index claims_dealer_id_idx on public.claims (dealer_id);
create index claims_created_by_idx on public.claims (created_by);
create index claims_status_idx on public.claims (status);

create function private.claims_guard()
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
    new.closed_at := null;
    new.last_message_at := null;
    new.last_message_role := null;
  else
    new.dealer_id := old.dealer_id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.claim_no := old.claim_no;
    new.submitted_at := old.submitted_at;
    if old.status <> 'draft' and new.status = 'draft' then
      raise exception 'A submitted claim cannot go back to draft';
    end if;
    new.updated_at := now();
  end if;

  -- Number the claim the first time it is submitted.
  if new.status <> 'draft' and new.claim_no is null then
    new.claim_no := 'WC' || to_char(now(), 'YYYY') || '-'
      || lpad(nextval('private.claim_no_seq')::text, 5, '0');
    new.submitted_at := now();
  end if;

  if new.status = 'closed' and (tg_op = 'INSERT' or old.status <> 'closed') then
    new.closed_at := now();
  elsif new.status <> 'closed' then
    new.closed_at := null;
  end if;

  return new;
end;
$$;

create trigger claims_guard
before insert or update on public.claims
for each row execute function private.claims_guard();

-- ---------------------------------------------------------------------------
-- Attachments ("Photo" section)
-- ---------------------------------------------------------------------------

create table public.claim_attachments (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims (id) on delete cascade,
  category text not null check (category in ('photo')),
  kind text not null check (kind in ('image', 'file')),
  storage_path text not null unique,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

create index claim_attachments_claim_id_idx on public.claim_attachments (claim_id);
create index claim_attachments_uploaded_by_idx on public.claim_attachments (uploaded_by);

-- ---------------------------------------------------------------------------
-- Chat
-- ---------------------------------------------------------------------------

create table public.claim_messages (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete restrict,
  sender_role public.user_role not null,
  sender_name text not null,
  body text not null default '',
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint claim_messages_not_empty check (
    length(btrim(body)) > 0 or jsonb_array_length(attachments) > 0
  ),
  constraint claim_messages_attachments_is_array check (jsonb_typeof(attachments) = 'array')
);

create index claim_messages_claim_id_idx on public.claim_messages (claim_id, created_at);
create index claim_messages_sender_id_idx on public.claim_messages (sender_id);

-- Same sender trigger as the technical support chat (it only reads the session).
create trigger claim_messages_set_sender
before insert on public.claim_messages
for each row execute function private.tech_messages_set_sender();

create function private.claim_messages_touch_claim()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.claims
  set last_message_at = new.created_at,
      last_message_role = new.sender_role
  where id = new.claim_id;
  return null;
end;
$$;

create trigger claim_messages_touch_claim
after insert on public.claim_messages
for each row execute function private.claim_messages_touch_claim();

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

revoke execute on all functions in schema private from public;
grant execute on function private.is_importer() to authenticated;
grant execute on function private.my_dealer_id() to authenticated;

grant select, insert, update, delete on public.claims to authenticated;
grant select, insert, delete on public.claim_attachments to authenticated;
grant select, insert on public.claim_messages to authenticated;
grant all on public.claims, public.claim_attachments, public.claim_messages to service_role;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.claims enable row level security;
alter table public.claim_attachments enable row level security;
alter table public.claim_messages enable row level security;

create policy "claims: dealer reads own, importer reads submitted"
on public.claims for select to authenticated
using (
  dealer_id = (select private.my_dealer_id())
  or ((select private.is_importer()) and status <> 'draft')
);

create policy "claims: dealer creates"
on public.claims for insert to authenticated
with check (dealer_id = (select private.my_dealer_id()) and status in ('draft', 'open'));

create policy "claims: dealer edits drafts"
on public.claims for update to authenticated
using (dealer_id = (select private.my_dealer_id()) and status = 'draft')
with check (dealer_id = (select private.my_dealer_id()) and status in ('draft', 'open'));

create policy "claims: importer updates submitted"
on public.claims for update to authenticated
using ((select private.is_importer()) and status <> 'draft')
with check ((select private.is_importer()) and status <> 'draft');

create policy "claims: dealer deletes drafts"
on public.claims for delete to authenticated
using (dealer_id = (select private.my_dealer_id()) and status = 'draft');

create policy "claim attachments: read with claim"
on public.claim_attachments for select to authenticated
using (exists (select 1 from public.claims c where c.id = claim_id));

create policy "claim attachments: dealer adds to draft"
on public.claim_attachments for insert to authenticated
with check (
  uploaded_by = (select auth.uid())
  and exists (
    select 1 from public.claims c
    where c.id = claim_id and c.status = 'draft'
      and c.dealer_id = (select private.my_dealer_id())
  )
);

create policy "claim attachments: dealer removes from draft"
on public.claim_attachments for delete to authenticated
using (
  exists (
    select 1 from public.claims c
    where c.id = claim_id and c.status = 'draft'
      and c.dealer_id = (select private.my_dealer_id())
  )
);

create policy "claim messages: read with claim"
on public.claim_messages for select to authenticated
using (exists (select 1 from public.claims c where c.id = claim_id));

create policy "claim messages: post on open claim"
on public.claim_messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (select 1 from public.claims c where c.id = claim_id and c.status = 'open')
);

-- ---------------------------------------------------------------------------
-- Storage: private bucket, objects live under "<claim id>/..."
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit)
values ('claim-attachments', 'claim-attachments', false, 52428800)
on conflict (id) do nothing;

create policy "claim files: read with claim"
on storage.objects for select to authenticated
using (
  bucket_id = 'claim-attachments'
  and exists (
    select 1 from public.claims c
    where c.id::text = (storage.foldername(objects.name))[1]
  )
);

create policy "claim files: upload to visible, not closed claim"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'claim-attachments'
  and exists (
    select 1 from public.claims c
    where c.id::text = (storage.foldername(objects.name))[1]
      and c.status <> 'closed'
  )
);

create policy "claim files: delete own uploads"
on storage.objects for delete to authenticated
using (
  bucket_id = 'claim-attachments'
  and owner_id = (select auth.uid())::text
  and exists (
    select 1 from public.claims c
    where c.id::text = (storage.foldername(objects.name))[1]
  )
);

-- ---------------------------------------------------------------------------
-- Realtime for the chat
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.claim_messages;
