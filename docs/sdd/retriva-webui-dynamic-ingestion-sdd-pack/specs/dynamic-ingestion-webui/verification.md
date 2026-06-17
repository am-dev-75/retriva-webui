# Verification Plan — Dynamic Ingestion Support in Retriva WebUI

## Automated checks

Run project-native checks. Discover commands from package files/config.

Likely examples:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Only run commands that exist.

## Component tests

Required coverage:

1. Ingestion page shows Static ingestion and Connected Sources.
2. Static ingestion upload UI still renders.
3. Connected Sources empty state renders.
4. Connected Sources list renders mocked sources.
5. Status badges map statuses correctly.
6. Add MediaWiki source wizard validates required fields.
7. Create source calls Gateway API with expected payload.
8. Credential fields are not written to persisted store.
9. Pause/resume/sync actions call correct API methods.
10. Source detail shows baseline/catch-up/active states.
11. Run history displays content-free error summaries.

## Manual smoke tests

With mocked or local Gateway:

```text
1. Open Ingestion page.
2. Confirm static upload flow is still usable.
3. Switch to Connected Sources.
4. Create MediaWiki source.
5. See BASELINE_PENDING / BASELINE_RUNNING status.
6. Trigger Sync Now.
7. Pause and resume source.
8. Open run history.
9. Delete/disconnect source.
```

## Security verification

- Search code for localStorage/sessionStorage use involving credentials.
- Search code for console.log of form payloads.
- Verify review screen redacts secrets.
- Verify WebUI does not import/call MediaWiki client directly.
- Verify API client calls Gateway only.

## Definition of done

- Static ingestion remains functional.
- Connected Sources UI is implemented behind Gateway APIs.
- MediaWiki wizard exists.
- Status/progress/run-history UI exists.
- Build and tests pass or blockers are documented.
- No credential/content leakage in UI state/logging.
