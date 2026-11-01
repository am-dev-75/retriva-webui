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

import React, { useCallback, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  Loader2,
  Pencil,
  RotateCcw,
  Save,
  Sparkles,
} from 'lucide-react';
import { gatewayClient } from '../../../api/gateway-client';
import { useKnowledgeBase } from '../../../app/providers/KnowledgeBaseProvider';
import type {
  GlobalVarResponse,
  QualificationSettings,
  QualificationSettingsInput,
} from '../../../api/types';
import { AcpEditor } from './AcpEditor';
import { AcpMarkdownPreview } from './AcpMarkdownPreview';
import {
  UNSAVED_ACP_MESSAGE,
  useUnsavedChangesGuard,
} from './useUnsavedChangesGuard';
import './CrmAssistant.css';

type CrmTab = 'settings' | 'acp' | 'icp' | 'cco';
type EditorMode = 'edit' | 'preview';

const DEFAULT_SETTINGS: QualificationSettingsInput = {
  acp_weight: '0.2',
  icp_weight: '0.4',
  cco_weight: '0.4',
  credit_threshold: '0.6',
};

const UNSAVED_GENERIC_MESSAGE =
  'You have unsaved CRM Assistant changes. Continuing will discard them.';

function defaultSettings(): QualificationSettingsInput {
  return { ...DEFAULT_SETTINGS };
}

function pickSettings(
  response: QualificationSettings
): QualificationSettingsInput {
  return {
    acp_weight: response.acp_weight,
    icp_weight: response.icp_weight,
    cco_weight: response.cco_weight,
    credit_threshold: response.credit_threshold,
  };
}

function sameSettings(
  left: QualificationSettingsInput,
  right: QualificationSettingsInput
): boolean {
  return (
    left.acp_weight === right.acp_weight &&
    left.icp_weight === right.icp_weight &&
    left.cco_weight === right.cco_weight &&
    left.credit_threshold === right.credit_threshold
  );
}

function numericSetting(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatTimestamp(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toLocaleString();
}

/**
 * CRM Assistant page.
 *
 * The ACP tab remains the canonical tenant-scoped PostgreSQL workflow.
 * The new Settings, ICP, and CCO tabs manage the user-provided
 * qualification coefficients, the user-authored Ideal Customer Profile,
 * and the Company Commercial Offering. ICP and CCO Markdown use the
 * same hardened, read-only preview as ACP.
 */
export const CrmAssistant: React.FC = () => {
  const { selectedKbIds } = useKnowledgeBase();
  const [activeTab, setActiveTab] = useState<CrmTab>('acp');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [acpDirty, setAcpDirty] = useState(false);
  const handleAcpDirtyChange = useCallback((dirty: boolean) => {
    setAcpDirty(dirty);
  }, []);

  // Qualification coefficients.
  const [settings, setSettings] =
    useState<QualificationSettingsInput>(defaultSettings);
  const [settingsBaseline, setSettingsBaseline] =
    useState<QualificationSettingsInput>(defaultSettings);
  const [settingsMeta, setSettingsMeta] =
    useState<QualificationSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // User-authored ICP.
  const [icpText, setIcpText] = useState('');
  const [icpBaseline, setIcpBaseline] = useState('');
  const [icpMeta, setIcpMeta] = useState<GlobalVarResponse | null>(null);
  const [icpLoading, setIcpLoading] = useState(false);
  const [icpSaving, setIcpSaving] = useState(false);
  const [icpMode, setIcpMode] = useState<EditorMode>('edit');

  // CCO remains the existing global free-text editor, now with Markdown.
  const [ccoText, setCcoText] = useState('');
  const [ccoBaseline, setCcoBaseline] = useState('');
  const [ccoMeta, setCcoMeta] = useState<GlobalVarResponse | null>(null);
  const [ccoSaving, setCcoSaving] = useState(false);
  const [ccoUpdating, setCcoUpdating] = useState(false);
  const [ccoMode, setCcoMode] = useState<EditorMode>('edit');

  const kbId = selectedKbIds.length > 0 ? selectedKbIds[0] : 'default';

  const settingsDirty = !sameSettings(settings, settingsBaseline);
  const icpDirty = icpText !== icpBaseline;
  const ccoDirty = ccoText !== ccoBaseline;
  const activeDirty =
    activeTab === 'acp'
      ? acpDirty
      : activeTab === 'settings'
        ? settingsDirty
        : activeTab === 'icp'
          ? icpDirty
          : ccoDirty;

  useUnsavedChangesGuard(
    activeTab !== 'acp' && activeDirty,
    UNSAVED_GENERIC_MESSAGE
  );

  const settingsValidation = useMemo(() => {
    const weights = [
      numericSetting(settings.acp_weight),
      numericSetting(settings.icp_weight),
      numericSetting(settings.cco_weight),
    ];
    const credit = numericSetting(settings.credit_threshold);
    const numericValid = weights.every(
      (value) => value !== null && value >= 0 && value <= 1
    );
    const creditValid =
      credit !== null && credit >= 0 && credit <= 1;
    const total = weights.reduce<number>(
      (sum, value) => sum + (value ?? 0),
      0
    );
    const sumValid = numericValid && Math.abs(total - 1) < 1e-9;
    let message: string | null = null;
    if (!numericValid) {
      message = 'Each weight must be a number between 0 and 1.';
    } else if (!sumValid) {
      message = `ACP, ICP and CCO weights must sum to 1 (currently ${total.toFixed(3)}).`;
    } else if (!creditValid) {
      message = 'Credit threshold must be a number between 0 and 1.';
    }
    return {
      valid: numericValid && sumValid && creditValid,
      total,
      message,
    };
  }, [settings]);

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    setError(null);
    try {
      const response = await gatewayClient.crmGetQualificationSettings();
      const next = pickSettings(response);
      setSettings(next);
      setSettingsBaseline(next);
      setSettingsMeta(response);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Failed to load qualification settings'
      );
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  const loadIcp = useCallback(async () => {
    setIcpLoading(true);
    setError(null);
    try {
      const response = await gatewayClient.crmGetIcpText(kbId);
      setIcpText(response.content || '');
      setIcpBaseline(response.content || '');
      setIcpMeta(response);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load ICP');
    } finally {
      setIcpLoading(false);
    }
  }, [kbId]);

  const loadCco = useCallback(async () => {
    setError(null);
    try {
      const response = await gatewayClient.crmGetCcoText(kbId);
      setCcoText(response.content || '');
      setCcoBaseline(response.content || '');
      setCcoMeta(response);
    } catch {
      setCcoText('');
      setCcoBaseline('');
      setCcoMeta(null);
    }
  }, [kbId]);

  const switchTab = useCallback(
    (next: CrmTab) => {
      if (next === activeTab) return;
      if (
        activeDirty &&
        !window.confirm(
          activeTab === 'acp' ? UNSAVED_ACP_MESSAGE : UNSAVED_GENERIC_MESSAGE
        )
      ) {
        return;
      }
      setActiveTab(next);
      setError(null);
      setInfo(null);
      if (next === 'settings') void loadSettings();
      if (next === 'icp') void loadIcp();
      if (next === 'cco') void loadCco();
    },
    [activeDirty, activeTab, loadCco, loadIcp, loadSettings]
  );

  const handleSaveSettings = useCallback(async () => {
    if (!settingsValidation.valid) {
      setError(settingsValidation.message);
      return;
    }
    setSettingsSaving(true);
    setError(null);
    try {
      const response =
        await gatewayClient.crmSaveQualificationSettings(settings);
      const next = pickSettings(response);
      setSettings(next);
      setSettingsBaseline(next);
      setSettingsMeta(response);
      setInfo('Qualification settings saved.');
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Failed to save qualification settings'
      );
    } finally {
      setSettingsSaving(false);
    }
  }, [settings, settingsValidation]);

  const handleResetSettings = useCallback(() => {
    setSettings(defaultSettings());
    setError(null);
    setInfo('Defaults restored locally. Save to persist them.');
  }, []);

  const handleSaveIcp = useCallback(async () => {
    setIcpSaving(true);
    setError(null);
    try {
      const response = await gatewayClient.crmSaveIcpText(kbId, icpText);
      setIcpBaseline(icpText);
      setIcpMeta(response);
      setInfo('ICP saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save ICP');
    } finally {
      setIcpSaving(false);
    }
  }, [icpText, kbId]);

  const handleSaveCco = useCallback(async () => {
    setCcoSaving(true);
    setError(null);
    try {
      const response = await gatewayClient.crmSaveCcoText(kbId, ccoText);
      setCcoBaseline(ccoText);
      setCcoMeta(response);
      setInfo('CCO saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save CCO');
    } finally {
      setCcoSaving(false);
    }
  }, [ccoText, kbId]);

  const handleUpdateCco = useCallback(async () => {
    setCcoUpdating(true);
    setError(null);
    try {
      const response = await gatewayClient.crmUpdateCco(kbId);
      setCcoText(response.content || '');
      setCcoBaseline(response.content || '');
      setCcoMeta(response);
      setInfo('CCO updated from KB.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update CCO from KB');
    } finally {
      setCcoUpdating(false);
    }
  }, [kbId]);

  const settingsUpdated = formatTimestamp(settingsMeta?.updated_at);
  const icpUpdated = formatTimestamp(icpMeta?.updated_at);
  const ccoUpdated = formatTimestamp(ccoMeta?.updated_at);

  return (
    <div className="crm-assistant-page">
      <header className="crm-header">
        <h1>CRM Assistant</h1>
        <p className="crm-subtitle">
          Manage qualification coefficients, the Average Customer Profile
          (ACP), the Ideal Customer Profile (ICP), and the Company Commercial
          Offering (CCO). Candidate qualification is carried out through the
          chat.
        </p>
      </header>

      <div className="crm-tabs" role="tablist">
        <button
          className={`crm-tab ${activeTab === 'settings' ? 'crm-tab-active' : ''}`}
          onClick={() => switchTab('settings')}
          role="tab"
          aria-selected={activeTab === 'settings'}
        >
          Qualification Settings
        </button>
        <button
          className={`crm-tab ${activeTab === 'acp' ? 'crm-tab-active' : ''}`}
          onClick={() => switchTab('acp')}
          role="tab"
          aria-selected={activeTab === 'acp'}
        >
          Average Customer Profile (ACP)
        </button>
        <button
          className={`crm-tab ${activeTab === 'icp' ? 'crm-tab-active' : ''}`}
          onClick={() => switchTab('icp')}
          role="tab"
          aria-selected={activeTab === 'icp'}
        >
          Ideal Customer Profile (ICP)
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

      {activeTab === 'settings' && (
        <div
          className="crm-section crm-global-var"
          role="tabpanel"
          aria-label="Qualification Settings"
        >
          <div className="crm-global-var-header">
            <h2>Qualification Settings</h2>
            <div className="crm-global-var-actions">
              <button
                className="crm-btn-secondary"
                onClick={handleResetSettings}
                disabled={settingsSaving}
                title="Restore the built-in coefficient defaults"
              >
                <RotateCcw size={14} />
                Reset defaults
              </button>
              <button
                className="crm-btn-primary crm-btn-sm"
                onClick={handleSaveSettings}
                disabled={
                  settingsSaving ||
                  settingsLoading ||
                  !settingsValidation.valid
                }
              >
                {settingsSaving ? (
                  <Loader2 size={14} className="crm-icon-spin" />
                ) : (
                  <Save size={14} />
                )}
                Save
              </button>
            </div>
          </div>
          <p>
            Weights apply to the three qualification components and must sum
            to exactly 1. The credit threshold gates the overall score.
            Defaults: ACP 0.2, ICP 0.4, CCO 0.4, credit 0.6.
          </p>
          <div className="crm-settings-grid">
            <label className="crm-field" htmlFor="acp-weight">
              ACP weight
              <input
                id="acp-weight"
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={settings.acp_weight}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    acp_weight: e.target.value,
                  }))
                }
              />
            </label>
            <label className="crm-field" htmlFor="icp-weight">
              ICP weight
              <input
                id="icp-weight"
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={settings.icp_weight}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    icp_weight: e.target.value,
                  }))
                }
              />
            </label>
            <label className="crm-field" htmlFor="cco-weight">
              CCO weight
              <input
                id="cco-weight"
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={settings.cco_weight}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    cco_weight: e.target.value,
                  }))
                }
              />
            </label>
            <label className="crm-field" htmlFor="credit-threshold">
              Credit threshold
              <input
                id="credit-threshold"
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={settings.credit_threshold}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    credit_threshold: e.target.value,
                  }))
                }
              />
            </label>
          </div>
          <p
            className={
              settingsValidation.valid
                ? 'crm-setting-status crm-setting-ok'
                : 'crm-setting-status crm-setting-error'
            }
            aria-live="polite"
          >
            {settingsValidation.valid
              ? `Weights sum to ${settingsValidation.total.toFixed(3)}.`
              : settingsValidation.message}
          </p>
          <p className="crm-global-var-meta">
            {settingsMeta?.persisted && settingsUpdated
              ? `Last updated: ${settingsUpdated}${settingsMeta.updated_by ? ` by ${settingsMeta.updated_by}` : ''}`
              : 'Using built-in defaults (not yet saved).'}
          </p>
        </div>
      )}

      {activeTab === 'acp' && (
        <div
          className="crm-section"
          role="tabpanel"
          aria-label="Average Customer Profile"
        >
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

      {activeTab === 'icp' && (
        <div
          className="crm-section crm-global-var"
          role="tabpanel"
          aria-label="Ideal Customer Profile"
        >
          <div className="crm-global-var-header">
            <h2>Ideal Customer Profile (ICP)</h2>
            <div className="crm-global-var-actions">
              <button
                className="crm-btn-secondary"
                onClick={() =>
                  setIcpMode((mode) => (mode === 'edit' ? 'preview' : 'edit'))
                }
                disabled={icpLoading}
              >
                {icpMode === 'edit' ? <Eye size={14} /> : <Pencil size={14} />}
                {icpMode === 'edit' ? 'Preview' : 'Edit'}
              </button>
              <button
                className="crm-btn-primary crm-btn-sm"
                onClick={handleSaveIcp}
                disabled={icpSaving || icpLoading}
              >
                {icpSaving ? (
                  <Loader2 size={14} className="crm-icon-spin" />
                ) : (
                  <Save size={14} />
                )}
                Save
              </button>
            </div>
          </div>
          <p>
            The ICP is supplied by you. Retriva never generates, infers, or
            extrapolates it from ACP, CCO, customer data, or model knowledge.
            Markdown is supported.
          </p>
          {icpUpdated && (
            <p className="crm-global-var-meta">
              Last updated: {icpUpdated} (source: {icpMeta?.source})
            </p>
          )}
          {icpLoading ? (
            <p className="crm-global-var-meta">
              <Loader2 size={14} className="crm-icon-spin" /> Loading ICP…
            </p>
          ) : icpMode === 'edit' ? (
            <textarea
              className="crm-global-var-textarea"
              aria-label="ICP Markdown source"
              value={icpText}
              onChange={(e) => setIcpText(e.target.value)}
              placeholder="Describe the ideal customer profile. Markdown is supported."
              rows={16}
            />
          ) : (
            <AcpMarkdownPreview
              markdown={icpText}
              className="crm-markdown-preview"
              testId="icp-markdown-preview"
              ariaLabel="ICP Markdown preview"
            />
          )}
        </div>
      )}

      {activeTab === 'cco' && (
        <div
          className="crm-section crm-global-var"
          role="tabpanel"
          aria-label="Company Commercial Offering"
        >
          <div className="crm-global-var-header">
            <h2>Company Commercial Offering (CCO)</h2>
            <div className="crm-global-var-actions">
              <button
                className="crm-btn-secondary"
                onClick={() =>
                  setCcoMode((mode) => (mode === 'edit' ? 'preview' : 'edit'))
                }
                title="Preview the CCO as rendered Markdown"
              >
                {ccoMode === 'edit' ? <Eye size={14} /> : <Pencil size={14} />}
                {ccoMode === 'edit' ? 'Preview' : 'Edit'}
              </button>
              <button
                className="crm-btn-secondary"
                onClick={handleUpdateCco}
                disabled={ccoUpdating}
                title="Rebuild the CCO from all documents tagged 'type: dept_sales_offering'"
              >
                {ccoUpdating ? (
                  <Loader2 size={14} className="crm-icon-spin" />
                ) : (
                  <Sparkles size={14} />
                )}
                Update from KB
              </button>
              <button
                className="crm-btn-primary crm-btn-sm"
                onClick={handleSaveCco}
                disabled={ccoSaving}
              >
                {ccoSaving ? (
                  <Loader2 size={14} className="crm-icon-spin" />
                ) : (
                  <Save size={14} />
                )}
                Save
              </button>
            </div>
          </div>
          {ccoUpdated && (
            <p className="crm-global-var-meta">
              Last updated: {ccoUpdated} (source: {ccoMeta?.source})
            </p>
          )}
          {ccoMode === 'edit' ? (
            <textarea
              className="crm-global-var-textarea"
              aria-label="CCO Markdown source"
              value={ccoText}
              onChange={(e) => setCcoText(e.target.value)}
              placeholder="The CCO will appear here after update or manual entry. You can edit this text freely. Markdown is supported."
              rows={16}
            />
          ) : (
            <AcpMarkdownPreview
              markdown={ccoText}
              className="crm-markdown-preview"
              testId="cco-markdown-preview"
              ariaLabel="CCO Markdown preview"
            />
          )}
        </div>
      )}
    </div>
  );
};
