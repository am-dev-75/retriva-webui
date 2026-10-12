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

import { afterEach, describe, expect, it, vi } from 'vitest';
import { CRM_WEBUI_ACTOR_ID, gatewayClient } from './gateway-client';

/** Canonical ACP client contract (Slice C): exact paths, methods, DTOs,
 *  and typed error propagation.  No live services are contacted. */

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function lastCall(): [string, RequestInit | undefined] {
  const calls = (globalThis.fetch as unknown as {
    mock: { calls: [string, RequestInit | undefined][] };
  }).mock.calls;
  return calls[calls.length - 1];
}

describe('canonical ACP client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads editor state from GET /api/v2/crm/acp/editor-state', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ source_of_truth: 'x' }));
    await gatewayClient.crmGetAcpEditorState();
    const [url, init] = lastCall();
    expect(url.endsWith('/api/v2/crm/acp/editor-state')).toBe(true);
    expect(init?.method ?? 'GET').toBe('GET');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('creates a draft through POST /api/v2/crm/acp/drafts with the exact body', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}));
    await gatewayClient.crmCreateAcpDraft('# md', 'acpver_abc', 'acpui-key');
    const [url, init] = lastCall();
    expect(url.endsWith('/api/v2/crm/acp/drafts')).toBe(true);
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({
      actor_id: CRM_WEBUI_ACTOR_ID,
      source_markdown: '# md',
      expected_active_version_id: 'acpver_abc',
      idempotency_key: 'acpui-key',
    });
  });

  it('omits the idempotency key when none is supplied', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}));
    await gatewayClient.crmCreateAcpDraft('# md', 'acpver_abc');
    const [, init] = lastCall();
    expect(JSON.parse(String(init?.body))).not.toHaveProperty(
      'idempotency_key'
    );
  });

  it('updates a draft through the canonical update path with the draft token', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}));
    await gatewayClient.crmUpdateAcpDraft(
      'acpver_draft1',
      '# md2',
      'acptok_abc',
      'acpui-k2'
    );
    const [url, init] = lastCall();
    expect(url.endsWith('/api/v2/crm/acp/drafts/acpver_draft1/update')).toBe(
      true
    );
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({
      actor_id: CRM_WEBUI_ACTOR_ID,
      source_markdown: '# md2',
      expected_draft_token: 'acptok_abc',
      idempotency_key: 'acpui-k2',
    });
  });

  it('calls the canonical lifecycle endpoints with their contracts', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      jsonResponse({})
    );

    await gatewayClient.crmSubmitAcpForReview('acp_x', 3);
    expect(lastCall()[0].endsWith('/api/v2/crm/acp/versions/acp_x/3/submit-review')).toBe(true);

    await gatewayClient.crmStartAcpReview('acp_x', 3);
    expect(lastCall()[0].endsWith('/api/v2/crm/acp/versions/acp_x/3/start-review')).toBe(true);

    await gatewayClient.crmApproveAcp('acp_x', 3, 'looks good');
    const [approveUrl, approveInit] = lastCall();
    expect(approveUrl.endsWith('/api/v2/crm/acp/versions/acp_x/3/approve')).toBe(true);
    expect(JSON.parse(String(approveInit?.body))).toEqual({
      actor_id: CRM_WEBUI_ACTOR_ID,
      decision: 'APPROVED',
      comments: 'looks good',
    });

    await gatewayClient.crmActivateAcp('acp_x', 3, 'approved change');
    const [activateUrl, activateInit] = lastCall();
    expect(activateUrl.endsWith('/api/v2/crm/acp/versions/acp_x/3/activate')).toBe(true);
    expect(JSON.parse(String(activateInit?.body))).toEqual({
      actor_id: CRM_WEBUI_ACTOR_ID,
      reason: 'approved change',
    });
  });

  it('activates a replacement through the canonical supersede path', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}));
    await gatewayClient.crmSupersedeAcp(
      'acp_x',
      5,
      'acpver_active1',
      'acptok_replacement',
      'acpui-supersede-1'
    );
    const [url, init] = lastCall();
    expect(url.endsWith('/api/v2/crm/acp/versions/acp_x/5/supersede')).toBe(
      true
    );
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({
      actor_id: CRM_WEBUI_ACTOR_ID,
      expected_active_version_id: 'acpver_active1',
      expected_replacement_token: 'acptok_replacement',
      idempotency_key: 'acpui-supersede-1',
    });
  });

  it('surfaces the backend status/code/detail on typed conflicts', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(
        { code: 'ACP_DRAFT_CONFLICT', detail: 'the ACP draft changed' },
        409
      )
    );
    await expect(
      gatewayClient.crmUpdateAcpDraft('acpver_d', '# x', 'acptok_stale')
    ).rejects.toMatchObject({
      status: 409,
      code: 'ACP_DRAFT_CONFLICT',
      detail: 'the ACP draft changed',
    });
  });

  it('no longer exposes any legacy ACP text client method', () => {
    const client = gatewayClient as unknown as Record<string, unknown>;
    for (const legacy of [
      'crmGetAcpText',
      'crmSaveAcpText',
      'crmUpdateAcp',
      'crmGetAcp',
    ]) {
      expect(client[legacy]).toBeUndefined();
    }
  });
});
