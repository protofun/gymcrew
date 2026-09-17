import { useSignIn } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";

import { AuthHeader } from "@/components/AuthHeader";
import { FormField } from "@/components/FormField";
import { VerificationCodeModal } from "@/components/VerificationCodeModal";
import { waitForAuthToken } from "@/lib/api";
import { getClerkErrorMessage } from "@/lib/clerk";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors } from "@/theme";

/** Same "resume as returning user" pattern sign-in.tsx uses after a normal password login — a
 * successful reset also ends in a real, complete session (see handleSetNewPassword's
 * `signIn.finalize()`), so it should land the same place a normal login would. */
async function resumeAfterReset() {
  await waitForAuthToken();
  await useOnboardingStore.getState().syncProfileFromServer();
  router.replace("/");
}

export default function ForgotPasswordScreen() {
  const { signIn } = useSignIn();
  const [email, setEmail] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSendCode() {
    setFormError(null);
    setSubmitting(true);

    const { error: createError } = await signIn.create({ identifier: email });
    if (createError) {
      setSubmitting(false);
      setFormError(getClerkErrorMessage(createError));
      return;
    }

    const { error: sendError } = await signIn.resetPasswordEmailCode.sendCode();
    setSubmitting(false);
    if (sendError) {
      setFormError(getClerkErrorMessage(sendError));
      return;
    }

    setVerifying(true);
  }

  async function handleVerifyCode(code: string) {
    const { error } = await signIn.resetPasswordEmailCode.verifyCode({ code });
    if (error) {
      return getClerkErrorMessage(error);
    }

    setVerifying(false);
    setResettingPassword(true);
  }

  async function handleSetNewPassword() {
    setFormError(null);
    setSubmitting(true);

    const { error } = await signIn.resetPasswordEmailCode.submitPassword({ password: newPassword });
    if (error) {
      setSubmitting(false);
      setFormError(getClerkErrorMessage(error));
      return;
    }

    const { error: finalizeError } = await signIn.finalize();
    if (finalizeError) {
      setSubmitting(false);
      setFormError(getClerkErrorMessage(finalizeError));
      return;
    }

    await resumeAfterReset();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutral.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerClassName="gap-6 px-6 pb-10 pt-4" keyboardShouldPersistTaps="handled">
          {!resettingPassword ? (
            <>
              <AuthHeader title="Forgot password?" subtitle="We'll send you a reset code" />

              <View className="-mt-8 gap-4">
                <FormField
                  label="Email"
                  placeholder="alex@gmail.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
                {formError && <Text className="body-sm text-error">{formError}</Text>}
              </View>

              <Pressable
                onPress={handleSendCode}
                disabled={submitting}
                className="flex-row items-center justify-center gap-2 rounded-full bg-brand-yellow py-4"
                style={({ pressed }) => ({ opacity: pressed || submitting ? 0.85 : 1 })}
              >
                <Text className="heading-4 text-brand-iron">{submitting ? "Sending..." : "Send Reset Code"}</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.brand.iron} />
              </Pressable>
            </>
          ) : (
            <>
              <AuthHeader title="Set a new password" subtitle="Choose a new password for your account" />

              <View className="-mt-8 gap-4">
                <FormField
                  label="New Password"
                  placeholder="Enter your new password"
                  secureTextEntry={!showPassword}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  rightAdornment={
                    <Pressable onPress={() => setShowPassword((prev) => !prev)} hitSlop={8}>
                      <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={colors.brand.yellow} />
                    </Pressable>
                  }
                />
                {formError && <Text className="body-sm text-error">{formError}</Text>}
              </View>

              <Pressable
                onPress={handleSetNewPassword}
                disabled={submitting}
                className="flex-row items-center justify-center gap-2 rounded-full bg-brand-yellow py-4"
                style={({ pressed }) => ({ opacity: pressed || submitting ? 0.85 : 1 })}
              >
                <Text className="heading-4 text-brand-iron">{submitting ? "Saving..." : "Save New Password"}</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.brand.iron} />
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <VerificationCodeModal visible={verifying} email={email || "your email"} onClose={() => setVerifying(false)} onComplete={handleVerifyCode} />
    </SafeAreaView>
  );
}
