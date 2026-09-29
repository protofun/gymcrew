import { useAuth } from "@clerk/expo";
import { router } from "expo-router";
import { Image, useWindowDimensions, View } from "react-native";
import Animated, { FadeInUp, ZoomIn } from "react-native-reanimated";

import { OnboardingScreen } from "@/components/OnboardingScreen";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ReceiptCard } from "@/components/ui/pieces/receipt-card";
import { images } from "@/constants/images";
import { useOnboardingStore } from "@/store/onboarding-store";
import { spring } from "@/theme";

/** "build-muscle" → "Build Muscle". */
function readable(key: string | undefined): string {
  if (!key) return "—";
  return key.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function AllSetScreen() {
  const { isSignedIn } = useAuth();
  const { width } = useWindowDimensions();
  const onboarding = useOnboardingStore((state) => state.onboarding);

  // Reaching the wizard while already signed in happens when an existing account has no
  // "completed onboarding" record anywhere yet (fresh browser + a Clerk account from before that
  // flag existed — see lib/clerk.ts). That's not a new account to create: pushing to /sign-up
  // would sign this session out first (see sign-up.tsx's account-isolation guard) and lose it
  // entirely. Just continue as this account instead.
  function handleContinue() {
    if (isSignedIn) {
      router.replace("/");
    } else {
      router.push("/sign-up");
    }
  }

  const rows = [
    { label: "GOAL", value: readable(onboarding.goal) },
    { label: "LEVEL", value: readable(onboarding.experienceLevel) },
    { label: "SPLIT", value: onboarding.trainingSplit ?? "—" },
    { label: "DAYS / WEEK", value: onboarding.workoutsPerWeek ? String(onboarding.workoutsPerWeek) : "—" },
  ];

  return (
    <OnboardingScreen
      hideBack
      centered
      title="You're all set!"
      subtitle="Let's get to work and become unstoppable."
      hero={
        <Animated.View entering={ZoomIn.delay(100).springify().damping(spring.press.damping).mass(spring.press.mass)} className="items-center">
          <Image source={images.mascotSplash} resizeMode="contain" style={{ width: 140, height: 140 * (250 / 261) }} />
        </Animated.View>
      }
      footer={<PrimaryButton label="Start My Journey" onPress={handleContinue} />}
    >
      <Animated.View entering={FadeInUp.delay(500).springify().damping(spring.entrance.damping).mass(spring.entrance.mass)} className="items-center">
        <View>
          <ReceiptCard.Root width={Math.min(width - 48, 340)}>
            <ReceiptCard.Header>
              <ReceiptCard.Store>{`GYMCREW · ${(onboarding.fullName?.trim().split(" ")[0] ?? "ATHLETE").toUpperCase()}`}</ReceiptCard.Store>
              <ReceiptCard.Meta>Your starting point</ReceiptCard.Meta>
            </ReceiptCard.Header>
            <ReceiptCard.Separator />
            <ReceiptCard.Items>
              {rows.map((row) => (
                <ReceiptCard.Item key={row.label} label={row.label} value={row.value} />
              ))}
            </ReceiptCard.Items>
            <ReceiptCard.Separator variant="solid" />
            <ReceiptCard.Total label="STATUS" value="READY TO LIFT" />
            <ReceiptCard.Barcode code={onboarding.username ?? "gymcrew"} />
            <ReceiptCard.TornEdge side="bottom" />
          </ReceiptCard.Root>
        </View>
      </Animated.View>
    </OnboardingScreen>
  );
}
