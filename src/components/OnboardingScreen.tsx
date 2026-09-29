import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AnimatedText from "@/components/ui/organisms/animated-text";
import { AnimatedProgressBar } from "@/components/ui/organisms/progress";
import { goBack } from "@/lib/navigation";
import { colors, fontFamily, spring } from "@/theme";

type OnboardingScreenProps = {
  title: string;
  subtitle?: string;
  /** 0–1, from lib/onboarding-steps.ts — leave out for screens outside a stepped flow. */
  progress?: number;
  /** The back button's action (default: back in history). */
  onBack?: () => void;
  hideBack?: boolean;
  /** Something above the title — a mascot, a preview. */
  hero?: ReactNode;
  /** Keep the title and content in the middle instead of at the top. */
  centered?: boolean;
  /** Pinned under the content — usually a `PrimaryButton`. */
  footer?: ReactNode;
  /** Set false for a screen that scrolls nothing (the content then fills the space). */
  scroll?: boolean;
  children?: ReactNode;
};

/** The frame of every sign-up, wizard and crew screen: a round back button and a progress bar at the top, the
 * title as big animated text, the content, and the button pinned to the bottom. Everything comes in
 * one after another so each step feels like a fresh page. */
export function OnboardingScreen({ title, subtitle, progress, onBack, hideBack = false, hero, centered = false, footer, scroll = true, children }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  // The title's letters wrap on their own, so a long one steps down a size rather than break mid-word on a small phone.
  const titleSize = title.length > 16 ? 36 : 42;

  const content = (
    <View className="gap-6">
      {hero}
      <View className="gap-2">
        <AnimatedText
          key={title}
          text={title.toUpperCase()}
          animationConfig={{ characterDelay: 26 }}
          enterFrom={{ translateY: 34, scale: 0.4 }}
          style={{ fontFamily: fontFamily.heading, fontSize: titleSize, lineHeight: titleSize + 4, letterSpacing: 1, color: colors.brand.white }}
        />
        {subtitle ? (
          <Animated.Text entering={FadeInDown.delay(260).duration(400)} style={{ fontFamily: fontFamily.bodyMedium, fontSize: 16, lineHeight: 23, color: colors.neutral.textSecondary }}>
            {subtitle}
          </Animated.Text>
        ) : null}
      </View>
      <Animated.View entering={FadeInUp.delay(320).springify().damping(spring.entrance.damping).mass(spring.entrance.mass)} className="gap-5">
        {children}
      </Animated.View>
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.neutral.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ flex: 1, paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 16) }}>
        <View className="h-10 flex-row items-center gap-4 px-6">
          {!hideBack && (
            <Pressable onPress={onBack ?? (() => goBack())} hitSlop={10} accessibilityLabel="Back" className="h-10 w-10 items-center justify-center rounded-full border border-divider bg-surface">
              <Ionicons name="chevron-back" size={20} color={colors.neutral.textPrimary} />
            </Pressable>
          )}
          {progress !== undefined && (
            <View className="flex-1">
              <AnimatedProgressBar progress={progress} height={6} borderRadius={3} progressColor={colors.brand.yellow} trackColor={colors.neutral.divider} animationDuration={700} />
            </View>
          )}
        </View>

        {scroll ? (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ flexGrow: 1, justifyContent: centered ? "center" : "flex-start", paddingHorizontal: 24, paddingVertical: 20 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {content}
          </ScrollView>
        ) : (
          <View className="flex-1 px-6 py-5" style={{ justifyContent: centered ? "center" : "flex-start" }}>
            {content}
          </View>
        )}

        {footer ? <View className="gap-3 px-6 pt-2">{footer}</View> : null}
      </View>
    </KeyboardAvoidingView>
  );
}

/** A small caption above a group of controls in these screens. */
export function FieldLabel({ children }: { children: string }) {
  return <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 12, letterSpacing: 1, color: colors.neutral.textSecondary }}>{children.toUpperCase()}</Text>;
}
