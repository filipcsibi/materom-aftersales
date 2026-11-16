-- Lepas Aftersales portal: accounts (importer / dealer) + Technical After Services tickets with chat.

create schema if not exists private;

create type public.user_role as enum ('importer', 'dealer');
create type public.ticket_status as enum ('draft', 'open', 'closed');

-- ---------------------------------------------------------------------------
-- Dealers & profiles
-- ---------------------------------------------------------------------------

create table public.dealers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null,
  dealer_id uuid references public.dealers (id) on delete restrict,
  full_name text not null,
  email text not null,
  created_at timestamptz not null default now(),
  constraint profiles_dealer_matches_role check ((role = 'dealer') = (dealer_id is not null))
);

create index profiles_dealer_id_idx on public.profiles (dealer_id);

-- Helpers used by RLS policies. They live in a non-exposed schema and are
-- SECURITY DEFINER so that policies on `profiles` do not recurse.
create function private.is_importer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'importer'
  );
$$;

create function private.my_dealer_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select dealer_id from public.profiles where id = (select auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Technical support tickets
-- ---------------------------------------------------------------------------

create sequence private.tech_ticket_no_seq;

create table public.tech_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_no text unique,
  dealer_id uuid not null references public.dealers (id) on delete restrict,
  created_by uuid not null references public.profiles (id) on delete restrict,
  status public.ticket_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  closed_at timestamptz,
  last_message_at timestamptz,
  last_message_role public.user_role,

  -- Basic Information (mirrors the manufacturer form)
  vin text,
  engine_no text,                    -- first "Engine Model" field (next to VIN)
  trans_no text,
  dtc_code text,
  vehicle_attribute text,
  customer_issue_description text,
  inspection_process text,
  theme text,
  brand text,
  vehicle_type_no text,
  engine_model text,
  transmission_type text,
  notification_no text,
  import_information text,
  production_date date,
  sale_date date,
  consultation_type text,
  first_failure_date date,
  fault_mileage integer,
  software_version text,
  road_conditions text,
  working_condition text,
  seriousness text,
  main_parts text,
  supplier text,
  third_party_equipment text,
  equipment_added text,
  responsibility_unit text,
  diagnosis_results text
);

create index tech_tickets_dealer_id_idx on public.tech_tickets (dealer_id);
create index tech_tickets_created_by_idx on public.tech_tickets (created_by);
create index tech_tickets_status_idx on public.tech_tickets (status);

-- Fills ownership columns from the session and protects columns users must not change.
create function private.tech_tickets_guard()
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
        raise exception 'Only dealer accounts can create tickets';
      end if;
    end if;
    new.ticket_no := null;
    new.submitted_at := null;
    new.closed_at := null;
    new.last_message_at := null;
    new.last_message_role := null;
  else
    new.dealer_id := old.dealer_id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.ticket_no := old.ticket_no;
    new.submitted_at := old.submitted_at;
    if old.status <> 'draft' and new.status = 'draft' then
      raise exception 'A submitted ticket cannot go back to draft';
    end if;
    new.updated_at := now();
  end if;

  -- Number the ticket the first time it is submitted.
  if new.status <> 'draft' and new.ticket_no is null then
    new.ticket_no := 'TS' || to_char(now(), 'YYYY') || '-'
      || lpad(nextval('private.tech_ticket_no_seq')::text, 5, '0');
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

create trigger tech_tickets_guard
before insert or update on public.tech_tickets
for each row execute function private.tech_tickets_guard();

-- ---------------------------------------------------------------------------
-- Form attachments (the four "Attached List" sections)
-- ---------------------------------------------------------------------------

create table public.tech_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tech_tickets (id) on delete cascade,
  category text not null check (category in ('basic_vehicle_info', 'fault_info', 'module_version', 'data_flow')),
  kind text not null check (kind in ('image', 'file')),
  storage_path text not null unique,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

create index tech_attachments_ticket_id_idx on public.tech_attachments (ticket_id);
create index tech_attachments_uploaded_by_idx on public.tech_attachments (uploaded_by);

-- ---------------------------------------------------------------------------
-- Chat messages
-- ---------------------------------------------------------------------------

create table public.tech_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tech_tickets (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete restrict,
  sender_role public.user_role not null,
  sender_name text not null,
  body text not null default '',
  -- [{ "path": "...", "name": "...", "mime": "...", "size": 123 }]
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint tech_messages_not_empty check (
    length(btrim(body)) > 0 or jsonb_array_length(attachments) > 0
  ),
  constraint tech_messages_attachments_is_array check (jsonb_typeof(attachments) = 'array')
);

create index tech_messages_ticket_id_idx on public.tech_messages (ticket_id, created_at);
create index tech_messages_sender_id_idx on public.tech_messages (sender_id);

-- Sender identity always comes from the session, never from the client payload.
create function private.tech_messages_set_sender()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.profiles%rowtype;
begin
  select * into p from public.profiles where id = (select auth.uid());
  if not found then
    raise exception 'No profile for the current user';
  end if;
  new.sender_id := p.id;
  new.sender_role := p.role;
  new.sender_name := p.full_name;
  new.created_at := now();
  return new;
end;
$$;

create trigger tech_messages_set_sender
before insert on public.tech_messages
for each row execute function private.tech_messages_set_sender();

create function private.tech_messages_touch_ticket()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.tech_tickets
  set last_message_at = new.created_at,
      last_message_role = new.sender_role
  where id = new.ticket_id;
  return null;
end;
$$;

create trigger tech_messages_touch_ticket
after insert on public.tech_messages
for each row execute function private.tech_messages_touch_ticket();

-- The ticket guard resets last_message_* only on INSERT, so the update above sticks.

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

grant usage on schema private to authenticated;
revoke execute on all functions in schema private from public;
grant execute on function private.is_importer() to authenticated;
grant execute on function private.my_dealer_id() to authenticated;

grant select on public.profiles to authenticated;
grant select, insert, update on public.dealers to authenticated;
grant select, insert, update, delete on public.tech_tickets to authenticated;
grant select, insert, delete on public.tech_attachments to authenticated;
grant select, insert on public.tech_messages to authenticated;

grant all on public.profiles, public.dealers, public.tech_tickets,
  public.tech_attachments, public.tech_messages to service_role;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.dealers enable row level security;
alter table public.profiles enable row level security;
alter table public.tech_tickets enable row level security;
alter table public.tech_attachments enable row level security;
alter table public.tech_messages enable row level security;

-- profiles: read your own, importer reads all. Writes only via the service role.
create policy "profiles: read own or importer"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select private.is_importer()));

-- dealers
create policy "dealers: read own or importer"
on public.dealers for select to authenticated
using (id = (select private.my_dealer_id()) or (select private.is_importer()));

create policy "dealers: importer inserts"
on public.dealers for insert to authenticated
with check ((select private.is_importer()));

create policy "dealers: importer updates"
on public.dealers for update to authenticated
using ((select private.is_importer()))
with check ((select private.is_importer()));

-- tickets: a dealer sees its own; the importer sees everything that was submitted.
create policy "tickets: dealer reads own, importer reads submitted"
on public.tech_tickets for select to authenticated
using (
  dealer_id = (select private.my_dealer_id())
  or ((select private.is_importer()) and status <> 'draft')
);

create policy "tickets: dealer creates"
on public.tech_tickets for insert to authenticated
with check (
  dealer_id = (select private.my_dealer_id())
  and status in ('draft', 'open')
);

create policy "tickets: dealer edits drafts"
on public.tech_tickets for update to authenticated
using (dealer_id = (select private.my_dealer_id()) and status = 'draft')
with check (dealer_id = (select private.my_dealer_id()) and status in ('draft', 'open'));

create policy "tickets: importer updates submitted"
on public.tech_tickets for update to authenticated
using ((select private.is_importer()) and status <> 'draft')
with check ((select private.is_importer()) and status <> 'draft');

create policy "tickets: dealer deletes drafts"
on public.tech_tickets for delete to authenticated
using (dealer_id = (select private.my_dealer_id()) and status = 'draft');

-- attachments: visible with the ticket; editable only by the dealer while it is a draft.
-- (The sub-select on tech_tickets is itself filtered by the ticket policies above.)
create policy "attachments: read with ticket"
on public.tech_attachments for select to authenticated
using (exists (select 1 from public.tech_tickets t where t.id = ticket_id));

create policy "attachments: dealer adds to draft"
on public.tech_attachments for insert to authenticated
with check (
  uploaded_by = (select auth.uid())
  and exists (
    select 1 from public.tech_tickets t
    where t.id = ticket_id and t.status = 'draft'
      and t.dealer_id = (select private.my_dealer_id())
  )
);

create policy "attachments: dealer removes from draft"
on public.tech_attachments for delete to authenticated
using (
  exists (
    select 1 from public.tech_tickets t
    where t.id = ticket_id and t.status = 'draft'
      and t.dealer_id = (select private.my_dealer_id())
  )
);

-- messages: both sides of a ticket can read; posting only while the ticket is open.
create policy "messages: read with ticket"
on public.tech_messages for select to authenticated
using (exists (select 1 from public.tech_tickets t where t.id = ticket_id));

create policy "messages: post on open ticket"
on public.tech_messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1 from public.tech_tickets t
    where t.id = ticket_id and t.status = 'open'
  )
);

-- ---------------------------------------------------------------------------
-- Storage: private bucket, objects live under "<ticket id>/..."
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit)
values ('tech-attachments', 'tech-attachments', false, 52428800)
on conflict (id) do nothing;

create policy "tech files: read with ticket"
on storage.objects for select to authenticated
using (
  bucket_id = 'tech-attachments'
  and exists (
    select 1 from public.tech_tickets t
    where t.id::text = (storage.foldername(objects.name))[1]
  )
);

create policy "tech files: upload to visible, not closed ticket"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'tech-attachments'
  and exists (
    select 1 from public.tech_tickets t
    where t.id::text = (storage.foldername(objects.name))[1]
      and t.status <> 'closed'
  )
);

create policy "tech files: delete own uploads"
on storage.objects for delete to authenticated
using (
  bucket_id = 'tech-attachments'
  and owner_id = (select auth.uid())::text
  and exists (
    select 1 from public.tech_tickets t
    where t.id::text = (storage.foldername(objects.name))[1]
  )
);

-- ---------------------------------------------------------------------------
-- Realtime for the chat
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.tech_messages;
