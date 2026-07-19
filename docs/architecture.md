# Architecture

Next.js App Router renders the private application and server endpoints on Vercel. Supabase Auth issues sessions; middleware protects every route except login and robots.txt. Postgres stores organisation-scoped records under RLS. Provider interfaces isolate Tavily and Firecrawl. Inngest should orchestrate discovery, crawl, synthesis, scoring and generation with idempotency keys and bounded retries. OpenAI calls remain server-side, use the Responses API, structured outputs and the guardrails in `src/lib/ai/prompts.ts`.

The workflow is ICP → discovery → human approval → bounded research → intelligence review → explained score → approved outreach angle → editable draft → explicit Gmail draft confirmation → pipeline. No path sends email.
