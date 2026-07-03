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

import {
  PublicClientApplication,
  AccountInfo,
  AuthenticationResult,
  SilentRequest,
} from '@azure/msal-browser';

import { CONFIG } from '../config';
import { AuthClient, AuthUser } from './auth-client';

/**
 * MsalAuthClient — Microsoft Entra ID authentication via MSAL Browser.
 *
 * Uses the authorization-code flow with PKCE (SPA redirect).  Access
 * tokens are acquired silently when possible; a fallback interactive
 * prompt is triggered on failure.
 */
export class MsalAuthClient implements AuthClient {
  private _msal: PublicClientApplication;
  private _initialized = false;
  private _account: AccountInfo | null = null;

  constructor() {
    const authority =
      CONFIG.ENTRA_AUTHORITY ||
      `https://login.microsoftonline.com/${CONFIG.ENTRA_TENANT_ID}`;

    this._msal = new PublicClientApplication({
      auth: {
        clientId: CONFIG.ENTRA_CLIENT_ID,
        authority,
        redirectUri: window.location.origin,
      },
      cache: {
        cacheLocation: 'localStorage',
      },
    });
  }

  async initialize(): Promise<void> {
    if (this._initialized) return;

    await this._msal.handleRedirectPromise();
    const accounts = this._msal.getAllAccounts();
    if (accounts.length > 0) {
      this._account = accounts[0];
      this._msal.setActiveAccount(this._account);
    }
    this._initialized = true;
  }

  private _scopes(): string[] {
    // Default to the Gateway API scope; allow override via config.
    return CONFIG.ENTRA_SCOPES.length > 0
      ? CONFIG.ENTRA_SCOPES
      : [`api://${CONFIG.ENTRA_CLIENT_ID}/Retriva.Access`];
  }

  async getAccessToken(): Promise<string | null> {
    if (!this._account) return null;

    const request: SilentRequest = {
      scopes: this._scopes(),
      account: this._account,
    };

    try {
      const result: AuthenticationResult = await this._msal.acquireTokenSilent(request);
      return result.accessToken;
    } catch {
      // Silent acquisition failed — fall back to interactive popup.
      try {
        const result: AuthenticationResult = await this._msal.acquireTokenPopup({
          scopes: this._scopes(),
        });
        return result.accessToken;
      } catch {
        return null;
      }
    }
  }

  getCurrentUser(): AuthUser | null {
    if (!this._account) return null;

    const idClaims = this._account.idTokenClaims as Record<string, unknown> | undefined;
    const oid = (idClaims?.oid as string) || this._account.homeAccountId;
    const name = (idClaims?.name as string) || this._account.name || '';
    const email =
      (idClaims?.preferred_username as string) ||
      (idClaims?.email as string) ||
      (idClaims?.upn as string) ||
      '';
    const roles = (idClaims?.roles as string[]) || [];

    return { id: oid, name, email, roles };
  }

  async login(): Promise<void> {
    await this._msal.loginPopup({
      scopes: this._scopes(),
      prompt: 'select_account',
    });
    const accounts = this._msal.getAllAccounts();
    if (accounts.length > 0) {
      this._account = accounts[0];
      this._msal.setActiveAccount(this._account);
    }
  }

  async logout(): Promise<void> {
    if (this._account) {
      await this._msal.logoutPopup({
        account: this._account,
        mainWindowRedirectUri: window.location.origin,
      });
    }
    this._account = null;
  }

  isAuthenticated(): boolean {
    return this._account !== null;
  }
}
