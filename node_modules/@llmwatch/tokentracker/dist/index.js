export class Tracker {
    constructor(apiKey) {
        this.apiKey = apiKey;
    }
    record(event) {
        console.log("LLM EVENT:", event);
    }
}
