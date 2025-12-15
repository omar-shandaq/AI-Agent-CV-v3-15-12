// /api/chat.js

export const config = {
  runtime: "edge",
};

export default async function handler(req) {
  // --- CORS ---
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // --- BODY ---
  let body;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const {
    prompt,
    model = "models/gemini-1.5-flash",
  } = body || {};

  if (!prompt) {
    return new Response("Missing 'prompt'", { status: 400 });
  }

  // --- ENV ---
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response("Missing GEMINI_API_KEY", { status: 500 });
  }

  // --- GEMINI STREAM ENDPOINT ---
  const url = `https://generativelanguage.googleapis.com/v1beta/${model}:streamGenerateContent?key=${apiKey}`;

  const geminiRes = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
    }),
  });

  if (!geminiRes.ok || !geminiRes.body) {
    return new Response("Gemini API streaming error", { status: 500 });
  }

  // --- STREAM PASSTHROUGH ---
  return new Response(geminiRes.body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache",
    },
  });
}

