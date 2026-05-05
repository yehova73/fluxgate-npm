# LLMWatch Token Tracker

Monitor and track LLM token usage and costs across multiple providers with simple, non-invasive wrappers.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 📦 Packages

This monorepo contains three packages:

| Package                                                         | Version | Description                 |
| --------------------------------------------------------------- | ------- | --------------------------- |
| [@llmwatch/tokentracker](./packages/tokentracker)               | 0.0.1   | Core tracking functionality |
| [@llmwatch/tokentracker-openai](./packages/tokentracker-openai) | 0.0.1   | OpenAI SDK wrapper          |
| [@llmwatch/tokentracker-gemini](./packages/tokentracker-gemini) | 0.0.1   | Google Gemini SDK wrapper   |

## 🚀 Quick Start

### OpenAI Example

```bash
npm install @llmwatch/tokentracker @llmwatch/tokentracker-openai openai
```

```typescript
import OpenAI from "openai";
import { Tracker } from "@llmwatch/tokentracker";
import { createOpenAITokenTracker } from "@llmwatch/tokentracker-openai";

// Initialize OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize tracker
const tracker = new Tracker({
  apiKey: process.env.LLMWATCH_API_KEY,
  endpoint: "https://llmwatch.vercel.com/api/events",
});

// Wrap client with tracking
const trackedClient = createOpenAITokenTracker(client, tracker);

// Use with context
const response = await trackedClient
  .withContext({ feature: "chatbot", user: "user-123" })
  .chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: "Hello!" }],
  });

console.log(response.trackLlmResponse);
// { status: "SUCCESS", cost: 0.001, trackingId: "...", createdAt: "..." }
```

### Gemini Example

```bash
npm install @llmwatch/tokentracker @llmwatch/tokentracker-gemini @google/generative-ai
```

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Tracker } from "@llmwatch/tokentracker";
import { createGeminiTokenTracker } from "@llmwatch/tokentracker-gemini";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

const tracker = new Tracker({
  apiKey: process.env.LLMWATCH_API_KEY,
});

const trackedModel = createGeminiTokenTracker(model, tracker);

const result = await trackedModel
  .withContext({ feature: "content-gen" })
  .generateContent("Tell me a joke");

console.log(result.trackLlmResponse);
```

## 🎯 Features

- 🔌 **Non-invasive**: Wraps existing SDK clients without modifying them
- 🎨 **Context-aware**: Add metadata to track features, users, and sessions
- 📊 **Comprehensive**: Tracks tokens, costs, latency, and errors
- 🌊 **Stream support**: Works with streaming responses
- 🎯 **Type-safe**: Full TypeScript support with proper types
- 🚀 **Multiple providers**: OpenAI, Gemini (Anthropic coming soon)

## 📖 Documentation

- [Core Tracker Documentation](./packages/tokentracker/README.md)
- [OpenAI Wrapper Documentation](./packages/tokentracker-openai/README.md)
- [Gemini Wrapper Documentation](./packages/tokentracker-gemini/README.md)

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
llmwatch-npm/
├── packages/
│   ├── tokentracker/          # Core tracking functionality
│   ├── tokentracker-openai/   # OpenAI SDK wrapper
│   └── tokentracker-gemini/   # Gemini SDK wrapper
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

- [Website](https://llmwatch.vercel.com)
- [Documentation](https://llmwatch.vercel.com/docs)
- [Issues](https://github.com/yourusername/llmwatch-npm/issues)

## 💡 Support

For support, email support@llmwatch.com or open an issue on GitHub.
