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

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { KnowledgeBase } from '../../api/types';
import { gatewayClient } from '../../api/gateway-client';

interface KnowledgeBaseContextType {
  selectedKbIds: string[];
  toggleKbSelection: (id: string) => void;
  setSelectedKbIds: (ids: string[]) => void;
  knowledgeBases: KnowledgeBase[];
  isLoading: boolean;
  refreshKBs: () => Promise<void>;
}

const KnowledgeBaseContext = createContext<KnowledgeBaseContextType | undefined>(undefined);

export const KnowledgeBaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedKbIds, setSelectedKbIds] = useState<string[]>(['default']);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const toggleKbSelection = (id: string) => {
    setSelectedKbIds(prev => {
      if (prev.includes(id)) {
        // Don't allow deselecting everything? Or allow it? 
        // User said "By default, the 'default' knowledge base must be selected."
        // If it's the last one, maybe keep it?
        const filtered = prev.filter(item => item !== id);
        return filtered.length === 0 ? ['default'] : filtered;
      } else {
        return [...prev, id];
      }
    });
  };

  const refreshKBs = useCallback(async () => {
    setIsLoading(true);
    try {
      const kbs = await gatewayClient.getKBs();
      setKnowledgeBases(kbs);
      setSelectedKbIds(prev => {
        const validIds = prev.filter(id => id === 'default' || kbs.some(k => k.id === id));
        return validIds.length === 0 ? ['default'] : validIds;
      });
    } catch (error) {
      console.error('Failed to fetch Knowledge Bases:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshKBs();
  }, []);

  return (
    <KnowledgeBaseContext.Provider value={{ 
      selectedKbIds, 
      toggleKbSelection,
      setSelectedKbIds, 
      knowledgeBases, 
      isLoading, 
      refreshKBs 
    }}>
      {children}
    </KnowledgeBaseContext.Provider>
  );
};

export const useKnowledgeBase = () => {
  const context = useContext(KnowledgeBaseContext);
  if (context === undefined) {
    throw new Error('useKnowledgeBase must be used within a KnowledgeBaseProvider');
  }
  return context;
};
