/** Purely cosmetic name-tags purchasable with tokens in the Store — "something to flex" next to your
 * name on the crew roster and profile. No gameplay effect, just a flex. */
export type FlexTag = { id: string; label: string; emoji: string; cost: number };

export const FLEX_TAGS: FlexTag[] = [
  { id: "beast", label: "Beast", emoji: "🦍", cost: 10 },
  { id: "grinder", label: "Grinder", emoji: "⚙️", cost: 10 },
  { id: "shredded", label: "Shredded", emoji: "🔥", cost: 15 },
  { id: "savage", label: "Savage", emoji: "💀", cost: 15 },
  { id: "legend", label: "Legend", emoji: "👑", cost: 25 },
];
