import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { colors } from "@/theme";

const CODE_LENGTH = 6;

type VerificationCodeModalProps = {
  visible: boolean;
  email: string;
  onClose: () => void;
  onComplete: (code: string) => Promise<string | void>;
};

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
        style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.7)", paddingHorizontal: 24 }}
      >
        <Animated.View
          entering={FadeInUp.springify().damping(16).mass(0.7)}
          className="w-full gap-6 rounded-3xl border border-divider bg-surface p-6"
        >
          <Pressable onPress={onClose} hitSlop={12} className="absolute right-4 top-4 z-10">
            <Ionicons name="close" size={22} color={colors.neutral.textSecondary} />
          </Pressable>

          <View className="items-center gap-2 pt-2">
            <Text className="heading-3 text-text-primary">Check your email</Text>
            <Text className="body-md text-center text-text-secondary">
              We sent a 6-digit code to{"\n"}
              <Text className="text-text-primary">{email}</Text>
            </Text>
          </View>

          <Pressable onPress={() => inputRef.current?.focus()} className="flex-row justify-between">
            {Array.from({ length: CODE_LENGTH }).map((_, index) => (
              <View
                key={index}
                className={`h-14 w-12 items-center justify-center rounded-xl border bg-background ${
                  error ? "border-error" : index < code.length ? "border-brand-yellow" : "border-divider"
                }`}
              >
                <Text className="heading-4 text-text-primary">{code[index] ?? ""}</Text>
              </View>
            ))}
          </Pressable>

          {verifying && <ActivityIndicator color={colors.brand.yellow} />}
          {error && <Text className="body-sm text-center text-error">{error}</Text>}

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
