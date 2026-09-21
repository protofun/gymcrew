import { useLocalSearchParams } from "expo-router";

import { NutritionFoodsSection } from "@/components/NutritionFoodsSection";
import { NutritionHub } from "@/components/NutritionHub";

/** My foods, shakes and meals. A `tab` param opens straight on one of the three. */
export default function NutritionFoodsScreen() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();

  return (
    <NutritionHub active="foods">
      <NutritionFoodsSection key={tab ?? "foods"} initialTab={tab} />
    </NutritionHub>
  );
}
