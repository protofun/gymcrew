import { Ionicons } from "@expo/vector-icons";
import { Image, Text, View } from "react-native";

import { EditableText } from "@/components/EditableText";
import { ProgressBar } from "@/components/ProgressBar";
import { SkewedStat } from "@/components/SkewedStat";
import { images } from "@/constants/images";
import { NUTRITION_COLORS } from "@/lib/nutrition-colors";
import { colors, fontFamily } from "@/theme";

// Inline-only: NativeWind doesn't reliably compile `transform`/`font-style` onto native when
// combined with a sibling className — see TopBar's wordmarkStyle for the same constraint. Same
// 40px/1.2 size as home.tsx's WelcomeWidget headline (the `heading-2` utility) — the user wants
// this banner to read at the exact same scale as home, not a scaled-down version of it — with an
// added skew on top of the italic for a bit more attitude.
const headlineStyle = {
  fontFamily: fontFamily.heading,
  fontSize: 40,
  lineHeight: 48,
  fontStyle: "italic" as const,
  transform: [{ skewX: "-10deg" }],
};

type NutritionBannerProps = {
  dateLabel: string;
  calories: number;
  calorieTarget: number;
  calorieRatio: number;
  /** Folded into today's calorie target already (see nutrition/index.tsx's `adjustedCalorieTarget`)
   * — shown here only as a small "why is my target higher today" note, not a separate number. */
  exerciseCalories: number;
};

/** The Nutrition tab's own hero banner — same "headline + art free on the right, no card, sits
 * straight on the page background" language as home.tsx's `WelcomeWidget`, so Nutrition reads as
 * part of the same app instead of a boxed-in settings-style screen. Calories only (a skewed stat +
 * bar, not a ring — the "remaining" pill and the protein/carbs/fat breakdown already live in their
 * own cards right below this, so repeating any of it here would just be noise). */
export function NutritionBanner({ dateLabel, calories, calorieTarget, calorieRatio, exerciseCalories }: NutritionBannerProps) {
  return (
    <View>
      <View className="relative">
        <Image
          source={images.gymcrewNutrition}
          resizeMode="contain"
          style={{ position: "absolute", top: 14, right: -18, width: 260, height: 184 }}
        />

        <View className="max-w-[88%]">
          <EditableText id="nutrition.banner.eyebrow" className="body-sm text-text-secondary">
            {`${dateLabel}'s fuel 🍽️`}
          </EditableText>
          <EditableText id="nutrition.banner.headline" className="mt-1 text-brand-white" style={headlineStyle}>
            {"READY TO\nFUEL THE GRIND?"}
          </EditableText>
        </View>
      </View>

      <View className="mt-6 max-w-[62%] gap-1.5">
        <SkewedStat id="nutrition.banner.calories" size={34} color={colors.neutral.textPrimary}>
          {String(Math.round(calories))}
        </SkewedStat>
        <Text className="caption -mt-1 text-text-secondary">{`of ${calorieTarget} kcal today`}</Text>
        <ProgressBar ratio={calorieRatio} color={NUTRITION_COLORS.calories} height={8} />
        {exerciseCalories > 0 && (
          <View className="mt-0.5 flex-row items-center gap-1">
            <Ionicons name="barbell" size={11} color={colors.neutral.textSecondary} />
            <Text className="caption text-text-secondary">{`+${exerciseCalories} kcal earned from training`}</Text>
          </View>
        )}
      </View>
    </View>
  );
}
