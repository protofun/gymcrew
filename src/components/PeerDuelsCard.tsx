import { useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { describeResolvedDuel, duelMetricLabel, duelOpponentName } from "@/lib/crew-duel-format";
import { useCrewDuelStore } from "@/store/crew-duel-store";
import { colors } from "@/theme";

/** Peer Duels — a lighter, 1-on-1 "who does more today" challenge between crewmates (proposed from
 * the Challenge button on crew/members.tsx). Renders nothing until there's at least one real duel,
 * same "don't show an empty state for a feature nobody's used yet" idea as CrewFeedList. */
export function PeerDuelsCard() {
  const { user } = useUser();
  const duels = useCrewDuelStore((state) => state.duels);
  const fetchDuels = useCrewDuelStore((state) => state.fetch);
  const respond = useCrewDuelStore((state) => state.respond);

  useEffect(() => {
    fetchDuels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const myDuels = duels.filter((duel) => duel.challengerId === user?.id || duel.opponentId === user?.id).slice(0, 5);
  if (myDuels.length === 0) return null;

  return (
    <Animated.View
      entering={FadeInUp.delay(380).springify().damping(16).mass(0.6)}
      className="mx-4 mt-3 gap-3 rounded-2xl border border-divider bg-surface p-4"
    >
      <View className="flex-row items-center gap-1.5">
        <Ionicons name="flag" size={13} color={colors.brand.yellow} />
        <Text className="caption font-body-semibold text-text-secondary" style={{ letterSpacing: 1 }}>
          PEER DUELS
        </Text>
      </View>

      <View className="gap-3">
        {myDuels.map((duel) =>
          duel.status === "pending" && duel.opponentId === user?.id ? (
            <View key={duel.id} className="gap-2">
              <Text className="body-sm text-text-primary">
                <Text className="font-body-semibold">{duel.challengerName}</Text> challenged you — most {duelMetricLabel(duel)} today
              </Text>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => respond(duel.id, true)}
                  className="flex-1 items-center rounded-full bg-brand-yellow py-2"
                >
                  <Text className="caption font-body-bold text-brand-iron">Accept</Text>
                </Pressable>
                <Pressable
                  onPress={() => respond(duel.id, false)}
                  className="flex-1 items-center rounded-full border border-divider py-2"
                >
                  <Text className="caption font-body-semibold text-text-secondary">Decline</Text>
                </Pressable>
              </View>
            </View>
          ) : duel.status === "pending" ? (
            <Text key={duel.id} className="body-sm text-text-secondary">
              Waiting for {duelOpponentName(duel, user?.id)} to respond — most {duelMetricLabel(duel)} today
            </Text>
          ) : (
            <Text key={duel.id} className="body-sm text-text-secondary">
              {describeResolvedDuel(duel, user?.id)}
            </Text>
          ),
        )}
      </View>
    </Animated.View>
  );
}
