// Template definitions, Gemini response-schema builders, and the HTML renderer
// for AI-generated blog posts. Output of renderBlogHtml() is a fully
// self-contained HTML fragment (markup + a scoped <style> block) so it looks
// right wherever it's embedded (any client site, via dangerouslySetInnerHTML),
// without depending on that site's CSS.

export type TemplateId = 'classic' | 'listicle' | 'howto' | 'comparison' | 'news';

export interface TemplateOption {
  id: TemplateId;
  name: string;
  description: string;
  bestFor: string;
}

export const TEMPLATE_OPTIONS: TemplateOption[] = [
  {
    id: 'classic',
    name: 'Classic Article',
    description: 'Flowing narrative with section headings and a pull quote.',
    bestFor: 'General topics, opinion pieces, explainers',
  },
  {
    id: 'listicle',
    name: 'Listicle',
    description: '"Top N" numbered cards, each with a tip.',
    bestFor: 'Tips, tools, ideas, roundups',
  },
  {
    id: 'howto',
    name: 'How-To Guide',
    description: 'Numbered steps, a "what you need" box, and an FAQ.',
    bestFor: 'Tutorials, walkthroughs, instructions',
  },
  {
    id: 'comparison',
    name: 'Comparison / Review',
    description: 'Comparison table, pros & cons, and a star-rated verdict.',
    bestFor: 'Product reviews, "X vs Y" posts',
  },
  {
    id: 'news',
    name: 'News / Editorial',
    description: 'Bold lede, key-facts box, and closing analysis.',
    bestFor: 'Announcements, updates, opinion/editorial',
  },
];

export const TONE_OPTIONS = [
  { id: 'professional', label: 'Professional', description: 'Polished, authoritative, businesslike' },
  { id: 'conversational', label: 'Conversational', description: 'Friendly and casual, like talking to a friend' },
  { id: 'persuasive', label: 'Persuasive', description: 'Sales-oriented, benefit-driven, confident' },
  { id: 'technical', label: 'Technical', description: 'Precise and detailed, assumes domain knowledge' },
  { id: 'storytelling', label: 'Storytelling', description: 'Narrative-driven, vivid, anecdote-led' },
] as const;
export type ToneId = typeof TONE_OPTIONS[number]['id'];

// Visual style presets for the "Modify with AI" feature (restyling existing
// blog HTML) — distinct from TONE_OPTIONS, which describes the writing voice.
export const LOOK_OPTIONS = [
  { id: 'minimal', label: 'Minimal & Clean', description: 'Lots of white space, simple typography, subtle accents' },
  { id: 'bold', label: 'Bold & Modern', description: 'Big headings, strong colors, high contrast' },
  { id: 'editorial', label: 'Magazine & Editorial', description: 'Pull quotes, elegant emphasis, polished article feel' },
  { id: 'friendly', label: 'Warm & Friendly', description: 'Soft colors, rounded callouts, approachable layout' },
  { id: 'corporate', label: 'Professional & Corporate', description: 'Structured sections, formal spacing, business tone' },
] as const;
export type LookId = typeof LOOK_OPTIONS[number]['id'];

export const LENGTH_OPTIONS = [
  { id: 'short', label: 'Short (~500 words)', wordTarget: 500 },
  { id: 'medium', label: 'Medium (~900 words)', wordTarget: 900 },
  { id: 'long', label: 'Long (~1500 words)', wordTarget: 1500 },
] as const;
export type LengthId = typeof LENGTH_OPTIONS[number]['id'];

export interface InlineImage {
  url: string;
  alt: string;
}

interface BaseContent {
  title: string;
  slug: string;
  summary: string;
  category: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  heroImageAlt: string;
  heroImageQuery: string;
  intro: string;
  conclusion: string;
}

export interface ClassicContent extends BaseContent {
  template: 'classic';
  sections: { heading: string; body: string; bullets?: string[]; image?: InlineImage }[];
  pullQuotes?: string[];
}

export interface ListicleContent extends BaseContent {
  template: 'listicle';
  items: { title: string; description: string; tip?: string; image?: InlineImage }[];
}

export interface HowToContent extends BaseContent {
  template: 'howto';
  needList?: string[];
  steps: { title: string; instructions: string; tip?: string; warning?: string; image?: InlineImage }[];
  faqs?: { question: string; answer: string }[];
}

export interface ComparisonContent extends BaseContent {
  template: 'comparison';
  comparisonTable: { headers: string[]; rows: string[][] };
  pros: string[];
  cons: string[];
  verdict: string;
  rating: number;
}

export interface NewsContent extends BaseContent {
  template: 'news';
  lede: string;
  keyFacts?: string[];
  sections: { heading: string; body: string; image?: InlineImage }[];
  pullQuotes?: string[];
}

export type GeneratedBlogContent =
  | ClassicContent
  | ListicleContent
  | HowToContent
  | ComparisonContent
  | NewsContent;

// ---------------------------------------------------------------------------
// Gemini structured-output schema builders (Google AI "Schema" object format)
// ---------------------------------------------------------------------------

const BASE_SCHEMA_PROPS = {
  title: { type: 'STRING', description: 'A compelling, click-worthy blog post title' },
  slug: { type: 'STRING', description: 'URL-safe kebab-case slug derived from the title' },
  summary: { type: 'STRING', description: 'A 1-2 sentence teaser summary for archive listing previews, plain text' },
  category: { type: 'STRING', description: 'A short category label, e.g. Marketing, Travel, Tech' },
  tags: { type: 'ARRAY', items: { type: 'STRING' }, description: '3-6 short topical tags' },
  seoTitle: { type: 'STRING', description: 'SEO title tag, max 60 characters' },
  seoDescription: { type: 'STRING', description: 'SEO meta description, max 155 characters' },
  heroImageAlt: { type: 'STRING', description: 'Descriptive alt text for the hero/featured image' },
  heroImageQuery: { type: 'STRING', description: 'A short stock-photo search query describing the ideal hero image' },
  intro: { type: 'STRING', description: 'Opening hook paragraph(s). Plain text, no markdown. Separate paragraphs with a blank line.' },
  conclusion: { type: 'STRING', description: 'Closing paragraph that wraps up the article. Plain text, no markdown.' },
};
const BASE_REQUIRED = [
  'title', 'slug', 'summary', 'category', 'tags', 'seoTitle', 'seoDescription',
  'heroImageAlt', 'heroImageQuery', 'intro', 'conclusion',
];

const TEXT_BLOCK = { type: 'STRING', description: 'Plain text, no markdown. Separate paragraphs with a blank line.' };

function buildSchemaForTemplate(template: TemplateId): any {
  switch (template) {
    case 'classic':
      return {
        type: 'OBJECT',
        properties: {
          ...BASE_SCHEMA_PROPS,
          sections: {
            type: 'ARRAY',
            description: '3-6 sections that make up the article body',
            items: {
              type: 'OBJECT',
              properties: {
                heading: { type: 'STRING' },
                body: TEXT_BLOCK,
                bullets: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Optional supporting bullet points' },
              },
              required: ['heading', 'body'],
            },
          },
          pullQuotes: { type: 'ARRAY', items: { type: 'STRING' }, description: '1-2 short, quotable highlight sentences pulled from the article' },
        },
        required: [...BASE_REQUIRED, 'sections'],
      };
    case 'listicle':
      return {
        type: 'OBJECT',
        properties: {
          ...BASE_SCHEMA_PROPS,
          items: {
            type: 'ARRAY',
            description: '5-10 numbered list items',
            items: {
              type: 'OBJECT',
              properties: {
                title: { type: 'STRING' },
                description: TEXT_BLOCK,
                tip: { type: 'STRING', description: 'Optional short pro tip related to this item' },
              },
              required: ['title', 'description'],
            },
          },
        },
        required: [...BASE_REQUIRED, 'items'],
      };
    case 'howto':
      return {
        type: 'OBJECT',
        properties: {
          ...BASE_SCHEMA_PROPS,
          needList: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Optional list of things the reader needs before starting' },
          steps: {
            type: 'ARRAY',
            description: '3-8 ordered steps',
            items: {
              type: 'OBJECT',
              properties: {
                title: { type: 'STRING' },
                instructions: TEXT_BLOCK,
                tip: { type: 'STRING', description: 'Optional helpful tip for this step' },
                warning: { type: 'STRING', description: 'Optional warning or common mistake to avoid for this step' },
              },
              required: ['title', 'instructions'],
            },
          },
          faqs: {
            type: 'ARRAY',
            description: '2-5 frequently asked questions',
            items: {
              type: 'OBJECT',
              properties: { question: { type: 'STRING' }, answer: { type: 'STRING' } },
              required: ['question', 'answer'],
            },
          },
        },
        required: [...BASE_REQUIRED, 'steps'],
      };
    case 'comparison':
      return {
        type: 'OBJECT',
        properties: {
          ...BASE_SCHEMA_PROPS,
          comparisonTable: {
            type: 'OBJECT',
            properties: {
              headers: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Column headers, first column is usually "Feature"' },
              rows: { type: 'ARRAY', items: { type: 'ARRAY', items: { type: 'STRING' } }, description: 'Each row is an array of cell strings matching the headers' },
            },
            required: ['headers', 'rows'],
          },
          pros: { type: 'ARRAY', items: { type: 'STRING' }, description: '3-6 pros' },
          cons: { type: 'ARRAY', items: { type: 'STRING' }, description: '2-5 cons' },
          verdict: TEXT_BLOCK,
          rating: { type: 'NUMBER', description: 'Overall rating out of 5, can be a decimal like 4.5' },
        },
        required: [...BASE_REQUIRED, 'comparisonTable', 'pros', 'cons', 'verdict', 'rating'],
      };
    case 'news':
      return {
        type: 'OBJECT',
        properties: {
          ...BASE_SCHEMA_PROPS,
          lede: { type: 'STRING', description: 'A bold, attention grabbing opening lede paragraph (1-3 sentences)' },
          keyFacts: { type: 'ARRAY', items: { type: 'STRING' }, description: '3-5 short key facts/highlights' },
          sections: {
            type: 'ARRAY',
            description: '2-5 body sections',
            items: {
              type: 'OBJECT',
              properties: { heading: { type: 'STRING' }, body: TEXT_BLOCK },
              required: ['heading', 'body'],
            },
          },
          pullQuotes: { type: 'ARRAY', items: { type: 'STRING' }, description: '1-2 short, quotable sentences' },
        },
        required: [...BASE_REQUIRED, 'lede', 'sections'],
      };
  }
}

export function buildGeminiSchema(template: TemplateId) {
  const schema = buildSchemaForTemplate(template);
  schema.properties = { template: { type: 'STRING', enum: [template] }, ...schema.properties };
  schema.required = ['template', ...schema.required];
  return schema;
}

export const TEMPLATE_PICKER_SCHEMA = {
  type: 'OBJECT',
  properties: {
    template: { type: 'STRING', enum: TEMPLATE_OPTIONS.map(t => t.id) },
  },
  required: ['template'],
};

// ---------------------------------------------------------------------------
// HTML rendering
// ---------------------------------------------------------------------------

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatInline(text: string): string {
  const escaped = escapeHtml(text);
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

function renderParagraphs(text: string | undefined): string {
  if (!text) return '';
  return text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p>${formatInline(p)}</p>`)
    .join('\n');
}

function renderFigure(image?: InlineImage): string {
  if (!image?.url) return '';
  const caption = image.alt ? `<figcaption>${escapeHtml(image.alt)}</figcaption>` : '';
  return `<figure class="sb-figure"><img src="${escapeHtml(image.url)}" alt="${escapeHtml(image.alt || '')}" loading="lazy" />${caption}</figure>`;
}

function renderStars(rating: number): string {
  const filled = Math.max(0, Math.min(5, Math.round(rating)));
  let html = '';
  for (let i = 0; i < 5; i++) {
    html += `<span class="sb-star${i < filled ? ' sb-star-filled' : ''}">★</span>`;
  }
  return html;
}

const BASE_STYLE = `
  .sb { line-height: 1.75; }
  .sb h2 { font-size: 1.55rem; font-weight: 800; margin: 2.25rem 0 1rem; color: inherit; line-height: 1.3; }
  .sb h3 { font-size: 1.2rem; font-weight: 700; margin: 1.5rem 0 0.75rem; color: inherit; line-height: 1.35; }
  .sb p { margin: 0 0 1.25rem; color: inherit; opacity: 0.92; }
  .sb ul, .sb ol { margin: 0 0 1.25rem; padding-left: 1.4rem; color: inherit; opacity: 0.92; }
  .sb li { margin-bottom: 0.4rem; }
  .sb strong { font-weight: 700; opacity: 1; }
  .sb .sb-intro, .sb .sb-lede { font-size: 1.1rem; opacity: 0.95; }
  .sb .sb-figure { margin: 1.75rem 0; }
  .sb .sb-figure img { width: 100%; border-radius: 0.75rem; display: block; }
  .sb .sb-figure figcaption { font-size: 0.8rem; opacity: 0.6; margin-top: 0.5rem; text-align: center; }
  .sb .sb-quote { margin: 1.75rem 0; padding: 1rem 1.5rem; border-left: 4px solid var(--sb-accent); font-style: italic; font-size: 1.1rem; background: var(--sb-tint); border-radius: 0 0.5rem 0.5rem 0; }
`;

function renderPullQuote(quote: string): string {
  return `<blockquote class="sb-quote">${formatInline(quote)}</blockquote>`;
}

function renderClassic(data: ClassicContent): string {
  const sectionsHtml = data.sections.map((section, i) => `
    <h2>${escapeHtml(section.heading)}</h2>
    ${renderFigure(section.image)}
    ${renderParagraphs(section.body)}
    ${section.bullets?.length ? `<ul>${section.bullets.map(b => `<li>${formatInline(b)}</li>`).join('')}</ul>` : ''}
    ${i === 0 && data.pullQuotes?.[0] ? renderPullQuote(data.pullQuotes[0]) : ''}
  `).join('\n');

  return `<div class="sb sb-classic">
<style>
  ${BASE_STYLE}
  .sb-classic { --sb-accent: #6366f1; --sb-tint: rgba(99,102,241,0.1); }
</style>
${renderParagraphs(data.intro)}
${sectionsHtml}
<h2>Conclusion</h2>
${renderParagraphs(data.conclusion)}
</div>`;
}

function renderListicle(data: ListicleContent): string {
  const itemsHtml = data.items.map((item, i) => `
    <div class="sb-list-item">
      <div class="sb-list-badge">${i + 1}</div>
      <div class="sb-list-body">
        <h3>${escapeHtml(item.title)}</h3>
        ${renderFigure(item.image)}
        ${renderParagraphs(item.description)}
        ${item.tip ? `<div class="sb-callout sb-callout-tip">💡 ${formatInline(item.tip)}</div>` : ''}
      </div>
    </div>
  `).join('\n');

  return `<div class="sb sb-listicle">
<style>
  ${BASE_STYLE}
  .sb-listicle { --sb-accent: #f59e0b; --sb-tint: rgba(245,158,11,0.1); }
  .sb-listicle .sb-list-item { display: flex; gap: 1rem; margin-bottom: 1.75rem; align-items: flex-start; }
  .sb-listicle .sb-list-badge { flex-shrink: 0; width: 2.25rem; height: 2.25rem; border-radius: 50%; background: var(--sb-accent); color: #1a1300; font-weight: 800; display: flex; align-items: center; justify-content: center; font-size: 1rem; }
  .sb-listicle .sb-list-body { flex: 1; min-width: 0; }
  .sb-listicle .sb-list-body h3 { margin-top: 0; }
  .sb-listicle .sb-callout { padding: 0.65rem 1rem; border-radius: 0.5rem; background: #fffbeb; color: #78350f; font-size: 0.92rem; }
</style>
${renderParagraphs(data.intro)}
<div class="sb-list">
${itemsHtml}
</div>
<h2>Final Thoughts</h2>
${renderParagraphs(data.conclusion)}
</div>`;
}

function renderHowTo(data: HowToContent): string {
  const stepsHtml = data.steps.map((step, i) => `
    <div class="sb-step">
      <div class="sb-step-num">${i + 1}</div>
      <div class="sb-step-body">
        <h3>${escapeHtml(step.title)}</h3>
        ${renderFigure(step.image)}
        ${renderParagraphs(step.instructions)}
        ${step.tip ? `<div class="sb-callout sb-callout-tip">💡 Tip: ${formatInline(step.tip)}</div>` : ''}
        ${step.warning ? `<div class="sb-callout sb-callout-warning">⚠️ ${formatInline(step.warning)}</div>` : ''}
      </div>
    </div>
  `).join('\n');

  const faqsHtml = data.faqs?.length
    ? `<h2>Frequently Asked Questions</h2>
       <div class="sb-faqs">
         ${data.faqs.map(f => `<details class="sb-faq"><summary>${escapeHtml(f.question)}</summary>${renderParagraphs(f.answer)}</details>`).join('\n')}
       </div>`
    : '';

  return `<div class="sb sb-howto">
<style>
  ${BASE_STYLE}
  .sb-howto { --sb-accent: #10b981; --sb-tint: rgba(16,185,129,0.1); }
  .sb-howto .sb-needbox { background: var(--sb-tint); border: 1px solid var(--sb-accent); border-radius: 0.75rem; padding: 1.25rem 1.5rem; margin: 1.5rem 0; }
  .sb-howto .sb-needbox h3 { margin-top: 0; }
  .sb-howto .sb-step { display: flex; gap: 1rem; margin-bottom: 1.75rem; align-items: flex-start; }
  .sb-howto .sb-step-num { flex-shrink: 0; width: 2.25rem; height: 2.25rem; border-radius: 50%; background: var(--sb-accent); color: #042f23; font-weight: 800; display: flex; align-items: center; justify-content: center; font-size: 1rem; }
  .sb-howto .sb-step-body { flex: 1; min-width: 0; }
  .sb-howto .sb-step-body h3 { margin-top: 0; }
  .sb-howto .sb-callout { padding: 0.65rem 1rem; border-radius: 0.5rem; margin-bottom: 0.75rem; font-size: 0.92rem; }
  .sb-howto .sb-callout-tip { background: #ecfdf5; color: #064e3b; }
  .sb-howto .sb-callout-warning { background: #fef2f2; color: #7f1d1d; }
  .sb-howto .sb-faq { border: 1px solid rgba(127,127,127,0.25); border-radius: 0.5rem; padding: 0.85rem 1.1rem; margin-bottom: 0.6rem; }
  .sb-howto .sb-faq summary { font-weight: 700; cursor: pointer; }
  .sb-howto .sb-faq p:last-child { margin-bottom: 0; }
</style>
${renderParagraphs(data.intro)}
${data.needList?.length ? `<div class="sb-needbox"><h3>What You'll Need</h3><ul>${data.needList.map(n => `<li>${formatInline(n)}</li>`).join('')}</ul></div>` : ''}
<div class="sb-steps">
${stepsHtml}
</div>
${faqsHtml}
<h2>Wrapping Up</h2>
${renderParagraphs(data.conclusion)}
</div>`;
}

function renderComparison(data: ComparisonContent): string {
  const tableHtml = `
    <table class="sb-table">
      <thead><tr>${data.comparisonTable.headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
      <tbody>
        ${data.comparisonTable.rows.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('\n')}
      </tbody>
    </table>
  `;

  return `<div class="sb sb-comparison">
<style>
  ${BASE_STYLE}
  .sb-comparison { --sb-accent: #8b5cf6; --sb-tint: rgba(139,92,246,0.1); }
  .sb-comparison .sb-table-wrap { overflow-x: auto; margin: 1.5rem 0; border-radius: 0.75rem; border: 1px solid rgba(127,127,127,0.25); }
  .sb-comparison .sb-table { width: 100%; border-collapse: collapse; font-size: 0.92rem; }
  .sb-comparison .sb-table th { background: var(--sb-accent); color: #fff; text-align: left; padding: 0.7rem 1rem; font-weight: 700; }
  .sb-comparison .sb-table td { padding: 0.65rem 1rem; border-top: 1px solid rgba(127,127,127,0.2); color: #1f1235; background: #faf8ff; }
  .sb-comparison .sb-proscons { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 1.5rem 0; }
  .sb-comparison .sb-pros, .sb-comparison .sb-cons { border-radius: 0.75rem; padding: 1.1rem 1.3rem; }
  .sb-comparison .sb-pros { background: #ecfdf5; color: #064e3b; }
  .sb-comparison .sb-cons { background: #fef2f2; color: #7f1d1d; }
  .sb-comparison .sb-pros h3, .sb-comparison .sb-cons h3 { margin-top: 0; color: inherit; }
  .sb-comparison .sb-verdict { background: var(--sb-tint); border: 1px solid var(--sb-accent); border-radius: 0.75rem; padding: 1.25rem 1.5rem; margin: 1.5rem 0; }
  .sb-comparison .sb-verdict h3 { margin-top: 0.25rem; }
  .sb-comparison .sb-stars { font-size: 1.4rem; letter-spacing: 0.15rem; color: rgba(127,127,127,0.35); }
  .sb-comparison .sb-star-filled { color: #f59e0b; }
  @media (max-width: 520px) { .sb-comparison .sb-proscons { grid-template-columns: 1fr; } }
</style>
${renderParagraphs(data.intro)}
<div class="sb-table-wrap">${tableHtml}</div>
<div class="sb-proscons">
  <div class="sb-pros"><h3>Pros</h3><ul>${data.pros.map(p => `<li>${formatInline(p)}</li>`).join('')}</ul></div>
  <div class="sb-cons"><h3>Cons</h3><ul>${data.cons.map(c => `<li>${formatInline(c)}</li>`).join('')}</ul></div>
</div>
<div class="sb-verdict">
  <div class="sb-stars">${renderStars(data.rating)}</div>
  <h3>Verdict</h3>
  ${renderParagraphs(data.verdict)}
</div>
${renderParagraphs(data.conclusion)}
</div>`;
}

function renderNews(data: NewsContent): string {
  const sectionsHtml = data.sections.map((section, i) => `
    <h2>${escapeHtml(section.heading)}</h2>
    ${renderFigure(section.image)}
    ${renderParagraphs(section.body)}
    ${i === 0 && data.pullQuotes?.[0] ? renderPullQuote(data.pullQuotes[0]) : ''}
  `).join('\n');

  return `<div class="sb sb-news">
<style>
  ${BASE_STYLE}
  .sb-news { --sb-accent: #0ea5e9; --sb-tint: rgba(14,165,233,0.1); }
  .sb-news .sb-lede { font-weight: 600; }
  .sb-news .sb-keyfacts { background: var(--sb-tint); border-left: 4px solid var(--sb-accent); border-radius: 0 0.5rem 0.5rem 0; padding: 1rem 1.5rem; margin: 1.5rem 0; }
  .sb-news .sb-keyfacts h3 { margin-top: 0; }
</style>
<p class="sb-lede">${formatInline(data.lede)}</p>
${data.keyFacts?.length ? `<div class="sb-keyfacts"><h3>Key Facts</h3><ul>${data.keyFacts.map(f => `<li>${formatInline(f)}</li>`).join('')}</ul></div>` : ''}
${renderParagraphs(data.intro)}
${sectionsHtml}
<h2>Analysis</h2>
${renderParagraphs(data.conclusion)}
</div>`;
}

export function renderBlogHtml(data: GeneratedBlogContent): string {
  switch (data.template) {
    case 'classic': return renderClassic(data);
    case 'listicle': return renderListicle(data);
    case 'howto': return renderHowTo(data);
    case 'comparison': return renderComparison(data);
    case 'news': return renderNews(data);
  }
}
