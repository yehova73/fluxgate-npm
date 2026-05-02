export type LLMEvent = {
  provider: "openai";
  model: string;
  latencyMs: number;
  streaming: boolean;
  usage?: {
    prompt: number;
    completion: number;
    total: number;
  };
  feature?: string;
  userId?: string;
};
