/**
 * Copyright (C) 2026 Andrea Marson (am.dev.75@gmail.com)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square } from 'lucide-react';

export type VoiceInputButtonProps = {
  gatewayBaseUrl: string;
  onTranscript: (text: string) => void;
  disabled?: boolean;
  language?: string;
};

type StateModel = 'unsupported' | 'idle' | 'recording' | 'transcribing' | 'error';

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  gatewayBaseUrl,
  onTranscript,
  disabled,
  language = 'auto'
}) => {
  const [state, setState] = useState<StateModel>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Check support on mount
  useEffect(() => {
    const isEnabled = import.meta.env.VITE_RETRIVA_ENABLE_VOICE_INPUT !== undefined
      ? import.meta.env.VITE_RETRIVA_ENABLE_VOICE_INPUT === 'true'
      : import.meta.env.DEV;

    if (!isEnabled || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setState('unsupported');
    }
  }, []);

  const startRecording = async () => {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const options = window.MediaRecorder && MediaRecorder.isTypeSupported('audio/webm') 
        ? { mimeType: 'audio/webm' } 
        : undefined;

      const mediaRecorder = new MediaRecorder(stream, options);
      recorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }

        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        chunksRef.current = [];
        setState('transcribing');

        const formData = new FormData();
        formData.append('file', audioBlob, 'query.webm');
        formData.append('language', language);

        try {
          const response = await fetch(`${gatewayBaseUrl}/stt/transcribe`, {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            let detail = 'Transcription failed.';
            try {
              const errData = await response.json();
              if (errData.detail) detail = errData.detail;
            } catch {
              // ignore parse error
            }
            throw new Error(detail);
          }

          const data = await response.json();
          const transcriptTrimmed = (data.text || '').trim();

          if (!transcriptTrimmed) {
            setErrorMsg('No speech was detected. Please try again or type your query.');
            setState('error');
          } else {
            onTranscript(transcriptTrimmed);
            setState('idle');
          }
        } catch (error: unknown) {
          setErrorMsg(error instanceof Error && error.message ? error.message : 'Transcription failed. Please try again or type your query.');
          setState('error');
          console.error('Transcription error:', error);
        }
      };

      mediaRecorder.start();
      setState('recording');
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setErrorMsg('Microphone permission is required to dictate a query.');
      setState('error');
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
  };

  if (state === 'unsupported') {
    return null;
  }

  const isRecording = state === 'recording';
  const isTranscribing = state === 'transcribing';

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      {state === 'error' && errorMsg && (
        <div 
          className="dictation-error" 
          role="alert" 
          style={{ 
            position: 'absolute', 
            bottom: '100%', 
            right: '0', 
            width: 'max-content', 
            maxWidth: '280px', 
            marginBottom: '8px',
            zIndex: 10
          }}
        >
          {errorMsg}
        </div>
      )}
      <button 
        type="button"
        className={`composer-action speech-btn ${isRecording ? 'recording' : ''} ${isTranscribing ? 'transcribing' : ''}`}
        title={isRecording ? 'Stop recording' : isTranscribing ? 'Transcribing...' : 'Dictate query'}
        aria-label={isRecording ? 'Stop recording' : 'Dictate query'}
        disabled={disabled || isTranscribing}
        onClick={(e) => {
          e.preventDefault();
          if (state === 'error') {
            setState('idle');
            setErrorMsg(null);
            startRecording();
          } else if (isRecording) {
            stopRecording();
          } else {
            startRecording();
          }
        }}
      >
        {isRecording ? <Square size={20} className="text-red-500" /> : <Mic size={20} />}
      </button>
    </div>
  );
};
