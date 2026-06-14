# Retriva Milestone 1 — Whisper.cpp Dictation Integration

Generated SDD pack for implementation with Antigravity.

Date: 2026-06-14
Owner: Andrea Marson
Project: Retriva
Milestone: 1 — Local prototype for voice dictation


# UX Copy — WebUI Voice Dictation

## Button labels

Idle:

```text
Dictate
```

Recording:

```text
Stop
```

Transcribing:

```text
Transcribing…
```

## Accessible labels

```text
Dictate query
Stop recording
```

## Helper text options

Recording:

```text
Recording… click Stop when finished.
```

Transcribing:

```text
Converting speech to text…
```

## Error messages

Microphone unsupported:

```text
Voice input is not supported by this browser.
```

Permission denied:

```text
Microphone permission is required to dictate a query.
```

Transcription failure:

```text
Transcription failed. Please try again or type your query.
```

Empty transcript:

```text
No speech was detected. Please try again or type your query.
```

## Product behavior note

Do not auto-submit a dictated query. The user must review the text and click the existing Send action.
