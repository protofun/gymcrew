import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";

import { goBack } from "@/lib/navigation";
import { DivisionAvatarFrame } from "@/components/DivisionAvatarFrame";
import { type DuelMetric, DuelChallengeSheet } from "@/components/DuelChallengeSheet";
import { EditableText } from "@/components/EditableText";
import { InviteMembersModal } from "@/components/InviteMembersModal";
import { MemberActionsSheet } from "@/components/MemberActionsSheet";
import { FLEX_TAGS } from "@/data/flex-tags";
import { useTodayWorkout } from "@/hooks/use-today-workout";
import { toDateKey } from "@/lib/date";
import type { Division } from "@/lib/division";
import { useCosmeticsStore } from "@/store/cosmetics-store";
import { CURRENT_MEMBER_ID, useCrewStore, type CrewMember } from "@/store/crew-store";
import { useCrewDuelStore } from "@/store/crew-duel-store";
import { useProfileLevelStore } from "@/store/profile-level-store";
import { colors } from "@/theme";

const FILTERS = ["all", "admin", "online"] as const;
type Filter = (typeof FILTERS)[number];

const FILTER_LABEL: Record<Filter, string> = { all: "All", admin: "Admin", online: "Online" };

const ROLE_LABEL: Record<CrewMember["role"], string | null> = {
  leader: "Leader",
  "co-leader": "Co-Leader",
  member: null,
};

function MemberRow({
  member,
  division,
  flexTagEmoji,
  trainingLabel,
  canManage,
  canChallenge,
  onManage,
  onChallenge,
  onPress,
}: {
  member: CrewMember;
  division: Division;
  flexTagEmoji?: string;
  trainingLabel: string | null;
  canManage: boolean;
  canChallenge: boolean;
  onManage: () => void;
  onChallenge: () => void;
  onPress: () => void;
}) {
  const roleLabel = ROLE_LABEL[member.role];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
      className="flex-row items-center gap-3 rounded-2xl border border-divider bg-surface p-3"
    >
      <View>
        <DivisionAvatarFrame source={{ uri: member.avatarUrl }} division={division} size={44} />
        {member.isOnline && (
          <View
            className="absolute rounded-full border-2 border-surface bg-success"
            style={{ right: -1, bottom: -1, width: 12, height: 12 }}
          />
        )}
      </View>

      <View className="flex-1 gap-0.5">
        <View className="flex-row items-center gap-2">
          <EditableText id={`crew.members.${member.id}.name`} className="body-md font-body-semibold text-text-primary">
            {member.name}
          </EditableText>
          {flexTagEmoji && <Text style={{ fontSize: 13 }}>{flexTagEmoji}</Text>}
          {roleLabel && (
            <View className="rounded-full bg-background px-2 py-0.5">
              <Text className="caption text-text-secondary">{roleLabel}</Text>
            </View>
          )}
        </View>
        <EditableText id={`crew.members.${member.id}.username`} className="caption text-text-secondary">
          {`@${member.username}`}
        </EditableText>
        {trainingLabel ? (
          <View className="mt-0.5 flex-row items-center gap-1">
            <Ionicons name="barbell" size={11} color={colors.brand.yellow} />
            <EditableText id={`crew.members.${member.id}.trainingLabel`} className="caption text-brand-yellow">
              {trainingLabel}
            </EditableText>
          </View>
        ) : (
          <Text className="caption mt-0.5 text-text-secondary">Resting today</Text>
        )}
      </View>

      <EditableText id={`crew.members.${member.id}.level`} className="body-md font-body-bold text-brand-yellow">
        {division.toUpperCase()}
      </EditableText>

      {canChallenge && (
        <Pressable onPress={onChallenge} hitSlop={8} className="pl-1">
          <Ionicons name="flag-outline" size={16} color={colors.brand.yellow} />
        </Pressable>
      )}

      {canManage && (
        <Pressable onPress={onManage} hitSlop={8} className="pl-1">
          <Ionicons name="ellipsis-vertical" size={16} color={colors.neutral.textSecondary} />
        </Pressable>
      )}
    </Pressable>
  );
}

export default function CrewMembersScreen() {
  const insets = useSafeAreaInsets();
  const posthog = usePostHog();
  const members = useCrewStore((state) => state.members);
  const crewName = useCrewStore((state) => state.name);
  const inviteCode = useCrewStore((state) => state.inviteCode);
  const todayPlan = useCrewStore((state) => state.todayPlan);
  const setMemberRole = useCrewStore((state) => state.setMemberRole);
  const toggleMemberAdmin = useCrewStore((state) => state.toggleMemberAdmin);
  const removeMember = useCrewStore((state) => state.removeMember);
  const myWorkout = useTodayWorkout();

  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [managingId, setManagingId] = useState<string | null>(null);
  const [challengingId, setChallengingId] = useState<string | null>(null);

  const myDivision = useProfileLevelStore((state) => state.division);
  const equippedTagId = useCosmeticsStore((state) => state.equippedTagId);
  const equippedFlexTag = FLEX_TAGS.find((tag) => tag.id === equippedTagId);
  const me = members.find((member) => member.id === CURRENT_MEMBER_ID);
  const iAmAdmin = me?.isAdmin ?? false;
  const managingMember = members.find((member) => member.id === managingId) ?? null;
  const challengingMember = members.find((member) => member.id === challengingId) ?? null;
  const proposeDuel = useCrewDuelStore((state) => state.propose);

  async function handleChallenge(metric: DuelMetric) {
    if (!challengingId) return;
    setChallengingId(null);
    const result = await proposeDuel(challengingId, metric, toDateKey(new Date()));
    if (!result.ok) {
      Alert.alert("Couldn't send challenge", result.error);
      return;
    }
    posthog.capture("crew_duel_proposed", { metric });
  }

  function divisionFor(member: CrewMember): Division {
    return member.id === CURRENT_MEMBER_ID ? myDivision : member.division;
  }

  function trainingLabelFor(member: CrewMember): string | null {
    if (member.id === CURRENT_MEMBER_ID) {
      return myWorkout.isRestDay ? null : myWorkout.workoutName;
    }
    return todayPlan.memberIdsTraining.includes(member.id) ? todayPlan.workoutName : null;
  }

  const counts: Record<Filter, number> = {
    all: members.length,
    admin: members.filter((member) => member.isAdmin).length,
    online: members.filter((member) => member.isOnline).length,
  };

  const filteredMembers = members
    .filter((member) => {
      if (filter === "admin") return member.isAdmin;
      if (filter === "online") return member.isOnline;
      return true;
    })
    .filter((member) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return member.name.toLowerCase().includes(q) || member.username.toLowerCase().includes(q);
    });

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => goBack("/(tabs)/crew")} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Crew Members</Text>
      </View>

      <View className="gap-3 px-4 pt-4">
        <View className="flex-row items-center gap-2 rounded-xl border border-divider bg-surface px-3 py-3">
          <Ionicons name="search-outline" size={18} color={colors.neutral.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search members..."
            placeholderTextColor={colors.neutral.textSecondary}
            className="body-md flex-1 text-text-primary"
            style={{ outlineWidth: 0, outlineColor: "transparent" }}
          />
        </View>

        <View className="flex-row gap-2">
          {FILTERS.map((key) => {
            const active = key === filter;
            return (
              <Pressable
                key={key}
                onPress={() => setFilter(key)}
                className={`rounded-full border px-3 py-1.5 ${active ? "border-brand-yellow bg-brand-yellow" : "border-divider bg-surface"}`}
              >
                <Text className={`caption font-body-semibold ${active ? "text-brand-iron" : "text-text-secondary"}`}>
                  {FILTER_LABEL[key]} ({counts[key]})
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: insets.bottom + 16, gap: 10 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {filteredMembers.length === 0 ? (
          <Text className="body-md py-10 text-center text-text-secondary">No members match.</Text>
        ) : (
          filteredMembers.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              division={divisionFor(member)}
              flexTagEmoji={member.id === CURRENT_MEMBER_ID ? equippedFlexTag?.emoji : undefined}
              trainingLabel={trainingLabelFor(member)}
              canManage={iAmAdmin && member.id !== CURRENT_MEMBER_ID && member.role !== "leader"}
              canChallenge={member.id !== CURRENT_MEMBER_ID}
              onManage={() => setManagingId(member.id)}
              onChallenge={() => setChallengingId(member.id)}
              onPress={() => router.push(`/crew/member/${member.id}`)}
            />
          ))
        )}
      </ScrollView>

      <View style={{ paddingBottom: insets.bottom + 16 }} className="border-t border-divider px-4 pt-4">
        <Pressable
          onPress={() => setInviteOpen(true)}
          className="flex-row items-center justify-center gap-2 rounded-full bg-brand-yellow py-4"
        >
          <Ionicons name="person-add-outline" size={18} color={colors.brand.iron} />
          <Text className="body-md font-body-bold text-brand-iron">Invite Members</Text>
        </Pressable>
      </View>

      <InviteMembersModal
        visible={inviteOpen}
        onClose={() => setInviteOpen(false)}
        crewName={crewName}
        inviteCode={inviteCode}
      />

      <MemberActionsSheet
        visible={managingId !== null}
        member={managingMember}
        onClose={() => setManagingId(null)}
        onPromote={() => {
          if (!managingId) return;
          setMemberRole(managingId, "co-leader");
          posthog.capture("crew_member_role_changed", { newRole: "co-leader" });
        }}
        onDemote={() => {
          if (!managingId) return;
          setMemberRole(managingId, "member");
          posthog.capture("crew_member_role_changed", { newRole: "member" });
        }}
        onToggleAdmin={() => {
          if (!managingId) return;
          toggleMemberAdmin(managingId);
          posthog.capture("crew_member_admin_toggled");
        }}
        onRemove={() => {
          if (managingId) {
            removeMember(managingId);
            posthog.capture("crew_member_removed");
          }
          setManagingId(null);
        }}
      />

      <DuelChallengeSheet
        visible={challengingId !== null}
        memberName={challengingMember?.name ?? null}
        onClose={() => setChallengingId(null)}
        onChallenge={handleChallenge}
      />
    </View>
  );
}
