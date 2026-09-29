import { useSignIn } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable } from "react-native";

import { AuthField, FormError } from "@/components/AuthField";
import { AuthHero } from "@/components/AuthHero";
import { OnboardingScreen } from "@/components/OnboardingScreen";
import { PrimaryButton } from "@/components/PrimaryButton";
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
    <>
      {!resettingPassword ? (
        <OnboardingScreen title="Forgot password?" subtitle="We'll send you a reset code" hero={<AuthHero />}>
          <AuthField label="Email" placeholders={["alex@gmail.com", "you@gym.com"]} keyboardType="email-address" autoCapitalize="none" autoComplete="email" value={email} onChangeText={setEmail} />
          <FormError message={formError} />
          <PrimaryButton label="Send Reset Code" loading={submitting} onPress={handleSendCode} />
        </OnboardingScreen>
      ) : (
        <OnboardingScreen title="Set a new password" subtitle="Choose a new password for your account" hero={<AuthHero />}>
          <AuthField
            label="New Password"
            placeholders={["Enter your new password"]}
            secureTextEntry={!showPassword}
            value={newPassword}
            onChangeText={setNewPassword}
            right={
              <Pressable onPress={() => setShowPassword((prev) => !prev)} hitSlop={8} accessibilityLabel={showPassword ? "Hide password" : "Show password"}>
                <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={colors.brand.yellow} />
              </Pressable>
            }
          />
          <FormError message={formError} />
          <PrimaryButton label="Save New Password" loading={submitting} onPress={handleSetNewPassword} />
        </OnboardingScreen>
      )}

      <VerificationCodeModal visible={verifying} email={email || "your email"} onClose={() => setVerifying(false)} onComplete={handleVerifyCode} />
    </>
  );
}
