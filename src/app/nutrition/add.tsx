import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";

import { goToNutrition } from "@/lib/nutrition-nav";
import { AddFoodShortcuts } from "@/components/AddFoodShortcuts";
import { AiBeamFrame } from "@/components/AiBeamFrame";
import { DiaryRecent } from "@/components/DiaryRecent";
import { FoodListRow } from "@/components/FoodListRow";
import { NutritionPageHeader } from "@/components/NutritionPageHeader";
import { SavedMealRow } from "@/components/SavedMealRow";
import AnimatedInputBar from "@/components/ui/base/animated-input-bar";
import { nutritionIcons } from "@/constants/images";
import type { Food } from "@/data/nutrition-foods";
import { useOffSearch } from "@/hooks/use-off-search";
import { aiMealIdFromFoodId } from "@/lib/ai-meals";
import type { ApiFoodLog, ApiMeal } from "@/lib/api";
import { toDateKey } from "@/lib/date";
import { searchCustomFoods, foodsById as buildFoodsById } from "@/lib/food-search";
import { MEAL_SLOTS, mealSlotForTime, type MealSlot } from "@/lib/meal-slot";
import { recentFoodLogs } from "@/lib/recent-foods";
import { useCustomFoodsStore } from "@/store/custom-foods-store";
import { useFavoriteFoodsStore } from "@/store/favorite-foods-store";
import { useNutritionLogStore } from "@/store/nutrition-log-store";
import { useNutritionMealsStore } from "@/store/nutrition-meals-store";
import { useOffFoodsCacheStore } from "@/store/off-foods-cache-store";
import { colors, fontFamily } from "@/theme";

const SEARCH_PLACEHOLDERS = ["Search chicken breast…", "Try oats or rice…", "Greek yoghurt, banana…", "Type any food"];

function SectionTitle({ children }: { children: string }) {
  return <Text style={{ fontFamily: fontFamily.heading, fontSize: 28, letterSpacing: 1, color: colors.brand.white }}>{children}</Text>;
}

export default function AddFoodScreen() {
  const insets = useSafeAreaInsets();
  const posthog = usePostHog();
  const { date, slot } = useLocalSearchParams<{ date?: string; slot?: string }>();
  const targetDateKey = date ?? toDateKey(new Date());
  // Coming from an empty meal in the diary, everything added here goes to that meal.
  const targetSlot: MealSlot = MEAL_SLOTS.find((option) => option.key === slot)?.key ?? mealSlotForTime();
  const slotParam = slot ? { slot } : {};
  const [query, setQuery] = useState("");

  const customFoods = useCustomFoodsStore((state) => state.foods);
  const offCachedFoods = useOffFoodsCacheStore((state) => state.foods);
  const favoriteIds = useFavoriteFoodsStore((state) => state.favoriteIds);
  const logEntries = useNutritionLogStore((state) => state.entries);
  const addEntry = useNutritionLogStore((state) => state.addEntry);
  const meals = useNutritionMealsStore((state) => state.meals);

  const knownFoodsById = useMemo(() => ({ ...buildFoodsById(customFoods), ...offCachedFoods }), [customFoods, offCachedFoods]);
  const favoriteFoods = useMemo(
    () => favoriteIds.map((id) => knownFoodsById[id]).filter((food): food is Food => food !== undefined),
    [favoriteIds, knownFoodsById],
  );
  // Meals scanned from a photo have no food behind them to "add again" — they're left out here.
  const recentEntries = useMemo(() => recentFoodLogs(logEntries.filter((entry) => aiMealIdFromFoodId(entry.foodId) === null), 8), [logEntries]);
  const photoByFoodId = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    for (const food of Object.values(knownFoodsById)) map[food.id] = food.photoUrl;
    return map;
  }, [knownFoodsById]);
  const savedMeals = useMemo(() => meals.filter((meal) => meal.kind === "meal").slice(0, 4), [meals]);
  const savedShakes = useMemo(() => meals.filter((meal) => meal.kind === "shake").slice(0, 4), [meals]);

  const localResults = useMemo(() => (query.trim() ? searchCustomFoods(query, customFoods) : []), [query, customFoods]);

  const { results: offResults, loading: offLoading, loadingMore: offLoadingMore, hasMore: offHasMore, loadMore: loadMoreOff } = useOffSearch(query);

  const localIds = useMemo(() => new Set(localResults.map((food) => food.id)), [localResults]);
  const results = useMemo(
    () => [...localResults, ...offResults.filter((food) => !localIds.has(food.id))],
    [localResults, offResults, localIds],
  );

  function openFood(foodId: string) {
    router.push({ pathname: "/nutrition/food/[id]", params: { id: foodId, date: targetDateKey, ...slotParam } });
  }

  function quickAddRecent(entry: ApiFoodLog) {
    if (!entry.foodId) return;
    addEntry({
      foodId: entry.foodId,
      mealId: null,
      name: entry.name,
      mealSlot: targetSlot,
      quantity: entry.quantity,
      unit: entry.unit,
      calories: entry.calories,
      proteinG: entry.proteinG,
      carbsG: entry.carbsG,
      fatG: entry.fatG,
      dateKey: targetDateKey,
    });
    posthog.capture("food_logged", { source: "recent_quick_add", quantity: entry.quantity, unit: entry.unit, calories: entry.calories });
    goToNutrition();
  }

  /** One tap: logs a saved meal or shake as saved, into the chosen meal. */
  function quickAddMeal(meal: ApiMeal) {
    addEntry({
      foodId: null,
      mealId: meal.id,
      name: meal.name,
      mealSlot: targetSlot,
      quantity: 1,
      unit: "serving",
      calories: meal.totalCalories,
      proteinG: meal.totalProteinG,
      carbsG: meal.totalCarbsG,
      fatG: meal.totalFatG,
      dateKey: targetDateKey,
    });
    posthog.capture("meal_logged", { kind: meal.kind, meal_id: meal.id, calories: meal.totalCalories, modified: false, source: "add_food_quick_add" });
    goToNutrition();
  }

  function addMeal(mealId: string) {
    router.push({ pathname: "/nutrition/meal/[id]", params: { id: mealId, date: targetDateKey } });
  }

  const slotLabel = MEAL_SLOTS.find((option) => option.key === targetSlot)?.label ?? "";
  const nothingSaved = recentEntries.length === 0 && favoriteFoods.length === 0 && savedMeals.length === 0 && savedShakes.length === 0;

  return (
    <View className="flex-1 bg-background">
      <NutritionPageHeader title="Add food" subtitle={slot ? `Adding to ${slotLabel}` : undefined} onBack={() => (router.canGoBack() ? router.back() : router.replace("/nutrition"))} />

      <View className="mx-4 mb-3 flex-row items-center rounded-full border border-divider bg-surface pl-4">
        <Ionicons name="search" size={18} color={colors.neutral.textSecondary} />
        <View className="flex-1">
          <AnimatedInputBar
            placeholders={SEARCH_PLACEHOLDERS}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoFocus
            returnKeyType="search"
            selectionColor={colors.brand.yellow}
            containerStyle={{ marginVertical: 0 }}
            inputWrapperStyle={{ paddingHorizontal: 12, paddingVertical: 14, minHeight: 50 }}
            placeholderLeft={12}
            placeholderStyle={{ fontFamily: fontFamily.bodyRegular, fontSize: 15 }}
            inputStyle={{ fontFamily: fontFamily.bodyRegular, fontSize: 15 }}
          />
        </View>
        {query.length > 0 && (
          <Pressable onPress={() => setQuery("")} hitSlop={8} className="pr-4">
            <Ionicons name="close-circle" size={18} color={colors.neutral.textSecondary} />
          </Pressable>
        )}
      </View>

      {query.trim() ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => <FoodListRow food={item} onPress={() => openFood(item.id)} isLast={index === results.length - 1} />}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}
          ListFooterComponent={
            offLoading ? (
              <View className="flex-row items-center justify-center gap-2 py-4">
                <ActivityIndicator size="small" color={colors.neutral.textSecondary} />
                <Text className="caption text-text-secondary">Searching Open Food Facts…</Text>
              </View>
            ) : offHasMore ? (
              <Pressable onPress={loadMoreOff} disabled={offLoadingMore} className="my-3 items-center rounded-full border border-divider py-3">
                {offLoadingMore ? <ActivityIndicator size="small" color={colors.neutral.textSecondary} /> : <Text className="body-sm font-body-semibold text-brand-yellow">Load More Results</Text>}
              </Pressable>
            ) : null
          }
          ListEmptyComponent={
            offLoading ? null : (
              <View className="items-center gap-3 py-14">
                <Text className="body-md text-text-secondary">No foods found for &quot;{query}&quot;.</Text>
                <Pressable onPress={() => router.push({ pathname: "/nutrition/create-food", params: { name: query, date: targetDateKey, ...slotParam } })} className="rounded-full bg-brand-yellow px-5 py-2.5">
                  <Text className="body-sm font-body-semibold text-brand-iron">Create &quot;{query}&quot;</Text>
                </Pressable>
              </View>
            )
          }
        />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: insets.bottom + 32, gap: 28 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.springify().damping(16)} className="flex-row gap-3">
            <Pressable
              onPress={() => router.push({ pathname: "/nutrition/scan-barcode", params: { date: targetDateKey, ...slotParam } })}
              className="h-28 flex-1 justify-end rounded-3xl bg-brand-yellow p-4"
              accessibilityLabel="Scan a barcode"
            >
              <Text style={{ fontFamily: fontFamily.heading, fontSize: 28, lineHeight: 28, letterSpacing: 0.8, color: colors.brand.iron }}>SCAN BARCODE</Text>
              <Text className="caption" style={{ color: "rgba(31,35,40,0.7)" }}>
                Packaged food
              </Text>
            </Pressable>
            <View className="flex-1">
              <AiBeamFrame>
                <Pressable
                  onPress={() => router.push({ pathname: "/nutrition/scan-meal", params: { date: targetDateKey, ...slotParam } })}
                  style={{ backgroundColor: colors.neutral.surface, borderRadius: 24, height: 112 }}
                  className="justify-end p-4"
                  accessibilityLabel="Scan a meal with AI"
                >
                  <View style={{ backgroundColor: colors.brand.yellow }} className="absolute right-3 top-3 rounded-md px-1.5 py-0.5">
                    <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 9, color: colors.brand.iron }}>AI</Text>
                  </View>
                  <Text style={{ fontFamily: fontFamily.heading, fontSize: 28, lineHeight: 28, letterSpacing: 0.8, color: colors.brand.white }}>SCAN A MEAL</Text>
                  <Text className="caption text-text-secondary">A photo, the AI does the rest</Text>
                </Pressable>
              </AiBeamFrame>
            </View>
          </Animated.View>

          <AddFoodShortcuts
            shortcuts={[
              { id: "meals", title: "My meals", hint: "Meals you saved, one tap to log.", cta: "Open", image: nutritionIcons.myMeals, onPress: () => goToNutrition("foods", { tab: "meal" }) },
              { id: "foods", title: "My foods", hint: "Foods you created yourself.", cta: "Open", image: nutritionIcons.myFoods, onPress: () => goToNutrition("foods") },
              { id: "shakes", title: "My shakes", hint: "Your shake recipes — or build a new one.", cta: "Open", image: nutritionIcons.protein, onPress: () => goToNutrition("foods", { tab: "shake" }) },
              { id: "create", title: "Create food", hint: "Your own food, with its own macros.", cta: "Create", image: nutritionIcons.tasks, onPress: () => router.push({ pathname: "/nutrition/create-food", params: { date: targetDateKey, ...slotParam } }) },
              { id: "quick", title: "Quick add", hint: "Just the calories, no searching.", cta: "Add", image: nutritionIcons.calories, onPress: () => router.push({ pathname: "/nutrition/quick-add", params: { date: targetDateKey, ...slotParam } }) },
            ]}
          />

          <DiaryRecent title="RECENTLY ADDED" entries={recentEntries} photoByFoodId={photoByFoodId} onAdd={quickAddRecent} />

          {favoriteFoods.length > 0 && (
            <View className="gap-1">
              <SectionTitle>FAVORITES</SectionTitle>
              {favoriteFoods.map((food, index) => (
                <Animated.View key={food.id} entering={FadeInDown.delay(index * 60).springify().damping(16)}>
                  <FoodListRow food={food} onPress={() => openFood(food.id)} isLast={index === favoriteFoods.length - 1} />
                </Animated.View>
              ))}
            </View>
          )}

          {[
            { title: "MY MEALS", list: savedMeals },
            { title: "MY SHAKES", list: savedShakes },
          ].map(
            (group) =>
              group.list.length > 0 && (
                <View key={group.title} className="gap-1">
                  <SectionTitle>{group.title}</SectionTitle>
                  {group.list.map((meal, index) => (
                    <SavedMealRow
                      key={meal.id}
                      meal={meal}
                      index={index}
                      isLast={index === group.list.length - 1}
                      onPress={() => addMeal(meal.id)}
                      onQuickAdd={() => quickAddMeal(meal)}
                    />
                  ))}
                </View>
              ),
          )}

          {nothingSaved && <Text className="body-sm text-center text-text-secondary">Search for any food above — millions of real products from Open Food Facts.</Text>}
        </ScrollView>
      )}
    </View>
  );
}
