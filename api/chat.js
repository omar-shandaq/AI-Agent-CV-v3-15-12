export default async function handler(req, res) {
  // CORS headers - allow your frontend origin here
  const ALLOWED_ORIGIN = "https://omar-shandaq.github.io";

  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "false");

  // Handle preflight OPTIONS request early
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // Only POST allowed
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ error: "Method not allowed" }));
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ error: "Missing Gemini API key" }));
  }

  const { message } = req.body || {};
  if (!message) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ error: "Message is required" }));
  }

  // SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:streamGenerateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: message }] }],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      res.write(`data: ${JSON.stringify({ error: "Gemini API error", details: errorText })}\n\n`);
      return res.end();
    }

    if (!response.body) {
      res.end();
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });

      // SSE send chunk as `data: ...\n\n`
      res.write(`data: ${chunk}\n\n`);
    }

    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: "Internal server error", details: err.message })}\n\n`);
    res.end();
  }
}
