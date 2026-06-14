# Retriva Milestone 1 — Whisper.cpp Dictation Integration

Generated SDD pack for implementation with Antigravity.

Date: 2026-06-14
Owner: Andrea Marson
Project: Retriva
Milestone: 1 — Local prototype for voice dictation


# Environment and Configuration — WebUI Voice Dictation

Add or document this variable in `.env.example`:

```env
# Enables microphone dictation in the query input.
VITE_RETRIVA_ENABLE_VOICE_INPUT=true
```

Existing Gateway base URL remains:

```env
VITE_RETRIVA_GATEWAY_BASE_URL=http://localhost:8002
```

## Runtime behavior

If `VITE_RETRIVA_ENABLE_VOICE_INPUT=false`, do not render the dictation control.

If the value is missing, recommended Milestone 1 behavior is to enable dictation by default in development. If the project convention is stricter, use opt-in and document it clearly.

## No direct Whisper URL

Do not add a `VITE_WHISPER_SERVER_URL` variable.

The browser must call only Retriva Gateway:

```text
<gatewayBaseUrl>/stt/transcribe
```
