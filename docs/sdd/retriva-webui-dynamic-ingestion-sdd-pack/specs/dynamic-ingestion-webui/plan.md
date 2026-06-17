# Architecture Plan — Dynamic Ingestion Support in Retriva WebUI

## Phase 0 — Codebase reconnaissance

Before editing, inspect the WebUI repo:

- framework: React/Vue/Svelte/etc.;
- routing approach;
- state management;
- API client layer;
- existing ingestion page/components;
- existing KB selector;
- existing metadata tag editor;
- auth/role capability model;
- test framework;
- styling/design system.

Write findings to `artifacts/dynamic-ingestion-webui/recon.md`.

## Phase 1 — API client

Add or extend Gateway API client for source endpoints:

- list/get/create/update/delete sources;
- sync/pause/resume;
- source status;
- run history.

Use existing HTTP client/interceptor/auth conventions.

## Phase 2 — Types/models

Add models for:

- `ConnectedSource`
- `ConnectorType`
- `SourceStatus`
- `MediaWikiSourceConfig`
- `CreateSourceRequest`
- `SourceRun`
- `SourceStatusSummary`

## Phase 3 — Ingestion page restructuring

Refactor current ingestion page into:

- static ingestion tab using existing components;
- connected sources tab using new components.

Do not break upload behavior.

## Phase 4 — Connected sources list

Implement list view with:

- loading state;
- empty state;
- error state;
- status badges;
- action menu;
- refresh control.

## Phase 5 — Add source wizard

Implement MediaWiki wizard:

1. source type;
2. connection;
3. scope;
4. target KB and metadata;
5. sync policy;
6. review;
7. create.

Credential fields must be transient only.

## Phase 6 — Source detail and operations

Implement source detail page or drawer:

- summary;
- lifecycle progress;
- run history;
- errors;
- actions: sync now, pause, resume, delete.

## Phase 7 — Tests

Add unit/component tests:

- ingestion tabs render;
- existing static upload still present;
- connected source list loads;
- MediaWiki wizard validation;
- create source API call payload;
- credentials not stored in persisted state;
- status rendering;
- pause/resume/sync actions;
- error states.

## Phase 8 — Artifacts

Generate:

- screenshots or textual walkthrough if browser testing is available;
- verification report;
- UX notes;
- API mapping notes.
