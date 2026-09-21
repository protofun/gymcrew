import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown, FadeInUp, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AiScanDayLine } from "@/components/AiScanDayLine";
import { AiScanIngredientRow } from "@/components/AiScanIngredientRow";
import { AiScanIngredientTicker } from "@/components/AiScanIngredientTicker";
import { AiScanMacroRing } from "@/components/AiScanMacroRing";
import { AiScanMealFan } from "@/components/AiScanMealFan";
import { AiScanPhotoHeader } from "@/components/AiScanPhotoHeader";
import { AiScanPortionChips, type PortionSize } from "@/components/AiScanPortionChips";
import { AiScanPromptCard } from "@/components/AiScanPromptCard";
import { SaveButton } from "@/components/ui/micro-interactions/save-button";
import { Accordion } from "@/components/ui/molecules/accordion";
import AnimatedText from "@/components/ui/organisms/animated-text";
import { AI_ACCORDION_THEME, AI_SAVE_BUTTON_COLORS, AI_SCAN } from "@/constants/ai-scan-theme";
import type { MealItem } from "@/lib/api";
import { MEAL_SLOTS, type MealSlot } from "@/lib/meal-slot";
import { NUTRITION_COLORS } from "@/lib/nutrition-colors";
import { scaleMacros, sumMacros } from "@/lib/nutrition-macros";
import { colors, fontFamily } from "@/theme";

/** Height of the Save button — the meal fan in the bottom bar is sized to match it. */
const BAR_BUTTON_SIZE = 52;

type AiScanResultsProps = {
  photoUri: string;
  items: MealItem[];
  mealSlot: MealSlot;
  portion: PortionSize;
  hint: string;
  error: string | null;
  /** Scans left today — `null` for accounts with unlimited scans. */
  scansRemaining: number | null;
  /** Calories logged for the whole day being logged to — this meal is already part of it. */
  dayCalories: number;
  /** The user's daily calorie target, or `null` when they haven't set one. */
  targetCalories: number | null;
  onBack: () => void;
  onRemoveMeal: () => void;
  onChangeMealSlot: (slot: MealSlot) => void;
  onChangePortion: (portion: PortionSize) => void;
  onChangeHint: (hint: string) => void;
  onReanalyse: () => void;
  onChangeQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  /** Writes any pending change to the log — called when Done is pressed, before leaving. */
  onFlush: () => void;
  onDone: () => void;
};

/** The results step. The meal is already in the food log by the time this shows — everything here just
 * adjusts that one entry: a photo header with the calories, the macro rings, a plain ingredient list
 * with trash cans and sliders, and a prompt to correct the AI. No "add" step: the trash can is how you
 * take out what's wrong. */
export function AiScanResults({
  photoUri,
  items,
  mealSlot,
  portion,
  hint,
  error,
  scansRemaining,
  dayCalories,
  targetCalories,
  onBack,
  onRemoveMeal,
  onChangeMealSlot,
  onChangePortion,
  onChangeHint,
  onReanalyse,
  onChangeQuantity,
  onRemoveItem,
  onFlush,
  onDone,
}: AiScanResultsProps) {
  const insets = useSafeAreaInsets();

  const mealTotals = useMemo(() => sumMacros(items.map((item) => scaleMacros(item, item.quantity))), [items]);
  const totalGrams = items.reduce((sum, item) => sum + item.quantity, 0);
  const slotLabel = MEAL_SLOTS.find((slot) => slot.key === mealSlot)?.label ?? "";

  // Each macro's calories (protein and carbs are 4 kcal/g, fat 9) and its share of all three — how far its ring fills.
  const kcal = { protein: mealTotals.proteinG * 4, carbs: mealTotals.carbsG * 4, fat: mealTotals.fatG * 9 };
  const kcalSum = kcal.protein + kcal.carbs + kcal.fat;
  const percentOf = (value: number) => (kcalSum > 0 ? (value / kcalSum) * 100 : 0);

  return (
    <View className="flex-1 bg-background">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
          <AiScanPhotoHeader
            photoUri={photoUri}
            calories={mealTotals.calories}
            ingredientCount={items.length}
            totalGrams={totalGrams}
            slotLabel={slotLabel}
            onBack={onBack}
            onRemoveMeal={onRemoveMeal}
          />

          <View className="gap-6 px-5">
            <AiScanIngredientTicker names={items.map((item) => item.name)} />

            <Animated.View entering={FadeInDown.delay(150).springify()} style={{ borderColor: AI_SCAN.border }} className="flex-row justify-around border-y py-5">
              <AiScanMacroRing label="PROTEIN" grams={mealTotals.proteinG} kcal={kcal.protein} percent={percentOf(kcal.protein)} color={NUTRITION_COLORS.protein} />
              <AiScanMacroRing label="CARBS" grams={mealTotals.carbsG} kcal={kcal.carbs} percent={percentOf(kcal.carbs)} color={NUTRITION_COLORS.carbs} />
              <AiScanMacroRing label="FAT" grams={mealTotals.fatG} kcal={kcal.fat} percent={percentOf(kcal.fat)} color={NUTRITION_COLORS.fat} />
            </Animated.View>

            {targetCalories !== null && <AiScanDayLine mealCalories={mealTotals.calories} dayCalories={dayCalories} targetCalories={targetCalories} />}

            <Animated.View entering={FadeInDown.delay(250).springify()} className="gap-2.5">
              <Text className="caption font-body-bold" style={{ color: AI_SCAN.textMuted, letterSpacing: 1.2 }}>
                PORTION SIZE
              </Text>
              <AiScanPortionChips value={portion} onChange={onChangePortion} />
            </Animated.View>

            <View className="gap-1">
              <Text className="caption font-body-bold" style={{ color: AI_SCAN.textMuted, letterSpacing: 1.2 }}>
                {`INGREDIENTS · ${items.length}`}
              </Text>
              {items.length === 0 ? (
                <Text className="body-sm py-6 text-center" style={{ color: AI_SCAN.textMuted }}>
                  Nothing left — this meal is no longer in your log.
                </Text>
              ) : (
                <Animated.View layout={LinearTransition.springify().damping(18)}>
                  <Accordion type="single" flush theme={AI_ACCORDION_THEME}>
                    {items.map((item) => (
                      <AiScanIngredientRow key={item.id} item={item} onChangeQuantity={(quantity) => onChangeQuantity(item.id, quantity)} onRemove={() => onRemoveItem(item.id)} />
                    ))}
                  </Accordion>
                </Animated.View>
              )}
            </View>

            <AiScanPromptCard hint={hint} error={error} scansRemaining={scansRemaining} onChangeHint={onChangeHint} onReanalyse={onReanalyse} />
          </View>
        </ScrollView>

        <Animated.View
          entering={FadeInUp.delay(300).springify()}
          style={{ paddingBottom: insets.bottom + 12, backgroundColor: colors.neutral.background, borderTopColor: AI_SCAN.border }}
          className="flex-row items-center gap-3.5 border-t px-5 pt-3"
        >
          {/* Room for the meal fan, which floats over this corner of the bar (see below). */}
          <View style={{ width: BAR_BUTTON_SIZE }} />
          <View className="flex-1 flex-row items-center gap-2">
            <Ionicons name={items.length > 0 ? "checkmark-circle" : "close-circle"} size={20} color={items.length > 0 ? AI_SCAN.accent : AI_SCAN.textMuted} />
            <AnimatedText
              text={items.length > 0 ? `ADDED TO ${slotLabel.toUpperCase()}` : "NOTHING LOGGED"}
              animationConfig={{ characterDelay: 14 }}
              enterFrom={{ translateY: 14, scale: 0.5 }}
              style={{ fontFamily: fontFamily.heading, fontSize: 17, letterSpacing: 1, color: colors.brand.white }}
            />
          </View>

          <SaveButton.Root onSave={onFlush} onSaved={onDone} colors={AI_SAVE_BUTTON_COLORS} minLoading={350} successPause={250}>
            <SaveButton.Label style={{ fontFamily: fontFamily.bodyBold, fontSize: 15 }}>Done</SaveButton.Label>
            <SaveButton.Saved style={{ fontFamily: fontFamily.bodyBold, fontSize: 15 }}>Saved</SaveButton.Saved>
          </SaveButton.Root>
        </Animated.View>
      </KeyboardAvoidingView>

      <AiScanMealFan mealSlot={mealSlot} onChange={onChangeMealSlot} bottom={insets.bottom + 12} buttonSize={BAR_BUTTON_SIZE} />
    </View>
  );
}
