import { z } from "zod";

export const scoreCategories = ["buyerIntent", "communityIntelligenceNeed", "communityFootprint", "marketingMaturity", "budgetAbility", "competitivePressure", "aiSearchImportance", "immediateBuyingSignals"] as const;
export const defaultWeights = { buyerIntent: 25, communityIntelligenceNeed: 20, communityFootprint: 15, marketingMaturity: 10, budgetAbility: 10, competitivePressure: 10, aiSearchImportance: 5, immediateBuyingSignals: 5 } as const;
export const categoryMaximums = defaultWeights;
export const weightsSchema = z.object({ buyerIntent: z.number(), communityIntelligenceNeed: z.number(), communityFootprint: z.number(), marketingMaturity: z.number(), budgetAbility: z.number(), competitivePressure: z.number(), aiSearchImportance: z.number(), immediateBuyingSignals: z.number() }).refine(value => Object.values(value).reduce((sum, weight) => sum + weight, 0) === 100, "Weights must total 100");
export type ScoreWeights = z.infer<typeof weightsSchema>;
export type BuyerScoreValues = Record<(typeof scoreCategories)[number], number>;

export function calculateBuyerLikelihoodScore(values: BuyerScoreValues, confidencePenalty = 0, weights: ScoreWeights = defaultWeights) {
  weightsSchema.parse(weights);
  const subtotal = scoreCategories.reduce((sum, key) => sum + Math.max(0, Math.min(10, values[key])) / 10 * weights[key], 0);
  return Math.max(0, Math.min(100, Math.round(subtotal - Math.max(0, Math.min(15, confidencePenalty)))));
}

export const calculateOpportunityScore = calculateBuyerLikelihoodScore;

export function scoreLabel(score: number) {
  if (score >= 95) return "Dream prospect. Contact immediately.";
  if (score >= 90) return "Excellent fit. High priority.";
  if (score >= 80) return "Strong fit. Worth outreach.";
  if (score >= 70) return "Good fit. Research before contacting.";
  if (score >= 60) return "Possible fit. Only if pipeline is quiet.";
  if (score >= 50) return "Weak fit. Low priority.";
  return "Do not pursue.";
}
