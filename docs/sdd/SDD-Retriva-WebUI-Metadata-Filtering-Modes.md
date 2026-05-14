# SDD Pack — Retriva WebUI Metadata Filtering Modes

## Status
Proposed

## Scope
Retriva WebUI only.

This SDD modifies Retriva WebUI so users can explicitly choose how selected metadata filters affect retrieval and document discovery.

Target architecture:

```text
Retriva WebUI → Retriva Gateway → Retriva Core
```

---

## Objective

Add explicit UI support for metadata filtering modes:

- **Use as ranking hints** — metadata is used as a soft signal; relevant untagged content may still be included.
- **Require matching metadata** — metadata is a hard constraint; only chunks/documents matching selected metadata filters are eligible.

The UI must remove the need for Gateway-side natural-language intent detection for hard-vs-soft metadata behavior.

---

## UX Behavior

### Documents/Search screen

The Documents/Search screen always performs document discovery.

When users search documents from this screen, WebUI calls:

```http
POST /gateway/documents/search
```

The request must include:

```json
{
  "query": "apollo project",
  "kb_ids": ["default"],
  "metadata_filters": [
    {
      "field": "user_metadata.project",
      "operator": "eq",
      "value": "apollo"
    }
  ],
  "metadata_filter_mode": "soft"
}
```

or:

```json
{
  "metadata_filter_mode": "hard"
}
```

depending on user selection.

### Chat screen

The Chat screen always performs RAG answer generation.

When hard metadata filtering is disabled, WebUI sends:

```json
{
  "metadata_filter_mode": "soft"
}
```

When hard metadata filtering is enabled, WebUI sends:

```json
{
  "metadata_filter_mode": "hard"
}
```

The Chat screen must not attempt document-discovery routing. Chat remains answer-generation oriented.

---

## User-Facing Terminology

Avoid exposing developer wording such as "hard metadata filtering" as the primary label.

Use:

```text
Metadata matching
```

Options:

```text
Use as ranking hints
Require matching metadata
```

Helper text:

### Use as ranking hints

Prefer content matching selected metadata, but allow other relevant content.

### Require matching metadata

Only use content matching selected metadata.

---

## Metadata Filter Model

WebUI must support filters over all chunk payload metadata exposed by Gateway/Core, not only `user_metadata`.

Examples:

```json
{
  "field": "user_metadata.project",
  "operator": "eq",
  "value": "apollo"
}
```

```json
{
  "field": "chunk_type",
  "operator": "eq",
  "value": "image"
}
```

```json
{
  "field": "language",
  "operator": "eq",
  "value": "en"
}
```

Initial required operators:

```text
eq
exists
```

Optional later operators:

```text
neq
contains
in
```

---

## UI Requirements

### Metadata filter panel

The WebUI must provide a metadata filter panel usable from both:

- Documents/Search screen
- Chat screen

The panel must support:

- adding filters
- removing filters
- selecting metadata field
- selecting operator
- entering/selecting value
- choosing metadata matching mode

### Visible state in Chat

When filters are active, the Chat screen must show a compact indicator:

```text
Metadata filters active: project = apollo
Mode: Use as ranking hints
```

or:

```text
Metadata filters active: project = apollo
Mode: Require matching metadata
```

### Empty results guidance

If hard mode returns no matching content, show guidance:

```text
No content matched the selected metadata filters. Try switching metadata matching to "Use as ranking hints".
```

---

## Gateway API Expectations

### POST `/gateway/chat`

WebUI sends:

```json
{
  "message": "What are the costs of the Apollo project?",
  "kb_ids": ["default"],
  "metadata_filters": [
    {
      "field": "user_metadata.project",
      "operator": "eq",
      "value": "apollo"
    }
  ],
  "metadata_filter_mode": "soft",
  "stream": true
}
```

### POST `/gateway/documents/search`

WebUI sends:

```json
{
  "query": "apollo project",
  "kb_ids": ["default"],
  "metadata_filters": [],
  "metadata_filter_mode": "soft",
  "limit": 50
}
```

### GET `/gateway/metadata/schema`

Used to populate available metadata fields.

### GET `/gateway/metadata/values?field=<field>`

Used to populate known values for selected fields.

---

## State Management

Metadata filter state should be reusable between screens but scoped clearly:

- Chat may have active retrieval metadata filters.
- Documents/Search may have active document-discovery metadata filters.
- Persisting filters is optional.

The first implementation may keep filters in local UI state.

---

## Non-Goals

This SDD does not include:

- Implementing Gateway logic
- Implementing Core retrieval logic
- Implementing authentication
- Inferring metadata filters from natural language
- Requiring users to type metadata directives in chat

---

## Acceptance Criteria

1. Documents/Search screen calls `/gateway/documents/search`.
2. Chat screen calls `/gateway/chat`.
3. WebUI sends `metadata_filter_mode=soft` when "Use as ranking hints" is selected.
4. WebUI sends `metadata_filter_mode=hard` when "Require matching metadata" is selected.
5. Filters can target payload metadata fields such as `user_metadata.project`, `chunk_type`, and `language`.
6. Metadata field list is loaded from Gateway metadata schema API.
7. Known field values can be loaded from Gateway metadata values API.
8. Chat displays visible metadata filter state when filters are active.
9. No chat directives are required for metadata filtering.
10. WebUI does not perform natural-language intent detection for metadata hardness.

---

## One-Sentence Summary

Retriva WebUI gains explicit user-controlled metadata filtering modes, using document discovery on the Documents/Search screen and RAG answer generation on the Chat screen.
