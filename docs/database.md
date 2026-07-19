# Database

`supabase/migrations/0001_initial.sql` creates organisations, memberships, ICPs, discovery and research runs, companies, contacts, crawled-page metadata, intelligence, signals, scores, outreach, activities, pipeline, notes, tasks, integrations, services, usage and audit logs. Every operational row carries `organisation_id`; RLS uses active membership for isolation. A partial unique index prevents concurrent active research for one company, and company domains are unique per organisation.

Raw crawl content should remain in short-lived job storage, not the durable `company_pages` table. Retain summaries and hashes, and expire any temporary raw body after 30 days by default.
