import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { goBack } from "@/lib/navigation";
import { useBlockedUsersStore } from "@/store/blocked-users-store";
import { useCrewStore } from "@/store/crew-store";
import { colors } from "@/theme";

export default function BlockedUsersScreen() {
  const insets = useSafeAreaInsets();
  const blockedUserIds = useBlockedUsersStore((state) => state.blockedUserIds);
  const unblockUser = useBlockedUsersStore((state) => state.unblockUser);
  const members = useCrewStore((state) => state.members);

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => goBack("/(tabs)/profile")} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Blocked Users</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        {blockedUserIds.length === 0 ? (
          <Text className="body-md text-center text-text-secondary" style={{ marginTop: 40 }}>
            You haven&apos;t blocked anyone.
          </Text>
        ) : (
          blockedUserIds.map((id) => {
            const member = members.find((candidate) => candidate.id === id);
            return (
              <View key={id} className="flex-row items-center justify-between rounded-2xl border border-divider bg-surface p-4">
                <Text className="body-md text-text-primary">{member?.name ?? "Unknown member"}</Text>
                <Pressable onPress={() => unblockUser(id)} className="rounded-full border border-divider px-4 py-2">
                  <Text className="body-sm font-body-semibold text-text-primary">Unblock</Text>
                </Pressable>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
