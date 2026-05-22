/**
 * Demonstrates multimodal (vision) input with @fluxgate/gemini.
 *
 * Covers:
 *  - Inline image analysis (base64-encoded, self-contained demo)
 *  - Image read from disk (JPEG/PNG)
 *  - Multi-turn vision chat (follow-up questions about an image)
 *  - Large file uploads via tracker.raw.files (Files API — untracked)
 */
import { GoogleGenAI } from "@google/genai";
import { FluxGate } from "@fluxgate/sdk";
import { createGeminiCostTracker } from "@fluxgate/gemini";
import fs from "fs";
import path from "path";

// A minimal 1×1 white-pixel PNG encoded as base64.
// Replace with real image data for actual use-cases.
const SAMPLE_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==";

async function main() {
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || "your-gemini-api-key",
  });
  const fluxgate = new FluxGate({
    apiKey: process.env.FLUXGATE_API_KEY || "your-fluxgate-api-key",
    debug: true,
  });

  const gemini = createGeminiCostTracker(ai, fluxgate);
  const client = gemini.withContext({ feature: "vision", user: "demo-user" });

  // -------------------------------------------------------------------------
  // Example 1: Inline image (always runs — uses embedded sample PNG)
  // -------------------------------------------------------------------------
  console.log("=== Inline Image Analysis ===\n");

  const result1 = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          { text: "Describe what you see in this image." },
          { inlineData: { mimeType: "image/png", data: SAMPLE_PNG_BASE64 } },
        ],
      },
    ],
  });

  console.log("Response:", result1.text);
  console.log("\nTracking:", result1.fluxGateCostTrackingResponse);

  // -------------------------------------------------------------------------
  // Example 2: Image from disk
  // Place a JPEG or PNG at packages/gemini/examples/photo.jpg to run this.
  // -------------------------------------------------------------------------
  console.log("\n=== Image from Disk ===\n");

  const imagePath = path.join(import.meta.dirname, "photo.jpg");

  if (fs.existsSync(imagePath)) {
    const imageData = fs.readFileSync(imagePath).toString("base64");

    const result2 = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: "Describe this image in detail." },
            { inlineData: { mimeType: "image/jpeg", data: imageData } },
          ],
        },
      ],
    });

    console.log("Description:", result2.text);
    console.log("\nTracking:", result2.fluxGateCostTrackingResponse);
  } else {
    console.log(
      `(Skipped — no image found at ${imagePath})\n` +
        "Place a JPEG file named photo.jpg in the examples/ directory to run this section.",
    );
  }

  // -------------------------------------------------------------------------
  // Example 3: Multi-turn vision conversation using chats.create
  // -------------------------------------------------------------------------
  console.log("\n=== Multi-Turn Vision Chat ===\n");

  const chat = client.chats.create({ model: "gemini-2.5-flash" });

  // First turn — send an image
  const turn1 = await chat.sendMessage({
    message: [
      { text: "I'm going to show you an image. Please analyse it." },
      { inlineData: { mimeType: "image/png", data: SAMPLE_PNG_BASE64 } },
    ],
  });
  console.log("Turn 1:", turn1.text);
  console.log("Tracking 1:", turn1.fluxGateCostTrackingResponse);

  // Follow-up — no image needed, model remembers the context
  const turn2 = await chat.sendMessage({
    message: "What colours did you see in that image?",
  });
  console.log("\nTurn 2:", turn2.text);
  console.log("Tracking 2:", turn2.fluxGateCostTrackingResponse);

  // -------------------------------------------------------------------------
  // Example 4: Large file via Files API + tracked generateContent
  //
  // Files API calls do not generate tokens. Since TrackedGeminiClient mirrors
  // the full GoogleGenAI surface, client.files is the real (untracked) Files
  // API. After uploading, reference the URI in a tracked models.generateContent.
  // -------------------------------------------------------------------------
  console.log("\n=== Files API Pattern (large files) ===\n");
  console.log(
    "For files larger than ~20 MB, upload via client.files, then reference the URI:",
  );
  console.log(`
  // 1. Upload (untracked — no tokens consumed here)
  const uploadedFile = await client.files.upload({
    file: new Blob([fs.readFileSync("./lecture.mp4")], { type: "video/mp4" }),
    config: { displayName: "lecture.mp4" },
  });

  // 2. Tracked generateContent referencing the uploaded file
  const result = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{
      role: "user",
      parts: [
        { text: "Summarise this video lecture in bullet points." },
        { fileData: { mimeType: "video/mp4", fileUri: uploadedFile.uri! } },
      ],
    }],
  });
  console.log(result.text);
  console.log(result.fluxGateCostTrackingResponse);
  `);
}

main().catch(console.error);
