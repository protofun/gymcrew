import { useEffect, useState } from "react";

/** Animates a number counting up from 0 to `target` whenever `target` changes. */
export function useCountUp(target: number, durationMs = 600): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frame: number;
    const start = Date.now();

    function tick() {
      const progress = Math.min((Date.now() - start) / durationMs, 1);
      setValue(Math.round(target * progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}
