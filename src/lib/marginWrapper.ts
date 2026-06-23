const WRAP_ATTR = "data-margin-wrapper";

// Bakes the chosen left/right padding directly into the stored HTML as an
// inline-styled wrapper div. Public sites (e.g. gotolatest) render `content`
// unmodified via dangerouslySetInnerHTML, so this is the only way a margin
// set in this CMS shows up on the live site without touching that site's code.
export function wrapContentWithMargins(
  inner: string,
  left: number,
  right: number,
): string {
  const safe = unwrapContentMargins(inner); // idempotent: never double-wraps
  if (!left && !right) return safe; // old posts stay byte-identical until a margin is set
  return `<div ${WRAP_ATTR}="1" style="padding-left:${left}px;padding-right:${right}px;">${safe}</div>`;
}

export function unwrapContentMargins(html: string): string {
  const match = html
    .trim()
    .match(new RegExp(`^<div\\s+${WRAP_ATTR}="1"[^>]*>([\\s\\S]*)<\\/div>$`));
  return match ? match[1] : html; // no-op for posts saved before this feature existed
}
