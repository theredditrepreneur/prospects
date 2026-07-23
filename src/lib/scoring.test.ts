import { describe, expect, it } from "vitest";
import { calculateBuyerLikelihoodScore, scoreLabel } from "./scoring";

const perfect = { buyerIntent: 10, communityIntelligenceNeed: 10, communityFootprint: 10, marketingMaturity: 10, budgetAbility: 10, competitivePressure: 10, aiSearchImportance: 10, immediateBuyingSignals: 10 };
describe("buyer likelihood score", () => {
  it("uses the requested weights and confidence penalty", () => {
    expect(calculateBuyerLikelihoodScore({ ...perfect, buyerIntent: 0 })).toBe(75);
    expect(calculateBuyerLikelihoodScore(perfect, 15)).toBe(85);
  });
  it("clamps inputs and the penalty", () => expect(calculateBuyerLikelihoodScore({ ...perfect, buyerIntent: 20 }, 30)).toBe(85));
  it("labels every priority band", () => {
    expect(scoreLabel(95)).toBe("Dream prospect. Contact immediately.");
    expect(scoreLabel(90)).toBe("Excellent fit. High priority.");
    expect(scoreLabel(80)).toBe("Strong fit. Worth outreach.");
    expect(scoreLabel(70)).toBe("Good fit. Research before contacting.");
    expect(scoreLabel(60)).toBe("Possible fit. Only if pipeline is quiet.");
    expect(scoreLabel(50)).toBe("Weak fit. Low priority.");
    expect(scoreLabel(49)).toBe("Do not pursue.");
  });
});
