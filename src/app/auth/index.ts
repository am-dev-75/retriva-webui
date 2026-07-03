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

import { CONFIG } from '../config';
import { AuthClient, NullAuthClient } from './auth-client';
import { MsalAuthClient } from './msal-auth-client';

export type { AuthClient, AuthUser } from './auth-client';
export { NullAuthClient } from './auth-client';
export { MsalAuthClient } from './msal-auth-client';

let _client: AuthClient | null = null;

/**
 * Factory that returns the singleton AuthClient for the configured provider.
 *
 * - `none`  → NullAuthClient (no authentication, anonymous access)
 * - `entra` → MsalAuthClient (Microsoft Entra ID via MSAL Browser)
 */
export function getAuthClient(): AuthClient {
  if (_client) return _client;

  switch (CONFIG.AUTH_PROVIDER) {
    case 'entra':
      _client = new MsalAuthClient();
      break;
    case 'none':
    default:
      _client = new NullAuthClient();
      break;
  }

  return _client;
}
