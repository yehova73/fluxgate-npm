import type {
  EmbedContentResponse,
  GenerateContentResult,
  GenerateContentStreamResult,
  GenerativeModel,
} from "@google/generative-ai";
import type { TrackedChatSession } from "../wrappers/chatSession.js";
import { WithTracking } from "../index.js";

export type TrackedGenerativeModel = Omit<
  GenerativeModel,
  "generateContent" | "generateContentStream" | "embedContent" | "startChat"
> & {
  generateContent(
    request: Parameters<GenerativeModel["generateContent"]>[0],
  ): Promise<WithTracking<GenerateContentResult>>;

  generateContentStream(
    request: Parameters<GenerativeModel["generateContentStream"]>[0],
  ): Promise<WithTracking<GenerateContentStreamResult>>;

  embedContent(
    request: Parameters<GenerativeModel["embedContent"]>[0],
  ): Promise<WithTracking<EmbedContentResponse>>;

  startChat(
    request?: Parameters<GenerativeModel["startChat"]>[0],
  ): TrackedChatSession;
};

export type { TrackedChatSession };
