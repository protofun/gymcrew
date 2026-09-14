import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { goBack } from "@/lib/navigation";
import { CrewIconBadge } from "@/components/CrewIconBadge";
import { DivisionBadge } from "@/components/DivisionBadge";
import { EditableText } from "@/components/EditableText";
import { api, isApiConfigured, type ApiCrewLeaderboardEntry, type ApiPlayerLeaderboardEntry } from "@/lib/api";
import { DIVISION_COLOR, type Division } from "@/lib/division";
import { useCrewStore } from "@/store/crew-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors, fontFamily } from "@/theme";

const SCOPES = ["Global", "Gym", "Crews"] as const;
type Scope = (typeof SCOPES)[number];

const MEDAL_COLOR = ["#FFD700", "#C0C0C0", "#CD7F32"] as const;

type Avatar = { type: "image"; uri: string } | { type: "crewIcon"; iconKey: string };

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
  return <CrewIconBadge iconKey={avatar.iconKey} size={size} />;
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

      <EditableText
        id={`crew.leaderboard.${entry.id}.name`}
        className={`body-sm flex-1 font-body-semibold ${entry.isMe ? "text-brand-yellow" : "text-text-primary"}`}
        numberOfLines={1}
      >
        {entry.isMe ? "You" : entry.name}
      </EditableText>

      <EditableText id={`crew.leaderboard.${entry.id}.score`} className="body-sm font-body-bold text-brand-yellow">
        {entry.score.toLocaleString("en-US")}
      </EditableText>
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

function playerEntry(player: ApiPlayerLeaderboardEntry): Entry {
  return { id: player.id, name: player.name, score: player.power, avatar: { type: "image", uri: player.avatarUrl }, isMe: player.isMe };
}

function crewEntry(crew: ApiCrewLeaderboardEntry, myCrewId: string): Entry {
  return { id: crew.id, name: crew.name, score: crew.xp, avatar: { type: "crewIcon", iconKey: crew.icon }, isMe: crew.id === myCrewId };
}

export default function CrewLeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const [scope, setScope] = useState<Scope>("Crews");
  const myCrewId = useCrewStore((state) => state.id);
  const myGymName = useOnboardingStore((state) => state.onboarding.gymName)?.trim() || null;

  // Real data — see backend/routes/crews.php's respondWithCrewLeaderboard and
  // backend/routes/leaderboards.php. Replaces the old static `OTHER_CREWS_POWER`/`PLAYER_LEADERBOARD`
  // mocks (including a hardcoded stand-in for "you"). Fetched once for all three scopes rather than
  // per tab switch — three light queries, no loading flash when flipping tabs.
  const [crewsData, setCrewsData] = useState<{ crews: ApiCrewLeaderboardEntry[]; myDivision: string | null }>({ crews: [], myDivision: null });
  const [globalData, setGlobalData] = useState<{ players: ApiPlayerLeaderboardEntry[]; myDivision: string | null }>({ players: [], myDivision: null });
  const [gymData, setGymData] = useState<{ players: ApiPlayerLeaderboardEntry[]; myDivision: string | null }>({ players: [], myDivision: null });

  useEffect(() => {
    if (!isApiConfigured) return;
    api.getCrewLeaderboard().then(setCrewsData).catch((error) => console.warn("Failed to load crew leaderboard", error));
    api.getPlayerLeaderboard("global").then(setGlobalData).catch((error) => console.warn("Failed to load global leaderboard", error));
    api.getPlayerLeaderboard("gym").then(setGymData).catch((error) => console.warn("Failed to load gym leaderboard", error));
  }, []);

  const crewPool: Entry[] = crewsData.crews.map((crew) => crewEntry(crew, myCrewId));
  const globalPool: Entry[] = globalData.players.map(playerEntry);
  const gymPool: Entry[] = gymData.players.map(playerEntry);

  const myCrewDivision = (crewsData.myDivision ?? "Rookie") as Division;
  const myGlobalDivision = (globalData.myDivision ?? "Rookie") as Division;

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => goBack("/(tabs)/crew")} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Leaderboard</Text>
        <Pressable onPress={() => router.push("/crew/all-divisions")} hitSlop={8} style={{ position: "absolute", right: 16 }}>
          <Ionicons name="information-circle-outline" size={24} color={colors.neutral.textSecondary} />
        </Pressable>
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
            {scope === "Gym" && (myGymName || "Set your gym in Settings to see gym rankings")}
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
