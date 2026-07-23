import { createCompanyResearch } from "@/lib/ai/research";
import { createBuyerLikelihoodAnalysis } from "@/lib/ai/buyer-scoring";
import { categoryMaximums, scoreCategories, scoreLabel } from "@/lib/scoring";
import { scrapeCompanyHomepage } from "@/lib/providers/crawler";
import { TavilySearchProvider } from "@/lib/providers/search";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { inngest } from "../client";

export const researchCompany = inngest.createFunction({ id: "research-company", retries: 2, triggers: { event: "prospects/research.requested" } }, async ({ event, step }) => {
  const { runId, companyId, organisationId } = event.data as { runId: string; companyId: string; organisationId: string };
  const admin = createSupabaseAdminClient();
  const updateRun = (values: Record<string, unknown>) => admin.from("research_runs").update(values).eq("id", runId);
  await step.run("mark-research-running", () => updateRun({ status: "running", progress: 10, started_at: new Date().toISOString() }));
  try {
    const company = await step.run("load-company", async () => { const { data, error } = await admin.from("companies").select("id,name,domain,website_url,description,industry,country,employee_range,business_model,products,source_urls").eq("id", companyId).eq("organisation_id", organisationId).single(); if (error || !data) throw new Error("Company not found"); return data; });
    if (!company.website_url) throw new Error("Company website is missing");
    const firecrawlKey = process.env.FIRECRAWL_API_KEY; const tavilyKey = process.env.TAVILY_API_KEY;
    if (!firecrawlKey || !tavilyKey || !process.env.OPENAI_API_KEY) throw new Error("Research providers are not fully configured");
    await updateRun({ progress: 25 });
    const homepage = await step.run("scrape-official-website", () => scrapeCompanyHomepage(company.website_url, firecrawlKey));
    await updateRun({ progress: 45, pages_crawled: 1 });
    const search = new TavilySearchProvider(tavilyKey);
    const webResults = await step.run("find-current-sources", async () => {
      const queries = [`${company.name} news priorities growth`, `${company.name} customers community reviews reputation`];
      return (await Promise.all(queries.map(query => search.search(query, 5)))).flat();
    });
    await updateRun({ progress: 65, pages_requested: webResults.length + 1 });
    const sourceUrls = [...new Set([homepage.url, ...webResults.map(result => result.url)])];
    const intelligence = await step.run("analyse-company", () => createCompanyResearch({ company, official_website: homepage, web_sources: webResults, source_urls: sourceUrls }));
    await updateRun({ progress: 80 });
    const buyer = await step.run("score-buyer-likelihood", () => createBuyerLikelihoodAnalysis({ company, approved_research: intelligence, official_website: homepage, web_sources: webResults, source_urls: sourceUrls, offer_prices: ["£349 audit", "£995 monthly retainer", "£1495 workshop"] }));
    await updateRun({ progress: 90 });
    const { error } = await admin.from("company_intelligence").upsert({ organisation_id: organisationId, company_id: companyId, ...intelligence, source_urls: sourceUrls, generated_at: new Date().toISOString(), approved_at: null, approved_by: null, updated_at: new Date().toISOString() }, { onConflict: "company_id" });
    if (error) throw error;
    const points = Object.fromEntries(scoreCategories.map(key => [key, Math.round(buyer.categories[key].score / 10 * categoryMaximums[key])])) as Record<(typeof scoreCategories)[number], number>;
    const { error: scoreError } = await admin.from("prospect_scores").upsert({ organisation_id: organisationId, company_id: companyId, total_score: buyer.total_score, buyer_intent_score: points.buyerIntent, community_need_score: points.communityIntelligenceNeed, community_footprint_score: points.communityFootprint, marketing_maturity_score: points.marketingMaturity, budget_ability_score: points.budgetAbility, competitive_pressure_score: points.competitivePressure, ai_search_importance_score: points.aiSearchImportance, immediate_buying_signals_score: points.immediateBuyingSignals, confidence_penalty: Math.round(buyer.confidence_penalty), category_evidence: buyer.categories, buying_questions: { understands_need: buyer.understands_need, pain_without_intelligence: buyer.pain_without_intelligence, ability_to_spend: buyer.ability_to_spend, specific_problem: buyer.specific_problem, prioritise_over_100: buyer.prioritise_over_100 }, why_they_would_buy: buyer.why_they_would_buy, expected_outcome: buyer.expected_outcome, likely_champion: buyer.likely_champion, buy_now_trigger: buyer.buy_now_trigger, likely_objections: buyer.likely_objections, score_explanation: scoreLabel(buyer.total_score), positive_signals: Object.values(buyer.categories).flatMap(category => category.evidence), negative_signals: buyer.likely_objections, missing_information: buyer.missing_information, scoring_version: 2, calculated_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: "company_id" });
    if (scoreError) throw scoreError;
    await Promise.all([
      admin.from("companies").update({ last_researched_at: new Date().toISOString() }).eq("id", companyId),
      admin.from("pipeline_opportunities").update({ stage: "research_ready", recommended_service: intelligence.recommended_service, next_action: "Review and approve company intelligence", updated_at: new Date().toISOString() }).eq("company_id", companyId),
      updateRun({ status: "completed", progress: 100, completed_at: new Date().toISOString() }),
      admin.from("activities").insert({ organisation_id: organisationId, company_id: companyId, activity_type: "research_completed", summary: "Company intelligence ready for review" }),
    ]);
    return { companyId, sources: sourceUrls.length };
  } catch (error) {
    await updateRun({ status: "failed", error_message: error instanceof Error ? error.message : "Research failed", completed_at: new Date().toISOString() });
    await admin.from("pipeline_opportunities").update({ stage: "approved" }).eq("company_id", companyId);
    throw error;
  }
});
