import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCrewStore } from "@/store/crew-store";
import { colors } from "@/theme";

const PAID_FEATURES = [
  { icon: "trophy" as const, label: "Compete in the rank system", description: "Not just view it — climb it, gym and worldwide" },
  { icon: "people" as const, label: "Your gym's leaderboard", description: "See where you stand locally, not just globally" },
  { icon: "flag" as const, label: "Crew training", description: "Shared crew score, PR alerts, and today's-plan visibility" },
  { icon: "camera" as const, label: "Progress photo comparison", description: "Aligned before/after overlays over time" },
];

export default function SubscriptionScreen() {
  const insets = useSafeAreaInsets();
  const subscriptionActive = useCrewStore((state) => state.subscriptionActive);
  const crewName = useCrewStore((state) => state.name);

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Subscription</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center gap-3 rounded-2xl border border-divider bg-surface p-4">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-background">
            <Ionicons name="card" size={17} color={subscriptionActive ? colors.semantic.success : colors.neutral.textSecondary} />
          </View>
          <View className="flex-1">
            <Text className="body-md font-body-semibold text-text-primary">{crewName}&apos;s Plan</Text>
            <Text className="body-sm text-text-secondary">
              {subscriptionActive ? "Active — the competitive layer is unlocked for your crew" : "Inactive — logging and personal stats still work"}
            </Text>
          </View>
        </View>

        <Text className="body-sm text-text-secondary">
          GymCrew&apos;s paid tier is billed per crew, split between members — logging, your personal heatmap, and your
          strength graph are always free.
        </Text>

        <View className="gap-2.5">
          {PAID_FEATURES.map((feature) => (
            <View key={feature.label} className="flex-row items-center gap-3 rounded-2xl border border-divider bg-surface p-3.5">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-background">
                <Ionicons name={feature.icon} size={17} color={colors.brand.yellow} />
              </View>
              <View className="flex-1">
                <Text className="body-md font-body-semibold text-text-primary">{feature.label}</Text>
                <Text className="body-sm text-text-secondary">{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <Pressable
          onPress={() => router.push("/crew/settings")}
          className="items-center rounded-full bg-brand-yellow py-4"
        >
          <Text className="body-md font-body-semibold text-brand-iron">Manage in Crew Settings</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
