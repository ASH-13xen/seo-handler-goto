import { NextResponse } from 'next/server';
import {
  TemplateId,
  TEMPLATE_OPTIONS,
  TEMPLATE_PICKER_SCHEMA,
  buildGeminiSchema,
  TONE_OPTIONS,
  LENGTH_OPTIONS,
  ToneId,
  LengthId,
} from '@/lib/blogTemplates';

const GEMINI_MODEL = 'gemini-2.5-flash';
const VALID_TEMPLATE_IDS = TEMPLATE_OPTIONS.map(t => t.id);

async function callGemini(apiKey: string, systemInstruction: string, userPrompt: string, responseSchema: object) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemInstruction}\n\nInput: ${userPrompt}` }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema,
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API request failed: ${errText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('No output received from AI model');
  }
  return JSON.parse(text.trim());
}

function buildSystemInstruction(template: TemplateId, tone: ToneId, length: LengthId, category?: string) {
  const toneOpt = TONE_OPTIONS.find(t => t.id === tone) ?? TONE_OPTIONS[0];
  const lengthOpt = LENGTH_OPTIONS.find(l => l.id === length) ?? LENGTH_OPTIONS[1];
  const templateOpt = TEMPLATE_OPTIONS.find(t => t.id === template)!;

  const shapeNotes: Record<TemplateId, string> = {
    classic: 'Write 3-6 well-developed H2 sections with flowing prose. Include 1-2 short, quotable pull-quote sentences pulled from the article.',
    listicle: 'Write 5-10 distinct, non-overlapping list items, each with a clear title, a short description, and (when genuinely useful) a quick practical tip.',
    howto: 'Write 3-8 ordered, actionable steps. Include a short "what you need" list if relevant, and 2-5 FAQs that real readers would actually ask.',
    comparison: 'Build a genuinely useful comparison table (3-6 rows, consistent column count) with clear headers, balanced pros/cons, and a confident verdict with a 1-5 rating.',
    news: 'Open with a punchy lede, list 3-5 key facts, then write 2-5 sections of analysis. Include 1-2 quotable pull-quote sentences.',
  };

  return `You are an expert blog writer and SEO copywriter. Write a complete, original, well-structured blog post and return it as JSON matching the exact schema provided.
Template: ${templateOpt.name} — ${templateOpt.description}
Tone: ${toneOpt.label} (${toneOpt.description}).
Target length: about ${lengthOpt.wordTarget} words total across all body text fields.
${category ? `Category: ${category}.` : ''}
${shapeNotes[template]}
Rules: Plain text only inside text fields — no markdown headers, no HTML tags. You may use *italic* or **bold** sparingly for emphasis. Never invent statistics, prices, or sources you can't be confident about. The "template" field in your JSON response must be exactly "${template}".`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { topic, keyword, category, tone, length } = body;
    const requestedTemplate: TemplateId | 'auto' = body.template;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured in backend environment' }, { status: 500 });
    }
    if (!topic || typeof topic !== 'string') {
      return NextResponse.json({ error: 'topic is required' }, { status: 400 });
    }
    if (requestedTemplate !== 'auto' && !VALID_TEMPLATE_IDS.includes(requestedTemplate)) {
      return NextResponse.json({ error: 'Invalid template' }, { status: 400 });
    }

    let resolvedTemplate: TemplateId;
    if (requestedTemplate === 'auto') {
      const pickerInstruction = `You are an expert content strategist. Given a blog topic, choose the single best-fitting article template from this list: ${TEMPLATE_OPTIONS.map(t => `${t.id} (${t.description})`).join('; ')}. Respond with JSON containing only the chosen template id.`;
      const picked = await callGemini(apiKey, pickerInstruction, topic, TEMPLATE_PICKER_SCHEMA);
      resolvedTemplate = VALID_TEMPLATE_IDS.includes(picked?.template) ? picked.template : 'classic';
    } else {
      resolvedTemplate = requestedTemplate;
    }

    const systemInstruction = buildSystemInstruction(
      resolvedTemplate,
      (tone as ToneId) || 'professional',
      (length as LengthId) || 'medium',
      category
    );
    const userPrompt = `Topic/brief: ${topic}${keyword ? `\nTarget keyword: ${keyword}` : ''}`;
    const schema = buildGeminiSchema(resolvedTemplate);

    const data = await callGemini(apiKey, systemInstruction, userPrompt, schema);
    data.template = resolvedTemplate;

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('AI Blog Generation error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
