import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconBadge } from "@/components/IconBadge";
import { SkewedStat } from "@/components/SkewedStat";
import { Stepper } from "@/components/Stepper";
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

/** Food detail + amount screen (see NUTRITION.md section 7) — doubles as the "edit an already-logged
 * entry" screen when `logId` is present (tapping a row in Today's Food), same "one screen, two
 * entry points" trick the rest of the app uses (e.g. workout/summary.tsx handling both a
 * just-finished and a historical workout). */
export default function FoodDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id, logId } = useLocalSearchParams<{ id: string; logId?: string }>();

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
  const [mealSlot, setMealSlot] = useState<MealSlot>(existingLog?.mealSlot ?? mealSlotForTime());

  const isFavorite = food ? favoriteIds.includes(food.id) : false;
  const step = food?.servingUnit === "piece" ? 1 : food && food.servingSize <= 30 ? 1 : 5;

  const macros = food ? scaleMacros(food, quantity) : existingLog
    ? { calories: existingLog.calories, proteinG: existingLog.proteinG, carbsG: existingLog.carbsG, fatG: existingLog.fatG }
    : { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  const extendedMacros = food ? scaleExtendedMacros(food, quantity) : null;
  const hasExtendedInfo = extendedMacros && (extendedMacros.fiberG !== null || extendedMacros.sugarG !== null || extendedMacros.saturatedFatG !== null || extendedMacros.sodiumMg !== null);

  function handleBack() {
    if (router.canGoBack()) router.back();
    else router.replace("/nutrition");
  }

  function handleAdd() {
    if (!food) return;
    addEntry({
      foodId: food.id,
      mealId: null,
      name: food.name,
      mealSlot,
      quantity,
      unit: food.servingUnit,
      dateKey: toDateKey(new Date()),
      ...macros,
    });
    router.replace("/nutrition");
  }

  function handleUpdate() {
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
    handleBack();
  }

  function handleRemove() {
    if (!existingLog) return;
    removeEntry(existingLog.id);
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

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={handleBack} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">{logId ? "Edit Entry" : "Food"}</Text>
        {food && (
          <Pressable onPress={() => toggleFavorite(food.id)} hitSlop={8} style={{ position: "absolute", right: 16 }}>
            <Ionicons name={isFavorite ? "star" : "star-outline"} size={22} color={isFavorite ? colors.brand.yellow : colors.neutral.textSecondary} />
          </Pressable>
        )}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: insets.bottom + 32, gap: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center gap-3">
          {food?.photoUrl ? (
            <Image source={{ uri: food.photoUrl }} style={{ width: 72, height: 72, borderRadius: 16 }} resizeMode="cover" />
          ) : (
            <View className="h-[72px] w-[72px] items-center justify-center rounded-2xl bg-surface">
              <Ionicons name="fast-food-outline" size={26} color={colors.neutral.textSecondary} />
            </View>
          )}
          <View className="flex-1 gap-1">
            <Text className="heading-3 text-text-primary">{displayName}</Text>
            {food?.brand && <Text className="body-sm text-text-secondary">{food.brand}</Text>}
            {food && <Text className="body-sm text-text-secondary">{`${food.calories} kcal / ${food.servingSize}${food.servingUnit}`}</Text>}
          </View>
        </View>

        {food?.source === "open_food_facts" && (
          <View className="-mt-3 flex-row items-center gap-1.5">
            <Ionicons name="information-circle-outline" size={13} color={colors.neutral.textSecondary} />
            <Text className="caption flex-1 text-text-secondary">From Open Food Facts — community data, may not always be accurate.</Text>
          </View>
        )}

        <View className="flex-row gap-3">
          <View className="flex-1 items-center gap-1.5 rounded-2xl border border-divider bg-surface p-3">
            <IconBadge icon="flame-outline" color={NUTRITION_COLORS.calories} size={28} />
            <SkewedStat size={20} color={colors.neutral.textPrimary}>{String(macros.calories)}</SkewedStat>
            <Text className="caption text-text-secondary">Calories</Text>
          </View>
          <View className="flex-1 items-center gap-1.5 rounded-2xl border border-divider bg-surface p-3">
            <IconBadge icon="barbell-outline" color={NUTRITION_COLORS.protein} size={28} />
            <SkewedStat size={20} color={colors.neutral.textPrimary}>{`${macros.proteinG}g`}</SkewedStat>
            <Text className="caption text-text-secondary">Protein</Text>
          </View>
          <View className="flex-1 items-center gap-1.5 rounded-2xl border border-divider bg-surface p-3">
            <IconBadge icon="flash-outline" color={NUTRITION_COLORS.carbs} size={28} />
            <SkewedStat size={20} color={colors.neutral.textPrimary}>{`${macros.carbsG}g`}</SkewedStat>
            <Text className="caption text-text-secondary">Carbs</Text>
          </View>
          <View className="flex-1 items-center gap-1.5 rounded-2xl border border-divider bg-surface p-3">
            <IconBadge icon="water-outline" color={NUTRITION_COLORS.fat} size={28} />
            <SkewedStat size={20} color={colors.neutral.textPrimary}>{`${macros.fatG}g`}</SkewedStat>
            <Text className="caption text-text-secondary">Fat</Text>
          </View>
        </View>

        {hasExtendedInfo && extendedMacros && (
          <View className="gap-2 rounded-2xl border border-divider bg-surface p-3.5">
            <Text className="caption font-body-semibold text-text-secondary">MORE NUTRITION INFO</Text>
            <View className="gap-1.5">
              {extendedMacros.fiberG !== null && (
                <View className="flex-row items-center justify-between">
                  <Text className="body-sm text-text-secondary">Fiber</Text>
                  <Text className="body-sm font-body-semibold text-text-primary">{`${extendedMacros.fiberG}g`}</Text>
                </View>
              )}
              {extendedMacros.sugarG !== null && (
                <View className="flex-row items-center justify-between">
                  <Text className="body-sm text-text-secondary">Sugar</Text>
                  <Text className="body-sm font-body-semibold text-text-primary">{`${extendedMacros.sugarG}g`}</Text>
                </View>
              )}
              {extendedMacros.saturatedFatG !== null && (
                <View className="flex-row items-center justify-between">
                  <Text className="body-sm text-text-secondary">Saturated Fat</Text>
                  <Text className="body-sm font-body-semibold text-text-primary">{`${extendedMacros.saturatedFatG}g`}</Text>
                </View>
              )}
              {extendedMacros.sodiumMg !== null && (
                <View className="flex-row items-center justify-between">
                  <Text className="body-sm text-text-secondary">Sodium</Text>
                  <Text className="body-sm font-body-semibold text-text-primary">{`${extendedMacros.sodiumMg}mg`}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {canEditAmount && food && (
          <Stepper
            label="Amount"
            value={quantity}
            onChange={setQuantity}
            step={step}
            min={0}
            max={5000}
            rightAdornment={<Text className="caption text-text-secondary">{food.servingUnit}</Text>}
          />
        )}

        <View className="gap-2">
          <Text className="body-sm text-text-secondary">Meal</Text>
          <View className="flex-row gap-2">
            {MEAL_SLOTS.map((option) => {
              const selected = mealSlot === option.key;
              return (
                <Pressable
                  key={option.key}
                  onPress={() => setMealSlot(option.key)}
                  className={`flex-1 items-center rounded-xl border py-2.5 ${selected ? "border-brand-yellow bg-brand-yellow" : "border-divider bg-surface"}`}
                >
                  <Text className={`caption font-body-semibold ${selected ? "text-brand-iron" : "text-text-secondary"}`}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {logId ? (
          <View className="gap-3">
            <Pressable onPress={handleUpdate} className="items-center rounded-full bg-brand-yellow py-4">
              <Text className="body-md font-body-semibold text-brand-iron">Update Entry</Text>
            </Pressable>
            <Pressable onPress={handleRemove} className="items-center rounded-full border border-divider py-4">
              <Text className="body-md font-body-semibold text-error">Remove</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={handleAdd} disabled={!food} className={`items-center rounded-full py-4 ${food ? "bg-brand-yellow" : "bg-surface"}`}>
            <Text className={`body-md font-body-semibold ${food ? "text-brand-iron" : "text-text-secondary"}`}>Add to Today&apos;s Log</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}
