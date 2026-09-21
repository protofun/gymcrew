import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AiPhotoGlow } from "@/components/AiPhotoGlow";
import { PulsingDots } from "@/components/ui/molecules/pulsing-dots";
import AnimatedText from "@/components/ui/organisms/animated-text";
import { AnimatedProgressBar } from "@/components/ui/organisms/progress";
import { AI_SCAN } from "@/constants/ai-scan-theme";
import { colors, fontFamily } from "@/theme";

const STEPS = ["Looking at your plate", "Spotting every ingredient", "Estimating the portions", "Crunching the macros"];

export type AnalysisStatus = "working" | "done" | "failed";

type AiScanAnalyzingProps = {
  photoUri: string;
  /** Anything but "working" means the API call has answered — the glow winds down, then `onExited` fires. */
  status: AnalysisStatus;
  onExited: () => void;
};

/** One line of the checklist: ticked once passed, filled while it's the current step. */
function StepRow({ label, state }: { label: string; state: "done" | "current" | "todo" }) {
  return (
    <View className="flex-row items-center gap-2.5">
      {state === "done" ? (
        <Ionicons name="checkmark-circle" size={16} color={AI_SCAN.accent} />
      ) : state === "current" ? (
        <Ionicons name="ellipse" size={16} color={AI_SCAN.accent} />
      ) : (
        <Ionicons name="ellipse-outline" size={16} color={AI_SCAN.textOnMedia} />
      )}
      <Text className="body-sm" style={{ color: colors.brand.white, opacity: state === "todo" ? 0.55 : 1 }}>
        {label}
      </Text>
    </View>
  );
}

/** The waiting step: your own photo with the AI glow rolling over it, and a panel underneath that
 * walks through what the AI is doing — animated step title, progress bar and a ticking checklist. */
export function AiScanAnalyzing({ photoUri, status, onExited }: AiScanAnalyzingProps) {
  const insets = useSafeAreaInsets();
  const [stepIndex, setStepIndex] = useState(0);
  const done = status !== "working";
  const handleExited = useCallback(onExited, [onExited]);

  useEffect(() => {
    if (done) return;
    const interval = setInterval(() => setStepIndex((index) => Math.min(index + 1, STEPS.length - 1)), 2200);
    return () => clearInterval(interval);
  }, [done]);

  const title = status === "done" ? "HERE'S YOUR MEAL" : status === "failed" ? "THAT DIDN'T WORK" : STEPS[stepIndex].toUpperCase();
  const progress = done ? 1 : Math.min(0.15 + stepIndex * 0.22, 0.9);

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <AiPhotoGlow photoUri={photoUri} done={done} onExited={handleExited} />

      <Animated.View
        entering={FadeInDown.delay(300).springify()}
        pointerEvents="none"
        style={{ position: "absolute", left: 20, right: 20, bottom: insets.bottom + 28, backgroundColor: AI_SCAN.overlay, borderColor: AI_SCAN.overlayBorder }}
        className="gap-3.5 rounded-3xl border p-4"
      >
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1">
            <AnimatedText
              text={title}
              animationConfig={{ characterDelay: 16 }}
              enterFrom={{ translateY: 22, scale: 0.4 }}
              style={{ fontFamily: fontFamily.heading, fontSize: 20, letterSpacing: 1, color: colors.brand.white }}
            />
          </View>
          <PulsingDots color={AI_SCAN.accent} dotCount={3} radius={4} spacing={8} />
        </View>

        <AnimatedProgressBar progress={progress} height={6} borderRadius={3} progressColor={AI_SCAN.accent} trackColor="rgba(255,255,255,0.15)" animationDuration={900} />

        <View className="gap-2">
          {STEPS.map((step, index) => (
            <StepRow key={step} label={step} state={done || index < stepIndex ? "done" : index === stepIndex ? "current" : "todo"} />
          ))}
        </View>
      </Animated.View>
    </View>
  );
}
