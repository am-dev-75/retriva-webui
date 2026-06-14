# Retriva Milestone 1 — Whisper.cpp Dictation Integration

Generated SDD pack for implementation with Antigravity.

Date: 2026-06-14
Owner: Andrea Marson
Project: Retriva
Milestone: 1 — Local prototype for voice dictation


# Software Design Document — WebUI Voice Dictation

## 1. Purpose

Implement Milestone 1 for dictating queries in Retriva WebUI.

The user can click a microphone button, record a query using the browser microphone, send the audio to Retriva Gateway `/stt/transcribe`, and receive a transcript inserted into the existing query textbox.

The user must review/edit the transcript and manually send the query using the existing flow.

## 2. Design principles

- Voice input is progressive enhancement over the existing text input.
- Do not change the existing query submission contract.
- Do not auto-submit transcribed text.
- Keep all backend calls going through Retriva Gateway.
- Keep the component small and reusable.
- Provide clear recording, transcribing, and error states.

## 3. Assumptions

Retriva WebUI is a React + TypeScript + Vite application. It already uses `VITE_RETRIVA_GATEWAY_BASE_URL` to target Retriva Gateway.

Antigravity must inspect the current WebUI codebase to identify:

- the query input component;
- the existing API client pattern;
- styling conventions;
- environment variable usage;
- test framework.

## 4. New feature behavior

### Idle state

- Show microphone/dictation button next to the existing query input.
- Button is disabled if the browser does not support `navigator.mediaDevices.getUserMedia` or `MediaRecorder`.

### Recording state

- When clicked, request microphone permission.
- Start recording with `MediaRecorder`.
- Show a clear stop button and recording indicator.
- Optional: show elapsed seconds if simple to implement.

### Transcribing state

- When stopped, create an audio blob.
- Send multipart request to Gateway:

```http
POST <gatewayBaseUrl>/stt/transcribe
Content-Type: multipart/form-data
```

- Use form fields:

```text
file=query.webm
language=auto
```

### Transcript handling

- If current query input is empty, replace it with transcript.
- If current query input has text, append transcript separated by a space.
- User can edit transcript before submitting.
- Do not automatically submit.

### Error state

Show a concise error message:

- microphone unavailable;
- permission denied;
- transcription failed;
- Gateway unavailable.

Do not expose raw stack traces to users.

## 5. Configuration

Add an optional feature flag:

```env
VITE_RETRIVA_ENABLE_VOICE_INPUT=true
```

If absent, default should be `true` for local development unless project conventions prefer opt-in features.

Gateway base URL remains:

```env
VITE_RETRIVA_GATEWAY_BASE_URL=http://localhost:8002
```

## 6. Browser APIs

Use:

- `navigator.mediaDevices.getUserMedia({ audio: true })`
- `MediaRecorder`
- `Blob`
- `FormData`
- `fetch` or existing project API client

## 7. Accessibility

- Button must have meaningful text or `aria-label`.
- State changes should be visible in text, not icon-only.
- Stop recording must be keyboard-accessible.
- Error message should be readable by assistive technologies if the project has an alert pattern.

## 8. Non-functional requirements

- No audio should be stored in browser local storage.
- Stop all microphone tracks after recording stops or errors.
- Avoid memory leaks by clearing chunks after transcription.
- Component should not break text-only use when browser recording APIs are unavailable.

## 9. Done criteria

- Microphone button appears near query input when feature enabled.
- User can record and stop audio.
- Audio is sent to Gateway `/stt/transcribe`.
- Transcript is inserted/appended into existing query input.
- Existing send/query behavior remains unchanged.
- Clear errors are displayed for permission/API/transcription failures.
