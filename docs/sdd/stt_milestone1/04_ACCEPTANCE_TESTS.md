# Retriva Milestone 1 — Whisper.cpp Dictation Integration

Generated SDD pack for implementation with Antigravity.

Date: 2026-06-14
Owner: Andrea Marson
Project: Retriva
Milestone: 1 — Local prototype for voice dictation


# Acceptance Tests — WebUI Voice Dictation

## Manual test prerequisites

- Retriva Gateway running at `VITE_RETRIVA_GATEWAY_BASE_URL`.
- Gateway exposes `POST /stt/transcribe`.
- Browser supports microphone access and `MediaRecorder`.

## Manual smoke test

1. Start WebUI.
2. Open the page containing the existing query input.
3. Confirm a `Dictate` button appears near the query input.
4. Click `Dictate`.
5. Grant microphone permission.
6. Speak a short query.
7. Click `Stop`.
8. Wait for `Transcribing…` to finish.
9. Confirm transcript appears in the query input.
10. Edit the transcript if desired.
11. Submit using the existing Send action.

Expected:

- The transcript is inserted into the input.
- The query is not automatically submitted.
- Existing text query flow still works.

## Append behavior test

1. Type `Please answer:` in the query input.
2. Dictate `what documents mention project alpha`.
3. Stop recording.

Expected query input:

```text
Please answer: what documents mention project alpha
```

Minor transcription differences are acceptable.

## Permission denied test

1. Click `Dictate`.
2. Deny microphone permission.

Expected:

- A clear error message is shown.
- UI returns to idle state.
- Existing text input remains usable.

## Gateway failure test

1. Stop Gateway or make `/stt/transcribe` return an error.
2. Record and stop.

Expected:

- A clear transcription failure message appears.
- Existing text input remains usable.

## Unsupported browser test

Mock or test in a browser without `MediaRecorder` support.

Expected:

- Dictation control is hidden or disabled.
- Existing text input remains usable.

## Automated tests to add where practical

- Component renders in supported environment.
- Component hides/disables in unsupported environment.
- `getUserMedia` is called when dictation starts.
- `fetch` is called with `POST /stt/transcribe` and `FormData`.
- Successful response calls `onTranscript` with trimmed text.
- Failed response shows error message.
- Microphone tracks are stopped after recording.
