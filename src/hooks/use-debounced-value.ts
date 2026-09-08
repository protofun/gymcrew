import { useEffect, useState } from "react";

/** Returns `value`, but only after it hasn't changed for `delayMs` — used to avoid firing a network
 * request (e.g. the Open Food Facts search proxy) on every keystroke. See NUTRITION.md section 6's
 * explicit warning against uncontrolled search-as-you-type against Open Food Facts. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}
