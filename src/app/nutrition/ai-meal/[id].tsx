import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { goToNutrition } from "@/lib/nutrition-nav";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Polaroid } from "@/components/ui/pieces/polaroid";
import { ReceiptCard } from "@/components/ui/pieces/receipt-card";
import { aiMealFoodId, aiMealTotals, formatAmount, saveAiMealToLog } from "@/lib/ai-meals";
import { formatDiaryDate, fromDateKey } from "@/lib/date";
import { MEAL_SLOTS } from "@/lib/meal-slot";
import { goBack } from "@/lib/navigation";
import { useAiMealsStore } from "@/store/ai-meals-store";
import { useNutritionLogStore } from "@/store/nutrition-log-store";
import { colors } from "@/theme";

/** A meal logged from a photo, opened from Today's Food: the photo as a polaroid, and the separate
 * ingredients as a receipt. Wrong ingredient? Tap it under the receipt to take it out — the meal's
 * single log entry is rewritten without it. */
export default function AiMealDetailScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { id, logId } = useLocalSearchParams<{ id: string; logId?: string }>();
  const meal = useAiMealsStore((state) => state.meals[id]);
  const entry = useNutritionLogStore((state) => state.entries.find((candidate) => candidate.id === logId) ?? state.entries.find((candidate) => candidate.foodId === aiMealFoodId(id)));
  const [confirmRemove, setConfirmRemove] = useState(false);

  function handleBack() {
    goBack("/nutrition");
  }

  if (!meal || !entry) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top }} className="items-center justify-center bg-background px-6">
        <Text className="body-md text-center text-text-secondary">This meal couldn&apos;t be found.</Text>
        <Pressable onPress={handleBack} className="mt-4 rounded-full border border-divider px-5 py-2.5">
          <Text className="body-sm font-body-semibold text-text-primary">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const totals = aiMealTotals(meal.items);
  const slotLabel = MEAL_SLOTS.find((slot) => slot.key === entry.mealSlot)?.label ?? "";
  const dateLabel = formatDiaryDate(fromDateKey(entry.dateKey), new Date());

  function writeMeal(itemIds: string[]) {
    if (!meal || !entry) return;
    saveAiMealToLog({ id: meal.id, photoUrl: meal.photoUrl, items: meal.items.filter((item) => itemIds.includes(item.id)), mealSlot: entry.mealSlot, dateKey: entry.dateKey, createdAt: meal.createdAt });
  }

  function handleRemoveIngredient(itemId: string) {
    if (!meal) return;
    const remaining = meal.items.filter((item) => item.id !== itemId).map((item) => item.id);
    writeMeal(remaining);
    if (remaining.length === 0) handleBack();
  }

  function handleRemoveMeal() {
    setConfirmRemove(false);
    writeMeal([]);
    goToNutrition();
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={handleBack} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">AI Meal</Text>
        <Pressable onPress={() => setConfirmRemove(true)} hitSlop={8} style={{ position: "absolute", right: 16 }} accessibilityLabel="Remove this meal">
          <Ionicons name="trash-outline" size={22} color={colors.neutral.textSecondary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ alignItems: "center", paddingHorizontal: 20, paddingTop: 28, paddingBottom: insets.bottom + 32, gap: 32 }} showsVerticalScrollIndicator={false}>
        {meal.photoUrl !== "" && (
          <Animated.View entering={FadeInDown.springify().damping(14)}>
            <Polaroid.Root width={Math.min(width - 120, 250)} tilt={-3}>
              <Polaroid.Tape />
              <Polaroid.Photo source={{ uri: meal.photoUrl }} alt="Your meal" />
              <Polaroid.Footer>
                <Polaroid.Caption>{slotLabel}</Polaroid.Caption>
                <Polaroid.Meta>{dateLabel}</Polaroid.Meta>
              </Polaroid.Footer>
            </Polaroid.Root>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(200).springify().damping(16)}>
          <ReceiptCard.Root width={Math.min(width - 40, 360)}>
            <ReceiptCard.Header>
              <ReceiptCard.Store>GYMCREW KITCHEN</ReceiptCard.Store>
              <ReceiptCard.Meta>{`${slotLabel} · ${dateLabel}`}</ReceiptCard.Meta>
            </ReceiptCard.Header>
            <ReceiptCard.Separator />
            <ReceiptCard.Items>
              {meal.items.map((item) => (
                <ReceiptCard.Item key={item.id} label={`${item.name} · ${formatAmount(item.grams, item.unit)}`} value={`${Math.round(item.calories)} kcal`} />
              ))}
            </ReceiptCard.Items>
            <ReceiptCard.Separator />
            <ReceiptCard.Items>
              <ReceiptCard.Item label="Protein" value={`${totals.proteinG} g`} />
              <ReceiptCard.Item label="Carbs" value={`${totals.carbsG} g`} />
              <ReceiptCard.Item label="Fat" value={`${totals.fatG} g`} />
            </ReceiptCard.Items>
            <ReceiptCard.Separator variant="solid" />
            <ReceiptCard.Total label="TOTAL" value={`${Math.round(totals.calories)} kcal`} />
            <ReceiptCard.Note>Estimated by AI from your photo.</ReceiptCard.Note>
            <ReceiptCard.Barcode code={meal.id.slice(-12).toUpperCase()} />
            <ReceiptCard.TornEdge side="bottom" />
          </ReceiptCard.Root>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(350).springify()} className="w-full gap-2.5">
          <Text className="caption font-body-bold text-text-secondary" style={{ letterSpacing: 1.2 }}>
            NOT RIGHT? TAKE AN INGREDIENT OUT
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {meal.items.map((item) => (
              <Pressable key={item.id} onPress={() => handleRemoveIngredient(item.id)} className="flex-row items-center gap-1.5 rounded-full border border-divider bg-surface px-3 py-2">
                <Text className="caption font-body-semibold text-text-primary">{item.name}</Text>
                <Ionicons name="trash-outline" size={14} color={colors.semantic.error} />
              </Pressable>
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      <ConfirmModal
        visible={confirmRemove}
        title="Remove this meal?"
        message="It will be taken out of your food log, with all its ingredients."
        confirmLabel="Remove"
        destructive
        onConfirm={handleRemoveMeal}
        onCancel={() => setConfirmRemove(false)}
      />
    </View>
  );
}
