import DOMPurify from "isomorphic-dompurify";

// DOCX/PDF uploads are untrusted files, and the HTML produced from them ends
// up rendered via dangerouslySetInnerHTML on real public-facing sites — so
// it's sanitized here, server-side, before it ever reaches the client or the
// database. The allowlist matches exactly what the Tiptap editor can produce.
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
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });
}
