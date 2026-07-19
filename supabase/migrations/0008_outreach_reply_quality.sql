alter table public.outreach_messages
add column if not exists subject_options jsonb not null default '[]'::jsonb,
add column if not exists generation_rationale text;

