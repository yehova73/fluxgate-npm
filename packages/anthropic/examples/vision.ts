import Anthropic from "@anthropic-ai/sdk";
import { FluxGate } from "@fluxgate/sdk";
import { createAnthropicCostTracker } from "@fluxgate/anthropic";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const fluxgate = new FluxGate({
    apiKey: process.env.FLUXGATE_API_KEY!,
    debug: true,
  });
  const anthropic = createAnthropicCostTracker(client, fluxgate);

  const tracked = anthropic.withContext({
    feature: "vision",
    user: "user-123",
  });

  // --- Image from URL ---
  console.log("=== Image from URL ===\n");

  const urlResponse = await tracked.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "url",
              url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png",
            },
          },
          { type: "text", text: "Describe what you see in this image." },
        ],
      },
    ],
  });

  const urlText = urlResponse.content.find(
    (b): b is Anthropic.Messages.TextBlock => b.type === "text",
  );
  console.log("Response:", urlText?.text);
  console.log("Tracking:", urlResponse.fluxGateCostTrackingResponse);

  // --- Mixed content: text + image in one turn ---
  console.log("\n=== Mixed Content (text + image) ===\n");

  const mixedResponse = await tracked.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "I have two questions about this image:" },
          {
            type: "image",
            source: {
              type: "url",
              url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png",
            },
          },
          { type: "text", text: "1) What colors do you see? 2) What shapes?" },
        ],
      },
    ],
  });

  const mixedText = mixedResponse.content.find(
    (b): b is Anthropic.Messages.TextBlock => b.type === "text",
  );
  console.log("Response:", mixedText?.text);
  console.log("Tracking:", mixedResponse.fluxGateCostTrackingResponse);

  // --- Base64 image (reads a local PNG if available, otherwise skips) ---
  const sampleImagePath = path.join(process.cwd(), "sample.png");
  if (fs.existsSync(sampleImagePath)) {
    console.log("\n=== Base64 Image (local file) ===\n");

    const imageData = fs.readFileSync(sampleImagePath).toString("base64");

    const base64Response = await tracked.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/png",
                data: imageData,
              },
            },
            { type: "text", text: "What is in this image?" },
          ],
        },
      ],
    });

    const base64Text = base64Response.content.find(
      (b): b is Anthropic.Messages.TextBlock => b.type === "text",
    );
    console.log("Response:", base64Text?.text);
    console.log("Tracking:", base64Response.fluxGateCostTrackingResponse);
  } else {
    console.log(
      "\n[Base64 example skipped — place a sample.png in the working directory to run it]",
    );
  }
}

main().catch(console.error);
