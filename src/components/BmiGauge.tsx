import { Text, View } from "react-native";

import { colors, fontFamily } from "@/theme";

/** Official WHO adult BMI formula and categories — weight in kg, height in meters. */
export function calculateBmi(weightKg: number, heightM: number): number {
  return weightKg / (heightM * heightM);
}

const BMI_MIN = 15;
const BMI_MAX = 40;

const ZONES = [
  { upTo: 18.5, label: "Underweight", color: colors.semantic.info },
  { upTo: 25, label: "Normal", color: colors.semantic.success },
  { upTo: 30, label: "Overweight", color: colors.semantic.warning },
  { upTo: BMI_MAX, label: "Obese", color: colors.semantic.error },
] as const;

function zoneFor(bmi: number) {
  return ZONES.find((zone) => bmi <= zone.upTo) ?? ZONES[ZONES.length - 1];
}

/**
 * A real, official-formula BMI gauge — weight(kg) / height(m)², plotted on the standard WHO
 * under/normal/over/obese bands so it's clear at a glance where the current reading falls, not just
 * a bare number.
 */
export function BmiGauge({ bmi }: { bmi: number }) {
  const zone = zoneFor(bmi);
  const clamped = Math.max(BMI_MIN, Math.min(BMI_MAX, bmi));
  const markerRatio = (clamped - BMI_MIN) / (BMI_MAX - BMI_MIN);

  return (
    <View className="gap-4">
      <View className="items-center gap-1">
        <Text style={{ fontFamily: fontFamily.heading, fontSize: 40, lineHeight: 42, color: zone.color }}>{bmi.toFixed(1)}</Text>
        <Text className="body-sm font-body-bold" style={{ color: zone.color }}>
          {zone.label.toUpperCase()}
        </Text>
      </View>

      <View>
        <View style={{ height: 10, borderRadius: 999, overflow: "hidden", flexDirection: "row" }}>
          {ZONES.map((z, index) => {
            const lowerBound = index === 0 ? BMI_MIN : ZONES[index - 1].upTo;
            return <View key={z.label} style={{ flex: z.upTo - lowerBound, backgroundColor: z.color }} />;
          })}
        </View>
        <View pointerEvents="none" style={{ height: 0 }}>
          <View
            style={{
              position: "absolute",
              left: `${markerRatio * 100}%`,
              top: -16,
              width: 2,
              height: 18,
              marginLeft: -1,
              backgroundColor: colors.brand.white,
            }}
          />
        </View>
      </View>

      <View className="flex-row justify-between">
        {ZONES.map((z) => (
          <Text key={z.label} className="caption text-text-secondary" style={{ color: z.color }}>
            {z.label}
          </Text>
        ))}
      </View>
    </View>
  );
}
