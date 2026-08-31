import { useState, useEffect, useRef } from 'react';
import { isApiEnabled } from '../lib/api';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Generic data-fetching hook with static fallback.
 *
 * - When API is not configured (`isApiEnabled` is false) the hook returns
 *   the `fallback` value immediately with no network request.
 * - When the API is configured it fetches on mount and returns live data.
 *   If the request fails the `fallback` is used silently so the site stays
 *   functional without a backend.
 * - An empty list counts as no data, and also falls back. See `hasContent`.
 */
export function useApi<T>(
  fetcher: () => Promise<T>,
  fallback: T,
): { data: T; loading: boolean; error: string | null; fromApi: boolean } {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: isApiEnabled,
    error: null,
  });

  const mounted = useRef(true);

  useEffect(() => {
    if (!isApiEnabled) return;

    mounted.current = true;

    fetcher()
      .then((data) => {
        if (mounted.current) setState({ data, loading: false, error: null });
      })
      .catch((err: Error) => {
        if (mounted.current)
          setState((prev) => ({ ...prev, loading: false, error: err.message }));
      });

    return () => {
      mounted.current = false;
    };
    // Intentionally run once on mount — the fetcher reference is stable
    // because api.*.list() is a module-level arrow function.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const live = hasContent(state.data);

  return {
    data: live ? (state.data as T) : fallback,
    loading: state.loading,
    error: state.error,
    fromApi: live,
  };
}

/**
 * Whether a response actually carried something worth rendering.
 *
 * The obvious test — `state.data ?? fallback` — only catches null, so an empty
 * array read as real data and the section rendered nothing at all. That is how
 * the public site went blank the moment the API started working: while it was
 * unreachable every request failed and the bundled content showed, and as soon
 * as it answered `[]` from an empty database the fallback stopped applying.
 *
 * A section with no courses in it is never the intended page, so an empty list
 * is treated as "nothing came back" and the bundled copy is used instead. This
 * is only about the public site's read-only fallback; the dashboard, which must
 * show a list as genuinely empty so staff can add the first item, does not use
 * this hook.
 */
function hasContent<T>(data: T | null): boolean {
  if (data === null || data === undefined) return false;
  if (Array.isArray(data)) return data.length > 0;
  return true;
}
