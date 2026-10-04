-- Sajag: deliberately opt-in storage. No financial accounts, balances or recordings.
begin;

create table if not exists public.notebook_entries (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id uuid not null,
  analysis jsonb not null,
  saved_at timestamptz not null default now(),
  primary key (user_id, id),
  constraint analysis_is_object check (jsonb_typeof(analysis) = 'object'),
  constraint required_fields_present check (analysis ?& array['id', 'input', 'language', 'findings', 'summary', 'limitations']),
  constraint analysis_size_limit check (octet_length(analysis::text) <= 65536),
  constraint input_is_text check (jsonb_typeof(analysis->'input') = 'string' and length(analysis->>'input') <= 6000),
  constraint id_matches_payload check (analysis->>'id' = id::text),
  constraint language_supported check (analysis->>'language' in ('en', 'hi'))
);

alter table public.notebook_entries enable row level security;
alter table public.notebook_entries force row level security;
revoke all on public.notebook_entries from anon;
grant select, insert, update, delete on public.notebook_entries to authenticated;

create policy "read own notebook" on public.notebook_entries for select to authenticated using ((select auth.uid()) = user_id);
create policy "insert own notebook" on public.notebook_entries for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "update own notebook" on public.notebook_entries for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "delete own notebook" on public.notebook_entries for delete to authenticated using ((select auth.uid()) = user_id);

create index notebook_entries_recent on public.notebook_entries (user_id, saved_at desc);
comment on table public.notebook_entries is 'Explicitly saved, redacted educational checks. Never uploaded automatically. Users can delete their own rows.';

commit;
