# Retriva Milestone 1 — Whisper.cpp Dictation Integration

Generated SDD pack for implementation with Antigravity.

Date: 2026-06-14
Owner: Andrea Marson
Project: Retriva
Milestone: 1 — Local prototype for voice dictation


## Pack: Retriva WebUI Voice Dictation

This pack contains the Software Design Document and implementation instructions for adding a microphone dictation control to Retriva WebUI.

### Goal

Add a microphone button beside the existing query input. Users can record a short utterance, send it to the Gateway `/stt/transcribe` endpoint, receive a transcript, edit it, and then manually submit through the existing Retriva query flow.

### Out of scope for Milestone 1

- Auto-submit after transcription.
- Streaming transcription.
- Wake-word detection.
- Long-running meeting transcription.
- Audio persistence.
- Advanced transcript editing UI.

### Files in this pack

- `01_SDD_WEBUI_VOICE_DICTATION.md` — design document.
- `02_AGENT_IMPLEMENTATION_PROMPT.md` — direct instructions for Antigravity.
- `03_COMPONENT_SPEC.md` — React component behavior and suggested API.
- `04_ACCEPTANCE_TESTS.md` — manual and automated test expectations.
- `05_ENV_CONFIG.md` — required environment variable additions.
- `06_UX_COPY.md` — user-facing labels and states.
