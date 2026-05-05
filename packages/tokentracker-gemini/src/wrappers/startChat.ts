import { Tracker } from "@llmwatch/tokentracker";
import type { GenerativeModel } from "@google/generative-ai";
import { AiEventMetadata } from "@llmwatch/tokentracker";
import { wrapChatSession, TrackedChatSession } from "./chatSession.js";

type OrigStartChat = GenerativeModel["startChat"];

export function createStartChatWrapper(
  original: OrigStartChat,
  tracker: Tracker,
  modelName: string,
  context: AiEventMetadata | undefined,
) {
  return function wrappedStartChat(
    request?: Parameters<OrigStartChat>[0],
  ): TrackedChatSession {
    const session = original(request);
    return wrapChatSession(session, tracker, modelName, context);
  };
}
