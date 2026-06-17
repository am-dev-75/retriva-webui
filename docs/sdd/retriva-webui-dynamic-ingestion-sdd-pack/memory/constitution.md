# Retriva WebUI Dynamic Ingestion Constitution

## Mission

Extend Retriva WebUI so users can configure and monitor dynamic ingestion sources through Gateway while preserving Retriva's clean separation of concerns.

## Non-negotiable principles

### 1. WebUI never calls connectors directly

WebUI may only call Gateway APIs for source management and sync actions. It must not call MediaWiki, SharePoint, Google Drive, SFTP, Core, Qdrant, or Tika directly.

### 2. Gateway is the API authority

All source CRUD, validation, sync trigger, pause/resume, status, run history, and error retrieval are Gateway API operations.

### 3. No credentials in browser persistence

Do not store source credentials in localStorage, sessionStorage, IndexedDB, URL query strings, logs, telemetry, Redux/Zustand persisted stores, or browser-visible artifacts beyond transient form state.

### 4. Prefer secret references

If the UI receives or displays source config, it must display redacted credential information only. API responses should use `secret_ref`, `has_credentials`, or equivalent fields.

### 5. Static ingestion must remain unchanged

Existing file/folder upload flows must continue to work exactly as before unless the spec explicitly requires a UI organization change.

### 6. Connected Sources must show lifecycle truthfully

The UI must distinguish:

- initial indexing,
- catching up,
- active incremental sync,
- paused,
- degraded,
- failed.

### 7. Do not mislead users during baseline indexing

If a source is still in baseline/catch-up mode, the UI must show that answers may be incomplete unless availability policy hides the KB until ready.

### 8. Accessibility and usability matter

Forms must have labels, validation errors, loading states, disabled states, and keyboard-accessible controls.

### 9. Extensible connector UX

MediaWiki is the first connected source, but UI architecture must support connector descriptors for future SharePoint, OneDrive, Google Drive, SFTP, and other connectors.

### 10. Content-free telemetry

UI telemetry and error reporting must not include document content, page body, prompts, answers, retrieved chunks, or credentials.
