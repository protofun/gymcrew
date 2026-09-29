import { FontAwesome, Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Linking, Platform, Pressable, Share, Text, View } from "react-native";
import Animated, { FadeInUp, useAnimatedStyle, useSharedValue, withSpring, ZoomIn } from "react-native-reanimated";
import { usePostHog } from "posthog-react-native";

import { BrandBeamFrame } from "@/components/BrandBeamFrame";
import { OnboardingScreen } from "@/components/OnboardingScreen";
import { PrimaryButton } from "@/components/PrimaryButton";
import AnimatedText from "@/components/ui/organisms/animated-text";
import { PulsingDots } from "@/components/ui/molecules/pulsing-dots";
import { images } from "@/constants/images";
import { type CrewPrivacy, useCrewStore } from "@/store/crew-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { crewProgress } from "@/lib/onboarding-steps";
import { colors, fontFamily, spring } from "@/theme";

/** Maps the wizard's plain-language crew-settings labels (crew-settings.tsx) onto the real
 * CrewPrivacy enum the backend understands. */
function privacyFromWizardChoices(visibility?: string, whoCanJoin?: string): CrewPrivacy {
  if (visibility === "Private") return "invite-only";
  if (whoCanJoin === "Anyone") return "public";
  return "open";
}

function maxMembersFromWizardChoice(label?: string): number {
  const parsed = parseInt(label ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 8;
}

const VISIBLE_SHARE_TARGET_COUNT = 4;

type ShareTarget = {
  key: string;
  label: string;
  tint: string;
  iconColor?: string;
  // Platforms with a real web/app URL scheme for pre-filled text open that
  // directly. Platforms without one (Instagram, Snapchat, TikTok, Discord —
  // none support prefilled-text deep links) fall back to the native share
  // sheet, where those apps still show up as targets if installed.
  getUrl?: (message: string) => string;
} & ({ iconSet: "ionicon"; icon: keyof typeof Ionicons.glyphMap } | {
  iconSet: "fa";
  icon: keyof typeof FontAwesome.glyphMap;
});

const SHARE_TARGETS: ShareTarget[] = [
  {
    key: "whatsapp",
    label: "WhatsApp",
    iconSet: "ionicon",
    icon: "logo-whatsapp",
    tint: "#25D366",
    getUrl: (message) => `https://wa.me/?text=${encodeURIComponent(message)}`,
  },
  { key: "instagram", label: "Instagram", iconSet: "ionicon", icon: "logo-instagram", tint: "#C13584" },
  { key: "snapchat", label: "Snapchat", iconSet: "ionicon", icon: "logo-snapchat", tint: "#FFFC00", iconColor: "#111111" },
  {
    key: "messages",
    label: "Messages",
    iconSet: "ionicon",
    icon: "chatbubble-ellipses",
    tint: "#2979FF",
    getUrl: (message) => `sms:${Platform.OS === "ios" ? "&" : "?"}body=${encodeURIComponent(message)}`,
  },
  {
    key: "facebook",
    label: "Facebook",
    iconSet: "ionicon",
    icon: "logo-facebook",
    tint: "#1877F2",
    getUrl: (message) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(message)}`,
  },
  {
    key: "twitter",
    label: "Twitter",
    iconSet: "ionicon",
    icon: "logo-twitter",
    tint: "#1DA1F2",
    getUrl: (message) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`,
  },
  {
    key: "telegram",
    label: "Telegram",
    iconSet: "fa",
    icon: "telegram",
    tint: "#229ED9",
    getUrl: (message) => `https://t.me/share/url?url=&text=${encodeURIComponent(message)}`,
  },
  { key: "tiktok", label: "TikTok", iconSet: "ionicon", icon: "logo-tiktok", tint: "#111111" },
  { key: "discord", label: "Discord", iconSet: "ionicon", icon: "logo-discord", tint: "#5865F2" },
  {
    key: "email",
    label: "Email",
    iconSet: "ionicon",
    icon: "mail",
    tint: "#EA4335",
    getUrl: (message) => `mailto:?subject=${encodeURIComponent("Join my GymCrew crew!")}&body=${encodeURIComponent(message)}`,
  },
  { key: "more", label: "More", iconSet: "ionicon", icon: "ellipsis-horizontal", tint: "#8B929E" },
];

/** One share app: it pops in after the one before it and dips when pressed. */
function ShareButton({ target, index, onPress }: { target: ShareTarget; index: number; onPress: () => void }) {
  const pressed = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 1 - pressed.value * 0.12 }] }));

  return (
    <Animated.View entering={FadeInUp.delay(index * 60).springify().damping(spring.entranceBouncy.damping).mass(spring.entranceBouncy.mass)} style={style}>
      <Pressable onPress={onPress} onPressIn={() => (pressed.value = withSpring(1, spring.press))} onPressOut={() => (pressed.value = withSpring(0, spring.press))} className="w-[70px] items-center gap-2">
        <View className="h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: target.tint }}>
          {target.iconSet === "ionicon" ? <Ionicons name={target.icon} size={24} color={target.iconColor ?? "#FFFFFF"} /> : <FontAwesome name={target.icon} size={22} color={target.iconColor ?? "#FFFFFF"} />}
        </View>
        <Text className="body-sm text-center text-text-secondary">{target.label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function CrewReadyScreen() {
  const { crewName } = useLocalSearchParams<{ crewName?: string }>();
  const completeCrewSelection = useOnboardingStore((state) => state.completeCrewSelection);
  const createCrew = useCrewStore((state) => state.createCrew);
  const posthog = usePostHog();
  const inviteCode = useCrewStore((state) => state.inviteCode);
  const [creating, setCreating] = useState(true);
  const [createError, setCreateError] = useState<string | null>(null);
  const [showAllTargets, setShowAllTargets] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const crewData = useOnboardingStore.getState().crew;
    createCrew({
      name: crewName ?? crewData.crewName ?? "My Crew",
      icon: crewData.icon,
      trainingType: crewData.trainingType,
      privacy: privacyFromWizardChoices(crewData.visibility, crewData.whoCanJoin),
      maxMembers: maxMembersFromWizardChoice(crewData.maxMembers),
    }).then((result) => {
      setCreating(false);
      if (!result.ok) {
        setCreateError(result.error);
        return;
      }
      posthog.capture("crew_created", { trainingType: crewData.trainingType ?? null });
    });
    // Only ever create once, on mount — re-running this on every render would try to create the
    // same crew again and fail with "already in a crew."
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleContinue() {
    if (creating) return;
    // If creation failed, still let them through — (tabs)/crew.tsx's empty state offers a way to
    // retry setting up a crew rather than trapping them on this screen.
    completeCrewSelection();
    router.replace("/home");
  }

  const visibleTargets = showAllTargets ? SHARE_TARGETS : SHARE_TARGETS.slice(0, VISIBLE_SHARE_TARGET_COUNT);
  const hasMoreTargets = SHARE_TARGETS.length > VISIBLE_SHARE_TARGET_COUNT;
  const shareMessage = `Join my crew on GymCrew! Use invite code ${inviteCode}.`;

  async function handleCopy() {
    await Clipboard.setStringAsync(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleShareFallback() {
    try {
      await Share.share({ message: shareMessage });
    } catch {
      // user dismissed the share sheet — nothing to do
    }
  }

  async function handleSharePress(target: ShareTarget) {
    posthog.capture("crew_invite_shared", { target: target.key });
    if (!target.getUrl) {
      await handleShareFallback();
      return;
    }
    try {
      await Linking.openURL(target.getUrl(shareMessage));
    } catch {
      // app/browser couldn't handle the URL — fall back to the OS share sheet
      await handleShareFallback();
    }
  }

  return (
    <OnboardingScreen
      hideBack
      progress={crewProgress("ready")}
      title="Your Crew is Ready!"
      subtitle="Invite your friends and start your journey together."
      hero={
        <Animated.View entering={ZoomIn.delay(100).springify().damping(spring.press.damping).mass(spring.press.mass)} className="items-center">
          <Image source={images.mascotsCrew} style={{ width: 260, height: 260 * (420 / 520) }} resizeMode="contain" />
        </Animated.View>
      }
      footer={<PrimaryButton label="Continue" loading={creating} onPress={handleContinue} />}
    >
      <BrandBeamFrame borderRadius={24}>
        <View style={{ backgroundColor: colors.neutral.surface }} className="gap-2 p-5">
          <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 12, letterSpacing: 1, color: colors.neutral.textSecondary }}>INVITE CODE</Text>
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1" style={{ minHeight: 52, justifyContent: "center" }}>
              {creating ? (
                <View className="items-start">
                  <PulsingDots color={colors.brand.yellow} radius={4} spacing={16} />
                </View>
              ) : createError ? (
                <Text className="body-sm text-error">Couldn&apos;t create your crew — {createError}</Text>
              ) : (
                <AnimatedText text={inviteCode} animationConfig={{ characterDelay: 45 }} enterFrom={{ translateY: 30, scale: 0.3 }} style={{ fontFamily: fontFamily.heading, fontSize: 48, lineHeight: 52, letterSpacing: 6, color: colors.brand.yellow }} />
              )}
            </View>
            <Pressable
              onPress={handleCopy}
              hitSlop={8}
              disabled={creating || Boolean(createError)}
              className={`h-11 w-11 items-center justify-center rounded-full border ${copied ? "border-brand-yellow" : "border-divider"}`}
            >
              <Ionicons name={copied ? "checkmark" : "copy-outline"} size={18} color={copied ? colors.brand.yellow : colors.neutral.textPrimary} />
            </Pressable>
          </View>
        </View>
      </BrandBeamFrame>

      <View className="gap-3">
        <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 12, letterSpacing: 1, color: colors.neutral.textSecondary }}>SHARE YOUR INVITE LINK</Text>
        <View className="flex-row flex-wrap gap-x-4 gap-y-4">
          {visibleTargets.map((target, index) => (
            <ShareButton key={target.key} target={target} index={index} onPress={() => handleSharePress(target)} />
          ))}
        </View>

        {hasMoreTargets && (
          <Pressable onPress={() => setShowAllTargets((prev) => !prev)} className="flex-row items-center justify-center gap-1 py-2">
            <Text className="body-sm text-text-secondary">{showAllTargets ? "Show less" : "Show more options"}</Text>
            <Ionicons name={showAllTargets ? "chevron-up" : "chevron-down"} size={16} color={colors.neutral.textSecondary} />
          </Pressable>
        )}
      </View>
    </OnboardingScreen>
  );
}
