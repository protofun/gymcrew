import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { HomeRowLead } from "@/components/HomeRowLead";
import type { MemberContribution } from "@/lib/challenge-progress";
import { colors, fontFamily } from "@/theme";

const MEDAL_COLOR = ["#FFD700", "#C0C0C0", "#CD7F32"] as const;

type ContributorsListProps = {
  contributors: MemberContribution[];
  unit: string;
  limit?: number;
};

/** A challenge or event's top members — the same flowing-row shape as every other list in Crew (no boxed card per row,
 * same `HomeRowLead` circle every row opens with), rather than the bordered-card-per-row look this used to have. The
 * top 3 get a trophy in their lead circle, same medal colors as before; everyone else gets a plain rank number, the
 * same "flat" treatment CrewWarTab's own top-contributors list already uses. */
export function ContributorsList({ contributors, unit, limit = 5 }: ContributorsListProps) {
  return (
    <View className="gap-3">
      {contributors.slice(0, limit).map((entry, index) => {
        const medal = MEDAL_COLOR[index];
        return (
          <View key={entry.member.id} className="flex-row items-center gap-3">
            <HomeRowLead kind="flat">
              {medal ? (
                <Ionicons name="trophy" size={18} color={medal} />
              ) : (
                <Text style={{ fontFamily: fontFamily.heading, fontSize: 14, color: colors.neutral.textSecondary }}>{index + 1}</Text>
              )}
            </HomeRowLead>
            <Text className="body-sm flex-1 font-body-semibold text-text-primary" numberOfLines={1}>
              {entry.member.name}
            </Text>
            <Text className="body-sm font-body-bold text-brand-yellow">
              {entry.amount.toLocaleString("en-US")} {unit}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
