import { NutritionHub } from "@/components/NutritionHub";
import { NutritionProgressSection } from "@/components/NutritionProgressSection";

export default function NutritionProgressScreen() {
  return (
    <NutritionHub active="progress">
      <NutritionProgressSection />
    </NutritionHub>
  );
}
