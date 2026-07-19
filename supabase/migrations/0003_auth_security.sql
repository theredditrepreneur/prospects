alter table public.profiles enable row level security;
create policy profile_self_select on public.profiles for select using (id = auth.uid());
create policy profile_self_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create index if not exists memberships_user_status_idx on public.organisation_memberships(user_id, status);
