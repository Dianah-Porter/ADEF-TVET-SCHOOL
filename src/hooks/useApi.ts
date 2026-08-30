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

  return {
    data: state.data ?? fallback,
    loading: state.loading,
    error: state.error,
    fromApi: state.data !== null,
  };
}
