export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': 'https://omar-shandaq.github.io',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    return res.end();
  }

  if (req.method !== 'POST') {
    res.writeHead(405, {
      'Access-Control-Allow-Origin': 'https://omar-shandaq.github.io',
    });
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    res.writeHead(500, {
      'Access-Control-Allow-Origin': 'https://omar-shandaq.github.io',
      'Content-Type': 'application/json',
    });
    return res.end(JSON.stringify({ error: 'Missing Gemini API key' }));
  }

  const { message } = req.body;
  if (!message) {
    res.writeHead(400, {
      'Access-Control-Allow-Origin': 'https://omar-shandaq.github.io',
      'Content-Type': 'application/json',
    });
    return res.end(JSON.stringify({ error: 'Message is required' }));
  }

  // Set SSE headers along with CORS headers
  res.writeHead(200, {
    'Access-Control-Allow-Origin': 'https://omar-shandaq.github.io',
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:streamGenerateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: message }] }],
        }),
      }
    );

    if (!response.body) {
      res.end();
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      res.write(`data: ${chunk}\n\n`);
    }

    res.end();
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
}
