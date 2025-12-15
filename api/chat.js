// api/chat.js

export default async function handler(req, res) {
  const allowedOrigin = req.headers.origin || "*";

  // Set CORS headers for all requests
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed. Use POST." });
    return;
  }

  const { prompt } = req.body || {};
  if (!prompt) {
    res.status(400).json({ error: "Missing 'prompt' in request body." });
    return;
  }

  try {
    // Your logic here, e.g., call your AI or Gemini API

    // For demonstration, echo the prompt:
    const reply = `You sent: ${prompt}`;

    res.status(200).json({ reply });
  } catch (error) {
    console.error("Chat handler error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
}
