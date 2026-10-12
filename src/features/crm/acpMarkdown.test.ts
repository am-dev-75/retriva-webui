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
import {
  ACP_MARKDOWN_BLOCKED_ELEMENTS,
  isSafeAcpMarkdownUrl,
} from './acpMarkdown';

describe('ACP Markdown URL allowlist', () => {
  it('allows http(s), mailto and relative/anchor references', () => {
    for (const url of [
      'https://example.com/x',
      'http://example.com',
      'HTTPS://EXAMPLE.COM',
      'mailto:someone@example.com',
      '/docs/page',
      './relative',
      'page.html',
      '#section',
      'https://example.com/a?b=c#d',
    ]) {
      expect(isSafeAcpMarkdownUrl(url), url).toBe(true);
    }
  });

  it('blocks dangerous and unknown schemes', () => {
    for (const url of [
      'javascript:alert(1)',
      'JavaScript:alert(1)',
      ' javascript:alert(1)',
      'data:text/html;base64,PHNjcmlwdD4=',
      'vbscript:msgbox(1)',
      'file:///etc/passwd',
      'about:blank',
      'chrome://settings',
      'foo:bar',
      '',
      '   ',
    ]) {
      expect(isSafeAcpMarkdownUrl(url), url).toBe(false);
    }
  });

  it('rejects non-string values', () => {
    expect(isSafeAcpMarkdownUrl(undefined)).toBe(false);
    expect(isSafeAcpMarkdownUrl(null)).toBe(false);
    expect(isSafeAcpMarkdownUrl(42)).toBe(false);
  });

  it('blocks every dangerous element while allowing normal markdown output', () => {
    for (const blocked of [
      'script',
      'iframe',
      'object',
      'embed',
      'style',
      'link',
      'meta',
      'base',
      'svg',
      'form',
    ]) {
      expect(ACP_MARKDOWN_BLOCKED_ELEMENTS).toContain(blocked);
    }
    for (const allowed of ['p', 'h1', 'table', 'code', 'a', 'img']) {
      expect(ACP_MARKDOWN_BLOCKED_ELEMENTS).not.toContain(allowed);
    }
  });
});
