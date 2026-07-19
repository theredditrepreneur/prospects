# Integrations

Tavily implements `SearchProvider`; search snippets are leads, never verified facts. Firecrawl implements `CrawlProvider` with a default maximum of 20 pages, depth two and no bypass of robots, paywalls or authentication. OpenAI operations must use Responses API structured outputs validated by Zod and include sources, confidence, unknowns and inference labels. Inngest jobs require idempotency keys, a maximum of three retries and visible progress. Gmail access is optional and limited to draft creation after final human confirmation; external edits are never overwritten.
