import { passesCompanyQualityGate, verifyCompany } from "@/lib/company-verification";
import { buildDiscoveryQueries, normaliseResults } from "@/lib/discovery";
import { scrapeCompanyHomepage } from "@/lib/providers/crawler";
import { TavilySearchProvider } from "@/lib/providers/search";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { inngest } from "../client";

export const discoverProspects = inngest.createFunction(
  { id: "discover-prospects", retries: 3, triggers: { event: "prospects/discovery.requested" } },
  async ({ event, step }) => {
    const { runId, icpId, organisationId, limit } = event.data as { runId: string; icpId: string; organisationId: string; limit: number };
    if (!runId || !icpId || !organisationId) throw new Error("Start Company Discovery from the Prospect Intelligence OS so the ICP and organisation are supplied.");
    const admin = createSupabaseAdminClient();
    const updateRun = (values: Record<string, unknown>) => admin.from("discovery_runs").update(values).eq("id", runId);
    await step.run("mark-running", () => updateRun({ status: "running", progress: 5, current_step: "Loading your ICP…", started_at: new Date().toISOString() }));

    try {
      const context = await step.run("load-company-discovery-context", async () => {
        const [{ data: icp, error: icpError }, { data: org, error: orgError }] = await Promise.all([
          admin.from("icps").select("name,description,industries,excluded_industries,countries,regions,business_models,funding_stages,technologies,target_roles,target_departments,required_signals,preferred_signals,excluded_signals,keywords,company_size_min,company_size_max,default_service").eq("id", icpId).eq("organisation_id", organisationId).single(),
          admin.from("organisations").select("discovery_match_threshold").eq("id", organisationId).single(),
        ]);
        if (icpError || !icp) throw new Error("ICP not found");
        if (orgError || !org) throw new Error("Organisation settings not found");
        return { icp, threshold: org.discovery_match_threshold ?? 70 };
      });

      const tavilyKey = process.env.TAVILY_API_KEY;
      const firecrawlKey = process.env.FIRECRAWL_API_KEY;
      if (!tavilyKey) throw new Error("TAVILY_API_KEY is not configured");
      if (!firecrawlKey) throw new Error("FIRECRAWL_API_KEY is not configured");
      const queries = buildDiscoveryQueries(context.icp);
      const provider = new TavilySearchProvider(tavilyKey);
      await updateRun({ minimum_match_score: context.threshold, search_query: queries.join(" | "), progress: 12, current_step: "Searching for candidate companies…" });
      const results = await step.run("discover-company-domains", async () => {
        const perQuery = Math.max(8, Math.ceil(limit * 1.5 / queries.length));
        const groups = await Promise.all(queries.map(async query => (await provider.search(query, perQuery)).map(result => ({ ...result, query }))));
        return groups.flat();
      });
      const candidates = normaliseResults(results).slice(0, Math.min(limit * 2, 60));
      const domains = candidates.map(candidate => candidate.domain);
      const { data: existing } = domains.length ? await admin.from("companies").select("domain").eq("organisation_id", organisationId).in("domain", domains) : { data: [] };
      const existingDomains = new Set(existing?.map(company => company.domain));
      const fresh = candidates.filter(candidate => !existingDomains.has(candidate.domain));
      if (fresh.length) await admin.from("discovery_candidates").upsert(fresh.map(candidate => ({ organisation_id: organisationId, discovery_run_id: runId, domain: candidate.domain, website_url: candidate.websiteUrl, source_url: candidate.sourceUrl, company_name: candidate.name, status: "discovered" })), { onConflict: "discovery_run_id,domain" });
      await updateRun({ companies_found: candidates.length, progress: 20, current_step: `Found ${candidates.length} candidate domains. Verifying company websites…` });

      const qualified: Array<Record<string, unknown>> = [];
      const companyKeys = new Set<string>();
      let checked = 0;
      let rejected = 0;
      for (const candidate of fresh) {
        if (qualified.length >= limit) break;
        await admin.from("discovery_candidates").update({ status: "verifying", updated_at: new Date().toISOString() }).eq("discovery_run_id", runId).eq("domain", candidate.domain);
        const result = await step.run(`verify-company-${candidate.domain}`.slice(0, 100), async () => {
          try { const page = await scrapeCompanyHomepage(candidate.websiteUrl, firecrawlKey); return { page, verification: await verifyCompany(candidate, page, context.icp), error: null }; }
          catch (error) { return { page: null, verification: null, error: error instanceof Error ? error.message : "Website verification failed." }; }
        });
        checked++;
        if (!result.page || !result.verification) {
          rejected++;
          await admin.from("discovery_candidates").update({ status: "error", rejection_reason: result.error, updated_at: new Date().toISOString() }).eq("discovery_run_id", runId).eq("domain", candidate.domain);
        } else if (!passesCompanyQualityGate(result.verification, context.threshold)) {
          rejected++;
          const v = result.verification;
          const reason = v.rejection_reason || (!v.is_operating_business ? "The website did not verify an active operating business." : !v.is_commercial_organisation ? "The website did not verify a commercial organisation." : !v.has_identifiable_products_or_services ? "No clear product or service was verified." : !v.matches_icp ? "The company did not match the selected ICP." : !v.evidence.length ? "There was not enough evidence on the company website." : `ICP Match Score ${v.match_score} was below the ${context.threshold}+ threshold.`);
          await admin.from("discovery_candidates").update({ status: "rejected", company_name: v.company_name, match_score: v.match_score, rejection_reason: reason, evidence: v.evidence, updated_at: new Date().toISOString() }).eq("discovery_run_id", runId).eq("domain", candidate.domain);
        } else {
          const v = result.verification;
          const companyKey = (v.parent_company || v.company_name).toLowerCase().replace(/[^a-z0-9]/g, "");
          if (companyKeys.has(companyKey)) {
            rejected++;
            await admin.from("discovery_candidates").update({ status: "rejected", company_name: v.company_name, match_score: v.match_score, rejection_reason: "Duplicate company in this discovery run.", evidence: v.evidence }).eq("discovery_run_id", runId).eq("domain", candidate.domain);
          } else {
            companyKeys.add(companyKey);
            await admin.from("discovery_candidates").update({ status: "qualified", company_name: v.company_name, match_score: v.match_score, evidence: v.evidence }).eq("discovery_run_id", runId).eq("domain", candidate.domain);
            qualified.push({ organisation_id: organisationId, name: v.company_name, domain: candidate.domain, website_url: result.page.url, industry: v.industry, description: v.description, headquarters: v.country, country: v.country, employee_range: v.employee_range, business_model: v.business_model, products: v.products, ideal_customers: [], technology_summary: null, source: "company_discovery", source_urls: [result.page.url, candidate.sourceUrl], discovery_run_id: runId, status: "pending_approval", match_explanation: v.reason_it_matches, discovery_evidence: v.evidence.join(" · "), discovery_confidence: v.confidence, initial_icp_match_score: v.match_score, verification_evidence: v.evidence, verified_company: true, parent_company: v.parent_company });
          }
        }
        const progress = fresh.length ? Math.min(92, 20 + Math.round((checked / fresh.length) * 72)) : 92;
        await updateRun({ progress, current_step: `Verified ${checked} of ${fresh.length} candidate websites…`, candidates_verified: checked, candidates_rejected: rejected });
      }

      let imported = 0;
      if (qualified.length) { const { data, error } = await admin.from("companies").insert(qualified).select("id"); if (error) throw error; imported = data?.length || 0; }
      await admin.from("usage_events").insert([
        { organisation_id: organisationId, event_type: "discovery_search", quantity: queries.length, metadata: { run_id: runId, provider: "tavily" } },
        { organisation_id: organisationId, event_type: "firecrawl_page", quantity: checked, metadata: { run_id: runId } },
        { organisation_id: organisationId, event_type: "openai_request", quantity: checked, metadata: { run_id: runId, operation: "company_verification" } },
      ]);
      await updateRun({ status: "completed", progress: 100, current_step: imported ? `Complete — ${imported} Potential Prospect${imported === 1 ? "" : "s"} found.` : "Complete — no candidates passed the quality gate.", companies_found: candidates.length, companies_imported: imported, candidates_verified: checked, candidates_rejected: rejected, completed_at: new Date().toISOString() });
      return { candidate_domains: candidates.length, verified_prospects: imported, threshold: context.threshold };
    } catch (error) {
      await updateRun({ status: "failed", current_step: "Discovery stopped because of an error.", error_message: error instanceof Error ? error.message : "Company Discovery failed", completed_at: new Date().toISOString() });
      throw error;
    }
  },
);
