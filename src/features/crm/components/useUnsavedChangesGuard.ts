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

import { useCallback, useEffect } from 'react';

export const UNSAVED_ACP_MESSAGE =
  'You have unsaved ACP edits. Continuing will discard them.';

/**
 * Warn on page/tab/route navigation while there are unsaved ACP edits.
 *
 * - `beforeunload` covers browser reload / close / hard navigation (the
 *   browser shows its own confirmation);
 * - a capture-phase click listener covers in-application navigation
 *   (AppShell links, external-within-app routes) that a plain
 *   `<BrowserRouter>` cannot block declaratively; the click is only
 *   cancelled when the user declines the confirmation;
 * - in-component navigation (tab switches, Cancel) uses
 *   `confirmDiscard()`.
 */
export function useUnsavedChangesGuard(dirty: boolean): {
  confirmDiscard: (message?: string) => boolean;
} {
  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Legacy browsers require returnValue to be set.
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return undefined;
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      const target = event.target as Element | null;
      const anchor = target?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const rawHref = anchor.getAttribute('href') || '';
      if (rawHref.startsWith('#')) return;
      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return; // let the browser handle it
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return; // same page (anchor or query-only)
      }
      if (!window.confirm(UNSAVED_ACP_MESSAGE)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [dirty]);

  const confirmDiscard = useCallback(
    (message: string = UNSAVED_ACP_MESSAGE) => !dirty || window.confirm(message),
    [dirty]
  );

  return { confirmDiscard };
}
