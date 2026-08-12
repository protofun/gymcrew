import { useFonts } from "expo-font";

import { fontAssets } from "@/theme";

export function useAppFonts() {
  const [loaded, error] = useFonts(fontAssets);
  return { loaded, error };
}
