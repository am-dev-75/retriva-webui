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

/**
 * ACP Markdown security rules (ACP authority transition, Slice C).
 *
 * The ACP preview renders Markdown with `remark-gfm` only; raw HTML is
 * never parsed (no `rehype-raw`).  These helpers add a strict URL
 * allowlist and the list of dangerous elements that must never be
 * rendered, and they are unit-tested with XSS payloads.
 */

/** Elements removed from the rendered tree (defense in depth). */
export const ACP_MARKDOWN_BLOCKED_ELEMENTS = [
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
] as const;

/** The only URL shapes the preview will make clickable or fetchable:
 *  `http(s):`, `mailto:` and relative / anchor references. */
export function isSafeAcpMarkdownUrl(url: unknown): boolean {
  if (typeof url !== 'string') return false;
  const value = url.trim();
  if (value === '') return false;
  if (/^https?:\/\//i.test(value)) return true;
  if (/^mailto:/i.test(value)) return true;
  const colon = value.indexOf(':');
  if (colon === -1) return true; // relative reference
  // A colon after '/', '?' or '#' is not a protocol separator.
  const slash = value.indexOf('/');
  const question = value.indexOf('?');
  const hash = value.indexOf('#');
  return (
    (slash !== -1 && colon > slash) ||
    (question !== -1 && colon > question) ||
    (hash !== -1 && colon > hash)
  );
}
