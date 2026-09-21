import { Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { AiBeamFrame } from "@/components/AiBeamFrame";
import AnimatedInputBar from "@/components/ui/base/animated-input-bar";
import SpinButton from "@/components/ui/micro-interactions/spin-button";
import AnimatedText from "@/components/ui/organisms/animated-text";
import { AI_SCAN } from "@/constants/ai-scan-theme";
import { colors, fontFamily } from "@/theme";

const PLACEHOLDERS = ["That's cauliflower rice, not rice", "There's no sauce on it", "It's a smaller portion", "Add a glass of milk"];

type AiScanPromptCardProps = {
  hint: string;
  error: string | null;
  /** Scans left today — `null` for accounts with unlimited scans. */
  scansRemaining: number | null;
  onChangeHint: (hint: string) => void;
  onReanalyse: () => void;
};

/** "Something off? Tell the AI" — a prompt field for correcting the analysis, inside a Border Beam that
 * runs a glowing light around the card, with a Spin Button to send it. */
export function AiScanPromptCard({ hint, error, scansRemaining, onChangeHint, onReanalyse }: AiScanPromptCardProps) {
  const outOfScans = scansRemaining === 0;
  const canReanalyse = hint.trim().length > 0 && !outOfScans;

  return (
    <Animated.View entering={FadeInDown.delay(400).springify()}>
      <AiBeamFrame>
        <View style={{ backgroundColor: AI_SCAN.surface, borderRadius: 24 }} className="gap-3 p-4">
          <AnimatedText
            text="SOMETHING OFF? TELL THE AI"
            animationConfig={{ characterDelay: 22 }}
            enterFrom={{ translateY: 20, scale: 0.4 }}
            style={{ fontFamily: fontFamily.heading, fontSize: 18, letterSpacing: 1, color: colors.brand.white }}
          />
          <Text className="body-sm" style={{ color: AI_SCAN.textMuted }}>
            Describe what it got wrong and it will look at your photo again.
          </Text>
          <View style={{ backgroundColor: colors.neutral.background, borderColor: AI_SCAN.border }} className="overflow-hidden rounded-2xl border">
            <AnimatedInputBar
              placeholders={PLACEHOLDERS}
              value={hint}
              onChangeText={onChangeHint}
              onSubmitEditing={canReanalyse ? onReanalyse : undefined}
              returnKeyType="send"
              maxLength={300}
              selectionColor={AI_SCAN.accent}
              containerStyle={{ marginVertical: 0 }}
              animationInterval={2600}
              placeholderStyle={{ fontFamily: fontFamily.bodyRegular, fontSize: 14 }}
              inputStyle={{ fontFamily: fontFamily.bodyRegular, fontSize: 14 }}
            />
          </View>
          {error && <Text className="body-sm text-error">{error}</Text>}
          <View className="items-center gap-2">
            <SpinButton
              idleText="Analyse again"
              activeText="Analysing…"
              controlled
              isActive={false}
              disabled={!canReanalyse}
              onPress={() => onReanalyse()}
              colors={{
                idle: { background: canReanalyse ? AI_SCAN.accent : AI_SCAN.surfaceRaised, text: canReanalyse ? AI_SCAN.onAccent : AI_SCAN.textMuted },
                active: { background: AI_SCAN.accent, text: AI_SCAN.onAccent },
              }}
              buttonStyle={{ paddingHorizontal: 26, paddingVertical: 12, borderRadius: 999, fontSize: 14, fontWeight: "700" }}
            />
            <Text className="caption text-center" style={{ color: AI_SCAN.textMuted }}>
              {outOfScans ? "No AI scans left today." : scansRemaining === null ? "Uses 1 AI scan" : `Uses 1 AI scan · ${scansRemaining} left today`}
            </Text>
          </View>
        </View>
      </AiBeamFrame>
    </Animated.View>
  );
}
