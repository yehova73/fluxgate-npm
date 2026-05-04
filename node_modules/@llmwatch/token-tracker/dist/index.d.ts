import { CreateAiEventResponse, LLMEvent, TokenTrackerConfig } from "./types/types.js";
export declare class Tracker {
    private apiKey;
    private endpoint;
    private timeout;
    private debug;
    constructor(config: TokenTrackerConfig);
    recordEvent(event: LLMEvent): Promise<CreateAiEventResponse | null>;
}
export type { LLMEvent, CreateAiEventResponse, TrackedUser, } from "./types/types.js";
