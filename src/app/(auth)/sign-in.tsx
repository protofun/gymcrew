import { useAuth, useSignIn } from "@clerk/expo";
import { useSSO } from "@clerk/expo/experimental";
import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import { usePostHog } from "posthog-react-native";

import { AuthDivider } from "@/components/AuthDivider";
import { AuthHeader } from "@/components/AuthHeader";
import { FormField } from "@/components/FormField";
import { SocialAuthButton } from "@/components/SocialAuthButton";
import { useWarmUpBrowser } from "@/hooks/use-warm-up-browser";
import { getClerkErrorMessage } from "@/lib/clerk";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors } from "@/theme";

/** After a real sign-in (not sign-up), pulls this account's backend profile — `syncProfileFromServer`
 * itself marks onboarding complete when that profile already has real data, so a returning user
 * isn't dragged through the wizard again just because this device's local storage is fresh. Falls
 * back to the normal "/onboarding" gate if there's no backend data yet. */
async function resumeAsReturningUser() {
  await useOnboardingStore.getState().syncProfileFromServer();
  router.replace("/");
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

  // Landing here already signed in (e.g. a session from earlier testing that never got cleared) —
  // there's nothing to log in to, so just resume that account instead of showing an empty form.
  useEffect(() => {
    if (authLoaded && isSignedIn) void resumeAsReturningUser();
  }, [authLoaded, isSignedIn]);

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
    await resumeAsReturningUser();
    setSubmitting(false);
  }

  async function handleSocialAuth(strategy: "oauth_google" | "oauth_facebook" | "oauth_apple") {
    setFormError(null);
    try {
      const { createdSessionId } = await startSSOFlow({ strategy });
      if (createdSessionId) {
        const provider = strategy.replace("oauth_", "");
        posthog.capture("user_signed_in", { auth_method: provider });
        await resumeAsReturningUser();
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
            <Link href="/sign-up" asChild>
              <Pressable hitSlop={8}>
                <Text className="body-md text-brand-yellow">Sign up</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
