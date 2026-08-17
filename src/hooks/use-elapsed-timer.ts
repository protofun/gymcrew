import { useEffect, useState } from "react";

/** Ticks once a second, returning elapsed seconds since `startedAt` (epoch ms). */
export function useElapsedTimer(startedAt: number | null): number {
  const [elapsedSeconds, setElapsedSeconds] = useState(() => (startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0));

  useEffect(() => {
    if (!startedAt) return;
    setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return elapsedSeconds;
}

export function formatElapsed(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}
