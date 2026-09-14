import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { goBack } from "@/lib/navigation";
import { colors } from "@/theme";

type LegalScreenLayoutProps = {
  title: string;
  lastUpdated: string;
  children: ReactNode;
};

/** Shared chrome for the Terms of Service and Privacy Policy screens — same header pattern as
 * subscription.tsx, just with a scrollable body of plain paragraphs instead of settings rows. */
export function LegalScreenLayout({ title, lastUpdated, children }: LegalScreenLayoutProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => goBack("/(tabs)/profile")} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">{title}</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32, gap: 16 }} showsVerticalScrollIndicator={false}>
        <Text className="body-sm text-text-secondary">Last updated: {lastUpdated}</Text>
        {children}
      </ScrollView>
    </View>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="body-lg font-body-semibold text-text-primary">{title}</Text>
      <Text className="body-md text-text-secondary" style={{ lineHeight: 22 }}>
        {children}
      </Text>
    </View>
  );
}
