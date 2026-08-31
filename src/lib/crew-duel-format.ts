import type { ApiCrewDuel } from "@/lib/api";

export function duelMetricLabel(duel: ApiCrewDuel): string {
  return duel.metric === "sets" ? "sets" : "volume";
}

export function duelOpponentName(duel: ApiCrewDuel, myId?: string): string {
  return duel.challengerId === myId ? duel.opponentName : duel.challengerName;
}

export function describeResolvedDuel(duel: ApiCrewDuel, myId?: string): string {
  const opponentName = duelOpponentName(duel, myId);
  if (duel.status === "declined") return `${opponentName} declined your duel`;
  if (duel.status === "accepted") return `Duel vs ${opponentName} — most ${duelMetricLabel(duel)} today`;
  if (duel.winnerId === null) return `Duel vs ${opponentName} ended in a draw`;
  return duel.winnerId === myId ? `You beat ${opponentName} on ${duelMetricLabel(duel)} today` : `${opponentName} beat you on ${duelMetricLabel(duel)} today`;
}
