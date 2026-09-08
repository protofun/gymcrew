import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FoodLogRow } from "@/components/FoodLogRow";
import { GoalRing } from "@/components/GoalRing";
import { IconBadge } from "@/components/IconBadge";
import { MacroCard } from "@/components/MacroCard";
import { SkewedStat } from "@/components/SkewedStat";
import { images } from "@/constants/images";
import type { ApiFoodLog } from "@/lib/api";
import { toDateKey } from "@/lib/date";
import { MEAL_SLOTS } from "@/lib/meal-slot";
import { sumMacros } from "@/lib/nutrition-macros";
import { NUTRITION_COLORS } from "@/lib/nutrition-colors";
import { nutritionStatusFor } from "@/lib/nutrition-status";
import { useNutritionLogStore } from "@/store/nutrition-log-store";
import { useNutritionTargetsStore } from "@/store/nutrition-targets-store";
import { colors } from "@/theme";

type QuickLink = { icon: keyof typeof Ionicons.glyphMap; label: string; color: string; onPress: () => void };

function QuickLinkTile({ icon, label, color, onPress }: QuickLink) {
  return (
    <Pressable onPress={onPress} className="flex-1 items-center gap-2 rounded-2xl border border-divider bg-surface py-3.5">
      <IconBadge icon={icon} color={color} size={34} />
      <Text className="caption font-body-semibold text-text-secondary">{label}</Text>
    </Pressable>
  );
}

function MealSection({
  label,
  entries,
  onPressEntry,
  onRemoveEntry,
}: {
  label: string;
  entries: ApiFoodLog[];
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
          <FoodLogRow key={entry.id} entry={entry} onPress={() => onPressEntry(entry)} onRemove={() => onRemoveEntry(entry)} />
        ))}
      </View>
    </View>
  );
}

export default function NutritionScreen() {
  const insets = useSafeAreaInsets();
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const allEntries = useNutritionLogStore((state) => state.entries);
  const removeEntry = useNutritionLogStore((state) => state.removeEntry);
  const copyDay = useNutritionLogStore((state) => state.copyDay);

  const calories = useNutritionTargetsStore((state) => state.calories);
  const proteinG = useNutritionTargetsStore((state) => state.proteinG);
  const carbsG = useNutritionTargetsStore((state) => state.carbsG);
  const fatG = useNutritionTargetsStore((state) => state.fatG);
  const hasTargets = calories !== null && proteinG !== null && carbsG !== null && fatG !== null;

  const todayEntries = useMemo(() => allEntries.filter((entry) => entry.dateKey === todayKey), [allEntries, todayKey]);
  const totals = useMemo(() => sumMacros(todayEntries), [todayEntries]);

  const yesterdayKey = useMemo(() => toDateKey(new Date(Date.now() - 24 * 60 * 60 * 1000)), []);
  const hasYesterdayEntries = useMemo(() => allEntries.some((entry) => entry.dateKey === yesterdayKey), [allEntries, yesterdayKey]);

  const targets = { calories: calories ?? 0, proteinG: proteinG ?? 0, carbsG: carbsG ?? 0, fatG: fatG ?? 0 };
  const status = nutritionStatusFor(totals, targets);
  const calorieRatio = targets.calories > 0 ? totals.calories / targets.calories : 0;
  const remaining = Math.round(targets.calories - totals.calories);
  const remainingColor = remaining >= 0 ? NUTRITION_COLORS.calories : colors.semantic.warning;

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
            <View className="overflow-hidden rounded-3xl border border-divider bg-surface">
              <View className="flex-row items-center gap-2 border-b border-divider px-5 py-3">
                <IconBadge icon="flame" color={NUTRITION_COLORS.calories} size={26} iconSize={14} />
                <Text className="body-sm font-body-semibold text-text-secondary">TODAY&apos;S NUTRITION</Text>
              </View>

              <View className="items-center gap-4 p-5">
                <GoalRing ratio={calorieRatio} color={NUTRITION_COLORS.calories} size={168} strokeWidth={13}>
                  <View className="items-center">
                    <SkewedStat id="nutrition.dashboard.calories" size={40} color={colors.neutral.textPrimary}>
                      {String(Math.round(totals.calories))}
                    </SkewedStat>
                    <Text className="caption text-text-secondary">{`/ ${targets.calories} kcal`}</Text>
                  </View>
                </GoalRing>

                <View className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5" style={{ backgroundColor: `${remainingColor}1A` }}>
                  <Ionicons name={remaining >= 0 ? "flash" : "warning"} size={13} color={remainingColor} />
                  <Text className="caption font-body-bold" style={{ color: remainingColor }}>
                    {remaining >= 0 ? `${remaining} KCAL REMAINING` : `${Math.abs(remaining)} KCAL OVER`}
                  </Text>
                </View>

                <View className="w-full flex-row items-center gap-3 rounded-2xl bg-background p-3">
                  <Text style={{ fontSize: 22 }}>{status.emoji}</Text>
                  <View className="flex-1 gap-0.5">
                    <Text className="body-sm font-body-semibold text-text-primary">{status.label}</Text>
                    <Text className="caption text-text-secondary">{status.detail}</Text>
                  </View>
                </View>
              </View>
            </View>

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

        <Pressable onPress={() => router.push("/nutrition/add")} className="flex-row items-center justify-center gap-2 rounded-full bg-brand-yellow py-4">
          <Ionicons name="add-circle" size={20} color={colors.brand.iron} />
          <Text className="body-md font-body-semibold text-brand-iron">Add Food</Text>
        </Pressable>

        <View className="flex-row gap-3">
          <QuickLinkTile icon="restaurant-outline" label="My Meals" color={colors.brand.yellow} onPress={() => router.push("/nutrition/my-meals")} />
          <QuickLinkTile icon="fast-food-outline" label="My Foods" color={NUTRITION_COLORS.protein} onPress={() => router.push("/nutrition/my-foods")} />
          <QuickLinkTile icon="trending-up-outline" label="Progress" color={NUTRITION_COLORS.carbs} onPress={() => router.push("/nutrition/progress")} />
          <QuickLinkTile icon="bar-chart-outline" label="History" color={NUTRITION_COLORS.calories} onPress={() => router.push("/nutrition/history")} />
        </View>

        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="body-lg font-body-semibold text-text-primary">Today&apos;s Food</Text>
            {todayEntries.length === 0 && hasYesterdayEntries && (
              <Pressable onPress={() => copyDay(yesterdayKey, todayKey)} className="flex-row items-center gap-1">
                <Ionicons name="copy-outline" size={14} color={colors.brand.yellow} />
                <Text className="caption font-body-semibold text-brand-yellow">Copy Yesterday</Text>
              </Pressable>
            )}
          </View>

          {todayEntries.length === 0 ? (
            <View className="items-center gap-2 rounded-2xl border border-dashed border-divider py-14">
              <Ionicons name="restaurant-outline" size={28} color={colors.neutral.textSecondary} />
              <Text className="body-md text-text-secondary">Nothing logged yet.</Text>
              <Text className="body-sm text-text-secondary">Tap Add Food to log your first meal.</Text>
            </View>
          ) : (
            MEAL_SLOTS.map(({ key, label }) => (
              <MealSection
                key={key}
                label={label}
                entries={todayEntries.filter((entry) => entry.mealSlot === key)}
                onPressEntry={handleEntryPress}
                onRemoveEntry={(entry) => removeEntry(entry.id)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
