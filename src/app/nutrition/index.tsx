import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";

import { DatePickerModal } from "@/components/DatePickerModal";
import { FoodLogRow } from "@/components/FoodLogRow";
import { MacroCard } from "@/components/MacroCard";
import { NutritionBanner } from "@/components/NutritionBanner";
import { NutritionNavBar } from "@/components/NutritionNavBar";
import { WaterTracker } from "@/components/WaterTracker";
import { images, nutritionIcons } from "@/constants/images";
import type { ApiFoodLog } from "@/lib/api";
import { addDays, formatDiaryDate, toDateKey } from "@/lib/date";
import { MEAL_SLOTS } from "@/lib/meal-slot";
import { sumMacros } from "@/lib/nutrition-macros";
import { NUTRITION_COLORS } from "@/lib/nutrition-colors";
import { estimateCalories } from "@/lib/workout-sessions";
import { useCustomFoodsStore } from "@/store/custom-foods-store";
import { useNutritionLogStore } from "@/store/nutrition-log-store";
import { useNutritionMealsStore } from "@/store/nutrition-meals-store";
import { useNutritionTargetsStore } from "@/store/nutrition-targets-store";
import { useOffFoodsCacheStore } from "@/store/off-foods-cache-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";
import { colors } from "@/theme";

function MealSection({
  label,
  entries,
  photoByFoodId,
  photoByMealId,
  onPressEntry,
  onRemoveEntry,
}: {
  label: string;
  entries: ApiFoodLog[];
  photoByFoodId: Record<string, string | undefined>;
  photoByMealId: Record<string, string | undefined>;
  onPressEntry: (entry: ApiFoodLog) => void;
  onRemoveEntry: (entry: ApiFoodLog) => void;
}) {
  if (entries.length === 0) return null;
  const calories = Math.round(entries.reduce((sum, entry) => sum + entry.calories, 0));
  return (
    <View className="gap-2.5">
      <View className="flex-row items-center gap-1.5">
        <Text className="body-sm font-body-semibold text-text-secondary">{label.toUpperCase()}</Text>
        <Text className="caption text-text-secondary">{`· ${calories} kcal`}</Text>
      </View>
      <View className="gap-2">
        {entries.map((entry) => (
          <FoodLogRow
            key={entry.id}
            entry={entry}
            photoUrl={entry.mealId ? photoByMealId[entry.mealId] : entry.foodId ? photoByFoodId[entry.foodId] : undefined}
            onPress={() => onPressEntry(entry)}
            onRemove={() => onRemoveEntry(entry)}
          />
        ))}
      </View>
    </View>
  );
}

export default function NutritionScreen() {
  const insets = useSafeAreaInsets();
  const posthog = usePostHog();
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => toDateKey(today), [today]);

  // The diary date being viewed — every food logger (MyFitnessPal, Cronometer, Lifesum) lets you
  // page back through past days, not just see "today" with no way to review or fix an earlier one.
  const [viewedDate, setViewedDate] = useState(today);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const viewedDateKey = useMemo(() => toDateKey(viewedDate), [viewedDate]);
  const isToday = viewedDateKey === todayKey;
  const previousDateKey = useMemo(() => toDateKey(addDays(viewedDate, -1)), [viewedDate]);

  const allEntries = useNutritionLogStore((state) => state.entries);
  const removeEntry = useNutritionLogStore((state) => state.removeEntry);
  const copyDay = useNutritionLogStore((state) => state.copyDay);

  const calories = useNutritionTargetsStore((state) => state.calories);
  const proteinG = useNutritionTargetsStore((state) => state.proteinG);
  const carbsG = useNutritionTargetsStore((state) => state.carbsG);
  const fatG = useNutritionTargetsStore((state) => state.fatG);
  const hasTargets = calories !== null && proteinG !== null && carbsG !== null && fatG !== null;

  const viewedEntries = useMemo(() => allEntries.filter((entry) => entry.dateKey === viewedDateKey), [allEntries, viewedDateKey]);
  const totals = useMemo(() => sumMacros(viewedEntries), [viewedEntries]);

  const customFoods = useCustomFoodsStore((state) => state.foods);
  const offFoods = useOffFoodsCacheStore((state) => state.foods);
  const meals = useNutritionMealsStore((state) => state.meals);
  const photoByFoodId = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    for (const food of customFoods) map[food.id] = food.photoUrl;
    for (const food of Object.values(offFoods)) map[food.id] = food.photoUrl;
    return map;
  }, [customFoods, offFoods]);
  // A meal itself has no photo of its own — borrow the first ingredient's photo (if any) as its
  // representative thumbnail, same "food is visual" reasoning as everywhere else in the log.
  const photoByMealId = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    for (const meal of meals) map[meal.id] = meal.items.find((item) => item.photoUrl)?.photoUrl;
    return map;
  }, [meals]);

  const hasPreviousDayEntries = useMemo(() => allEntries.some((entry) => entry.dateKey === previousDateKey), [allEntries, previousDateKey]);

  // Exercise calories add back into the day's budget — the same "Goal + Exercise = More Food"
  // mechanic every major food logger uses, and a natural fit for a gym app specifically: training
  // hard should visibly earn more room, not just be tracked in a separate tab.
  const bodyWeightKg = useOnboardingStore((state) => state.onboarding.weightKg) ?? 85;
  const workouts = useWorkoutHistoryStore((state) => state.workouts);
  const exerciseCalories = useMemo(
    () =>
      workouts
        .filter((workout) => toDateKey(new Date(workout.completedAt)) === viewedDateKey)
        .reduce((sum, workout) => sum + estimateCalories(Math.round(workout.durationSeconds / 60), bodyWeightKg), 0),
    [workouts, viewedDateKey, bodyWeightKg],
  );

  const targets = { calories: calories ?? 0, proteinG: proteinG ?? 0, carbsG: carbsG ?? 0, fatG: fatG ?? 0 };
  const adjustedCalorieTarget = targets.calories + exerciseCalories;
  const calorieRatio = adjustedCalorieTarget > 0 ? totals.calories / adjustedCalorieTarget : 0;

  function handleEntryPress(entry: ApiFoodLog) {
    if (entry.mealId) {
      router.push({ pathname: "/nutrition/meal/[id]", params: { id: entry.mealId } });
      return;
    }
    router.push({ pathname: "/nutrition/food/[id]", params: { id: entry.foodId ?? "custom", logId: entry.id } });
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/home"))} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Nutrition</Text>
        <Pressable onPress={() => router.push("/nutrition/targets")} hitSlop={8} style={{ position: "absolute", right: 16 }}>
          <Ionicons name="settings-outline" size={22} color={colors.neutral.textSecondary} />
        </Pressable>
      </View>

      <View className="flex-row items-center justify-between border-b border-divider px-4 py-2.5">
        <Pressable onPress={() => setViewedDate((prev) => addDays(prev, -1))} hitSlop={10} className="p-1">
          <Ionicons name="chevron-back" size={18} color={colors.neutral.textSecondary} />
        </Pressable>
        <Pressable onPress={() => setViewedDate(today)} className="flex-row items-center gap-1.5" disabled={isToday}>
          <Text className="body-md font-body-semibold text-text-primary">{formatDiaryDate(viewedDate, today)}</Text>
          {!isToday && <Ionicons name="refresh" size={13} color={colors.brand.yellow} />}
        </Pressable>
        <View className="flex-row items-center gap-1">
          <Pressable onPress={() => setDatePickerVisible(true)} hitSlop={10} className="p-1">
            <Ionicons name="calendar-outline" size={17} color={colors.neutral.textSecondary} />
          </Pressable>
          <Pressable onPress={() => setViewedDate((prev) => addDays(prev, 1))} hitSlop={10} disabled={isToday} className="p-1">
            <Ionicons name="chevron-forward" size={18} color={isToday ? colors.neutral.divider : colors.neutral.textSecondary} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: insets.bottom + 100, gap: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {!hasTargets ? (
          <View className="items-center gap-3 rounded-3xl border border-divider bg-surface p-6">
            <Image source={images.mascotFlexing} resizeMode="contain" style={{ width: 130, height: 130 * (205 / 250) }} />
            <Text className="heading-4 text-center text-text-primary">Let&apos;s fuel that workout.</Text>
            <Text className="body-sm text-center text-text-secondary">Set your daily calorie and macro targets to start tracking.</Text>
            <Pressable onPress={() => router.push("/nutrition/targets")} className="mt-2 items-center self-stretch rounded-full bg-brand-yellow py-3.5">
              <Text className="body-md font-body-semibold text-brand-iron">Set Your Targets</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <NutritionBanner
              dateLabel={formatDiaryDate(viewedDate, today)}
              calories={totals.calories}
              calorieTarget={adjustedCalorieTarget}
              calorieRatio={calorieRatio}
              exerciseCalories={exerciseCalories}
            />

            <View className="flex-row gap-3">
              <MacroCard
                id="nutrition.dashboard.protein"
                label="Protein"
                icon="barbell-outline"
                currentG={totals.proteinG}
                targetG={targets.proteinG}
                color={NUTRITION_COLORS.protein}
              />
              <MacroCard
                id="nutrition.dashboard.carbs"
                label="Carbs"
                icon="flash-outline"
                currentG={totals.carbsG}
                targetG={targets.carbsG}
                color={NUTRITION_COLORS.carbs}
              />
              <MacroCard
                id="nutrition.dashboard.fat"
                label="Fat"
                icon="water-outline"
                currentG={totals.fatG}
                targetG={targets.fatG}
                color={NUTRITION_COLORS.fat}
              />
            </View>
          </>
        )}

        <WaterTracker dateKey={viewedDateKey} />

        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="body-lg font-body-semibold text-text-primary">{`${formatDiaryDate(viewedDate, today)}'s Food`}</Text>
            {viewedEntries.length === 0 && hasPreviousDayEntries && (
              <Pressable
                onPress={() => {
                  copyDay(previousDateKey, viewedDateKey);
                  posthog.capture("nutrition_day_copied");
                }}
                className="flex-row items-center gap-1"
              >
                <Ionicons name="copy-outline" size={14} color={colors.brand.yellow} />
                <Text className="caption font-body-semibold text-brand-yellow">Copy Previous Day</Text>
              </Pressable>
            )}
          </View>

          {viewedEntries.length === 0 ? (
            <View className="items-center gap-2 rounded-2xl border border-dashed border-divider py-14">
              <Image source={nutritionIcons.myFoods} resizeMode="contain" style={{ width: 44, height: 44, opacity: 0.8 }} />
              <Text className="body-md text-text-secondary">Nothing logged yet.</Text>
              <Text className="body-sm text-text-secondary">Tap Add Food to log {isToday ? "your first meal" : "a meal for this day"}.</Text>
            </View>
          ) : (
            MEAL_SLOTS.map(({ key, label }) => (
              <MealSection
                key={key}
                label={label}
                entries={viewedEntries.filter((entry) => entry.mealSlot === key)}
                photoByFoodId={photoByFoodId}
                photoByMealId={photoByMealId}
                onPressEntry={handleEntryPress}
                onRemoveEntry={(entry) => removeEntry(entry.id)}
              />
            ))
          )}
        </View>
      </ScrollView>

      <NutritionNavBar active="diary" dateKey={viewedDateKey} />

      <DatePickerModal
        visible={datePickerVisible}
        title="Jump to a day"
        minDate={new Date(today.getFullYear() - 2, today.getMonth(), today.getDate())}
        maxDate={today}
        selectedDate={viewedDate}
        onClose={() => setDatePickerVisible(false)}
        onSelect={(date) => {
          setViewedDate(date);
          setDatePickerVisible(false);
        }}
      />
    </View>
  );
}
