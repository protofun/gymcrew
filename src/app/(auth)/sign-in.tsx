import { useAuth, useSignIn } from "@clerk/expo";
import { useSSO } from "@clerk/expo/experimental";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import { usePostHog } from "posthog-react-native";

import { AuthDivider } from "@/components/AuthDivider";
import { AuthHeader } from "@/components/AuthHeader";
import { AuthSubmitButton } from "@/components/AuthSubmitButton";
import { FormField } from "@/components/FormField";
import { SocialAuthButton } from "@/components/SocialAuthButton";
import { VerificationCodeModal } from "@/components/VerificationCodeModal";
import { useWarmUpBrowser } from "@/hooks/use-warm-up-browser";
import { waitForAuthToken } from "@/lib/api";
import { getClerkErrorMessage } from "@/lib/clerk";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors } from "@/theme";

/** After a real sign-in (not sign-up), pulls this account's backend profile so known fields (e.g. a
 * Founding Athlete's linked name/username, see profile.php's maybeLinkFoundingAthlete) are already
 * in the store before the wizard, if it runs, ever gets there. Whether the wizard runs at all is
 * decided by Clerk's `hasCompletedOnboarding` metadata flag alone (see the redirect gate at "/"),
 * not by anything here — this call only ever fills in data, never marks onboarding complete. Waits
 * for a real session first (see `waitForAuthToken`) — without it, the sync below can silently no-op
 * ("not signed in") even though sign-in just reported success. */
async function resumeAsReturningUser() {
  await waitForAuthToken();
  await useOnboardingStore.getState().syncProfileFromServer();
  router.replace("/");
}

/** Belt-and-suspenders: `resumeAsReturningUser` above is written to never hang, but this screen must
 * never trap someone on a spinner with no way out if it somehow does anyway (a stuck redirect here
 * means a stuck login, full stop) — race it against a timeout and surface a retry instead of a
 * silent, permanent stall. */
function resumeWithTimeout(timeoutMs = 8000): Promise<void> {
  return Promise.race([
    resumeAsReturningUser(),
    new Promise<void>((_, reject) => setTimeout(() => reject(new Error("Taking longer than expected.")), timeoutMs)),
  ]);
}

export default function SignInScreen() {
  useWarmUpBrowser();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { signIn } = useSignIn();
  const { startSSOFlow } = useSSO();
  const posthog = usePostHog();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resumeStuck, setResumeStuck] = useState(false);
  const [resumeAttempt, setResumeAttempt] = useState(0);
  const [verifyingDevice, setVerifyingDevice] = useState(false);

  // Landing here already signed in (e.g. a recognized session from before, or the "Log in" link
  // tapped by mistake while already authenticated) — there's nothing to log in to, so just resume
  // that account instead of showing an empty form. Guarded below so the form never flashes first —
  // but that guard must never be a dead end, so a stuck resume flips back to an actual retry button
  // instead of trapping this screen on a spinner forever (see resumeWithTimeout).
  useEffect(() => {
    if (!authLoaded || !isSignedIn) return;
    setResumeStuck(false);
    resumeWithTimeout().catch((error) => {
      console.warn("Failed to resume session", error);
      setResumeStuck(true);
    });
  }, [authLoaded, isSignedIn, resumeAttempt]);

  if (!authLoaded || (isSignedIn && !resumeStuck)) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.neutral.background, gap: 12 }}>
        <ActivityIndicator size="large" color={colors.brand.yellow} />
        {authLoaded && isSignedIn && <Text className="body-sm text-text-secondary">Signing you in…</Text>}
      </SafeAreaView>
    );
  }

  if (isSignedIn && resumeStuck) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.neutral.background, gap: 16, padding: 24 }}>
        <Text className="body-md text-center text-text-secondary">Taking longer than expected to sign you in.</Text>
        <AuthSubmitButton variant="compact" label="Try Again" onPress={() => setResumeAttempt((n) => n + 1)} />
      </SafeAreaView>
    );
  }

  /** Shared finalize step, run once `signIn.status` is genuinely "complete" — either right after a
   * normal password sign-in, or after completing Device Trust's second-factor email code below.
   * Returns an error message instead of setting form state directly, since the Device Trust path
   * also feeds this straight into VerificationCodeModal's own inline error display. */
  async function finalizeSignIn(): Promise<string | void> {
    const { error } = await signIn.finalize();
    if (error) return getClerkErrorMessage(error);
    posthog.capture("user_signed_in", { auth_method: "email" });
    // Not calling resumeAsReturningUser() here — `isSignedIn` flipping true right about now is what
    // triggers the timeout-protected effect above to do that, on the one path that can't get stuck.
  }

  async function handleSignIn() {
    setFormError(null);
    setSubmitting(true);

    const { error } = await signIn.password({ emailAddress: email, password });
    if (error) {
      setSubmitting(false);
      setFormError(getClerkErrorMessage(error));
      return;
    }

    // A new device (or any account with a second factor configured) lands here instead of
    // "complete" — Clerk's Device Trust requires verifying an email code before it'll let the
    // sign-in finalize (see https://clerk.com/docs/guides/secure/device-trust). This is the same
    // `mfa.*` API real MFA uses, since Device Trust is a second-factor requirement under the hood.
    // Handling it here (instead of just erroring out) means nobody has to be manually exempted in
    // the Clerk dashboard for sign-in to work.
    if (signIn.status === "needs_client_trust" || signIn.status === "needs_second_factor") {
      const { error: sendError } = await signIn.mfa.sendEmailCode();
      setSubmitting(false);
      if (sendError) {
        setFormError(getClerkErrorMessage(sendError));
        return;
      }
      setVerifyingDevice(true);
      return;
    }

    if (signIn.status !== "complete") {
      setSubmitting(false);
      setFormError("Additional verification is required for this account.");
      return;
    }

    const finalizeErrorMessage = await finalizeSignIn();
    setSubmitting(false);
    if (finalizeErrorMessage) setFormError(finalizeErrorMessage);
  }

  async function handleVerifyDeviceCode(code: string) {
    const { error } = await signIn.mfa.verifyEmailCode({ code });
    if (error) return getClerkErrorMessage(error);

    setVerifyingDevice(false);
    return finalizeSignIn();
  }

  async function handleSocialAuth(strategy: "oauth_google" | "oauth_facebook" | "oauth_apple") {
    setFormError(null);
    try {
      const { createdSessionId } = await startSSOFlow({ strategy });
      if (createdSessionId) {
        const provider = strategy.replace("oauth_", "");
        posthog.capture("user_signed_in", { auth_method: provider });
        // Same as handleSignIn above — the effect takes it from here once `isSignedIn` flips true.
      }
    } catch (error) {
      setFormError(getClerkErrorMessage(error));
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutral.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerClassName="gap-6 px-6 pb-10 pt-4" keyboardShouldPersistTaps="handled">
          <AuthHeader title="Welcome back" subtitle="Log in to keep your streak going" />

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

            <Pressable hitSlop={8} onPress={() => router.push("/forgot-password")} className="self-end">
              <Text className="body-sm text-brand-yellow">Forgot password?</Text>
            </Pressable>
          </View>

          <AuthSubmitButton label="Log In" loading={submitting} onPress={handleSignIn} />

          <AuthDivider />

          <View className="gap-3">
            <SocialAuthButton provider="google" onPress={() => handleSocialAuth("oauth_google")} />
            <SocialAuthButton provider="facebook" onPress={() => handleSocialAuth("oauth_facebook")} />
            <SocialAuthButton provider="apple" onPress={() => handleSocialAuth("oauth_apple")} />
          </View>

          <View className="flex-row justify-center gap-1">
            <Text className="body-md text-text-secondary">Don&apos;t have an account?</Text>
            <Pressable hitSlop={8} onPress={() => router.push("/sign-up")}>
              <Text className="body-md text-brand-yellow">Sign up</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <VerificationCodeModal visible={verifyingDevice} email={email || "your email"} onClose={() => setVerifyingDevice(false)} onComplete={handleVerifyDeviceCode} />
    </SafeAreaView>
  );
}
