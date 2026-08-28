import { prisma } from './prisma';

/**
 * Turns a title into a URL-safe slug.
 *
 * NFD normalisation splits accented characters into a base letter plus a
 * combining mark, so stripping the marks leaves readable ASCII rather than
 * dropping the letter entirely — "Inyigisho ku bwúbatsi" keeps its words.
 */
export function slugify(input: string): string {
  const slug = input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');

  // A title of only punctuation or non-Latin script would otherwise produce an
  // empty slug, which cannot be a URL.
  return slug || `announcement-${Date.now()}`;
}

/**
 * A slug not already taken, adding -2, -3 … if needed.
 *
 * `excludeId` lets an announcement keep its own slug when it is being updated,
 * instead of colliding with itself.
 */
export async function uniqueSlug(title: string, excludeId?: string): Promise<string> {
  const base = slugify(title);

  for (let suffix = 1; suffix < 100; suffix++) {
    const candidate = suffix === 1 ? base : `${base}-${suffix}`;
    const existing = await prisma.announcement.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!existing || existing.id === excludeId) return candidate;
  }

  return `${base}-${Date.now()}`;
}
