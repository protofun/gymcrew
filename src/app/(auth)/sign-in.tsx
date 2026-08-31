import { useAuth, useSignIn } from "@clerk/expo";
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
import { useWarmUpBrowser } from "@/hooks/use-warm-up-browser";
import { waitForAuthToken } from "@/lib/api";
import { getClerkErrorMessage } from "@/lib/clerk";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors } from "@/theme";

/** After a real sign-in (not sign-up), pulls this account's backend profile — `syncProfileFromServer`
 * itself marks onboarding complete when that profile already has real data, so a returning user
 * isn't dragged through the wizard again just because this device's local storage is fresh. Falls
 * back to the normal "/onboarding" gate if there's no backend data yet. Waits for a real session
 * first (see `waitForAuthToken`) — without it, the sync below can silently no-op ("not signed in")
 * even though sign-in just reported success. */
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
        <Pressable
          onPress={() => setResumeAttempt((n) => n + 1)}
          className="flex-row items-center gap-2 rounded-full bg-brand-yellow px-6 py-3"
        >
          <Text className="body-md font-body-bold text-brand-iron">Try Again</Text>
        </Pressable>
      </SafeAreaView>
    );
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

    if (signIn.status !== "complete") {
      setSubmitting(false);
      setFormError("Additional verification is required for this account.");
      return;
    }

    const { error: finalizeError } = await signIn.finalize();
    if (finalizeError) {
      setSubmitting(false);
      setFormError(getClerkErrorMessage(finalizeError));
      return;
    }

    posthog.capture("user_signed_in", { auth_method: "email" });
    // Not calling resumeAsReturningUser() here — `isSignedIn` flipping true right about now is what
    // triggers the timeout-protected effect above to do that, on the one path that can't get stuck.
    setSubmitting(false);
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
          </View>

          <Pressable
            onPress={handleSignIn}
            disabled={submitting}
            className="flex-row items-center justify-center gap-2 rounded-full bg-brand-yellow py-4"
            style={({ pressed }) => ({ opacity: pressed || submitting ? 0.85 : 1 })}
          >
            <Text className="heading-4 text-brand-iron">{submitting ? "Logging In..." : "Log In"}</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.brand.iron} />
          </Pressable>

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
    </SafeAreaView>
  );
}
