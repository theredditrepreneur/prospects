alter table public.companies add column if not exists saved_at timestamptz;
alter table public.companies add column if not exists hidden_at timestamptz;
create index if not exists companies_opportunity_feed_idx on public.companies(organisation_id, hidden_at, initial_icp_match_score desc, created_at desc);
create index if not exists companies_saved_feed_idx on public.companies(organisation_id, saved_at desc) where saved_at is not null;
