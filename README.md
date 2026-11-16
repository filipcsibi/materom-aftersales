# Lepas Aftersales

Portal for the importer and its dealers. Dealers fill in requests that the importer then
handles (and copies into the manufacturer's platform); each request has its own chat.

Modules:

- **Technical After Services** — done (form, attachments, chat)
- **Claim Management (warranty)** — done (form, material / labor / sub-material lists, photos).
  No chat: the importer sets a status (pending / rejected / approved) with an optional note, and
  the dealer can edit the claim until it is approved.

Stack: Next.js 16 (App Router) + Supabase (Auth, Postgres with RLS, Storage, Realtime).

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in the three Supabase values
npm run dev
```

## First importer account

Public sign-up is disabled. Create the first importer from the command line, then create
dealers and all other accounts from **Dealeri și conturi** (`/admin`) in the app:

```bash
node --env-file=.env.local scripts/create-importer.mjs you@company.ro 'a-long-password' "Your Name"
```

## Database

Schema, RLS policies, storage bucket and realtime setup live in `supabase/migrations/`.

```bash
supabase link --project-ref <ref>
supabase db push
```

Access rules (enforced in the database, not only in the UI):

- a dealer sees only its own tickets, files and messages;
- the importer sees every ticket once it is submitted (never drafts);
- a ticket is locked for the dealer after "Save And Submit"; only the importer closes/reopens it;
- chat is available while the ticket is open (technical support only);
- a claim stays editable by its dealer until the importer approves it; any dealer edit puts it
  back to "pending".

## Where things are

- `src/lib/ticket-fields.ts` — the form definition: fields, labels, required flags and the
  dropdown values (copied from the manufacturer platform).
- `src/components/ticket-form.tsx`, `attached-list.tsx`, `chat.tsx` — form, uploads, chat.
- `src/app/(app)/technical-support/` — list, ticket page, server actions.
- `src/lib/claim-fields.ts`, `src/components/claim-form.tsx`, `src/app/(app)/claims/` — the
  warranty claim form, its line items and pages.
- `src/app/(app)/admin/` — dealers and accounts (importer only).
