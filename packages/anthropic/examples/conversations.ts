import Anthropic from "@anthropic-ai/sdk";
import { FluxGate } from "@fluxgate/sdk";
import { createAnthropicCostTracker } from "@fluxgate/anthropic";

async function main() {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const fluxgate = new FluxGate({
    apiKey: process.env.FLUXGATE_API_KEY!,
    debug: true,
  });
  const anthropic = createAnthropicCostTracker(client, fluxgate);

  // Bind a context with conversationId so every turn is grouped in FluxGate.
  const session = anthropic.withContext({
    feature: "multi-turn-chat",
    user: "user-123",
    sessionId: "session-conv-1",
    conversationId: "conv-abc",
  });

  const history: Anthropic.Messages.MessageParam[] = [];
  let turnNumber = 0;

  async function chat(userMessage: string, step?: string): Promise<string> {
    turnNumber++;
    history.push({ role: "user", content: userMessage });

    // withTracking forks the context for this single call — the session
    // context is unchanged for subsequent calls through `session.messages`.
    const messages = step
      ? session.messages.withTracking({ step })
      : session.messages;

    const response = await messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      system: "You are a helpful assistant with a great memory for context.",
      messages: history,
    });

    const assistantText = response.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    history.push({ role: "assistant", content: response.content });

    console.log(`[turn ${turnNumber}] [user] ${userMessage}`);
    console.log(`[turn ${turnNumber}] [claude] ${assistantText}`);
    console.log(
      `Tracking: cost=$${response.fluxGateCostTrackingResponse?.cost ?? "?"}\n`,
    );

    return assistantText;
  }

  // --- Multi-turn conversation ---
  console.log("=== Multi-turn Conversation ===\n");

  await chat("My name is Alex and I'm a TypeScript developer.", "introduction");
  await chat("What did I just tell you about myself?", "recall");
  await chat("What are the top 3 TypeScript features I should know about?");
  // withTracking inline — tag only this call without touching the session context
  await session.messages
    .withTracking({ step: "code-example" })
    .create({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      system: "You are a helpful assistant with a great memory for context.",
      messages: [
        ...history,
        {
          role: "user",
          content: "Can you give me a short example of the first one?",
        },
      ],
    })
    .then((r) => {
      const text = r.content
        .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");
      console.log(`[inline withTracking] [claude] ${text}`);
      console.log(
        `Tracking: cost=$${r.fluxGateCostTrackingResponse?.cost ?? "?"}\n`,
      );
    });

  console.log(
    `Total turns: ${history.filter((m) => m.role === "user").length}`,
  );
  console.log(`Context messages in history: ${history.length}`);
}

main().catch(console.error);
