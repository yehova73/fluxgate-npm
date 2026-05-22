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
  const wrappedClient = Object.create(
    Object.getPrototypeOf(ai),
    Object.getOwnPropertyDescriptors(ai),
  );

  wrappedClient.models = Object.create(
    Object.getPrototypeOf(ai.models),
    Object.getOwnPropertyDescriptors(ai.models),
  );
  wrappedClient.chats = Object.create(
    Object.getPrototypeOf(ai.chats),
    Object.getOwnPropertyDescriptors(ai.chats),
  );

  wrappedClient.models.generateContent = createGenerateContentWrapper(
    ai,
    instance,
    context,
  );
  wrappedClient.models.generateContentStream =
    createGenerateContentStreamWrapper(ai, instance, context);
  wrappedClient.models.embedContent = createEmbedContentWrapper(
    ai,
    instance,
    context,
  );
  wrappedClient.chats.create = createStartChatWrapper(ai, instance, context);

  return wrappedClient as unknown as TrackedGeminiClient;
}
