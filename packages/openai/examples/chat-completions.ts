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

  // --- Multi-turn conversation (client-side message history) ---
  // Each turn appends to the messages array and creates a new tracked event.
  console.log("=== Multi-turn Chat ===\n");

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: "You are a concise technical assistant." },
    { role: "user", content: "What is a closure in JavaScript?" },
  ];

  const ctx = { feature: "chat", user: "user-123", sessionId: "sess-abc" };

  const turn1 = await openai
    .withContext(ctx)
    .chat.completions.create({ model: "gpt-4o-mini", messages });

  const reply1 = turn1.choices[0].message;
  console.log("Assistant:", reply1.content);
  console.log("Tracking turn 1:", turn1.fluxGateCostTrackingResponse);

  // Append the assistant reply and next user message before the second turn.
  messages.push(reply1, {
    role: "user",
    content: "Give me a one-line code example.",
  });

  const turn2 = await openai
    .withContext(ctx)
    .chat.completions.create({ model: "gpt-4o-mini", messages });

  const reply2 = turn2.choices[0].message;
  console.log("\nAssistant:", reply2.content);
  console.log("Tracking turn 2:", turn2.fluxGateCostTrackingResponse);

  // --- Tool / Function Calling ---
  console.log("\n=== Tool Calling ===\n");

  const tools: OpenAI.Chat.ChatCompletionTool[] = [
    {
      type: "function",
      function: {
        name: "get_weather",
        description: "Returns the current weather for a city.",
        parameters: {
          type: "object",
          properties: {
            city: { type: "string", description: "City name, e.g. London" },
          },
          required: ["city"],
        },
      },
    },
  ];

  const toolTurn = await openai
    .withContext({ feature: "tool-calling", user: "user-123" })
    .chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "What is the weather in Paris?" }],
      tools,
      tool_choice: "auto",
    });

  const toolCall = toolTurn.choices[0].message.tool_calls?.[0];
  if (toolCall) {
    console.log(
      "Tool called:",
      toolCall.type === "function" ? toolCall.function.name : "unknown",
    );
    console.log(
      "Arguments:",
      toolCall.type === "function" ? toolCall.function.arguments : "unknown",
    );
  }
  console.log("Tracking:", toolTurn.fluxGateCostTrackingResponse);

  // --- Structured Output (JSON schema) ---
  console.log("\n=== Structured Output ===\n");

  const structured = await openai
    .withContext({ feature: "extraction", user: "user-123" })
    .chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: "Extract: name=Alice, age=30, role=engineer",
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "person",
          schema: {
            type: "object",
            properties: {
              name: { type: "string" },
              age: { type: "number" },
              role: { type: "string" },
            },
            required: ["name", "age", "role"],
            additionalProperties: false,
          },
          strict: true,
        },
      },
    });

  console.log("Parsed:", structured.choices[0].message.content);
  console.log("Tracking:", structured.fluxGateCostTrackingResponse);
}

main().catch(console.error);
