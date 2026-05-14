import { FluxGate, AiEventMetadata } from "@fluxgate/sdk";
import type { GoogleGenAI, CreateChatParameters } from "@google/genai";
import { wrapChatSession, TrackedChat } from "./chatSession.js";

export function createStartChatWrapper(
  ai: GoogleGenAI,
  instance: FluxGate,
  context: AiEventMetadata | undefined,
) {
  return function wrappedStartChat(params: CreateChatParameters): TrackedChat {
    const chat = ai.chats.create(params);
    return wrapChatSession(chat, instance, params.model, context);
  };
}
