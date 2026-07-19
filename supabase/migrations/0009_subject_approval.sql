alter table public.outreach_messages
add column if not exists subject_approved_at timestamptz,
add column if not exists subject_approved_by uuid references public.profiles;

