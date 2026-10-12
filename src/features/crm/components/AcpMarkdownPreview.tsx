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

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ACP_MARKDOWN_BLOCKED_ELEMENTS,
  isSafeAcpMarkdownUrl,
} from '../acpMarkdown';

/**
 * Read-only ACP Markdown preview.
 *
 * Security posture (ACP authority transition, Slice C):
 *
 * - the ONLY Markdown plugins are `remark-gfm` (tables, task lists,
 *   strikethrough); NO `rehype-raw` is used, so raw HTML is never
 *   parsed or executed — it renders as literal text;
 * - `disallowedElements` removes dangerous elements should they ever
 *   reach the HAST tree;
 * - `urlTransform` allows only `http(s):`, `mailto:` and relative /
 *   anchor URLs — `javascript:`, `data:`, `vbscript:`, `file:` and any
 *   other scheme are replaced with an empty value;
 * - the custom `a`/`img` renderers re-validate the URL and degrade to
 *   inert text when it is unsafe (blocked links/images are never
 *   clickable or fetched);
 * - external links open with `rel="noopener noreferrer nofollow"`;
 *   images use `referrerPolicy="no-referrer"` and lazy loading;
 * - no `dangerouslySetInnerHTML` anywhere in this component.
 *
 * The preview renders the exact Markdown source; it never rewrites it.
 */

interface AcpMarkdownPreviewProps {
  markdown: string;
  className?: string;
}

export const AcpMarkdownPreview: React.FC<AcpMarkdownPreviewProps> = ({
  markdown,
  className,
}) => (
  <div
    className={`acp-markdown${className ? ` ${className}` : ''}`}
    data-testid="acp-markdown-preview"
  >
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      disallowedElements={[...ACP_MARKDOWN_BLOCKED_ELEMENTS]}
      urlTransform={(url) => (isSafeAcpMarkdownUrl(url) ? url.trim() : '')}
      components={{
        a: ({ href, children }) => {
          if (!isSafeAcpMarkdownUrl(href)) {
            return (
              <span
                className="acp-markdown-blocked"
                title="Blocked unsafe link"
              >
                {children}
              </span>
            );
          }
          return (
            <a href={href} target="_blank" rel="noopener noreferrer nofollow">
              {children}
            </a>
          );
        },
        img: ({ src, alt }) => {
          const label = typeof alt === 'string' && alt ? alt : 'image';
          if (!isSafeAcpMarkdownUrl(src)) {
            return (
              <span className="acp-markdown-blocked" role="img" aria-label={label}>
                {label}
              </span>
            );
          }
          return (
            <img
              src={src as string}
              alt={typeof alt === 'string' ? alt : ''}
              referrerPolicy="no-referrer"
              loading="lazy"
            />
          );
        },
      }}
    >
      {markdown}
    </ReactMarkdown>
  </div>
);
