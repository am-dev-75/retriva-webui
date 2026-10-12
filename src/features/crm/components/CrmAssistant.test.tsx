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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Mock } from 'vitest';

const legacyAcpSpies = vi.hoisted(() => {
  const boom = () => {
    throw new Error('legacy ACP endpoint must not be called');
  };
  return {
    crmGetAcpText: vi.fn(boom),
    crmSaveAcpText: vi.fn(boom),
    crmUpdateAcp: vi.fn(boom),
    crmGetAcp: vi.fn(boom),
  };
});

vi.mock('../../../api/gateway-client', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../api/gateway-client')>();
  return {
    ...actual,
    gatewayClient: {
      ...legacyAcpSpies,
      getKBs: vi.fn().mockResolvedValue([]),
      crmGetAcpEditorState: vi.fn(),
      crmCreateAcpDraft: vi.fn(),
      crmUpdateAcpDraft: vi.fn(),
      crmSubmitAcpForReview: vi.fn(),
      crmStartAcpReview: vi.fn(),
      crmApproveAcp: vi.fn(),
      crmActivateAcp: vi.fn(),
      crmGetCcoText: vi.fn(),
      crmSaveCcoText: vi.fn(),
      crmUpdateCco: vi.fn(),
    },
  };
});

import { gatewayClient } from '../../../api/gateway-client';
import { KnowledgeBaseProvider } from '../../../app/providers/KnowledgeBaseProvider';
import { CrmAssistant } from './CrmAssistant';

function editorState() {
  return {
    active: {
      acp_id: 'acp_alpha',
      acp_version_id: 'acpver_active1',
      version: 3,
      status: 'ACTIVE',
      origin: 'LEGACY_SEED',
      created_by: 'author',
      created_at: '2026-01-01T10:00:00Z',
      approved_at: '2026-01-02T10:00:00Z',
      updated_at: '2026-01-02T10:00:00Z',
      source_markdown: '# Active ACP\n',
      source_markdown_available: true,
      source_markdown_sha256: 'sha',
      source_markdown_chars: 13,
      concurrency_token: 'acpver_active1',
      concurrency_token_kind: 'ACTIVE_VERSION_ID',
    },
    draft: null,
    in_flight: null,
    capabilities: {
      can_view: true,
      can_create_draft: true,
      can_edit_draft: true,
      can_submit_for_review: true,
      can_review: true,
      can_approve: true,
      can_activate: true,
    },
    state: {
      has_active: true,
      active_markdown_available: true,
      has_editable_draft: false,
      has_in_flight_version: false,
      editing_available: true,
      blocked_reason: null,
    },
    source_of_truth: 'postgresql:qualification.acp_versions',
    legacy_fallback_used: false,
  };
}

function renderPage() {
  return render(
    <KnowledgeBaseProvider>
      <CrmAssistant />
    </KnowledgeBaseProvider>
  );
}

describe('CrmAssistant — canonical ACP tab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (gatewayClient.crmGetAcpEditorState as unknown as Mock).mockResolvedValue(
      editorState()
    );
    (gatewayClient.crmGetCcoText as unknown as Mock).mockResolvedValue({
      kb_id: 'default',
      var_name: 'cco',
      content: '# CCO text\n',
      updated_at: '2026-01-05T10:00:00Z',
      updated_by: 'author',
      source: 'kb',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the ACP tab through the canonical editor and never the legacy endpoints', async () => {
    renderPage();
    await screen.findByLabelText('ACP Markdown source');
    expect(gatewayClient.crmGetAcpEditorState).toHaveBeenCalledTimes(1);
    for (const [name, spy] of Object.entries(legacyAcpSpies)) {
      expect(spy, name).not.toHaveBeenCalled();
    }
    expect(
      screen.getByText(/drives qualification only after a version is activated/)
    ).toBeInTheDocument();
    // Canonical cohort workflow link stays available.
    expect(
      screen.getByRole('link', { name: /Cohort workflow/ })
    ).toHaveAttribute('href', '/api/v2/crm/acp/cohorts/console');
  });

  it('does not submit, approve or activate anything while loading or saving', async () => {
    renderPage();
    await screen.findByLabelText('ACP Markdown source');
    expect(gatewayClient.crmSubmitAcpForReview).not.toHaveBeenCalled();
    expect(gatewayClient.crmApproveAcp).not.toHaveBeenCalled();
    expect(gatewayClient.crmActivateAcp).not.toHaveBeenCalled();
  });

  it('keeps the CCO tab on the existing KB-scoped free-text surface', async () => {
    renderPage();
    await screen.findByLabelText('ACP Markdown source');
    fireEvent.click(
      screen.getByRole('tab', { name: /Company Commercial Offering/ })
    );
    const ccoTextarea = await screen.findByPlaceholderText(
      /The CCO will appear here/
    );
    expect(gatewayClient.crmGetCcoText).toHaveBeenCalledWith('default');
    expect((ccoTextarea as HTMLTextAreaElement).value).toBe('# CCO text\n');

    (gatewayClient.crmSaveCcoText as unknown as Mock).mockResolvedValue({
      kb_id: 'default',
      var_name: 'cco',
      content: '# CCO text\n',
      updated_at: '2026-01-05T11:00:00Z',
      updated_by: 'author',
      source: 'manual',
    });
    fireEvent.click(screen.getByRole('button', { name: /^Save$/ }));
    await waitFor(() =>
      expect(gatewayClient.crmSaveCcoText).toHaveBeenCalledWith(
        'default',
        '# CCO text\n'
      )
    );
  });

  it('exposes exactly the ACP and CCO tabs (no ICP / settings surface)', async () => {
    renderPage();
    await screen.findByLabelText('ACP Markdown source');
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(2);
    expect(screen.queryByText(/Ideal Customer Profile/)).toBeNull();
    expect(screen.queryByText(/\bICP\b/)).toBeNull();
    expect(screen.queryByRole('tab', { name: /Settings|Weights/i })).toBeNull();
  });

  it('warns before leaving the ACP tab with unsaved edits', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderPage();
    await screen.findByLabelText('ACP Markdown source');
    fireEvent.change(screen.getByLabelText('ACP Markdown source'), {
      target: { value: '# dirty\n' },
    });
    fireEvent.click(
      screen.getByRole('tab', { name: /Company Commercial Offering/ })
    );
    expect(confirmSpy).toHaveBeenCalled();
    // Still on the ACP tab: the CCO editor was not opened.
    expect(
      screen.queryByPlaceholderText(/The CCO will appear here/)
    ).toBeNull();
  });
});
