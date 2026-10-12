/// <reference types="vite/client" />

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

import { describe, expect, it } from 'vitest';

/**
 * Source-level guards for the ACP switch (Slice C).
 *
 * These checks fail the build if the WebUI ever regresses to the legacy
 * free-text ACP endpoints, re-introduces unsafe Markdown rendering, or
 * starts logging ACP content/tokens.  Sources are embedded as raw text
 * by Vite (no filesystem access, no Node typings required).
 */

const raw = import.meta.glob(
  [
    './components/AcpEditor.tsx',
    './components/AcpMarkdownPreview.tsx',
    './components/CrmAssistant.tsx',
    './components/useUnsavedChangesGuard.ts',
    './acpMarkdown.ts',
    './acpEditorUtils.ts',
    '../../api/gateway-client.ts',
  ],
  { query: '?raw', import: 'default', eager: true }
) as Record<string, string>;

const ACP_SOURCES: Record<string, string> = {
  AcpEditor: raw['./components/AcpEditor.tsx'],
  AcpMarkdownPreview: raw['./components/AcpMarkdownPreview.tsx'],
  CrmAssistant: raw['./components/CrmAssistant.tsx'],
  useUnsavedChangesGuard: raw['./components/useUnsavedChangesGuard.ts'],
  acpMarkdown: raw['./acpMarkdown.ts'],
  acpEditorUtils: raw['./acpEditorUtils.ts'],
  gatewayClient: raw['../../api/gateway-client.ts'],
};

describe('canonical ACP source guard', () => {
  it('reads every guarded source', () => {
    for (const [name, source] of Object.entries(ACP_SOURCES)) {
      expect(typeof source, name).toBe('string');
      expect(source.length, name).toBeGreaterThan(100);
    }
  });

  it('never references a legacy free-text ACP endpoint or symbol', () => {
    const forbidden = [
      'crmGetAcpText',
      'crmSaveAcpText',
      'crmUpdateAcp(',
      'crmGetAcp(',
      'get_acp_text',
      'crm_global_vars',
      'legacy_acp',
    ];
    for (const [name, source] of Object.entries(ACP_SOURCES)) {
      for (const token of forbidden) {
        expect(source.includes(token), `${name} contains ${token}`).toBe(
          false
        );
      }
    }
    // No interpolated legacy per-KB ACP /text path anywhere.
    const legacyTextPath = /\/api\/v2\/crm\/acp\/\$\{[^}]*\}\/text/;
    for (const [name, source] of Object.entries(ACP_SOURCES)) {
      expect(legacyTextPath.test(source), name).toBe(false);
    }
  });

  it('uses only the canonical ACP paths', () => {
    for (const path of [
      '/api/v2/crm/acp/editor-state',
      '/api/v2/crm/acp/drafts',
      '/update',
      '/submit-review',
      '/start-review',
      '/approve',
      '/activate',
      '/supersede',
    ]) {
      expect(ACP_SOURCES.gatewayClient).toContain(path);
    }
  });

  it('keeps the CCO free-text surface unchanged', () => {
    expect(ACP_SOURCES.gatewayClient).toContain(
      '/api/v2/crm/cco/${kbId}/text'
    );
    expect(ACP_SOURCES.CrmAssistant).toContain('crmGetCcoText');
  });

  it('never parses raw HTML or renders unsanitized HTML', () => {
    // Match real usage, not the security-policy prose in comments.
    for (const [name, source] of Object.entries(ACP_SOURCES)) {
      expect(source.includes('dangerouslySetInnerHTML='), name).toBe(false);
      expect(source.includes("'rehype-raw'"), name).toBe(false);
      expect(source.includes('"rehype-raw"'), name).toBe(false);
      expect(source.includes("'hast-util-raw'"), name).toBe(false);
      expect(source.includes('allowDangerousHtml'), name).toBe(false);
    }
    // react-markdown is used only by the hardened preview.
    expect(ACP_SOURCES.AcpMarkdownPreview).toContain("from 'react-markdown'");
    for (const name of ['AcpEditor', 'CrmAssistant', 'acpMarkdown']) {
      expect(ACP_SOURCES[name].includes('react-markdown'), name).toBe(false);
    }
  });

  it('never logs ACP content, tokens or customer data', () => {
    // The shared gateway client keeps its pre-existing 401 re-auth
    // logging; the ACP feature sources must never log at all.
    const acpOnly = Object.entries(ACP_SOURCES).filter(
      ([name]) => name !== 'gatewayClient'
    );
    for (const [name, source] of acpOnly) {
      expect(source.includes('console.log'), name).toBe(false);
      expect(source.includes('console.error'), name).toBe(false);
      expect(source.includes('console.warn'), name).toBe(false);
    }
  });

  it('keeps the ACP editor independent of knowledge-base selection', () => {
    for (const name of [
      'AcpEditor',
      'AcpMarkdownPreview',
      'acpMarkdown',
      'acpEditorUtils',
    ]) {
      expect(ACP_SOURCES[name].includes('useKnowledgeBase'), name).toBe(false);
      expect(ACP_SOURCES[name].includes('selectedKbIds'), name).toBe(false);
    }
  });

  it('contains no ICP, settings or weights surface', () => {
    for (const [name, source] of Object.entries(ACP_SOURCES)) {
      expect(/\bICP\b/.test(source), name).toBe(false);
      expect(/\bicp_/.test(source), name).toBe(false);
      expect(/composite[_-]?score/i.test(source), name).toBe(false);
      expect(/profile[_-]?weights/i.test(source), name).toBe(false);
    }
  });
});
