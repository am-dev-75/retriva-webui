# SDD — Retriva WebUI: Canonical ACP Editor (Slice C)

Status: **implemented (local; not deployed)**. ACP authority transition,
Slice C. Slices D (legacy reconciliation) and E (legacy retirement) are
not implemented.

## 1. What changed

The CRM Assistant **ACP tab** no longer reads or writes the legacy
per-KB free-text ACP store. It now uses the canonical tenant-scoped
PostgreSQL ACP workflow:

| purpose | canonical call |
| --- | --- |
| load | `GET /api/v2/crm/acp/editor-state` |
| first save | `POST /api/v2/crm/acp/drafts` |
| next saves | `POST /api/v2/crm/acp/drafts/{acp_version_id}/update` |
| submit for review | `POST /api/v2/crm/acp/versions/{acp_id}/{v}/submit-review` |
| start review | `POST /api/v2/crm/acp/versions/{acp_id}/{v}/start-review` |
| approve | `POST /api/v2/crm/acp/versions/{acp_id}/{v}/approve` |
| activate (first/bootstrap) | `POST /api/v2/crm/acp/versions/{acp_id}/{v}/activate` |
| activate a replacement (Slice C2) | `POST /api/v2/crm/acp/versions/{acp_id}/{v}/supersede` |

The legacy client methods (`crmGetAcpText`, `crmSaveAcpText`,
`crmUpdateAcp`, `crmGetAcp`) were removed, and a source-level guard test
fails the build if any of them (or any interpolated legacy per-KB ACP
`/text` path, `dangerouslySetInnerHTML`, `rehype-raw`, or `console.*` in
the ACP sources) is reintroduced.

The **CCO tab is unchanged**: it keeps the KB-scoped free-text
endpoints. The legacy backend writer/fallback remains temporarily
present for Slices D/E.

The ACP tab does **not** depend on the knowledge-base selection.

## 2. State model

`AcpEditor` renders exactly one of these states:

- **loading** — `Loading ACP state…` (`aria-busy`);
- **load error** — alert plus **Retry**;
- **no ACTIVE ACP** — explicit notice; no editor and no draft creation
  (creation fails closed with `ACP_NO_ACTIVE` until a governed bootstrap
  establishes an ACTIVE ACP);
- **ACTIVE without canonical Markdown** (pre-V012) — explicit
  “unavailable” message; the editor starts empty and **never** infers
  Markdown from structured fields or legacy text;
- **ACTIVE + editable draft** — the draft Markdown is the baseline;
- **in-flight version** (non-editor DRAFT, `REVIEW_READY`,
  `UNDER_REVIEW`, `APPROVED`, `LEGACY_MIGRATED`) — shown as metadata
  only, never mislabelled as a draft and never editable here;
- **read-only** — actor without mutation capability sees no Save and a
  read-only textarea.

Scope text shown in the tab:

> The ACP applies to the active tenant and drives qualification only
> after a version is activated.

## 3. Save semantics

- local text is initialised from the editable DRAFT, else from the
  ACTIVE Markdown (without creating a DRAFT until Save);
- Save creates a DRAFT with the **ACTIVE concurrency token** when no
  editable draft exists, otherwise it updates the existing DRAFT with the
  **opaque draft token**;
- unchanged content disables Save (no mutation);
- a bounded idempotency key (`acpui-…`) is generated per save attempt,
  reused across retries of the same attempt, and cleared as soon as the
  source changes (so a new edit is a new intent);
- after a successful save the authoritative state is re-fetched, the
  dirty flag is cleared, and the UI states that the draft is **not
  active** and that qualification is unchanged;
- duplicate submits are prevented while a request is in flight;
- **Cancel** restores the last authoritative baseline; **Reload**
  re-fetches it;
- Save never submits, approves or activates anything.

### Conflicts and errors

| case | behavior |
| --- | --- |
| `409 ACP_DRAFT_CONFLICT` / `ACP_ACTIVE_CONFLICT` | conflict banner with the code, local edits preserved, **Reload latest state** action; never auto-retried or auto-merged |
| `409 ACP_DRAFT_INTEGRITY` | explains that more than one editable draft exists and an operator may need to reconcile |
| `409 IDEMPOTENCY_CONFLICT` | surfaced verbatim (fail closed) |
| `422 ACP_MARKDOWN_*` | “The Markdown was rejected: …” with the server’s privacy-safe detail |
| `403` | “You do not have permission…” |
| `404` | version not found for this tenant |
| network / `5xx` | retryable message; local edits kept |

No SQL, stack traces, cross-tenant identifiers, audit internals,
secrets, Markdown bodies or tokens are logged or displayed.

## 4. Lifecycle distinctions

- **Submit for review** — only with an editable DRAFT, only when
  `can_submit_for_review`, requires explicit confirmation and a clean
  (saved) buffer.
- **Start review** — only for a `REVIEW_READY` in-flight version and
  `can_review`.
- **Approve** — only for an `UNDER_REVIEW` in-flight version and
  `can_approve`; the confirmation states that approval does **not**
  activate.
- **Activate replacement** (Slice C2) — only for an `APPROVED` in-flight
  version and `can_activate`.  One governed call to
  `POST /api/v2/crm/acp/versions/{acp_id}/{v}/supersede` submits the
  current ACTIVE token and the replacement's state token; the server
  atomically supersedes the old ACTIVE and activates the replacement, so
  there is never a window without an ACTIVE version.  The confirmation
  states that the current version becomes **SUPERSEDED** and that
  **qualification switches to the replacement**.  This replaced the
  Slice-C dead-end where activation could not complete while another
  version was ACTIVE.
- Capabilities come from the server; the UI only hides/shows controls and
  every endpoint authorizes independently.
- The canonical `/activate` endpoint remains the governed
  first-activation path (no ACTIVE version yet); it is not reachable from
  this view because the editor only appears alongside an ACTIVE ACP.
- Reject/rollback are not surfaced by this view (console-only, as
  confirmed by the owner).

## 5. Markdown security

`AcpMarkdownPreview` renders Markdown with `react-markdown@10` and
`remark-gfm@4` only:

- raw HTML is never parsed or executed (no `rehype-raw`); it appears as
  escaped literal text;
- `disallowedElements` removes `script`, `iframe`, `object`, `embed`,
  `style`, `link`, `meta`, `base`, `svg`, `form`;
- `urlTransform` and the custom `a`/`img` renderers allow only
  `http(s):`, `mailto:` and relative/anchor URLs — `javascript:`,
  `data:`, `vbscript:`, `file:` and unknown schemes degrade to inert
  text and are never fetched or clickable;
- external links open with `rel="noopener noreferrer nofollow"`; images
  use `referrerPolicy="no-referrer"` and lazy loading;
- no `dangerouslySetInnerHTML`, no regex HTML sanitizer;
- the preview preserves the source exactly and handles Unicode, tables,
  task lists, code, long/unbroken text, keyboard focus, screen readers
  and narrow screens (responsive CSS, `overflow-wrap: anywhere`).

The component is applied to the ACP only — not to ICP or CCO.

## 6. Unsaved-edits guard

- `beforeunload` warns on browser reload/close/hard navigation;
- a capture-phase click listener warns before in-application route
  navigation (a plain `BrowserRouter` cannot block declaratively);
- switching tabs inside the CRM page uses its own confirmation;
- all guards are active only while the buffer is dirty.

## 7. Testing

- `src/api/gateway-client.acp.test.ts` — exact canonical paths, methods,
  request bodies, typed error propagation, and the absence of the legacy
  ACP methods.
- `src/features/crm/acpMarkdown.test.ts` — URL allowlist and blocked
  elements.
- `src/features/crm/components/AcpMarkdownPreview.test.tsx` — GFM
  rendering plus XSS payloads (raw HTML, `javascript:`/`data:`/
  `vbscript:` links, image sources, event handlers, script/iframe/object/
  embed/style/svg/form).
- `src/features/crm/components/AcpEditor.test.tsx` — load states, save
  paths, dirty tracking, idempotency reuse, conflicts, validation,
  network errors, Cancel, lifecycle gating/confirmations, unsaved guard,
  accessibility.
- `src/features/crm/components/CrmAssistant.test.tsx` — tabs, canonical
  ACP usage, CCO unchanged, no ICP/settings surface, tab-switch guard.
- `src/features/crm/canonical-acp-source-guard.test.ts` — source-level
  regression guard (legacy endpoints, unsafe HTML, logging, KB coupling,
  ICP/weights).
- `src/features/crm/components/AcpEditor.test.tsx` also covers the
  replacement action: visibility, confirmation wording, the exact single
  call with both tokens and a bounded key, success refresh, conflict
  handling (no automatic retry, edits preserved), and the absence of any
  chained/two-step client-side status mutation.
- Backend contract acceptance:
  `retriva-crm-assistant/tests/test_acp_webui_contract.py` drives the
  same HTTP contract end-to-end on a disposable database and proves that
  qualification stays on the prior ACTIVE version until an explicit
  activation switches it.

No browser E2E framework (Playwright/Cypress) is configured in this
repository; component-level integration plus the backend contract
acceptance provide the coverage, and the gap is recorded here.

## 8. Not in this slice

Legacy content reconciliation (Slice D), legacy writer/fallback
retirement and SQLite re-keying (Slice E), reject/rollback UI, new
canonical ICP, Settings/weights, composite scoring, shared Markdown
components, CCO changes, deployment or live migration. The legacy
free-text backend remains temporarily operational for its existing
callers.
