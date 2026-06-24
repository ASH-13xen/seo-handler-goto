const GEMINI_MODEL = "gemini-3.5-flash";

export async function callGemini(
  apiKey: string,
  systemInstruction: string,
  userPrompt: string,
  responseSchema: object,
) {
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

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API request failed: ${errText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("No output received from AI model");
  }
  return JSON.parse(text.trim());
}
