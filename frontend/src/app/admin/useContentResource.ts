import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError } from '../lib/api';
import { useToast } from './admin-context';

/** The shape every generated content client in `api.ts` exposes. */
interface ResourceClient<T, TCreate, TUpdate> {
  list: (params?: string) => Promise<T[]>;
  create: (input: TCreate, image?: File | null) => Promise<T>;
  update: (id: string, input: TUpdate, image?: File | null) => Promise<T>;
  remove: (id: string) => Promise<void>;
  reorder: (ids: string[]) => Promise<{ reordered: number }>;
}

interface Row {
  id: string;
  published?: boolean;
}

/**
 * Load, edit and reorder one content type.
 *
 * The five content screens differ in their columns and their forms but not in
 * how they talk to the API, so that half lives here once. Each page supplies
 * only what makes it different.
 */
export function useContentResource<T extends Row, TCreate, TUpdate>(
  client: ResourceClient<T, TCreate, TUpdate>,
  options: {
    /** Used in messages: "Course saved.", "Could not delete that course." */
    label: string;
    /** Fields a search box should match against. */
    searchable: (item: T) => string[];
  },
) {
  const { notify } = useToast();

  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [visibility, setVisibility] = useState<'all' | 'live' | 'hidden'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setItems(await client.list());
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Filtering happens here rather than on the server.
   *
   * These lists hold a handful of rows — three courses, five selling points —
   * so a round trip per keystroke would be slower and no more correct.
   */
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return items.filter((item) => {
      if (visibility === 'live' && item.published === false) return false;
      if (visibility === 'hidden' && item.published !== false) return false;
      if (!term) return true;

      return options
        .searchable(item)
        .some((field) => field.toLowerCase().includes(term));
    });
  }, [items, search, visibility, options]);

  const isFiltered = search.trim() !== '' || visibility !== 'all';

  const counts = useMemo(
    () => ({
      all: items.length,
      live: items.filter((item) => item.published !== false).length,
      hidden: items.filter((item) => item.published === false).length,
    }),
    [items],
  );

  /** Turns any thrown error into a toast, and field errors into a return value. */
  const run = useCallback(
    async <R,>(
      action: () => Promise<R>,
      messages: { success?: string; failure: string },
    ): Promise<{ ok: true; value: R } | { ok: false; fields: Record<string, string> }> => {
      setSaving(true);

      try {
        const value = await action();
        if (messages.success) notify(messages.success, 'success');
        return { ok: true, value };
      } catch (caught) {
        if (caught instanceof ApiError && caught.fields) {
          return { ok: false, fields: caught.fields };
        }

        notify(caught instanceof ApiError ? caught.message : messages.failure, 'error');
        return { ok: false, fields: {} };
      } finally {
        setSaving(false);
      }
    },
    [notify],
  );

  const create = useCallback(
    async (input: TCreate, image?: File | null) => {
      const result = await run(() => client.create(input, image), {
        success: `${capitalise(options.label)} added.`,
        failure: `Could not add that ${options.label}.`,
      });

      if (result.ok) await load();
      return result;
    },
    [client, load, options.label, run],
  );

  const update = useCallback(
    async (id: string, input: TUpdate, image?: File | null) => {
      const result = await run(() => client.update(id, input, image), {
        success: `${capitalise(options.label)} updated.`,
        failure: `Could not save that ${options.label}.`,
      });

      if (result.ok) await load();
      return result;
    },
    [client, load, options.label, run],
  );

  const remove = useCallback(
    async (id: string) => {
      const result = await run(() => client.remove(id), {
        success: `${capitalise(options.label)} deleted.`,
        failure: `Could not delete that ${options.label}.`,
      });

      if (result.ok) await load();
      return result;
    },
    [client, load, options.label, run],
  );

  /**
   * Publish/hide, applied optimistically.
   *
   * A switch that waits for the network feels broken, so the toggle moves at
   * once and is put back if the request fails.
   */
  const togglePublished = useCallback(
    async (item: T) => {
      const next = !(item.published ?? true);

      setItems((current) =>
        current.map((row) => (row.id === item.id ? { ...row, published: next } : row)),
      );

      try {
        await client.update(item.id, { published: next } as TUpdate);
        notify(next ? 'Now visible on the website.' : 'Hidden from the website.', 'success');
      } catch {
        setItems((current) =>
          current.map((row) =>
            row.id === item.id ? { ...row, published: item.published } : row,
          ),
        );
        notify('Could not change that. Try again.', 'error');
      }
    },
    [client, notify],
  );

  /**
   * Moves a row one place up or down and saves the whole order.
   *
   * Indices refer to the unfiltered list, which is why the pages disable these
   * controls while a filter is active: moving row 2 of a filtered view "up"
   * has no obvious meaning in the order actually stored.
   */
  const move = useCallback(
    async (id: string, delta: -1 | 1) => {
      const index = items.findIndex((item) => item.id === id);
      const target = index + delta;

      if (index === -1 || target < 0 || target >= items.length) return;

      const previous = items;
      const next = [...items];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved!);

      setItems(next);

      try {
        await client.reorder(next.map((item) => item.id));
      } catch {
        setItems(previous);
        notify('Could not save the new order.', 'error');
      }
    },
    [client, items, notify],
  );

  return {
    items,
    filtered,
    counts,
    isFiltered,
    loading,
    error,
    saving,
    search,
    setSearch,
    visibility,
    setVisibility,
    reload: load,
    create,
    update,
    remove,
    togglePublished,
    move,
  };
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
