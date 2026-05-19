import { FluxGate } from "@fluxgate/sdk";
import type { GoogleGenAI, CreateChatParameters } from "@google/genai";
import { wrapChatSession, TrackedChat } from "./chatSession.js";
import { FluxGateContext } from "../types/types.js";

export function createStartChatWrapper(
  ai: GoogleGenAI,
  instance: FluxGate,
  context: FluxGateContext | undefined,
) {
  return function wrappedStartChat(params: CreateChatParameters): TrackedChat {
    const chat = ai.chats.create(params);
    return wrapChatSession(chat, instance, params.model, context);
  };
}
