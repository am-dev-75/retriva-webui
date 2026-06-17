# Feature Brief — Dynamic Ingestion Support in Retriva WebUI

## Goal

Modify Retriva WebUI so users can choose between:

1. **Static ingestion** — current file/folder upload flow.
2. **Connected Sources** — dynamic ingestion sources configured once and kept synchronized by Gateway/Connector Manager.

The first connected source type is **MediaWiki**.

## User-facing terminology

Use **Connected Sources** rather than “dynamic ingestion” in the UI.

## Key screens

### Ingestion Landing / Tabs

- Static ingestion
- Connected Sources

### Connected Sources List

Shows:

- source name,
- connector type,
- target KB,
- status,
- last sync,
- next sync,
- indexed item count,
- failed item count,
- actions.

### Add Source Wizard

MediaWiki initial wizard:

1. Source type
2. Connection
3. Scope
4. Target KB
5. Sync policy
6. Review/test
7. Create

### Source Detail

Shows:

- source config summary,
- lifecycle status,
- sync progress,
- run history,
- item/error summary,
- actions: sync now, pause, resume, disconnect/delete.

## API assumption

Gateway exposes APIs like:

```http
POST   /gateway/sources
GET    /gateway/sources
GET    /gateway/sources/{source_id}
PATCH  /gateway/sources/{source_id}
DELETE /gateway/sources/{source_id}
POST   /gateway/sources/{source_id}/sync
POST   /gateway/sources/{source_id}/pause
POST   /gateway/sources/{source_id}/resume
GET    /gateway/sources/{source_id}/status
GET    /gateway/sources/{source_id}/runs
GET    /gateway/sources/{source_id}/runs/{run_id}
```

If Gateway API names differ, the agent must adapt to existing conventions.

## Acceptance criteria

- Existing static upload flow remains functional.
- Users can navigate to Connected Sources.
- Users can create a MediaWiki source using a wizard.
- Users can list sources.
- Users can view status and run history.
- Users can trigger sync now.
- Users can pause/resume a source.
- UI shows initial indexing and catching-up states distinctly.
- Credentials are never stored in browser persistence.
- Tests cover major UI and API-client behavior.
