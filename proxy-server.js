const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PROXY_PORT = process.env.PROXY_PORT || 3000;
const BACKEND_PORT = process.env.BACKEND_PORT || 3001;

// Enable CORS for all requests
app.use(cors());

// Proxy API requests to backend
app.use('/api', createProxyMiddleware({
  target: `http://localhost:${BACKEND_PORT}`,
  changeOrigin: true,
  logLevel: 'info',
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', proxyPort: PROXY_PORT, backendPort: BACKEND_PORT });
});

app.listen(PROXY_PORT, () => {
  console.log(`\n🚀 Proxy server running on port ${PROXY_PORT}`);
  console.log(`   API requests (/api/*) → http://localhost:${BACKEND_PORT}`);
  console.log(`   Frontend should point to: http://127.0.0.1:${PROXY_PORT}\n`);
});

