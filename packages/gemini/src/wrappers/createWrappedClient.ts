import type { GoogleGenAI } from "@google/genai";
import { FluxGate } from "@fluxgate/sdk";
import { TrackedGeminiClient, FluxGateContext } from "../types/types.js";
import { createGenerateContentWrapper } from "./generateContent.js";
import { createGenerateContentStreamWrapper } from "./generateContentStream.js";
import { createEmbedContentWrapper } from "./embedContent.js";
import { createStartChatWrapper } from "./startChat.js";

export function withGeminiTracking(
  ai: GoogleGenAI,
  instance: FluxGate,
  context?: FluxGateContext,
): TrackedGeminiClient {
  return {
    generateContent: createGenerateContentWrapper(ai, instance, context),
    generateContentStream: createGenerateContentStreamWrapper(
      ai,
      instance,
      context,
    ),
    embedContent: createEmbedContentWrapper(ai, instance, context),
    startChat: createStartChatWrapper(ai, instance, context),
  };
}
