/**
 * Demonstrates error handling with @fluxgate/gemini.
 *
 * Key behaviour: FluxGate records the error event (status: "ERROR") before
 * re-throwing, so every failed call appears in your dashboard automatically.
 * Your application receives the original error unchanged.
 *
 * Covers:
 *  - API errors (invalid model, bad auth, quota exceeded)
 *  - Accessing error details via the ApiError shape (.status, .message)
 *  - Streaming errors — also auto-tracked
 *  - Confirming that tracking continues normally after a failed call
 */
import { GoogleGenAI, HarmBlockThreshold, HarmCategory } from "@google/genai";
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

  // -------------------------------------------------------------------------
  // Example 1: API error — invalid model name
  // The @google/genai SDK throws an ApiError with .status and .message fields.
  // FluxGate records the event with status: "ERROR" before re-throwing.
  // -------------------------------------------------------------------------
  console.log("=== Example 1: Invalid model name (ApiError) ===\n");

  try {
    await gemini.withContext({ feature: "error-demo" }).models.generateContent({
      model: "non-existent-model",
      contents: "Hello",
    });
  } catch (error) {
    const e = error as { name?: string; message?: string; status?: number };
    console.log("Caught error:");
    console.log("  name   :", e.name);
    console.log("  status :", e.status);
    console.log("  message:", String(e.message).slice(0, 120));
    console.log("\n(Error was automatically tracked with status: 'ERROR')");
  }

  // -------------------------------------------------------------------------
  // Example 2: Streaming error — also auto-tracked
  // An invalid model throws during stream setup (before any chunks).
  // -------------------------------------------------------------------------
  console.log("\n=== Example 2: Streaming error ===\n");

  try {
    const stream = await gemini
      .withContext({ feature: "stream-error-demo" })
      .models.generateContentStream({
        model: "non-existent-model",
        contents: "Hello",
      });

    // consume — error may surface here if not thrown during setup
    for await (const _chunk of stream) {
      // no-op
    }
  } catch (error) {
    const e = error as { name?: string; status?: number };
    console.log("Stream error caught:", e.name, "| status:", e.status);
    console.log("(Stream error was automatically tracked)");
  }

  // -------------------------------------------------------------------------
  // Example 3: Tracking continues normally after errors
  // Each call is tracked independently; a prior failure does not affect the
  // FluxGate client or any subsequent calls.
  // -------------------------------------------------------------------------
  console.log("\n=== Example 3: Recovery — tracking continues ===\n");

  const recovery = await gemini
    .withContext({ feature: "error-demo-recovery", user: "demo-user" })
    .models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Respond with exactly: 'All systems operational.'",
    });

  console.log("Response:", recovery.text);
  console.log("\nTracking:", recovery.fluxGateCostTrackingResponse);

  // -------------------------------------------------------------------------
  // Example 4: Safety filter — BLOCKED status (not an exception)
  // When the model refuses a request for safety reasons, no exception is thrown.
  // fluxGateCostTrackingResponse.status will reflect the actual finish reason
  // (e.g. "BLOCKED", "CONTENT_FILTER") so you can see refusals in your dashboard.
  // -------------------------------------------------------------------------
  console.log("\n=== Example 4: Safety filter (BLOCKED status) ===\n");
  const chat = await ai.chats.create({
    model: "gemini-2.5-flash",
  });

  chat.sendMessage({
    message: "suggest a joke that harasses a specific group of people",
  });

  const trackedChat = await gemini
    .withContext({ feature: "safety-demo" })
    .chats.create({
      model: "gemini-2.5-flash",
    });

  trackedChat.withTracking({ feature: "safety-demo" }).sendMessage({
    message: "suggest a joke that harasses a specific group of people",
    config: {},
  });

  const safetyResult = await gemini
    .withContext({ feature: "safety-demo" })
    .models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Tell me a safe, family-friendly joke.",
      config: {
        safetySettings: [
          {
            // Set a very restrictive threshold to demonstrate the BLOCKED path.
            // In production use the threshold appropriate for your application.
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
          },
        ],
      },
    });

  const status = safetyResult.fluxGateCostTrackingResponse?.status;
  console.log("FluxGate status:", status); // "SUCCESS" for benign content
  console.log("Text:", safetyResult.text ?? "(no text — content was blocked)");
  console.log("\nTracking:", safetyResult.fluxGateCostTrackingResponse);
}

main().catch(console.error);
