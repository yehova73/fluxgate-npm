/**
 * Demonstrates structured output and system instructions with @fluxgate/gemini.
 *
 * Covers:
 *  - System instructions (persona / formatting rules injected at the model level)
 *  - Generation config (temperature, maxOutputTokens)
 *  - Structured JSON output via responseSchema + responseMimeType
 */
import { GoogleGenAI, Type } from "@google/genai";
import { FluxGate } from "@fluxgate/sdk";
import { createGeminiCostTracker } from "@fluxgate/gemini";

async function main() {
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || "your-gemini-api-key",
  });
  const fluxgate = new FluxGate({
    apiKey: process.env.FLUXGATE_API_KEY || "your-fluxgate-api-key",
    debug: true,
  });

  const gemini = createGeminiCostTracker(ai, fluxgate);
  const client = gemini.withContext({
    feature: "structured-output",
    user: "demo-user",
  });

  // -------------------------------------------------------------------------
  // Example 1: System instructions + generation config
  // -------------------------------------------------------------------------
  console.log("=== System Instructions ===\n");

  const result1 = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: "Explain recursion.",
    config: {
      systemInstruction:
        "You are a computer science tutor who explains concepts with short " +
        "Python code examples. Always include a runnable snippet. Be concise.",
      temperature: 0.4,
      maxOutputTokens: 512,
    },
  });

  console.log(result1.text);
  console.log("\nTracking:", result1.fluxGateCostTrackingResponse);

  // -------------------------------------------------------------------------
  // Example 2: Structured JSON output via responseSchema
  // The model returns valid JSON that matches the declared schema.
  // -------------------------------------------------------------------------
  console.log("\n=== Structured JSON Output ===\n");

  type Recipe = {
    name: string;
    prepTimeMinutes: number;
    ingredients: string[];
  };

  const result2 = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: "Give me 3 quick weeknight dinner recipes.",
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description: "Recipe name",
            },
            prepTimeMinutes: {
              type: Type.INTEGER,
              description: "Preparation time in minutes",
            },
            ingredients: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of ingredients",
            },
          },
          required: ["name", "prepTimeMinutes", "ingredients"],
        },
      },
    },
  });

  const recipes = JSON.parse(result2.text ?? "[]") as Recipe[];
  console.log("Recipes:");
  recipes.forEach((r, i) =>
    console.log(
      `  ${i + 1}. ${r.name} (${r.prepTimeMinutes} min) — ${r.ingredients.slice(0, 3).join(", ")}...`,
    ),
  );
  console.log("\nTracking:", result2.fluxGateCostTrackingResponse);

  // -------------------------------------------------------------------------
  // Example 3: Structured JSON output — streaming
  // fluxGateCostTrackingResponse is populated after the stream completes.
  // -------------------------------------------------------------------------
  console.log("\n=== Structured JSON Output — Streaming ===\n");

  type Step = { step: number; instruction: string };

  const stream = await client.models.generateContentStream({
    model: "gemini-2.5-flash",
    contents: "Give me a 4-step process for brewing the perfect cup of coffee.",
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            step: { type: Type.INTEGER },
            instruction: { type: Type.STRING },
          },
          required: ["step", "instruction"],
        },
      },
    },
  });

  let rawJson = "";
  for await (const chunk of stream) {
    rawJson += chunk.text ?? "";
  }

  const steps = JSON.parse(rawJson) as Step[];
  console.log("Coffee brewing steps:");
  steps.forEach((s) => console.log(`  ${s.step}. ${s.instruction}`));
  console.log("\nTracking:", stream.fluxGateCostTrackingResponse);
}

main().catch(console.error);
