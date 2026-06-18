import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Gemini's "Nano Banana" image-generation model family. Same GEMINI_API_KEY,
// no extra signup needed. If this model isn't enabled for the configured key,
// the caller (the blog wizard) is expected to fall back to a placeholder image.
const IMAGE_MODEL = 'gemini-2.5-flash-image';

export async function POST(request: Request) {
  try {
    const { prompt, siteId, slug } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured in backend environment' }, { status: 500 });
    }
    if (!prompt || !siteId || !slug) {
      return NextResponse.json({ error: 'prompt, siteId, and slug are required' }, { status: 400 });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Generate a high quality, photorealistic, editorial-style blog header photo. No text, no watermarks, no logos, no captions baked into the image. Widescreen composition. ${prompt}`,
            }],
          }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini image generation error response:', errText);
      return NextResponse.json({ error: 'Gemini image generation failed', details: errText }, { status: response.status });
    }

    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p: any) => p.inlineData?.data || p.inline_data?.data);
    const inlineData = imagePart?.inlineData ?? imagePart?.inline_data;

    if (!inlineData?.data) {
      return NextResponse.json({ error: 'No image was returned by the AI model' }, { status: 500 });
    }

    const mimeType = inlineData.mimeType || inlineData.mime_type || 'image/png';
    const extension = mimeType.includes('jpeg') ? 'jpg' : mimeType.includes('webp') ? 'webp' : 'png';
    const buffer = Buffer.from(inlineData.data, 'base64');

    const safeSiteId = String(siteId).replace(/[^a-zA-Z0-9_-]/g, '') || 'site';
    const safeSlug = String(slug).replace(/[^a-zA-Z0-9_-]/g, '') || 'image';
    const fileName = `${safeSlug}-${Date.now()}.${extension}`;
    const dir = path.join(process.cwd(), 'public', 'uploads', 'blogs', safeSiteId);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, fileName), buffer);

    return NextResponse.json({ url: `/uploads/blogs/${safeSiteId}/${fileName}` });
  } catch (error: any) {
    console.error('AI Image Generation error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
