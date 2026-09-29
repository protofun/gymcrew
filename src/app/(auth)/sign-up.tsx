import { useAuth, useClerk, useSignUp } from "@clerk/expo";
import { useSSO } from "@clerk/expo/experimental";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { usePostHog } from "posthog-react-native";

import { AuthDivider } from "@/components/AuthDivider";
import { AuthField, FormError } from "@/components/AuthField";
import { AuthHero } from "@/components/AuthHero";
import { AuthStatus } from "@/components/AuthStatus";
import { OnboardingScreen } from "@/components/OnboardingScreen";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SocialAuthButton } from "@/components/SocialAuthButton";
import { VerificationCodeModal } from "@/components/VerificationCodeModal";
import { useWarmUpBrowser } from "@/hooks/use-warm-up-browser";
import { waitForAuthToken } from "@/lib/api";
import { getClerkErrorMessage } from "@/lib/clerk";
import { resetLocalStateForAccountSwitch } from "@/lib/reset-local-state";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors } from "@/theme";

const EMAIL_PLACEHOLDERS = ["alex@gmail.com", "you@gym.com", "lifter@crew.fit"];

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
    // Account exists now, but there's no profile data yet — straight into the wizard so it can save
    // each answer to this real account as you go, instead of back through "/" (which would just
    // land here again anyway, since the central gate sends a signed-in-but-not-onboarded account to
    // /onboarding — this skips that redundant hop and its hero screen).
    router.replace("/onboarding/welcome");
  }

  async function handleSocialAuth(strategy: "oauth_google" | "oauth_facebook" | "oauth_apple") {
    setFormError(null);
    try {
      const { createdSessionId } = await startSSOFlow({ strategy });
      if (createdSessionId) {
        const provider = strategy.replace("oauth_", "");
        posthog.capture("user_signed_up", { auth_method: provider });
        await finishAccountSetup();
        router.replace("/onboarding/welcome");
      }
    } catch (error) {
      setFormError(getClerkErrorMessage(error));
    }
  }

  if (!authLoaded || isSignedIn) {
    return <AuthStatus busy message={authLoaded && isSignedIn ? "Signing you out to start a new account…" : undefined} />;
  }

  return (
    <>
      <OnboardingScreen title="Create your account" subtitle="Start your fitness journey today" hero={<AuthHero />}>
        <AuthField label="Email" placeholders={EMAIL_PLACEHOLDERS} keyboardType="email-address" autoCapitalize="none" autoComplete="email" value={email} onChangeText={setEmail} />
        <AuthField
          label="Password"
          placeholders={["Choose a password"]}
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          right={
            <Pressable onPress={() => setShowPassword((prev) => !prev)} hitSlop={8} accessibilityLabel={showPassword ? "Hide password" : "Show password"}>
              <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={colors.brand.yellow} />
            </Pressable>
          }
        />
        <FormError message={formError} />

        <PrimaryButton label="Sign Up" loading={submitting} onPress={handleSignUp} />

        <Text className="body-sm text-center text-text-secondary">
          By signing up, you agree to our{" "}
          <Text className="text-brand-yellow" onPress={() => router.push("/legal/terms")}>
            Terms of Service
          </Text>{" "}
          and{" "}
          <Text className="text-brand-yellow" onPress={() => router.push("/legal/privacy")}>
            Privacy Policy
          </Text>
          .
        </Text>

        {/* Anchor for Clerk's bot-protection widget on web; skipped automatically on iOS/Android. */}
        <View nativeID="clerk-captcha" />

        <AuthDivider />

        <View className="flex-row justify-center gap-5">
          <SocialAuthButton index={0} provider="google" onPress={() => handleSocialAuth("oauth_google")} />
          <SocialAuthButton index={1} provider="facebook" onPress={() => handleSocialAuth("oauth_facebook")} />
          <SocialAuthButton index={2} provider="apple" onPress={() => handleSocialAuth("oauth_apple")} />
        </View>

        <View className="flex-row justify-center gap-1">
          <Text className="body-md text-text-secondary">Already have an account?</Text>
          <Pressable hitSlop={8} onPress={() => router.push("/sign-in")}>
            <Text className="body-md text-brand-yellow">Log in</Text>
          </Pressable>
        </View>
      </OnboardingScreen>

      <VerificationCodeModal visible={verifying} email={email || "your email"} onClose={() => setVerifying(false)} onComplete={handleVerify} />
    </>
  );
}
