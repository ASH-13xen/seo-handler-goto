import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import path from 'path';
import { sanitizeBlogHtml } from '@/lib/sanitizeHtml';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function imageHtml(url: string): string {
  return `<img src="${url}" alt="" style="border-radius:8px; max-width:100%; height:auto; display:block; margin:18px auto; width:60%;" />`;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const text = ((formData.get('text') as string | null) || '').trim();
    const siteId = (formData.get('siteId') as string | null) || 'general';
    const images = formData.getAll('images').filter((f): f is File => f instanceof File);

    if (!text) {
      return NextResponse.json({ error: 'Please enter some text to convert.' }, { status: 400 });
    }

    if (images.length > 20) {
      return NextResponse.json({ error: 'Please upload 20 images or fewer at a time.' }, { status: 400 });
    }

    const safeSiteId = siteId.replace(/[^a-zA-Z0-9_-]/g, '') || 'general';
    const imageUrls: string[] = [];
    for (let i = 0; i < images.length; i++) {
      const file = images[i];
      if (!file.type.startsWith('image/')) {
        return NextResponse.json({ error: `"${file.name}" is not an image file.` }, { status: 400 });
      }
      if (file.size > 8 * 1024 * 1024) {
        return NextResponse.json({ error: `Image "${file.name}" is larger than 8MB.` }, { status: 400 });
      }
      const ext = path.extname(file.name) || '.png';
      const pathname = `blogs/${safeSiteId}/text-image-${Date.now()}-${i}${ext}`;
      const blob = await put(pathname, file, { access: 'public' });
      imageUrls.push(blob.url);
    }

    const paragraphs = text
      .split(/\n\s*\n+/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`);

    // Spread images evenly between paragraphs so the result reads like a
    // real blog post instead of a wall of text with images dumped at the end.
    const originalLength = paragraphs.length;
    const blocks = [...paragraphs];
    imageUrls.forEach((url, i) => {
      const rawPosition = Math.round(((i + 1) * originalLength) / (imageUrls.length + 1));
      const insertAt = Math.min(rawPosition + i, blocks.length);
      blocks.splice(insertAt, 0, imageHtml(url));
    });

    return NextResponse.json({ html: sanitizeBlogHtml(blocks.join('\n')) });
  } catch (error: any) {
    console.error('Text/image import error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
