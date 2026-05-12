import {
  CreateAiEventResponse,
  LLMEvent,
  FluxGateConfig,
} from "./types/types.js";

export class FluxGate {
  private apiKey: string;
  private endpoint: string;
  private timeout: number;
  private debug: boolean;

  constructor(config: FluxGateConfig) {
    if (!config.apiKey) {
      throw new Error("FluxGate requires an apiKey in config");
    }

    this.apiKey = config.apiKey;
    this.endpoint = config.endpoint || "https://fluxgate.app/api/events";
    this.timeout = config.timeout || 5000;
    this.debug = config.debug || false;

    if (this.debug) {
      console.log("[fluxgate] FluxGate initialized", {
        endpoint: this.endpoint,
        timeout: this.timeout,
      });
    }
  }

  public async recordEvent(
    event: LLMEvent,
  ): Promise<CreateAiEventResponse | null> {
    const controller = new AbortController();

    if (this.debug) {
      console.log(
        `[fluxgate] Sending event to ${this.endpoint}:`,
        JSON.stringify(event, null, 2),
      );
    }

    if (!event.status) {
      event.status = "SUCCESS";
    }

    const fetchPromise = fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "User-Agent": "@fluxgate/sdk/0.0.2-dev.0",
      },
      body: JSON.stringify(event),
      signal: controller.signal,
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        controller.abort();
        reject(new Error(`Request timeout after ${this.timeout}ms`));
      }, this.timeout);
    });

    let response: Response;
    try {
      response = await Promise.race([fetchPromise, timeoutPromise]);
    } catch (err) {
      if (this.debug) {
        console.error("[fluxgate] Network error sending event:", err);
      }
      return {
        cost: 0,
        createdAt: new Date().toISOString(),
        id: "error-" + Math.random().toString(36).substring(2, 15),
        status: "ERROR",
      };
      // throw err;
    }

    let trackingData: CreateAiEventResponse | null = null;
    try {
      const text = await response.text();
      trackingData = JSON.parse(text) as CreateAiEventResponse;
    } catch (error) {
      if (this.debug) {
        console.error("[fluxgate] Failed to parse response:", error);
      }
    }

    if (this.debug) {
      console.log(
        `[fluxgate] Event sent successfully. Status: ${response.status}. Response: ${JSON.stringify(trackingData)}`,
      );
    }

    return trackingData;
  }
}

export type {
  LLMEvent,
  CreateAiEventResponse,
  TrackedUser,
  AiEventMetadata,
  FluxGateCostTrackingResponse,
  WithTracking,
  AiEventStatus,
  AiEventUsage,
  ExtractedUsage,
  FluxGateConfig,
} from "./types/types.js";
