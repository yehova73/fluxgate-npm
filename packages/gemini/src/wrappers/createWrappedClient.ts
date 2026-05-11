import type { GenerativeModel } from "@google/generative-ai";
import { AiEventMetadata, FluxGate } from "@fluxgate/sdk";
import { TrackedGenerativeModel } from "../types/types.js";
import { createGenerateContentWrapper } from "./generateContent.js";
import { createGenerateContentStreamWrapper } from "./generateContentStream.js";
import { createEmbedContentWrapper } from "./embedContent.js";
import { createStartChatWrapper } from "./startChat.js";

export function withGeminiTracking(
  model: GenerativeModel,
  instance: FluxGate,
  context?: AiEventMetadata,
): TrackedGenerativeModel {
  const modelName = model.model.replace("models/", "");

  // Create wrapped model without mutating original
  const wrappedModel = Object.create(model) as GenerativeModel;

  wrappedModel.generateContent = createGenerateContentWrapper(
    model.generateContent.bind(model),
    instance,
    modelName,
    context,
  );

  wrappedModel.generateContentStream = createGenerateContentStreamWrapper(
    model.generateContentStream.bind(model),
    instance,
    modelName,
    context,
  );

  wrappedModel.embedContent = createEmbedContentWrapper(
    model.embedContent.bind(model),
    instance,
    modelName,
    context,
  );

  wrappedModel.startChat = createStartChatWrapper(
    model.startChat.bind(model),
    instance,
    modelName,
    context,
  );

  // Type assertion needed because wrapped functions have enhanced return types
  return wrappedModel as unknown as TrackedGenerativeModel;
}
