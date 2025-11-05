// API Configuration
export const API_BASE_URL = __DEV__ 
  ? 'http://127.0.0.1:3000'  // Development - use proxy
  : 'https://your-api-domain.com';  // Production - update this when deploying

export const API_ENDPOINTS = {
  GENERATE_WORDSEARCH: `${API_BASE_URL}/api/wordsearch/generate`,
};

