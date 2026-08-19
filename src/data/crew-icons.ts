import type { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ImageSourcePropType } from "react-native";

import { images } from "@/constants/images";

export type CrewIcon =
  | { key: string; type: "image"; source: ImageSourcePropType }
  | { key: string; type: "icon"; name: keyof typeof MaterialCommunityIcons.glyphMap };

// The animal icons are cropped from the app's own commissioned mascot art, so they match the
// brand style exactly. The "cat-*" icons come from robohash.org's set4 (a free, no-key avatar
// generator) for extra variety — a different, cartoonier art style since we don't have a
// generator that produces custom art in the app's own style.
export const CREW_ICONS: CrewIcon[] = [
  { key: "gorilla", type: "image", source: images.iconGorilla },
  { key: "tiger", type: "image", source: images.iconTiger },
  { key: "elephant", type: "image", source: images.iconElephant },
  { key: "dumbbell", type: "icon", name: "dumbbell" },
  { key: "cat-yellow", type: "image", source: images.iconGenCatYellow },
  { key: "cat-pink", type: "image", source: images.iconGenCatPink },
  { key: "cat-green", type: "image", source: images.iconGenCatGreen },
  { key: "cat-red", type: "image", source: images.iconGenCatRed },
  { key: "cat-brown", type: "image", source: images.iconGenCatBrown },
  { key: "cat-coral", type: "image", source: images.iconGenCatCoral },
];

export function crewIconByKey(key: string): CrewIcon {
  return CREW_ICONS.find((icon) => icon.key === key) ?? CREW_ICONS[0];
}
