/**
 * Demonstrates manual function calling (tool use) with @fluxgate/gemini.
 *
 * Shows a full round-trip:
 *  1. Send a request with function declarations — model returns a functionCall
 *  2. Execute the function locally with the model-supplied arguments
 *  3. Send the function result back — model returns the final answer
 *
 * Each generateContent call is independently tracked by FluxGate.
 */
import {
  GoogleGenAI,
  FunctionCallingConfigMode,
  FunctionDeclaration,
  Type,
} from "@google/genai";
import { FluxGate } from "@fluxgate/sdk";
import { createGeminiCostTracker } from "@fluxgate/gemini";

// ---------------------------------------------------------------------------
// Simulated external service
// ---------------------------------------------------------------------------
function getWeather(city: string): { temperature: number; conditions: string } {
  const data: Record<string, { temperature: number; conditions: string }> = {
    Tokyo: { temperature: 22, conditions: "partly cloudy" },
    London: { temperature: 14, conditions: "overcast with light rain" },
    "New York": { temperature: 18, conditions: "sunny and clear" },
    Paris: { temperature: 17, conditions: "mild and breezy" },
  };
  return data[city] ?? { temperature: 20, conditions: "clear skies" };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
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
    feature: "weather-assistant",
    user: "demo-user",
  });

  // --- Declare the tool ---
  const getWeatherDeclaration: FunctionDeclaration = {
    name: "getWeather",
    description: "Returns current weather conditions for a given city.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        city: {
          type: Type.STRING,
          description: "City name, e.g. 'Tokyo', 'London', 'New York'",
        },
      },
      required: ["city"],
    },
  };

  console.log("=== Function Calling — Manual Round-Trip ===\n");

  // --- Turn 1: model analyses the request and returns a function call ---
  const turn1 = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: "What is the current weather in Tokyo?",
    config: {
      tools: [{ functionDeclarations: [getWeatherDeclaration] }],
      toolConfig: {
        functionCallingConfig: {
          mode: FunctionCallingConfigMode.ANY, // force tool use
          allowedFunctionNames: ["getWeather"],
        },
      },
    },
  });

  console.log("Function calls requested by model:", turn1.functionCalls);
  console.log("Turn 1 tracking:", turn1.fluxGateCostTrackingResponse);

  const fc = turn1.functionCalls?.[0];
  if (!fc?.name || !fc?.args) {
    console.log(
      "No function call returned — model answered directly:",
      turn1.text,
    );
    return;
  }

  // --- Execute the function locally ---
  const city = String(fc.args.city);
  const weatherResult = getWeather(city);
  console.log(`\nExecuted ${fc.name}("${city}"):`, weatherResult);

  // --- Turn 2: send function result + get the final natural-language answer ---
  // Reconstruct the full conversation: user → model (function call) → function result
  const turn2 = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [{ text: "What is the current weather in Tokyo?" }],
      },
      {
        role: "model",
        parts: turn1.candidates![0].content!.parts,
      },
      {
        role: "user",
        parts: [
          { functionResponse: { name: fc.name, response: weatherResult } },
        ],
      },
    ],
  });

  console.log("\nFinal answer:", turn2.text);
  console.log("Turn 2 tracking:", turn2.fluxGateCostTrackingResponse);
}

main().catch(console.error);
