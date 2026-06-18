import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { prompt, type } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured in backend environment' }, { status: 500 });
    }

    if (!prompt) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    // Select the instruction prompt based on request type
    let systemInstruction = "";
    if (type === 'meta') {
      systemInstruction = "You are an expert digital marketer and SEO specialist. Generate a compelling, search-engine-optimized Meta Title (max 60 chars) and Meta Description (max 155 chars) based on the input text. Return a JSON object with 'title' and 'description' properties. Do not wrap in markdown, just return the raw JSON object.";
    } else if (type === 'alt') {
      systemInstruction = "You are an SEO specialist. Generate a descriptive, keyword-rich image alt text (max 125 chars) based on the image description. Return a JSON object with a single 'altText' property.";
    } else if (type === 'outline') {
      systemInstruction = "You are an expert blogger. Create a structured blog outline containing H2 and H3 topics based on the target keyword or title. Return a JSON object with an 'outline' property containing a clean HTML list format (using <ul>, <li> tags).";
    } else {
      systemInstruction = "You are a helpful SEO copywriting assistant. Return a JSON object.";
    }

    // Call the Gemini API directly with structured output config
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemInstruction}\n\nInput: ${prompt}` }] }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API error response:', errText);
      return NextResponse.json({ error: 'Gemini API request failed', details: errText }, { status: response.status });
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      return NextResponse.json({ error: 'No output received from AI model' }, { status: 500 });
    }

    const parsedJson = JSON.parse(generatedText.trim());
    return NextResponse.json(parsedJson);

  } catch (error: any) {
    console.error('AI Generation API error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
