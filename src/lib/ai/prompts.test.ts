import { describe, expect, it } from "vitest";
import { founderOutreachPrompt, reviewOutreachBody, reviewSubjectOptions } from "./prompts";

const body = `Hi there,

I've spent some time looking at the public conversation around COROS, and one pattern felt worth sharing. People aren't only discussing individual products; they're comparing the wider experience before deciding which ecosystem to trust.

That makes the conversation useful beyond customer feedback. It can show where confidence grows, where it breaks down and which questions repeatedly shape buying decisions.

We help companies organise those public conversations into evidence that leadership teams can actually use, without reducing them to a sentiment score.

I'd be happy to share a few examples from what I found if that would be useful.

Best,
The Founder
The Redditrepreneur`;

describe("founder outreach prompt", () => {
  it("requires one insight, the company name and no dashes", () => {
    expect(founderOutreachPrompt).toContain("ONE genuinely interesting");
    expect(founderOutreachPrompt).toContain("Founder of The Redditrepreneur");
    expect(founderOutreachPrompt).toContain("Every subject must include the company name");
    expect(founderOutreachPrompt).toContain("Do not use hyphens, en dashes or em dashes");
  });

  it("flags stock AI phrases and excessive length", () => {
    expect(reviewOutreachBody("I hope you're well. I noticed something.").valid).toBe(false);
    expect(reviewOutreachBody(Array.from({ length: 201 }, () => "word").join(" ")).valid).toBe(false);
  });

  it("requires the company in the subject, greeting, explanation, sign off and no dashes", () => {
    expect(reviewOutreachBody(body, "A COROS pattern worth sharing", "COROS").valid).toBe(true);
    expect(reviewOutreachBody(body, "A pattern worth sharing", "COROS").valid).toBe(false);
    expect(reviewOutreachBody(body.replace("public conversation", "public conversation — clearly"), "A COROS pattern worth sharing", "COROS").valid).toBe(false);
    expect(reviewOutreachBody(body, "A COROS pattern — worth sharing", "COROS").valid).toBe(false);
  });

  it("requires five distinct ranked company specific subjects under 50 characters", () => {
    const subjects = [
      { rank: 1, subject: "A COROS pattern worth sharing" },
      { rank: 2, subject: "Something interesting about COROS" },
      { rank: 3, subject: "One COROS community pattern" },
      { rank: 4, subject: "How athletes compare COROS" },
      { rank: 5, subject: "A thought on COROS product trust" },
    ];
    expect(reviewSubjectOptions(subjects, "COROS")).toBe(true);
    expect(reviewSubjectOptions(subjects, "Garmin")).toBe(false);
    expect(reviewSubjectOptions(subjects.map((item, index) => index === 4 ? { ...item, subject: "A thought on COROS product trust — now" } : item), "COROS")).toBe(false);
  });
});
