import sanitizeHtmlLib from "sanitize-html";

// DOCX/PDF uploads are untrusted files, and the HTML produced from them ends
// up rendered via dangerouslySetInnerHTML on real public-facing sites — so
// it's sanitized here, server-side, before it ever reaches the client or the
// database. The allowlist matches exactly what the Tiptap editor can produce.
//
// Uses sanitize-html (htmlparser2-based) rather than isomorphic-dompurify:
// the latter bundles jsdom, whose `html-encoding-sniffer` -> `@exodus/bytes`
// dependency does a CommonJS require() of an ESM module that Turbopack can't
// load in Vercel's Node serverless runtime ("ERR_REQUIRE_ESM"), crashing
// every route that imports it at cold start. sanitize-html has no such
// dependency and works reliably in that environment.
const ALLOWED_TAGS = [
  "p",
  "h2",
  "h3",
  "strong",
  "em",
  "u",
  "s",
  "blockquote",
  "ul",
  "ol",
  "li",
  "a",
  "img",
  "br",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "span",
  "figure",
  "figcaption",
];

const ALLOWED_ATTR = [
  "href",
  "target",
  "rel",
  "src",
  "alt",
  "style",
  "colspan",
  "rowspan",
];

export function sanitizeBlogHtml(html: string): string {
  return sanitizeHtmlLib(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      "*": ALLOWED_ATTR,
    },
  });
}
