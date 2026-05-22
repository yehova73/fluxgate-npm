import OpenAI from "openai";
import { FluxGate } from "@fluxgate/sdk";
import { createOpenAICostTracker } from "@fluxgate/openai";

async function main() {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const fluxgate = new FluxGate({
    apiKey: process.env.FLUXGATE_API_KEY!,
    debug: true,
  });

  const openai = createOpenAICostTracker(client, fluxgate);

  // --- Feature Isolation ---
  // Each withContext() call creates an independent tracked client.
  // Events appear separately in FluxGate grouped by feature.
  console.log("=== Feature Isolation ===\n");

  const chatClient = openai.withContext({ feature: "chat", user: "user-123" });
  const summaryClient = openai.withContext({
    feature: "summarization",
    user: "user-123",
  });
  const codeClient = openai.withContext({
    feature: "code-gen",
    user: "user-456",
  });

  const [chatRes, summaryRes, codeRes] = await Promise.all([
    chatClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "What is TypeScript?" }],
    }),
    summaryClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: "Summarize: TypeScript adds static typing to JavaScript.",
        },
      ],
    }),
    codeClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Write a TypeScript hello world." }],
    }),
  ]);

  console.log("chat:", chatRes.fluxGateCostTrackingResponse);
  console.log("summarization:", summaryRes.fluxGateCostTrackingResponse);
  console.log("code-gen:", codeRes.fluxGateCostTrackingResponse);

  // --- Rich UserSession ---
  // Pass a UserSession object to associate revenue and identity with events.
  console.log("\n=== Rich UserSession ===\n");

  const premiumRes = await openai
    .withContext({
      feature: "premium-chat",
      step: "initial-response",
      sessionId: "sess-abc123",
      conversationId: "conv-xyz789",
      user: {
        id: "user-123",
        name: "Alice",
        email: "alice@example.com",
        monthlyRevenue: 99.99,
      },
    })
    .chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Hello!" }],
    });

  console.log(premiumRes.choices[0].message.content);
  console.log("Tracking:", premiumRes.fluxGateCostTrackingResponse);

  // --- Service Tier ---
  // Pass serviceTier to track pricing tier variations (e.g. batch vs. default).
  console.log("\n=== Service Tier ===\n");

  // service_tier is passed directly to the OpenAI call and auto-captured by FluxGate.
  const batchRes = await openai
    .withContext({ feature: "bulk-processing", user: "user-123" })
    .chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Summarize this text briefly." }],
      service_tier: "flex",
    });

  console.log("Tracking:", batchRes.fluxGateCostTrackingResponse);

  // --- Cost Override ---
  // Supply custom per-token rates when the model uses non-standard pricing.
  console.log("\n=== Cost Override ===\n");

  const overrideRes = await openai
    .withContext({
      feature: "fine-tuned-chat",
      user: "user-123",
      costOverride: {
        inputCostPer1MTokens: 3.0,
        outputCostPer1MTokens: 6.0,
      },
    })
    .chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Hello!" }],
    });

  console.log(
    "Tracking with custom rates:",
    overrideRes.fluxGateCostTrackingResponse,
  );
}

main().catch(console.error);
