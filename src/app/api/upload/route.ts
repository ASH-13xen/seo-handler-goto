import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const siteId = formData.get('siteId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const safeSiteId = (siteId || 'general').replace(/[^a-zA-Z0-9_-]/g, '') || 'general';
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = path.extname(file.name) || '.png';
    const fileName = `upload-${Date.now()}${ext}`;
    const dir = path.join(process.cwd(), 'public', 'uploads', 'blogs', safeSiteId);
    
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, fileName), buffer);

    return NextResponse.json({ url: `/uploads/blogs/${safeSiteId}/${fileName}` });
  } catch (error: any) {
    console.error('File upload error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
