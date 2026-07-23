update public.companies
set saved_at = coalesce(saved_at, updated_at, created_at), hidden_at = null
where status = 'approved' and saved_at is null;

update public.companies
set hidden_at = coalesce(hidden_at, updated_at, created_at), saved_at = null
where status = 'rejected' and hidden_at is null;
