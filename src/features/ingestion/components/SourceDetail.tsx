import React, { useState, useEffect } from 'react';
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
          if (confirm('Are you sure you want to delete this source? This action cannot be undone.')) {
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

  if (isLoading) return <div className="loading-state">Loading source details...</div>;
  if (!source) return <div className="error-alert">Source not found.</div>;

  return (
    <div className="source-detail-container">
      <div className="detail-header">
        <button className="btn-icon" onClick={onBack}>
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => handleAction('sync')} disabled={getStatusBadgeClass(source.status) === 'syncing'}>
            <RefreshCw size={16} className={getStatusBadgeClass(source.status) === 'syncing' ? 'spinning' : ''} />
            Sync Now
          </button>
          {source.status === 'PAUSED' ? (
            <button className="btn-secondary" onClick={() => handleAction('resume')}>
              <Play size={16} /> Resume
            </button>
          ) : (
            <button className="btn-secondary" onClick={() => handleAction('pause')} disabled={getStatusBadgeClass(source.status) === 'syncing'}>
              <Pause size={16} /> Pause
            </button>
          )}
          <button className="btn-danger" onClick={() => handleAction('delete')}>
            <Trash2 size={16} /> Delete
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
          <h3>Overview</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">Name</span>
              <span className="value">{source.display_name}</span>
            </div>
            <div className="info-item">
              <span className="label">Type</span>
              <span className="value capitalize">{source.connector_type}</span>
            </div>
            <div className="info-item">
              <span className="label">API URL</span>
              <span className="value">{source.api_url}</span>
            </div>
            <div className="info-item">
              <span className="label">Target KB</span>
              <span className="value">{source.target_kb_id}</span>
            </div>
            <div className="info-item">
              <span className="label">Auth Mode</span>
              <span className="value">{source.auth_mode}</span>
            </div>
            <div className="info-item">
              <span className="label">Delete Policy</span>
              <span className="value">{source.delete_policy || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="label">Availability Policy</span>
              <span className="value">{source.availability_policy || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="label">Categories</span>
              <span className="value">
                {source.include_categories?.length ? `Include: ${source.include_categories.join(', ')}` : ''} 
                {source.exclude_categories?.length ? ` | Exclude: ${source.exclude_categories.join(', ')}` : ''}
                {(!source.include_categories?.length && !source.exclude_categories?.length) ? 'None' : ''}
              </span>
            </div>
            <div className="info-item">
              <span className="label">Metadata</span>
              <pre className="value config-pre">{source.metadata ? JSON.stringify(source.metadata, null, 2) : 'None'}</pre>
            </div>
          </div>
        </div>

        <div className="detail-card">
          <h3>Lifecycle Status</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">Status</span>
              <span className={`source-status-badge ${getStatusBadgeClass(source.status)}`}>{mapSourceStatus(source.status)}</span>
            </div>
            <div className="info-item">
              <span className="label">Last Sync</span>
              <span className="value">{source.last_sync_at ? new Date(source.last_sync_at).toLocaleString() : 'Never'}</span>
            </div>
            <div className="info-item">
              <span className="label">Next Sync</span>
              <span className="value">{source.next_sync_at ? new Date(source.next_sync_at).toLocaleString() : 'Not scheduled'}</span>
            </div>
            <div className="info-item">
              <span className="label">Sync Interval</span>
              <span className="value">
                {source.sync_interval_minutes ? `Every ${source.sync_interval_minutes} minutes` : 'Manual'}
              </span>
            </div>
            <div className="info-item">
              <span className="label">Indexed Items</span>
              <span className="value text-success">{source.indexed_item_count}</span>
            </div>
            <div className="info-item">
              <span className="label">Failed Items</span>
              <span className="value text-danger">{source.failed_item_count}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="runs-section">
        <h3>Run History</h3>
        {runs.length === 0 ? (
          <div className="empty-state">No runs recorded yet.</div>
        ) : (
          <div className="table-responsive">
            <table className="sources-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Started At</th>
                  <th>Completed At</th>
                  <th>Processed</th>
                  <th>Failed</th>
                  <th>Error</th>
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
