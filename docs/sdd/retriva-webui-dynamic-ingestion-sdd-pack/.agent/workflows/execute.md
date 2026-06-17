# /execute — WebUI Dynamic Ingestion Implementation

You are working in the Retriva WebUI repository.

## Purpose

Implement Connected Sources UI support according to the approved plan.

## Inputs

- `specs/dynamic-ingestion-webui/spec.md`
- `specs/dynamic-ingestion-webui/plan.md`
- `memory/constitution.md`
- Existing WebUI codebase

## Instructions

1. Follow existing project conventions.
2. Add/extend Gateway API client for source endpoints.
3. Add types/models for connected sources.
4. Refactor ingestion page into Static ingestion and Connected Sources tabs.
5. Preserve static upload behavior.
6. Implement Connected Sources list.
7. Implement MediaWiki Add Source wizard.
8. Implement source detail/status/run history/actions.
9. Add tests.
10. Do not call MediaWiki or Core directly from WebUI.
11. Do not persist credentials in browser storage.
12. Emit `artifacts/dynamic-ingestion-webui/implementation-notes.md`.

## Required output

- Code changes
- Tests
- Implementation notes artifact
