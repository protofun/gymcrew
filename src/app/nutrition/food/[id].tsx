import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";

import { goToNutrition } from "@/lib/nutrition-nav";
import { AiScanMacroRing } from "@/components/AiScanMacroRing";
import { AmountPicker } from "@/components/AmountPicker";
import { ConfirmModal } from "@/components/ConfirmModal";
import { FoodHeader } from "@/components/FoodHeader";
import { MealActionBar } from "@/components/MealActionBar";
import { Accordion } from "@/components/ui/molecules/accordion";
import { AI_ACCORDION_THEME } from "@/constants/ai-scan-theme";
import { api, isApiConfigured } from "@/lib/api";
import { toDateKey } from "@/lib/date";
import { MEAL_SLOTS, mealSlotForTime, type MealSlot } from "@/lib/meal-slot";
import { NUTRITION_COLORS } from "@/lib/nutrition-colors";
import { scaleExtendedMacros, scaleMacros } from "@/lib/nutrition-macros";
import { useCustomFoodsStore } from "@/store/custom-foods-store";
import { useFavoriteFoodsStore } from "@/store/favorite-foods-store";
import { useNutritionLogStore } from "@/store/nutrition-log-store";
import { useOffFoodsCacheStore } from "@/store/off-foods-cache-store";
import { colors } from "@/theme";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between py-1.5">
      <Text className="body-sm text-text-secondary">{label}</Text>
      <Text className="body-sm font-body-semibold text-text-primary">{value}</Text>
    </View>
  );
}

/** Food detail + amount screen (see NUTRITION.md section 7) — doubles as the "edit an already-logged
 * entry" screen when `logId` is present, same "one screen, two entry points" trick the rest of the app
 * uses. The amount is picked by dragging a ruler (Reacticx `ruler`); the calories and macros roll along. */
export default function FoodDetailScreen() {
  const insets = useSafeAreaInsets();
  const posthog = usePostHog();
  const { id, logId, date, slot } = useLocalSearchParams<{ id: string; logId?: string; date?: string; slot?: string }>();
  const targetDateKey = date ?? toDateKey(new Date());

  const customFoods = useCustomFoodsStore((state) => state.foods);
  const offFoods = useOffFoodsCacheStore((state) => state.foods);
  const rememberOffFoods = useOffFoodsCacheStore((state) => state.remember);
  const favoriteIds = useFavoriteFoodsStore((state) => state.favoriteIds);
  const toggleFavorite = useFavoriteFoodsStore((state) => state.toggleFavorite);
  const entries = useNutritionLogStore((state) => state.entries);
  const addEntry = useNutritionLogStore((state) => state.addEntry);
  const removeEntry = useNutritionLogStore((state) => state.removeEntry);

  const food = useMemo(() => customFoods.find((f) => f.id === id) ?? offFoods[id], [customFoods, offFoods, id]);
  const existingLog = useMemo(() => (logId ? entries.find((entry) => entry.id === logId) : undefined), [entries, logId]);

  // Open Food Facts is the real database (see data/nutrition-foods.ts) — a product this device
  // hasn't seen locally yet (e.g. tapped from a stale link, or the local cache was cleared) is
  // re-fetched by barcode rather than just failing, since GymCrew never bundles its own copy of it.
  const [refetching, setRefetching] = useState(() => !food && isApiConfigured && id.startsWith("off-"));
  useEffect(() => {
    if (food || !isApiConfigured || !id.startsWith("off-")) return;
    const barcode = id.slice("off-".length);
    setRefetching(true);
    api
      .lookupBarcode(barcode)
      .then((result) => {
        if (result.found) rememberOffFoods([result.food]);
      })
      .catch((error) => console.warn("Failed to re-fetch Open Food Facts product", error))
      .finally(() => setRefetching(false));
  }, [food, id, rememberOffFoods]);

  const [quantity, setQuantity] = useState(existingLog?.quantity ?? food?.servingSize ?? 100);
  const [mealSlot, setMealSlot] = useState<MealSlot>(existingLog?.mealSlot ?? MEAL_SLOTS.find((option) => option.key === slot)?.key ?? mealSlotForTime());
  const [confirmRemove, setConfirmRemove] = useState(false);

  const isFavorite = food ? favoriteIds.includes(food.id) : false;
  const isPiece = food?.servingUnit === "piece";
  const step = isPiece ? 1 : food && food.servingSize <= 30 ? 1 : 5;
  // The ruler's range is fixed when the screen opens — its length must not change while it's being dragged.
  const initialQuantity = existingLog?.quantity ?? food?.servingSize ?? 100;
  const maxAmount = useMemo(() => (isPiece ? Math.max(20, Math.ceil(initialQuantity) + 10) : Math.max(step === 1 ? 300 : 1000, Math.ceil(initialQuantity * 1.5))), [isPiece, step, initialQuantity]);

  const macros = food ? scaleMacros(food, quantity) : existingLog
    ? { calories: existingLog.calories, proteinG: existingLog.proteinG, carbsG: existingLog.carbsG, fatG: existingLog.fatG }
    : { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  const extendedMacros = food ? scaleExtendedMacros(food, quantity) : null;
  const hasExtendedInfo = extendedMacros && (extendedMacros.fiberG !== null || extendedMacros.sugarG !== null || extendedMacros.saturatedFatG !== null || extendedMacros.sodiumMg !== null);

  const presets = useMemo(() => {
    if (!food) return [];
    if (isPiece) return [1, 2, 3, 4].map((count) => ({ label: `${count}`, value: count }));
    const snap = (value: number) => Math.max(step, Math.round(value / step) * step);
    return [
      { label: "½ serving", value: snap(food.servingSize * 0.5) },
      { label: "1 serving", value: snap(food.servingSize) },
      { label: "2 servings", value: snap(food.servingSize * 2) },
    ];
  }, [food, isPiece, step]);

  // Each macro's calories (protein and carbs are 4 kcal/g, fat 9) and its share of all three.
  const kcal = { protein: macros.proteinG * 4, carbs: macros.carbsG * 4, fat: macros.fatG * 9 };
  const kcalSum = kcal.protein + kcal.carbs + kcal.fat;
  const percentOf = (value: number) => (kcalSum > 0 ? (value / kcalSum) * 100 : 0);

  function handleBack() {
    if (router.canGoBack()) router.back();
    else router.replace("/nutrition");
  }

  function commitAdd() {
    if (!food) return;
    addEntry({
      foodId: food.id,
      mealId: null,
      name: food.name,
      mealSlot,
      quantity,
      unit: food.servingUnit,
      dateKey: targetDateKey,
      ...macros,
    });
    posthog.capture("food_logged", {
      source: food.source,
      meal_slot: mealSlot,
      quantity,
      unit: food.servingUnit,
      calories: macros.calories,
      is_today: targetDateKey === toDateKey(new Date()),
    });
  }

  function commitUpdate() {
    if (!existingLog) return;
    removeEntry(existingLog.id);
    addEntry({
      foodId: existingLog.foodId,
      mealId: existingLog.mealId,
      name: existingLog.name,
      mealSlot,
      quantity,
      unit: existingLog.unit,
      dateKey: existingLog.dateKey,
      ...macros,
    });
    posthog.capture("food_log_updated", { meal_slot: mealSlot, quantity, calories: macros.calories });
  }

  function handleRemove() {
    if (!existingLog) return;
    setConfirmRemove(false);
    removeEntry(existingLog.id);
    posthog.capture("food_log_removed", { meal_slot: existingLog.mealSlot, calories: existingLog.calories });
    handleBack();
  }

  if (!food && !existingLog && refetching) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top }} className="items-center justify-center bg-background px-6">
        <ActivityIndicator size="small" color={colors.brand.yellow} />
      </View>
    );
  }

  if (!food && !existingLog) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top }} className="items-center justify-center bg-background px-6">
        <Text className="body-md text-center text-text-secondary">This food couldn&apos;t be found.</Text>
        <Pressable onPress={handleBack} className="mt-4 rounded-full border border-divider px-5 py-2.5">
          <Text className="body-sm font-body-semibold text-text-primary">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const displayName = food?.name ?? existingLog?.name ?? "Food";
  const canEditAmount = food !== undefined;
  const subtitle = food ? [food.brand, `${food.calories} kcal / ${food.servingSize}${food.servingUnit}`].filter(Boolean).join(" · ") : undefined;

  return (
    <View className="flex-1 bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 130 }}>
        <FoodHeader
          photoUrl={food?.photoUrl}
          title={displayName}
          subtitle={subtitle}
          calories={macros.calories}
          label={logId ? "EDIT ENTRY" : "FOOD"}
          onBack={handleBack}
          actions={
            <>
              {logId && (
                <Pressable onPress={() => setConfirmRemove(true)} hitSlop={8} className="h-10 w-10 items-center justify-center rounded-full border border-divider bg-background/60" accessibilityLabel="Remove entry">
                  <Ionicons name="trash-outline" size={19} color={colors.brand.white} />
                </Pressable>
              )}
              {food && (
                <Pressable
                  onPress={() => {
                    toggleFavorite(food.id);
                    posthog.capture(isFavorite ? "food_unfavorited" : "food_favorited", { source: food.source });
                  }}
                  hitSlop={8}
                  className="h-10 w-10 items-center justify-center rounded-full border border-divider bg-background/60"
                  accessibilityLabel={isFavorite ? "Remove from favorites" : "Add to favorites"}
                >
                  <Ionicons name={isFavorite ? "star" : "star-outline"} size={19} color={isFavorite ? colors.brand.yellow : colors.brand.white} />
                </Pressable>
              )}
            </>
          }
        />

        <View className="gap-7 px-5 pt-4">
          {food?.source === "open_food_facts" && (
            <View className="-mt-1 flex-row items-center gap-1.5">
              <Ionicons name="information-circle-outline" size={13} color={colors.neutral.textSecondary} />
              <Text className="caption flex-1 text-text-secondary">From Open Food Facts — community data, may not always be accurate.</Text>
            </View>
          )}

          {canEditAmount && food && (
            <Animated.View entering={FadeInDown.delay(100).springify().damping(16)}>
              <AmountPicker value={quantity} unit={food.servingUnit} min={step} max={maxAmount} step={step} onChange={setQuantity} presets={presets} />
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.delay(200).springify().damping(16)} className="flex-row justify-around border-y border-divider py-5">
            <AiScanMacroRing label="PROTEIN" grams={macros.proteinG} kcal={kcal.protein} percent={percentOf(kcal.protein)} color={NUTRITION_COLORS.protein} />
            <AiScanMacroRing label="CARBS" grams={macros.carbsG} kcal={kcal.carbs} percent={percentOf(kcal.carbs)} color={NUTRITION_COLORS.carbs} />
            <AiScanMacroRing label="FAT" grams={macros.fatG} kcal={kcal.fat} percent={percentOf(kcal.fat)} color={NUTRITION_COLORS.fat} />
          </Animated.View>

          {hasExtendedInfo && extendedMacros && (
            <Accordion type="single" flush theme={AI_ACCORDION_THEME}>
              <Accordion.Item value="more">
                <Accordion.Trigger>
                  <Text className="body-md flex-1 font-body-semibold text-text-primary">More nutrition info</Text>
                </Accordion.Trigger>
                <Accordion.Content>
                  <View>
                    {extendedMacros.fiberG !== null && <InfoRow label="Fiber" value={`${extendedMacros.fiberG}g`} />}
                    {extendedMacros.sugarG !== null && <InfoRow label="Sugar" value={`${extendedMacros.sugarG}g`} />}
                    {extendedMacros.saturatedFatG !== null && <InfoRow label="Saturated Fat" value={`${extendedMacros.saturatedFatG}g`} />}
                    {extendedMacros.sodiumMg !== null && <InfoRow label="Sodium" value={`${extendedMacros.sodiumMg}mg`} />}
                  </View>
                </Accordion.Content>
              </Accordion.Item>
            </Accordion>
          )}
        </View>
      </ScrollView>

      <MealActionBar
        mealSlot={mealSlot}
        onChangeMealSlot={setMealSlot}
        actionLabel={logId ? "Update in" : "Add to"}
        saveLabel={logId ? "Update" : "Add"}
        savedLabel={logId ? "Saved" : "Added"}
        disabled={!food && !existingLog}
        onSave={logId ? commitUpdate : commitAdd}
        onSaved={() => (logId ? handleBack() : goToNutrition())}
      />

      <ConfirmModal
        visible={confirmRemove}
        title="Remove this entry?"
        message="It will be taken out of your food log."
        confirmLabel="Remove"
        destructive
        onConfirm={handleRemove}
        onCancel={() => setConfirmRemove(false)}
      />
    </View>
  );
}
