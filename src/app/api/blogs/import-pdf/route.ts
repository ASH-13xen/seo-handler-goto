import { NextResponse } from 'next/server';
import { extractTextItems } from 'unpdf';
import { sanitizeBlogHtml } from '@/lib/sanitizeHtml';

interface Line {
  text: string;
  fontSize: number;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
    if (!isPdf) {
      return NextResponse.json({ error: 'File must be a .pdf document' }, { status: 400 });
    }

    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 20MB' }, { status: 400 });
    }

    const data = new Uint8Array(await file.arrayBuffer());
    const { items: pages } = await extractTextItems(data);

    // PDFs have no semantic structure, only positioned glyphs — this groups
    // glyphs into lines using pdf.js's own `hasEOL` flag (best-effort, not a
    // pixel-perfect reconstruction; that trade-off was an explicit decision).
    const lines: Line[] = [];
    let lineParts: string[] = [];
    let lineFontSize = 0;

    const flushLine = () => {
      const text = lineParts.join(' ').replace(/\s+/g, ' ').trim();
      if (text) lines.push({ text, fontSize: lineFontSize });
      lineParts = [];
      lineFontSize = 0;
    };

    for (const page of pages) {
      for (const item of page) {
        if (item.str.trim()) {
          lineParts.push(item.str);
          lineFontSize = Math.max(lineFontSize, item.fontSize);
        }
        if (item.hasEOL) flushLine();
      }
      flushLine();
    }

    if (lines.length === 0) {
      return NextResponse.json(
        {
          error:
            'No readable text was found in this PDF. It may be a scanned/image-only document, which is not supported.',
        },
        { status: 400 },
      );
    }

    const fontSizes = lines.map((l) => l.fontSize).filter((h) => h > 0).sort((a, b) => a - b);
    const medianFontSize = fontSizes[Math.floor(fontSizes.length / 2)] || 12;
    const isHeadingLine = (l: Line) => l.fontSize > medianFontSize * 1.3 && l.text.length < 80;

    // Best-effort title: the largest heading-like line near the top of the doc.
    let title = '';
    const searchWindow = Math.max(3, Math.ceil(lines.length * 0.15));
    const titleIndex = lines.findIndex((l, idx) => idx < searchWindow && isHeadingLine(l));
    if (titleIndex !== -1) {
      title = lines[titleIndex].text;
      lines.splice(titleIndex, 1);
    } else {
      title = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').trim();
    }

    const html = lines
      .map((line) => {
        const escaped = escapeHtml(line.text);
        if (!isHeadingLine(line)) return `<p>${escaped}</p>`;
        return line.fontSize > medianFontSize * 1.6 ? `<h2>${escaped}</h2>` : `<h3>${escaped}</h3>`;
      })
      .join('\n');

    const warnings = [
      'This PDF was converted automatically and the layout may not be perfect — review and tidy up the text below before publishing.',
    ];
    if (titleIndex === -1) {
      warnings.push('No clear title was detected — used the filename as a placeholder.');
    }

    return NextResponse.json({
      html: sanitizeBlogHtml(html),
      title,
      warnings,
    });
  } catch (error: any) {
    console.error('PDF import error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
