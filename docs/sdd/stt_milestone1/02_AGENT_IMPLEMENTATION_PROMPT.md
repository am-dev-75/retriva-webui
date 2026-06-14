# Retriva Milestone 1 — Whisper.cpp Dictation Integration

Generated SDD pack for implementation with Antigravity.

Date: 2026-06-14
Owner: Andrea Marson
Project: Retriva
Milestone: 1 — Local prototype for voice dictation


# Antigravity Implementation Prompt — WebUI

You are implementing Milestone 1 voice dictation support for Retriva WebUI.

## Required outcome

Add a microphone dictation control to the existing query UI. The control records browser microphone audio, sends it to Retriva Gateway `/stt/transcribe`, and inserts the returned transcript into the existing query input.

The transcribed query must not be auto-submitted.

## Repository discovery steps

1. Inspect the WebUI repository structure.
2. Identify the main chat/query input component.
3. Identify how `VITE_RETRIVA_GATEWAY_BASE_URL` is read.
4. Identify existing API helper/client pattern.
5. Identify styling conventions.
6. Identify test framework and component test patterns.
7. Implement using existing conventions.

## Implementation steps

1. Add environment flag support:

```env
VITE_RETRIVA_ENABLE_VOICE_INPUT=true
```

2. Create a reusable component, suggested name:

```text
VoiceInputButton.tsx
```

3. Component props:

```ts
type VoiceInputButtonProps = {
  gatewayBaseUrl: string;
  onTranscript: (text: string) => void;
  disabled?: boolean;
};
```

4. Component behavior:
   - detect browser support for `getUserMedia` and `MediaRecorder`;
   - record microphone audio;
   - stop recording on user action;
   - stop microphone tracks after recording;
   - send `FormData` with `file` and `language=auto`;
   - parse JSON response;
   - call `onTranscript(data.text)` if non-empty;
   - show idle, recording, transcribing, and error states.

5. Integrate component beside the existing query input.

6. When transcript is received:
   - if current query is empty, set query to transcript;
   - otherwise append ` ${transcript}`.

7. Add tests if project has test setup:
   - button renders when enabled;
   - unsupported browser state disables/hides button according to chosen UX;
   - successful transcription calls `onTranscript`;
   - failed transcription shows error;
   - recording stop releases tracks.

## Suggested component skeleton

Adapt names, imports, CSS classes, and API helpers to the actual project.

```tsx
import { useMemo, useRef, useState } from "react";

type VoiceInputButtonProps = {
  gatewayBaseUrl: string;
  onTranscript: (text: string) => void;
  disabled?: boolean;
};

export function VoiceInputButton({
  gatewayBaseUrl,
  onTranscript,
  disabled = false,
}: VoiceInputButtonProps) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supported = useMemo(() => {
    return Boolean(
      navigator.mediaDevices?.getUserMedia &&
      typeof window.MediaRecorder !== "undefined"
    );
  }, []);

  async function startRecording() {
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : undefined;

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        stopTracks();
        const audioBlob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        chunksRef.current = [];
        await transcribe(audioBlob);
      };

      recorder.start();
      setRecording(true);
    } catch {
      stopTracks();
      setError("Microphone permission is required to dictate a query.");
    }
  }

  function stopTracks() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    setRecording(false);
  }

  async function transcribe(audioBlob: Blob) {
    setTranscribing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "query.webm");
      formData.append("language", "auto");

      const response = await fetch(`${gatewayBaseUrl}/stt/transcribe`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Transcription failed");

      const data = await response.json();
      const text = typeof data.text === "string" ? data.text.trim() : "";
      if (text) onTranscript(text);
    } catch {
      setError("Transcription failed. Please try again or type your query.");
    } finally {
      setTranscribing(false);
    }
  }

  if (!supported) {
    return null;
  }

  return (
    <div>
      {!recording ? (
        <button
          type="button"
          disabled={disabled || transcribing}
          onClick={startRecording}
          aria-label="Dictate query"
        >
          {transcribing ? "Transcribing…" : "Dictate"}
        </button>
      ) : (
        <button
          type="button"
          onClick={stopRecording}
          aria-label="Stop recording"
        >
          Stop
        </button>
      )}
      {error ? <div role="alert">{error}</div> : null}
    </div>
  );
}
```

## Do not implement in Milestone 1

- Do not submit the query automatically.
- Do not add streaming transcription.
- Do not send audio directly to Whisper server.
- Do not store audio in local storage/session storage.
