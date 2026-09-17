import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect } from "react";
import { Text, View } from "react-native";

import { Card } from "@/components/Card";
import { CrewIconBadge } from "@/components/CrewIconBadge";
import { useCountdown } from "@/hooks/use-countdown";
import { useCrewStore } from "@/store/crew-store";
import { useCrewWarStore } from "@/store/crew-war-store";
import { colors, fontFamily } from "@/theme";

function formatCountdown(remainingSeconds: number): string {
  if (remainingSeconds <= 0) return "Ending…";
  const days = Math.floor(remainingSeconds / 86400);
  const hours = Math.floor((remainingSeconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h left`;
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${Math.max(1, minutes)}m left`;
}

/** One named rival kept visible outside the War tab, so "who are we fighting and how's it going"
 * doesn't require navigating anywhere — reuses whatever crew-war-store already has (it's fetched
 * here too, since Home can load before the Crew tab ever has). Renders nothing without a crew or
 * an active War. */
export function CrewWarWidget() {
  const memberCount = useCrewStore((state) => state.members.length);
  const crewIcon = useCrewStore((state) => state.icon);
  const war = useCrewWarStore((state) => state.war);
  const refresh = useCrewWarStore((state) => state.refresh);

  useEffect(() => {
    if (memberCount > 0) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberCount]);

  const remainingSeconds = useCountdown(war?.status === "active" ? war.endsAt : null);

  if (memberCount === 0 || !war || war.status !== "active") return null;

  const leading = war.myScore >= war.opponentScore;

  return (
    <Card
      onPress={() => router.push("/crew")}
      cornerRadius="medium"
      className="mx-4 mt-6 flex-row items-center gap-3 px-4 py-3.5"
    >
      <View className="flex-row items-center" style={{ width: 52 }}>
        <CrewIconBadge iconKey={crewIcon} size={32} />
        <View style={{ marginLeft: -10 }} className="items-center justify-center rounded-full border-2 border-surface">
          <CrewIconBadge iconKey={war.opponent.icon} size={32} />
        </View>
      </View>

      <View className="flex-1 gap-0.5">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="flame" size={11} color={colors.semantic.streak} />
          <Text className="caption font-body-semibold text-text-secondary">CREW WAR VS {war.opponent.name.toUpperCase()}</Text>
        </View>
        <Text className="body-md font-body-semibold text-text-primary" numberOfLines={1}>
          {leading ? "Leading" : "Trailing"} {Math.round(war.myScore).toLocaleString("en-US")} - {Math.round(war.opponentScore).toLocaleString("en-US")}
        </Text>
      </View>

      <View className="items-end gap-0.5">
        <Text style={{ fontFamily: fontFamily.heading, fontSize: 13 }} className={leading ? "text-success" : "text-error"}>
          {leading ? "AHEAD" : "BEHIND"}
        </Text>
        <Text className="caption text-text-secondary">{formatCountdown(remainingSeconds)}</Text>
      </View>
    </Card>
  );
}
