import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { Easing, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { goBack } from "@/lib/navigation";
import { CrewIconBadge } from "@/components/CrewIconBadge";
import { DivisionBadge } from "@/components/DivisionBadge";
import { EditableText } from "@/components/EditableText";
import { HOME_EYEBROW, HOME_SECTION_TITLE } from "@/components/homeStyle";
import { CircularProgress } from "@/components/ui/organisms/circular-progress";
import SegmentedControl from "@/components/ui/organisms/segmented-control";
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

function ScopeLabel({ scope, selected }: { scope: Scope; selected: boolean }) {
  return (
    <Text className="caption font-body-semibold" style={{ color: selected ? colors.brand.iron : colors.neutral.textSecondary }}>
      {scope.toUpperCase()}
    </Text>
  );
}

/** The Global / Gym / Crews switcher — three equal, fixed segments, exactly the shape Reacticx's
 * `segmented-control` is built for (unlike Crew Overview's 7-tab bar, which needs to scroll — see
 * that screen's own note on why it stays a custom pill row). */
function ScopeSwitcher({ scope, onChange }: { scope: Scope; onChange: (scope: Scope) => void }) {
  const [width, setWidth] = useState(0);
  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} className="mx-4 mt-4">
      {width > 0 && (
        <SegmentedControl
          currentIndex={SCOPES.indexOf(scope)}
          onChange={(index) => onChange(SCOPES[index])}
          width={width}
          borderRadius={22}
          paddingVertical={9}
          segmentedControlBackgroundColor={colors.neutral.surface}
          activeSegmentBackgroundColor={colors.brand.yellow}
          dividerColor="transparent"
          disableScaleEffect
        >
          {SCOPES.map((s) => (
            <ScopeLabel key={s} scope={s} selected={s === scope} />
          ))}
        </SegmentedControl>
      )}
    </View>
  );
}

function EntryAvatar({ avatar, size }: { avatar: Avatar; size: number }) {
  if (avatar.type === "image") {
    return <Image source={{ uri: avatar.uri }} className="bg-divider" style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return <CrewIconBadge iconKey={avatar.iconKey} size={size} />;
}

// A flowing row, not a bordered card — a trophy (top 3) or plain rank number leads, same shape as
// every other ranked list in the app now. The medal color and "you" highlight are enough to pick
// the rows that matter out of the list without boxing them off from the rest.
function LeaderboardRow({ rank, entry, isLast }: { rank: number; entry: Entry; isLast: boolean }) {
  const medal = MEDAL_COLOR[rank - 1];

  return (
    <View className={`flex-row items-center gap-3 py-3 ${isLast ? "" : "border-b border-divider"}`}>
      {medal ? (
        <Ionicons name="trophy" size={18} color={medal} style={{ width: 24 }} />
      ) : (
        <Text className="body-sm text-center font-body-semibold text-text-secondary" style={{ width: 24 }}>
          {rank}
        </Text>
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
      <View className="mx-4 mt-8 items-center gap-2 py-10">
        <Ionicons name="planet-outline" size={26} color={colors.neutral.textSecondary} />
        <Text className="body-sm text-center text-text-secondary">No one has reached this division yet.</Text>
      </View>
    );
  }

  return (
    <View className="px-4">
      {entries.map((entry, index) => (
        <LeaderboardRow key={entry.id} rank={index + 1} entry={entry} isLast={index === entries.length - 1} />
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

  // The "my rank" ring — same `CircularProgress` language every other ranked list in the app now
  // uses (Crew League's own standing ring), here for whichever pool the current scope is showing.
  const activePool = scope === "Crews" ? crewPool : scope === "Global" ? globalPool : gymPool;
  const myRank = activePool.findIndex((entry) => entry.isMe) + 1;
  const myRankPercent = activePool.length > 0 && myRank > 0 ? Math.round(((activePool.length - myRank + 1) / activePool.length) * 100) : 0;
  const myRankProgress = useSharedValue(0);
  useEffect(() => {
    myRankProgress.value = withTiming(myRankPercent, { duration: 800, easing: Easing.out(Easing.cubic) });
  }, [myRankPercent, myRankProgress]);

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

      <View className="mx-4 mt-4 flex-row items-center justify-between gap-3">
        <View className="flex-1 gap-1">
          <Text style={HOME_EYEBROW}>
            {scope === "Crews" ? "Crews rank within their own division — no mismatches." : scope === "Global" ? "Ranked within your division. Climb to earn a bigger stage." : myGymName || "Set your gym in Settings to see gym rankings"}
          </Text>
          <Text style={HOME_SECTION_TITLE}>{scope === "Crews" ? "TOP CREWS" : scope === "Global" ? "WORLD STAGE" : "HOME TURF"}</Text>
        </View>
        {myRank > 0 && (
          <View style={{ width: 56, height: 56 }} className="items-center justify-center">
            <CircularProgress
              progress={myRankProgress}
              size={56}
              strokeWidth={5}
              gap={0}
              outerCircleColor={colors.neutral.divider}
              progressCircleColor={colors.brand.yellow}
              backgroundColor="transparent"
              renderIcon={() => <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 12, color: colors.brand.white }}>{`#${myRank}`}</Text>}
            />
          </View>
        )}
      </View>

      <ScopeSwitcher scope={scope} onChange={setScope} />

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
