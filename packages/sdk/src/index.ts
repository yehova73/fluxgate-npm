import {
  CreateAiEventResponse,
  LLMEvent,
  FluxGateConfig,
  FluxGateLogger,
} from "./types/types.js";

const SDK_VERSION = "0.0.5";

export class FluxGate {
  private apiKey: string;
  private endpoint: string;
  private timeout: number;
  private debug: boolean;
  private logger: FluxGateLogger;

  constructor(config: FluxGateConfig) {
    if (!config.apiKey) {
      throw new Error("FluxGate requires an apiKey in config");
    }

    this.apiKey = config.apiKey;
    this.endpoint = config.endpoint || "https://fluxgate.app/api/events";
    this.timeout = config.timeout || 5000;
    this.debug = config.debug || false;
    this.logger =
      config.logger ??
      ((level, message, data) => {
        if (level === "error") console.error(message, data);
        else console.log(message, data);
      });

    if (this.debug) {
      this.logger("log", "[fluxgate] FluxGate initialized", {
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
      this.logger(
        "log",
        `[fluxgate] Sending event to ${this.endpoint}:`,
        JSON.stringify(event, null, 2),
      );
    }

    const fetchPromise = fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "User-Agent": `@fluxgate/sdk/${SDK_VERSION}`,
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
        this.logger("error", "[fluxgate] Network error sending event:", err);
      }
      return null;
    }

    if (!response.ok) {
      if (this.debug) {
        this.logger(
          "error",
          `[fluxgate] Server returned non-2xx status: ${response.status}`,
        );
      }
      return null;
    }

    let trackingData: CreateAiEventResponse | null = null;
    try {
      const text = await response.text();
      trackingData = JSON.parse(text) as CreateAiEventResponse;
    } catch (error) {
      if (this.debug) {
        this.logger("error", "[fluxgate] Failed to parse response:", error);
      }
    }

    if (this.debug) {
      this.logger(
        "log",
        `[fluxgate] Event sent successfully. Status: ${response.status}. Response: ${JSON.stringify(trackingData)}`,
      );
    }

    return trackingData;
  }
}

export type {
  LLMEvent,
  CreateAiEventResponse,
  UserSession,
  AiEventMetadata,
  AiEventStatus,
  AiEventUsage,
  Performance,
  CostOverride,
  ExtractedUsage,
  FluxGateCostTrackingResponse,
  WithTracking,
  FluxGateConfig,
  FluxGateLogger,
} from "./types/types.js";
