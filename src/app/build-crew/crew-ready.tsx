import { FontAwesome, Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Image, Linking, Platform, Pressable, SafeAreaView, ScrollView, Share, Text, View } from "react-native";
import Animated, { FadeInDown, FadeInUp, ZoomIn } from "react-native-reanimated";

import { OnboardingFooter } from "@/components/OnboardingFooter";
import { images } from "@/constants/images";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors } from "@/theme";

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

// Best-effort uniqueness without a backend: base the code on the crew name
// (so it's tied to that crew) plus a random suffix. Real guaranteed
// uniqueness needs a server-side check against all existing crew codes,
// which this app doesn't have yet.
function generateInviteCode(crewName: string) {
  const base = crewName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12);
  const suffix = Math.floor(10 + Math.random() * 90);
  return `${base || "GYMCREW"}${suffix}`;
}

export default function CrewReadyScreen() {
  const { crewName } = useLocalSearchParams<{ crewName?: string }>();
  const completeCrewSelection = useOnboardingStore((state) => state.completeCrewSelection);
  const [inviteCode] = useState(() => generateInviteCode(crewName ?? ""));
  const [showAllTargets, setShowAllTargets] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleContinue() {
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutral.background }}>
      <ScrollView className="flex-1" contentContainerClassName="px-6 pb-6 pt-4" showsVerticalScrollIndicator={false}>
        <View className="items-center gap-2">
          <Animated.Text
            entering={FadeInDown.springify().damping(14).mass(0.6)}
            className="font-body-bold text-3xl text-center text-text-primary"
          >
            Your Crew is Ready!
          </Animated.Text>
          <Animated.Text
            entering={FadeInUp.delay(80).springify().damping(14).mass(0.6)}
            className="font-body-medium text-lg text-center text-text-secondary"
          >
            Invite your friends and{"\n"}start your journey together.
          </Animated.Text>
        </View>

        <Animated.View entering={ZoomIn.delay(150).springify().damping(11).mass(0.7)} className="items-center py-4">
          <Image source={images.mascotsCrew} style={{ width: 340, height: 340 * (420 / 520) }} resizeMode="contain" />
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(220).springify().damping(14).mass(0.6)}
          className="gap-2 rounded-2xl border border-brand-yellow bg-surface p-4"
        >
          <Text className="body-sm text-text-secondary">Invite Code</Text>
          <View className="flex-row items-center justify-between">
            <Text className="font-body-bold text-2xl tracking-widest text-brand-yellow">{inviteCode}</Text>
            <Pressable
              onPress={handleCopy}
              hitSlop={8}
              className={`h-10 w-10 items-center justify-center rounded-lg border ${
                copied ? "border-brand-yellow" : "border-divider"
              }`}
            >
              <Ionicons
                name={copied ? "checkmark" : "copy-outline"}
                size={18}
                color={copied ? colors.brand.yellow : colors.neutral.textPrimary}
              />
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(280).springify().damping(14).mass(0.6)} className="mt-6 gap-3">
          <Text className="body-md text-text-primary">Share your invite link</Text>
          <View className="flex-row flex-wrap gap-x-4 gap-y-4">
            {visibleTargets.map((target) => (
              <Pressable key={target.key} onPress={() => handleSharePress(target)} className="w-[70px] items-center gap-2">
                <View
                  className="h-14 w-14 items-center justify-center rounded-full"
                  style={{ backgroundColor: target.tint }}
                >
                  {target.iconSet === "ionicon" ? (
                    <Ionicons name={target.icon} size={24} color={target.iconColor ?? "#FFFFFF"} />
                  ) : (
                    <FontAwesome name={target.icon} size={22} color={target.iconColor ?? "#FFFFFF"} />
                  )}
                </View>
                <Text className="body-sm text-center text-text-secondary">{target.label}</Text>
              </Pressable>
            ))}
          </View>

          {hasMoreTargets && (
            <Pressable
              onPress={() => setShowAllTargets((prev) => !prev)}
              className="flex-row items-center justify-center gap-1 py-2"
            >
              <Text className="body-sm text-text-secondary">{showAllTargets ? "Show less" : "Show more options"}</Text>
              <Ionicons
                name={showAllTargets ? "chevron-up" : "chevron-down"}
                size={16}
                color={colors.neutral.textSecondary}
              />
            </Pressable>
          )}
        </Animated.View>

        <View className="mt-8">
          <OnboardingFooter label="Continue" activeIndex={4} dotCount={5} onPress={handleContinue} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
