# /verify — WebUI Dynamic Ingestion Verification

You are working in the Retriva WebUI repository.

## Purpose

Verify the Connected Sources UI implementation.

## Inputs

- `specs/dynamic-ingestion-webui/spec.md`
- `specs/dynamic-ingestion-webui/plan.md`
- `specs/dynamic-ingestion-webui/verification.md`
- Current code changes

## Instructions

1. Run project-native build/test/lint/typecheck commands if available.
2. Verify static upload still works or is still rendered in tests.
3. Verify Connected Sources UI works with mocked Gateway data.
4. Verify credential fields are not persisted or logged.
5. Verify WebUI calls Gateway only.
6. Generate verification report and security review.
7. If browser testing is available, capture screenshots or a walkthrough artifact.

## Required output

- Passing checks or documented blockers
- `artifacts/dynamic-ingestion-webui/verification-report.md`
- `artifacts/dynamic-ingestion-webui/security-review.md`
- Optional screenshots/walkthrough artifacts
