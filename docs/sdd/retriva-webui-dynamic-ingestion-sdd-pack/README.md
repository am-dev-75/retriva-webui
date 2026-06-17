# Retriva WebUI Dynamic Ingestion — Antigravity SDD Pack

This pack is intended to be copied into the **retriva-webui** repository root and used with Google Antigravity / Antigravity IDE as a Spec-Driven Development (SDD) kit.

It defines a `/define -> /architect -> /execute -> /verify` flow to add **dynamic ingestion / Connected Sources** support to Retriva WebUI.

The first dynamic source type is **MediaWiki**, with future support planned for SharePoint, OneDrive, Google Drive, SFTP folders, and other enterprise repositories.

## What this pack assumes

Retriva architecture:

- **Retriva WebUI** is the user-facing interface.
- **Retriva Gateway** is the BFF/control-plane API used by the WebUI.
- **Retriva Core** remains behind Gateway and performs canonical ingestion.
- **Dynamic connectors** are configured through WebUI but run behind Gateway/Connector Manager.

The WebUI must **not** talk directly to connectors, Qdrant, Tika, or Core. It must use Gateway APIs only.

## Install into an existing repository

From the root of `retriva-webui`:

```bash
unzip retriva-webui-dynamic-ingestion-sdd-pack.zip -d /tmp/retriva-webui-sdd
cp -r /tmp/retriva-webui-sdd/retriva-webui-dynamic-ingestion-sdd-pack/.agent .
cp -r /tmp/retriva-webui-sdd/retriva-webui-dynamic-ingestion-sdd-pack/memory .
cp -r /tmp/retriva-webui-sdd/retriva-webui-dynamic-ingestion-sdd-pack/specs .
cp -r /tmp/retriva-webui-sdd/retriva-webui-dynamic-ingestion-sdd-pack/templates .
cp -r /tmp/retriva-webui-sdd/retriva-webui-dynamic-ingestion-sdd-pack/prompts .
```

Then open the repository in Antigravity and run:

```text
/define specs/dynamic-ingestion-webui/feature-brief.md
/architect specs/dynamic-ingestion-webui/spec.md
/execute specs/dynamic-ingestion-webui/plan.md
/verify specs/dynamic-ingestion-webui/verification.md
```

If slash commands are not auto-registered, paste the corresponding workflow prompt manually from `.agent/workflows/*.md`.

## Expected feature outcome

The WebUI should evolve the ingestion page into two modes:

```text
Ingestion
├── Static ingestion
│   ├── Upload files
│   ├── Upload folders
│   ├── Select target KB
│   ├── Add metadata
│   └── Start batch
│
└── Connected Sources
    ├── List sources
    ├── Add source wizard
    ├── View source status
    ├── View sync runs/errors
    ├── Run sync now
    ├── Pause/resume
    └── Disconnect/delete source
```

## Non-goals

- Implementing connector workers.
- Calling MediaWiki directly from WebUI.
- Storing source credentials in browser state/local storage.
- Direct WebUI-to-Core ingestion for dynamic sources.
- Implementing Entra/OIDC unless already present and needed for role checks.
