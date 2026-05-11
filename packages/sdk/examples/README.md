# Examples

This directory contains example code demonstrating various features of the @fluxgate/sdk package.

## Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- FluxGate API key

## Setup

1. Install dependencies from the root of the monorepo:

   ```bash
   cd ../../..
   npm install
   ```

2. Build the package:

   ```bash
   npm run build
   ```

3. Set your environment variable:
   ```bash
   export FLUXGATE_API_KEY="your-api-key"
   ```

## Running Examples

### Basic Example

```bash
npx tsx examples/basic.ts
```

This example demonstrates:

- Basic event tracking
- Tracking with full metadata
- Error event tracking
- Different event statuses

## Example Files

- **`basic.ts`** - Core tracking functionality with various event types

## Notes

- All examples use environment variables for API keys
- Debug mode is enabled to show detailed logging
- Examples are written in TypeScript and use the `tsx` runner

## Learn More

- [Core Package Documentation](../README.md)
- [OpenAI Wrapper Examples](../../openai/examples)
- [Gemini Wrapper Examples](../../gemini/examples)
