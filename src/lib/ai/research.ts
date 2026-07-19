import OpenAI from "openai";
import { founderOutreachPrompt, reviewOutreachBody } from "./prompts";

const researchSchema = {
  type: "object", additionalProperties: false,
  required: ["executive_summary", "what_the_company_does", "products_and_services", "ideal_customers", "positioning", "recent_priorities", "growth_signals", "community_signals", "customer_language", "potential_pain_points", "community_intelligence_opportunities", "reputation_risks", "recommended_service", "recommended_next_action", "confidence_level", "known_unknowns"],
  properties: {
    executive_summary: { type: "string" }, what_the_company_does: { type: "string" }, products_and_services: { type: "array", items: { type: "string" } }, ideal_customers: { type: "array", items: { type: "string" } }, positioning: { type: "string" }, recent_priorities: { type: "array", items: { type: "string" } }, growth_signals: { type: "array", items: { type: "string" } }, community_signals: { type: "array", items: { type: "string" } }, customer_language: { type: "array", items: { type: "string" } }, potential_pain_points: { type: "array", items: { type: "string" } }, community_intelligence_opportunities: { type: "array", items: { type: "string" } }, reputation_risks: { type: "array", items: { type: "string" } }, recommended_service: { type: "string" }, recommended_next_action: { type: "string" }, confidence_level: { type: "string", enum: ["low", "medium", "high"] }, known_unknowns: { type: "array", items: { type: "string" } },
  },
} as const;

export type ResearchOutput = {
  executive_summary: string; what_the_company_does: string; products_and_services: string[]; ideal_customers: string[]; positioning: string; recent_priorities: string[]; growth_signals: string[]; community_signals: string[]; customer_language: string[]; potential_pain_points: string[]; community_intelligence_opportunities: string[]; reputation_risks: string[]; recommended_service: string; recommended_next_action: string; confidence_level: "low" | "medium" | "high"; known_unknowns: string[];
};

export async function createCompanyResearch(input: Record<string, unknown>) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL?.toLowerCase() || "gpt-5-mini",
    input: [{ role: "system", content: "You are a cautious B2B company research analyst. Use British English. Use only supplied sources. Never invent facts. Separate uncertainty by putting missing facts in known_unknowns. Recommendations must be evidence-led and relevant to community intelligence, audience research, reputation or AI authority. Keep each list concise." }, { role: "user", content: JSON.stringify(input) }],
    text: { format: { type: "json_schema", name: "company_research", strict: true, schema: researchSchema } },
  });
  return JSON.parse(response.output_text) as ResearchOutput;
}

const outreachSchema = { type: "object", additionalProperties: false, required: ["title", "genuine_observation", "evidence", "problem_hypothesis", "value_hypothesis", "suggested_offer", "suggested_call_to_action", "subject", "body", "confidence_level"], properties: { title: { type: "string" }, genuine_observation: { type: "string" }, evidence: { type: "string" }, problem_hypothesis: { type: "string" }, value_hypothesis: { type: "string" }, suggested_offer: { type: "string" }, suggested_call_to_action: { type: "string" }, subject: { type: "string" }, body: { type: "string" }, confidence_level: { type: "string", enum: ["low", "medium", "high"] } } } as const;

export async function createOutreachDraft(input: Record<string, unknown>) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const request = (content: string) => client.responses.create({
    model: process.env.OPENAI_MODEL?.toLowerCase() || "gpt-5-mini",
    input: [{ role: "system", content: founderOutreachPrompt }, { role: "user", content }],
    text: { format: { type: "json_schema", name: "outreach_draft", strict: true, schema: outreachSchema } },
  });
  type Draft = { title: string; genuine_observation: string; evidence: string; problem_hypothesis: string; value_hypothesis: string; suggested_offer: string; suggested_call_to_action: string; subject: string; body: string; confidence_level: string };
  let draft = JSON.parse((await request(JSON.stringify(input))).output_text) as Draft;
  const review = reviewOutreachBody(draft.body);
  if (!review.valid) {
    draft = JSON.parse((await request(JSON.stringify({ approved_research: input, draft_to_rewrite: draft, mandatory_corrections: { remove_phrases: review.banned, current_word_count: review.wordCount, maximum_words: 200, target_words: "110-170", instruction: "Rewrite the draft fully. Preserve only supported meaning and return a more natural founder-written email." } }))).output_text) as Draft;
  }
  return draft;
}

