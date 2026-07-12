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
import { Upload, Folder, X, File, CheckCircle, AlertCircle, Trash2, Link as LinkIcon } from 'lucide-react';
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

type FileWithRelativePath = File & { webkitRelativePath: string };

export const UploadPanel: React.FC = () => {
  const { t } = useTranslation();
  const { selectedKbIds } = useKnowledgeBase();
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [globalMetadata, setGlobalMetadata] = useState<MetadataField[]>([]);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [sourceType, setSourceType] = useState<'auto' | 'mediawiki_export'>('auto');
  const [forceReingest, setForceReingest] = useState(false);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  const addFiles = (files: FileList | null) => {
    if (!files) return;

    const newFiles: PendingFile[] = Array.from(files).map((file) => ({
      file,
      path: (file as FileWithRelativePath).webkitRelativePath || file.name,
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

  const handleFetchUrl = async () => {
    if (!urlInput.trim()) return;
    setIsFetchingUrl(true);
    setUrlError(null);
    try {
      const result = await gatewayClient.fetchUrl(urlInput.trim());
      let file: File;
      if (result.is_binary) {
        // Binary content (PDF, images, Office docs): decode base64 → Blob → File
        const byteCharacters = atob(result.content);
        const byteArrays: Uint8Array[] = [];
        const sliceSize = 8192;
        for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
          const slice = byteCharacters.slice(offset, offset + sliceSize);
          const byteNumbers = new Array(slice.length);
          for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
          }
          byteArrays.push(new Uint8Array(byteNumbers));
        }
        const blob = new Blob(byteArrays, { type: result.content_type });
        file = new File([blob], result.filename, { type: result.content_type });
      } else {
        // Text content (HTML, plain text, XML, JSON): use string directly
        const title = result.title || urlInput.trim();
        const filename = title.replace(/[^a-zA-Z0-9_\- ]/g, '').trim().replace(/\s+/g, '_') || 'webpage';
        file = new File([result.content], `${filename}.html`, { type: 'text/html' });
      }
      const newFile: PendingFile = {
        file,
        path: result.final_url || urlInput.trim(),
        id: Math.random().toString(36).substring(7),
        status: 'pending',
        progress: 0,
      };
      setPendingFiles((prev) => [...prev, newFile]);
      setUrlInput('');
      setIsUrlModalOpen(false);
    } catch (err: unknown) {
      const error = err as Error;
      setUrlError(t('ingestion.url_fetch_error', { error: error.message }));
    } finally {
      setIsFetchingUrl(false);
    }
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
      const { batch_id } = await gatewayClient.createBatch(metadataObj, sourceType);
      console.log(`Created batch ${batch_id}`);

      // 3. Upload files in concurrent chunks
      const CONCURRENCY = 15; // 15 files at a time
      const filesToUpload = pendingFiles.filter(f => f.status !== 'completed');
      
      for (let i = 0; i < filesToUpload.length; i += CONCURRENCY) {
        const chunk = filesToUpload.slice(i, i + CONCURRENCY);
        
        await Promise.all(chunk.map(async (fileItem) => {
          try {
            await gatewayClient.uploadFileToBatch(
              batch_id, 
              fileItem.file, 
              fileItem.path,
              undefined,
              forceReingest,
            );
            fileItem.status = 'completed';
            fileItem.progress = 100;
          } catch (err) {
            console.error(`Failed to upload ${fileItem.file.name}:`, err);
            fileItem.status = 'error';
          }
        }));
        
        // Trigger a single re-render per chunk
        setPendingFiles((prev) => [...prev]);
      }

      if (sourceType === 'mediawiki_export') {
        try {
          await gatewayClient.finalizeBatch(batch_id);
          console.log(`Finalized batch ${batch_id}`);
        } catch (err) {
          console.error(`Failed to finalize batch ${batch_id}:`, err);
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
            <button className="btn btn-ghost" onClick={() => { setUrlError(null); setIsUrlModalOpen(true); }}>
              <LinkIcon size={18} />
              {t('ingestion.select_url')}
            </button>
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

          <div className="metadata-section" style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ marginBottom: 'var(--spacing-xs)' }}>
              <strong>{t('ingestion.source_type')}</strong>
            </div>
            <select 
              value={sourceType} 
              onChange={(e) => setSourceType(e.target.value as 'auto' | 'mediawiki_export')}
              style={{ padding: '0.5rem', width: '100%', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
            >
              <option value="auto">{t('ingestion.source_type_auto')}</option>
              <option value="mediawiki_export">{t('ingestion.source_type_mediawiki')}</option>
            </select>
            {sourceType === 'mediawiki_export' && (
              <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                {t('ingestion.mediawiki_hint')}
              </p>
            )}
          </div>

          <div className="metadata-section" style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--color-border)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={forceReingest}
                onChange={(e) => setForceReingest(e.target.checked)}
              />
              <strong>{t('ingestion.force_reingest')}</strong>
            </label>
            <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              {t('ingestion.force_reingest_desc')}
            </p>
          </div>

          <div className="file-list">
            {pendingFiles.length === 0 ? (
              <div className="empty-list">{t('ingestion.no_files')}</div>
            ) : (
              <>
                {pendingFiles.slice(0, 100).map((pf) => (
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
                ))}
                {pendingFiles.length > 100 && (
                  <div className="file-item summary" style={{ justifyContent: 'center', color: 'var(--color-text-muted)', padding: '1rem' }}>
                    <span>{t('ingestion.more_files', { count: pendingFiles.length - 100 })}</span>
                  </div>
                )}
              </>
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

      {isUrlModalOpen && (
        <div className="modal-overlay" onClick={() => !isFetchingUrl && setIsUrlModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>{t('ingestion.url_modal_title')}</h3>
              <button className="btn-icon" onClick={() => !isFetchingUrl && setIsUrlModalOpen(false)} disabled={isFetchingUrl}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                {t('ingestion.url_modal_subtitle')}
              </p>
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder={t('ingestion.url_placeholder')}
                disabled={isFetchingUrl}
                onKeyDown={(e) => { if (e.key === 'Enter' && !isFetchingUrl) handleFetchUrl(); }}
                style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
                autoFocus
              />
              {urlError && (
                <div className="error-alert" style={{ marginTop: '0.75rem' }}>
                  <AlertCircle size={16} />
                  <span>{urlError}</span>
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <button className="btn btn-ghost" onClick={() => setIsUrlModalOpen(false)} disabled={isFetchingUrl}>
                {t('common.cancel')}
              </button>
              <button className="btn btn-primary" onClick={handleFetchUrl} disabled={isFetchingUrl || !urlInput.trim()}>
                {isFetchingUrl ? t('ingestion.url_fetching') : t('ingestion.url_add')}
              </button>
            </div>
          </div>
        </div>
      )}
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
