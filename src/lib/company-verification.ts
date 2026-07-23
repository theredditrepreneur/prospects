import OpenAI from "openai";
import { z } from "zod";
import type { DiscoveryCandidate } from "@/lib/discovery";
import type { ScrapedCompanyPage } from "@/lib/providers/crawler";

const evidenceItem = z.object({ claim: z.string(), evidence: z.string(), source_url: z.string() });
const verificationSchema = z.object({
  is_operating_business: z.boolean(), is_commercial_organisation: z.boolean(), is_target_company: z.boolean(), has_identifiable_products_or_services: z.boolean(), matches_icp: z.boolean(), company_name: z.string(), parent_company: z.string().nullable(), industry: z.string(), description: z.string(), products: z.array(z.string()), services: z.array(z.string()), country: z.string(), employee_range: z.string(), business_model: z.string(),
  buyer_intent_score: z.number().min(0).max(25), community_need_score: z.number().min(0).max(20), community_footprint_score: z.number().min(0).max(15), marketing_maturity_score: z.number().min(0).max(10), budget_ability_score: z.number().min(0).max(10), competitive_pressure_score: z.number().min(0).max(10), ai_search_importance_score: z.number().min(0).max(5), immediate_buying_signals_score: z.number().min(0).max(5), confidence_penalty: z.number().min(0).max(15),
  concrete_problem_evidenced: z.boolean(), concrete_business_problem: z.string(), why_they_would_buy: z.string(), high_score_evidence: z.array(evidenceItem).max(6), evidence: z.array(z.string()).max(12), confidence: z.enum(["low", "medium", "high"]), rejection_reason: z.string().nullable(),
});
export type CompanyVerification = z.infer<typeof verificationSchema> & { match_score: number; country_match: boolean };
type OpportunityInputs = Pick<z.infer<typeof verificationSchema>, "buyer_intent_score"|"community_need_score"|"community_footprint_score"|"marketing_maturity_score"|"budget_ability_score"|"competitive_pressure_score"|"ai_search_importance_score"|"immediate_buying_signals_score"|"confidence_penalty"|"concrete_problem_evidenced"|"high_score_evidence">;

export function calculateDiscoveryOpportunityScore(input: OpportunityInputs) {
  const subtotal = input.buyer_intent_score + input.community_need_score + input.community_footprint_score + input.marketing_maturity_score + input.budget_ability_score + input.competitive_pressure_score + input.ai_search_importance_score + input.immediate_buying_signals_score;
  const penalised = Math.max(0, Math.round(subtotal - input.confidence_penalty));
  const hasExplicitHighScoreEvidence = input.concrete_problem_evidenced && input.high_score_evidence.length > 0;
  return Math.min(hasExplicitHighScoreEvidence ? 100 : 80, penalised);
}
export const calculateIcpMatchScore = calculateDiscoveryOpportunityScore;
export function passesDiscoveryOpportunityGate(value: CompanyVerification, threshold: number) { return value.is_operating_business && value.is_commercial_organisation && value.is_target_company && value.country_match && value.has_identifiable_products_or_services && value.matches_icp && value.evidence.length > 0 && value.match_score >= threshold; }
export const passesCompanyQualityGate = passesDiscoveryOpportunityGate;

function canonicalCountry(value: string) { const normalised = value.toLowerCase().replace(/[^a-z]/g, ""); const aliases: Record<string,string> = { uk:"unitedkingdom",gb:"unitedkingdom",greatbritain:"unitedkingdom",england:"unitedkingdom",scotland:"unitedkingdom",wales:"unitedkingdom",northernireland:"unitedkingdom",usa:"unitedstates",us:"unitedstates",unitedstatesofamerica:"unitedstates" }; return aliases[normalised] || normalised; }
export function matchesSelectedCountry(companyCountry: string, selectedCountries: string[] = []) { if (!selectedCountries.length) return true; const company = canonicalCountry(companyCountry); return company !== "unknown" && selectedCountries.some(country => canonicalCountry(country) === company); }

const categoryProperties = {
  buyer_intent_score: { type: "number", minimum: 0, maximum: 25 }, community_need_score: { type: "number", minimum: 0, maximum: 20 }, community_footprint_score: { type: "number", minimum: 0, maximum: 15 }, marketing_maturity_score: { type: "number", minimum: 0, maximum: 10 }, budget_ability_score: { type: "number", minimum: 0, maximum: 10 }, competitive_pressure_score: { type: "number", minimum: 0, maximum: 10 }, ai_search_importance_score: { type: "number", minimum: 0, maximum: 5 }, immediate_buying_signals_score: { type: "number", minimum: 0, maximum: 5 }, confidence_penalty: { type: "number", minimum: 0, maximum: 15 },
} as const;
const required = ["is_operating_business","is_commercial_organisation","is_target_company","has_identifiable_products_or_services","matches_icp","company_name","parent_company","industry","description","products","services","country","employee_range","business_model",...Object.keys(categoryProperties),"concrete_problem_evidenced","concrete_business_problem","why_they_would_buy","high_score_evidence","evidence","confidence","rejection_reason"];
const jsonSchema = { type: "object", additionalProperties: false, required, properties: { is_operating_business:{type:"boolean"},is_commercial_organisation:{type:"boolean"},is_target_company:{type:"boolean"},has_identifiable_products_or_services:{type:"boolean"},matches_icp:{type:"boolean"},company_name:{type:"string"},parent_company:{type:["string","null"]},industry:{type:"string"},description:{type:"string"},products:{type:"array",items:{type:"string"}},services:{type:"array",items:{type:"string"}},country:{type:"string"},employee_range:{type:"string"},business_model:{type:"string"},...categoryProperties,concrete_problem_evidenced:{type:"boolean"},concrete_business_problem:{type:"string"},why_they_would_buy:{type:"string"},high_score_evidence:{type:"array",maxItems:6,items:{type:"object",additionalProperties:false,required:["claim","evidence","source_url"],properties:{claim:{type:"string"},evidence:{type:"string"},source_url:{type:"string"}}}},evidence:{type:"array",maxItems:12,items:{type:"string"}},confidence:{type:"string",enum:["low","medium","high"]},rejection_reason:{type:["string","null"]} } } as const;

const instructions = `Discovery is an opportunity ranking engine for The Redditrepreneur. Score how excited the founder should be to contact this company about buying a Community Intelligence Audit, not how impressive the company appears.

Use these maximum point values: Buyer Intent 25, Community Intelligence Need 20, Community Footprint 15, Marketing Maturity 10, Budget and Ability to Buy 10, Competitive Pressure 10, AI Search Importance 5, Immediate Buying Signals 5. Apply a confidence penalty from 0 to 15 for weak, sparse or inferred evidence.

A polished website, AI messaging, testimonials, product maturity or merely being B2B SaaS are not buying evidence. High scores require explicit evidence of community dependence, reputation sensitivity, competitive comparison, or active investment in marketing, brand, customer insight or product positioning. A smaller company with an evident problem must outrank a polished enterprise with no meaningful need.

The prospect must itself sell a product or service to customers. Set is_target_company false for directories, software comparison sites, review aggregators, marketplaces, media publications, lists, lead generation sites, agencies unless specifically requested, government, universities, research organisations, forums, documentation sites, open source projects, job boards, events, conferences and individuals. These are discovery sources, not prospects. Identify the company's headquarters country from explicit official website evidence. Do not infer location from a domain suffix or audience served.

Set concrete_problem_evidenced true only when the supplied material explicitly supports a real problem Community Intelligence could solve. Put the exact support in high_score_evidence with its source URL. Without that evidence the application will cap the score at 80. Scores above 80 must be rare and indicate a genuinely high probability buyer.

Every positive score must be supported by evidence. Unknown is not positive. Never invent facts or reward assumptions. When two scores are possible, choose the lower one unless explicit evidence supports the higher score. Use the search result only as discovery context, not as verified evidence. Evidence claims must come from the supplied official website.`;

export async function verifyCompany(candidate: DiscoveryCandidate, page: ScrapedCompanyPage, icp: Record<string, unknown>) {
  const key = process.env.OPENAI_API_KEY; if (!key) throw new Error("OPENAI_API_KEY is not configured");
  const client = new OpenAI({ apiKey: key });
  const response = await client.responses.create({ model: process.env.OPENAI_MODEL || "gpt-5-mini", input: [{ role: "system", content: instructions }, { role: "user", content: JSON.stringify({ icp, candidate: { name: candidate.name, domain: candidate.domain, discovery_source: candidate.sourceUrl, unverified_search_context: candidate.evidence }, official_website: { url: page.url, title: page.title, meta_description: page.description, content: page.markdown } }) }], text: { format: { type: "json_schema", name: "discovery_opportunity_score", strict: true, schema: jsonSchema } } });
  const parsed = verificationSchema.parse(JSON.parse(response.output_text));
  const countries = Array.isArray(icp.countries) ? icp.countries.map(String) : [];
  return { ...parsed, country_match: matchesSelectedCountry(parsed.country, countries), match_score: calculateDiscoveryOpportunityScore(parsed) };
}
