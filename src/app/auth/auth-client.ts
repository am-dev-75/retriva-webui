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

/**
 * AuthClient — provider-agnostic authentication abstraction.
 *
 * The WebUI talks to this interface rather than to any specific auth
 * library (MSAL, Auth.js, etc.).  A factory in `auth/index.ts` selects
 * the concrete implementation based on `CONFIG.AUTH_PROVIDER`.
 */

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

export interface AuthClient {
  /** Initialise the client (e.g. MSAL account resolution). Must be idempotent. */
  initialize(): Promise<void>;

  /** Returns a valid access token for the Gateway API, or null if not signed in. */
  getAccessToken(): Promise<string | null>;

  /** Returns the currently signed-in user, or null. */
  getCurrentUser(): AuthUser | null;

  /** Trigger an interactive sign-in flow. */
  login(): Promise<void>;

  /** Sign out the current user and clear local state. */
  logout(): Promise<void>;

  /** Whether a user is currently authenticated. */
  isAuthenticated(): boolean;
}

/**
 * NullAuthClient — no-op implementation used when authentication is disabled.
 *
 * Mirrors the Gateway's NullAuthProvider: every request is anonymous,
 * `isAuthenticated()` is always true (so the UI renders without a login gate).
 */
export class NullAuthClient implements AuthClient {
  private _user: AuthUser = {
    id: 'local-user',
    name: 'Retriva User',
    email: 'user@retriva.local',
    roles: ['admin'],
  };

  async initialize(): Promise<void> {
    /* no-op */
  }

  async getAccessToken(): Promise<string | null> {
    return null;
  }

  getCurrentUser(): AuthUser | null {
    return this._user;
  }

  async login(): Promise<void> {
    /* no-op */
  }

  async logout(): Promise<void> {
    /* no-op */
  }

  isAuthenticated(): boolean {
    return true;
  }
}
