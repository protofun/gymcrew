import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Image, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { FadeInDown, FadeOutLeft, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";

import { ConfirmModal } from "@/components/ConfirmModal";
import { FoodsHero } from "@/components/FoodsHero";
import { CreateFoodForm } from "@/components/CreateFoodForm";
import { FoodListRow } from "@/components/FoodListRow";
import { HeaderRoundButton, NutritionPageHeader } from "@/components/NutritionPageHeader";
import { SavedMealRow } from "@/components/SavedMealRow";
import AnimatedText from "@/components/ui/organisms/animated-text";
import SegmentedControl from "@/components/ui/organisms/segmented-control";
import { images, nutritionIcons } from "@/constants/images";
import type { Food } from "@/data/nutrition-foods";
import type { ApiMeal, MealKind } from "@/lib/api";
import { toDateKey } from "@/lib/date";
import { mealSlotForTime } from "@/lib/meal-slot";
import { useCustomFoodsStore } from "@/store/custom-foods-store";
import { useNutritionLogStore } from "@/store/nutrition-log-store";
import { useNutritionMealsStore } from "@/store/nutrition-meals-store";
import { colors, fontFamily } from "@/theme";

type Tab = "foods" | MealKind;
const TABS: { key: Tab; label: string }[] = [
  { key: "foods", label: "Foods" },
  { key: "shake", label: "Shakes" },
  { key: "meal", label: "Meals" },
];

/** Mean of a list of numbers, rounded — 0 for an empty list. */
function average(values: number[]): number {
  return values.length > 0 ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
}

const EMPTY_COPY: Record<Tab, { title: string; text: string; cta: string }> = {
  foods: { title: "NO FOODS YET", text: "Can't find something? Create it once, log it forever.", cta: "Create a food" },
  shake: { title: "NO SHAKES YET", text: "Blend your usual shake once — then it's one tap a day.", cta: "Build a shake" },
  meal: { title: "NO MEALS YET", text: "Save a meal you eat often and log it in one tap.", cta: "Build a meal" },
};

/** Everything the user made themselves, in one place: their own foods, and their saved shakes and meals.
 * (Favorites and recents live on the Add Food hub.) Shakes and meals log to today with one tap. */
export function NutritionFoodsSection({ initialTab }: { initialTab?: string }) {
  const insets = useSafeAreaInsets();
  const posthog = usePostHog();
  const [tab, setTab] = useState<Tab>(initialTab === "shake" || initialTab === "meal" ? initialTab : "foods");
  const [tabsWidth, setTabsWidth] = useState(0);

  const foods = useCustomFoodsStore((state) => state.foods);
  const updateFood = useCustomFoodsStore((state) => state.updateFood);
  const removeFood = useCustomFoodsStore((state) => state.removeFood);
  const meals = useNutritionMealsStore((state) => state.meals);
  const removeMeal = useNutritionMealsStore((state) => state.removeMeal);
  const addEntry = useNutritionLogStore((state) => state.addEntry);
  const [editingFood, setEditingFood] = useState<Food | null>(null);
  const [foodToDelete, setFoodToDelete] = useState<Food | null>(null);
  const [mealToDelete, setMealToDelete] = useState<ApiMeal | null>(null);

  const shakes = useMemo(() => meals.filter((meal) => meal.kind === "shake"), [meals]);
  const savedMeals = useMemo(() => meals.filter((meal) => meal.kind === "meal"), [meals]);
  const counts: Record<Tab, number> = { foods: foods.length, shake: shakes.length, meal: savedMeals.length };
  const mealList = tab === "shake" ? shakes : savedMeals;
  const tabIndex = TABS.findIndex((option) => option.key === tab);

  function handleCreate() {
    if (tab === "foods") router.push("/nutrition/create-food");
    else router.push({ pathname: "/nutrition/meal-builder", params: { kind: tab } });
  }

  function handleDeleteFood() {
    if (!foodToDelete) return;
    removeFood(foodToDelete.id);
    posthog.capture("custom_food_deleted");
    setFoodToDelete(null);
  }

  function handleDeleteMeal() {
    if (!mealToDelete) return;
    removeMeal(mealToDelete.id);
    posthog.capture("meal_deleted", { kind: mealToDelete.kind });
    setMealToDelete(null);
  }

  /** Logs a saved shake/meal to today exactly as saved — the same entry the detail screen would write. */
  function handleQuickAdd(meal: ApiMeal) {
    addEntry({
      foodId: null,
      mealId: meal.id,
      name: meal.name,
      mealSlot: mealSlotForTime(),
      quantity: 1,
      unit: "serving",
      calories: meal.totalCalories,
      proteinG: meal.totalProteinG,
      carbsG: meal.totalCarbsG,
      fatG: meal.totalFatG,
      dateKey: toDateKey(new Date()),
    });
    posthog.capture("meal_logged", { kind: meal.kind, meal_id: meal.id, calories: meal.totalCalories, modified: false, source: "my_foods_quick_add" });
  }

  const empty = EMPTY_COPY[tab];

  return (
    <View className="flex-1">
      <NutritionPageHeader
        embedded
        title="My foods"
        subtitle="Your own foods, shakes and meals."
        actions={<HeaderRoundButton icon="add" label={tab === "foods" ? "Create a food" : tab === "shake" ? "Build a shake" : "Build a meal"} active onPress={handleCreate} />}
      />

      <View className="px-4 pb-2" onLayout={(event) => setTabsWidth(event.nativeEvent.layout.width - 32)}>
        {tabsWidth > 0 && (
          <SegmentedControl
            currentIndex={tabIndex}
            onChange={(index) => setTab(TABS[index].key)}
            width={tabsWidth}
            borderRadius={22}
            paddingVertical={11}
            segmentedControlBackgroundColor={colors.neutral.surface}
            activeSegmentBackgroundColor={colors.brand.yellow}
            dividerColor="transparent"
            disableScaleEffect
          >
            {TABS.map((option) => (
              <View key={option.key} className="flex-row items-center gap-1.5">
                <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 13, color: option.key === tab ? colors.brand.iron : colors.brand.white }}>{option.label}</Text>
                <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 11, color: option.key === tab ? "rgba(31,35,40,0.6)" : colors.neutral.textSecondary }}>{counts[option.key]}</Text>
              </View>
            ))}
          </SegmentedControl>
        )}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40, gap: 20 }} showsVerticalScrollIndicator={false}>
        {counts[tab] === 0 ? (
          <View className="items-center gap-4 py-8">
            <Image source={images.mascotFlexing} resizeMode="contain" style={{ width: 120, height: 120 * (205 / 250) }} />
            <AnimatedText
              key={tab}
              text={empty.title}
              animationConfig={{ characterDelay: 28 }}
              enterFrom={{ translateY: 26, scale: 0.4 }}
              style={{ fontFamily: fontFamily.heading, fontSize: 28, letterSpacing: 1, color: colors.brand.white }}
            />
            <Text className="body-sm text-center text-text-secondary">{empty.text}</Text>
            <Pressable onPress={handleCreate} className="mt-1 items-center self-stretch rounded-full bg-brand-yellow py-3.5">
              <Text className="body-md font-body-semibold text-brand-iron">{empty.cta}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <FoodsHero
              image={tab === "foods" ? nutritionIcons.myFoods : tab === "shake" ? nutritionIcons.protein : nutritionIcons.myMeals}
              count={counts[tab]}
              label={(tab === "foods" ? "FOODS" : tab === "shake" ? "SHAKES" : "MEALS") + " SAVED"}
              stats={
                tab === "foods"
                  ? [{ label: "avg calories", value: average(foods.map((food) => food.calories)), unit: "kcal" }, { label: "avg protein", value: average(foods.map((food) => food.proteinG)), unit: "g" }]
                  : [{ label: "avg calories", value: average(mealList.map((meal) => meal.totalCalories)), unit: "kcal" }, { label: "avg protein", value: average(mealList.map((meal) => meal.totalProteinG)), unit: "g" }]
              }
              createLabel={tab === "shake" ? "Build a shake" : tab === "meal" ? "Build a meal" : "Create a food"}
              onCreate={handleCreate}
            />

            {tab === "foods" ? (
              <View>
                {foods.map((food, index) => (
                  <Animated.View key={food.id} entering={FadeInDown.delay(index * 50).springify().damping(16)} exiting={FadeOutLeft.duration(200)} layout={LinearTransition.springify().damping(18)}>
                    <FoodListRow
                      food={food}
                      onPress={() => setEditingFood(food)}
                      isLast={index === foods.length - 1}
                      trailing={
                        <Pressable onPress={() => setFoodToDelete(food)} hitSlop={10} className="pl-1" accessibilityLabel={`Delete ${food.name}`}>
                          <Ionicons name="trash-outline" size={18} color={colors.neutral.textSecondary} />
                        </Pressable>
                      }
                    />
                  </Animated.View>
                ))}
              </View>
            ) : (
              <View>
                {mealList.map((meal, index) => (
                  <SavedMealRow
                    key={meal.id}
                    meal={meal}
                    index={index}
                    isLast={index === mealList.length - 1}
                    onPress={() => router.push({ pathname: "/nutrition/meal/[id]", params: { id: meal.id } })}
                    onQuickAdd={() => handleQuickAdd(meal)}
                    onDelete={() => setMealToDelete(meal)}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={editingFood !== null} animationType="slide" onRequestClose={() => setEditingFood(null)}>
        <GestureHandlerRootView style={{ flex: 1, paddingTop: insets.top + 8, backgroundColor: colors.neutral.background }}>
          <View className="flex-row items-center justify-between px-4">
            <Pressable onPress={() => setEditingFood(null)} hitSlop={8} className="h-10 w-10 items-center justify-center rounded-full border border-divider bg-surface" accessibilityLabel="Close">
              <Ionicons name="close" size={19} color={colors.neutral.textPrimary} />
            </Pressable>
            <Text className="caption font-body-bold text-text-secondary" style={{ letterSpacing: 1.4 }}>
              EDIT FOOD
            </Text>
            <View className="h-10 w-10" />
          </View>
          {editingFood && (
            <CreateFoodForm
              initial={editingFood}
              submitLabel="Save"
              onCancel={() => setEditingFood(null)}
              onSave={(input) => {
                updateFood(editingFood.id, input);
                setEditingFood(null);
              }}
            />
          )}
        </GestureHandlerRootView>
      </Modal>

      <ConfirmModal
        visible={foodToDelete !== null}
        title="Delete this food?"
        message={foodToDelete ? `"${foodToDelete.name}" will be removed from My Foods.` : ""}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteFood}
        onCancel={() => setFoodToDelete(null)}
      />
      <ConfirmModal
        visible={mealToDelete !== null}
        title={`Delete this ${mealToDelete?.kind === "shake" ? "shake" : "meal"}?`}
        message={mealToDelete ? `"${mealToDelete.name}" will be removed for good.` : ""}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteMeal}
        onCancel={() => setMealToDelete(null)}
      />

    </View>
  );
}
