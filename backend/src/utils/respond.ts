import type { Response } from 'express';

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Every successful response leaves through here, so the dashboard only ever
 * has to unwrap one shape: { data, meta? }.
 */
export function ok<T>(res: Response, data: T, meta?: Record<string, unknown>) {
  return res.status(200).json(meta ? { data, meta } : { data });
}

export function created<T>(res: Response, data: T) {
  return res.status(201).json({ data });
}

export function noContent(res: Response) {
  return res.status(204).send();
}

export function paginated<T>(res: Response, items: T[], meta: PageMeta) {
  return res.status(200).json({ data: items, meta });
}

export function buildPageMeta(page: number, limit: number, total: number): PageMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
