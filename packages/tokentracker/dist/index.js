export class Tracker {
    constructor(config) {
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
    async recordEvent(event) {
        const controller = new AbortController();
        if (this.debug) {
            console.log(`[llmwatch] Sending event to ${this.endpoint}:`, JSON.stringify(event, null, 2));
        }
        if (!event.status) {
            event.status = "SUCCESS";
        }
        const fetchPromise = fetch(this.endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.apiKey}`,
                "User-Agent": "@llmwatch/token-tracker/0.0.1",
            },
            body: JSON.stringify(event),
            signal: controller.signal,
        });
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                controller.abort();
                reject(new Error(`Request timeout after ${this.timeout}ms`));
            }, this.timeout);
        });
        const response = await Promise.race([fetchPromise, timeoutPromise]);
        let trackingData = null;
        try {
            const text = await response.text();
            trackingData = JSON.parse(text);
        }
        catch (error) {
            if (this.debug) {
                console.error("[llmwatch] Failed to parse response:", error);
            }
        }
        if (this.debug) {
            console.log(`[llmwatch] Event sent successfully. Status: ${response.status}. Response body: ${response.statusText}`);
        }
        return trackingData;
    }
}
