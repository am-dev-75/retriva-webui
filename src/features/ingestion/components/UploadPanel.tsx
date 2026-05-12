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

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, Folder, X, File, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { MetadataEditor, MetadataField } from '../../metadata/components/MetadataEditor';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { useKnowledgeBase } from '../../../app/providers/KnowledgeBaseProvider';
import { gatewayClient } from '../../../api/gateway-client';
import './Ingestion.css';

interface PendingFile {
  file: File;
  path: string;
  id: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
}

export const UploadPanel: React.FC = () => {
  const { t } = useTranslation();
  const { selectedKbIds } = useKnowledgeBase();
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [globalMetadata, setGlobalMetadata] = useState<MetadataField[]>([]);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  const addFiles = (files: FileList | null) => {
    if (!files) return;

    const newFiles: PendingFile[] = Array.from(files).map((file) => ({
      file,
      path: (file as any).webkitRelativePath || file.name,
      id: Math.random().toString(36).substring(7),
      status: 'pending',
      progress: 0,
    }));

    setPendingFiles((prev) => [...prev, ...newFiles]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const removeFile = (id: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleClear = () => {
    setPendingFiles([]);
    setIsClearModalOpen(false);
  };

  const handleUpload = async () => {
    // For ingestion, we use the primary (first) selected KB
    const targetKbId = selectedKbIds[0] || 'default';
    console.log(`Ingesting files to Knowledge Base: ${targetKbId}`);
    
    if (pendingFiles.length === 0) return;

    setPendingFiles((prev) => 
      prev.map(f => ({ ...f, status: 'uploading', progress: 0 }))
    );

    try {
      // 1. Convert metadata to a Record
      const metadataObj: Record<string, string> = { kb_id: targetKbId };
      globalMetadata.forEach(m => {
        if (m.key && m.value) metadataObj[m.key] = m.value;
      });

      // 2. Create the batch
      const { batch_id } = await gatewayClient.createBatch(metadataObj);
      console.log(`Created batch ${batch_id}`);

      // 3. Upload files sequentially or in parallel
      // We'll do it sequentially here for simpler error tracking, 
      // but in a real app, you might want to chunk parallel uploads.
      for (const fileItem of pendingFiles) {
        if (fileItem.status === 'completed') continue; // Skip already done

        try {
          // Simulate some progress before upload finishes
          setPendingFiles(prev => prev.map(p => p.id === fileItem.id ? { ...p, progress: 50 } : p));
          
          await gatewayClient.uploadFileToBatch(
            batch_id, 
            fileItem.file, 
            fileItem.path,
            // You could pass file-specific metadata here
          );
          
          setPendingFiles(prev => prev.map(p => p.id === fileItem.id ? { ...p, status: 'completed', progress: 100 } : p));
        } catch (err) {
          console.error(`Failed to upload ${fileItem.file.name}:`, err);
          setPendingFiles(prev => prev.map(p => p.id === fileItem.id ? { ...p, status: 'error' } : p));
        }
      }

    } catch (error) {
      console.error('Failed to create ingestion batch:', error);
      setPendingFiles(prev => prev.map(f => f.status === 'uploading' ? { ...f, status: 'error' } : f));
    }
  };

  return (
    <div className="ingestion-container">
      <header className="page-header">
        <div>
          <h1>{t('ingestion.title')}</h1>
          <p className="page-subtitle">{t('ingestion.subtitle')}</p>
        </div>
      </header>

      <div className="upload-grid">
        <div 
          className={`drop-zone ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload size={48} className="upload-icon" />
          <h3>{t('ingestion.drop_title')}</h3>
          <p>{t('ingestion.drop_subtitle')}</p>
          
          <div className="upload-actions">
            <label className="btn btn-primary">
              <File size={18} />
              {t('ingestion.select_files')}
              <input 
                type="file" 
                multiple 
                onChange={(e) => addFiles(e.target.files)} 
                hidden 
              />
            </label>
            <label className="btn btn-ghost">
              <Folder size={18} />
              {t('ingestion.select_folder')}
              <input 
                type="file" 
                webkitdirectory="" 
                directory="" 
                onChange={(e) => addFiles(e.target.files)} 
                hidden 
              />
            </label>
          </div>
        </div>

        <div className="pending-files-panel">
          <div className="panel-header">
            <h3>{t('ingestion.pending_uploads', { count: pendingFiles.length })}</h3>
            {pendingFiles.length > 0 && (
              <div className="btn-group">
                <button 
                  className="btn btn-ghost btn-sm" 
                  onClick={() => setIsClearModalOpen(true)}
                  title={t('ingestion.clear_list')}
                >
                  <Trash2 size={16} />
                  {t('ingestion.clear_list')}
                </button>
                <button className="btn btn-primary btn-sm" onClick={handleUpload}>
                  {t('ingestion.upload_all')}
                </button>
              </div>
            )}
          </div>

          <div className="metadata-section" style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--color-border)' }}>
            <MetadataEditor 
              metadata={globalMetadata} 
              onChange={setGlobalMetadata} 
            />
          </div>

          <div className="file-list">
            {pendingFiles.length === 0 ? (
              <div className="empty-list">{t('ingestion.no_files')}</div>
            ) : (
              pendingFiles.map((pf) => (
                <div key={pf.id} className={`file-item ${pf.status}`}>
                  <div className="file-info">
                    <File size={16} />
                    <div className="file-details">
                      <span className="file-name">{pf.file.name}</span>
                      <span className="file-path">{pf.path}</span>
                    </div>
                  </div>
                  
                  <div className="file-status">
                    {pf.status === 'pending' && (
                      <button className="btn-icon" onClick={() => removeFile(pf.id)}>
                        <X size={16} />
                      </button>
                    )}
                    {pf.status === 'uploading' && <div className="spinner-sm" />}
                    {pf.status === 'completed' && <CheckCircle size={16} className="text-success" />}
                    {pf.status === 'error' && <AlertCircle size={16} className="text-danger" />}
                  </div>

                  {pf.status === 'uploading' && (
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pf.progress}%` }} />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={handleClear}
        title={t('ingestion.clear_list')}
        message={t('ingestion.confirm_clear')}
      />
    </div>
  );
};

// Declaring webkitdirectory for TS
declare module 'react' {
  interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    webkitdirectory?: string;
    directory?: string;
  }
}
