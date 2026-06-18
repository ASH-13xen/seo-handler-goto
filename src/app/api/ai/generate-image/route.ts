import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';

// Gemini's "Nano Banana" image-generation model family. Same GEMINI_API_KEY,
// no extra signup needed. If this model isn't enabled for the configured key,
// the caller (the blog wizard) is expected to fall back to a placeholder image.
const IMAGE_MODEL = 'gemini-2.5-flash-image';

export async function POST(request: Request) {
  try {
    const { prompt, siteId, slug, aspectRatio, imageStyle } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured in backend environment' }, { status: 500 });
    }
    if (!prompt || !siteId || !slug) {
      return NextResponse.json({ error: 'prompt, siteId, and slug are required' }, { status: 400 });
    }

    let styleDescription = 'photorealistic, editorial-style';
    if (imageStyle === 'illustration') {
      styleDescription = 'digital art illustration, vibrant colors';
    } else if (imageStyle === 'vector') {
      styleDescription = 'minimalist vector graphic, clean shapes, flat colors';
    } else if (imageStyle === '3d') {
      styleDescription = '3D render, high detail, modern CGI, octane render style';
    }

    let aspectDescription = 'Widescreen 16:9 composition';
    if (aspectRatio === '1:1') {
      aspectDescription = 'Square 1:1 composition';
    } else if (aspectRatio === '4:3') {
      aspectDescription = 'Standard 4:3 photography composition';
    } else if (aspectRatio === '9:16') {
      aspectDescription = 'Vertical 9:16 portrait composition';
    }

    const finalPrompt = `Generate a high quality, ${styleDescription} blog photo. No text, no watermarks, no logos, no captions baked into the image. ${aspectDescription}. Context: ${prompt}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: finalPrompt,
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
    const pathname = `blogs/${safeSiteId}/${fileName}`;

    const blob = await put(pathname, buffer, { access: 'public', contentType: mimeType });

    return NextResponse.json({ url: blob.url });
  } catch (error: any) {
    console.error('AI Image Generation error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
