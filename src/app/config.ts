export const CONFIG = {
  GATEWAY_BASE_URL: import.meta.env.VITE_RETRIVA_GATEWAY_BASE_URL || 'http://localhost:8080',
  APP_NAME: import.meta.env.VITE_APP_NAME || 'Retriva',
  ENABLE_AUTH: import.meta.env.VITE_ENABLE_AUTH === 'true',
  ENABLE_ARTIFACTS: import.meta.env.VITE_ENABLE_ARTIFACTS !== 'false',
  ENABLE_FOLDER_UPLOAD: import.meta.env.VITE_ENABLE_FOLDER_UPLOAD !== 'false',
  ENABLE_SPEECH_INPUT: import.meta.env.VITE_ENABLE_SPEECH_INPUT === 'true',
  SPEECH_INPUT_MODE: import.meta.env.VITE_SPEECH_INPUT_MODE || 'disabled',
};
