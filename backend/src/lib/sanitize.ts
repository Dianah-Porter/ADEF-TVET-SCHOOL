import sanitizeHtml from 'sanitize-html';

/**
 * Announcement bodies are sanitised on WRITE, not on read.
 *
 * Storing already-safe HTML means no consumer can forget to escape it — the
 * dashboard preview, the public page and any future export all get the same
 * guarantee for free. The cost is that a body cannot be "unsanitised" later,
 * which is the right trade for staff-authored school notices.
 */
const options: sanitizeHtml.IOptions = {
  allowedTags: [
    'p',
    'br',
    'strong',
    'b',
    'em',
    'i',
    'u',
    'ul',
    'ol',
    'li',
    'h2',
    'h3',
    'h4',
    'blockquote',
    'a',
    'hr',
  ],
  allowedAttributes: {
    // target and rel must be listed here or the transform below adds them
    // and this filter immediately removes them again.
    a: ['href', 'title', 'target', 'rel'],
  },
  // No javascript: or data: URLs.
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesAppliedToAttributes: ['href'],
  transformTags: {
    // Every link leaves in a new tab, and rel closes the reverse-tabnabbing
    // hole that target="_blank" opens on its own.
    a: sanitizeHtml.simpleTransform('a', {
      target: '_blank',
      rel: 'noopener noreferrer',
    }),
  },
  // Drop the contents of anything disallowed rather than leaving stray text.
  nonTextTags: ['style', 'script', 'textarea', 'option', 'noscript'],
};

export function sanitizeBody(html: string): string {
  return sanitizeHtml(html, options);
}

/** Plain text version, used to build an excerpt and to measure real length. */
export function toPlainText(html: string): string {
  return sanitizeHtml(
    html
      // Stripping tags on its own would join "…September 2026." to "Bring your
      // ID…" with no gap, because the paragraph break carries no character of
      // its own. Insert the space that the markup was standing in for.
      .replace(/<\/(p|h[2-4]|li|blockquote)>/gi, ' ')
      .replace(/<br\s*\/?>/gi, ' '),
    { allowedTags: [], allowedAttributes: {} },
  )
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** First ~180 characters of real text, cut on a word boundary. */
export function buildExcerpt(html: string, maxLength = 180): string {
  const text = toPlainText(html);
  if (text.length <= maxLength) return text;

  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');

  return `${(lastSpace > 60 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
