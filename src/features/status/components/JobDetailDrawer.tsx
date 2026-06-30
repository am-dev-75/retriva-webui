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

import React from 'react';
import { X, CheckCircle, Circle, Loader, AlertCircle, Clock } from 'lucide-react';
import { JobSummary } from '../../../api/types';
import './StatusDashboard.css';

const PIPELINE_STAGES = ['DETECTING', 'PREPROCESSING', 'PARSING', 'NORMALIZATION', 'CHUNKING', 'INDEXING'];

interface JobDetailDrawerProps {
  job: JobSummary | null;
  onClose: () => void;
}

export const JobDetailDrawer: React.FC<JobDetailDrawerProps> = ({ job, onClose }) => {
  if (!job) return null;

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
    } catch {
      return iso;
    }
  };

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

  return (
    <>
      <div className="job-detail-overlay" onClick={onClose} />
      <div className="job-detail-drawer" role="dialog" aria-modal="true">
        <div className="drawer-header">
          <div>
            <h2>{job.source.split('/').pop() || job.source}</h2>
            <div className="drawer-subtitle">{job.job_id}</div>
          </div>
          <button className="drawer-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="drawer-body">
          {/* Status & Progress */}
          <div className="detail-section">
            <h3>Status</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="label">State</span>
                <span className={`job-status-badge ${job.status}`}>
                  {job.status === 'running' && <Loader size={12} className="spinning" />}
                  {job.status === 'completed' && <CheckCircle size={12} />}
                  {job.status === 'failed' && <AlertCircle size={12} />}
                  {(job.status === 'pending' || job.status === 'enqueued') && <Clock size={12} />}
                  {job.status}
                </span>
              </div>
              <div className="detail-item">
                <span className="label">Job Type</span>
                <span className="value mono">{job.job_type}</span>
              </div>
            </div>
          </div>

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
              <div className="stage-detail" style={{ padding: '0 var(--spacing-md)' }}>
                {job.stage_detail}
              </div>
            )}
            {job.progress !== null && job.progress !== undefined && (
              <div style={{ padding: '0 var(--spacing-md)', marginTop: 'var(--spacing-sm)' }}>
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

          {/* Source */}
          <div className="detail-section">
            <h3>Source</h3>
            <div className="detail-grid">
              <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                <span className="label">Source URI</span>
                <span className="value mono">{job.source}</span>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="detail-section">
            <h3>Timing</h3>
            <div className="detail-grid">
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
              <div className="detail-item">
                <span className="label">Stages Done</span>
                <span className="value">{job.stages_completed.length} / {PIPELINE_STAGES.length}</span>
              </div>
            </div>
          </div>

          {/* Error */}
          {job.error && (
            <div className="detail-section">
              <h3>Error</h3>
              <div className="error-box">{job.error}</div>
            </div>
          )}

          {/* Completed Stages List */}
          {job.stages_completed.length > 0 && (
            <div className="detail-section">
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
      </div>
    </>
  );
};
