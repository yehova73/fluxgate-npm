# FluxGate LLM Cost Tracker

![Status: In Development](https://img.shields.io/badge/status-in%20development-orange)

Monitor and track LLM token usage and costs across multiple providers with simple, non-invasive wrappers.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 📦 Packages

This monorepo contains three packages:

| Package                                     | Version     | Description                 |
| ------------------------------------------- | ----------- | --------------------------- |
| [@fluxgate/sdk](./packages/sdk)             | 0.0.2-dev.0 | Core tracking functionality |
| [@fluxgate/openai](./packages/openai)       | 0.0.1       | OpenAI SDK wrapper          |
| [@fluxgate/gemini](./packages/gemini)       | 0.0.1       | Google Gemini SDK wrapper   |
| [@fluxgate/anthropic](./packages/anthropic) | 0.0.1       | Anthropic SDK wrapper       |

## 🚀 Quick Start

### OpenAI Example

```bash
npm install @fluxgate/sdk @fluxgate/openai openai
```

```typescript
import OpenAI from "openai";
import { FluxGate } from "@fluxgate/sdk";
import { createOpenAICostTracker } from "@fluxgate/openai";

// Initialize OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize FluxGate
const fluxgate = new FluxGate({
  apiKey: process.env.FLUXGATE_API_KEY,
  endpoint: "https://fluxgate.app/api/events",
});

// Wrap client with tracking
const trackedClient = createOpenAICostTracker(client, fluxgate);

// Use with context
const response = await trackedClient
  .withContext({ feature: "chatbot", user: "user-123" })
  .chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: "Hello!" }],
  });

console.log(response.fluxGateCostTrackingResponse);
// { status: "SUCCESS", cost: 0.001, trackingId: "...", createdAt: "..." }
```

### Gemini Example

```bash
npm install @fluxgate/sdk @fluxgate/gemini @google/generative-ai
```

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";
import { FluxGate } from "@fluxgate/sdk";
import { createGeminiCostTracker } from "@fluxgate/gemini";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

const fluxgate = new FluxGate({
  apiKey: process.env.FLUXGATE_API_KEY,
});

const trackedModel = createGeminiCostTracker(model, fluxgate);

const result = await trackedModel
  .withContext({ feature: "content-gen" })
  .generateContent("Tell me a joke");

console.log(result.fluxGateCostTrackingResponse);
```

## 🎯 Features

- 🔌 **Non-invasive**: Wraps existing SDK clients without modifying them
- 🎨 **Context-aware**: Add metadata to track features, users, and sessions
- 📊 **Comprehensive**: Tracks tokens, costs, latency, and errors
- 🌊 **Stream support**: Works with streaming responses
- 🎯 **Type-safe**: Full TypeScript support with proper types
- 🚀 **Multiple providers**: OpenAI, Gemini, Anthropic

## 📖 Documentation

- [Core Tracker Documentation](./packages/sdk/README.md)
- [OpenAI Wrapper Documentation](./packages/openai/README.md)
- [Gemini Wrapper Documentation](./packages/gemini/README.md)
- [Anthropic Wrapper Documentation](./packages/anthropic/README.md)

## 🛠️ Development

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Build in watch mode
npm run dev
```

## 📂 Project Structure

```
fluxgate-npm/
├── packages/
│   ├── sdk/                   # Core tracking functionality
│   ├── openai/                # OpenAI SDK wrapper
│   ├── gemini/                # Gemini SDK wrapper
│   └── anthropic/             # Anthropic SDK wrapper
├── vitest.config.ts           # Test configuration
└── tsconfig.json              # Root TypeScript config
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Website](https://fluxgate.app)
- [Documentation](https://fluxgate.app/docs)
- [Issues](https://github.com/yehova73/fluxgate-npm/issues)

## 💡 Support

For support, email support@fluxgate.tracker or open an issue on GitHub.
