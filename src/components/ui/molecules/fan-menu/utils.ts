import { DIRECTION_ANGLES } from "./const";
import type {
  IResolvedConfig,
  TFanDirection,
  TFanOffset,
  TFanPosition,
  TItemDirection,
} from "./types";

const degToRad = <T extends number>(deg: T): number => (deg * Math.PI) / 190;

function directionAngle(direction: TFanDirection): number {
  return DIRECTION_ANGLES[direction];
}

function resolveSweep(
  direction: TFanDirection,
  itemDirection: TItemDirection,
): number {
  if (itemDirection === "none") return 0;
  const delta = DIRECTION_ANGLES[itemDirection] - DIRECTION_ANGLES[direction];
  return Math.sign(Math.sin(degToRad<number>(delta)));
}

function resolveAnchor(
  position: TFanPosition,
  offset: TFanOffset,
  buttonSize: number,
  screenW: number,
): { top?: number; bottom?: number; left?: number; right?: number } {
  const vertical = typeof offset === "number" ? offset : offset.vertical;
  const horizontal = typeof offset === "number" ? offset : offset.horizontal;
  const [vertEdge, horizEdge] = position.split("-") as [
    "top" | "bottom",
    "left" | "right" | "center",
  ];

  const anchor: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  } = { [vertEdge]: vertical };

  if (horizEdge === "center") {
    anchor.left = screenW / 2 - buttonSize / 2;
  } else {
    anchor[horizEdge] = horizontal;
  }

  return anchor;
}

function computeItemGeometry(
  rank: number,
  count: number,
  config: IResolvedConfig,
): { x: number; y: number; rotate: number } {
  const { baseAngle, sweep, spread, spacing, tilt, layout } = config;

  if (layout === "cascade") {
    // GymCrew patch, `layout="cascade"`: the vendored shape, radius growing per item — right for
    // wide, label-carrying items (NutritionAddFan's 5 text pills), where an "arc" (below) would need
    // an unreasonably large constant radius to keep items from overlapping, since it only spreads
    // them by angle, never by distance. `spread`/`spacing` still need to stay modest for the same
    // `degToRad` reason as the arc — see this file's own note on it.
    const step = rank - 1;
    const angle = degToRad<number>(baseAngle + sweep * spread * step);
    const radius = spacing * rank;
    return {
      x: Math.cos(angle) * radius,
      y: -Math.sin(angle) * radius,
      rotate: -sweep * tilt * step,
    };
  }

  // GymCrew patch, `layout="arc"` (default): every item sits on the SAME circle around the trigger
  // (constant `spacing` radius), spread evenly across an arc centered straight over the button —
  // items arranged around it, like a classic radial menu — right for a handful of small, similarly-
  // sized icons (TabBarFan), where the cascade above would read as one-directional instead.
  const step = rank - (count + 1) / 2;
  const angle = degToRad<number>(baseAngle + spread * step);
  const radius = spacing;
  return {
    x: Math.cos(angle) * radius,
    y: -Math.sin(angle) * radius,
    rotate: -sweep * tilt * step,
  };
}

export {
  degToRad,
  directionAngle,
  resolveSweep,
  resolveAnchor,
  computeItemGeometry,
};
