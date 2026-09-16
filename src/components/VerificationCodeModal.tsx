import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { OtpInput } from "@/components/ui/base/otp-input";
import { colors, radius, spring } from "@/theme";

const CODE_LENGTH = 6;

type VerificationCodeModalProps = {
  visible: boolean;
  email: string;
  onClose: () => void;
  onComplete: (code: string) => Promise<string | void>;
};

/**
 * Built on Reacticx's `OtpInput` — a real upgrade over the previous hand-rolled boxes, which had
 * no shake-on-error feedback and no built-in paste/autofill splitting (it relied on a single
 * hidden `TextInput` catching the OS's one-time-code autofill; `OtpInput` puts
 * `textContentType="oneTimeCode"` on each box's own hidden input and already splits a multi-digit
 * autofill/paste across all boxes internally).
 *
 * One accepted visual difference: the old boxes stayed yellow-bordered for every already-typed
 * digit; `OtpInput` only highlights the currently-focused box (its internal `focusProgress` is
 * purely focus-driven, not "has this box been filled" — not overridable via props). This is a
 * common, conventional OTP pattern in its own right and the per-box fill still gets a spring "pop"
 * entrance, so it wasn't worth forking the vendored component over.
 *
 * `OtpInput` has no controlled `value`/reset prop — `key={instance}` forces a fresh, empty
 * instance every time the modal opens, the same remount-to-reset pattern `BottomSheet.tsx` already
 * uses for its own reset needs.
 */
export function VerificationCodeModal({ visible, email, onClose, onComplete }: VerificationCodeModalProps) {
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instance, setInstance] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setVerifying(false);
    setInstance((n) => n + 1);
  }, [visible]);

  async function handleFinished(code: string) {
    setVerifying(true);
    const errorMessage = await onComplete(code);
    setVerifying(false);
    if (errorMessage) setError(errorMessage);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.7)", paddingHorizontal: 24 }}
      >
        <Animated.View
          entering={FadeInUp.springify().damping(spring.heavy.damping).mass(spring.heavy.mass)}
          className="w-full gap-2 rounded-3xl border border-divider bg-surface p-6"
        >
          <Pressable onPress={onClose} hitSlop={12} className="absolute right-4 top-4 z-10">
            <Ionicons name="close" size={22} color={colors.neutral.textSecondary} />
          </Pressable>

          <View className="items-center gap-2 pb-2 pt-2">
            <Text className="heading-3 text-text-primary">Check your email</Text>
            <Text className="body-md text-center text-text-secondary">
              We sent a 6-digit code to{"\n"}
              <Text className="text-text-primary">{email}</Text>
            </Text>
          </View>

          <OtpInput
            key={instance}
            otpCount={CODE_LENGTH}
            editable={!verifying}
            error={!!error}
            errorMessage={error ?? undefined}
            onInputFinished={handleFinished}
            onInputChange={() => error && setError(null)}
            inputWidth={44}
            inputHeight={52}
            inputBorderRadius={radius.small}
            unfocusedBackgroundColor={colors.neutral.background}
            focusedBackgroundColor={colors.neutral.background}
            unfocusedBorderColor={colors.neutral.divider}
            focusedBorderColor={colors.brand.yellow}
            errorBackgroundColor={colors.neutral.background}
            errorBorderColor={colors.semantic.error}
            textStyle={{ color: colors.neutral.textPrimary }}
          />

          {verifying && <ActivityIndicator color={colors.brand.yellow} />}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
