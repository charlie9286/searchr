// API Configuration
export const API_BASE_URL = 'https://searchr-backend.vercel.app';  // Use Vercel backend

export const API_ENDPOINTS = {
  GENERATE_WORDSEARCH: `${API_BASE_URL}/api/wordsearch/generate`,
  MATCHMAKING: `${API_BASE_URL}/api/matchmaking`,
  MULTIPLAYER_QUICKMATCH: `${API_BASE_URL}/api/multiplayer/quickmatch`,
  MULTIPLAYER_CANCEL: `${API_BASE_URL}/api/multiplayer/cancel`,
  MULTIPLAYER_STATUS: `${API_BASE_URL}/api/multiplayer/status`,
};

