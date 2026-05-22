/**
 * Prompt Caching example for @fluxgate/anthropic
 *
 * Anthropic's prompt caching stores repeated content (system prompts, long
 * documents) server-side so subsequent requests reuse it at a lower cost.
 * Add `cache_control: { type: "ephemeral" }` to any content block to opt in.
 *
 * FluxGate auto-detects cache_control in the request and records the cacheTtl
 * in event metadata so you can see caching activity in the dashboard.
 *
 * Docs: https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
 */
import Anthropic from "@anthropic-ai/sdk";
import { FluxGate } from "@fluxgate/sdk";
import { createAnthropicCostTracker } from "@fluxgate/anthropic";

const LARGE_DOCUMENT = `
Claude is Anthropic's AI assistant. It is designed to be helpful, harmless, and honest.

[Imagine this is a very long document — a legal contract, a codebase, a research paper —
that you want to load into the context once and reuse across many requests without
paying full prompt-token prices on every call.]

Key sections:
1. Introduction — overview of the document
2. Terms and conditions — binding agreement text
3. Appendices — supporting data tables
`.trim();

async function main() {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const fluxgate = new FluxGate({
    apiKey: process.env.FLUXGATE_API_KEY!,
    debug: true,
  });
  const anthropic = createAnthropicCostTracker(client, fluxgate);

  const tracked = anthropic.withContext({
    feature: "prompt-caching",
    user: "user-123",
    sessionId: "cache-demo-session",
  });

  // Cached system prompt — sent once, reused on every subsequent request.
  // FluxGate detects the cache_control block and records cacheTtl: "5m".
  const cachedSystemPrompt: Anthropic.Messages.TextBlockParam[] = [
    {
      type: "text",
      text: LARGE_DOCUMENT,
      cache_control: { type: "ephemeral" },
    },
  ];

  // --- First request: cache MISS (cache is written) ---
  console.log("=== First Request (cache write) ===\n");

  const first = await tracked.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 512,
    system: cachedSystemPrompt as Anthropic.Messages.TextBlockParam[],
    messages: [
      { role: "user", content: "Summarise section 1 of the document." },
    ],
  });

  const firstText = first.content.find(
    (b): b is Anthropic.Messages.TextBlock => b.type === "text",
  );
  console.log("Response:", firstText?.text);
  console.log("Usage:", first.usage);
  console.log("Tracking:", first.fluxGateCostTrackingResponse);
  // first.usage.cache_creation_input_tokens > 0 on a cache write

  // --- Second request: cache HIT (cheaper) ---
  console.log("\n=== Second Request (cache read) ===\n");

  const second = await tracked.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 512,
    system: cachedSystemPrompt as Anthropic.Messages.TextBlockParam[],
    messages: [
      { role: "user", content: "What are the key terms in section 2?" },
    ],
  });

  const secondText = second.content.find(
    (b): b is Anthropic.Messages.TextBlock => b.type === "text",
  );
  console.log("Response:", secondText?.text);
  console.log("Usage:", second.usage);
  console.log("Tracking:", second.fluxGateCostTrackingResponse);
  // second.usage.cache_read_input_tokens > 0 on a cache hit

  // --- Cached user message content block ---
  console.log("\n=== Cached User Message Block ===\n");

  const cachedUserMsg = await tracked.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: LARGE_DOCUMENT,
            cache_control: { type: "ephemeral" },
          },
          {
            type: "text",
            text: "List the appendix topics from this document.",
          },
        ],
      },
    ],
  });

  const cachedText = cachedUserMsg.content.find(
    (b): b is Anthropic.Messages.TextBlock => b.type === "text",
  );
  console.log("Response:", cachedText?.text);
  console.log("Usage:", cachedUserMsg.usage);
  console.log("Tracking:", cachedUserMsg.fluxGateCostTrackingResponse);
}

main().catch(console.error);
