# Retriva Milestone 1 — Whisper.cpp Dictation Integration

Generated SDD pack for implementation with Antigravity.

Date: 2026-06-14
Owner: Andrea Marson
Project: Retriva
Milestone: 1 — Local prototype for voice dictation


# Component Specification — `VoiceInputButton`

## Suggested location

Antigravity should inspect existing structure and choose a project-consistent location, for example:

```text
src/components/VoiceInputButton.tsx
```

or near the chat/query input component.

## Public props

```ts
type VoiceInputButtonProps = {
  gatewayBaseUrl: string;
  onTranscript: (text: string) => void;
  disabled?: boolean;
};
```

## Internal state

```ts
type VoiceState =
  | "unsupported"
  | "idle"
  | "recording"
  | "transcribing"
  | "error";
```

A string union is optional, but the visual behavior must map to these states.

## UI states

### Unsupported

Browser lacks `getUserMedia` or `MediaRecorder`.

Recommended behavior:

- hide the dictation control;
- optionally show nothing to avoid clutter.

### Idle

Button label:

```text
Dictate
```

Accessible label:

```text
Dictate query
```

### Recording

Button label:

```text
Stop
```

Accessible label:

```text
Stop recording
```

Optional helper text:

```text
Recording… click Stop when finished.
```

### Transcribing

Button label:

```text
Transcribing…
```

Button disabled.

### Error

Display short message with `role="alert"` if consistent with the app.

Examples:

```text
Microphone permission is required to dictate a query.
Transcription failed. Please try again or type your query.
```

## API request

```ts
const formData = new FormData();
formData.append("file", audioBlob, "query.webm");
formData.append("language", "auto");

await fetch(`${gatewayBaseUrl}/stt/transcribe`, {
  method: "POST",
  body: formData,
});
```

## Integration behavior

When `onTranscript(text)` fires:

```ts
setQuery((current) => {
  const trimmedCurrent = current.trim();
  const trimmedText = text.trim();

  if (!trimmedCurrent) return trimmedText;
  if (!trimmedText) return trimmedCurrent;

  return `${trimmedCurrent} ${trimmedText}`;
});
```

Do not call the existing send/submit handler.
