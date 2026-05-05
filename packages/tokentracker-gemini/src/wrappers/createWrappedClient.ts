import { Tracker } from "@llmwatch/tokentracker";
import type { GenerativeModel } from "@google/generative-ai";
import { AiEventMetadata } from "@llmwatch/tokentracker";
import { TrackedGenerativeModel } from "../types/types.js";
import { createGenerateContentWrapper } from "./generateContent.js";
import { createGenerateContentStreamWrapper } from "./generateContentStream.js";
import { createEmbedContentWrapper } from "./embedContent.js";
import { createStartChatWrapper } from "./startChat.js";

export function withGeminiTracking(
  model: GenerativeModel,
  tracker: Tracker,
  context?: AiEventMetadata,
): TrackedGenerativeModel {
  const modelName = model.model.replace("models/", "");

  // Create wrapped model without mutating original
  const wrappedModel = Object.create(model) as GenerativeModel;

  wrappedModel.generateContent = createGenerateContentWrapper(
    model.generateContent.bind(model),
    tracker,
    modelName,
    context,
  );

  wrappedModel.generateContentStream = createGenerateContentStreamWrapper(
    model.generateContentStream.bind(model),
    tracker,
    modelName,
    context,
  );

  wrappedModel.embedContent = createEmbedContentWrapper(
    model.embedContent.bind(model),
    tracker,
    modelName,
    context,
  );

  wrappedModel.startChat = createStartChatWrapper(
    model.startChat.bind(model),
    tracker,
    modelName,
    context,
  );

  // Type assertion needed because wrapped functions have enhanced return types
  return wrappedModel as unknown as TrackedGenerativeModel;
}
