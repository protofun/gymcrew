import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, ScrollView, Text, TextInput, View, type ImageSourcePropType } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";

import { FoodThumbnail } from "@/components/FoodThumbnail";
import { IconBadge } from "@/components/IconBadge";
import { SkewedStat } from "@/components/SkewedStat";
import { nutritionIcons } from "@/constants/images";
import type { Food } from "@/data/nutrition-foods";
import { useOffSearch } from "@/hooks/use-off-search";
import { toDateKey } from "@/lib/date";
import { searchCustomFoods, foodsById as buildFoodsById } from "@/lib/food-search";
import { mealSlotForTime } from "@/lib/meal-slot";
import { NUTRITION_COLORS } from "@/lib/nutrition-colors";
import { recentFoodLogs } from "@/lib/recent-foods";
import { useCustomFoodsStore } from "@/store/custom-foods-store";
import { useFavoriteFoodsStore } from "@/store/favorite-foods-store";
import { useNutritionLogStore } from "@/store/nutrition-log-store";
import { useNutritionMealsStore } from "@/store/nutrition-meals-store";
import { useOffFoodsCacheStore } from "@/store/off-foods-cache-store";
import { colors } from "@/theme";

function FoodResultRow({ food, onPress }: { food: Food; onPress: () => void }) {
  const isOff = food.source === "open_food_facts";
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-2xl py-2"
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <FoodThumbnail photoUrl={food.photoUrl} icon={isOff ? "globe-outline" : "fast-food"} color={isOff ? colors.semantic.info : colors.brand.yellow} size={48} />
      <View className="flex-1 gap-0.5">
        <Text className="body-md font-body-semibold text-text-primary" numberOfLines={1}>
          {food.name}
          {food.brand ? <Text className="body-sm text-text-secondary"> — {food.brand}</Text> : null}
        </Text>
        <View className="flex-row items-center gap-2">
          <Text className="caption font-body-bold" style={{ color: colors.brand.yellow }}>{`${Math.round(food.calories)} kcal`}</Text>
          <Text className="caption text-text-secondary">{`${food.proteinG}g protein / ${food.servingSize}${food.servingUnit}`}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.neutral.textSecondary} />
    </Pressable>
  );
}

function QuickTile({
  icon,
  imageIcon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  /** Takes precedence over `icon` when set — the illustrated sheet icon for concepts it covers
   * (My Meals, My Foods, ...), falling back to the plain Ionicon everywhere else. */
  imageIcon?: ImageSourcePropType;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="flex-1 items-center gap-1.5 rounded-2xl border border-divider bg-surface py-3.5">
      {imageIcon ? (
        <Image source={imageIcon} resizeMode="contain" style={{ width: 26, height: 26 }} />
      ) : (
        <Ionicons name={icon} size={22} color={color} />
      )}
      <Text className="caption font-body-bold text-center text-text-secondary">{label}</Text>
    </Pressable>
  );
}

function TileRow({ label, subtitle, icon, color, onPress }: { label: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap; color: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-3 rounded-2xl border border-divider bg-surface p-3.5">
      <IconBadge icon={icon} color={color} size={44} />
      <Text className="flex-1 body-md font-body-semibold text-text-primary" numberOfLines={1}>
        {label}
      </Text>
      <Text className="caption font-body-semibold" style={{ color }}>{subtitle}</Text>
    </Pressable>
  );
}

export default function AddFoodScreen() {
  const insets = useSafeAreaInsets();
  const posthog = usePostHog();
  const { date } = useLocalSearchParams<{ date?: string }>();
  const targetDateKey = date ?? toDateKey(new Date());
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
  const recentEntries = useMemo(() => recentFoodLogs(logEntries), [logEntries]);
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
    router.push({ pathname: "/nutrition/food/[id]", params: { id: foodId, date: targetDateKey } });
  }

  function quickAddRecent(entry: (typeof recentEntries)[number]) {
    if (!entry.foodId) return;
    addEntry({
      foodId: entry.foodId,
      mealId: null,
      name: entry.name,
      mealSlot: mealSlotForTime(),
      quantity: entry.quantity,
      unit: entry.unit,
      calories: entry.calories,
      proteinG: entry.proteinG,
      carbsG: entry.carbsG,
      fatG: entry.fatG,
      dateKey: targetDateKey,
    });
    posthog.capture("food_logged", { source: "recent_quick_add", quantity: entry.quantity, unit: entry.unit, calories: entry.calories });
    router.replace("/nutrition");
  }

  function addMeal(mealId: string) {
    router.push({ pathname: "/nutrition/meal/[id]", params: { id: mealId, date: targetDateKey } });
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/nutrition"))} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Add Food</Text>
        <Pressable onPress={() => router.push({ pathname: "/nutrition/scan-barcode", params: { date: targetDateKey } })} hitSlop={8} style={{ position: "absolute", right: 16 }}>
          <Ionicons name="barcode-outline" size={24} color={colors.brand.yellow} />
        </Pressable>
      </View>

      <View className="flex-row items-center gap-2 border-b border-divider px-4 py-3">
        <Ionicons name="search" size={18} color={colors.neutral.textSecondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search foods..."
          placeholderTextColor={colors.neutral.textSecondary}
          autoCorrect={false}
          autoFocus
          className="body-md flex-1 text-text-primary"
          style={{ minWidth: 0 }}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery("")} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.neutral.textSecondary} />
          </Pressable>
        )}
      </View>

      {query.trim() ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <FoodResultRow food={item} onPress={() => openFood(item.id)} />}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24, gap: 4 }}
          ListFooterComponent={
            offLoading ? (
              <View className="flex-row items-center justify-center gap-2 py-4">
                <ActivityIndicator size="small" color={colors.neutral.textSecondary} />
                <Text className="caption text-text-secondary">Searching Open Food Facts…</Text>
              </View>
            ) : offHasMore ? (
              <Pressable onPress={loadMoreOff} disabled={offLoadingMore} className="mx-4 my-3 items-center rounded-full border border-divider py-3">
                {offLoadingMore ? (
                  <ActivityIndicator size="small" color={colors.neutral.textSecondary} />
                ) : (
                  <Text className="body-sm font-body-semibold text-brand-yellow">Load More Results</Text>
                )}
              </Pressable>
            ) : null
          }
          ListEmptyComponent={
            offLoading ? null : (
              <View className="items-center gap-3 py-14">
                <Text className="body-md text-text-secondary">No foods found for &quot;{query}&quot;.</Text>
                <Pressable onPress={() => router.push({ pathname: "/nutrition/create-food", params: { name: query, date: targetDateKey } })} className="rounded-full bg-brand-yellow px-5 py-2.5">
                  <Text className="body-sm font-body-semibold text-brand-iron">Create &quot;{query}&quot;</Text>
                </Pressable>
              </View>
            )
          }
        />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: insets.bottom + 32, gap: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            onPress={() => router.push("/nutrition/scan-barcode")}
            className="flex-row items-center gap-3 rounded-2xl bg-brand-yellow px-4 py-3.5"
          >
            <View className="h-9 w-9 items-center justify-center rounded-full bg-brand-iron/15">
              <Ionicons name="barcode-outline" size={20} color={colors.brand.iron} />
            </View>
            <Text className="body-md flex-1 font-body-semibold text-brand-iron">Scan Barcode</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.brand.iron} />
          </Pressable>

          <Pressable
            onPress={() => router.push({ pathname: "/nutrition/scan-meal", params: { date: targetDateKey } })}
            className="flex-row items-center gap-3 rounded-2xl border border-divider bg-surface px-4 py-3.5"
          >
            <View className="h-9 w-9 items-center justify-center rounded-full bg-brand-yellow/15">
              <Ionicons name="sparkles" size={18} color={colors.brand.yellow} />
            </View>
            <Text className="body-md flex-1 font-body-semibold text-text-primary">Scan Meal with AI</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.neutral.textSecondary} />
          </Pressable>

          <View className="flex-row gap-3">
            <QuickTile
              icon="restaurant-outline"
              imageIcon={nutritionIcons.myMeals}
              label="My Meals"
              color={colors.brand.yellow}
              onPress={() => router.push("/nutrition/my-meals")}
            />
            <QuickTile icon="nutrition-outline" label="My Shakes" color={NUTRITION_COLORS.fat} onPress={() => router.push({ pathname: "/nutrition/my-meals", params: { tab: "shake" } })} />
            <QuickTile
              icon="fast-food-outline"
              imageIcon={nutritionIcons.myFoods}
              label="My Foods"
              color={NUTRITION_COLORS.protein}
              onPress={() => router.push("/nutrition/my-foods")}
            />
          </View>
          <View className="flex-row gap-3">
            <QuickTile icon="add-circle-outline" label="Create Food" color={NUTRITION_COLORS.carbs} onPress={() => router.push({ pathname: "/nutrition/create-food", params: { date: targetDateKey } })} />
            <QuickTile icon="flash-outline" label="Quick Add" color={colors.semantic.warning} onPress={() => router.push({ pathname: "/nutrition/quick-add", params: { date: targetDateKey } })} />
          </View>

          {recentEntries.length > 0 && (
            <View className="gap-2.5">
              <Text className="body-sm font-body-semibold text-text-secondary">RECENTLY ADDED</Text>
              <View className="gap-2">
                {recentEntries.map((entry) => (
                  <Pressable
                    key={entry.foodId}
                    onPress={() => quickAddRecent(entry)}
                    className="flex-row items-center gap-3 rounded-2xl border border-divider bg-surface px-3.5 py-3"
                  >
                    <View className="flex-1 gap-0.5">
                      <Text className="body-md font-body-semibold text-text-primary" numberOfLines={1}>{`${entry.name} — ${entry.quantity}${entry.unit}`}</Text>
                      <Text className="caption text-text-secondary">{`${entry.proteinG}g protein`}</Text>
                    </View>
                    <SkewedStat size={18} color={colors.neutral.textPrimary}>
                      {String(Math.round(entry.calories))}
                    </SkewedStat>
                    <View className="h-8 w-8 items-center justify-center rounded-full bg-brand-yellow">
                      <Ionicons name="add" size={16} color={colors.brand.iron} />
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {favoriteFoods.length > 0 && (
            <View className="gap-2.5">
              <Text className="body-sm font-body-semibold text-text-secondary">MY FAVORITES</Text>
              <View className="gap-2">
                {favoriteFoods.map((food) => (
                  <FoodResultRow key={food.id} food={food} onPress={() => openFood(food.id)} />
                ))}
              </View>
            </View>
          )}

          {savedMeals.length > 0 && (
            <View className="gap-2.5">
              <Text className="body-sm font-body-semibold text-text-secondary">MY MEALS</Text>
              <View className="gap-2">
                {savedMeals.map((meal) => (
                  <TileRow
                    key={meal.id}
                    label={meal.name}
                    subtitle={`${Math.round(meal.totalCalories)} kcal · ${meal.totalProteinG}g`}
                    icon="restaurant-outline"
                    color={colors.brand.yellow}
                    onPress={() => addMeal(meal.id)}
                  />
                ))}
              </View>
            </View>
          )}

          {savedShakes.length > 0 && (
            <View className="gap-2.5">
              <Text className="body-sm font-body-semibold text-text-secondary">MY SHAKES</Text>
              <View className="gap-2">
                {savedShakes.map((meal) => (
                  <TileRow
                    key={meal.id}
                    label={meal.name}
                    subtitle={`${Math.round(meal.totalCalories)} kcal · ${meal.totalProteinG}g`}
                    icon="nutrition-outline"
                    color={NUTRITION_COLORS.fat}
                    onPress={() => addMeal(meal.id)}
                  />
                ))}
              </View>
            </View>
          )}

          {recentEntries.length === 0 && favoriteFoods.length === 0 && savedMeals.length === 0 && savedShakes.length === 0 && (
            <View className="items-center gap-3 rounded-2xl border border-dashed border-divider py-14">
              <IconBadge icon="search-outline" color={colors.neutral.textSecondary} size={44} />
              <Text className="body-md text-text-secondary">Search for any food above.</Text>
              <Text className="body-sm text-center text-text-secondary">Powered by Open Food Facts — millions of real products.</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
