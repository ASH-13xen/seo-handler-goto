import { NextResponse } from 'next/server';
import { callGemini } from '@/lib/gemini';
import { LOOK_OPTIONS, LookId, TONE_OPTIONS, ToneId } from '@/lib/blogTemplates';
import { sanitizeBlogHtml } from '@/lib/sanitizeHtml';

const MODIFY_SCHEMA = {
  type: 'OBJECT',
  properties: {
    html: { type: 'STRING', description: 'The restyled blog post HTML fragment' },
  },
  required: ['html'],
};

// Only the tags/attrs the Tiptap editor (and sanitizeBlogHtml's allowlist)
// actually understands — anything else (e.g. a <div> wrapper) would silently
// get dropped the next time this content loads into the visual editor.
const ALLOWED_TAGS_NOTE =
  'p, h2, h3, strong, em, u, s, blockquote, ul, ol, li, a, img, br, table, thead, tbody, tr, th, td, span, figure, figcaption';

function buildSystemInstruction(lookDescription: string, look: LookId | undefined, feel: ToneId) {
  const lookOpt = LOOK_OPTIONS.find((l) => l.id === look);
  const toneOpt = TONE_OPTIONS.find((t) => t.id === feel) ?? TONE_OPTIONS[0];

  return `You are an expert web designer and copy editor. You will be given an existing blog post as an HTML fragment. Restyle and lightly rewrite it to match the requested look and feel, while keeping every fact, claim, and piece of information from the original — do not invent anything new and do not remove substantive content.

Requested look: ${lookOpt ? `${lookOpt.label} — ${lookOpt.description}.` : 'No specific preset chosen.'}${lookDescription ? ` Additional notes from the user on how it should look: "${lookDescription}".` : ''}
Requested feel (tone of voice): ${toneOpt.label} — ${toneOpt.description}.

Rules:
- Return a single self-contained HTML fragment only. Do not include <html>, <head>, <body>, <script>, or <style> tags.
- You may use inline "style" attributes on individual elements (colors, spacing, font-weight, borders, etc.) to achieve the requested look.
- Only use these HTML tags: ${ALLOWED_TAGS_NOTE}.
- Keep every existing <img> tag's "src" exactly as-is — do not invent, remove, or change image URLs. You may adjust an image's inline style (e.g. size, alignment, border-radius) to fit the new look.
- Keep every existing link's "href" exactly as-is.
- Adjust wording only as needed to match the requested tone — do not significantly shorten, summarize away, or remove information.
- Respond with JSON matching the schema: a single "html" field containing the modified HTML fragment as a string.`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { html, look, feel, lookDescription } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured in backend environment' }, { status: 500 });
    }
    if (!html || typeof html !== 'string' || !html.trim()) {
      return NextResponse.json(
        { error: 'There is no content to modify yet — write or paste some HTML first.' },
        { status: 400 },
      );
    }

    const systemInstruction = buildSystemInstruction(
      typeof lookDescription === 'string' ? lookDescription.trim() : '',
      look as LookId | undefined,
      (feel as ToneId) || 'professional',
    );

    const result = await callGemini(apiKey, systemInstruction, html, MODIFY_SCHEMA);
    const modifiedHtml = sanitizeBlogHtml(typeof result?.html === 'string' ? result.html : '');

    if (!modifiedHtml.trim()) {
      return NextResponse.json({ error: 'The AI did not return any usable HTML. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ html: modifiedHtml });
  } catch (error: any) {
    console.error('Modify blog HTML error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
