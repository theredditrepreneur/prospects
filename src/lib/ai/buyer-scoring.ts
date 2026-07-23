import OpenAI from "openai";
import { calculateBuyerLikelihoodScore, scoreCategories } from "@/lib/scoring";

const category = { type: "object", additionalProperties: false, required: ["score", "evidence"], properties: { score: { type: "number", minimum: 0, maximum: 10 }, evidence: { type: "array", items: { type: "string" } } } } as const;
const question = { type: "object", additionalProperties: false, required: ["rating", "explanation"], properties: { rating: { type: "number", minimum: 1, maximum: 10 }, explanation: { type: "string" } } } as const;
const schema = { type: "object", additionalProperties: false, required: ["understands_need", "pain_without_intelligence", "ability_to_spend", "specific_problem", "prioritise_over_100", "categories", "confidence_penalty", "why_they_would_buy", "expected_outcome", "likely_champion", "buy_now_trigger", "likely_objections", "missing_information"], properties: {
  understands_need: question, pain_without_intelligence: question, ability_to_spend: question,
  specific_problem: { type: "string" }, prioritise_over_100: { type: "object", additionalProperties: false, required: ["answer", "explanation"], properties: { answer: { type: "string", enum: ["Yes", "No"] }, explanation: { type: "string" } } },
  categories: { type: "object", additionalProperties: false, required: scoreCategories, properties: { buyerIntent: category, communityIntelligenceNeed: category, communityFootprint: category, marketingMaturity: category, budgetAbility: category, competitivePressure: category, aiSearchImportance: category, immediateBuyingSignals: category } },
  confidence_penalty: { type: "number", minimum: 0, maximum: 15 }, why_they_would_buy: { type: "string" }, expected_outcome: { type: "string" }, likely_champion: { type: "string" }, buy_now_trigger: { type: "string" }, likely_objections: { type: "array", items: { type: "string" } }, missing_information: { type: "array", items: { type: "string" } },
} } as const;

export type BuyerLikelihoodAnalysis = {
  understands_need: { rating: number; explanation: string }; pain_without_intelligence: { rating: number; explanation: string }; ability_to_spend: { rating: number; explanation: string }; specific_problem: string; prioritise_over_100: { answer: "Yes" | "No"; explanation: string };
  categories: Record<(typeof scoreCategories)[number], { score: number; evidence: string[] }>;
  confidence_penalty: number; why_they_would_buy: string; expected_outcome: string; likely_champion: string; buy_now_trigger: string; likely_objections: string[]; missing_information: string[];
};

const instructions = `Score one question only: Would this company realistically spend money on a Community Intelligence Audit from The Redditrepreneur?
Do not score how impressive, polished or mature the company is unless that fact directly increases buying likelihood. A smaller company with active community discussion, competitive comparisons and an obvious problem must outrank a polished enterprise with no meaningful Community Intelligence need.

Before scoring, answer: whether a cold prospect would immediately understand the need, how painful it is not to have Community Intelligence, likelihood of spending £349 to £1495 without lengthy education, the concrete problem it solves, and whether this prospect deserves priority over 100 others.

Score each category from 0 to 10 using only supplied evidence: Buyer Intent; Community Intelligence Need; Community Footprint; Marketing Maturity; Budget and Ability to Buy; Competitive Pressure; AI Search Importance; Immediate Buying Signals. Every category must cite concise evidence. Unknown is never positive. Never invent evidence. Apply a confidence penalty from 0 to 15 when evidence is weak, sparse or inferred. If no concrete business problem exists, reduce the need and final score. When two scores are possible, choose the lower one unless explicit evidence supports the higher score.`;

export async function createBuyerLikelihoodAnalysis(input: Record<string, unknown>) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({ model: process.env.OPENAI_MODEL?.toLowerCase() || "gpt-5-mini", input: [{ role: "system", content: instructions }, { role: "user", content: JSON.stringify(input) }], text: { format: { type: "json_schema", name: "buyer_likelihood", strict: true, schema } } });
  const analysis = JSON.parse(response.output_text) as BuyerLikelihoodAnalysis;
  const values = Object.fromEntries(scoreCategories.map(key => [key, analysis.categories[key].score])) as Record<(typeof scoreCategories)[number], number>;
  return { ...analysis, total_score: calculateBuyerLikelihoodScore(values, analysis.confidence_penalty) };
}
