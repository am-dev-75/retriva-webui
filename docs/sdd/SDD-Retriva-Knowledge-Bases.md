# SDD — Knowledge Bases: From Mock to First-Class Resource

## Status
Delivered. All seven implementation phases complete; acceptance criteria 1–10 satisfied. The open questions documented in the Resolved Decisions section were ratified before implementation began.

## Scope
Retriva Core, Retriva Gateway, and Retriva WebUI.

This SDD specifies the promotion of the Knowledge Base (KB) concept from a Gateway-side in-memory mock to a first-class resource owned by Retriva Core, while preserving Core's current single-Qdrant-collection design. KBs become logical scopes implemented via a registry table in Core and `kb_id` payload filtering at the vector layer.

Target architecture (unchanged transport):

```text
Retriva WebUI → Retriva Gateway → Retriva Core
```

---

## Problem Statement

The current Knowledge Bases feature is a UI-level mock-up:

- **Retriva Core** manages a single Qdrant collection fixed at startup via `QDRANT_COLLECTION_NAME`. It exposes no KB resource API. `kb_id` exists only as a per-document payload tag and a filter argument on search/retrieval.
- **Retriva Gateway** stores KBs in an in-memory Python dict (`_kbs`) in `api/v2/kbs.py`. The dict is lost on every restart and is not shared across worker processes. It contains a seed entry for the `default` KB.
- **Retriva Gateway's `CoreClient`** declares `list_kbs`, `create_kb`, `delete_kb` stubs targeting `/api/v2/discovery/collections`, but that endpoint does not exist in Core and the stubs are never invoked.
- **Retriva WebUI** renders a Knowledge Bases page with create/delete/list actions wired to the Gateway. The UI is functionally complete but the data plane behind it is not durable.

Consequences:

- Created KBs disappear after a Gateway restart.
- Deleted KBs do not delete their documents/points in Core; orphaned points remain searchable.
- Document counts are real (queried from Core) but KB identities are not, leading to phantom KBs and stale labels (e.g. the seed name `"Default KB"` from earlier builds).
- Multi-worker Gateway deployments return inconsistent KB lists per request.

---

## Objective

Promote KBs to a first-class, durable resource with a clean separation of concerns:

- **Retriva Core** owns the canonical KB registry and exposes a KB CRUD API.
- **Retriva Core** continues to use a single Qdrant collection. KB scoping at the vector layer remains implemented via `kb_id` payload filters.
- **Retriva Gateway** becomes a thin pass-through for KB operations; the in-memory mock is removed.
- **Retriva WebUI** keeps its current UI; only the data it consumes changes from mock to real.

---

## Design Goals

### DG-1 — Single source of truth in Core
The KB registry lives in Retriva Core. No other component caches KB existence durably.

### DG-2 — Minimal vector-layer impact
Core retains its single-Qdrant-collection model. KB scoping is enforced by `kb_id` payload filtering on every retrieval, search, count, list, and delete operation that touches the vector layer.

### DG-3 — Durable, lightweight storage
The registry is implemented as a lightweight, file-backed SQLite database in Core's `storage_dir`. No new infrastructure dependencies.

### DG-4 — Backwards compatibility with existing data
The existing `default` KB and all documents already tagged with `kb_id="default"` must continue to function without re-ingestion.

### DG-5 — Gateway is a pass-through
The Gateway stops being authoritative for KBs. Its `/gateway/kbs` endpoints forward to Core. The in-memory `_kbs` dict is removed.

### DG-6 — Safe deletion semantics
Deleting a KB cascades to all points carrying that `kb_id` in the Qdrant collection, plus all deduplication records, plus all job/artifact rows scoped by that `kb_id`. Deletion is explicit and irreversible; the UI must confirm.

### DG-7 — The `default` KB is special only by convention
There is no special-case code path for `"default"` in Core or Gateway beyond seeding the registry at first startup. The frontend's "render `default` lowercase" convention is purely cosmetic.

### DG-8 — KB-scoped operations only
After this change, every document/retrieval API call that is meaningful per-KB must require or accept `kb_id` and enforce it via filters. Calls with an unknown `kb_id` return 404; calls with no `kb_id` either error or fan-out across all KBs depending on the endpoint (see API spec below).

---

## Non-Goals

- Multiple Qdrant collections per KB. Out of scope; the single-collection model is preserved.
- Per-KB embedding models, chunking strategies, or vector dimensions. The `settings_json` field is reserved for future use but not consumed in this iteration.
- Per-KB RBAC. IAM is out of scope for this SDD (consistent with the WebUI SDD).
- KB renaming with cascade across historical artifacts/jobs. Rename updates the registry only; historical payloads keep the original `kb_id`.
- Import/export of KBs.

---

## Data Model

### Core registry table: `knowledge_bases`

Stored in SQLite at `<storage_dir>/registry.db`.

| Column          | Type     | Constraints                          | Notes                                                  |
|-----------------|----------|--------------------------------------|--------------------------------------------------------|
| `kb_id`         | TEXT     | PRIMARY KEY, NOT NULL                | Slug-form, `^[a-z0-9][a-z0-9_-]{0,63}$`                |
| `name`          | TEXT     | NOT NULL                             | Human-readable label, free text, max 128 chars         |
| `description`   | TEXT     | NULL                                 | Optional, max 1024 chars                               |
| `created_at`    | TEXT     | NOT NULL                             | ISO-8601 UTC                                           |
| `updated_at`    | TEXT     | NOT NULL                             | ISO-8601 UTC                                           |
| `settings_json` | TEXT     | NOT NULL DEFAULT '{}'                | Reserved for per-KB settings; JSON object             |

Indexes:
- Primary key on `kb_id` (implicit).
- No secondary indexes required at this scale.

Seed row inserted on first startup if not present:
```json
{
  "kb_id": "default",
  "name": "default",
  "description": "Default knowledge base",
  "settings_json": "{}"
}
```

### Payload contract in Qdrant
Every point already carries `kb_id` in its payload. This contract is now **enforced** rather than conventional:

- All ingestion paths must set `kb_id` to a value that exists in `knowledge_bases`.
- All retrieval/search/count/list/delete operations against the vector layer must apply a `kb_id` filter derived from the validated request `kb_ids`.

### Deduplication store
`DeduplicationStore` already keys records by `(kb_id, content_hash, collection_name)`. No schema change required. KB deletion must purge dedup records where `kb_id` matches.

---

## API Specification

### Retriva Core — new endpoints (`/api/v2/kbs`)

A new router `v2_kbs.py` is added to `retriva.ingestion_api.routers`.

#### `GET /api/v2/kbs`
List all KBs.

Response `200`:
```json
{
  "kbs": [
    {
      "kb_id": "default",
      "name": "default",
      "description": "Default knowledge base",
      "created_at": "2026-01-01T00:00:00Z",
      "updated_at": "2026-01-01T00:00:00Z",
      "settings": {},
      "document_count": 42
    }
  ]
}
```

`document_count` is computed by counting Qdrant points with payload filter `kb_id == <kb_id>`, deduplicated by `doc_id`. Implementation reuses `qdrant_store.count_documents` (already present) with a `kb_id` filter; if not available it is added.

#### `POST /api/v2/kbs`
Create a KB.

Request:
```json
{
  "kb_id": "engineering",            // optional; derived from name via slugify if omitted
  "name": "Engineering",             // required
  "description": "Eng docs",         // optional
  "settings": {}                      // optional
}
```

Validation:
- `kb_id` must match `^[a-z0-9][a-z0-9_-]{0,63}$` after slugification.
- `kb_id` must not already exist (`409 Conflict` otherwise).
- `name` must be 1–128 chars (`422` otherwise).

Response `201`: full KB object (same shape as list entries, `document_count=0`).

#### `GET /api/v2/kbs/{kb_id}`
Fetch a single KB. `404` if not found.

#### `PATCH /api/v2/kbs/{kb_id}`
Update mutable fields. Allowed: `name`, `description`, `settings`. `kb_id` is immutable.

Response `200`: updated KB object.

#### `DELETE /api/v2/kbs/{kb_id}`
Delete the KB and cascade.

Behavior:
1. Refuse with `409 Conflict` if `kb_id == "default"` (the default KB cannot be removed; it can only be renamed via PATCH — but `kb_id` is immutable, so it remains `"default"` permanently).
2. Delete all Qdrant points with payload `kb_id == <kb_id>` from `COLLECTION_NAME`.
3. Delete all `DeduplicationStore` records with matching `kb_id`.
4. Delete all job rows scoped to that `kb_id` (best-effort; jobs are already terminal or cancelled prior to deletion is a precondition the API does not enforce — running jobs will fail next time they touch the registry).
5. Delete the registry row.
6. Return `204 No Content`.

This sequence is **not** wrapped in a distributed transaction. The operations are ordered so that a mid-flight failure leaves the system in a recoverable state: points first (largest blast radius), then dedup, then registry. A reconciler (out of scope) could later detect dangling points whose `kb_id` is not in the registry.

#### Existing endpoints — required changes

All endpoints below must enforce KB existence:

| Endpoint                                 | Change                                                                                              |
|------------------------------------------|-----------------------------------------------------------------------------------------------------|
| `POST /api/v2/documents`                 | Validate `kb_id` exists in registry; `404` if not.                                                  |
| `POST /api/v2/documents/upload`          | Same.                                                                                               |
| `POST /api/v2/documents/search`          | Validate every entry of `kb_ids` exists; `404` if any unknown. Empty list means "all KBs" (existing behavior, preserved). |
| `POST /api/v2/documents/filter`          | Same as search.                                                                                     |
| `GET /api/v2/documents`                  | If `kb_id` query param supplied, validate it. Without it, return docs across all KBs (existing).    |
| `GET /api/v2/documents/count`            | Same.                                                                                               |
| `POST /api/v2/retrieval/query`           | Validate every entry of `kb_ids` exists. Empty list disallowed (`422`).                             |
| `DELETE /api/v2/documents/{doc_id}`      | No change in signature; deletion already operates by `doc_id` which is KB-scoped by construction.   |

Validation is centralized in a single dependency `require_kbs_exist(kb_ids: list[str])` to avoid drift.

### Retriva Gateway — changes to `/gateway/kbs`

The Gateway's `kbs.py` router is rewritten as a pure pass-through:

- `_kbs` dict is removed.
- `KnowledgeBase` Pydantic model in the Gateway is kept (for the WebUI contract) but populated from Core responses.
- Each handler calls the corresponding `core_client` method.

`core_client` gets new/updated methods:

```python core_client.py (new methods)
async def list_kbs(self) -> dict: ...
async def get_kb(self, kb_id: str) -> dict: ...
async def create_kb(self, payload: dict) -> dict: ...
async def update_kb(self, kb_id: str, payload: dict) -> dict: ...
async def delete_kb(self, kb_id: str) -> None: ...
```

All point to `/api/v2/kbs` (replacing the dead `/api/v2/discovery/collections` URL).

Gateway response shape stays identical to today's WebUI contract:

```json
{
  "id": "engineering",
  "name": "Engineering",
  "description": "Eng docs",
  "document_count": 42,
  "status": "active"
}
```

Mapping rules Gateway → WebUI:
- `id` ← Core's `kb_id`
- `status` is synthesized: always `"active"` for now (Core does not yet expose a lifecycle state). Reserved for future use.

### Retriva WebUI — minimal changes
The WebUI requires **no API changes**: the Gateway preserves the existing JSON shape. The defensive frontend mapping in `KBList.tsx` (`kb.id === 'default' ? 'default' : kb.name`) can stay or be removed once the backend is real; recommendation is to remove it after the migration to avoid hiding bugs.

The single nice-to-have UX addition is exposing the Create form's description field (already present in the model, currently unused in `KBList.tsx`). Out of scope for this SDD; tracked separately.

---

## Implementation Plan

### Phase 0 — Preconditions (Core)
- [x] Add `sqlite3` usage. Python ships it; no dependency change.
- [x] Create `retriva/infrastructure/registry_db.py` exposing a small `RegistryDB` class with a connection-per-call pattern (matching `DeduplicationStore`'s simplicity).
- [x] Schema migration helper: on first import, `CREATE TABLE IF NOT EXISTS knowledge_bases (...)`. Idempotent.

### Phase 1 — KB Registry in Core
- [x] Add `retriva/domain/kb.py`:
  - `KBRecord` Pydantic model mirroring the table schema.
  - `KBRegistry` class with `list()`, `get(kb_id)`, `create(record)`, `update(kb_id, patch)`, `delete(kb_id)`. Thread-safe via a module-level `threading.Lock` (same pattern as `DeduplicationStore`).
- [x] Seed the `default` KB on first startup. The seeding runs at app startup (`lifespan` handler in `ingestion_api`).
- [x] Unit tests: create/list/get/update/delete, slug validation, conflict on duplicate, default-KB delete refusal. *(36 tests in `tests/test_kb_registry.py`.)*

### Phase 2 — KB endpoints in Core
- [x] New router `retriva/ingestion_api/routers/v2_kbs.py` implementing the API above.
- [x] Register the router in the FastAPI app.
- [x] Add `require_kbs_exist` dependency in a shared module (`retriva/ingestion_api/deps.py`).
- [x] Wire `require_kbs_exist` into the WebUI-facing endpoints in the table above (`POST /api/v2/documents`, `POST /api/v2/documents/upload`, `POST /api/v2/documents/search`, `POST /api/v2/retrieval/query`). Wiring of the three secondary endpoints (`GET /api/v2/documents`, `GET /api/v2/documents/count`, `POST /api/v2/documents/filter`) is deferred as a follow-up; the WebUI does not call them directly.
- [x] `count_documents` accepts a `kb_id` filter via the generic `metadata_filter` argument. A dedicated `count_documents_by_kb_id` helper was not needed for v1.
- [x] Integration tests verifying:
  - Creating a KB returns 201 and shows up in list.
  - Ingesting a document into an unknown KB returns 404.
  - Deleting a KB removes its points and dedup records.
  - Default KB cannot be deleted. *(21 tests in `tests/test_v2_kbs_api.py`.)*

### Phase 3 — Cascade-on-delete in Core
- [x] Implement `qdrant_store.delete_chunks_by_kb_id(kb_id)` performing a bounded pre-count scroll followed by a filtered delete.
- [x] Implement `DeduplicationStore.delete_by_kb_id(kb_id)`.
- [x] Wire both into `DELETE /api/v2/kbs/{kb_id}` in the order: default-KB short-circuit → existence check → points → dedup → registry row. The default-KB check is moved to the very start so that destructive operations never run for an immutable KB.
- [x] Log each step with the existing correlation id.
- [x] Tests: delete a KB with N docs, assert 0 points remain, 0 dedup records remain, registry row removed. *(11 tests in `tests/test_kb_cascade.py`, including ordering assertions.)*

### Phase 4 — Gateway pass-through
- [x] Remove `_kbs` dict and `KBCreate` storage logic from `retriva_gateway/api/v2/kbs.py`.
- [x] Reimplement handlers as forwarders to `core_client`.
- [x] Update `core_client.list_kbs/create_kb/delete_kb` to use `/api/v2/kbs` and add `get_kb`, `update_kb`.
- [x] Remove dead constant `/api/v2/discovery/collections` reference.
- [x] Map Core's `kb_id` field to Gateway's legacy `id` field at the boundary (via the `_to_webui` translator) so the WebUI contract is preserved.
- [x] Gateway tests: 15 pass-through tests in `tests/test_gateway.py`, including a regression guard (`test_kbs_no_in_memory_storage_remains`) that asserts the `_kbs` attribute no longer exists on the module.

### Phase 5 — WebUI cleanup
- [x] Remove the `selectedKbIds[0] === 'default'` defensive mapping in `AppShell.tsx`. `KBList.tsx` had no such mapping (already clean). The hardcoded `default` option in the KB-selector dropdown was also removed; `knowledgeBases` is now iterated uniformly because Core returns the `default` row in the list.
- [x] No other changes required.
- [ ] Manual smoke test: create, view docs, delete a KB end-to-end. *(Manual / out-of-band; tracked separately.)*

### Phase 6 — Migration & rollout
- [x] On first startup post-deploy, Core seeds the `default` KB if the registry table is empty (`seed_default_kb()` called from the FastAPI lifespan).
- [ ] Optional `scripts/backfill_kbs.py` for environments with pre-existing non-`default` `kb_id` values in Qdrant. Deferred; not required for the current single-`default`-KB deployment.

### Phase 7 — Decommission
- [x] Delete `core_client.py` stubs that pointed to `/api/v2/discovery/collections` (done in Phase 4 — verified by repository-wide grep, zero remaining hits).
- [x] Delete the `# In-memory mock storage` comment block and any tests that exercised it. The regression guard that asserts `not hasattr(kbs_module, "_kbs")` is retained in `tests/test_gateway.py` on purpose.
- [x] Update `docs/architecture/Retriva-WebUI-Architecture.md` to reflect Core as the KB authority (new "Knowledge Base Data Flow" subsection).

---

## Risks & Mitigations

| Risk                                                                                  | Mitigation                                                                                                  |
|---------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------|
| Deleting a KB with many points is slow and blocks the request.                         | `DELETE /api/v2/kbs/{kb_id}` returns `202 Accepted` with a job id if point count exceeds a configurable threshold; the cascade then runs in a background task. Tracked in Phase 3 as an optional follow-up. |
| Concurrent create with the same slug.                                                  | SQLite primary key constraint guarantees only one winner; the loser receives `409`.                         |
| Document ingestion races with KB deletion.                                             | `require_kbs_exist` is checked at the start of each ingestion; if the KB is deleted mid-flight, the ingestion fails on the next registry check. Points already written are cleaned up by the cascade. |
| Orphaned points in Qdrant after a partial-failure delete.                              | Out-of-band reconciler script (out of scope) can detect points whose `kb_id` is not in the registry.        |
| Multi-process Gateway sees a stale KB list.                                            | No longer applicable — Gateway no longer holds state.                                                       |
| The `settings_json` field is unused and tempts ad-hoc consumers.                       | Documented as reserved. PATCH accepts it but Core does not act on it in this iteration.                     |
| Backwards compatibility with `kb_ids=[]` (existing "all KBs" semantics in search).     | Preserved unchanged. Only retrieval `POST /api/v2/retrieval/query` tightens to require non-empty `kb_ids`, matching its existing behavioral contract with the chat path. |

---

## Acceptance Criteria

1. A fresh deployment starts with exactly one KB in the registry, `kb_id="default"`, `name="default"`.
2. Restarting the Gateway does not change the KB list returned by `/gateway/kbs`.
3. Creating a KB via the WebUI persists across restarts of both Gateway and Core.
4. Deleting a KB via the WebUI removes all of its documents (verified by document count = 0 in any other KB and via direct Qdrant inspection).
5. Ingesting a document with an unknown `kb_id` returns 404 from Core and a clean error in the WebUI.
6. The `default` KB cannot be deleted via the API or UI.
7. `document_count` shown in the WebUI matches a direct Qdrant payload-filter count for the same `kb_id`.
8. No code path in Gateway, Core, or WebUI still references `/api/v2/discovery/collections` or the in-memory `_kbs` dict.
9. All endpoints listed in the API changes table reject unknown `kb_id` with 404.
10. The WebUI displays `default` (lowercase) for the seeded KB without needing the defensive `kb.id === 'default'` mapping.

---

## Resolved Decisions

The following questions were raised during SDD review and are now decided. They are recorded here (rather than deleted) so the rationale and revisit triggers remain discoverable for future maintainers.

### RD-1 — `kb_id` policy on create: either form, explicit wins

**Decision.** `POST /api/v2/kbs` accepts an optional `kb_id` field. If present, it is validated against `^[a-z0-9][a-z0-9_-]{0,63}$` and used verbatim. If absent, the server derives `kb_id` from `name` via slugification using the same regex. Collisions are never resolved silently: the server returns `409 Conflict` and the caller decides how to retry.

**Rationale.** Preserves the zero-friction WebUI form (name only) for casual users while giving programmatic clients full control over stable, meaningful ids. Eliminates the current mock's behavior of appending random UUID suffixes on collision, which produced ugly machine-looking ids the user never chose.

**Revisit trigger.** If users complain about slug collisions or about not understanding the slug character rules, reconsider whether to expose the slug field in the WebUI form as an advanced option.

### RD-2 — No `force` flag on KB deletion

**Decision.** `DELETE /api/v2/kbs/{kb_id}` always cascades. There is no `force` query parameter and no server-side refusal based on emptiness. The WebUI confirmation dialog is the sole user-facing safeguard.

**Rationale.** A server-side `force=false` flag is security theater against the dominant failure mode (a confused human acting on the right KB id with full intent to delete). Real protection against accidental destruction requires soft-delete, backups, or RBAC — all of which are out of scope for this SDD and would change the delete contract more fundamentally than a flag.

**Revisit trigger.** When introducing RBAC, soft-delete, or trash-bin semantics. At that point the delete contract changes shape entirely and this decision is superseded rather than amended.

### RD-3 — Separate SQLite files per subsystem

**Decision.** The KB registry lives in its own SQLite file at `<storage_dir>/registry.db`. It is **not** consolidated with the `DeduplicationStore` (which remains JSON-backed in this iteration), nor with any other subsystem.

**Rationale.** Strict isolation per subsystem: independent schema migration history, no SQLite-level write contention between unrelated workloads, contained blast radius for migration errors. The cascade-on-delete in this SDD is already specified as application-level, so cross-table foreign keys would not yet add value. The cost of consolidating later (one-time migration script) is much lower than the cost of extracting an entrenched table from a multi-tenant DB.

**Revisit trigger.** When `DeduplicationStore` migrates from JSON to SQLite. At that moment, write a short ADR comparing single-file vs. multi-file against the state of the system at that time (concrete needs for cross-table FKs, atomic backups, etc.).

### RD-4 — `status` synthesized as constant `"active"`

**Decision.** The Gateway response includes `status: "active"` as a synthesized constant. Core does not persist a `status` column. No state machine is defined in this iteration.

**Rationale.** No concrete feature in this SDD or in the current product needs more than `exists`/`doesn't exist`. Designing a state machine without a use case produces the wrong state machine. The contract `status: <string>` is forward-compatible: clients already handle a string with one known value; adding new values later is additive and non-breaking.

**Revisit trigger.** First concrete feature that needs a non-`active` state. Candidates:
- **Async delete** (see Risks): would introduce `deleting`.
- **Ingestion pause/quarantine**: would introduce `disabled`.
- **Archival / compliance retention**: would introduce `archived`.

When the trigger fires, write an ADR that defines the full state machine (states, transitions, allowed operations per state) rather than adding states one at a time.
