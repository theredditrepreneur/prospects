alter table public.companies add column if not exists match_explanation text;
alter table public.companies add column if not exists discovery_evidence text;
alter table public.companies add column if not exists discovery_confidence text;
create index if not exists discovery_runs_org_created_idx on public.discovery_runs(organisation_id,created_at desc);
create index if not exists companies_discovery_run_idx on public.companies(discovery_run_id);
