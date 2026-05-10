
# SDD Pack — Retriva WebUI

## Status
Proposed

## Scope
Retriva WebUI frontend only.

This SDD defines the first browser-based frontend for Retriva. The frontend communicates only with Retriva Gateway and never calls Retriva Core directly.

Target architecture:

```text
Retriva WebUI → Retriva Gateway → Retriva Core
```

---

## Technology Decision

Retriva WebUI will be implemented with:

```text
React + TypeScript + Vite
```

The UI must be modular, clean, maintainable, and suitable for a modern enterprise-grade product experience.

---

## Objective

Implement a Retriva-native browser frontend that provides:

- Chat-based interaction with Retriva
- Knowledge Base selection and management
- Document ingestion
- Recursive folder upload
- User-provided metadata management without chat directives
- Ingestion job tracking
- Document browsing
- Artifact generation and download
- Light, dark, and system theme modes
- Future-ready speech-to-text dictation integration
- Future IAM/role-aware UI support

The first version intentionally avoids authentication/authorization.

---

## Design Goals

### DG-1 — Clean enterprise-grade visual style

The UI must be minimal, professional, and uncluttered.

Visual principles:

- Neutral color palette
- Strong whitespace
- Clear typography hierarchy
- Restrained rounded surfaces
- Low-noise borders
- Minimal animation
- Accessible contrast
- Predictable navigation
- High information density only where appropriate

### DG-2 — Retriva-native workflows

The UI must not reproduce Open WebUI workarounds.

Users must not need to type directives such as:

```text
@@ingestion_tag_start
```

Metadata, KB selection, retrieval options, ingestion settings, and artifact generation must be handled through structured UI controls.

### DG-3 — Gateway-first architecture

The browser must communicate only with Retriva Gateway.

```text
Browser → Retriva Gateway → Retriva Core
```

This preserves a clean future path for IAM, role enforcement, auditing, and policy checks.

### DG-4 — No authentication, IAM-ready later

Version 1 ships without authentication.

However, the app architecture must be ready for external IAM integration later.

Future role-aware UI behavior should support:

- Viewer
- Contributor
- KB Manager
- Admin

### DG-5 — Theme support from day one

The UI must support:

- Light mode
- Dark mode
- System mode

Default mode must be `system`.

### DG-6 — Speech-to-text readiness

The Chat composer must be architected so that speech-to-text dictation can be added later without redesigning the Chat screen.

Speech input must be feature-flagged and disabled by default.

---

## Non-Goals

This SDD does not include:

- Implementing Retriva Gateway
- Implementing Retriva Core APIs
- Implementing external IAM
- Implementing multi-tenancy
- Implementing Open WebUI compatibility
- Implementing a concrete speech-to-text engine
- Implementing mobile-native apps
- Supporting browser-to-Core direct calls

---

## Application Architecture

Recommended source layout:

```text
src/
  app/
    router/
    layout/
    providers/
  features/
    chat/
    speech-input/
    knowledge-bases/
    ingestion/
    documents/
    metadata/
    artifacts/
    settings/
  components/
    ui/
    layout/
    feedback/
  api/
    gateway-client.ts
    types.ts
  lib/
    files/
    formatting/
    validation/
  styles/
```

Each major product area must be implemented as an isolated feature module.

---

## Primary Navigation

This version must include a persistent application shell with:

```text
Chat
Knowledge Bases
Documents
Ingestion
Artifacts
Settings
```

The layout should use:

- Left sidebar navigation
- Main content area
- Optional right-side inspector panel
- Top bar for current KB, environment status, and global actions

---

## Core Screens

### Chat

Required elements:

- Message timeline
- Streaming-ready assistant responses
- Source citations panel
- Active Knowledge Base selector
- Retrieval settings summary
- Artifact request feedback
- Future microphone button extension point
- Clear empty state

### Knowledge Bases

Required functionality:

- List KBs
- Create KB
- Rename KB
- Delete KB
- View KB document count
- View KB ingestion status summary
- Select default KB for chat and uploads

### Documents

Required functionality:

- List documents
- Filter by KB
- Filter by metadata
- Search by filename/title
- View ingestion status
- View document metadata
- Delete document
- Open source/citation references where available

### Ingestion

Required functionality:

- Upload single files
- Upload multiple files
- Upload entire folders recursively
- Preserve relative folder paths
- Select target Knowledge Base
- Apply metadata to the whole batch
- Override metadata per file
- Show upload progress
- Show ingestion job progress
- Retry failed files
- Cancel pending jobs where supported

### Metadata

Required functionality:

- Define common metadata fields
- Provide reusable metadata presets
- Apply metadata during upload
- Show document metadata
- Validate field values client-side
- Support free-form key/value metadata

### Artifacts

Required functionality:

- List generated artifacts
- Show artifact status
- Download artifacts
- Delete artifacts
- Filter artifacts by format/type
- Open artifact metadata/details

Supported artifact formats/types:

```text
markdown
pdf
document_list
basic_report
docx
xlsx
odt
ods
odp
```

### Settings

Required sections:

- Appearance
- Gateway connection
- Feature flags
- Future voice input settings placeholder

---

## Light / Dark / System Theme Support

Retriva WebUI must support three visual theme modes:

- Light
- Dark
- System

Default mode must be `system`, following the browser or operating-system preference.

Users must be able to override the theme from:

```text
Settings → Appearance
```

Theme preference must be persisted locally in the browser.

The implementation must use design tokens / CSS variables so that all colors, borders, surfaces, shadows, and semantic states are theme-aware.

Example semantic tokens:

```text
--color-bg
--color-surface
--color-surface-muted
--color-border
--color-text
--color-text-muted
--color-primary
--color-danger
--color-warning
--color-success
--shadow-card
```

No component should hardcode theme-specific colors unless explicitly justified.

---

## Speech-to-Text Readiness

### Objective

Retriva WebUI must be architected so that speech-to-text query input can be added later without redesigning the Chat screen or Gateway API.

This version does not implement a concrete speech-to-text engine.

### Design Principle

Speech-to-text is an input method for the Chat composer, not a retrieval or inference feature.

The transcription engine must be abstracted behind a frontend or Gateway-level provider interface.

### Future Supported Modes

The architecture must allow future support for:

- Browser-native speech recognition
- Gateway-mediated speech-to-text
- Cloud speech-to-text providers
- Self-hosted/on-premise speech-to-text engines
- Enterprise-managed STT providers

### Future UX

The Chat composer should be designed so that a microphone button can be added later without layout changes.

Future voice input UX should support:

- Start dictation
- Stop dictation
- Interim transcript preview
- Final transcript insertion into the chat input
- Clear transcript
- Microphone permission denied state
- Unsupported browser state
- Language selection, if enabled

### Speech Input Module

Add a `features/speech-input` module with provider abstraction.

This version may provide a disabled/no-op provider.

Future interface shape:

```text
startListening()
stopListening()
isListening
interimTranscript
finalTranscript
error
```

### Future Gateway STT API

Reserve compatibility with a future Gateway endpoint:

```http
POST /gateway/speech/transcriptions
```

Example future response:

```json
{
  "text": "What is the maximum power consumption of AURA SOM?",
  "language": "en",
  "confidence": 0.93
}
```

This endpoint is not required for this version.

---

## Gateway API Expectations

The frontend expects Retriva Gateway to expose UI-friendly APIs.

### Chat

```http
POST /gateway/chat
```

### Knowledge Bases

```http
GET    /gateway/kbs
POST   /gateway/kbs
GET    /gateway/kbs/{kb_id}
PATCH  /gateway/kbs/{kb_id}
DELETE /gateway/kbs/{kb_id}
```

### Documents

```http
GET    /gateway/documents
GET    /gateway/documents/{doc_id}
DELETE /gateway/documents/{doc_id}
```

### Ingestion

```http
POST /gateway/ingestion/batches
POST /gateway/ingestion/batches/{batch_id}/files
GET  /gateway/ingestion/batches/{batch_id}
POST /gateway/ingestion/batches/{batch_id}/cancel
POST /gateway/ingestion/jobs/{job_id}/retry
```

### Artifacts

```http
POST   /gateway/artifacts
GET    /gateway/artifacts
GET    /gateway/artifacts/{artifact_id}
GET    /gateway/artifacts/{artifact_id}/content
DELETE /gateway/artifacts/{artifact_id}
```

---

## Folder Upload Design

The folder upload flow must support:

```text
drag folder → inspect file tree → assign KB → assign metadata → upload batch → track ingestion
```

Each file must preserve:

```json
{
  "filename": "guide.pdf",
  "relative_path": "CRA/Guides/guide.pdf",
  "size": 123456,
  "content_type": "application/pdf",
  "metadata": {
    "topic": "cybersecurity",
    "regulation": "CRA"
  }
}
```

---

## Runtime Configuration

The frontend must support runtime configuration.

Recommended variables:

```env
VITE_RETRIVA_GATEWAY_BASE_URL=http://localhost:8080
VITE_APP_NAME=Retriva
VITE_ENABLE_AUTH=false
VITE_ENABLE_ARTIFACTS=true
VITE_ENABLE_FOLDER_UPLOAD=true
VITE_ENABLE_SPEECH_INPUT=false
VITE_SPEECH_INPUT_MODE=disabled
```

Future values:

```env
VITE_SPEECH_INPUT_MODE=browser
VITE_SPEECH_INPUT_MODE=gateway
```

---

## Accessibility Requirements

The UI must support:

- Keyboard navigation
- Visible focus states
- Screen-reader labels
- Sufficient contrast
- Non-color-only status indicators
- Accessible file upload controls

---

## Testing Requirements

### Unit tests

Required for:

- format/type mapping
- metadata validation
- file tree flattening
- folder traversal helpers
- artifact request construction
- theme mode resolution
- speech-input no-op provider

### Component tests

Required for:

- KB selector
- metadata form
- upload batch panel
- document table
- artifact card
- chat message rendering
- theme selector
- chat composer speech-input placeholder

### E2E tests

Required flows:

```text
Create KB
Upload folder
Apply metadata
Track ingestion
Ask chat question
Generate PDF artifact
Download artifact
Switch light/dark/system theme
Verify speech input disabled by default
Delete document
```

---

## Acceptance Criteria

1. React app builds and runs locally.
2. Application shell renders with clean enterprise-grade styling.
3. UI supports light mode.
4. UI supports dark mode.
5. UI supports system theme mode.
6. Theme can be changed from Settings.
7. Theme preference persists across reloads.
8. Users can select and manage Knowledge Bases.
9. Users can upload files.
10. Users can upload folders recursively.
11. Relative folder paths are preserved.
12. Users can apply structured metadata without chat directives.
13. Users can track ingestion progress.
14. Users can browse ingested documents.
15. Users can chat against selected KBs.
16. Users can view citations/sources.
17. Users can request and download generated artifacts.
18. Chat composer is prepared for future microphone input.
19. Speech input is disabled by default.
20. Speech-input module is provider-abstracted and does not hardcode a provider.
21. The UI does not call Retriva Core directly.
22. The UI communicates only with Retriva Gateway.
23. No authentication is required in this version.
24. The architecture remains ready for external IAM integration later.

---

## One-Sentence Summary

Retriva WebUI is a React + TypeScript browser application with clean enterprise-grade styling, light/dark/system themes, Retriva-native chat, KBs, recursive ingestion, metadata, documents, artifacts, and future-ready speech-to-text support through a provider abstraction.
