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

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, FileText, Download, Play, Loader2, CheckCircle2, AlertCircle, XCircle, RefreshCw } from 'lucide-react';
import { gatewayClient } from '../../../api/gateway-client';
import { useKnowledgeBase } from '../../../app/providers/KnowledgeBaseProvider';
import type { SessionAttachment, SessionArtifact, CrmJobStatus } from '../../../api/types';
import './CrmAssistant.css';

const SESSION_ID_KEY = 'retriva_crm_session_id';

function generateSessionId(): string {
  return `crm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const CrmAssistant: React.FC = () => {
  const { t } = useTranslation();
  const { selectedKbIds } = useKnowledgeBase();
  const [sessionId, setSessionId] = useState(() => {
    return sessionStorage.getItem(SESSION_ID_KEY) || generateSessionId();
  });
  const [attachments, setAttachments] = useState<SessionAttachment[]>([]);
  const [artifacts, setArtifacts] = useState<SessionArtifact[]>([]);
  const [uploading, setUploading] = useState(false);
  const [job, setJob] = useState<CrmJobStatus | null>(null);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const kbId = selectedKbIds.length > 0 ? selectedKbIds[0] : 'default';

  // Persist session ID.
  useEffect(() => {
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  }, [sessionId]);

  // Refresh attachments + artifacts.
  const refresh = useCallback(async () => {
    try {
      const atts = await gatewayClient.listSessionAttachments(sessionId);
      setAttachments(atts);
      const arts = await gatewayClient.listSessionArtifacts(sessionId);
      setArtifacts(arts);
    } catch {
      // ignore — may not exist yet
    }
  }, [sessionId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Poll job status.
  useEffect(() => {
    if (!polling || !job) return;
    const poll = async () => {
      try {
        const status = await gatewayClient.crmGetJob(job.job_id);
        setJob(status);
        if (['COMPLETED', 'COMPLETED_WITH_WARNINGS', 'FAILED', 'CANCELLED'].includes(status.state)) {
          setPolling(false);
          await refresh();
          if (status.state === 'COMPLETED' || status.state === 'COMPLETED_WITH_WARNINGS') {
            setInfo(`Qualification complete: ${status.candidate_count} candidates, ${status.result_count} results.`);
          }
          if (status.state === 'FAILED') {
            setError(status.error || 'Qualification failed.');
          }
        }
      } catch (e) {
        console.error('Job poll failed:', e);
      }
    };
    pollTimerRef.current = setTimeout(poll, 2000);
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [polling, job, refresh]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        await gatewayClient.uploadSessionAttachment(sessionId, file);
      }
      await refresh();
      setInfo(`${files.length} file(s) uploaded.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [sessionId, refresh]);

  const handleQualify = useCallback(async () => {
    if (attachments.length === 0) {
      setError('Please upload a candidate document first.');
      return;
    }
    const attachment = attachments[attachments.length - 1]; // latest
    setError(null);
    setInfo(null);
    setJob(null);
    setPolling(true);
    try {
      const resp = await gatewayClient.crmQualify(sessionId, attachment.attachment_id, kbId);
      const initial: CrmJobStatus = {
        job_id: resp.job_id,
        state: 'CREATED',
        progress: 0,
        stage_detail: '',
        candidate_count: 0,
        result_count: 0,
        artifact_ids: [],
        icp_id: null,
        icp_version: null,
        portfolio_id: null,
        portfolio_version: null,
        analysis_mode: null,
        error: null,
        warnings: [],
      };
      setJob(initial);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start qualification');
      setPolling(false);
    }
  }, [attachments, sessionId, kbId]);

  const handleDownload = useCallback(async (artifactId: string) => {
    try {
      const blob = await gatewayClient.downloadSessionArtifact(sessionId, artifactId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = artifactId;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed');
    }
  }, [sessionId]);

  const handleNewSession = useCallback(() => {
    const newId = generateSessionId();
    setSessionId(newId);
    setAttachments([]);
    setArtifacts([]);
    setJob(null);
    setError(null);
    setInfo(null);
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const stateIcon = (state: string) => {
    if (['COMPLETED', 'COMPLETED_WITH_WARNINGS'].includes(state)) return <CheckCircle2 size={16} className="crm-icon-ok" />;
    if (state === 'FAILED') return <XCircle size={16} className="crm-icon-err" />;
    if (state === 'CANCELLED') return <XCircle size={16} className="crm-icon-warn" />;
    return <Loader2 size={16} className="crm-icon-spin" />;
  };

  return (
    <div className="crm-assistant-page">
      <header className="crm-header">
        <h1>CRM Assistant</h1>
        <p className="crm-subtitle">Prospect Discovery & Qualification</p>
      </header>

      <div className="crm-session-bar">
        <span>Session: <code>{sessionId}</code></span>
        <span>KB: <strong>{kbId}</strong></span>
        <button className="crm-btn-secondary" onClick={handleNewSession} title="New session">
          <RefreshCw size={14} /> New Session
        </button>
      </div>

      {error && (
        <div className="crm-alert crm-alert-error">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {info && (
        <div className="crm-alert crm-alert-info">
          <CheckCircle2 size={16} /> {info}
        </div>
      )}

      <div className="crm-section">
        <h2>1. Upload Candidate Document</h2>
        <p>Upload a file containing candidate companies (XLSX, CSV, PDF, DOCX, Markdown, TXT).</p>
        <div className="crm-upload-area">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            disabled={uploading}
            accept=".xlsx,.csv,.pdf,.docx,.md,.markdown,.txt,.text,.html,.pptx,.odt,.ods,.odp"
            multiple
          />
          {uploading && <Loader2 size={16} className="crm-icon-spin" />}
        </div>
      </div>

      {attachments.length > 0 && (
        <div className="crm-section">
          <h2>2. Uploaded Attachments</h2>
          <table className="crm-table">
            <thead>
              <tr>
                <th>Filename</th>
                <th>Size</th>
                <th>Status</th>
                <th>Elements</th>
                <th>Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {attachments.map((att) => (
                <tr key={att.attachment_id}>
                  <td><FileText size={14} /> {att.original_filename}</td>
                  <td>{formatBytes(att.size)}</td>
                  <td>{stateIcon(att.status)} {att.status}</td>
                  <td>{att.parsed_element_count}</td>
                  <td>{new Date(att.upload_time).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="crm-section">
        <h2>3. Qualify Candidates</h2>
        <p>Run qualification against the ICP and Offering Portfolio from KB <strong>{kbId}</strong>.</p>
        <button
          className="crm-btn-primary"
          onClick={handleQualify}
          disabled={polling || attachments.length === 0}
        >
          {polling ? <Loader2 size={16} className="crm-icon-spin" /> : <Play size={16} />}
          {polling ? 'Running...' : 'Start Qualification'}
        </button>
      </div>

      {job && (
        <div className="crm-section crm-job-status">
          <h2>4. Job Status</h2>
          <div className="crm-job-grid">
            <div><strong>Job:</strong> <code>{job.job_id}</code></div>
            <div><strong>State:</strong> {stateIcon(job.state)} {job.state}</div>
            <div><strong>Progress:</strong> {(job.progress * 100).toFixed(0)}%</div>
            <div><strong>Stage:</strong> {job.stage_detail || '—'}</div>
            <div><strong>Candidates:</strong> {job.candidate_count}</div>
            <div><strong>Results:</strong> {job.result_count}</div>
            <div><strong>Analysis mode:</strong> {job.analysis_mode || '—'}</div>
            <div><strong>ICP:</strong> {job.icp_id ? `${job.icp_id} v${job.icp_version}` : '—'}</div>
            <div><strong>Portfolio:</strong> {job.portfolio_id ? `${job.portfolio_id} v${job.portfolio_version}` : '—'}</div>
          </div>
          {job.warnings.length > 0 && (
            <div className="crm-alert crm-alert-warn">
              {job.warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
            </div>
          )}
          {job.error && (
            <div className="crm-alert crm-alert-error">
              <AlertCircle size={16} /> {job.error}
            </div>
          )}
        </div>
      )}

      {artifacts.length > 0 && (
        <div className="crm-section">
          <h2>5. Download Results</h2>
          <table className="crm-table">
            <thead>
              <tr>
                <th>Filename</th>
                <th>Size</th>
                <th>Kind</th>
                <th>Created</th>
                <th>Download</th>
              </tr>
            </thead>
            <tbody>
              {artifacts.map((art) => (
                <tr key={art.artifact_id}>
                  <td><FileText size={14} /> {art.filename}</td>
                  <td>{formatBytes(art.size)}</td>
                  <td>{art.artifact_kind}</td>
                  <td>{new Date(art.created_at).toLocaleString()}</td>
                  <td>
                    <button className="crm-btn-download" onClick={() => handleDownload(art.artifact_id)}>
                      <Download size={14} /> Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};