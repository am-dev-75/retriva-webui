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

import React, { useState, useCallback, useEffect } from 'react';
import { Loader2, CheckCircle2, AlertCircle, Save, Sparkles } from 'lucide-react';
import { gatewayClient } from '../../../api/gateway-client';
import { useKnowledgeBase } from '../../../app/providers/KnowledgeBaseProvider';
import type { GlobalVarResponse } from '../../../api/types';
import './CrmAssistant.css';

/**
 * CRM Assistant page — ACP and CCO management.
 *
 * The ACP (Average Customer Profile) and CCO are deployment-global concepts
 * (not per-KB), presented in two tabs.  Candidate qualification is carried
 * out by users through the chat; this page intentionally has no
 * upload/qualification sections.
 */
type CrmTab = 'acp' | 'cco';

export const CrmAssistant: React.FC = () => {
  const { selectedKbIds } = useKnowledgeBase();
  const [activeTab, setActiveTab] = useState<CrmTab>('acp');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // ACP / CCO global variables
  const [acpText, setAcpText] = useState('');
  const [acpMeta, setAcpMeta] = useState<GlobalVarResponse | null>(null);
  const [ccoText, setCcoText] = useState('');
  const [ccoMeta, setCcoMeta] = useState<GlobalVarResponse | null>(null);
  const [acpSaving, setAcpSaving] = useState(false);
  const [ccoSaving, setCcoSaving] = useState(false);
  const [acpUpdating, setAcpUpdating] = useState(false);
  const [ccoUpdating, setCcoUpdating] = useState(false);

  const kbId = selectedKbIds.length > 0 ? selectedKbIds[0] : 'default';

  // Load ACP / CCO text (both are global; kbId is ignored by the backend).
  const loadGlobalVars = useCallback(async () => {
    try {
      const acp = await gatewayClient.crmGetAcpText(kbId);
      setAcpText(acp.content || '');
      setAcpMeta(acp);
    } catch {
      setAcpText('');
      setAcpMeta(null);
    }
    try {
      const cco = await gatewayClient.crmGetCcoText(kbId);
      setCcoText(cco.content || '');
      setCcoMeta(cco);
    } catch {
      setCcoText('');
      setCcoMeta(null);
    }
  }, [kbId]);

  useEffect(() => {
    loadGlobalVars();
  }, [loadGlobalVars]);

  const handleSaveAcp = useCallback(async () => {
    setAcpSaving(true);
    setError(null);
    try {
      const resp = await gatewayClient.crmSaveAcpText(kbId, acpText);
      setAcpMeta(resp);
      setInfo('ACP saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save ACP');
    } finally {
      setAcpSaving(false);
    }
  }, [kbId, acpText]);

  const handleUpdateAcp = useCallback(async () => {
    setAcpUpdating(true);
    setError(null);
    try {
      const resp = await gatewayClient.crmUpdateAcp(kbId);
      setAcpText(resp.content || '');
      setAcpMeta(resp);
      setInfo('ACP updated from KB.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update ACP from KB');
    } finally {
      setAcpUpdating(false);
    }
  }, [kbId]);

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
          Manage the Ideal Customer Profile and the Company Commercial Offering.
          Candidate qualification is carried out through the chat.
        </p>
      </header>

      <div className="crm-tabs" role="tablist">
        <button
          className={`crm-tab ${activeTab === 'acp' ? 'crm-tab-active' : ''}`}
          onClick={() => setActiveTab('acp')}
          role="tab"
          aria-selected={activeTab === 'acp'}
        >
          Average Customer Profile (ACP)
        </button>
        <button
          className={`crm-tab ${activeTab === 'cco' ? 'crm-tab-active' : ''}`}
          onClick={() => setActiveTab('cco')}
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
        <div className="crm-section crm-global-var" role="tabpanel">
          <div className="crm-global-var-header">
            <h2>Average Customer Profile (ACP)</h2>
            <div className="crm-global-var-actions">
              <button
                className="crm-btn-secondary"
                onClick={handleUpdateAcp}
                disabled={acpUpdating}
                title="Rebuild the ACP from all documents tagged 'type: dept_sales_potential_customer' (ACP reference organizations)"
              >
                {acpUpdating ? <Loader2 size={14} className="crm-icon-spin" /> : <Sparkles size={14} />}
                Update from KB
              </button>
              <button
                className="crm-btn-primary crm-btn-sm"
                onClick={handleSaveAcp}
                disabled={acpSaving}
              >
                {acpSaving ? <Loader2 size={14} className="crm-icon-spin" /> : <Save size={14} />}
                Save
              </button>
            </div>
          </div>
          {acpMeta?.updated_at && (
            <p className="crm-global-var-meta">
              Last updated: {new Date(acpMeta.updated_at).toLocaleString()} (source: {acpMeta.source})
            </p>
          )}
          <textarea
            className="crm-global-var-textarea"
            value={acpText}
            onChange={(e) => setAcpText(e.target.value)}
            placeholder="The ACP will appear here after update or manual entry. You can edit this text freely."
            rows={16}
          />
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