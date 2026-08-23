"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();

interface UseCacheOptions<T> {
  ttlMs?: number; // Default 60 seconds
  persistKey?: string; // Optional LocalStorage persistence key
  initialData?: T;
  revalidateOnFocus?: boolean;
}

/**
 * Stale-While-Revalidate caching hook for Next.js / React
 * Returns cached data immediately (from memory or LocalStorage),
 * then fetches fresh data in background without blocking UI.
 */
export function useCache<T>(
  key: string | null,
  fetcher: () => Promise<{ success?: boolean; data: T }>,
  options: UseCacheOptions<T> = {},
) {
  const {
    ttlMs = 60000,
    persistKey,
    initialData,
    revalidateOnFocus = false,
  } = options;

  // Initialize state from memory or persistent cache
  const getInitialValue = (): T | undefined => {
    if (!key) return initialData;

    // Check memory cache
    const mem = memoryCache.get(key) as CacheEntry<T> | undefined;
    if (mem) return mem.data;

    // Check LocalStorage cache
    if (typeof window !== "undefined" && persistKey) {
      try {
        const saved = localStorage.getItem(`cache_${persistKey}`);
        if (saved) {
          const parsed = JSON.parse(saved) as CacheEntry<T>;
          memoryCache.set(key, parsed);
          return parsed.data;
        }
      } catch {
        // ignore
      }
    }

    return initialData;
  };

  const [data, setData] = useState<T | undefined>(getInitialValue);
  const [loading, setLoading] = useState<boolean>(!getInitialValue());
  const [error, setError] = useState<string>("");
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const revalidate = useCallback(
    async (silent = false) => {
      if (!key) return;
      if (!silent && !data) setLoading(true);
      setError("");

      try {
        const res = await fetcherRef.current();
        const freshData = res.data;
        setData(freshData);

        const entry: CacheEntry<T> = {
          data: freshData,
          timestamp: Date.now(),
        };

        memoryCache.set(key, entry);

        if (typeof window !== "undefined" && persistKey) {
          try {
            localStorage.setItem(`cache_${persistKey}`, JSON.stringify(entry));
          } catch {
            // Storage quota limit fallback
          }
        }
      } catch (err) {
        if (!silent) {
          setError(err instanceof Error ? err.message : "Fetch failed");
        }
      } finally {
        setLoading(false);
      }
    },
    [key, data, persistKey],
  );

  useEffect(() => {
    if (!key) return;

    const mem = memoryCache.get(key) as CacheEntry<T> | undefined;
    const isStale = !mem || Date.now() - mem.timestamp > ttlMs;

    if (isStale) {
      revalidate(Boolean(data));
    }
  }, [key, revalidate, ttlMs, data]);

  // Window focus revalidation
  useEffect(() => {
    if (!revalidateOnFocus || !key) return;

    const handleFocus = () => {
      revalidate(true);
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [key, revalidateOnFocus, revalidate]);

  // Manual mutate / optimistic update
  const mutate = useCallback(
    (updater: T | ((prev: T | undefined) => T), shouldRevalidate = true) => {
      if (!key) return;

      const nextData =
        typeof updater === "function"
          ? (updater as (prev: T | undefined) => T)(data)
          : updater;

      setData(nextData);

      const entry: CacheEntry<T> = {
        data: nextData,
        timestamp: Date.now(),
      };
      memoryCache.set(key, entry);

      if (typeof window !== "undefined" && persistKey) {
        try {
          localStorage.setItem(`cache_${persistKey}`, JSON.stringify(entry));
        } catch {
          // ignore
        }
      }

      if (shouldRevalidate) {
        revalidate(true);
      }
    },
    [key, data, persistKey, revalidate],
  );

  return {
    data,
    loading,
    error,
    revalidate,
    mutate,
  };
}

/**
 * Clear cache helper
 */
export function invalidateCache(keyPrefix?: string) {
  if (!keyPrefix) {
    memoryCache.clear();
    return;
  }
  for (const k of memoryCache.keys()) {
    if (k.startsWith(keyPrefix)) {
      memoryCache.delete(k);
    }
  }
}
