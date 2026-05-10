export interface SpeechProvider {
  startListening: () => void;
  stopListening: () => void;
  isListening: boolean;
  interimTranscript: string;
  finalTranscript: string;
  error: string | null;
}

export const useSpeechInput = (provider: SpeechProvider) => {
  return provider;
};
