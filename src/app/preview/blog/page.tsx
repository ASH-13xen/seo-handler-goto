"use client";

import { useEffect, useState } from "react";

interface PreviewPayload {
  type: "BLOG_PREVIEW_UPDATE";
  title: string;
  html: string;
  marginLeft: number;
  marginRight: number;
  siteId: string;
}

const SITE_DISPLAY_NAMES: Record<string, string> = {
  gotolatest: "GoToLatest",
  hehe: "Raipur Podcast",
  sunnest: "Sunnest",
};

// Mirrors gotolatest's real `.blog-content` CSS (gotolatest/src/app/blog/[slug]/page.tsx)
// so this preview matches the actual live site. Its blockquote rule there is
// broken (literal Tailwind classnames pasted into a CSS string, doing
// nothing) — this uses the corrected version instead of copying that bug.
const GOTOLATEST_CONTENT_CSS = `
  .pb-content h2 { font-size: 1.75rem; font-weight: 900; text-transform: uppercase; margin-top: 2.5rem; margin-bottom: 1.25rem; color: white; letter-spacing: -0.025em; line-height: 1.2; }
  .pb-content h3 { font-size: 1.35rem; font-weight: 800; text-transform: uppercase; margin-top: 2rem; margin-bottom: 1rem; color: white; letter-spacing: -0.025em; line-height: 1.3; }
  .pb-content p { margin-bottom: 1.5rem; line-height: 1.8; color: #a3a3a3; font-weight: 300; }
  .pb-content ul, .pb-content ol { padding-left: 1.5rem; margin-bottom: 1.5rem; color: #a3a3a3; font-weight: 300; }
  .pb-content ul { list-style-type: square; }
  .pb-content ol { list-style-type: decimal; }
  .pb-content li { margin-bottom: 0.5rem; line-height: 1.7; }
  .pb-content a { color: #6366f1; text-decoration: underline; text-underline-offset: 4px; }
  .pb-content a:hover { color: #818cf8; }
  .pb-content strong { color: white; font-weight: 700; }
  .pb-content blockquote { border-left: 4px solid #6366f1; padding-left: 1rem; font-style: italic; margin: 1.5rem 0; color: #a3a3a3; }
  .pb-content table { border-collapse: collapse; width: 100%; margin: 1.5rem 0; }
  .pb-content td, .pb-content th { border: 1px solid #404040; padding: 8px 12px; color: #a3a3a3; }
  .pb-content th { color: white; font-weight: 700; }
`;

const GENERIC_CONTENT_CSS = `
  .pb-content h2 { font-size: 1.6rem; font-weight: 800; margin-top: 2rem; margin-bottom: 1rem; color: #0f172a; }
  .pb-content h3 { font-size: 1.25rem; font-weight: 700; margin-top: 1.5rem; margin-bottom: 0.75rem; color: #0f172a; }
  .pb-content p { margin-bottom: 1.25rem; line-height: 1.75; color: #334155; }
  .pb-content ul, .pb-content ol { padding-left: 1.4rem; margin-bottom: 1.25rem; color: #334155; }
  .pb-content li { margin-bottom: 0.4rem; }
  .pb-content a { color: #4f46e5; text-decoration: underline; }
  .pb-content strong { color: #0f172a; font-weight: 700; }
  .pb-content blockquote { border-left: 4px solid #4f46e5; padding-left: 1rem; font-style: italic; margin: 1.25rem 0; color: #475569; }
  .pb-content table { border-collapse: collapse; width: 100%; margin: 1.25rem 0; }
  .pb-content td, .pb-content th { border: 1px solid #cbd5e1; padding: 8px 12px; }
  .pb-content th { background: #f1f5f9; font-weight: 700; }
`;

function MarginWrapped({
  marginLeft,
  marginRight,
  children,
}: {
  marginLeft: number;
  marginRight: number;
  children: React.ReactNode;
}) {
  return (
    <div style={{ paddingLeft: marginLeft, paddingRight: marginRight }}>
      {children}
    </div>
  );
}

function GotolatestThemePreview({ title, html, marginLeft, marginRight }: PreviewPayload) {
  return (
    <div className="bg-black text-white min-h-screen font-sans">
      <style dangerouslySetInnerHTML={{ __html: GOTOLATEST_CONTENT_CSS }} />
      <div className="bg-indigo-600 text-white text-[11px] font-bold text-center py-1.5 px-4">
        Preview: matches GoToLatest live site styling
      </div>
      <main className="max-w-4xl mx-auto w-full px-6 py-12">
        <h1 className="text-3xl md:text-5xl font-black uppercase mb-8 leading-tight">
          {title || "Untitled Post"}
        </h1>
        <MarginWrapped marginLeft={marginLeft} marginRight={marginRight}>
          <div className="pb-content" dangerouslySetInnerHTML={{ __html: html }} />
        </MarginWrapped>
      </main>
    </div>
  );
}

function GenericThemePreview({ title, html, marginLeft, marginRight, siteId }: PreviewPayload) {
  const siteName = SITE_DISPLAY_NAMES[siteId] || siteId;
  return (
    <div className="bg-white min-h-screen font-sans">
      <style dangerouslySetInnerHTML={{ __html: GENERIC_CONTENT_CSS }} />
      <div className="bg-amber-500 text-white text-[11px] font-bold text-center py-1.5 px-4">
        Preview only — {siteName} does not have a live blog page yet, so this is a generic
        approximation, not the real site&apos;s exact look.
      </div>
      <main className="max-w-3xl mx-auto w-full px-6 py-12">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-8 text-slate-900 leading-tight">
          {title || "Untitled Post"}
        </h1>
        <MarginWrapped marginLeft={marginLeft} marginRight={marginRight}>
          <div className="pb-content" dangerouslySetInnerHTML={{ __html: html }} />
        </MarginWrapped>
      </main>
    </div>
  );
}

export default function BlogPreviewPage() {
  const [payload, setPayload] = useState<PreviewPayload | null>(null);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (data && data.type === "BLOG_PREVIEW_UPDATE") {
        setPayload(data as PreviewPayload);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  if (!payload) {
    return (
      <div className="p-10 text-center text-slate-400 font-sans">Waiting for preview…</div>
    );
  }

  return payload.siteId === "gotolatest" ? (
    <GotolatestThemePreview {...payload} />
  ) : (
    <GenericThemePreview {...payload} />
  );
}
