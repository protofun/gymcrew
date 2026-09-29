import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from "react-native";
import Animated, { FadeInUp, interpolateColor, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";

import AnimatedText from "@/components/ui/organisms/animated-text";
import { PulsingDots } from "@/components/ui/molecules/pulsing-dots";
import { colors, fontFamily, spring } from "@/theme";

const CODE_LENGTH = 6;

type VerificationCodeModalProps = {
  visible: boolean;
  email: string;
  onClose: () => void;
  onComplete: (code: string) => Promise<string | void>;
};

/** One digit's box: it pops and lights up yellow when a digit lands in it (red after a wrong code). */
function CodeBox({ digit, active, failed }: { digit: string | undefined; active: boolean; failed: boolean }) {
  const filled = useSharedValue(0);
  const pop = useSharedValue(1);

  useEffect(() => {
    filled.value = withTiming(digit ? 1 : 0, { duration: 160 });
    if (digit) pop.value = withSequence(withTiming(1.18, { duration: 90 }), withSpring(1, spring.press));
  }, [digit, filled, pop]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }],
    borderColor: failed ? colors.semantic.error : interpolateColor(filled.value, [0, 1], [active ? colors.brand.yellow : colors.neutral.divider, colors.brand.yellow]),
  }));

  return (
    <Animated.View style={[{ height: 60, width: 48, borderRadius: 14, borderWidth: 2, backgroundColor: colors.neutral.background }, style]} className="items-center justify-center">
      <Text style={{ fontFamily: fontFamily.heading, fontSize: 30, color: colors.brand.white }}>{digit ?? ""}</Text>
    </Animated.View>
  );
}

export function VerificationCodeModal({ visible, email, onClose, onComplete }: VerificationCodeModalProps) {
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!visible) return;
    setCode("");
    setError(null);
    setVerifying(false);
    const timeout = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(timeout);
  }, [visible]);

  async function handleChange(text: string) {
    const digits = text.replace(/[^0-9]/g, "").slice(0, CODE_LENGTH);
    setCode(digits);
    setError(null);
    if (digits.length === CODE_LENGTH) {
      setVerifying(true);
      const errorMessage = await onComplete(digits);
      setVerifying(false);
      if (errorMessage) {
        setError(errorMessage);
        setCode("");
        inputRef.current?.focus();
      }
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.75)", paddingHorizontal: 20 }}
      >
        <Animated.View entering={FadeInUp.springify().damping(16).mass(0.7)} className="w-full gap-6 rounded-[28px] border border-divider bg-surface p-6">
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close" className="absolute right-4 top-4 z-10">
            <Ionicons name="close" size={22} color={colors.neutral.textSecondary} />
          </Pressable>

          <View className="items-center gap-2 pt-2">
            <AnimatedText
              text="CHECK YOUR EMAIL"
              animationConfig={{ characterDelay: 24 }}
              enterFrom={{ translateY: 26, scale: 0.4 }}
              style={{ fontFamily: fontFamily.heading, fontSize: 34, letterSpacing: 1, color: colors.brand.white }}
            />
            <Text style={{ fontFamily: fontFamily.bodyRegular, fontSize: 14, lineHeight: 21, color: colors.neutral.textSecondary, textAlign: "center" }}>
              We sent a 6-digit code to{"\n"}
              <Text style={{ fontFamily: fontFamily.bodySemiBold, color: colors.brand.white }}>{email}</Text>
            </Text>
          </View>

          <Pressable onPress={() => inputRef.current?.focus()} className="flex-row justify-between">
            {Array.from({ length: CODE_LENGTH }).map((_, index) => (
              <CodeBox key={index} digit={code[index]} active={index === code.length && !verifying} failed={Boolean(error)} />
            ))}
          </Pressable>

          <View style={{ minHeight: 24 }} className="items-center justify-center">
            {verifying ? <PulsingDots color={colors.brand.yellow} radius={4} spacing={16} /> : null}
            {error ? <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: colors.semantic.error, textAlign: "center" }}>{error}</Text> : null}
          </View>

          <TextInput
            ref={inputRef}
            value={code}
            onChangeText={handleChange}
            editable={!verifying}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={CODE_LENGTH}
            style={{ position: "absolute", height: 1, width: 1, opacity: 0 }}
          />
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
