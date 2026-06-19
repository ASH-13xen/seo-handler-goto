import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import path from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const siteId = formData.get('siteId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 8MB' }, { status: 400 });
    }

    const safeSiteId = (siteId || 'general').replace(/[^a-zA-Z0-9_-]/g, '') || 'general';
    const ext = path.extname(file.name) || '.png';
    const pathname = `blogs/${safeSiteId}/upload-${Date.now()}${ext}`;

    const blob = await put(pathname, file, { access: 'public' });

    return NextResponse.json({ url: blob.url });
  } catch (error: any) {
    console.error('File upload error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
