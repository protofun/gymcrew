function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const normalized = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const value = parseInt(normalized, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function toRgbString([r, g, b]: [number, number, number]): string {
  return `rgb(${r}, ${g}, ${b})`;
}

/** A lighter tint of `hex` (mixed toward white by `amount`, 0-1) — the same hue, not a generic
 * overlay color, so a gradient built from this and `darken` stays recognizably "that color"
 * throughout instead of washing out toward white or the app's neutral background. */
export function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return toRgbString([
    Math.round(r + (255 - r) * amount),
    Math.round(g + (255 - g) * amount),
    Math.round(b + (255 - b) * amount),
  ]);
}

/** A darker shade of `hex` (mixed toward black by `amount`, 0-1) — deliberately not the app's
 * neutral `background` color, which has its own unrelated blue-black cast and would dilute the
 * hue rather than deepen it. */
export function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return toRgbString([Math.round(r * (1 - amount)), Math.round(g * (1 - amount)), Math.round(b * (1 - amount))]);
}
