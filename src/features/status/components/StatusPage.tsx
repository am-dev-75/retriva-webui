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
  FileText, ChevronRight,
} from 'lucide-react';
import { gatewayClient } from '../../../api/gateway-client';
import { SystemStatusDetailResponse, JobSummary } from '../../../api/types';
import { JobDetailDrawer } from './JobDetailDrawer';
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

export const StatusPage: React.FC = () => {
  const { t } = useTranslation();
  const [detail, setDetail] = useState<SystemStatusDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const [selectedJob, setSelectedJob] = useState<JobSummary | null>(null);

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

  // Keep selected job updated with latest data
  useEffect(() => {
    if (selectedJob && detail) {
      const updated = detail.job_list.find((j) => j.job_id === selectedJob.job_id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedJob)) {
        setSelectedJob(updated);
      }
    }
  }, [detail, selectedJob]);

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

  const formatTime = (iso: string) => {
    try { return new Date(iso).toLocaleTimeString(); } catch { return iso; }
  };

  const getProgressPct = (job: JobSummary): number | null => {
    if (job.progress !== null && job.progress !== undefined) return job.progress;
    if (job.status === 'completed') return 100;
    if (job.status === 'failed' || job.status === 'cancelled') return 0;
    return null;
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
                  <th>Source</th>
                  <th>Status</th>
                  <th>Stage</th>
                  <th>Progress</th>
                  <th>Updated</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((job) => {
                  const pct = getProgressPct(job);
                  return (
                    <tr key={job.job_id} onClick={() => setSelectedJob(job)}>
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
                      <td>
                        <ChevronRight size={16} color="var(--color-text-muted)" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Job Detail Drawer */}
      <JobDetailDrawer job={selectedJob} onClose={() => setSelectedJob(null)} />
    </div>
  );
};
