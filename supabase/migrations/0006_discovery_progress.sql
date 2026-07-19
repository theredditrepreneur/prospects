alter table public.discovery_runs add column if not exists progress integer not null default 0 check (progress between 0 and 100);
alter table public.discovery_runs add column if not exists current_step text;
alter table public.discovery_runs add column if not exists candidates_verified integer not null default 0;
alter table public.discovery_runs add column if not exists candidates_rejected integer not null default 0;

create table if not exists public.discovery_candidates(
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations on delete cascade,
  discovery_run_id uuid not null references public.discovery_runs on delete cascade,
  domain text not null,
  website_url text not null,
  source_url text,
  company_name text,
  status text not null default 'discovered',
  match_score integer check(match_score between 0 and 100),
  rejection_reason text,
  evidence jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(discovery_run_id,domain)
);
alter table public.discovery_candidates enable row level security;
create policy discovery_candidate_org_isolation on public.discovery_candidates for all
using (public.is_org_member(organisation_id)) with check (public.is_org_member(organisation_id));
create index if not exists discovery_candidates_run_status_idx on public.discovery_candidates(discovery_run_id,status);
