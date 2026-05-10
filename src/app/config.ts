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
  ENABLE_AUTH: import.meta.env.VITE_ENABLE_AUTH === 'true',
  ENABLE_ARTIFACTS: import.meta.env.VITE_ENABLE_ARTIFACTS !== 'false',
  ENABLE_FOLDER_UPLOAD: import.meta.env.VITE_ENABLE_FOLDER_UPLOAD !== 'false',
  ENABLE_SPEECH_INPUT: import.meta.env.VITE_ENABLE_SPEECH_INPUT === 'true',
  SPEECH_INPUT_MODE: import.meta.env.VITE_SPEECH_INPUT_MODE || 'disabled',
  APP_VERSION: '0.1.0',
};
