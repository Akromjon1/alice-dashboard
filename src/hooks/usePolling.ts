import { useState, useEffect, useCallback, useRef } from 'react';

export function usePolling<T>(
  fetchFn: () => Promise<T>,
  intervalMs: number
): { data: T | null; loading: boolean; error: string | null; refresh: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchRef = useRef(fetchFn);
  fetchRef.current = fetchFn;

  const doFetch = useCallback(() => {
    fetchRef.current()
      .then(result => {
        setData(result);
        setError(null);
      })
      .catch(err => {
        setError(err?.message || 'Fetch failed');
      })
      .finally(() => setLoading(false));
  }, []);

  const startPolling = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(doFetch, intervalMs);
  }, [doFetch, intervalMs]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    doFetch();
    startPolling();

    const handleVisibility = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        doFetch();
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [doFetch, startPolling, stopPolling]);

  return { data, loading, error, refresh: doFetch };
}
