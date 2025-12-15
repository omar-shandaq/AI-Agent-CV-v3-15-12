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
    const url = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      res.status(response.status).json({
        error: "Gemini API error",
        details: errText,
      });
      return;
    }

    const data = await response.json();

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || "")
        .join("") || "";

    res.status(200).json({ text, raw: data });
  } catch (err) {
    res.status(500).json({
      error: "Internal server error calling Gemini",
      details: err.message,
    });
  }
}
