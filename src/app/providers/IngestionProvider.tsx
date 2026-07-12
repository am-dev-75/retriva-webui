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

import React, { createContext, useContext, useState, useCallback } from 'react';
import { MetadataField } from '../../features/metadata/components/MetadataEditor';

export interface PendingFile {
  file: File;
  path: string;
  id: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  addedAt: string;
  metadata: MetadataField[];
}

interface IngestionContextType {
  pendingFiles: PendingFile[];
  setPendingFiles: React.Dispatch<React.SetStateAction<PendingFile[]>>;
  addFiles: (files: FileList | null) => void;
  removeFile: (id: string) => void;
  clearFiles: () => void;
  updateFileMetadata: (id: string, metadata: MetadataField[]) => void;
  globalMetadata: MetadataField[];
  setGlobalMetadata: React.Dispatch<React.SetStateAction<MetadataField[]>>;
  sourceType: 'auto' | 'mediawiki_export';
  setSourceType: React.Dispatch<React.SetStateAction<'auto' | 'mediawiki_export'>>;
  forceReingest: boolean;
  setForceReingest: React.Dispatch<React.SetStateAction<boolean>>;
}

const IngestionContext = createContext<IngestionContextType | undefined>(undefined);

type FileWithRelativePath = File & { webkitRelativePath: string };

export const IngestionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [globalMetadata, setGlobalMetadata] = useState<MetadataField[]>([]);
  const [sourceType, setSourceType] = useState<'auto' | 'mediawiki_export'>('auto');
  const [forceReingest, setForceReingest] = useState(false);

  const addFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const now = new Date().toISOString();
    // Snapshot the current global metadata so each file inherits it at insertion time
    const inheritedMetadata = globalMetadata.map(m => ({ ...m }));
    const newFiles: PendingFile[] = Array.from(files).map((file) => ({
      file,
      path: (file as FileWithRelativePath).webkitRelativePath || file.name,
      id: Math.random().toString(36).substring(7),
      status: 'pending' as const,
      progress: 0,
      addedAt: now,
      metadata: inheritedMetadata.map(m => ({ ...m })),
    }));
    setPendingFiles((prev) => [...prev, ...newFiles]);
  }, [globalMetadata]);

  const removeFile = useCallback((id: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const clearFiles = useCallback(() => {
    setPendingFiles([]);
  }, []);

  const updateFileMetadata = useCallback((id: string, metadata: MetadataField[]) => {
    setPendingFiles((prev) => prev.map((f) => (f.id === id ? { ...f, metadata } : f)));
  }, []);

  return (
    <IngestionContext.Provider
      value={{
        pendingFiles,
        setPendingFiles,
        addFiles,
        removeFile,
        clearFiles,
        updateFileMetadata,
        globalMetadata,
        setGlobalMetadata,
        sourceType,
        setSourceType,
        forceReingest,
        setForceReingest,
      }}
    >
      {children}
    </IngestionContext.Provider>
  );
};

export const useIngestion = () => {
  const context = useContext(IngestionContext);
  if (context === undefined) {
    throw new Error('useIngestion must be used within an IngestionProvider');
  }
  return context;
};
