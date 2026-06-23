"use client";

import React, { useState } from "react";
import { Wand2, X, Loader, AlertCircle } from "lucide-react";
import { LOOK_OPTIONS, LookId, TONE_OPTIONS, ToneId } from "@/lib/blogTemplates";

interface ModifyHtmlModalProps {
  currentHtml: string;
  onClose: () => void;
  onModified: (html: string) => void;
}

export default function ModifyHtmlModal({
  currentHtml,
  onClose,
  onModified,
}: ModifyHtmlModalProps) {
  const [lookDescription, setLookDescription] = useState("");
  const [selectedLook, setSelectedLook] = useState<LookId | null>(null);
  const [selectedFeel, setSelectedFeel] = useState<ToneId>("professional");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = currentHtml.trim().length > 0;

  async function handleModify() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/modify-blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          html: currentHtml,
          look: selectedLook,
          feel: selectedFeel,
          lookDescription,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to modify the HTML.");
      }
      onModified(json.html);
    } catch (err: any) {
      setError(err.message || "Something went wrong while modifying the content.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-2xl rounded-2xl border border-slate-800 p-6 max-h-[90vh] overflow-y-auto scrollbar-hide">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <Wand2 className="h-4 w-4 text-indigo-400" />
            </div>
            <h2 className="font-bold text-white text-base">Modify Look &amp; Feel with AI</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300" disabled={loading}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {!canSubmit && (
          <div className="p-3 mb-4 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400 text-xs flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            There&apos;s no content in the Raw HTML box yet — write or paste something first, then
            come back here to restyle it.
          </div>
        )}

        {error && (
          <div className="p-3 mb-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader className="h-8 w-8 animate-spin text-indigo-400" />
            <p className="text-sm text-slate-300 font-semibold">Restyling your article...</p>
            <p className="text-xs text-slate-500">This can take up to a minute.</p>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Describe how you&apos;d like the blog to look (optional)
              </label>
              <textarea
                rows={3}
                value={lookDescription}
                onChange={(e) => setLookDescription(e.target.value)}
                placeholder="e.g. more colorful, bigger headings, add a highlighted quote box..."
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-400 mb-2">Or pick a quick style</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {LOOK_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedLook(selectedLook === opt.id ? null : opt.id)}
                    className={`text-left p-3 rounded-xl border transition-all ${
                      selectedLook === opt.id
                        ? "bg-indigo-500/10 border-indigo-500"
                        : "bg-slate-950/40 border-slate-850 hover:border-slate-700"
                    }`}
                  >
                    <div className="font-bold text-xs text-white">{opt.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{opt.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-400 mb-2">How should it feel?</p>
              <div className="grid grid-cols-1 gap-2">
                {TONE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedFeel(opt.id)}
                    className={`text-left px-3.5 py-2.5 rounded-lg border text-sm transition-all ${
                      selectedFeel === opt.id
                        ? "bg-indigo-500/10 border-indigo-500 text-white"
                        : "bg-slate-950/40 border-slate-850 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <span className="font-bold">{opt.label}</span>
                    <span className="text-xs text-slate-400 ml-2">{opt.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-800/80">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleModify}
                disabled={!canSubmit}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs transition-colors"
              >
                <Wand2 className="h-3.5 w-3.5" />
                Modify HTML
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
