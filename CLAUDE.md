# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Tauri-based desktop application that displays real-time Solana (SOL) cryptocurrency prices. The application uses:
- **Frontend**: React + TypeScript with Vite
- **Backend**: Rust with Tauri framework
- **API**: CoinGecko API for price data
- **Architecture**: Hybrid desktop app with web frontend and native backend

## Development Commands

```bash
# Development
npm run dev          # Start development server (frontend + Tauri)
npm run tauri dev    # Alternative way to start Tauri dev mode

# Building
npm run build        # Build TypeScript and Vite bundle
npm run tauri build  # Build complete Tauri application

# Testing & Quality
npm test            # Run Jest tests
npm run lint        # Run ESLint
npm run lint:fix    # Run ESLint with auto-fix

# Utility
npm run clean       # Clean all build artifacts and dependencies
npm run preview     # Preview production build
```

## Architecture

### Frontend Structure
- `src/App.tsx` - Main React component with Effect-based error handling
- `src/api.ts` - Effect-based PriceService with schema validation and proper error types
- Price updates every 60 seconds with comprehensive error handling
- Uses Effect.Service pattern for dependency injection and testability

### Backend Structure
- `src-tauri/src/lib.rs` - Main Tauri application setup with HTTP and opener plugins
- `src-tauri/src/main.rs` - Entry point that delegates to lib.rs
- Minimal Rust backend - primarily serves as desktop wrapper

### Key Dependencies
- Effect ecosystem (`@effect/platform`, `@effect/platform-browser`) - Functional programming with HTTP client
- Tauri plugins: `tauri-plugin-http`, `tauri-plugin-opener`
- TypeScript with strict configuration and path mapping (`@src/*`, `@test/*`)
- Effect Schema for JSON validation and type safety

## Coding Guidelines

### General Code Style
- Use descriptive names for files, variables, functions, and classes—no abbreviations
- Always check for existing code before writing new implementations
- Do not drastically change existing patterns; iterate on them first
- Prefer simple solutions and avoid code duplication
- Keep the codebase simple and easy to understand
- Focus only on areas relevant to the current task
- Write thorough tests for all code

### TypeScript Patterns
- Use Effect schemas for all JSON validation
- Prefer pure functions and immutability
- Avoid returning null; prefer undefined and tagged union types
- Wrap non-local or unsafe code in `Effect.try` or `Effect.tryPromise`
- Use `Effect.try`/`Effect.tryPromise` instead of try/catch blocks
- Keep Effect error handling to the specific line that may throw
- Avoid external state libraries (no Redux or Zustand)
- Use `??` instead of `||` when checking for null/undefined
- Do not use implicit boolean expressions
- Do not fix linting errors automatically; let the developer address them

### Effect Services Pattern
Entry into functions should use Effect.Service classes for dependency injection:

```typescript
export class ExampleService extends Effect.Service<ExampleService>()('ExampleService', {
  effect: Effect.gen(function* () {
    const dependency = yield* Dependency
    return {
      executeAction: executeAction(dependency)
    }
  })
}) {}
```

### HTTP Requests with Effect
Use curried functions to allow HttpClient injection at runtime:

```typescript
import { HttpClient } from '@effect/platform'
import { HttpClientError } from '@effect/platform/HttpClientError'

export const fetchUrl = (httpClient: HttpClient.HttpClient) =>
  Effect.fn(function* (url: string) {
    const response = yield* httpClient.get(url)
    const text = yield* response.text
    return text
  })

// Usage with HttpClient layer
const program = Effect.gen(function* () {
  const httpClient = yield* HttpClient
  const response = yield* fetchUrl(httpClient)('https://example.com')
  Effect.log(response)
})

program.pipe(Effect.provide(FetchHttpClient.layer), Effect.runPromise)
```

### Rust Guidelines
- Rust commands must not expose unsafe code

## Development Notes

- Tauri dev server runs on port 1420 (fixed port required)
- HMR on port 1421 when using custom host
- Frontend builds to `dist/` directory
- TypeScript configuration is very strict with comprehensive type checking
- Jest configured for Node environment with TypeScript support
- Never overwrite `.envrc` file