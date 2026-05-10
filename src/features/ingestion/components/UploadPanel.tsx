import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, Folder, X, File, CheckCircle, AlertCircle } from 'lucide-react';
import { MetadataEditor, MetadataField } from '../../metadata/components/MetadataEditor';
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
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [globalMetadata, setGlobalMetadata] = useState<MetadataField[]>([]);

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

  const handleUpload = () => {
    // Mock upload logic
    setPendingFiles((prev) => 
      prev.map(f => ({ ...f, status: 'uploading' }))
    );

    // Simulate progress
    pendingFiles.forEach((f, index) => {
      setTimeout(() => {
        setPendingFiles((prev) => 
          prev.map(p => p.id === f.id ? { ...p, status: 'completed', progress: 100 } : p)
        );
      }, (index + 1) * 1000);
    });
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
              <button className="btn btn-primary btn-sm" onClick={handleUpload}>
                {t('ingestion.upload_all')}
              </button>
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
