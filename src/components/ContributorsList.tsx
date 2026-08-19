import { Ionicons } from "@expo/vector-icons";
import { Image, Text, View } from "react-native";

import type { MemberContribution } from "@/lib/challenge-progress";

const MEDAL_COLOR = ["#FFD700", "#C0C0C0", "#CD7F32"] as const;

type ContributorsListProps = {
  contributors: MemberContribution[];
  unit: string;
  limit?: number;
};

export function ContributorsList({ contributors, unit, limit = 5 }: ContributorsListProps) {
  return (
    <View className="gap-2.5">
      {contributors.slice(0, limit).map((entry, index) => {
        const medal = MEDAL_COLOR[index];
        return (
          <View
            key={entry.member.id}
            className={`flex-row items-center gap-3 rounded-2xl border p-3 ${medal ? "border-brand-yellow/30 bg-brand-yellow/5" : "border-divider bg-surface"}`}
          >
            {medal ? (
              <Ionicons name="trophy" size={18} color={medal} style={{ width: 20 }} />
            ) : (
              <Text className="body-sm w-5 text-center font-body-semibold text-text-secondary">{index + 1}</Text>
            )}
            <View style={{ borderWidth: medal ? 2 : 0, borderColor: medal, borderRadius: 999 }}>
              <Image source={{ uri: entry.member.avatarUrl }} className="rounded-full bg-divider" style={{ width: 32, height: 32 }} />
            </View>
            <Text className="body-sm flex-1 font-body-semibold text-text-primary">{entry.member.name}</Text>
            <Text className="body-sm font-body-bold text-brand-yellow">
              {entry.amount.toLocaleString("en-US")} {unit}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
