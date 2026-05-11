import { FluxGate, AiEventMetadata } from "@fluxgate/sdk";
import type { GenerativeModel } from "@google/generative-ai";
import { wrapChatSession, TrackedChatSession } from "./chatSession.js";

type OrigStartChat = GenerativeModel["startChat"];

export function createStartChatWrapper(
  original: OrigStartChat,
  instance: FluxGate,
  modelName: string,
  context: AiEventMetadata | undefined,
) {
  return function wrappedStartChat(
    request?: Parameters<OrigStartChat>[0],
  ): TrackedChatSession {
    const session = original(request);
    return wrapChatSession(session, instance, modelName, context);
  };
}
