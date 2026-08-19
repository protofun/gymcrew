import { useEffect, useState } from "react";

function secondsUntil(endTime: number): number {
  return Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
}

/** Ticks once a second, returning seconds remaining until `endTime` (epoch ms), floored at 0. */
export function useCountdown(endTime: number | null): number {
  const [remainingSeconds, setRemainingSeconds] = useState(() => (endTime ? secondsUntil(endTime) : 0));

  useEffect(() => {
    if (!endTime) {
      setRemainingSeconds(0);
      return;
    }
    setRemainingSeconds(secondsUntil(endTime));
    const interval = setInterval(() => {
      setRemainingSeconds(secondsUntil(endTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  return remainingSeconds;
}
