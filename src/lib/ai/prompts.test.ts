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
    expect(reviewOutreachBody("I've been looking into the conversation around the brand, and one pattern kept standing out.").valid).toBe(true);
  });
});
