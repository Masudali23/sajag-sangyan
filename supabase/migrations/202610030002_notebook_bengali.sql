-- Bengali (bn) joins English and Hindi as a supported notebook language.
alter table public.notebook_entries drop constraint language_supported;
alter table public.notebook_entries add constraint language_supported check (analysis->>'language' in ('en', 'hi', 'bn'));
