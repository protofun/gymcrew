import { useEffect, useState } from "react";

/** Animates a number counting up from 0 to `target`, preserving one decimal place — plate-weight
 * PRs are often e.g. 92.5kg, where `useCountUp`'s whole-number rounding would land on the wrong
 * final value. */
export function useDecimalCountUp(target: number, durationMs = 700): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frame: number;
    const start = Date.now();
    function tick() {
      const progress = Math.min((Date.now() - start) / durationMs, 1);
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(target * eased * 10) / 10);
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}
