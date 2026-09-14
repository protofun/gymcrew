import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { goBack } from "@/lib/navigation";
import { api, type ApiRoadmapItem } from "@/lib/api";
import { colors } from "@/theme";

const STATUS_CONFIG: Record<ApiRoadmapItem["status"], { label: string; color: string }> = {
  planned: { label: "Planned", color: colors.neutral.textSecondary },
  in_progress: { label: "In Progress", color: colors.semantic.warning },
  shipped: { label: "Shipped", color: colors.semantic.success },
};

export default function RoadmapScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<ApiRoadmapItem[] | null>(null);

  useEffect(() => {
    api
      .getRoadmap()
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => goBack("/(tabs)/profile")} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">What&apos;s Coming</Text>
      </View>

      {items === null ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.brand.yellow} />
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="body-md text-center text-text-secondary">Nothing on the roadmap yet — check back soon.</Text>
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
          {items.map((item) => {
            const config = STATUS_CONFIG[item.status];
            return (
              <View key={item.id} className="gap-2 rounded-2xl border border-divider bg-surface p-4">
                <View className="flex-row items-center justify-between">
                  <Text className="body-md font-body-semibold text-text-primary">{item.title}</Text>
                  <View className="flex-row items-center gap-1.5 rounded-full px-2.5 py-1" style={{ backgroundColor: `${config.color}22` }}>
                    <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: config.color }} />
                    <Text className="caption font-body-semibold" style={{ color: config.color }}>
                      {config.label}
                    </Text>
                  </View>
                </View>
                {item.description && <Text className="body-sm text-text-secondary">{item.description}</Text>}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
