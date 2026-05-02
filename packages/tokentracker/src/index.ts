import { LLMEvent } from "./types/types.js";

export class Tracker {
  constructor(private apiKey: string) {}

  record(event: LLMEvent): void {
    console.log("LLM EVENT:", event);
  }
}

export type { LLMEvent } from "./types/types.js";
