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

import React, { useCallback, useRef, useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle, Save, Sparkles } from 'lucide-react';
import { gatewayClient } from '../../../api/gateway-client';
import { useKnowledgeBase } from '../../../app/providers/KnowledgeBaseProvider';
import type { GlobalVarResponse } from '../../../api/types';
import { AcpEditor } from './AcpEditor';
import { UNSAVED_ACP_MESSAGE } from './useUnsavedChangesGuard';
import './CrmAssistant.css';

/**
 * CRM Assistant page — canonical ACP editor and CCO management.
 *
 * The ACP tab is the canonical tenant-scoped PostgreSQL workflow
 * (Slices A/B/C): it reads the canonical editor state and saves drafts;
 * it does not depend on the KB selection and never calls the legacy
 * per-KB free-text ACP endpoints.  The CCO tab remains the existing
 * KB-scoped free-text surface (unchanged in Slice C).
 */
type CrmTab = 'acp' | 'cco';

export const CrmAssistant: React.FC = () => {
  const { selectedKbIds } = useKnowledgeBase();
  const [activeTab, setActiveTab] = useState<CrmTab>('acp');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // CCO remains the KB-scoped free-text editor (unchanged).
  const [ccoText, setCcoText] = useState('');
  const [ccoMeta, setCcoMeta] = useState<GlobalVarResponse | null>(null);
  const [ccoSaving, setCcoSaving] = useState(false);
  const [ccoUpdating, setCcoUpdating] = useState(false);

  // The ACP tab reports its unsaved-edits state so switching tabs can
  // warn before discarding local edits.
  const acpDirtyRef = useRef(false);
  const handleAcpDirtyChange = useCallback((dirty: boolean) => {
    acpDirtyRef.current = dirty;
  }, []);

  const kbId = selectedKbIds.length > 0 ? selectedKbIds[0] : 'default';

  const switchTab = useCallback(
    (next: CrmTab) => {
      if (next === activeTab) return;
      if (acpDirtyRef.current && !window.confirm(UNSAVED_ACP_MESSAGE)) return;
      setActiveTab(next);
      setError(null);
      setInfo(null);
      if (next === 'cco') {
        void gatewayClient
          .crmGetCcoText(kbId)
          .then((cco) => {
            setCcoText(cco.content || '');
            setCcoMeta(cco);
          })
          .catch(() => {
            setCcoText('');
            setCcoMeta(null);
          });
      }
    },
    [activeTab, kbId]
  );

  const handleSaveCco = useCallback(async () => {
    setCcoSaving(true);
    setError(null);
    try {
      const resp = await gatewayClient.crmSaveCcoText(kbId, ccoText);
      setCcoMeta(resp);
      setInfo('CCO saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save CCO');
    } finally {
      setCcoSaving(false);
    }
  }, [kbId, ccoText]);

  const handleUpdateCco = useCallback(async () => {
    setCcoUpdating(true);
    setError(null);
    try {
      const resp = await gatewayClient.crmUpdateCco(kbId);
      setCcoText(resp.content || '');
      setCcoMeta(resp);
      setInfo('CCO updated from KB.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update CCO from KB');
    } finally {
      setCcoUpdating(false);
    }
  }, [kbId]);

  return (
    <div className="crm-assistant-page">
      <header className="crm-header">
        <h1>CRM Assistant</h1>
        <p className="crm-subtitle">
          Manage the Average Customer Profile (ACP) and the Company
          Commercial Offering (CCO). Candidate qualification is carried out
          through the chat.
        </p>
      </header>

      <div className="crm-tabs" role="tablist">
        <button
          className={`crm-tab ${activeTab === 'acp' ? 'crm-tab-active' : ''}`}
          onClick={() => switchTab('acp')}
          role="tab"
          aria-selected={activeTab === 'acp'}
        >
          Average Customer Profile (ACP)
        </button>
        <button
          className={`crm-tab ${activeTab === 'cco' ? 'crm-tab-active' : ''}`}
          onClick={() => switchTab('cco')}
          role="tab"
          aria-selected={activeTab === 'cco'}
        >
          Company Commercial Offering (CCO)
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

      {activeTab === 'acp' && (
        <div className="crm-section" role="tabpanel" aria-label="Average Customer Profile">
          <div className="crm-global-var-header">
            <h2>Average Customer Profile (ACP)</h2>
            <div className="crm-global-var-actions">
              <a
                className="crm-btn-secondary"
                href="/api/v2/crm/acp/cohorts/console"
                target="_blank"
                rel="noreferrer"
                title="ACP versions come from approved PostgreSQL cohorts (Spec 019). Open the cohort review console to propose, review, approve, generate, and activate."
              >
                <Sparkles size={14} />
                Cohort workflow
              </a>
            </div>
          </div>
          <AcpEditor onDirtyChange={handleAcpDirtyChange} />
        </div>
      )}

      {activeTab === 'cco' && (
        <div className="crm-section crm-global-var" role="tabpanel">
          <div className="crm-global-var-header">
            <h2>Company Commercial Offering (CCO)</h2>
            <div className="crm-global-var-actions">
              <button
                className="crm-btn-secondary"
                onClick={handleUpdateCco}
                disabled={ccoUpdating}
                title="Rebuild the CCO from all documents tagged 'type: dept_sales_offering'"
              >
                {ccoUpdating ? <Loader2 size={14} className="crm-icon-spin" /> : <Sparkles size={14} />}
                Update from KB
              </button>
              <button
                className="crm-btn-primary crm-btn-sm"
                onClick={handleSaveCco}
                disabled={ccoSaving}
              >
                {ccoSaving ? <Loader2 size={14} className="crm-icon-spin" /> : <Save size={14} />}
                Save
              </button>
            </div>
          </div>
          {ccoMeta?.updated_at && (
            <p className="crm-global-var-meta">
              Last updated: {new Date(ccoMeta.updated_at).toLocaleString()} (source: {ccoMeta.source})
            </p>
          )}
          <textarea
            className="crm-global-var-textarea"
            value={ccoText}
            onChange={(e) => setCcoText(e.target.value)}
            placeholder="The CCO will appear here after update or manual entry. You can edit this text freely."
            rows={16}
          />
        </div>
      )}
    </div>
  );
};
