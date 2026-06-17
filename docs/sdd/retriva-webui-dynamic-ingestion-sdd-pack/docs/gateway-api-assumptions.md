# Gateway API Assumptions for WebUI

The WebUI SDD assumes Gateway exposes source-management APIs.

If the real Gateway API differs, adapt the API client but preserve the same UI domain model.

## Expected endpoints

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

## WebUI must not

- call connector workers directly;
- call MediaWiki directly;
- call Core directly for dynamic ingestion;
- store credentials in browser persistence.
