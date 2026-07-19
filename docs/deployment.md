# Deployment

1. Create production Supabase and apply all migrations.
2. Import this repository into Vercel and set the variables in `.env.example` for Production and Preview as appropriate.
3. Set `NEXT_PUBLIC_APP_URL=https://prospects.theredditrepreneur.com` and configure OAuth redirect URLs.
4. Deploy, verify `/login`, authenticated redirects, RLS, robots.txt and role restrictions.
5. Add the domain in Vercel, then create the exact DNS record Vercel displays. The normal GoDaddy record is CNAME, host `prospects`, value `cname.vercel-dns.com`, TTL default. Do not use that value if Vercel displays a project-specific target.

Deployment and DNS changes remain manual. Preview deployments should use separate credentials and must never contain production prospect data.
