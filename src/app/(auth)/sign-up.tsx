import { useSignUp } from "@clerk/expo";
import { useSSO } from "@clerk/expo/experimental";
import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";

import { AuthDivider } from "@/components/AuthDivider";
import { AuthHeader } from "@/components/AuthHeader";
import { FormField } from "@/components/FormField";
import { SocialAuthButton } from "@/components/SocialAuthButton";
import { VerificationCodeModal } from "@/components/VerificationCodeModal";
import { getClerkErrorMessage } from "@/lib/clerk";
import { colors } from "@/theme";

export default function SignUpScreen() {
  const { signUp } = useSignUp();
  const { startSSOFlow } = useSSO();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);

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

    router.replace("/build-crew");
  }

  async function handleSocialAuth(strategy: "oauth_google" | "oauth_facebook" | "oauth_apple") {
    setFormError(null);
    try {
      const { createdSessionId } = await startSSOFlow({ strategy });
      if (createdSessionId) {
        router.replace("/build-crew");
      }
    } catch (error) {
      setFormError(getClerkErrorMessage(error));
    }
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
            <Link href="/sign-in" asChild>
              <Pressable hitSlop={8}>
                <Text className="body-md text-brand-yellow">Log in</Text>
              </Pressable>
            </Link>
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
