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

import React, { createContext, useContext, useEffect, useState } from 'react';

import { CONFIG } from '../config';
import { AuthClient, AuthUser, getAuthClient } from '../auth';

interface AuthContextType {
  client: AuthClient;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const client = getAuthClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(CONFIG.ENABLE_AUTH);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!CONFIG.ENABLE_AUTH);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        setError(null);
        await client.initialize();
        if (cancelled) return;
        const u = client.getCurrentUser();
        setUser(u);
        setIsAuthenticated(client.isAuthenticated());
      } catch (err) {
        console.error('Auth initialization failed:', err);
        if (!cancelled) setError('Authentication initialization failed.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    if (CONFIG.ENABLE_AUTH) {
      init();
    } else {
      // No auth: populate the anonymous user immediately.
      setUser(client.getCurrentUser());
      setIsLoading(false);
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async () => {
    setError(null);
    await client.login();
    setUser(client.getCurrentUser());
    setIsAuthenticated(client.isAuthenticated());
  };

  const logout = async () => {
    await client.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = { client, user, isAuthenticated, isLoading, login, logout };

  if (CONFIG.ENABLE_AUTH && isLoading) {
    return (
      <AuthContext.Provider value={value}>
        <div style={{ padding: '2rem', textAlign: 'center' }}>Checking authentication…</div>
      </AuthContext.Provider>
    );
  }

  if (CONFIG.ENABLE_AUTH && !isAuthenticated) {
    return (
      <AuthContext.Provider value={value}>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h1>Sign in required</h1>
          <p>{error || 'Please sign in to continue to Retriva.'}</p>
          <button className="btn btn-primary" type="button" onClick={() => void login()}>
            Sign in
          </button>
        </div>
      </AuthContext.Provider>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
