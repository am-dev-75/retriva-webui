# Full Antigravity Flow Prompt — WebUI Dynamic Ingestion

Paste this into Antigravity Manager if slash commands are not registered.

```text
We are adding Connected Sources / dynamic ingestion support to Retriva WebUI.
Use specs/dynamic-ingestion-webui and memory/constitution.md.
Proceed in four phases:

1. DEFINE: inspect repo, refine UI spec, produce definition-review artifact.
2. ARCHITECT: inspect current WebUI architecture, produce recon and task graph, refine plan.
3. EXECUTE: implement Gateway API client, source models, ingestion tabs, connected sources list, MediaWiki wizard, source detail/status/run history/actions, and tests.
4. VERIFY: run checks, test static ingestion compatibility, verify no credential/content leakage, produce verification/security artifacts.

WebUI must only call Gateway APIs. It must not call connectors, Core, Qdrant, Tika, or MediaWiki directly. Do not persist source credentials in browser storage. Preserve static ingestion.
```
