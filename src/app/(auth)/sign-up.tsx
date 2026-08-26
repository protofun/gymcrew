import { useAuth, useClerk, useSignUp } from "@clerk/expo";
import { useSSO } from "@clerk/expo/experimental";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import { usePostHog } from "posthog-react-native";

import { AuthDivider } from "@/components/AuthDivider";
import { AuthHeader } from "@/components/AuthHeader";
import { FormField } from "@/components/FormField";
import { SocialAuthButton } from "@/components/SocialAuthButton";
import { VerificationCodeModal } from "@/components/VerificationCodeModal";
import { useWarmUpBrowser } from "@/hooks/use-warm-up-browser";
import { waitForAuthToken } from "@/lib/api";
import { getClerkErrorMessage } from "@/lib/clerk";
import { resetLocalStateForAccountSwitch } from "@/lib/reset-local-state";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors } from "@/theme";

/**
 * Runs once a real session exists after sign-up completes (see `waitForAuthToken` — finalize()
 * resolving doesn't guarantee the session is usable *yet*). The whole wizard runs before sign-up,
 * with no session to push to, so every backend push during it silently failed and got swallowed —
 * `pushAllOnboardingData` re-sends what's already sitting in local state now that it can actually
 * reach the backend. The Clerk-side "completed" flag only gets (re-)persisted when the wizard
 * genuinely ran first (`hasCompletedOnboarding` already true) — sign-up is also reachable directly
 * without the wizard, and this must never mark that case "onboarded" with no profile ever collected.
 */
async function finishAccountSetup() {
  await waitForAuthToken();
  useOnboardingStore.getState().pushAllOnboardingData();
  if (useOnboardingStore.getState().hasCompletedOnboarding) {
    useOnboardingStore.getState().completeOnboarding();
  }
}

export default function SignUpScreen() {
  useWarmUpBrowser();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const { signUp } = useSignUp();
  const { startSSOFlow } = useSSO();
  const posthog = usePostHog();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Creating an account must never silently reuse whatever session happens to already be active
  // (e.g. a developer's own test account, or a previous person's session on a shared/test device)
  // — clear it the moment this screen is reached so the form below always creates a genuinely new,
  // separate account. Also wipes local storage (see reset-local-state.ts) — without this, the new
  // account's onboarding push could otherwise carry the PREVIOUS account's cached answers.
  useEffect(() => {
    if (authLoaded && isSignedIn) {
      signOut().then(() => resetLocalStateForAccountSwitch());
    }
  }, [authLoaded, isSignedIn, signOut]);

  async function handleSignUp() {
    setFormError(null);
    setSubmitting(true);

    const { error } = await signUp.password({ emailAddress: email, password });
    if (error) {
      setSubmitting(false);
      setFormError(getClerkErrorMessage(error));
      return;
    }

    const { error: sendError } = await signUp.verifications.sendEmailCode();
    setSubmitting(false);
    if (sendError) {
      setFormError(getClerkErrorMessage(sendError));
      return;
    }

    setVerifying(true);
  }

  async function handleVerify(code: string) {
    const { error } = await signUp.verifications.verifyEmailCode({ code });
    if (error) {
      return getClerkErrorMessage(error);
    }

    const { error: finalizeError } = await signUp.finalize();
    if (finalizeError) {
      return getClerkErrorMessage(finalizeError);
    }

    posthog.capture("user_signed_up", { auth_method: "email" });
    await finishAccountSetup();
    // The normal path here is wizard -> sign-up, so `hasCompletedOnboarding` is already true
    // locally and this lands on /build-crew as before. But sign-up is also reachable directly
    // (e.g. from sign-in's "Don't have an account?" link) without ever doing the wizard — routing
    // through "/" lets the central gate (lib/onboarding-gate.ts) send that case to /onboarding
    // instead, rather than skipping straight to crew selection with no profile data collected.
    router.replace("/");
  }

  async function handleSocialAuth(strategy: "oauth_google" | "oauth_facebook" | "oauth_apple") {
    setFormError(null);
    try {
      const { createdSessionId } = await startSSOFlow({ strategy });
      if (createdSessionId) {
        const provider = strategy.replace("oauth_", "");
        posthog.capture("user_signed_up", { auth_method: provider });
        await finishAccountSetup();
        router.replace("/");
      }
    } catch (error) {
      setFormError(getClerkErrorMessage(error));
    }
  }

  if (!authLoaded || isSignedIn) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.neutral.background }}>
        <ActivityIndicator size="large" color={colors.brand.yellow} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutral.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerClassName="gap-6 px-6 pb-10 pt-4" keyboardShouldPersistTaps="handled">
          <AuthHeader title="Create your account" subtitle="Start your fitness journey today" />

          <View className="-mt-8 gap-4">
            <FormField
              label="Email"
              placeholder="alex@gmail.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <FormField
              label="Password"
              placeholder="Enter your password"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              rightAdornment={
                <Pressable onPress={() => setShowPassword((prev) => !prev)} hitSlop={8}>
                  <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={colors.brand.yellow} />
                </Pressable>
              }
            />
            {formError && <Text className="body-sm text-error">{formError}</Text>}
          </View>

          <Pressable
            onPress={handleSignUp}
            disabled={submitting}
            className="flex-row items-center justify-center gap-2 rounded-full bg-brand-yellow py-4"
            style={({ pressed }) => ({ opacity: pressed || submitting ? 0.85 : 1 })}
          >
            <Text className="heading-4 text-brand-iron">{submitting ? "Signing Up..." : "Sign Up"}</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.brand.iron} />
          </Pressable>

          {/* Anchor for Clerk's bot-protection widget on web; skipped automatically on iOS/Android. */}
          <View nativeID="clerk-captcha" />

          <AuthDivider />

          <View className="gap-3">
            <SocialAuthButton provider="google" onPress={() => handleSocialAuth("oauth_google")} />
            <SocialAuthButton provider="facebook" onPress={() => handleSocialAuth("oauth_facebook")} />
            <SocialAuthButton provider="apple" onPress={() => handleSocialAuth("oauth_apple")} />
          </View>

          <View className="flex-row justify-center gap-1">
            <Text className="body-md text-text-secondary">Already have an account?</Text>
            <Pressable hitSlop={8} onPress={() => router.push("/sign-in")}>
              <Text className="body-md text-brand-yellow">Log in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <VerificationCodeModal
        visible={verifying}
        email={email || "your email"}
        onClose={() => setVerifying(false)}
        onComplete={handleVerify}
      />
    </SafeAreaView>
  );
}
