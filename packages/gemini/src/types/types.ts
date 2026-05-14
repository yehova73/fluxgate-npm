import type {
  EmbedContentResponse,
  GenerateContentResponse,
  GenerateContentParameters,
  EmbedContentParameters,
  CreateChatParameters,
  SendMessageParameters,
  Content,
} from "@google/genai";
import type { TrackedChat } from "../wrappers/chatSession.js";
import type { TrackedStream } from "../wrappers/TrackedStream.js";
import type { FluxGateCostTrackingResponse, WithTracking } from "@fluxgate/sdk";

export type WithStreamTracking<T> = T & {
  fluxGateCostTrackingResponse: FluxGateCostTrackingResponse | undefined;
};

export type TrackedGeminiClient = {
  generateContent(
    request: GenerateContentParameters,
  ): Promise<WithTracking<GenerateContentResponse>>;

  generateContentStream(
    request: GenerateContentParameters,
  ): Promise<TrackedStream<GenerateContentResponse>>;

  embedContent(
    request: EmbedContentParameters,
  ): Promise<WithTracking<EmbedContentResponse>>;

  startChat(params: CreateChatParameters): TrackedChat;
};

export type {
  TrackedChat,
  EmbedContentResponse,
  GenerateContentResponse,
  GenerateContentParameters,
  EmbedContentParameters,
  CreateChatParameters,
  SendMessageParameters,
  Content,
};
