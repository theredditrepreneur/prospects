alter table public.organisations add column if not exists discovery_match_threshold integer not null default 70 check (discovery_match_threshold between 0 and 100);
alter table public.discovery_runs add column if not exists minimum_match_score integer not null default 70;
alter table public.companies add column if not exists initial_icp_match_score integer check (initial_icp_match_score between 0 and 100);
alter table public.companies add column if not exists verification_evidence jsonb not null default '[]'::jsonb;
alter table public.companies add column if not exists verified_company boolean not null default false;
alter table public.companies add column if not exists country text;
alter table public.companies add column if not exists parent_company text;
create index if not exists companies_initial_icp_score_idx on public.companies(organisation_id,initial_icp_match_score desc);
create policy organisation_owner_discovery_settings on public.organisations for update
using (exists (select 1 from public.organisation_memberships m where m.organisation_id=id and m.user_id=auth.uid() and m.status='active' and m.role='owner'))
with check (exists (select 1 from public.organisation_memberships m where m.organisation_id=id and m.user_id=auth.uid() and m.status='active' and m.role='owner'));
