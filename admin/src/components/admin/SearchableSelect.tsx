import { Command } from "cmdk";
import { useEffect, useRef, useState } from "react";

type SearchableSelectProps<T> = {
  value: T | null;
  onSelect: (item: T | null) => void;
  search: (query: string) => Promise<T[]>;
  getId: (item: T) => string;
  getLabel: (item: T) => string;
  getSubLabel?: (item: T) => string | null | undefined;
  placeholder?: string;
  clearable?: boolean;
};

/** A search-as-you-type dropdown for picking one record (a user, a crew, …) instead of making the
 * admin copy-paste a raw id from another page — used anywhere Email/Push/UserDetail need to target
 * a specific user or crew. Built on cmdk (same primitive as CommandPalette) with `shouldFilter`
 * off: the candidate list is server-searched (via `search`), so cmdk only renders what the backend
 * already narrowed down instead of re-filtering client-side. */
export function SearchableSelect<T>({
  value,
  onSelect,
  search,
  getId,
  getLabel,
  getSubLabel,
  placeholder = "Search…",
  clearable = true,
}: SearchableSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value ? getLabel(value) : "");
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value ? getLabel(value) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      search(query)
        .then((items) => {
          if (!cancelled) setResults(items);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery(value ? getLabel(value) : "");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div ref={containerRef} className="relative">
      <Command shouldFilter={false} className="w-full">
        <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700">
          <Command.Input
            value={query}
            onValueChange={(v) => {
              setQuery(v);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400 dark:text-white/90"
          />
          {clearable && value && (
            <button
              type="button"
              onClick={() => {
                onSelect(null);
                setQuery("");
              }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Clear selection"
            >
              ×
            </button>
          )}
        </div>
        {open && (
          <Command.List className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-800 dark:bg-gray-900">
            {loading && <div className="px-3 py-2 text-sm text-gray-400">Searching…</div>}
            {!loading && results.length === 0 && (
              <Command.Empty className="px-3 py-2 text-sm text-gray-400">No results.</Command.Empty>
            )}
            {!loading &&
              results.map((item) => (
                <Command.Item
                  key={getId(item)}
                  value={getId(item)}
                  onSelect={() => {
                    onSelect(item);
                    setQuery(getLabel(item));
                    setOpen(false);
                  }}
                  className="cursor-pointer rounded-md px-3 py-2 text-sm text-gray-700 data-[selected=true]:bg-gray-100 dark:text-gray-300 dark:data-[selected=true]:bg-white/5"
                >
                  <div>{getLabel(item)}</div>
                  {getSubLabel?.(item) && <div className="text-xs text-gray-400">{getSubLabel(item)}</div>}
                </Command.Item>
              ))}
          </Command.List>
        )}
      </Command>
    </div>
  );
}
