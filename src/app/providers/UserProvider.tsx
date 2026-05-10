import React, { createContext, useContext, useState } from 'react';

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

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Currently mocked since auth is disabled
  const [user] = useState<User | null>({
    id: 'local-user',
    name: 'Retriva User',
    email: 'user@retriva.local',
    role: 'admin', // Defaulting to admin for local development
  });

  const [isLoading] = useState(false);

  return (
    <UserContext.Provider value={{ user, isAuthenticated: !!user, isLoading }}>
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
