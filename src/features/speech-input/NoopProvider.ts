import { SpeechProvider } from './provider';

export const NoopProvider: SpeechProvider = {
  startListening: () => console.warn('Speech input is disabled'),
  stopListening: () => {},
  isListening: false,
  interimTranscript: '',
  finalTranscript: '',
  error: null,
};
