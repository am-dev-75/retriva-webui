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

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VoiceInputButton } from './VoiceInputButton';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock global objects
const mockGetUserMedia = vi.fn();
const mockStop = vi.fn();
const mockGetTracks = vi.fn(() => [{ stop: mockStop }]);

Object.defineProperty(globalThis.navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia,
  },
  writable: true,
});

class MockMediaRecorder {
  static isTypeSupported = vi.fn(() => true);
  stream: unknown;
  options: unknown;
  state = 'inactive';
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  
  constructor(stream: unknown, options: unknown) {
    this.stream = stream;
    this.options = options;
  }
  
  start() {
    this.state = 'recording';
  }
  
  stop() {
    this.state = 'inactive';
    if (this.onstop) this.onstop();
  }
}

vi.stubGlobal('MediaRecorder', MockMediaRecorder);
globalThis.fetch = vi.fn() as unknown as typeof fetch;

describe('VoiceInputButton', () => {
  const onTranscriptMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserMedia.mockResolvedValue({
      getTracks: mockGetTracks
    });
    
    // Simulate feature flag enabled
    vi.stubEnv('VITE_RETRIVA_ENABLE_VOICE_INPUT', 'true');
  });

  it('does not render when feature flag disabled', () => {
    vi.stubEnv('VITE_RETRIVA_ENABLE_VOICE_INPUT', 'false');
    render(<VoiceInputButton gatewayBaseUrl="http://localhost" onTranscript={onTranscriptMock} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('does not render when browser APIs are unsupported', () => {
    // temporarily remove getUserMedia
    const originalGetUserMedia = globalThis.navigator.mediaDevices.getUserMedia;
    (globalThis.navigator.mediaDevices as unknown as Record<string, unknown>).getUserMedia = undefined;
    
    render(<VoiceInputButton gatewayBaseUrl="http://localhost" onTranscript={onTranscriptMock} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    
    // restore
    (globalThis.navigator.mediaDevices as unknown as Record<string, unknown>).getUserMedia = originalGetUserMedia;
  });

  it('renders Dictate button when enabled and supported', () => {
    render(<VoiceInputButton gatewayBaseUrl="http://localhost" onTranscript={onTranscriptMock} />);
    expect(screen.getByRole('button', { name: 'Dictate query' })).toBeInTheDocument();
  });

  it('calls getUserMedia when Dictate is clicked', async () => {
    render(<VoiceInputButton gatewayBaseUrl="http://localhost" onTranscript={onTranscriptMock} />);
    
    const button = screen.getByRole('button', { name: 'Dictate query' });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
    });
    expect(screen.getByRole('button', { name: 'Stop recording' })).toBeInTheDocument();
  });

  it('calls fetch with /stt/transcribe when recording stops and calls onTranscript', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: ' Hello World ' })
    } as unknown as Response);

    render(<VoiceInputButton gatewayBaseUrl="http://localhost:8000" onTranscript={onTranscriptMock} />);
    
    const button = screen.getByRole('button', { name: 'Dictate query' });
    fireEvent.click(button); // start
    
    await waitFor(() => expect(screen.getByRole('button', { name: 'Stop recording' })).toBeInTheDocument());
    
    fireEvent.click(screen.getByRole('button', { name: 'Stop recording' })); // stop
    
    await waitFor(() => {
      expect(mockGetTracks).toHaveBeenCalled();
      expect(mockStop).toHaveBeenCalled();
      expect(globalThis.fetch).toHaveBeenCalledWith('http://localhost:8000/stt/transcribe', expect.objectContaining({
        method: 'POST',
      }));
    });
    
    await waitFor(() => {
      expect(onTranscriptMock).toHaveBeenCalledWith('Hello World');
    });
  });

  it('shows error when permission is denied', async () => {
    mockGetUserMedia.mockRejectedValueOnce(new Error('Permission denied'));
    
    render(<VoiceInputButton gatewayBaseUrl="http://localhost" onTranscript={onTranscriptMock} />);
    const button = screen.getByRole('button', { name: 'Dictate query' });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Microphone permission is required to dictate a query.');
    });
  });

  it('shows error when transcription fails', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: 'Service unavailable' })
    } as unknown as Response);

    render(<VoiceInputButton gatewayBaseUrl="http://localhost" onTranscript={onTranscriptMock} />);
    
    fireEvent.click(screen.getByRole('button', { name: 'Dictate query' })); // start
    await waitFor(() => screen.getByRole('button', { name: 'Stop recording' }));
    
    fireEvent.click(screen.getByRole('button', { name: 'Stop recording' })); // stop
    
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Service unavailable');
    });
  });

  it('shows empty transcript error when text response is empty', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: '   ' }) // Empty after trim
    } as unknown as Response);

    render(<VoiceInputButton gatewayBaseUrl="http://localhost" onTranscript={onTranscriptMock} />);
    
    fireEvent.click(screen.getByRole('button', { name: 'Dictate query' }));
    await waitFor(() => screen.getByRole('button', { name: 'Stop recording' }));
    
    fireEvent.click(screen.getByRole('button', { name: 'Stop recording' }));
    
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('No speech was detected. Please try again or type your query.');
    });
  });

  it('stops MediaStream tracks after recording', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: 'Test' })
    } as unknown as Response);

    render(<VoiceInputButton gatewayBaseUrl="http://localhost" onTranscript={onTranscriptMock} />);
    
    fireEvent.click(screen.getByRole('button', { name: 'Dictate query' }));
    await waitFor(() => screen.getByRole('button', { name: 'Stop recording' }));
    
    fireEvent.click(screen.getByRole('button', { name: 'Stop recording' }));
    
    await waitFor(() => {
      expect(mockGetTracks).toHaveBeenCalled();
      expect(mockStop).toHaveBeenCalled();
    });
  });
});
