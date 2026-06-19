'use client';

import React, { useState } from 'react';
import { Sparkles, X, ChevronLeft, ChevronRight, Loader, ImageIcon, AlertCircle } from 'lucide-react';
import {
  TEMPLATE_OPTIONS,
  TONE_OPTIONS,
  LENGTH_OPTIONS,
  renderBlogHtml,
  TemplateId,
  ToneId,
  LengthId,
  GeneratedBlogContent,
  InlineImage,
} from '@/lib/blogTemplates';

type ImageStrategy = 'ai' | 'placeholder' | 'suggest' | 'none';

export interface BlogAIWizardResult {
  title: string;
  slug: string;
  summary: string;
  category: string;
  tags: string;
  seoTitle: string;
  seoDescription: string;
  content: string;
  featuredImage: string;
  template: TemplateId;
  imageSuggestion?: { query: string; alt: string };
}

interface BlogAIWizardProps {
  siteId: string;
  onClose: () => void;
  onGenerated: (result: BlogAIWizardResult) => void;
}

const STEP_LABELS = ['Topic', 'Template', 'Tone & Length'];

export default function BlogAIWizard({ siteId, onClose, onGenerated }: BlogAIWizardProps) {
  const [step, setStep] = useState(1);
  const [topic, setTopic] = useState('');
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');
  const [includeText, setIncludeText] = useState('');
  const [template, setTemplate] = useState<TemplateId | 'auto'>('auto');
  const [tone, setTone] = useState<ToneId>('professional');
  const [length, setLength] = useState<LengthId>('medium');

  const [generating, setGenerating] = useState(false);
  const [progressLabel, setProgressLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  const canGoNext = step === 1 ? topic.trim().length > 0 : true;

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      setProgressLabel('Writing your article with Gemini...');
      const res = await fetch('/api/ai/generate-blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, keyword, category, template, tone, length, siteId, includeText }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to generate blog content.');
      }
      const data: GeneratedBlogContent = json.data;

      const featuredImage = '';
      const imageSuggestion = undefined;

      setProgressLabel('Rendering template...');
      const content = renderBlogHtml(data);

      onGenerated({
        title: data.title,
        slug: data.slug,
        summary: data.summary,
        category: data.category,
        tags: data.tags?.join(', ') || '',
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
        content,
        featuredImage,
        template: data.template,
        imageSuggestion,
      });
    } catch (err: any) {
      setError(err.message || 'Something went wrong while generating the post.');
      setGenerating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-2xl rounded-2xl border border-slate-800 p-6 max-h-[90vh] overflow-y-auto scrollbar-hide">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-indigo-400" />
            </div>
            <h2 className="font-bold text-white text-base">AI Blog Generator</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300" disabled={generating}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {!generating && (
          <div className="flex items-center gap-1.5 mb-6">
            {STEP_LABELS.map((label, i) => (
              <div key={label} className="flex items-center gap-1.5 flex-1">
                <div className={`h-1.5 flex-1 rounded-full ${i + 1 <= step ? 'bg-indigo-500' : 'bg-slate-800'}`} />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="p-3 mb-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {generating ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader className="h-8 w-8 animate-spin text-indigo-400" />
            <p className="text-sm text-slate-300 font-semibold">{progressLabel}</p>
            <p className="text-xs text-slate-500">This can take up to a minute.</p>
          </div>
        ) : (
          <>
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">What's this post about?</label>
                  <textarea
                    rows={4}
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Why small businesses in Chhattisgarh should invest in local SEO before festive season"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Target keyword (optional)</label>
                    <input
                      type="text"
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      placeholder="e.g. local seo tips"
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Category (optional)</label>
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="e.g. Marketing"
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Specific text / Key points to include (optional)</label>
                  <textarea
                    rows={3}
                    value={includeText}
                    onChange={(e) => setIncludeText(e.target.value)}
                    placeholder="e.g. Include specific facts, figures, quotes, or services that Gemini must write about..."
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <p className="text-xs text-slate-400 mb-2">Pick the layout that fits this post best.</p>
                <button
                  onClick={() => setTemplate('auto')}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                    template === 'auto' ? 'bg-indigo-500/10 border-indigo-500' : 'bg-slate-950/40 border-slate-850 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-sm text-white">✨ Auto — let AI pick for me</div>
                  <div className="text-xs text-slate-400 mt-0.5">Gemini reads the topic and chooses the best-fitting template below.</div>
                </button>
                {TEMPLATE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setTemplate(opt.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                      template === opt.id ? 'bg-indigo-500/10 border-indigo-500' : 'bg-slate-950/40 border-slate-850 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-sm text-white">{opt.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{opt.description}</div>
                    <div className="text-[10px] text-indigo-400 mt-1 font-semibold uppercase tracking-wide">Best for: {opt.bestFor}</div>
                  </button>
                ))}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2">Tone of voice</label>
                  <div className="grid grid-cols-1 gap-2">
                    {TONE_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setTone(opt.id)}
                        className={`text-left px-3.5 py-2.5 rounded-lg border text-sm transition-all ${
                          tone === opt.id ? 'bg-indigo-500/10 border-indigo-500 text-white' : 'bg-slate-950/40 border-slate-850 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <span className="font-bold">{opt.label}</span>
                        <span className="text-xs text-slate-400 ml-2">{opt.description}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2">Target length</label>
                  <div className="grid grid-cols-3 gap-2">
                    {LENGTH_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setLength(opt.id)}
                        className={`px-3 py-2.5 rounded-lg border text-xs font-bold transition-all ${
                          length === opt.id ? 'bg-indigo-500/10 border-indigo-500 text-white' : 'bg-slate-950/40 border-slate-850 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-6 mt-2 border-t border-slate-800/80">
              <button
                onClick={() => (step === 1 ? onClose() : setStep(step - 1))}
                className="flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                {step === 1 ? 'Cancel' : 'Back'}
              </button>

              {step < 3 ? (
                <button
                  onClick={() => canGoNext && setStep(step + 1)}
                  disabled={!canGoNext}
                  className="flex items-center gap-1 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs transition-colors"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  onClick={handleGenerate}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate Blog Post
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

