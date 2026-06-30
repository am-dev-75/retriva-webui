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

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  RefreshCw, Layers, Clock, CheckCircle, AlertCircle, Loader,
  FileText, ChevronDown, Circle,
} from 'lucide-react';
import { gatewayClient } from '../../../api/gateway-client';
import { SystemStatusDetailResponse, JobSummary } from '../../../api/types';
import './StatusDashboard.css';

type FilterCategory = 'all' | 'enqueued' | 'processing' | 'completed' | 'failed';

const STATUS_TO_CATEGORY: Record<string, FilterCategory> = {
  pending: 'enqueued',
  running: 'processing',
  cancelling: 'processing',
  completed: 'completed',
  failed: 'failed',
  cancelled: 'failed',
};

const PIPELINE_STAGES = ['DETECTING', 'PREPROCESSING', 'PARSING', 'NORMALIZATION', 'CHUNKING', 'INDEXING'];

const formatDuration = (created: string, updated: string) => {
  try {
    const ms = new Date(updated).getTime() - new Date(created).getTime();
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  } catch {
    return '—';
  }
};

const formatTime = (iso: string) => {
  try {
    const d = new Date(iso);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${yyyy}${mm}${dd} ${hh}:${mi}:${ss}`;
  } catch { return iso; }
};

const getProgressPct = (job: JobSummary): number | null => {
  if (job.progress !== null && job.progress !== undefined) return job.progress;
  if (job.status === 'completed') return 100;
  if (job.status === 'failed' || job.status === 'cancelled') return 0;
  return null;
};

export const StatusPage: React.FC = () => {
  const { t } = useTranslation();
  const [detail, setDetail] = useState<SystemStatusDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const [expandedJobIds, setExpandedJobIds] = useState<Set<string>>(new Set());

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const data = await gatewayClient.getSystemStatusDetail();
      setDetail(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    let interval: any;
    if (autoRefresh) {
      interval = setInterval(() => { fetchStatus(); }, 3000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh, fetchStatus]);

  const filteredJobs = useMemo(() => {
    if (!detail) return [];
    const sorted = [...detail.job_list].sort((a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
    if (activeFilter === 'all') return sorted;
    return sorted.filter((j) => STATUS_TO_CATEGORY[j.status] === activeFilter);
  }, [detail, activeFilter]);

  const counts = detail?.jobs || { enqueued: 0, processing: 0, completed: 0, failed: 0 };

  const handleCardClick = (cat: FilterCategory) => {
    setActiveFilter((prev) => (prev === cat ? 'all' : cat));
  };

  const toggleJobExpanded = (jobId: string) => {
    setExpandedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  };

  const allExpanded = filteredJobs.length > 0 && filteredJobs.every((j) => expandedJobIds.has(j.job_id));

  const toggleExpandAll = () => {
    if (allExpanded) {
      setExpandedJobIds(new Set());
    } else {
      setExpandedJobIds(new Set(filteredJobs.map((j) => j.job_id)));
    }
  };

  return (
    <div className="dashboard-page">
      {/* Header */}
      <header className="dashboard-header">
        <div>
          <h1>{t('status_page.title', 'Operations Dashboard')}</h1>
          <p>{t('status_page.subtitle', 'Monitor ingestion jobs and system health')}</p>
        </div>
        <div className="dashboard-controls">
          {lastUpdated && (
            <span className="last-updated">
              {t('status_page.last_updated', 'Last updated')}: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <label className="auto-refresh-toggle">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            {t('status_page.auto_refresh', 'Auto-refresh')}
          </label>
          <button className="btn btn-ghost" onClick={fetchStatus} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spinning' : ''} />
            {t('status_page.refresh', 'Refresh')}
          </button>
        </div>
      </header>

      {error && (
        <div className="error-box" style={{ marginBottom: 'var(--spacing-md)' }}>
          {error}
        </div>
      )}

      {/* Stat Cards */}
      <div className="stat-cards-row">
        <div
          className={`stat-card staged ${activeFilter === 'all' ? 'active' : ''}`}
          onClick={() => handleCardClick('all')}
        >
          <div className="accent-bar" />
          <div className="stat-card-header">
            <Layers size={16} /> {t('status_page.staged_files', 'Staged Files')}
          </div>
          <div className="stat-card-value">{detail?.staged_files ?? 0}</div>
          <div className="stat-card-footer">awaiting ingestion</div>
        </div>

        <div
          className={`stat-card enqueued ${activeFilter === 'enqueued' ? 'active' : ''}`}
          onClick={() => handleCardClick('enqueued')}
        >
          <div className="accent-bar" />
          <div className="stat-card-header">
            <Clock size={16} /> {t('status_page.enqueued', 'Enqueued')}
          </div>
          <div className="stat-card-value">{counts.enqueued || 0}</div>
          <div className="stat-card-footer">in queue</div>
        </div>

        <div
          className={`stat-card processing ${activeFilter === 'processing' ? 'active' : ''}`}
          onClick={() => handleCardClick('processing')}
        >
          <div className="accent-bar" />
          <div className="stat-card-header">
            <Loader size={16} /> {t('status_page.processing', 'Processing')}
          </div>
          <div className="stat-card-value">{counts.processing || 0}</div>
          <div className="stat-card-footer">active jobs</div>
        </div>

        <div
          className={`stat-card completed ${activeFilter === 'completed' ? 'active' : ''}`}
          onClick={() => handleCardClick('completed')}
        >
          <div className="accent-bar" />
          <div className="stat-card-header">
            <CheckCircle size={16} /> {t('status_page.completed', 'Completed')}
          </div>
          <div className="stat-card-value">{counts.completed || 0}</div>
          <div className="stat-card-footer">successfully ingested</div>
        </div>

        <div
          className={`stat-card failed ${activeFilter === 'failed' ? 'active' : ''}`}
          onClick={() => handleCardClick('failed')}
        >
          <div className="accent-bar" />
          <div className="stat-card-header">
            <AlertCircle size={16} /> {t('status_page.failed', 'Failed')}
          </div>
          <div className="stat-card-value">{counts.failed || 0}</div>
          <div className="stat-card-footer">errors / cancelled</div>
        </div>
      </div>

      {/* Jobs Table Panel */}
      <div className="panel">
        <div className="panel-header">
          <h2>
            <FileText size={18} />
            {activeFilter === 'all'
              ? 'All Jobs'
              : `${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)} Jobs`}
            <span className="panel-count">({filteredJobs.length})</span>
          </h2>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
            {filteredJobs.length > 0 && (
              <button
                className="btn btn-ghost"
                style={{ fontSize: '0.8125rem', padding: '4px 12px' }}
                onClick={toggleExpandAll}
              >
                <ChevronDown size={14} style={{ transform: allExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                {allExpanded ? 'Collapse all' : 'Expand all'}
              </button>
            )}
            {activeFilter !== 'all' && (
              <button
                className="btn btn-ghost"
                style={{ fontSize: '0.8125rem', padding: '4px 12px' }}
                onClick={() => setActiveFilter('all')}
              >
                Clear filter
              </button>
            )}
          </div>
        </div>
        <div className="panel-body">
          {loading && !detail ? (
            <div className="dashboard-loading">
              <Loader size={20} className="spinning" /> Loading jobs...
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="empty-state">
              No jobs {activeFilter !== 'all' ? `in "${activeFilter}" state` : ''}.
            </div>
          ) : (
            <table className="jobs-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}></th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Stage</th>
                  <th>Progress</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((job) => {
                  const pct = getProgressPct(job);
                  const isExpanded = expandedJobIds.has(job.job_id);
                  return (
                    <React.Fragment key={job.job_id}>
                      <tr
                        className={isExpanded ? 'row-expanded' : ''}
                        onClick={() => toggleJobExpanded(job.job_id)}
                      >
                        <td className="expand-cell">
                          <button
                            className={`expand-btn ${isExpanded ? 'active' : ''}`}
                            onClick={(e) => { e.stopPropagation(); toggleJobExpanded(job.job_id); }}
                            title={isExpanded ? 'Hide details' : 'Show details'}
                          >
                            <ChevronDown size={18} />
                          </button>
                        </td>
                        <td>
                          <div className="job-source">{job.source.split('/').pop() || job.source}</div>
                          <div className="job-id">{job.job_id.substring(0, 12)}…</div>
                        </td>
                        <td>
                          <span className={`job-status-badge ${job.status}`}>
                            {job.status === 'running' && <Loader size={11} className="spinning" />}
                            {job.status === 'completed' && <CheckCircle size={11} />}
                            {job.status === 'failed' && <AlertCircle size={11} />}
                            {job.status}
                          </span>
                        </td>
                        <td>
                          {job.current_stage || '—'}
                          {job.stage_detail && (
                            <div className="stage-detail">{job.stage_detail}</div>
                          )}
                        </td>
                        <td style={{ minWidth: '120px' }}>
                          {pct !== null ? (
                            <div className="stage-progress">
                              <div className="stage-progress-bar">
                                <div
                                  className={`stage-progress-fill ${job.status === 'completed' ? 'completed' : job.status === 'failed' ? 'failed' : ''}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="stage-progress-label">{pct}%</span>
                            </div>
                          ) : (
                            <span className="stage-detail">—</span>
                          )}
                        </td>
                        <td style={{ whiteSpace: 'nowrap', color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
                          {formatTime(job.updated_at)}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="expansion-row">
                          <td colSpan={6}>
                            <div className="expansion-content">
                              {/* Pipeline Stage Tracker */}
                              <div className="detail-section">
                                <h3>Pipeline Progress</h3>
                                <div className="pipeline-tracker">
                                  {PIPELINE_STAGES.map((stage, idx) => {
                                    const isDone = job.stages_completed.includes(stage);
                                    const isCurrent = job.current_stage === stage;
                                    return (
                                      <React.Fragment key={stage}>
                                        {idx > 0 && (
                                          <div className={`pipeline-connector ${isDone ? 'done' : ''}`} />
                                        )}
                                        <div className={`pipeline-step ${isDone ? 'done' : isCurrent ? 'current' : 'pending'}`}>
                                          <span className="step-icon">
                                            {isDone ? <CheckCircle size={14} /> : isCurrent ? <Loader size={14} className="spinning" /> : <Circle size={14} />}
                                          </span>
                                          {stage}
                                        </div>
                                      </React.Fragment>
                                    );
                                  })}
                                </div>
                                {job.stage_detail && (
                                  <div className="stage-detail" style={{ marginTop: 'var(--spacing-sm)' }}>
                                    {job.stage_detail}
                                  </div>
                                )}
                                {job.progress !== null && job.progress !== undefined && (
                                  <div style={{ marginTop: 'var(--spacing-sm)' }}>
                                    <div className="stage-progress">
                                      <div className="stage-progress-bar">
                                        <div
                                          className={`stage-progress-fill ${job.status === 'completed' ? 'completed' : job.status === 'failed' ? 'failed' : ''}`}
                                          style={{ width: `${job.progress}%` }}
                                        />
                                      </div>
                                      <span className="stage-progress-label">{job.progress}%</span>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Details Grid */}
                              <div className="detail-grid" style={{ marginTop: 'var(--spacing-lg)' }}>
                                <div className="detail-item">
                                  <span className="label">Job ID</span>
                                  <span className="value mono">{job.job_id}</span>
                                </div>
                                <div className="detail-item">
                                  <span className="label">Job Type</span>
                                  <span className="value mono">{job.job_type}</span>
                                </div>
                                <div className="detail-item">
                                  <span className="label">Source URI</span>
                                  <span className="value mono">{job.source}</span>
                                </div>
                                <div className="detail-item">
                                  <span className="label">Stages Done</span>
                                  <span className="value">{job.stages_completed.length} / {PIPELINE_STAGES.length}</span>
                                </div>
                                <div className="detail-item">
                                  <span className="label">Created</span>
                                  <span className="value">{formatTime(job.created_at)}</span>
                                </div>
                                <div className="detail-item">
                                  <span className="label">Updated</span>
                                  <span className="value">{formatTime(job.updated_at)}</span>
                                </div>
                                <div className="detail-item">
                                  <span className="label">Duration</span>
                                  <span className="value">{formatDuration(job.created_at, job.updated_at)}</span>
                                </div>
                              </div>

                              {/* Error */}
                              {job.error && (
                                <div className="detail-section" style={{ marginTop: 'var(--spacing-lg)' }}>
                                  <h3>Error</h3>
                                  <div className="error-box">{job.error}</div>
                                </div>
                              )}

                              {/* Completed Stages */}
                              {job.stages_completed.length > 0 && (
                                <div className="detail-section" style={{ marginTop: 'var(--spacing-lg)' }}>
                                  <h3>Completed Stages</h3>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-xs)' }}>
                                    {job.stages_completed.map((s) => (
                                      <span key={s} className="job-status-badge completed">
                                        <CheckCircle size={12} /> {s}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
