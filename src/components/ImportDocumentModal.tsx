"use client";

import React, { useState } from "react";
import { FileUp, X, Loader, AlertCircle, CheckCircle, Upload } from "lucide-react";

export interface ImportDocumentResult {
  html: string;
  title: string;
  warnings: string[];
}

interface ImportDocumentModalProps {
  siteId: string;
  onClose: () => void;
  onImported: (result: ImportDocumentResult) => void;
}

export default function ImportDocumentModal({
  siteId,
  onClose,
  onImported,
}: ImportDocumentModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportDocumentResult | null>(null);

  const handleFilePick = (picked: File | null) => {
    setError(null);
    setResult(null);
    if (!picked) {
      setFile(null);
      return;
    }
    const lower = picked.name.toLowerCase();
    if (!lower.endsWith(".docx") && !lower.endsWith(".pdf")) {
      setError("Please choose a .docx or .pdf file.");
      setFile(null);
      return;
    }
    setFile(picked);
  };

  async function handleConvert() {
    if (!file) return;
    setConverting(true);
    setError(null);
    try {
      const endpoint = file.name.toLowerCase().endsWith(".pdf")
        ? "/api/blogs/import-pdf"
        : "/api/blogs/import-docx";
      const formData = new FormData();
      formData.append("file", file);
      formData.append("siteId", siteId);

      const res = await fetch(endpoint, { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to convert the document.");
      }
      setResult(json);
    } catch (err: any) {
      setError(err.message || "Something went wrong while converting the document.");
    } finally {
      setConverting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-2xl rounded-2xl border border-slate-800 p-6 max-h-[90vh] overflow-y-auto scrollbar-hide">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center">
              <FileUp className="h-4 w-4 text-slate-300" />
            </div>
            <h2 className="font-bold text-white text-base">Import Document</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300" disabled={converting}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-xs text-slate-400 mb-5">
          Upload a Word document (.docx) or a PDF and it will be turned into an editable blog
          post — review and tweak it below before publishing.
        </p>

        {error && (
          <div className="p-3 mb-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {converting ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader className="h-8 w-8 animate-spin text-indigo-400" />
            <p className="text-sm text-slate-300 font-semibold">Converting your document…</p>
            <p className="text-xs text-slate-500">This can take a little while for large files.</p>
          </div>
        ) : result ? (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 flex items-start gap-2.5 text-sm">
              <CheckCircle className="h-5 w-5 mt-0.5 shrink-0" />
              <div>
                Converted! Detected title: <span className="font-bold">{result.title}</span>
              </div>
            </div>
            {result.warnings.length > 0 && (
              <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs space-y-1">
                {result.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    {w}
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-between items-center pt-4 border-t border-slate-800/80">
              <button
                onClick={() => setResult(null)}
                className="px-4 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => onImported(result)}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors"
              >
                Use This Content
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl py-10 cursor-pointer transition-colors text-center">
              <Upload className="h-6 w-6 text-slate-400" />
              <span className="text-sm font-semibold text-slate-300">
                {file ? file.name : "Click to choose a .docx or .pdf file"}
              </span>
              <span className="text-[10px] text-slate-500">Max 15MB for Word, 20MB for PDF</span>
              <input
                type="file"
                accept=".docx,.pdf"
                className="hidden"
                onChange={(e) => handleFilePick(e.target.files?.[0] || null)}
              />
            </label>

            <div className="flex justify-between items-center pt-2 border-t border-slate-800/80">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConvert}
                disabled={!file}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs transition-colors"
              >
                <FileUp className="h-3.5 w-3.5" />
                Convert & Import
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
