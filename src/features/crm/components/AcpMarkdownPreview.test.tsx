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
import { render, screen } from '@testing-library/react';
import { AcpMarkdownPreview } from './AcpMarkdownPreview';

/** Markdown/GFM rendering and XSS resistance for the ACP preview. */

function renderMarkdown(markdown: string) {
  const { container } = render(<AcpMarkdownPreview markdown={markdown} />);
  return container;
}

describe('AcpMarkdownPreview — rendering', () => {
  it('renders GFM tables, lists, code and emphasis', () => {
    const container = renderMarkdown(
      [
        '# Title',
        '',
        '| a | b |',
        '| - | - |',
        '| 1 | 2 |',
        '',
        '- one',
        '- two',
        '',
        '```js',
        'const x = 1;',
        '```',
        '',
        '**bold** and *italic* and ~~gone~~',
      ].join('\n')
    );
    expect(container.querySelector('h1')?.textContent).toBe('Title');
    expect(container.querySelectorAll('table th')).toHaveLength(2);
    expect(container.querySelectorAll('table td')).toHaveLength(2);
    expect(container.querySelectorAll('li')).toHaveLength(2);
    expect(container.querySelector('code')?.textContent).toContain(
      'const x = 1;'
    );
    expect(container.querySelector('strong')?.textContent).toBe('bold');
    expect(container.querySelector('del')?.textContent).toBe('gone');
  });

  it('preserves Unicode, emoji and line structure', () => {
    const container = renderMarkdown('Café Ångström\n\n🚀 rocket');
    expect(container.textContent).toContain('Café Ångström');
    expect(container.textContent).toContain('🚀 rocket');
    expect(container.querySelectorAll('p')).toHaveLength(2);
  });

  it('renders long unbroken text without truncation', () => {
    const word = 'x'.repeat(500);
    const container = renderMarkdown(word);
    expect(container.textContent).toContain(word);
  });

  it('opens safe links in a new tab with a hardened rel', () => {
    const container = renderMarkdown('[site](https://example.com)');
    const anchor = container.querySelector('a');
    expect(anchor).not.toBeNull();
    expect(anchor?.getAttribute('href')).toBe('https://example.com');
    expect(anchor?.getAttribute('target')).toBe('_blank');
    expect(anchor?.getAttribute('rel')).toContain('noopener');
    expect(anchor?.getAttribute('rel')).toContain('noreferrer');
    expect(anchor?.getAttribute('rel')).toContain('nofollow');
  });
});

describe('AcpMarkdownPreview — XSS payloads', () => {
  it('never creates executable elements from raw HTML', () => {
    const container = renderMarkdown(
      [
        "<script>window.__pwned = 1;</script>",
        '<iframe src="https://evil.example"></iframe>',
        '<object data="x"></object>',
        '<embed src="x">',
        '<style>body{display:none}</style>',
        '<svg onload="window.__pwned = 1"></svg>',
        '<form action="/x"><input name="a"></form>',
        '<img src=x onerror="window.__pwned = 1">',
      ].join('\n\n')
    );
    for (const selector of [
      'script',
      'iframe',
      'object',
      'embed',
      'style',
      'svg',
      'form',
    ]) {
      expect(container.querySelector(selector), selector).toBeNull();
    }
    expect((window as unknown as Record<string, unknown>).__pwned).toBeFalsy();
    // Raw HTML is shown as literal (escaped) text, never parsed.
    expect(container.textContent).toContain('<script>');
  });

  it('blocks javascript:, data: and vbscript: links', () => {
    const container = renderMarkdown(
      [
        '[js](javascript:window.__pwned=1)',
        '[data](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)',
        '[vb](vbscript:msgbox(1))',
      ].join('\n\n')
    );
    expect(container.querySelectorAll('a')).toHaveLength(0);
    for (const anchor of Array.from(container.querySelectorAll('a'))) {
      expect(anchor.getAttribute('href')?.startsWith('javascript:')).toBe(
        false
      );
    }
    // The link labels survive as inert text.
    expect(container.textContent).toContain('js');
    expect(container.textContent).toContain('data');
  });

  it('blocks unsafe image sources and keeps the alt text', () => {
    const container = renderMarkdown('![logo](javascript:alert(1))');
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('logo');
  });

  it('never uses dangerouslySetInnerHTML or event handler attributes', () => {
    const container = renderMarkdown(
      '<div onclick="window.__pwned=1">click me</div>'
    );
    for (const el of Array.from(container.querySelectorAll('*'))) {
      for (const attr of Array.from(el.attributes)) {
        expect(attr.name.toLowerCase().startsWith('on')).toBe(false);
      }
    }
    expect((window as unknown as Record<string, unknown>).__pwned).toBeFalsy();
    expect(screen.getByTestId('acp-markdown-preview')).toBeInTheDocument();
  });
});
