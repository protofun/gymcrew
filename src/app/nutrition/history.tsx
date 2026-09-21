import { NutritionHistorySection } from "@/components/NutritionHistorySection";
import { NutritionHub } from "@/components/NutritionHub";
import { toDateKey } from "@/lib/date";
import { switchNutritionSection } from "@/lib/nutrition-nav";

export default function NutritionHistoryScreen() {
  return (
    <NutritionHub active="history">
      <NutritionHistorySection onOpenDay={(date) => switchNutritionSection("diary", { date: toDateKey(date) })} />
    </NutritionHub>
  );
}
