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

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, FileText, Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { SessionArtifact } from '../../../api/types';
import { gatewayClient } from '../../../api/gateway-client';
import { formatDate } from '../../../lib/formatting';
import './Artifacts.css';

/**
 * Real artifact browser: lists every session artifact (qualification
 * reports, extractions, ...) across all sessions, most recent first, and
 * downloads them via the authenticated artifact content endpoint.
 */
export const ArtifactList: React.FC = () => {
  const { t } = useTranslation();
  const [artifacts, setArtifacts] = useState<SessionArtifact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await gatewayClient.listAllSessionArtifacts();
      setArtifacts(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load artifacts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDownload = async (art: SessionArtifact) => {
    setDownloadingId(art.artifact_id);
    try {
      const blob = await gatewayClient.downloadSessionArtifact(
        art.session_id,
        art.artifact_id
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = art.filename || art.artifact_id;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloadingId(null);
    }
  };

  const typeLabel = (art: SessionArtifact) => {
    const mt = (art.media_type || '').toLowerCase();
    if (mt.includes('sheet') || art.filename?.endsWith('.xlsx')) return 'xlsx';
    if (mt.includes('markdown') || art.filename?.endsWith('.md')) return 'markdown';
    if (mt.includes('pdf')) return 'pdf';
    if (mt.includes('html')) return 'html';
    return mt.split('/')[1] || 'file';
  };

  const statusIcon = (art: SessionArtifact) => {
    if (art.status === 'ready') return <CheckCircle size={18} className="text-success" />;
    if (art.status === 'pending' || art.status === 'processing')
      return <Clock size={18} className="text-warning" />;
    return <AlertCircle size={18} className="text-danger" />;
  };

  return (
    <div className="artifacts-container">
      <header className="page-header">
        <div>
          <h1>{t('artifacts.title')}</h1>
          <p className="page-subtitle">{t('artifacts.subtitle')}</p>
        </div>
        <button
          className="btn btn-ghost btn-icon"
          onClick={load}
          disabled={isLoading}
          title={t('artifacts.refresh')}
        >
          <RefreshCw size={18} className={isLoading ? 'spin' : ''} />
        </button>
      </header>

      {error && <div className="artifacts-error">{error}</div>}

      <div className="artifacts-grid">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => <div key={i} className="artifact-card skeleton" />)
        ) : artifacts.length === 0 ? (
          <div className="empty-state">{t('artifacts.empty_state')}</div>
        ) : (
          artifacts.map((art) => (
            <div key={art.artifact_id} className="artifact-card">
              <div className="artifact-icon">
                <FileText size={24} />
              </div>
              <div className="artifact-info">
                <h3>{art.filename}</h3>
                <div className="artifact-meta">
                  <span className="artifact-type">{typeLabel(art).toUpperCase()}</span>
                  <span className="dot">•</span>
                  <span className="artifact-date">{formatDate(art.created_at)}</span>
                  {art.artifact_kind && (
                    <>
                      <span className="dot">•</span>
                      <span className="artifact-kind">{art.artifact_kind}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="artifact-status">
                {statusIcon(art)}
              </div>
              <div className="artifact-actions">
                <button
                  className="btn btn-ghost btn-icon"
                  onClick={() => handleDownload(art)}
                  disabled={art.status !== 'ready' || downloadingId === art.artifact_id}
                  title={t('artifacts.download')}
                >
                  <Download size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
