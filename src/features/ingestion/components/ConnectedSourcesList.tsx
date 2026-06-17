import React, { useState, useEffect } from 'react';
import { gatewayClient } from '../../../api/gateway-client';
import { ConnectedSource } from '../../../api/types';
import { AddSourceWizard } from './AddSourceWizard';
import { SourceDetail } from './SourceDetail';
import { Plus, RefreshCw, AlertCircle } from 'lucide-react';
import { mapSourceStatus, getStatusBadgeClass } from '../utils/status-mapper';
import './ConnectedSourcesList.css';

export const ConnectedSourcesList: React.FC = () => {
  const [sources, setSources] = useState<ConnectedSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [view, setView] = useState<'list' | 'add' | 'detail'>('list');
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);

  const fetchSources = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await gatewayClient.getSources();
      setSources(data);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Failed to fetch sources');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'list') {
      fetchSources();
    }
  }, [view]);

  if (view === 'add') {
    return <AddSourceWizard onComplete={() => setView('list')} onCancel={() => setView('list')} />;
  }

  if (view === 'detail' && selectedSourceId) {
    return <SourceDetail sourceId={selectedSourceId} onBack={() => setView('list')} />;
  }

  return (
    <div className="sources-list-container">
      <div className="sources-list-header">
        <h2>Connected Sources</h2>
        <div className="sources-actions">
          <button className="btn-secondary" onClick={fetchSources} disabled={isLoading}>
            <RefreshCw size={16} className={isLoading ? 'spinning' : ''} />
            Refresh
          </button>
          <button className="btn-primary" onClick={() => setView('add')}>
            <Plus size={16} />
            Add Source
          </button>
        </div>
      </div>

      {error && (
        <div className="error-alert">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="loading-state">Loading sources...</div>
      ) : sources.length === 0 ? (
        <div className="empty-state">
          <p>No connected sources configured yet.</p>
          <button className="btn-primary" onClick={() => setView('add')}>
            Configure your first source
          </button>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="sources-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Status</th>
                <th>Target KB</th>
                <th>Items (Indexed / Failed)</th>
                <th>Last Sync</th>
              </tr>
            </thead>
            <tbody>
              {sources.map(source => (
                <tr key={source.id} onClick={() => {
                  setSelectedSourceId(source.id);
                  setView('detail');
                }}>
                  <td>{source.display_name}</td>
                  <td className="capitalize">{source.connector_type}</td>
                  <td>
                    <span className={`source-status-badge ${getStatusBadgeClass(source.status)}`}>
                      {mapSourceStatus(source.status)}
                    </span>
                  </td>
                  <td>{source.target_kb_id}</td>
                  <td>{source.indexed_item_count} / {source.failed_item_count}</td>
                  <td>{source.last_sync_at ? new Date(source.last_sync_at).toLocaleString() : 'Never'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
