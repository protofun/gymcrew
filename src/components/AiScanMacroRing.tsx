import { useEffect } from "react";
import { Text, View } from "react-native";
import { Easing, useSharedValue, withTiming } from "react-native-reanimated";

import { NumberFlow } from "@/components/ui/molecules/number-flow";
import { CircularProgress } from "@/components/ui/organisms/circular-progress";
import { AI_SCAN } from "@/constants/ai-scan-theme";
import { colors } from "@/theme";

type AiScanMacroRingProps = {
  label: string;
  grams: number;
  /** Share of the meal's calories this macro provides, 0–100 — how far the ring fills. */
  percent: number;
  /** Calories this macro provides, shown under the label. */
  kcal: number;
  color: string;
};

/** One macro as an animated ring: the ring fills to its share of the meal's calories, and the gram
 * count inside rolls to its new value whenever the portions change. */
export function AiScanMacroRing({ label, grams, percent, kcal, color }: AiScanMacroRingProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(percent, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [percent, progress]);

  return (
    <View className="items-center gap-1">
      <CircularProgress
        progress={progress}
        size={72}
        strokeWidth={6}
        outerCircleColor={AI_SCAN.border}
        progressCircleColor={color}
        backgroundColor={AI_SCAN.surfaceRaised}
        renderIcon={() => (
          <View className="flex-row items-baseline">
            <NumberFlow value={Math.round(grams)} fontSize={17} color={colors.brand.white} fontWeight="700" />
            <Text className="caption font-body-semibold" style={{ color: AI_SCAN.textMuted }}>
              g
            </Text>
          </View>
        )}
      />
      <Text className="caption font-body-bold" style={{ color, letterSpacing: 0.6 }}>
        {label}
      </Text>
      <Text className="caption" style={{ color: AI_SCAN.textMuted }}>
        {`${Math.round(percent)}% · ${Math.round(kcal)} kcal`}
      </Text>
    </View>
  );
}
