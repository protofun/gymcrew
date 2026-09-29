import { router } from "expo-router";
import { useState } from "react";
import { Image } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";
import { usePostHog } from "posthog-react-native";

import { AuthField } from "@/components/AuthField";
import { OnboardingScreen } from "@/components/OnboardingScreen";
import { PrimaryButton } from "@/components/PrimaryButton";
import { images } from "@/constants/images";
import { api, isApiConfigured } from "@/lib/api";
import { onboardingProgress } from "@/lib/onboarding-steps";
import { useOnboardingStore } from "@/store/onboarding-store";
import { spring } from "@/theme";

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

export default function PersonalInfoScreen() {
  const setOnboardingData = useOnboardingStore((state) => state.setOnboardingData);
  // Prefills a name/username already known from elsewhere (e.g. a Founding Athlete account linked
  // from gymcrew.site, see backend/routes/profile.php's maybeLinkFoundingAthlete) instead of making
  // someone retype what the backend already synced into the store — see syncProfileFromServer.
  const savedFullName = useOnboardingStore((state) => state.onboarding.fullName);
  const savedUsername = useOnboardingStore((state) => state.onboarding.username);
  const posthog = usePostHog();
  const [fullName, setFullName] = useState(savedFullName ?? "");
  const [username, setUsername] = useState(savedUsername ?? "");
  const [errors, setErrors] = useState<{ fullName?: string; username?: string }>({});
  const [checkingUsername, setCheckingUsername] = useState(false);

  async function handleContinue() {
    const trimmedName = fullName.trim();
    const trimmedUsername = username.trim().toLowerCase();

    const nextErrors: typeof errors = {};
    if (!trimmedName) nextErrors.fullName = "Enter your full name.";
    if (!trimmedUsername) nextErrors.username = "Choose a username.";
    else if (!USERNAME_REGEX.test(trimmedUsername)) {
      nextErrors.username = "3-20 characters: lowercase letters, numbers, and underscores only.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    // Checked here (not just on the final PUT /profile once an account exists) because the wizard
    // otherwise wouldn't tell you your username's taken until well after you've signed up — see
    // backend/routes/profile.php's handleUsernameAvailability for why this is a public endpoint.
    if (isApiConfigured) {
      setCheckingUsername(true);
      try {
        const { available } = await api.checkUsernameAvailable(trimmedUsername);
        if (!available) {
          setCheckingUsername(false);
          setErrors({ username: "That username is already taken." });
          return;
        }
      } catch {
        // Availability check unreachable — don't block onboarding on it; the real PUT /profile
        // enforcement once an account exists is the actual source of truth either way.
      }
      setCheckingUsername(false);
    }

    setErrors({});
    setOnboardingData({ fullName: trimmedName, username: trimmedUsername });
    posthog.capture("onboarding_personal_info_completed");
    router.push("/onboarding/your-stats");
  }

  return (
    <OnboardingScreen
      progress={onboardingProgress("personal-info")}
      title="Personal Info"
      subtitle="Tell us a bit about yourself."
      hero={
        <Animated.View entering={ZoomIn.springify().damping(spring.press.damping).mass(spring.press.mass)} className="items-start">
          <Image source={images.iconGorilla} resizeMode="cover" style={{ width: 84, height: 84, borderRadius: 42 }} />
        </Animated.View>
      }
      footer={<PrimaryButton label="Continue" loading={checkingUsername} onPress={handleContinue} />}
    >
      <AuthField
        label="Full Name"
        placeholders={["Alex Johnson", "Sam Rivera", "Your name"]}
        autoComplete="name"
        value={fullName}
        error={errors.fullName}
        onChangeText={(text) => {
          setFullName(text);
          setErrors((prev) => ({ ...prev, fullName: undefined }));
        }}
      />
      <AuthField
        label="Username"
        placeholders={["ironalex", "liftqueen_22", "pick a username"]}
        autoCapitalize="none"
        autoCorrect={false}
        value={username}
        error={errors.username}
        onChangeText={(text) => {
          setUsername(text.toLowerCase());
          setErrors((prev) => ({ ...prev, username: undefined }));
        }}
      />
    </OnboardingScreen>
  );
}
