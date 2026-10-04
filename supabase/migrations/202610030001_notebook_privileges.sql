-- Row-level security does not govern TRUNCATE/REFERENCES/TRIGGER; remove Supabase's default grants.
revoke truncate, references, trigger on public.notebook_entries from authenticated;
