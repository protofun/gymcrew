import { KeyboardAvoidingView, Platform, Pressable, SafeAreaView, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { router } from "expo-router";

import { FormField } from "@/components/FormField";
import { OnboardingFooter } from "@/components/OnboardingFooter";
import { OnboardingHeader } from "@/components/OnboardingHeader";
import { colors } from "@/theme";

function CameraIcon() {
  return (
    <View style={{ width: 26, height: 24 }}>
      <View
        style={{
          position: "absolute",
          top: -3,
          left: 6,
          width: 10,
          height: 4,
          borderTopLeftRadius: 3,
          borderTopRightRadius: 3,
          backgroundColor: colors.neutral.textPrimary,
        }}
      />
      <View
        style={{
          marginTop: 4,
          width: 26,
          height: 20,
          borderRadius: 6,
          borderWidth: 2,
          borderColor: colors.neutral.textPrimary,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            borderWidth: 2,
            borderColor: colors.neutral.textPrimary,
          }}
        />
      </View>
    </View>
  );
}

export default function PersonalInfoScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutral.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View className="flex-1 px-6 pb-6 pt-4">
          <OnboardingHeader title="Personal Info" subtitle="Tell us a bit about yourself." />

          <Animated.ScrollView
            entering={FadeInUp.delay(200).springify().damping(14).mass(0.6)}
            className="flex-1"
            contentContainerClassName="flex-grow justify-center gap-6 py-6"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <FormField label="Full Name" placeholder="Enter your name" />
            <FormField label="Username" placeholder="Choose a username" autoCapitalize="none" />
            <FormField
              label="Email"
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <View className="gap-2">
              <Text className="body-md text-text-primary">Profile Picture</Text>
              <Pressable className="h-20 w-20 items-center justify-center self-center rounded-full border border-divider bg-surface">
                <CameraIcon />
              </Pressable>
            </View>
          </Animated.ScrollView>

          <OnboardingFooter
            label="Continue"
            activeIndex={2}
            onPress={() => router.push("/onboarding/your-stats")}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
