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

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { gatewayClient } from '../../../api/gateway-client';
import { ConnectedSource, SourceRun } from '../../../api/types';
import { ArrowLeft, RefreshCw, Pause, Play, Trash2, AlertCircle } from 'lucide-react';
import { mapSourceStatus, getStatusBadgeClass } from '../utils/status-mapper';
import './SourceDetail.css';

interface SourceDetailProps {
  sourceId: string;
  onBack: () => void;
}

export const SourceDetail: React.FC<SourceDetailProps> = ({ sourceId, onBack }) => {
  const { t } = useTranslation();
  const [source, setSource] = useState<ConnectedSource | null>(null);
  const [runs, setRuns] = useState<SourceRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSourceDetails = async () => {
      try {
        const src = await gatewayClient.getSource(sourceId);
        setSource(src);
        const rns = await gatewayClient.getSourceRuns(sourceId);
        setRuns(rns);
        setError(null);
      } catch (err: unknown) {
        const error = err as Error;
        setError(error.message || 'Failed to load source details');
      } finally {
        setIsLoading(false);
      }
    };
    fetchSourceDetails();
    // In a real app, we might poll for updates if status is syncing
  }, [sourceId]);

  const handleAction = async (action: 'sync' | 'pause' | 'resume' | 'delete') => {
    try {
      switch (action) {
        case 'sync':
          await gatewayClient.syncSource(sourceId);
          break;
        case 'pause':
          await gatewayClient.pauseSource(sourceId);
          break;
        case 'resume':
          await gatewayClient.resumeSource(sourceId);
          break;
        case 'delete':
          if (confirm(t('ingestion.source_detail.confirm_delete'))) {
            await gatewayClient.deleteSource(sourceId);
            onBack();
            return;
          } else {
            return;
          }
      }
      
      const src = await gatewayClient.getSource(sourceId);
      setSource(src);
      const rns = await gatewayClient.getSourceRuns(sourceId);
      setRuns(rns);
      setError(null);
    } catch (err: unknown) {
      const error = err as Error;
      setError(`Action ${action} failed: ${error.message}`);
    }
  };

  if (isLoading) return <div className="loading-state">{t('ingestion.source_detail.loading')}</div>;
  if (!source) return <div className="error-alert">{t('ingestion.source_detail.not_found')}</div>;

  return (
    <div className="source-detail-container">
      <div className="detail-header">
        <button className="btn-icon" onClick={onBack}>
          <ArrowLeft size={20} />
          <span>{t('ingestion.source_detail.back')}</span>
        </button>
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => handleAction('sync')} disabled={getStatusBadgeClass(source.status) === 'syncing'}>
            <RefreshCw size={16} className={getStatusBadgeClass(source.status) === 'syncing' ? 'spinning' : ''} />
            {t('ingestion.source_detail.sync_now')}
          </button>
          {source.status === 'PAUSED' ? (
            <button className="btn-secondary" onClick={() => handleAction('resume')}>
              <Play size={16} /> {t('ingestion.source_detail.resume')}
            </button>
          ) : (
            <button className="btn-secondary" onClick={() => handleAction('pause')} disabled={getStatusBadgeClass(source.status) === 'syncing'}>
              <Pause size={16} /> {t('ingestion.source_detail.pause')}
            </button>
          )}
          <button className="btn-danger" onClick={() => handleAction('delete')}>
            <Trash2 size={16} /> {t('ingestion.source_detail.delete')}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-alert">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      <div className="detail-cards">
        <div className="detail-card">
          <h3>{t('ingestion.source_detail.overview')}</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">{t('ingestion.source_detail.name')}</span>
              <span className="value">{source.display_name}</span>
            </div>
            <div className="info-item">
              <span className="label">{t('ingestion.source_detail.type')}</span>
              <span className="value capitalize">{source.connector_type}</span>
            </div>
            <div className="info-item">
              <span className="label">{t('ingestion.sources.api_url')}</span>
              <span className="value">{source.api_url}</span>
            </div>
            <div className="info-item">
              <span className="label">{t('ingestion.sources.target_kb')}</span>
              <span className="value">{source.target_kb_id}</span>
            </div>
            <div className="info-item">
              <span className="label">{t('ingestion.sources.auth_mode')}</span>
              <span className="value">{source.auth_mode}</span>
            </div>
            <div className="info-item">
              <span className="label">{t('ingestion.sources.delete_policy')}</span>
              <span className="value">{source.delete_policy || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="label">{t('ingestion.sources.availability')}</span>
              <span className="value">{source.availability_policy || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="label">{t('ingestion.source_detail.categories')}</span>
              <span className="value">
                {source.include_categories?.length ? `Include: ${source.include_categories.join(', ')}` : ''} 
                {source.exclude_categories?.length ? ` | Exclude: ${source.exclude_categories.join(', ')}` : ''}
                {(!source.include_categories?.length && !source.exclude_categories?.length) ? t('ingestion.source_detail.never') : ''}
              </span>
            </div>
            <div className="info-item">
              <span className="label">{t('ingestion.sources.metadata')}</span>
              <pre className="value config-pre">{source.metadata ? JSON.stringify(source.metadata, null, 2) : t('ingestion.source_detail.never')}</pre>
            </div>
          </div>
        </div>

        <div className="detail-card">
          <h3>{t('ingestion.source_detail.lifecycle_status')}</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">{t('ingestion.sources.status')}</span>
              <span className={`source-status-badge ${getStatusBadgeClass(source.status)}`}>{mapSourceStatus(source.status)}</span>
            </div>
            <div className="info-item">
              <span className="label">{t('ingestion.sources.last_sync')}</span>
              <span className="value">{source.last_sync_at ? new Date(source.last_sync_at).toLocaleString() : t('ingestion.source_detail.never')}</span>
            </div>
            <div className="info-item">
              <span className="label">{t('ingestion.source_detail.next_sync')}</span>
              <span className="value">{source.next_sync_at ? new Date(source.next_sync_at).toLocaleString() : t('ingestion.source_detail.not_scheduled')}</span>
            </div>
            <div className="info-item">
              <span className="label">{t('ingestion.sources.sync_interval')}</span>
              <span className="value">
                {source.sync_interval_minutes ? t('ingestion.source_detail.every_minutes', { count: source.sync_interval_minutes }) : t('ingestion.source_detail.manual')}
              </span>
            </div>
            <div className="info-item">
              <span className="label">{t('ingestion.sources.indexed_items')}</span>
              <span className="value text-success">{source.indexed_item_count}</span>
            </div>
            <div className="info-item">
              <span className="label">{t('ingestion.sources.failed_items')}</span>
              <span className="value text-danger">{source.failed_item_count}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="runs-section">
        <h3>{t('ingestion.source_detail.run_history')}</h3>
        {runs.length === 0 ? (
          <div className="empty-state">{t('ingestion.source_detail.no_runs')}</div>
        ) : (
          <div className="table-responsive">
            <table className="sources-table">
              <thead>
                <tr>
                  <th>{t('ingestion.source_detail.col_status')}</th>
                  <th>{t('ingestion.source_detail.col_started_at')}</th>
                  <th>{t('ingestion.source_detail.col_completed_at')}</th>
                  <th>{t('ingestion.source_detail.col_processed')}</th>
                  <th>{t('ingestion.source_detail.col_failed')}</th>
                  <th>{t('ingestion.source_detail.col_error')}</th>
                </tr>
              </thead>
              <tbody>
                {runs.map(run => (
                  <tr key={run.id}>
                    <td>
                      <span className={`source-status-badge ${getStatusBadgeClass(run.status)}`}>{mapSourceStatus(run.status)}</span>
                    </td>
                    <td>{new Date(run.started_at).toLocaleString()}</td>
                    <td>{run.completed_at ? new Date(run.completed_at).toLocaleString() : '-'}</td>
                    <td>{run.items_processed}</td>
                    <td className={run.items_failed > 0 ? 'text-danger' : ''}>{run.items_failed}</td>
                    <td className="error-text">{run.error_message || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
