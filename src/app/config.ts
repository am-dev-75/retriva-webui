/**
 * Copyright (C) 2026 Andrea Marson (am.dev.75@gmail.com)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export const CONFIG = {
  GATEWAY_BASE_URL: import.meta.env.VITE_RETRIVA_GATEWAY_BASE_URL || 'http://localhost:8002',
  APP_NAME: import.meta.env.VITE_APP_NAME || 'Retriva',
  // --- Authentication ---
  // "none" = no authentication (default). "entra" = Microsoft Entra ID.
  AUTH_PROVIDER: (import.meta.env.VITE_RETRIVA_AUTH_PROVIDER || 'none') as 'none' | 'entra',
  ENTRA_CLIENT_ID: import.meta.env.VITE_RETRIVA_ENTRA_CLIENT_ID || '',
  ENTRA_TENANT_ID: import.meta.env.VITE_RETRIVA_ENTRA_TENANT_ID || '',
  ENTRA_AUTHORITY: import.meta.env.VITE_RETRIVA_ENTRA_AUTHORITY || '',
  ENTRA_SCOPES: (import.meta.env.VITE_RETRIVA_ENTRA_SCOPES || '')
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean),
  // Derived: auth is enabled when a real provider is configured.
  get ENABLE_AUTH() {
    return this.AUTH_PROVIDER !== 'none';
  },
  ENABLE_ARTIFACTS: import.meta.env.VITE_ENABLE_ARTIFACTS !== 'false',
  ENABLE_FOLDER_UPLOAD: import.meta.env.VITE_ENABLE_FOLDER_UPLOAD !== 'false',
  ENABLE_SPEECH_INPUT: import.meta.env.VITE_RETRIVA_ENABLE_VOICE_INPUT !== undefined 
    ? import.meta.env.VITE_RETRIVA_ENABLE_VOICE_INPUT === 'true'
    : import.meta.env.DEV,
  SPEECH_INPUT_MODE: import.meta.env.VITE_SPEECH_INPUT_MODE || 'disabled',
  APP_VERSION: '1.4.0',
  // --- Retriva × 3D integration ---
  // Chat is routed to the retriva-agent (answers via RAG AND moves the 3D model)
  // instead of straight to the gateway.
  AGENT_BASE_URL: import.meta.env.VITE_RETRIVA_AGENT_BASE_URL || 'http://localhost:8090',
  // The 3D viewer embedded next to the chat.
  VIEWER_URL: import.meta.env.VITE_VIEWER_URL || 'http://localhost:5180/viewer-proto/index.html?embed=1',
};
