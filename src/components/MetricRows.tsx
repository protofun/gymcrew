import { useState } from "react";
import { Image, Pressable, Text, View, type ImageSourcePropType } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { AmountRuler } from "@/components/AmountRuler";
import { SegmentedField } from "@/components/SegmentedField";
import { NumberFlow } from "@/components/ui/molecules/number-flow";
import { colors, fontFamily } from "@/theme";

export type MetricRow = {
  key: string;
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  /** What one tick of the ruler is worth. */
  step: number;
  decimals?: number;
  image?: ImageSourcePropType;
  /** Shown as a small switch next to the active row when the value can be given in two units. */
  unitOptions?: readonly [string, string];
  onUnitChange?: (unit: string) => void;
};

type MetricRowsProps = {
  rows: MetricRow[];
  onChange: (key: string, value: number) => void;
};

/** A few numbers on one screen, without a wall of inputs: every metric is a row with its value as big
 * rolling digits, and the one you tap gets the ruler below to drag (Reacticx `ruler` + `number-flow`). */
export function MetricRows({ rows, onChange }: MetricRowsProps) {
  const [activeKey, setActiveKey] = useState(rows[0].key);
  // Bumped whenever the ruler has to jump to a value it didn't produce itself — another row, or a unit switch.
  const [resetToken, setResetToken] = useState(0);
  const active = rows.find((row) => row.key === activeKey) ?? rows[0];

  return (
    <View className="gap-5">
      <View>
        {rows.map((row, index) => {
          const isActive = row.key === active.key;
          return (
            <Animated.View key={row.key} entering={FadeInDown.delay(index * 70).duration(350)}>
              <Pressable
                onPress={() => {
                  setActiveKey(row.key);
                  setResetToken((token) => token + 1);
                }}
                className="flex-row items-center gap-3 border-b border-divider py-3"
                style={{ opacity: isActive ? 1 : 0.55 }}
              >
                <View style={{ width: 4, height: 34, borderRadius: 2, backgroundColor: isActive ? colors.brand.yellow : "transparent" }} />
                {row.image ? <Image source={row.image} resizeMode="contain" style={{ width: 38, height: 38 }} /> : null}
                <Text style={{ fontFamily: fontFamily.heading, fontSize: 22, letterSpacing: 0.8, color: colors.brand.white, flex: 1 }}>{row.label.toUpperCase()}</Text>
                <View className="flex-row items-baseline gap-1.5">
                  <NumberFlow value={row.value} decimals={row.decimals ?? 0} fontSize={32} color={isActive ? colors.brand.yellow : colors.brand.white} fontWeight="800" />
                  <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 13, color: colors.neutral.textSecondary }}>{row.unit}</Text>
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>

      <View className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: colors.neutral.textSecondary }}>{`Drag to set your ${active.label.toLowerCase()}`}</Text>
          {active.unitOptions && active.onUnitChange ? (
            <SegmentedField
              width={112}
              paddingVertical={8}
              options={active.unitOptions.map((unit) => ({ key: unit, label: unit }))}
              value={active.unit}
              onChange={(unit) => {
                active.onUnitChange?.(unit);
                setResetToken((token) => token + 1);
              }}
            />
          ) : null}
        </View>
        <AmountRuler value={active.value} min={active.min} max={active.max} unitStep={active.step} onChange={(value) => onChange(active.key, value)} resetKey={resetToken} />
      </View>
    </View>
  );
}
