# Security

Private routes fail closed in production. Supabase sessions are verified server-side with `getUser`; database RLS provides a second organisation boundary. Server actions and route handlers must validate input with Zod and check role permissions centrally. Secrets are environment variables and never use a `NEXT_PUBLIC_` prefix unless intentionally public. Security-relevant writes belong in `audit_logs`.

The root metadata blocks indexing, robots.txt disallows all crawling, no sitemap exists, and the app must not be linked from the public website. Gmail refresh tokens must be encrypted with `GMAIL_TOKEN_ENCRYPTION_KEY` before persistence. Never log tokens, prompts containing private notes, or credential values.
