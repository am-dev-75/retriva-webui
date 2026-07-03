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

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { CONFIG } from '../config';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'contributor' | 'viewer';
}

interface UserContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

/** Map an AuthUser (from the auth client) to the WebUI User model. */
function mapAuthUser(authUser: {
  id: string;
  name: string;
  email: string;
  roles: string[];
}): User {
  const role: User['role'] = authUser.roles.includes('admin')
    ? 'admin'
    : authUser.roles.includes('manager')
      ? 'manager'
      : authUser.roles.includes('contributor')
        ? 'contributor'
        : 'viewer';
  return {
    id: authUser.id,
    name: authUser.name,
    email: authUser.email,
    role,
  };
}

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: authUser, isAuthenticated, isLoading: authLoading } = useAuth();

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(CONFIG.ENABLE_AUTH);

  useEffect(() => {
    if (CONFIG.ENABLE_AUTH) {
      // When auth is enabled, derive the User from the authenticated account.
      setUser(authUser ? mapAuthUser(authUser) : null);
      setIsLoading(authLoading);
    } else {
      // When auth is disabled, fall back to the local mock user.
      setUser({
        id: 'local-user',
        name: 'Retriva User',
        email: 'user@retriva.local',
        role: 'admin',
      });
      setIsLoading(false);
    }
  }, [authUser, authLoading]);

  return (
    <UserContext.Provider value={{ user, isAuthenticated, isLoading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
