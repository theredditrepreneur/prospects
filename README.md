# Prospect Intelligence OS

Private prospect research and revenue operating system for The Redditrepreneur. It combines ICP definition, public-web discovery, evidence-led research, explained opportunity scoring, human-reviewed outreach and a sales pipeline. It is not a public SaaS product or an automatic email sender.

## Local development

1. Install Node.js 22 or newer and run `npm install`.
2. Copy `.env.example` to `.env.local` and add credentials.
3. Create a Supabase project and apply `supabase/migrations` in order.
4. Configure the Supabase URL and anonymous key, then run `npm run dev`.
5. Open `http://localhost:3000`. In production, missing authentication configuration fails closed and redirects private pages to `/login`.

Quality commands: `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.

## Integrations

- Supabase provides Postgres, authentication and row-level organisation isolation.
- Tavily is the first search provider behind a replaceable interface.
- Firecrawl performs bounded public website crawling and must respect site restrictions.
- OpenAI Responses API operations belong on the server and return schema-validated, source-linked output.
- Inngest runs durable discovery, research, scoring and generation jobs.
- Gmail OAuth may create a draft only after an authorised user approves a message and confirms the final recipient, subject and body. There is no send-email endpoint.

See the `docs` directory for architecture, database, security, deployment, integration, scoring, permissions and outreach safety details.

## Vercel and domain

Import the GitHub repository into Vercel, configure all production environment variables, apply migrations, and deploy. Add `prospects.theredditrepreneur.com` in Vercel Domains. Vercel commonly requests a GoDaddy CNAME with host `prospects` and value `cname.vercel-dns.com`; use the exact target displayed by the Vercel project because Vercel may provide a project-specific target. DNS is intentionally not modified by this project.
