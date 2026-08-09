// Vercel Serverless Function to serve dynamic API configuration to the TV Legacy client.
export default function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Return the configured API base URL and TTS API URL
  res.status(200).json({
    apiBaseUrl: process.env.API_BASE_URL || 'https://13.60.213.156.sslip.io',
    ttsApiUrl: process.env.TTS_API_URL || ''
  });
}

