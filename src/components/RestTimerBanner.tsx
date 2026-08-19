import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";

import { formatElapsed } from "@/hooks/use-elapsed-timer";
import { useCountdown } from "@/hooks/use-countdown";
import { colors } from "@/theme";

type RestTimerBannerProps = {
  restEndTime: number | null;
  restDurationSeconds: number;
  onAddSeconds: (seconds: number) => void;
  onStop: () => void;
};

export function RestTimerBanner({ restEndTime, restDurationSeconds, onAddSeconds, onStop }: RestTimerBannerProps) {
  const remainingSeconds = useCountdown(restEndTime);

  useEffect(() => {
    // Guarded with a real clock check, not just `remainingSeconds === 0` — the moment `restEndTime`
    // is freshly set to a future timestamp, `remainingSeconds` is still the stale 0 from before the
    // countdown re-synced, which would otherwise stop the timer the instant it starts.
    if (restEndTime !== null && remainingSeconds === 0 && Date.now() >= restEndTime) onStop();
  }, [restEndTime, remainingSeconds, onStop]);

  if (restEndTime === null) return null;

  const progress = restDurationSeconds > 0 ? Math.min(1, Math.max(0, remainingSeconds / restDurationSeconds)) : 0;

  return (
    <Animated.View entering={FadeInDown.springify().damping(16).mass(0.7)} exiting={FadeOutDown.duration(150)}>
      <View className="mb-3 flex-row items-center gap-3 overflow-hidden rounded-full border border-brand-yellow/40 bg-surface px-4 py-3">
        {/* Dynamic width tied to a runtime countdown ratio — inline style is the right call here,
            not a className, since it changes every second. */}
        <View
          pointerEvents="none"
          style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${progress * 100}%`, backgroundColor: `${colors.brand.yellow}20` }}
        />

        <Ionicons name="time-outline" size={18} color={colors.brand.yellow} />
        <Text className="body-lg flex-1 font-body-semibold text-text-primary">Rest · {formatElapsed(remainingSeconds)}</Text>

        <Pressable onPress={() => onAddSeconds(15)} hitSlop={8} className="rounded-full bg-background px-3 py-1.5">
          <Text className="body-sm font-body-semibold text-text-primary">+15s</Text>
        </Pressable>

        <Pressable onPress={onStop} hitSlop={8}>
          <Ionicons name="close-circle" size={22} color={colors.neutral.textSecondary} />
        </Pressable>
      </View>
    </Animated.View>
  );
}
