const GEMINI_MODEL = "gemini-3.5-flash";

// Gemini occasionally returns 503 "currently experiencing high demand" during
// load spikes — this is transient, so retry with backoff instead of failing
// the request immediately. Also covers other typically-transient statuses.
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 4;
const INITIAL_RETRY_DELAY_MS = 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function callGemini(
  apiKey: string,
  systemInstruction: string,
  userPrompt: string,
  responseSchema: object,
) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            { parts: [{ text: `${systemInstruction}\n\nInput: ${userPrompt}` }] },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema,
          },
        }),
      },
    );

    if (response.ok) {
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error("No output received from AI model");
      }
      return JSON.parse(text.trim());
    }

    const errText = await response.text();
    const canRetry = RETRYABLE_STATUS_CODES.has(response.status) && attempt < MAX_RETRIES;

    if (!canRetry) {
      throw new Error(`Gemini API request failed: ${errText}`);
    }

    const delay = INITIAL_RETRY_DELAY_MS * 2 ** attempt; // 1s, 2s, 4s, 8s
    console.warn(
      `Gemini API request failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}, status ${response.status}) — retrying in ${delay}ms`,
      errText,
    );
    await sleep(delay);
  }

  // Unreachable: the loop always returns or throws above.
  throw new Error("Gemini API request failed after retries");
}
