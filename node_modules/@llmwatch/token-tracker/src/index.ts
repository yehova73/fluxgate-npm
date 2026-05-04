import {
  CreateAiEventResponse,
  LLMEvent,
  TokenTrackerConfig,
} from "./types/types.js";

export class Tracker {
  private apiKey: string;
  private endpoint: string;
  private timeout: number;
  private debug: boolean;

  constructor(config: TokenTrackerConfig) {
    if (!config.apiKey) {
      throw new Error("TokenTracker requires an apiKey in config");
    }

    this.apiKey = config.apiKey;
    this.endpoint = config.endpoint || "https://llmwatch.vercel.com/api/events";
    // this.endpoint = "https://llmwatch.vercel.app/api/events";
    this.timeout = config.timeout || 5000;
    this.debug = config.debug || false;

    if (this.debug) {
      console.log("[llmwatch] TokenTracker initialized", {
        endpoint: this.endpoint,
        timeout: this.timeout,
      });
    }
  }

  public async recordEvent(
    event: LLMEvent,
  ): Promise<CreateAiEventResponse | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    if (this.debug) {
      console.log(
        `[llmwatch] Sending event to ${this.endpoint}:`,
        JSON.stringify(event, null, 2),
      );
    }

    console.log("Event to be sent:", JSON.stringify(event, null, 2));

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "User-Agent": "@llmwatch/token-tracker/0.0.1",
      },
      body: JSON.stringify(event),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let trackingData: CreateAiEventResponse | null = null;
    try {
      const text = await response.text();
      trackingData = JSON.parse(text) as CreateAiEventResponse;
    } catch {
      // ignore parse errors
    }

    if (this.debug) {
      console.log(
        `[llmwatch] Event sent successfully. Status: ${response.status}. Response body: ${response.statusText}`,
      );
    }

    return trackingData;
  }
}

export type {
  LLMEvent,
  CreateAiEventResponse,
  TrackedUser,
} from "./types/types.js";
