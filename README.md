# Retriva WebUI

Native web interface for Retriva. It requires the Retriva Gateway service running to operate. See https://github.com/am-dev-75/retriva for more details.

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment (Optional)
Create a `.env` file in the root directory to override default settings (see `.env.example`):
```env
VITE_RETRIVA_GATEWAY_BASE_URL=http://localhost:8002
```

### 3. Run the development server
```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

## Features

### Voice Dictation

Retriva WebUI supports voice dictation for user queries. This feature allows users to record their voice and insert the transcription directly into the query input field.

- **Configuration**: This feature is enabled by default in local development. To manually enable it in production, set `VITE_RETRIVA_ENABLE_VOICE_INPUT=true` in your `.env` file.
- **Backend Dependency**: Dictation requires the Gateway's `/stt/transcribe` endpoint to process the audio. No direct calls are made to Whisper from the browser.
- **Privacy & Storage**: No audio is stored locally by the WebUI.
- **Query Submission**: Voice dictation only inserts the text into the chat input. It does *not* automatically submit the query, allowing you to review or edit the text before sending.

## Implemetation notes

### React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default tseslint.config({
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

- Replace `tseslint.configs.recommended` to `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
- Optionally add `...tseslint.configs.stylisticTypeChecked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:

```js
// eslint.config.js
import react from 'eslint-plugin-react'

export default tseslint.config({
  // Set the react version
  settings: { react: { version: '18.3' } },
  plugins: {
    // Add the react plugin
    react,
  },
  rules: {
    // other rules...
    // Enable its recommended rules
    ...react.configs.recommended.rules,
    ...react.configs['jsx-runtime'].rules,
  },
})
```

## Licensing

This project, including all source code, agentic specifications, and documentation, is licensed under the Apache License 2.0. See the LICENSE file for details.