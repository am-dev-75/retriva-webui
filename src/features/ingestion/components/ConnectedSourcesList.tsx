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
import { gatewayClient } from '../../../api/gateway-client';
import { ConnectedSource } from '../../../api/types';
import { AddSourceWizard } from './AddSourceWizard';
import { RefreshCw, AlertCircle, ChevronDown, CheckCircle, Clock } from 'lucide-react';
import { mapSourceStatus, getStatusBadgeClass } from '../utils/status-mapper';
import { formatDateTime } from '../../../lib/formatting';
import './ConnectedSourcesList.css';

export const ConnectedSourcesList: React.FC = () => {
  const [sources, setSources] = useState<ConnectedSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [view, setView] = useState<'list' | 'add' | 'detail'>('list');
  const [expandedSourceIds, setExpandedSourceIds] = useState<Set<string>>(new Set());

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

  const toggleSourceExpanded = (sourceId: string) => {
    setExpandedSourceIds((prev) => {
      const next = new Set(prev);
      if (next.has(sourceId)) {
        next.delete(sourceId);
      } else {
        next.add(sourceId);
      }
      return next;
    });
  };

  if (view === 'add') {
    return <AddSourceWizard onComplete={() => setView('list')} onCancel={() => setView('list')} />;
  }

  return (
    <div className="sources-list-container">
      <div className="sources-list-header">
        <h2>Dynamic Ingestion</h2>
        <div className="sources-actions">
          <button className="btn-secondary" onClick={fetchSources} disabled={isLoading}>
            <RefreshCw size={16} className={isLoading ? 'spinning' : ''} />
            Refresh
          </button>
          {/* Add Source button — disabled for now; will be re-enabled when
              the source creation wizard supports the full connector lifecycle.
          <button className="btn-primary" onClick={() => setView('add')}>
            <Plus size={16} />
            Add Source
          </button>
          */}
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
          <p>No connected sources configured.</p>
          <p className="empty-state-hint">
            Sources are created automatically when a MediaWiki connector
            registers with the Gateway. Ensure the connector is running and
            configured correctly.
          </p>
        </div>
      ) : (
        <div className="sources-card-list">
          {sources.map(source => {
            const isExpanded = expandedSourceIds.has(source.id);
            return (
              <div
                key={source.id}
                className={`source-card ${isExpanded ? 'expanded' : ''}`}
                onClick={() => toggleSourceExpanded(source.id)}
              >
                {/* Summary row */}
                <div className="source-card-summary">
                  <button
                    className={`expand-btn ${isExpanded ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); toggleSourceExpanded(source.id); }}
                    title={isExpanded ? 'Hide details' : 'Show details'}
                  >
                    <ChevronDown size={18} />
                  </button>
                  <div className="source-card-name">
                    <span className="source-display-name">{source.display_name}</span>
                    <span className="source-id">{source.id}</span>
                  </div>
                  <div className="source-card-type">
                    <span className="capitalize">{source.connector_type}</span>
                  </div>
                  <div className="source-card-status">
                    <span className={`source-status-badge ${getStatusBadgeClass(source.status)}`}>
                      {mapSourceStatus(source.status)}
                    </span>
                  </div>
                  <div className="source-card-stats">
                    <span className="stat-item" title="Indexed items">
                      <CheckCircle size={14} />
                      {source.indexed_item_count}
                    </span>
                    <span className="stat-item" title="Failed items">
                      <AlertCircle size={14} />
                      {source.failed_item_count}
                    </span>
                  </div>
                  <div className="source-card-sync">
                    {source.last_sync_at ? (
                      <span title="Last sync">
                        <Clock size={14} />
                        {formatDateTime(source.last_sync_at)}
                      </span>
                    ) : (
                      <span className="text-muted">Never synced</span>
                    )}
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="source-card-details">
                    <div className="detail-grid">
                      <div className="detail-item">
                        <span className="label">Source ID</span>
                        <span className="value mono">{source.id}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Connector Type</span>
                        <span className="value mono">{source.connector_type}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Target KB</span>
                        <span className="value mono">{source.target_kb_id}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Status</span>
                        <span className="value">{mapSourceStatus(source.status)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">API URL</span>
                        <span className="value mono">{source.api_url}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Auth Mode</span>
                        <span className="value">{source.auth_mode}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Sync Interval</span>
                        <span className="value">{source.sync_interval_minutes ? `${source.sync_interval_minutes} min` : '—'}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Delete Policy</span>
                        <span className="value">{source.delete_policy || '—'}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Availability</span>
                        <span className="value">{source.availability_policy || '—'}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Allowed Namespaces</span>
                        <span className="value">{source.allowed_namespaces?.join(', ') || '—'}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Indexed Items</span>
                        <span className="value">{source.indexed_item_count}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Failed Items</span>
                        <span className="value">{source.failed_item_count}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Created</span>
                        <span className="value">{source.created_at ? formatDateTime(source.created_at) : '—'}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Updated</span>
                        <span className="value">{source.updated_at ? formatDateTime(source.updated_at) : '—'}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Last Sync</span>
                        <span className="value">{source.last_sync_at ? formatDateTime(source.last_sync_at) : 'Never'}</span>
                      </div>
                    </div>

                    {source.include_categories && source.include_categories.length > 0 && (
                      <div className="detail-section">
                        <h4>Include Categories</h4>
                        <div className="tag-list">
                          {source.include_categories.map(cat => (
                            <span key={cat} className="tag-badge">{cat}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {source.exclude_categories && source.exclude_categories.length > 0 && (
                      <div className="detail-section">
                        <h4>Exclude Categories</h4>
                        <div className="tag-list">
                          {source.exclude_categories.map(cat => (
                            <span key={cat} className="tag-badge">{cat}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {source.metadata && Object.keys(source.metadata).length > 0 && (
                      <div className="detail-section">
                        <h4>Metadata</h4>
                        <div className="detail-grid">
                          {Object.entries(source.metadata).map(([k, v]) => (
                            <div key={k} className="detail-item">
                              <span className="label">{k}</span>
                              <span className="value mono">{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
