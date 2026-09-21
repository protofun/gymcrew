import { Text, View } from "react-native";

import { AnimatedChip } from "@/components/ui/molecules/animated-chip";
import { AI_SCAN } from "@/constants/ai-scan-theme";
import { fontFamily } from "@/theme";

export type PortionSize = "small" | "regular" | "large";

/** How much each preset scales the AI's estimated portions. */
export const PORTION_FACTORS: Record<PortionSize, number> = { small: 0.75, regular: 1, large: 1.25 };

const OPTIONS: { key: PortionSize; label: string; mark: string }[] = [
  { key: "small", label: "Smaller", mark: "−" },
  { key: "regular", label: "As shown", mark: "=" },
  { key: "large", label: "Bigger", mark: "+" },
];

type AiScanPortionChipsProps = {
  value: PortionSize;
  onChange: (size: PortionSize) => void;
};

/** Three expanding chips (Reacticx `animated-chip`) that scale every ingredient at once — a quick fix
 * for "the AI got the whole plate a bit too big/small" before fine-tuning single items. */
export function AiScanPortionChips({ value, onChange }: AiScanPortionChipsProps) {
  return (
    <View className="items-start">
      <AnimatedChip.Group value={value} onValueChange={(next) => onChange(next as PortionSize)}>
        {OPTIONS.map((option) => (
          <AnimatedChip.Item key={option.key} value={option.key} activeColor={AI_SCAN.accent} inactiveColor={AI_SCAN.surface}>
            <AnimatedChip.Icon>
              {({ selected }) => <Text style={{ fontFamily: fontFamily.heading, fontSize: 24, color: selected ? AI_SCAN.onAccent : AI_SCAN.textMuted }}>{option.mark}</Text>}
            </AnimatedChip.Icon>
            <AnimatedChip.Label color={AI_SCAN.onAccent} style={{ fontFamily: fontFamily.bodyBold, fontSize: 14 }}>
              {option.label}
            </AnimatedChip.Label>
          </AnimatedChip.Item>
        ))}
      </AnimatedChip.Group>
    </View>
  );
}
