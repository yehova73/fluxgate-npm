import { LLMEvent } from "./types/types.js";
export declare class Tracker {
    private apiKey;
    constructor(apiKey: string);
    record(event: LLMEvent): void;
}
export type { LLMEvent } from "./types/types.js";
