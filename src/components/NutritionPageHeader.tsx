import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AnimatedText from "@/components/ui/organisms/animated-text";
import { colors, fontFamily } from "@/theme";

type NutritionPageHeaderProps = {
  /** Shown big and animated — keep it short, every letter moves. */
  title: string;
  subtitle?: string;
  /** For pushed pages; a hub page (`embedded`) has none. */
  onBack?: () => void;
  /** A Nutrition hub page's header (Foods, Progress, History): the title and its action on one row, no back button — the hub's own bar leads out — and no safe-area gap, the hub adds it. */
  embedded?: boolean;
  /** Round buttons on the right. */
  actions?: ReactNode;
};

/** The top of a Nutrition page without a photo: a round back button, optional round actions, and the
 * title as big animated text — the same language as the diary and the food pages. */
export function NutritionPageHeader({ title, subtitle, onBack, embedded, actions }: NutritionPageHeaderProps) {
  const insets = useSafeAreaInsets();

  if (embedded) {
    return (
      <View className="gap-1 px-4 pb-3 pt-2">
        <View className="flex-row items-center gap-3">
          <View className="flex-1">
            <AnimatedText
              text={title.toUpperCase()}
              animationConfig={{ characterDelay: 30 }}
              enterFrom={{ translateY: 32, scale: 0.4 }}
              style={{ fontFamily: fontFamily.heading, fontSize: 34, lineHeight: 38, letterSpacing: 1, color: colors.brand.white }}
            />
          </View>
          {actions && <View className="flex-row items-center gap-2">{actions}</View>}
        </View>
        {subtitle ? <Text className="body-sm px-1 text-text-secondary">{subtitle}</Text> : null}
      </View>
    );
  }

  return (
    <View style={{ paddingTop: insets.top + 8 }} className="gap-3 px-4 pb-3">
      {(onBack || actions) && (
        <View className="flex-row items-center justify-between">
          {onBack ? (
            <Pressable onPress={onBack} hitSlop={8} className="h-10 w-10 items-center justify-center rounded-full border border-divider bg-surface" accessibilityLabel="Back">
              <Ionicons name="chevron-back" size={19} color={colors.neutral.textPrimary} />
            </Pressable>
          ) : (
            <View />
          )}
          <View className="flex-row items-center gap-2">{actions}</View>
        </View>
      )}
      <View className="gap-1 px-1">
        <AnimatedText
          text={title.toUpperCase()}
          animationConfig={{ characterDelay: 30 }}
          enterFrom={{ translateY: 32, scale: 0.4 }}
          style={{ fontFamily: fontFamily.heading, fontSize: 38, lineHeight: 42, letterSpacing: 1, color: colors.brand.white }}
        />
        {subtitle ? <Text className="body-sm text-text-secondary">{subtitle}</Text> : null}
      </View>
    </View>
  );
}

/** A small round button for the header's right side. */
export function HeaderRoundButton({ icon, onPress, label, active }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void; label: string; active?: boolean }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} className="h-10 w-10 items-center justify-center rounded-full border border-divider bg-surface" accessibilityLabel={label}>
      <Ionicons name={icon} size={19} color={active ? colors.brand.yellow : colors.neutral.textPrimary} />
    </Pressable>
  );
}
