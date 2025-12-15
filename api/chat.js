// api/chat.js (streaming version)

export default async function handler(req, res) {
  // Set CORS headers immediately - using wildcard like your working example
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "false");

  // Handle preflight OPTIONS request early
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const { message } = req.body || {};
  if (!message) {
    return res.status(400).json({ error: "Missing 'message' in request body." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "Server is missing GEMINI_API_KEY environment variable.",
    });
  }

  try {
    // Use the streaming endpoint from Gemini API
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:streamGenerateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: message }] }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({
        error: "Gemini API error",
        details: errText,
      });
    }

    if (!response.body) {
      return res.status(500).json({ error: "No response body from Gemini API" });
    }

    // Set SSE headers AFTER ensuring the request is valid
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      
      // Process the chunk to extract just the text content
      // Gemini API returns JSON objects, we need to parse them
      const lines = chunk.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (text) {
            // Send the text as SSE data
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
          }
        } catch (e) {
          // Skip invalid JSON lines
          console.error('Error parsing chunk:', e);
        }
      }
    }

    res.end();
  } catch (err) {
    console.error('Streaming error:', err);
    // Ensure CORS headers are set even in error cases
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(500).json({
      error: "Internal server error calling Gemini",
      details: err.message,
    });
  }
}
