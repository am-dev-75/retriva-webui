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

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  Loader2,
  Pencil,
  RefreshCw,
  Save,
  ShieldAlert,
  Undo2,
} from 'lucide-react';
import {
  gatewayClient,
  type GatewayRequestError,
} from '../../../api/gateway-client';
import type { AcpEditorState } from '../../../api/types';
import {
  ACP_SCOPE_TEXT,
  newAcpSaveIdempotencyKey,
} from '../acpEditorUtils';
import { AcpMarkdownPreview } from './AcpMarkdownPreview';
import { useUnsavedChangesGuard } from './useUnsavedChangesGuard';

/**
 * Canonical ACP editor (ACP authority transition, Slice C).
 *
 * Reads ONLY the canonical tenant-scoped editor state and saves through
 * the Slice-A draft-creation / Slice-B draft-update endpoints.  It never
 * touches the legacy per-KB free-text ACP endpoints, never depends on KB
 * selection, never fabricates Markdown from structured fields, and never
 * activates a version implicitly: qualification changes only through an
 * explicit Activate action.
 */

type FeedbackKind = 'success' | 'info' | 'warning' | 'error';

interface Feedback {
  kind: FeedbackKind;
  message: string;
}

interface ConflictInfo {
  code: string;
  message: string;
}

type LifecycleKind =
  | 'submit'
  | 'start-review'
  | 'approve'
  | 'activate-replacement';

interface LifecycleActionDef {
  kind: LifecycleKind;
  label: string;
  confirm: string;
  success: string;
  requiresClean: boolean;
  run: () => Promise<unknown>;
}

export interface AcpEditorProps {
  /** Notifies the parent when the unsaved-edits state changes (used for
   *  the in-app tab-switch guard). */
  onDirtyChange?: (dirty: boolean) => void;
}

function formatTimestamp(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleString();
}

function extractDetail(error: unknown): string {
  const err = error as GatewayRequestError;
  return typeof err?.detail === 'string' ? err.detail : '';
}

/** Curated, privacy-safe user messages (never raw payloads, SQL, stack
 *  traces, tokens or Markdown content). */
function saveErrorMessage(error: unknown): string {
  const err = error as GatewayRequestError;
  const status = err?.status;
  const detail = extractDetail(error);
  if (status === 403) {
    return 'You do not have permission to edit this ACP.';
  }
  if (status === 404) {
    return 'The ACP version was not found for this tenant.';
  }
  if (status === 422) {
    return detail
      ? `The Markdown was rejected: ${detail}`
      : 'The Markdown was rejected by the server.';
  }
  if (status === 409) {
    return detail || 'The ACP changed on the server.';
  }
  if (typeof status === 'number' && status >= 500) {
    return 'The server could not complete the request. Your edits are kept locally; try again.';
  }
  if (!status) {
    return 'Network problem — your edits are kept locally. Try again.';
  }
  return `The request failed (status ${status}).`;
}

/** Curated, privacy-safe message for lifecycle (submit/review/approve/
 *  activate) failures.  Activation while a different version is ACTIVE
 *  requires supersession, which the canonical API does not expose yet —
 *  the UI says so instead of pretending the action can succeed. */
function lifecycleErrorMessage(error: unknown): string {
  const err = error as GatewayRequestError;
  const status = err?.status;
  const detail = err?.detail;
  if (status === 409 && (err.code === 'ACP_ACTIVE_CONFLICT'
      || err.code === 'ACP_REPLACEMENT_CONFLICT')) {
    return (
      (detail ? `${detail} ` : '') +
      'Reload the latest state and review it before retrying.'
    );
  }
  if (status === 409 && err.code === 'ACP_NOT_APPROVED') {
    return 'The replacement is no longer APPROVED; reload the latest state.';
  }
  return saveErrorMessage(error);
}

export const AcpEditor: React.FC<AcpEditorProps> = ({ onDirtyChange }) => {
  const [editorState, setEditorState] = useState<AcpEditorState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [baseline, setBaseline] = useState('');
  const [saving, setSaving] = useState(false);
  const [busyAction, setBusyAction] = useState<LifecycleKind | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const saveKeyRef = useRef<string | null>(null);

  const dirty = text !== baseline;
  const { confirmDiscard } = useUnsavedChangesGuard(dirty);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const applyState = useCallback((next: AcpEditorState) => {
    setEditorState(next);
    const authoritative = next.draft
      ? next.draft.source_markdown
      : next.active?.source_markdown_available
        ? next.active.source_markdown ?? ''
        : '';
    setBaseline(authoritative);
    setText(authoritative);
    saveKeyRef.current = null;
    setConflict(null);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const next = await gatewayClient.crmGetAcpEditorState();
      applyState(next);
      setFeedback(null);
    } catch (error) {
      setLoadError(saveErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [applyState]);

  useEffect(() => {
    void load();
  }, [load]);

  const active = editorState?.active ?? null;
  const draft = editorState?.draft ?? null;
  const inFlight = editorState?.in_flight ?? null;
  const capabilities = editorState?.capabilities ?? null;

  const writable = Boolean(
    capabilities &&
      ((draft && capabilities.can_edit_draft) ||
        (!draft && active && capabilities.can_create_draft))
  );
  const readOnly = Boolean(editorState) && !writable;

  const handleTextChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      // A new edit is a new intent: the previous idempotency key must
      // not be replayed against different content.
      saveKeyRef.current = null;
      setConflict(null);
      setText(event.target.value);
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (!editorState || saving || busyAction) return;
    if (!writable) return;
    if (!dirty) {
      setFeedback({ kind: 'info', message: 'No changes to save.' });
      return;
    }
    if (!saveKeyRef.current) {
      saveKeyRef.current = newAcpSaveIdempotencyKey();
    }
    const idempotencyKey = saveKeyRef.current;
    setSaving(true);
    setFeedback(null);
    setConflict(null);
    try {
      if (draft) {
        await gatewayClient.crmUpdateAcpDraft(
          draft.acp_version_id,
          text,
          draft.concurrency_token,
          idempotencyKey
        );
      } else if (active) {
        await gatewayClient.crmCreateAcpDraft(
          text,
          active.concurrency_token,
          idempotencyKey
        );
      }
      saveKeyRef.current = null;
      const next = await gatewayClient.crmGetAcpEditorState();
      applyState(next);
      setFeedback({
        kind: 'success',
        message:
          'Draft saved. It is not active: qualification is unchanged until a version is explicitly activated.',
      });
    } catch (error) {
      const err = error as GatewayRequestError;
      if (err?.status === 409) {
        const code = err.code ?? 'ACP_CONFLICT';
        setConflict({
          code,
          message:
            code === 'ACP_DRAFT_INTEGRITY'
              ? 'More than one editable draft exists for this ACP. Reload the latest state; an operator may need to reconcile the drafts before editing.'
              : 'The ACP changed on the server since this page loaded. Your edits are kept locally. Review the latest state before saving again.',
        });
      } else {
        setFeedback({ kind: 'error', message: saveErrorMessage(error) });
      }
    } finally {
      setSaving(false);
    }
  }, [active, busyAction, dirty, draft, editorState, applyState, saving, text, writable]);

  const handleReload = useCallback(async () => {
    if (dirty && !confirmDiscard('Reload the latest ACP state and discard your unsaved edits?')) {
      return;
    }
    await load();
    setFeedback({ kind: 'info', message: 'Reloaded the latest ACP state.' });
  }, [confirmDiscard, dirty, load]);

  const handleCancel = useCallback(() => {
    if (!dirty) return;
    if (!confirmDiscard('Discard your unsaved ACP edits?')) return;
    saveKeyRef.current = null;
    setText(baseline);
    setConflict(null);
    setFeedback({ kind: 'info', message: 'Restored the last saved version.' });
  }, [baseline, confirmDiscard, dirty]);

  const lifecycleActions = useMemo<LifecycleActionDef[]>(() => {
    if (!editorState || !capabilities) return [];
    const actions: LifecycleActionDef[] = [];
    if (draft && capabilities.can_submit_for_review) {
      actions.push({
        kind: 'submit',
        label: 'Submit for review',
        confirm: `Submit version ${draft.version} for review? Editing stops until the review decision.`,
        success: `Version ${draft.version} was submitted for review.`,
        requiresClean: true,
        run: () =>
          gatewayClient.crmSubmitAcpForReview(draft.acp_id, draft.version),
      });
    }
    if (inFlight?.status === 'REVIEW_READY' && capabilities.can_review) {
      actions.push({
        kind: 'start-review',
        label: 'Start review',
        confirm: `Start the review of version ${inFlight.version}?`,
        success: `Review of version ${inFlight.version} started.`,
        requiresClean: false,
        run: () =>
          gatewayClient.crmStartAcpReview(inFlight.acp_id, inFlight.version),
      });
    }
    if (inFlight?.status === 'UNDER_REVIEW' && capabilities.can_approve) {
      actions.push({
        kind: 'approve',
        label: 'Approve',
        confirm: `Approve version ${inFlight.version}? Approval does not activate it.`,
        success: `Version ${inFlight.version} was approved. It is not active yet.`,
        requiresClean: false,
        run: () =>
          gatewayClient.crmApproveAcp(inFlight.acp_id, inFlight.version),
      });
    }
    if (inFlight?.status === 'APPROVED' && capabilities.can_activate) {
      const replacementToken = inFlight.concurrency_token;
      const currentActive = editorState.active;
      if (replacementToken && currentActive) {
        actions.push({
          kind: 'activate-replacement',
          label: 'Activate replacement',
          confirm:
            `Replace the ACTIVE ACP (v${currentActive.version}) with version ` +
            `${inFlight.version}? The current version becomes SUPERSEDED and ` +
            'qualification switches to the replacement.',
          success:
            `Version ${inFlight.version} is now ACTIVE and the previous ` +
            'version is SUPERSEDED. Qualification uses the replacement ' +
            'from now on.',
          requiresClean: false,
          run: () =>
            gatewayClient.crmSupersedeAcp(
              inFlight.acp_id,
              inFlight.version,
              currentActive.concurrency_token,
              replacementToken,
              `acpui-supersede-${currentActive.acp_version_id}-` +
              `${inFlight.acp_version_id}`
            ),
        });
      }
    }
    return actions;
  }, [capabilities, draft, editorState, inFlight]);

  const handleLifecycle = useCallback(
    async (action: LifecycleActionDef) => {
      if (busyAction || saving) return;
      if (action.requiresClean && dirty) {
        setFeedback({
          kind: 'warning',
          message: `Save your edits before you ${action.label.toLowerCase()}.`,
        });
        return;
      }
      if (!window.confirm(action.confirm)) return;
      setBusyAction(action.kind);
      setFeedback(null);
      setConflict(null);
      try {
        await action.run();
        const next = await gatewayClient.crmGetAcpEditorState();
        applyState(next);
        setFeedback({ kind: 'success', message: action.success });
      } catch (error) {
        setFeedback({ kind: 'error', message: lifecycleErrorMessage(error) });
      } finally {
        setBusyAction(null);
      }
    },
    [applyState, busyAction, dirty, saving]
  );

  if (loading) {
    return (
      <div className="acp-editor" aria-busy="true">
        <p className="acp-status" role="status" aria-live="polite">
          <Loader2 size={14} className="crm-icon-spin" /> Loading ACP state…
        </p>
      </div>
    );
  }

  if (loadError || !editorState) {
    return (
      <div className="acp-editor">
        <div className="crm-alert crm-alert-error" role="alert">
          <AlertCircle size={16} /> {loadError ?? 'The ACP state is unavailable.'}
        </div>
        <button type="button" className="crm-btn-secondary" onClick={() => void load()}>
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  const activeMarkdownUnavailable = Boolean(
    active && !draft && !active.source_markdown_available
  );

  return (
    <div className="acp-editor">
      <p className="acp-scope-text">{ACP_SCOPE_TEXT}</p>

      {feedback && (
        <div
          className={`crm-alert ${
            feedback.kind === 'error'
              ? 'crm-alert-error'
              : feedback.kind === 'warning'
                ? 'crm-alert-warn'
                : 'crm-alert-info'
          }`}
          role={feedback.kind === 'error' ? 'alert' : 'status'}
          aria-live={feedback.kind === 'error' ? 'assertive' : 'polite'}
        >
          {feedback.kind === 'error' || feedback.kind === 'warning' ? (
            <AlertCircle size={16} />
          ) : (
            <CheckCircle2 size={16} />
          )}{' '}
          {feedback.message}
        </div>
      )}

      {conflict && (
        <div className="crm-alert crm-alert-warn" role="alert">
          <ShieldAlert size={16} /> {conflict.message}
          <span className="acp-conflict-code"> ({conflict.code})</span>
          <button type="button" className="crm-btn-secondary" onClick={() => void handleReload()}>
            <RefreshCw size={14} /> Reload latest state
          </button>
        </div>
      )}

      {!active && (
        <div className="crm-alert crm-alert-warn" role="status">
          <AlertCircle size={16} /> There is no ACTIVE ACP for this tenant yet.
          A new draft cannot be created until a version is activated. Use the
          cohort workflow to propose, generate, approve, and activate the first ACP.
        </div>
      )}

      {active && (
        <section className="acp-card" aria-labelledby="acp-active-heading">
          <h3 id="acp-active-heading">Active ACP</h3>
          <dl className="acp-meta">
            <dt>Version</dt>
            <dd>v{active.version}</dd>
            <dt>Status</dt>
            <dd>{active.status}</dd>
            <dt>Origin</dt>
            <dd>{active.origin}</dd>
            <dt>Activated at</dt>
            <dd>{formatTimestamp(active.approved_at) ?? 'not recorded'}</dd>
            <dt>Canonical Markdown</dt>
            <dd>
              {active.source_markdown_available
                ? `${active.source_markdown_chars ?? 0} characters`
                : 'unavailable (this version predates canonical Markdown)'}
            </dd>
          </dl>
        </section>
      )}

      {inFlight && (
        <section className="acp-card" aria-labelledby="acp-inflight-heading">
          <h3 id="acp-inflight-heading">Version in flight</h3>
          <p className="acp-meta-line">
            v{inFlight.version} · {inFlight.status} ·{' '}
            {inFlight.has_source_markdown
              ? 'has canonical Markdown'
              : 'no canonical Markdown captured'}
          </p>
          <p className="acp-hint">
            This version is not an editable draft. Editing is unavailable until
            its lifecycle completes.
          </p>
        </section>
      )}

      {activeMarkdownUnavailable && !inFlight && (
        <div className="crm-alert crm-alert-info" role="status">
          <AlertCircle size={16} /> The active ACP has no canonical Markdown
          source. Nothing is inferred from structured fields or legacy text:
          start a new draft below to author it.
        </div>
      )}

      {readOnly && (
        <div className="crm-alert crm-alert-info" role="status">
          <AlertCircle size={16} /> You have read-only access to this ACP.
        </div>
      )}

      {active && (
        <section className="acp-card" aria-labelledby="acp-editor-heading">
          <div className="acp-editor-header">
            <h3 id="acp-editor-heading">
              {draft ? `Editable draft (v${draft.version})` : 'ACP Markdown'}
            </h3>
            <div className="acp-editor-actions">
              <button
                type="button"
                className="crm-btn-secondary crm-btn-sm"
                aria-pressed={mode === 'edit'}
                onClick={() => setMode('edit')}
              >
                <Pencil size={14} /> Edit
              </button>
              <button
                type="button"
                className="crm-btn-secondary crm-btn-sm"
                aria-pressed={mode === 'preview'}
                onClick={() => setMode('preview')}
              >
                <Eye size={14} /> Preview
              </button>
              {writable && (
                <>
                  <button
                    type="button"
                    className="crm-btn-secondary crm-btn-sm"
                    onClick={handleCancel}
                    disabled={!dirty || saving || busyAction !== null}
                  >
                    <Undo2 size={14} /> Cancel
                  </button>
                  <button
                    type="button"
                    className="crm-btn-primary crm-btn-sm"
                    onClick={() => void handleSave()}
                    disabled={!dirty || saving || busyAction !== null}
                    aria-busy={saving}
                  >
                    {saving ? (
                      <Loader2 size={14} className="crm-icon-spin" />
                    ) : (
                      <Save size={14} />
                    )}{' '}
                    Save
                  </button>
                </>
              )}
              <button
                type="button"
                className="crm-btn-secondary crm-btn-sm"
                onClick={() => void handleReload()}
                disabled={saving || busyAction !== null}
              >
                <RefreshCw size={14} /> Reload
              </button>
            </div>
          </div>

          {dirty && (
            <p className="acp-dirty-hint" role="status">
              Unsaved changes.
            </p>
          )}

          <label className="acp-label" htmlFor="acp-markdown-input">
            ACP Markdown source
          </label>
          <p className="acp-hint" id="acp-markdown-help">
            Markdown only; raw HTML is not executed. Saving creates or updates a
            draft and never activates it.
          </p>
          {mode === 'edit' ? (
            <textarea
              id="acp-markdown-input"
              className="crm-global-var-textarea acp-textarea"
              value={text}
              onChange={handleTextChange}
              readOnly={!writable}
              rows={18}
              aria-describedby="acp-markdown-help"
              spellCheck={false}
            />
          ) : (
            <AcpMarkdownPreview markdown={text} className="acp-preview" />
          )}

          {lifecycleActions.length > 0 && (
            <div className="acp-lifecycle" role="group" aria-label="ACP lifecycle actions">
              {lifecycleActions.map((action) => (
                <button
                  key={action.kind}
                  type="button"
                  className="crm-btn-secondary crm-btn-sm"
                  onClick={() => void handleLifecycle(action)}
                  disabled={busyAction !== null || saving}
                  aria-busy={busyAction === action.kind}
                >
                  {busyAction === action.kind ? (
                    <Loader2 size={14} className="crm-icon-spin" />
                  ) : null}{' '}
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
