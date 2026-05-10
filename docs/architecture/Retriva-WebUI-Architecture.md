# Retriva WebUI Architecture

## Overview

Retriva WebUI is a modern, enterprise-grade single-page application (SPA) built with **React**, **TypeScript**, and **Vite**. It serves as the primary frontend for the Retriva ecosystem, communicating exclusively with the **Retriva Gateway**.

## Design Principles

- **Gateway-Only Communication**: The frontend never calls Retriva Core directly, ensuring a clean security boundary and architectural separation.
- **Feature-Based Modularity**: The codebase is organized into independent feature modules (Chat, Ingestion, Knowledge Bases, etc.) to promote maintainability and scalability.
- **Theme-First Design**: Light, dark, and system themes are supported from the foundation using CSS variables and a custom `ThemeProvider`.
- **I18n-Ready**: All user-visible strings are managed via translation keys using `i18next`.
- **IAM-Ready**: User and session management are isolated behind a `UserProvider` to allow for easy integration with future identity providers.

## Source Code Structure

```text
src/
  app/
    layout/       # Main AppShell and common layouts
    providers/    # Context providers (Theme, User, i18n)
    router/       # Routing configuration
    config.ts     # Runtime configuration and feature flags
  features/
    chat/         # Message timeline, composer, citations
    ingestion/    # File/Folder upload, ingestion tracking
    knowledge-bases/ # KB management
    documents/    # Document browsing and filtering
    artifacts/    # Artifact listing and downloading
    speech-input/ # Provider-based speech-to-text abstraction
    settings/     # Application preferences
  components/
    ui/           # Reusable atomic UI components (buttons, inputs)
    layout/       # Common layout elements
    feedback/     # Loaders, toasts, error states
  api/
    gateway-client.ts # HTTP client for Retriva Gateway
    types.ts      # Shared TypeScript interfaces
  lib/
    formatting.ts # Locale-aware formatting helpers
    validation.ts # Data validation logic
  styles/
    tokens.css    # Design tokens (colors, spacing, shadows)
    index.css     # Global resets and base styles
```

## Core Modules

### 1. Gateway Client
A centralized `GatewayClient` class handles all HTTP communication with the Retriva Gateway. It encapsulates request/response logic, error handling, and type safety.

### 2. Design System
The UI uses a neutral, minimal enterprise theme defined in `src/styles/tokens.css`. Semantic CSS variables allow for seamless switching between light and dark modes without component-level changes.

### 3. Speech Input Abstraction
The `speech-input` feature is architected with a provider pattern. The current version uses a `NoopProvider`, but the interface is ready to accept browser-native or Gateway-mediated speech-to-text engines in the future.

### 4. Internationalization
Localization is handled by `react-i18next`. The `src/lib/formatting.ts` module provides locale-aware helpers for:
- Dates and Times
- Numbers and Percentages
- File Sizes (using SI units)

## Future Considerations

- **IAM Integration**: The `UserProvider` is designed to be replaced by a concrete authentication provider (e.g., OIDC, Auth0).
- **Advanced Retrieval**: The UI is prepared for complex metadata filtering and source-aware document browsing.
- **Rich Artifacts**: The artifact module supports various formats and is ready for interactive preview features.
