# SDD Specification — Dynamic Ingestion Support in Retriva WebUI

## 1. Overview

Retriva WebUI shall be extended to support **Connected Sources**, a UI feature for configuring and monitoring dynamic ingestion sources through Retriva Gateway.

The existing static upload flow must remain available and unchanged in behavior.

## 2. User stories

### US-001 — Choose ingestion mode

As a user, I can choose between static ingestion and connected sources so that I can either upload documents manually or configure a continuously synchronized source.

### US-002 — List connected sources

As a user, I can view all configured sources I am allowed to see, including status, target KB, last sync, next sync, and failed item count.

### US-003 — Create MediaWiki source

As an admin, I can configure a MediaWiki source by providing API URL, authentication mode, scope filters, target KB, metadata, and sync policy.

### US-004 — Validate source setup

As an admin, I can test connection/configuration before creating the source if the Gateway supports this operation.

### US-005 — Monitor initial indexing

As a user, I can see that a new source is in initial indexing or catch-up mode, including progress and warnings about incomplete availability.

### US-006 — Operate a source

As an admin, I can pause, resume, run sync now, and disconnect/delete a source.

### US-007 — Inspect sync runs

As a user, I can inspect sync run history and see content-free errors.

## 3. UI structure

```text
IngestionPage
├── IngestionModeTabs
│   ├── StaticIngestionTab
│   └── ConnectedSourcesTab
│       ├── ConnectedSourcesList
│       ├── ConnectedSourceDetail
│       └── AddSourceWizard
```

## 4. Component requirements

### 4.1 IngestionModeTabs

- Preserve existing static ingestion as the default or first tab.
- Add Connected Sources tab.
- Keep deep-linkable state if routing supports it.

### 4.2 ConnectedSourcesList

Displays columns/cards:

- display name,
- connector type,
- target KB,
- status badge,
- last sync,
- next sync,
- indexed items,
- failed items,
- actions.

### 4.3 AddSourceWizard

MediaWiki wizard fields:

```json
{
  "display_name": "R&D MediaWiki",
  "connector_type": "mediawiki",
  "target_kb_id": "rd_mediawiki",
  "api_url": "https://mediawiki.company.local/api.php",
  "auth_mode": "bot_password|oauth|none",
  "allowed_namespaces": [0, 100, 102],
  "include_categories": ["R&D", "Procedures"],
  "exclude_categories": ["Obsolete"],
  "sync_interval_minutes": 15,
  "delete_policy": "soft_delete",
  "availability_policy": "hide_until_initial_sync_complete",
  "metadata": {
    "source_system": "mediawiki",
    "department": "rd"
  }
}
```

Credential fields must be transient and never persisted locally.

### 4.4 SourceDetail

Must show:

- status badge,
- lifecycle phase,
- progress,
- last sync,
- next sync,
- latest run summary,
- run history,
- pause/resume/sync/delete actions.

## 5. API client requirements

Add a Gateway API client module with methods:

```ts
listSources()
getSource(sourceId)
createSource(payload)
updateSource(sourceId, patch)
deleteSource(sourceId, options)
syncSource(sourceId)
pauseSource(sourceId)
resumeSource(sourceId)
getSourceStatus(sourceId)
listSourceRuns(sourceId)
getSourceRun(sourceId, runId)
```

If the project is not TypeScript, adapt to existing language/style.

## 6. Source status rendering

Map internal statuses to user-facing text:

```text
CREATED -> Configured
VALIDATING_CONNECTION -> Validating connection
BASELINE_PENDING -> Waiting for initial indexing
BASELINE_RUNNING -> Initial indexing
CATCHUP_RUNNING -> Catching up
ACTIVE -> Active
PAUSED -> Paused
DEGRADED -> Degraded
FAILED -> Failed
DELETING -> Disconnecting
DELETED -> Deleted
```

## 7. Security requirements

- Do not store credentials in browser persistence.
- Redact credentials in form review step.
- Do not include credentials in console logs.
- Do not include document content in telemetry or errors.
- Only show admin actions if user capability/role is available.
- WebUI must never call external source APIs directly.

## 8. Accessibility requirements

- Wizard fields have labels.
- Validation errors are associated with fields.
- Buttons expose loading/disabled state.
- Status badges include text, not only color.
- Keyboard navigation through wizard is supported.

## 9. Non-goals

- Implementing Gateway backend.
- Implementing connector workers.
- Implementing direct MediaWiki browser calls.
- Implementing SharePoint/Drive/SFTP screens beyond extensible connector descriptor support.
