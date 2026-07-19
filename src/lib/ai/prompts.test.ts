import { describe, expect, it } from "vitest";
import { founderOutreachPrompt, reviewOutreachBody } from "./prompts";

describe("founder outreach prompt", () => {
  it("requires one insight and a human founder voice", () => {
    expect(founderOutreachPrompt).toContain("ONE genuinely interesting");
    expect(founderOutreachPrompt).toContain("Founder of The Redditrepreneur");
    expect(founderOutreachPrompt).toContain("110–170 words");
  });
  it("flags stock AI phrases and excessive length", () => {
    expect(reviewOutreachBody("I hope you're well. I noticed something.").valid).toBe(false);
    expect(reviewOutreachBody(Array.from({ length: 201 }, () => "word").join(" ")).valid).toBe(false);
    expect(reviewOutreachBody("I've been looking into the conversation around the brand, and one pattern kept standing out.").valid).toBe(false);
  });
  it("requires a real subject, greeting, explanation and founder sign-off", () => {
    const body = `Hi there,\n\nI've spent some time looking at the public conversation around COROS, and one pattern felt worth sharing. People aren't only discussing individual products; they're comparing the wider experience before deciding which ecosystem to trust.\n\nThat makes the conversation useful beyond customer feedback. It can show where confidence grows, where it breaks down and which questions repeatedly shape buying decisions.\n\nWe help companies organise those public conversations into evidence that leadership teams can actually use, without reducing them to a sentiment score.\n\nI'd be happy to share a few examples from what I found if that would be useful.\n\nBest,\nThe Founder\nThe Redditrepreneur`;
    expect(reviewOutreachBody(body, "A pattern in athlete trust").valid).toBe(true);
    expect(reviewOutreachBody(body, "COROS, athlete data and trust").valid).toBe(false);
  });
});
