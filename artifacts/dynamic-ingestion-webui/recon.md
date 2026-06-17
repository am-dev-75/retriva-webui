# Reconnaissance: Dynamic Ingestion WebUI

## Framework & Tech Stack
- **Framework:** React with Vite.
- **Routing:** `react-router-dom` used in `App.tsx`.
- **State Management:** React Context (`UserProvider`, `KnowledgeBaseProvider`, `ThemeProvider`) and local component state (`useState`, `useEffect`).
- **API Client:** Axios-based wrapper class (`GatewayClient`) located in `src/api/gateway-client.ts`.
- **Testing Framework:** Vitest and React Testing Library.
- **Styling:** Vanilla CSS modules and global variables defined in `index.css`.

## Existing Components
- **Ingestion Page:** Formerly routed directly to `UploadPanel.tsx` for static uploads.
- **KB Selector:** Uses `gatewayClient.getKBs()` and renders native `<select>` dropdowns.
- **Auth/Role Model:** Relies on transient credentials for external systems (e.g. MediaWiki), never persisted in local storage or state.
