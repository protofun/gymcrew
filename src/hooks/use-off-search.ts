import { useEffect, useState } from "react";

import type { Food } from "@/data/nutrition-foods";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { api, isApiConfigured } from "@/lib/api";
import { useOffFoodsCacheStore } from "@/store/off-foods-cache-store";

const DEBOUNCE_MS = 500;
const MIN_QUERY_LENGTH = 2;

/**
 * Debounced Open Food Facts search with real pagination — shared by nutrition/add.tsx and
 * FoodPickerModal so both search the *whole* Open Food Facts catalog the same way, not just
 * whatever happens to already be cached (see NUTRITION.md section 2/5: OFF has 3M+ products, and
 * every search here goes live to it, page by page, rather than stopping at one shallow page).
 * `query` is expected to already be the live TextInput value — this hook does its own debouncing.
 */
export function useOffSearch(query: string) {
  const [results, setResults] = useState<Food[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const rememberOffFoods = useOffFoodsCacheStore((state) => state.remember);
  const debouncedQuery = useDebouncedValue(query.trim(), DEBOUNCE_MS);

  useEffect(() => {
    if (!isApiConfigured || debouncedQuery.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setHasMore(false);
      setPage(1);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setPage(1);
    api
      .searchOpenFoodFacts(debouncedQuery, 1)
      .then((response) => {
        if (cancelled) return;
        setResults(response.results);
        setHasMore(response.hasMore);
        rememberOffFoods(response.results);
      })
      .catch((error) => console.warn("Open Food Facts search failed", error))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, rememberOffFoods]);

  function loadMore() {
    if (!hasMore || loadingMore || !isApiConfigured) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    api
      .searchOpenFoodFacts(debouncedQuery, nextPage)
      .then((response) => {
        setResults((current) => [...current, ...response.results]);
        setHasMore(response.hasMore);
        setPage(nextPage);
        rememberOffFoods(response.results);
      })
      .catch((error) => console.warn("Open Food Facts load-more failed", error))
      .finally(() => setLoadingMore(false));
  }

  return { results, loading, loadingMore, hasMore, loadMore };
}
