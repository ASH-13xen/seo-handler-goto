import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import mammoth from 'mammoth';
import { sanitizeBlogHtml } from '@/lib/sanitizeHtml';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const siteId = formData.get('siteId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const isDocx =
      file.name.toLowerCase().endsWith('.docx') ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (!isDocx) {
      return NextResponse.json({ error: 'File must be a .docx document' }, { status: 400 });
    }

    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 15MB' }, { status: 400 });
    }

    const safeSiteId = (siteId || 'general').replace(/[^a-zA-Z0-9_-]/g, '') || 'general';
    let imageCounter = 0;

    const { value: rawHtml, messages } = await mammoth.convertToHtml(
      { buffer: Buffer.from(await file.arrayBuffer()) },
      {
        convertImage: mammoth.images.imgElement(async (image) => {
          const buffer = await image.readAsBuffer();
          const ext = image.contentType?.split('/')[1] || 'png';
          imageCounter += 1;
          const pathname = `blogs/${safeSiteId}/docx-image-${Date.now()}-${imageCounter}.${ext}`;
          const blob = await put(pathname, buffer, { access: 'public', contentType: image.contentType });
          return { src: blob.url };
        }),
      },
    );

    // Mammoth maps Word's "Heading 1" style to <h1>. The CMS already shows
    // the post title separately above the content, so pull the first <h1>
    // out as the suggested title instead of leaving it duplicated in the body.
    let title = '';
    let html = rawHtml;
    const h1Match = rawHtml.match(/<h1[^>]*>(.*?)<\/h1>/i);
    if (h1Match) {
      title = h1Match[1].replace(/<[^>]+>/g, '').trim();
      html = rawHtml.replace(h1Match[0], '');
    } else {
      title = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').trim();
    }

    const warnings = messages
      .filter((m) => m.type === 'warning')
      .map((m) => m.message);
    if (!h1Match) {
      warnings.push('No clear title heading was detected — used the filename as a placeholder.');
    }

    return NextResponse.json({
      html: sanitizeBlogHtml(html),
      title,
      warnings,
    });
  } catch (error: any) {
    console.error('DOCX import error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
