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
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import type { Mock } from 'vitest';
import type {
  AcpEditorCapabilities,
  AcpEditorState,
} from '../../../api/types';

vi.mock('../../../api/gateway-client', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../api/gateway-client')>();
  return {
    ...actual,
    gatewayClient: {
      crmGetAcpEditorState: vi.fn(),
      crmCreateAcpDraft: vi.fn(),
      crmUpdateAcpDraft: vi.fn(),
      crmSubmitAcpForReview: vi.fn(),
      crmStartAcpReview: vi.fn(),
      crmApproveAcp: vi.fn(),
      crmActivateAcp: vi.fn(),
    },
  };
});

import { gatewayClient } from '../../../api/gateway-client';
import { AcpEditor } from './AcpEditor';

const ALL_CAPS: AcpEditorCapabilities = {
  can_view: true,
  can_create_draft: true,
  can_edit_draft: true,
  can_submit_for_review: true,
  can_review: true,
  can_approve: true,
  can_activate: true,
};

const NO_CAPS: AcpEditorCapabilities = {
  can_view: true,
  can_create_draft: false,
  can_edit_draft: false,
  can_submit_for_review: false,
  can_review: false,
  can_approve: false,
  can_activate: false,
};

function activeVersion(overrides: Record<string, unknown> = {}) {
  return {
    acp_id: 'acp_alpha',
    acp_version_id: 'acpver_active1',
    version: 3,
    status: 'ACTIVE' as const,
    origin: 'LEGACY_SEED',
    created_by: 'author',
    created_at: '2026-01-01T10:00:00Z',
    approved_at: '2026-01-02T10:00:00Z',
    updated_at: '2026-01-02T10:00:00Z',
    source_markdown: '# Active ACP\n',
    source_markdown_available: true,
    source_markdown_sha256: 'sha-active',
    source_markdown_chars: 13,
    concurrency_token: 'acpver_active1',
    concurrency_token_kind: 'ACTIVE_VERSION_ID' as const,
    ...overrides,
  };
}

function draftVersion(overrides: Record<string, unknown> = {}) {
  return {
    acp_id: 'acp_alpha',
    acp_version_id: 'acpver_draft1',
    version: 4,
    status: 'DRAFT' as const,
    origin: 'MARKDOWN_DRAFT' as const,
    predecessor_acp_version_id: 'acpver_active1',
    predecessor_version: 3,
    source_markdown: '# Draft ACP\n',
    source_markdown_sha256: 'sha-draft',
    source_markdown_chars: 12,
    created_by: 'editor',
    created_at: '2026-01-03T10:00:00Z',
    updated_at: '2026-01-03T10:00:00Z',
    editable: true as const,
    concurrency_token: 'acptok_draft1',
    concurrency_token_kind: 'DRAFT_STATE_TOKEN' as const,
    ...overrides,
  };
}

function makeState({
  active = activeVersion(),
  draft = null,
  inFlight = null,
  caps = ALL_CAPS,
}: {
  active?: ReturnType<typeof activeVersion> | null;
  draft?: ReturnType<typeof draftVersion> | null;
  inFlight?: Record<string, unknown> | null;
  caps?: AcpEditorCapabilities;
}): AcpEditorState {
  return {
    active: active as AcpEditorState['active'],
    draft: draft as AcpEditorState['draft'],
    in_flight: inFlight as AcpEditorState['in_flight'],
    capabilities: caps,
    state: {
      has_active: active !== null,
      active_markdown_available: active
        ? active.source_markdown_available
        : null,
      has_editable_draft: draft !== null,
      has_in_flight_version: inFlight !== null,
      editing_available: active !== null,
      blocked_reason: active ? null : 'NO_ACTIVE_ACP',
    },
    source_of_truth: 'postgresql:qualification.acp_versions',
    legacy_fallback_used: false,
  };
}

function inFlightVersion(overrides: Record<string, unknown> = {}) {
  return {
    acp_id: 'acp_alpha',
    acp_version_id: 'acpver_inflight1',
    version: 5,
    status: 'REVIEW_READY' as const,
    origin: 'MARKDOWN_DRAFT',
    has_source_markdown: true,
    source_markdown_sha256: 'sha-inflight',
    source_markdown_chars: 10,
    editable: false as const,
    created_at: '2026-01-04T10:00:00Z',
    updated_at: '2026-01-04T10:00:00Z',
    ...overrides,
  };
}

function errorWith(props: Record<string, unknown>): Error {
  return Object.assign(new Error('boom'), props);
}

const stateMock = () =>
  gatewayClient.crmGetAcpEditorState as unknown as Mock;
const createMock = () => gatewayClient.crmCreateAcpDraft as unknown as Mock;
const updateMock = () => gatewayClient.crmUpdateAcpDraft as unknown as Mock;

async function renderEditor(state: AcpEditorState, props = {}) {
  stateMock().mockResolvedValue(state);
  const utils = render(<AcpEditor {...props} />);
  await screen.findByLabelText('ACP Markdown source');
  return utils;
}

const textarea = () =>
  screen.getByLabelText('ACP Markdown source') as HTMLTextAreaElement;

const saveButton = () => screen.getByRole('button', { name: /Save/ });

describe('AcpEditor — loading and state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the canonical editor state and shows the scope text', async () => {
    await renderEditor(makeState({}));
    expect(stateMock()).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText(/drives qualification only after a version is activated/)
    ).toBeInTheDocument();
    expect(textarea().value).toBe('# Active ACP\n');
    expect(saveButton()).toBeDisabled(); // unchanged
  });

  it('shows NO_ACTIVE_ACP with no editor when there is no active ACP', async () => {
    stateMock().mockResolvedValue(makeState({ active: null, caps: ALL_CAPS }));
    render(<AcpEditor />);
    expect(
      await screen.findByText(/There is no ACTIVE ACP for this tenant/)
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText('ACP Markdown source')
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save/ })).toBeNull();
  });

  it('states that pre-V012 Markdown is unavailable without fabricating it', async () => {
    await renderEditor(
      makeState({
        active: activeVersion({
          source_markdown: null,
          source_markdown_available: false,
          source_markdown_sha256: null,
          source_markdown_chars: null,
        }),
      })
    );
    expect(
      screen.getByText(/no canonical Markdown\s+source/)
    ).toBeInTheDocument();
    expect(textarea().value).toBe('');
  });

  it('shows the in-flight version separately from the editable draft', async () => {
    await renderEditor(
      makeState({ draft: null, inFlight: inFlightVersion() })
    );
    expect(screen.getByText('Version in flight')).toBeInTheDocument();
    expect(screen.getByText(/v5 · REVIEW_READY/)).toBeInTheDocument();
    expect(
      screen.getByText(/not an editable draft/, { exact: false })
    ).toBeInTheDocument();
  });

  it('renders read-only when the actor has no mutation capability', async () => {
    await renderEditor(makeState({ caps: NO_CAPS }));
    expect(textarea()).toHaveAttribute('readonly');
    expect(screen.queryByRole('button', { name: /Save/ })).toBeNull();
    expect(screen.getByText(/read-only access/)).toBeInTheDocument();
  });

  it('shows a retry state when the load fails', async () => {
    stateMock().mockRejectedValue(errorWith({ status: 500 }));
    render(<AcpEditor />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /server could not complete/
    );
    expect(screen.getByRole('button', { name: /Retry/ })).toBeInTheDocument();
  });
});

describe('AcpEditor — Save', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a draft from the ACTIVE token when none exists', async () => {
    const active = activeVersion({
      source_markdown: null,
      source_markdown_available: false,
      source_markdown_sha256: null,
      source_markdown_chars: null,
    });
    stateMock()
      .mockResolvedValueOnce(makeState({ active })) // load
      .mockResolvedValueOnce(
        makeState({ active, draft: draftVersion({ source_markdown: '# New\n' }) })
      ); // refresh after save
    createMock().mockResolvedValue({ idempotent_replay: false });
    render(<AcpEditor />);
    await screen.findByLabelText('ACP Markdown source');

    fireEvent.change(textarea(), { target: { value: '# New\n' } });
    fireEvent.click(saveButton());

    await waitFor(() => expect(createMock()).toHaveBeenCalledTimes(1));
    const [markdown, token, key] = createMock().mock.calls[0];
    expect(markdown).toBe('# New\n');
    expect(token).toBe('acpver_active1');
    expect(key).toMatch(/^acpui-/);
    expect(updateMock()).not.toHaveBeenCalled();
    expect(
      await screen.findByText(/Draft saved\. It is not active/)
    ).toBeInTheDocument();
    expect(stateMock()).toHaveBeenCalledTimes(2); // refreshed authoritative state
    expect(saveButton()).toBeDisabled(); // dirty cleared
  });

  it('updates the existing editable draft in place', async () => {
    const draft = draftVersion();
    stateMock()
      .mockResolvedValueOnce(makeState({ draft }))
      .mockResolvedValueOnce(
        makeState({ draft: draftVersion({ source_markdown: '# Draft 2\n' }) })
      );
    updateMock().mockResolvedValue({ idempotent_replay: false });
    await renderEditor(makeState({ draft }));

    fireEvent.change(textarea(), { target: { value: '# Draft 2\n' } });
    fireEvent.click(saveButton());

    await waitFor(() => expect(updateMock()).toHaveBeenCalledTimes(1));
    const [versionId, markdown, token, key] = updateMock().mock.calls[0];
    expect(versionId).toBe('acpver_draft1');
    expect(markdown).toBe('# Draft 2\n');
    expect(token).toBe('acptok_draft1');
    expect(key).toMatch(/^acpui-/);
    expect(createMock()).not.toHaveBeenCalled();
  });

  it('does not mutate when the content is unchanged', async () => {
    await renderEditor(makeState({ draft: draftVersion() }));
    expect(saveButton()).toBeDisabled();
    expect(updateMock()).not.toHaveBeenCalled();
    expect(createMock()).not.toHaveBeenCalled();
  });

  it('prevents duplicate submits while a save is in flight', async () => {
    let resolve!: (value: unknown) => void;
    updateMock().mockImplementation(
      () => new Promise((r) => { resolve = r; })
    );
    stateMock()
      .mockResolvedValueOnce(makeState({ draft: draftVersion() }))
      .mockResolvedValueOnce(makeState({ draft: draftVersion() }));
    await renderEditor(makeState({ draft: draftVersion() }));

    fireEvent.change(textarea(), { target: { value: '# changed\n' } });
    fireEvent.click(saveButton());
    await waitFor(() => expect(updateMock()).toHaveBeenCalledTimes(1));
    expect(saveButton()).toBeDisabled();
    fireEvent.click(saveButton());
    expect(updateMock()).toHaveBeenCalledTimes(1);
    resolve({ idempotent_replay: false });
  });

  it('keeps local edits and shows a typed conflict with a reload action', async () => {
    updateMock().mockRejectedValue(
      errorWith({ status: 409, code: 'ACP_DRAFT_CONFLICT' })
    );
    await renderEditor(makeState({ draft: draftVersion() }));

    fireEvent.change(textarea(), { target: { value: '# my local edit\n' } });
    fireEvent.click(saveButton());

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/ACP_DRAFT_CONFLICT/);
    expect(alert).toHaveTextContent(/changed on the server/);
    expect(
      screen.getByRole('button', { name: /Reload latest state/ })
    ).toBeInTheDocument();
    expect(textarea().value).toBe('# my local edit\n'); // edits preserved
    expect(updateMock()).toHaveBeenCalledTimes(1); // never auto-retried
  });

  it('explains the multiple-draft integrity conflict', async () => {
    updateMock().mockRejectedValue(
      errorWith({ status: 409, code: 'ACP_DRAFT_INTEGRITY' })
    );
    await renderEditor(makeState({ draft: draftVersion() }));
    fireEvent.change(textarea(), { target: { value: '# x\n' } });
    fireEvent.click(saveButton());
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /More than one editable draft/
    );
  });

  it('keeps local edits on a network failure and reuses the idempotency key', async () => {
    const keys: (string | undefined)[] = [];
    updateMock().mockImplementation(
      (_id: string, _md: string, _token: string, key?: string) => {
        keys.push(key);
        return Promise.reject(new Error('network down'));
      }
    );
    await renderEditor(makeState({ draft: draftVersion() }));

    fireEvent.change(textarea(), { target: { value: '# retry me\n' } });
    fireEvent.click(saveButton());
    await screen.findByText(/Network problem/);
    expect(textarea().value).toBe('# retry me\n');

    fireEvent.click(saveButton());
    await waitFor(() => expect(keys.length).toBe(2));
    expect(keys[0]).toBe(keys[1]); // same attempt -> same key (retry-safe)

    // A NEW edit is a new intent: the key must not be reused.
    fireEvent.change(textarea(), { target: { value: '# retry me 2\n' } });
    fireEvent.click(saveButton());
    await waitFor(() => expect(keys.length).toBe(3));
    expect(keys[2]).not.toBe(keys[0]);
  });

  it('surfaces Markdown validation errors from the server', async () => {
    updateMock().mockRejectedValue(
      errorWith({
        status: 422,
        code: 'ACP_MARKDOWN_EMPTY',
        detail: 'source_markdown must contain at least one non-whitespace character',
      })
    );
    await renderEditor(makeState({ draft: draftVersion() }));
    fireEvent.change(textarea(), { target: { value: '   ' } });
    fireEvent.click(saveButton());
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /The Markdown was rejected/
    );
  });

  it('restores the last saved baseline on Cancel', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await renderEditor(makeState({ draft: draftVersion() }));
    fireEvent.change(textarea(), { target: { value: '# discarded\n' } });
    fireEvent.click(screen.getByRole('button', { name: /Cancel/ }));
    expect(textarea().value).toBe('# Draft ACP\n');
    expect(updateMock()).not.toHaveBeenCalled();
  });
});

describe('AcpEditor — lifecycle actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('submits the draft only after an explicit confirmation and a save', async () => {
    const draft = draftVersion();
    stateMock()
      .mockResolvedValueOnce(makeState({ draft }))
      .mockResolvedValueOnce(makeState({ draft }));
    (gatewayClient.crmSubmitAcpForReview as unknown as Mock).mockResolvedValue(
      {}
    );
    await renderEditor(makeState({ draft }));

    const submit = screen.getByRole('button', { name: /Submit for review/ });
    fireEvent.click(submit);
    await waitFor(() =>
      expect(gatewayClient.crmSubmitAcpForReview).toHaveBeenCalledWith(
        'acp_alpha',
        4
      )
    );
    expect(
      await screen.findByText(/was submitted for review/)
    ).toBeInTheDocument();
  });

  it('requires a save before submitting dirty edits', async () => {
    await renderEditor(makeState({ draft: draftVersion() }));
    fireEvent.change(textarea(), { target: { value: '# unsaved\n' } });
    fireEvent.click(screen.getByRole('button', { name: /Submit for review/ }));
    expect(
      await screen.findByText(/Save your edits before you submit for review/)
    ).toBeInTheDocument();
    expect(gatewayClient.crmSubmitAcpForReview).not.toHaveBeenCalled();
  });

  it('starts the review of a REVIEW_READY version when permitted', async () => {
    stateMock()
      .mockResolvedValueOnce(
        makeState({ inFlight: inFlightVersion({ status: 'REVIEW_READY' }) })
      )
      .mockResolvedValueOnce(
        makeState({ inFlight: inFlightVersion({ status: 'UNDER_REVIEW' }) })
      );
    (gatewayClient.crmStartAcpReview as unknown as Mock).mockResolvedValue({});
    await renderEditor(
      makeState({ inFlight: inFlightVersion({ status: 'REVIEW_READY' }) })
    );
    fireEvent.click(screen.getByRole('button', { name: /Start review/ }));
    await waitFor(() =>
      expect(gatewayClient.crmStartAcpReview).toHaveBeenCalledWith(
        'acp_alpha',
        5
      )
    );
  });

  it('approves an UNDER_REVIEW version without activating it', async () => {
    const state = makeState({
      inFlight: inFlightVersion({ status: 'UNDER_REVIEW' }),
    });
    stateMock().mockResolvedValueOnce(state).mockResolvedValueOnce(state);
    (gatewayClient.crmApproveAcp as unknown as Mock).mockResolvedValue({});
    await renderEditor(state);

    fireEvent.click(screen.getByRole('button', { name: /Approve/ }));
    await waitFor(() =>
      expect(gatewayClient.crmApproveAcp).toHaveBeenCalledWith('acp_alpha', 5)
    );
    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringMatching(/Approval does not activate it/)
    );
    expect(gatewayClient.crmActivateAcp).not.toHaveBeenCalled();
  });

  it('activates an APPROVED version with a qualification warning', async () => {
    const state = makeState({
      inFlight: inFlightVersion({ status: 'APPROVED' }),
    });
    stateMock().mockResolvedValueOnce(state).mockResolvedValueOnce(state);
    (gatewayClient.crmActivateAcp as unknown as Mock).mockResolvedValue({});
    await renderEditor(state);

    fireEvent.click(screen.getByRole('button', { name: /Activate/ }));
    await waitFor(() =>
      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringMatching(/changes the ACP used by qualification/)
      )
    );
    await waitFor(() =>
      expect(gatewayClient.crmActivateAcp).toHaveBeenCalledWith(
        'acp_alpha',
        5
      )
    );
    expect(await screen.findByText(/is now ACTIVE/)).toBeInTheDocument();
  });

  it('hides lifecycle actions the actor is not permitted to perform', async () => {
    await renderEditor(
      makeState({
        inFlight: inFlightVersion({ status: 'APPROVED' }),
        caps: { ...ALL_CAPS, can_activate: false },
      })
    );
    expect(screen.queryByRole('button', { name: /Activate/ })).toBeNull();
  });

  it('explains that activation needs supersession when another version is ACTIVE', async () => {
    const state = makeState({
      inFlight: inFlightVersion({ status: 'APPROVED' }),
    });
    stateMock().mockResolvedValueOnce(state).mockResolvedValueOnce(state);
    (gatewayClient.crmActivateAcp as unknown as Mock).mockRejectedValue(
      errorWith({ status: 409, code: 'ACP_ACTIVE_CONFLICT' })
    );
    await renderEditor(state);
    fireEvent.click(screen.getByRole('button', { name: /Activate/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /requires supersession/
    );
    // No implicit switch happened; the view did not refresh.
    expect(stateMock()).toHaveBeenCalledTimes(1);
  });
});

describe('AcpEditor — unsaved-changes guard and accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('warns on page unload and blocks in-app navigation while dirty', async () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    await renderEditor(makeState({ draft: draftVersion() }));
    expect(
      addSpy.mock.calls.some(([type]) => type === 'beforeunload')
    ).toBe(false);

    fireEvent.change(textarea(), { target: { value: '# dirty\n' } });
    await waitFor(() =>
      expect(
        addSpy.mock.calls.some(([type]) => type === 'beforeunload')
      ).toBe(true)
    );

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const link = document.createElement('a');
    link.href = '/documents';
    link.textContent = 'Documents';
    document.body.appendChild(link);
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(click);
    expect(confirmSpy).toHaveBeenCalled();
    expect(click.defaultPrevented).toBe(true);
    document.body.removeChild(link);
  });

  it('exposes labels, live regions and accessible controls', async () => {
    await renderEditor(makeState({ draft: draftVersion() }));
    expect(screen.getByLabelText('ACP Markdown source')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Preview/ })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Preview/ }));
    expect(screen.getByTestId('acp-markdown-preview')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('acp-markdown-preview')).getByText(
        /Draft ACP/
      )
    ).toBeInTheDocument();
  });
});
