import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CrewIconBadge } from "@/components/CrewIconBadge";
import { DivisionBadge } from "@/components/DivisionBadge";
import { OTHER_CREWS_POWER } from "@/data/crew-leaderboard";
import { MY_GYM_NAME, PLAYER_LEADERBOARD, type LeaderboardPlayer } from "@/data/player-leaderboard";
import { DIVISION_COLOR, divisionForCrewPower, divisionForPlayerPower, type Division } from "@/lib/division";
import { useCrewStore } from "@/store/crew-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors, fontFamily } from "@/theme";

const SCOPES = ["Global", "Gym", "Crews"] as const;
type Scope = (typeof SCOPES)[number];

const MEDAL_COLOR = ["#FFD700", "#C0C0C0", "#CD7F32"] as const;

type Avatar =
  | { type: "image"; uri: string }
  | { type: "icon"; name: keyof typeof Ionicons.glyphMap; tint: string }
  | { type: "crewIcon"; iconKey: string };

type Entry = { id: string; name: string; score: number; avatar: Avatar; isMe: boolean };

// Inline-only: NativeWind doesn't reliably compile `transform`/`font-style` onto native when
// combined with a sibling className (see TopBar's wordmarkStyle for the same constraint).
const headerStyle = {
  fontFamily: fontFamily.heading,
  fontSize: 28,
  lineHeight: 30,
  fontStyle: "italic" as const,
  transform: [{ skewX: "-8deg" }],
};

function EntryAvatar({ avatar, size }: { avatar: Avatar; size: number }) {
  if (avatar.type === "image") {
    return <Image source={{ uri: avatar.uri }} className="bg-divider" style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  if (avatar.type === "crewIcon") {
    return <CrewIconBadge iconKey={avatar.iconKey} size={size} />;
  }
  return (
    <View
      className="items-center justify-center"
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: `${avatar.tint}26` }}
    >
      <Ionicons name={avatar.name} size={size * 0.5} color={avatar.tint} />
    </View>
  );
}

// Matches ContributorsList's row styling (trophy medal for the top 3, yellow-tinted highlight card)
// so the leaderboard reads as one family with the Challenges/Stats tabs, not a one-off design.
function LeaderboardRow({ rank, entry }: { rank: number; entry: Entry }) {
  const medal = MEDAL_COLOR[rank - 1];
  const highlighted = Boolean(medal) || entry.isMe;

  return (
    <View
      className={`flex-row items-center gap-3 rounded-2xl border p-3 ${
        highlighted ? "border-brand-yellow/30 bg-brand-yellow/5" : "border-divider bg-surface"
      }`}
    >
      {medal ? (
        <Ionicons name="trophy" size={18} color={medal} style={{ width: 20 }} />
      ) : (
        <Text className="body-sm w-5 text-center font-body-semibold text-text-secondary">{rank}</Text>
      )}

      <View style={{ borderWidth: medal ? 2 : 0, borderColor: medal, borderRadius: 999 }}>
        <EntryAvatar avatar={entry.avatar} size={36} />
      </View>

      <Text className={`body-sm flex-1 font-body-semibold ${entry.isMe ? "text-brand-yellow" : "text-text-primary"}`} numberOfLines={1}>
        {entry.isMe ? "You" : entry.name}
      </Text>

      <Text className="body-sm font-body-bold text-brand-yellow">{entry.score.toLocaleString("en-US")}</Text>
    </View>
  );
}

function DivisionLabel({ division }: { division: Division }) {
  return (
    <View className="mx-4 mt-4 flex-row items-center gap-1.5">
      <DivisionBadge division={division} size={16} />
      <Text className="caption font-body-bold" style={{ color: DIVISION_COLOR[division] }}>
        {division.toUpperCase()} DIVISION
      </Text>
    </View>
  );
}

function LeaderboardList({ entries }: { entries: Entry[] }) {
  if (entries.length === 0) {
    return (
      <View className="mx-4 mt-8 items-center gap-2 rounded-2xl border border-dashed border-divider px-6 py-10">
        <Ionicons name="planet-outline" size={26} color={colors.neutral.textSecondary} />
        <Text className="body-sm text-center text-text-secondary">No one has reached this division yet.</Text>
      </View>
    );
  }

  return (
    <View className="gap-2.5 px-4">
      {entries.map((entry, index) => (
        <LeaderboardRow key={entry.id} rank={index + 1} entry={entry} />
      ))}
    </View>
  );
}

export default function CrewLeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const [scope, setScope] = useState<Scope>("Crews");
  const myCrewName = useCrewStore((state) => state.name);
  const myCrewPower = useCrewStore((state) => state.crewPower);
  const myCrewDivision = useCrewStore((state) => state.division);
  const myCrewIcon = useCrewStore((state) => state.icon);
  const fullName = useOnboardingStore((state) => state.onboarding.fullName);
  const myName = fullName?.trim().split(" ")[0] || "You";

  const me: LeaderboardPlayer = {
    id: "me",
    name: myName,
    avatarUrl: "https://picsum.photos/seed/gymcrew-me/128",
    rankTier: "champion",
    power: 7200,
    gymName: MY_GYM_NAME,
  };
  const myGlobalDivision = divisionForPlayerPower(me.power);

  // My crew's division is tracked for real via challenge XP (crew-store); the mock rival crews have
  // no simulated XP history, so their division is approximated straight from their power score.
  // Crews and players only ever see their own division — no cross-division comparisons.
  const crewPool: Entry[] = [
    ...OTHER_CREWS_POWER.filter((crew) => divisionForCrewPower(crew.power) === myCrewDivision).map((crew) => ({
      id: crew.name,
      name: crew.name,
      score: crew.power,
      avatar: { type: "icon" as const, name: crew.icon, tint: crew.tint },
      isMe: false,
    })),
    {
      id: "me-crew",
      name: myCrewName,
      score: myCrewPower,
      avatar: { type: "crewIcon" as const, iconKey: myCrewIcon },
      isMe: true,
    },
  ].sort((a, b) => b.score - a.score);

  const globalPool: Entry[] = [...PLAYER_LEADERBOARD, me]
    .filter((player) => divisionForPlayerPower(player.power) === myGlobalDivision)
    .map((player) => ({
      id: player.id,
      name: player.name,
      score: player.power,
      avatar: { type: "image" as const, uri: player.avatarUrl },
      isMe: player.id === "me",
    }))
    .sort((a, b) => b.score - a.score);

  const gymPool: Entry[] = [...PLAYER_LEADERBOARD.filter((player) => player.gymName === MY_GYM_NAME), me]
    .map((player) => ({
      id: player.id,
      name: player.name,
      score: player.power,
      avatar: { type: "image" as const, uri: player.avatarUrl },
      isMe: player.id === "me",
    }))
    .sort((a, b) => b.score - a.score);

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Leaderboard</Text>
      </View>

      <View className="mx-4 mt-4 gap-1">
        <Text style={headerStyle} className="text-brand-white">
          {scope === "Crews" ? "TOP CREWS" : scope === "Global" ? "WORLD STAGE" : "HOME TURF"}
        </Text>
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="stats-chart" size={13} color={colors.brand.yellow} />
          <Text className="caption font-body-semibold text-text-secondary">
            {scope === "Crews" && "Crews rank within their own division — no mismatches."}
            {scope === "Global" && "Ranked within your division. Climb to earn a bigger stage."}
            {scope === "Gym" && MY_GYM_NAME}
          </Text>
        </View>
      </View>

      <View className="mx-4 mt-4 flex-row rounded-full border border-divider bg-surface p-1">
        {SCOPES.map((s) => {
          const active = s === scope;
          return (
            <Pressable
              key={s}
              onPress={() => setScope(s)}
              className={`flex-1 items-center rounded-full py-2 ${active ? "bg-brand-yellow" : ""}`}
            >
              <Text className={`caption font-body-semibold ${active ? "text-brand-iron" : "text-text-secondary"}`}>
                {s.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {scope === "Crews" && <DivisionLabel division={myCrewDivision} />}
      {scope === "Global" && <DivisionLabel division={myGlobalDivision} />}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: 12, paddingBottom: insets.bottom + 24, gap: 10 }}
        showsVerticalScrollIndicator={false}
      >
        {scope === "Crews" && <LeaderboardList entries={crewPool} />}
        {scope === "Global" && <LeaderboardList entries={globalPool} />}
        {scope === "Gym" && <LeaderboardList entries={gymPool} />}
      </ScrollView>
    </View>
  );
}
