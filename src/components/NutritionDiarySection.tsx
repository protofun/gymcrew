import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Image, Pressable, Text, useWindowDimensions, View } from "react-native";
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useDerivedValue, useSharedValue } from "react-native-reanimated";
import { usePostHog } from "posthog-react-native";

import { DatePickerModal } from "@/components/DatePickerModal";
import { DiaryEmpty } from "@/components/DiaryEmpty";
import { DiaryHeader } from "@/components/DiaryHeader";
import { DiaryMealFilter, type MealFilter } from "@/components/DiaryMealFilter";
import { DiaryMealSection } from "@/components/DiaryMealSection";
import { DiaryRecent } from "@/components/DiaryRecent";
import { DiaryRings } from "@/components/DiaryRings";
import { DiaryWeekChart } from "@/components/DiaryWeekChart";
import { DiaryWater } from "@/components/DiaryWater";
import AnimatedText from "@/components/ui/organisms/animated-text";
import { images } from "@/constants/images";
import { aiMealFoodId, aiMealIdFromFoodId, removeEntryWithAiMeal } from "@/lib/ai-meals";
import type { ApiFoodLog } from "@/lib/api";
import { addDays, getCurrentWeekDates, toDateKey } from "@/lib/date";
import { MEAL_SLOTS, mealSlotForTime } from "@/lib/meal-slot";
import { sumMacros } from "@/lib/nutrition-macros";
import { computeLoggingStreak } from "@/lib/nutrition-streak";
import { recentFoodLogs } from "@/lib/recent-foods";
import { estimateCalories } from "@/lib/workout-sessions";
import { useAiMealsStore } from "@/store/ai-meals-store";
import { useCustomFoodsStore } from "@/store/custom-foods-store";
import { useNutritionLogStore } from "@/store/nutrition-log-store";
import { useNutritionMealsStore } from "@/store/nutrition-meals-store";
import { useNutritionTargetsStore } from "@/store/nutrition-targets-store";
import { useOffFoodsCacheStore } from "@/store/off-foods-cache-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";
import { colors, fontFamily } from "@/theme";

/** The Nutrition diary section: the viewed day as concentric rings, water as glasses, and what was eaten as
 * plain meal sections. The header holds the day switcher (a sliding week strip); everything below
 * scrolls. Built from the Reacticx pieces in components/ui — see the Diary* components. */
type NutritionDiarySectionProps = {
  /** The day being looked at — owned by the Nutrition tab, so the add button and the History calendar can use it too. */
  viewedDate: Date;
  onChangeViewedDate: (date: Date) => void;
};

export function NutritionDiarySection({ viewedDate, onChangeViewedDate }: NutritionDiarySectionProps) {
  const { height: windowHeight } = useWindowDimensions();
  const posthog = usePostHog();
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => toDateKey(today), [today]);

  // The diary date being viewed — every food logger (MyFitnessPal, Cronometer, Lifesum) lets you
  // page back through past days, not just see "today" with no way to review or fix an earlier one.
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [mealFilter, setMealFilter] = useState<MealFilter>("all");
  // How far the page has scrolled folds the header up (see DiaryHeader) instead of letting it scroll away or stay huge.
  const scrollY = useSharedValue(0);
  const collapse = useDerivedValue(() => interpolate(scrollY.value, [0, 90], [0, 1], Extrapolation.CLAMP));
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  const viewedDateKey = useMemo(() => toDateKey(viewedDate), [viewedDate]);
  const isToday = viewedDateKey === todayKey;
  const previousDateKey = useMemo(() => toDateKey(addDays(viewedDate, -1)), [viewedDate]);

  const allEntries = useNutritionLogStore((state) => state.entries);
  const copyDay = useNutritionLogStore((state) => state.copyDay);
  const addEntry = useNutritionLogStore((state) => state.addEntry);

  const calories = useNutritionTargetsStore((state) => state.calories);
  const proteinG = useNutritionTargetsStore((state) => state.proteinG);
  const carbsG = useNutritionTargetsStore((state) => state.carbsG);
  const fatG = useNutritionTargetsStore((state) => state.fatG);
  const hasTargets = calories !== null && proteinG !== null && carbsG !== null && fatG !== null;

  const viewedEntries = useMemo(() => allEntries.filter((entry) => entry.dateKey === viewedDateKey), [allEntries, viewedDateKey]);
  const totals = useMemo(() => sumMacros(viewedEntries), [viewedEntries]);
  const loggedDateKeys = useMemo(() => new Set(allEntries.map((entry) => entry.dateKey)), [allEntries]);
  const streak = useMemo(() => computeLoggingStreak(loggedDateKeys, today), [loggedDateKeys, today]);
  // Meals scanned from a photo are left out — "again" is for plain foods.
  const recentEntries = useMemo(() => recentFoodLogs(allEntries.filter((entry) => aiMealIdFromFoodId(entry.foodId) === null), 8), [allEntries]);
  const weekDays = useMemo(
    () =>
      getCurrentWeekDates(viewedDate).map((date) => ({
        label: ["M", "T", "W", "T", "F", "S", "S"][(date.getDay() + 6) % 7],
        calories: sumMacros(allEntries.filter((entry) => entry.dateKey === toDateKey(date))).calories,
      })),
    [allEntries, viewedDate],
  );

  const customFoods = useCustomFoodsStore((state) => state.foods);
  const offFoods = useOffFoodsCacheStore((state) => state.foods);
  const meals = useNutritionMealsStore((state) => state.meals);
  const aiMeals = useAiMealsStore((state) => state.meals);
  const photoByFoodId = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    for (const food of customFoods) map[food.id] = food.photoUrl;
    for (const food of Object.values(offFoods)) map[food.id] = food.photoUrl;
    // A meal scanned from a photo shows that photo — one row for the whole meal.
    for (const aiMeal of Object.values(aiMeals)) map[aiMealFoodId(aiMeal.id)] = aiMeal.photoUrl || undefined;
    return map;
  }, [customFoods, offFoods, aiMeals]);
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

  const adjustedCalorieTarget = (calories ?? 0) + exerciseCalories;

  function handleEntryPress(entry: ApiFoodLog) {
    const aiMealId = aiMealIdFromFoodId(entry.foodId);
    if (aiMealId) {
      router.push({ pathname: "/nutrition/ai-meal/[id]", params: { id: aiMealId, logId: entry.id } });
      return;
    }
    if (entry.mealId) {
      router.push({ pathname: "/nutrition/meal/[id]", params: { id: entry.mealId } });
      return;
    }
    router.push({ pathname: "/nutrition/food/[id]", params: { id: entry.foodId ?? "custom", logId: entry.id } });
  }

  /** One tap logs a recent food again, for the viewed day, in the meal that fits the time of day. */
  function handleRecentAdd(entry: ApiFoodLog) {
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
      dateKey: viewedDateKey,
    });
    posthog.capture("food_logged", { source: "diary_again", quantity: entry.quantity, unit: entry.unit, calories: entry.calories });
  }

  function handleCopyPrevious() {
    copyDay(previousDateKey, viewedDateKey);
    posthog.capture("nutrition_day_copied");
  }

  const visibleSlots = MEAL_SLOTS.filter((slot) => mealFilter === "all" || slot.key === mealFilter);

  return (
    <View className="flex-1 bg-background">
      <DiaryHeader
        viewedDate={viewedDate}
        today={today}
        loggedDateKeys={loggedDateKeys}
        collapse={collapse}
        onSelectDate={onChangeViewedDate}
        onOpenCalendar={() => setDatePickerVisible(true)}
        onOpenTargets={() => router.push("/nutrition/targets")}
      />

      <Animated.ScrollView onScroll={scrollHandler} scrollEventThrottle={16} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 120, gap: 32, minHeight: windowHeight }} showsVerticalScrollIndicator={false}>
        {hasTargets ? (
          <DiaryRings
            calories={totals.calories}
            calorieTarget={adjustedCalorieTarget}
            exerciseCalories={exerciseCalories}
            streak={streak}
            protein={{ current: totals.proteinG, target: proteinG }}
            carbs={{ current: totals.carbsG, target: carbsG }}
            fat={{ current: totals.fatG, target: fatG }}
          />
        ) : (
          <View className="items-center gap-3 py-4">
            <Image source={images.mascotFlexing} resizeMode="contain" style={{ width: 120, height: 120 * (205 / 250) }} />
            <AnimatedText
              text="LET'S FUEL THAT WORKOUT"
              animationConfig={{ characterDelay: 24 }}
              enterFrom={{ translateY: 26, scale: 0.4 }}
              style={{ fontFamily: fontFamily.heading, fontSize: 26, letterSpacing: 1, color: colors.brand.white }}
            />
            <Text className="body-sm text-center text-text-secondary">Set your daily calorie and macro targets to see your day as rings.</Text>
            <Pressable onPress={() => router.push("/nutrition/targets")} className="mt-1 items-center self-stretch rounded-full bg-brand-yellow py-3.5">
              <Text className="body-md font-body-semibold text-brand-iron">Set Your Targets</Text>
            </Pressable>
          </View>
        )}

        <DiaryWater dateKey={viewedDateKey} />

        <DiaryRecent entries={recentEntries} photoByFoodId={photoByFoodId} onAdd={handleRecentAdd} />

        <View className="gap-4">
          <View className="flex-row items-baseline justify-between">
            <Text style={{ fontFamily: fontFamily.heading, fontSize: 30, letterSpacing: 1, color: colors.brand.white }}>MEALS</Text>
            {viewedEntries.length > 0 && <Text className="caption text-text-secondary">{`${viewedEntries.length} logged`}</Text>}
          </View>

          {viewedEntries.length === 0 ? (
            <DiaryEmpty dateKey={viewedDateKey} isToday={isToday} canCopyPrevious={hasPreviousDayEntries} onCopyPrevious={handleCopyPrevious} />
          ) : (
            <>
              <DiaryMealFilter value={mealFilter} onChange={setMealFilter} />
              <View className="gap-6">
                {visibleSlots.map(({ key, label }) => (
                  <DiaryMealSection
                    key={key}
                    slot={key}
                    label={label}
                    dateKey={viewedDateKey}
                    entries={viewedEntries.filter((entry) => entry.mealSlot === key)}
                    photoByFoodId={photoByFoodId}
                    photoByMealId={photoByMealId}
                    onPressEntry={handleEntryPress}
                    onRemoveEntry={(entry) => removeEntryWithAiMeal(entry.id)}
                  />
                ))}
              </View>
            </>
          )}
        </View>

        <DiaryWeekChart days={weekDays} target={hasTargets ? calories : null} />
      </Animated.ScrollView>

      <DatePickerModal
        visible={datePickerVisible}
        title="Jump to a day"
        minDate={new Date(today.getFullYear() - 2, today.getMonth(), today.getDate())}
        maxDate={today}
        selectedDate={viewedDate}
        onClose={() => setDatePickerVisible(false)}
        onSelect={(date) => {
          onChangeViewedDate(date);
          setDatePickerVisible(false);
        }}
      />
    </View>
  );
}
