import Anthropic from "@anthropic-ai/sdk";
import { FluxGate } from "@fluxgate/sdk";
import { createAnthropicCostTracker } from "@fluxgate/anthropic";

const tools: Anthropic.Messages.Tool[] = [
  {
    name: "get_weather",
    description: "Get the current weather for a city.",
    input_schema: {
      type: "object",
      properties: {
        location: { type: "string", description: "City name, e.g. Paris" },
        unit: { type: "string", enum: ["celsius", "fahrenheit"] },
      },
      required: ["location"],
    },
  },
  {
    name: "search_web",
    description: "Search the web for up-to-date information.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
      },
      required: ["query"],
    },
  },
];

function executeTool(name: string, input: Record<string, unknown>): string {
  if (name === "get_weather") {
    return JSON.stringify({
      location: input.location,
      temperature: 22,
      unit: input.unit ?? "celsius",
      conditions: "sunny",
    });
  }
  if (name === "search_web") {
    return `Search results for "${input.query}": [mock result 1, mock result 2]`;
  }
  return "Unknown tool";
}

async function main() {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const fluxgate = new FluxGate({
    apiKey: process.env.FLUXGATE_API_KEY!,
    debug: true,
  });
  const anthropic = createAnthropicCostTracker(client, fluxgate);

  const tracked = anthropic.withContext({
    feature: "tool-use",
    user: "user-123",
    sessionId: "session-tool-1",
  });

  // --- Single-step tool call ---
  console.log("=== Single Tool Call ===\n");

  const messages: Anthropic.Messages.MessageParam[] = [
    { role: "user", content: "What's the weather in Paris?" },
  ];

  const response = await tracked.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1024,
    tools,
    messages,
  });

  console.log("Stop reason:", response.stop_reason);
  console.log("Tracking:", response.fluxGateCostTrackingResponse);

  if (response.stop_reason === "tool_use") {
    const toolUse = response.content.find(
      (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use",
    )!;
    console.log("\nTool:", toolUse.name, "| Input:", toolUse.input);

    const result = executeTool(
      toolUse.name,
      toolUse.input as Record<string, unknown>,
    );
    console.log("Result:", result);

    // --- Agentic loop: send tool result back ---
    const followUp = await tracked.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      tools,
      messages: [
        ...messages,
        { role: "assistant", content: response.content },
        {
          role: "user",
          content: [
            { type: "tool_result", tool_use_id: toolUse.id, content: result },
          ],
        },
      ],
    });

    const text = followUp.content.find(
      (b): b is Anthropic.Messages.TextBlock => b.type === "text",
    );
    console.log("\nFinal answer:", text?.text);
    console.log("Follow-up tracking:", followUp.fluxGateCostTrackingResponse);
  }

  // --- Forced tool choice ---
  console.log("\n=== Forced Tool Choice ===\n");

  const forcedResponse = await tracked.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 512,
    tools,
    tool_choice: { type: "tool", name: "search_web" },
    messages: [{ role: "user", content: "Tell me about the latest AI news." }],
  });

  const toolUseForced = forcedResponse.content.find(
    (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use",
  );
  console.log(
    "Forced tool:",
    toolUseForced?.name,
    "| Input:",
    toolUseForced?.input,
  );
  console.log("Tracking:", forcedResponse.fluxGateCostTrackingResponse);
}

main().catch(console.error);
