import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { ElasticSlider } from "@/components/ui/micro-interactions/elastic-slider";
import { Accordion } from "@/components/ui/molecules/accordion";
import { NumberFlow } from "@/components/ui/molecules/number-flow";
import { AI_SCAN } from "@/constants/ai-scan-theme";
import type { MealItem } from "@/lib/api";
import { NUTRITION_COLORS } from "@/lib/nutrition-colors";
import { scaleMacros } from "@/lib/nutrition-macros";
import { colors, fontFamily } from "@/theme";

type IngredientRowProps = {
  item: MealItem;
  onChangeQuantity: (quantity: number) => void;
  /** Takes the ingredient out. */
  onRemove: () => void;
  /** Set by the Accordion, which clones its children with it — it just has to reach `Accordion.Item`. */
  isLast?: boolean;
};

export const SLIDER_STEP = 5;

function MacroChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View className="flex-row items-center gap-1.5 rounded-full px-2.5 py-1" style={{ backgroundColor: `${color}22` }}>
      <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      <Text className="caption font-body-bold" style={{ color }}>{`${label} ${value}g`}</Text>
    </View>
  );
}

/** One ingredient as a plain accordion row: name, amount and calories, a trash can to take it out, and — opened up —
 * the elastic slider and the macros. Used by the AI scan results (where every change updates the one log entry) and by
 * the shake/meal builder. Must be a direct child of the Accordion. */
export function IngredientRow({ item, onChangeQuantity, onRemove, isLast }: IngredientRowProps) {
  const macros = scaleMacros(item, item.quantity);
  // Room to correct the AI's guess well past its estimate, in whole steps.
  const maxQuantity = Math.max(100, Math.ceil((item.servingSize * 3) / 50) * 50);

  return (
    <Accordion.Item value={item.id} isLast={isLast}>
      <Accordion.Trigger>
        <View className="flex-1 flex-row items-center gap-3">
          <View className="flex-1 gap-0.5">
            <Text numberOfLines={1} style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 15, color: colors.brand.white }}>
              {item.name}
            </Text>
            <View className="flex-row items-baseline gap-1">
              <NumberFlow value={item.quantity} fontSize={13} color={AI_SCAN.textMuted} fontWeight="600" />
              <Text className="caption" style={{ color: AI_SCAN.textMuted }}>
                {`${item.servingUnit}  ·`}
              </Text>
              <NumberFlow value={macros.calories} fontSize={13} color={AI_SCAN.accent} fontWeight="700" />
              <Text className="caption font-body-semibold" style={{ color: AI_SCAN.accent }}>
                kcal
              </Text>
            </View>
          </View>
          <Pressable onPress={onRemove} hitSlop={10} className="h-9 w-9 items-center justify-center" accessibilityLabel={`Remove ${item.name}`}>
            <Ionicons name="trash-outline" size={20} color={colors.semantic.error} />
          </Pressable>
        </View>
      </Accordion.Trigger>

      <Accordion.Content>
        <View className="gap-3.5">
          <ElasticSlider.Root value={item.quantity} min={SLIDER_STEP} max={maxQuantity} step={SLIDER_STEP} isStepped onValueChange={onChangeQuantity} style={{ width: "100%" }}>
            <ElasticSlider.Leading>
              <Ionicons name="remove" size={16} color={AI_SCAN.textMuted} />
            </ElasticSlider.Leading>
            <ElasticSlider.Track color={AI_SCAN.border}>
              <ElasticSlider.Fill color={AI_SCAN.accent} />
            </ElasticSlider.Track>
            <ElasticSlider.Trailing>
              <Ionicons name="add" size={16} color={AI_SCAN.textMuted} />
            </ElasticSlider.Trailing>
          </ElasticSlider.Root>

          <View className="flex-row flex-wrap gap-1.5">
            <MacroChip label="P" value={macros.proteinG} color={NUTRITION_COLORS.protein} />
            <MacroChip label="C" value={macros.carbsG} color={NUTRITION_COLORS.carbs} />
            <MacroChip label="F" value={macros.fatG} color={NUTRITION_COLORS.fat} />
          </View>
        </View>
      </Accordion.Content>
    </Accordion.Item>
  );
}
