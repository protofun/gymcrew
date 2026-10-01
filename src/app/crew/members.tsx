import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Easing, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";

import { goBack } from "@/lib/navigation";
import { DivisionAvatarFrame } from "@/components/DivisionAvatarFrame";
import { type DuelMetric, DuelChallengeSheet } from "@/components/DuelChallengeSheet";
import { EditableText } from "@/components/EditableText";
import { HOME_ROW_DETAIL } from "@/components/homeStyle";
import { InviteMembersModal } from "@/components/InviteMembersModal";
import { ContextMenu } from "@/components/ui/molecules/context-menu";
import { CircularProgress } from "@/components/ui/organisms/circular-progress";
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

function MemberRowContent({
  member,
  division,
  flexTagEmoji,
  trainingLabel,
  canChallenge,
  canManage,
  onChallenge,
  isLast,
}: {
  member: CrewMember;
  division: Division;
  flexTagEmoji?: string;
  trainingLabel: string | null;
  canChallenge: boolean;
  canManage: boolean;
  onChallenge: () => void;
  isLast: boolean;
}) {
  const roleLabel = ROLE_LABEL[member.role];

  // A plain View, not a Pressable — the tap (and, for canManage rows, the long-press) live on the
  // ONE Pressable wrapping this in `MemberRow`, not a second one nested in here (see the GymCrew
  // patch note on `ContextMenu.Trigger`'s `onPress` for why that doubles up).
  return (
    <View className={`flex-row items-center gap-3 py-3.5 ${isLast ? "" : "border-b border-divider"}`}>
      <View>
        <DivisionAvatarFrame source={{ uri: member.avatarUrl }} division={division} size={44} />
        {member.isOnline && (
          <View
            className="absolute rounded-full border-2 border-background bg-success"
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
            <View className="rounded-full bg-surface px-2 py-0.5">
              <Text style={HOME_ROW_DETAIL}>{roleLabel}</Text>
            </View>
          )}
        </View>
        <EditableText id={`crew.members.${member.id}.username`} style={HOME_ROW_DETAIL}>
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
          <Text style={[HOME_ROW_DETAIL, { marginTop: 2 }]}>Resting today</Text>
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

      {/* Not a separate button — canManage rows open their actions with a long-press anywhere on the
          row (Reacticx `context-menu`, the same gesture Files/Photos use); this dot is just the hint. */}
      {canManage && <Ionicons name="ellipsis-vertical" size={16} color={colors.neutral.textSecondary} style={{ opacity: 0.5 }} />}
    </View>
  );
}

function MemberRow({
  member,
  division,
  flexTagEmoji,
  trainingLabel,
  canManage,
  canChallenge,
  onPromote,
  onDemote,
  onToggleAdmin,
  onRemove,
  onChallenge,
  onPress,
  isLast,
}: {
  member: CrewMember;
  division: Division;
  flexTagEmoji?: string;
  trainingLabel: string | null;
  canManage: boolean;
  canChallenge: boolean;
  onPromote: () => void;
  onDemote: () => void;
  onToggleAdmin: () => void;
  onRemove: () => void;
  onChallenge: () => void;
  onPress: () => void;
  isLast: boolean;
}) {
  const content = (
    <MemberRowContent
      member={member}
      division={division}
      flexTagEmoji={flexTagEmoji}
      trainingLabel={trainingLabel}
      canChallenge={canChallenge}
      canManage={canManage}
      onChallenge={onChallenge}
      isLast={isLast}
    />
  );

  if (!canManage) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
        {content}
      </Pressable>
    );
  }

  return (
    <ContextMenu theme="dark">
      <ContextMenu.Trigger onPress={onPress}>{content}</ContextMenu.Trigger>
      <ContextMenu.Content>
        {member.role === "member" && (
          <ContextMenu.Item onPress={onPromote}>
            <ContextMenu.Item.Icon>
              <Ionicons name="arrow-up-circle-outline" size={20} color={colors.brand.white} />
            </ContextMenu.Item.Icon>
            <ContextMenu.Item.Label>Promote to Co-Leader</ContextMenu.Item.Label>
          </ContextMenu.Item>
        )}
        {member.role === "co-leader" && (
          <ContextMenu.Item onPress={onDemote}>
            <ContextMenu.Item.Icon>
              <Ionicons name="arrow-down-circle-outline" size={20} color={colors.brand.white} />
            </ContextMenu.Item.Icon>
            <ContextMenu.Item.Label>Demote to Member</ContextMenu.Item.Label>
          </ContextMenu.Item>
        )}
        <ContextMenu.Item onPress={onToggleAdmin}>
          <ContextMenu.Item.Icon>
            <Ionicons name={member.isAdmin ? "shield-outline" : "shield-checkmark-outline"} size={20} color={colors.brand.white} />
          </ContextMenu.Item.Icon>
          <ContextMenu.Item.Label>{member.isAdmin ? "Remove Admin" : "Make Admin"}</ContextMenu.Item.Label>
        </ContextMenu.Item>
        <ContextMenu.Separator />
        <ContextMenu.Item destructive onPress={onRemove}>
          <ContextMenu.Item.Icon>
            <Ionicons name="exit-outline" size={20} color={colors.semantic.error} />
          </ContextMenu.Item.Icon>
          <ContextMenu.Item.Label>Remove from Crew</ContextMenu.Item.Label>
        </ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu>
  );
}

export default function CrewMembersScreen() {
  const insets = useSafeAreaInsets();
  const posthog = usePostHog();
  const members = useCrewStore((state) => state.members);
  const maxMembers = useCrewStore((state) => state.maxMembers);
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
  const [challengingId, setChallengingId] = useState<string | null>(null);

  const myDivision = useProfileLevelStore((state) => state.division);
  const equippedTagId = useCosmeticsStore((state) => state.equippedTagId);
  const equippedFlexTag = FLEX_TAGS.find((tag) => tag.id === equippedTagId);
  const me = members.find((member) => member.id === CURRENT_MEMBER_ID);
  const iAmAdmin = me?.isAdmin ?? false;
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

  // The capacity ring — same `CircularProgress` language every other tab/screen this pass has
  // added, here showing how full the crew's real roster (vs. `maxMembers`) is.
  const capacityPercent = maxMembers > 0 ? Math.round((members.length / maxMembers) * 100) : 0;
  const capacityProgress = useSharedValue(0);
  useEffect(() => {
    capacityProgress.value = withTiming(capacityPercent, { duration: 800, easing: Easing.out(Easing.cubic) });
  }, [capacityPercent, capacityProgress]);

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

      <View className="flex-row items-center gap-4 px-4 pt-4">
        <View style={{ width: 56, height: 56 }} className="items-center justify-center">
          <CircularProgress
            progress={capacityProgress}
            size={56}
            strokeWidth={5}
            gap={0}
            outerCircleColor={colors.neutral.divider}
            progressCircleColor={colors.brand.yellow}
            backgroundColor="transparent"
            renderIcon={() => <Ionicons name="people" size={18} color={colors.brand.yellow} />}
          />
        </View>
        <View className="gap-0.5">
          <Text className="body-md font-body-semibold text-text-primary">{`${members.length} of ${maxMembers} spots filled`}</Text>
          <Text style={HOME_ROW_DETAIL}>{`${capacityPercent}% full`}</Text>
        </View>
      </View>

      <View className="gap-3 px-4 pt-4">
        <View className="flex-row items-center gap-2 rounded-xl bg-surface px-3 py-3">
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
                className={`rounded-full px-3 py-1.5 ${active ? "bg-brand-yellow" : "bg-surface"}`}
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
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: insets.bottom + 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {filteredMembers.length === 0 ? (
          <Text className="body-md py-10 text-center text-text-secondary">No members match.</Text>
        ) : (
          filteredMembers.map((member, index) => (
            <MemberRow
              key={member.id}
              member={member}
              division={divisionFor(member)}
              flexTagEmoji={member.id === CURRENT_MEMBER_ID ? equippedFlexTag?.emoji : undefined}
              trainingLabel={trainingLabelFor(member)}
              canManage={iAmAdmin && member.id !== CURRENT_MEMBER_ID && member.role !== "leader"}
              canChallenge={member.id !== CURRENT_MEMBER_ID}
              onPromote={() => {
                setMemberRole(member.id, "co-leader");
                posthog.capture("crew_member_role_changed", { newRole: "co-leader" });
              }}
              onDemote={() => {
                setMemberRole(member.id, "member");
                posthog.capture("crew_member_role_changed", { newRole: "member" });
              }}
              onToggleAdmin={() => {
                toggleMemberAdmin(member.id);
                posthog.capture("crew_member_admin_toggled");
              }}
              onRemove={() => {
                removeMember(member.id);
                posthog.capture("crew_member_removed");
              }}
              onChallenge={() => setChallengingId(member.id)}
              onPress={() => router.push(`/crew/member/${member.id}`)}
              isLast={index === filteredMembers.length - 1}
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

      <DuelChallengeSheet
        visible={challengingId !== null}
        memberName={challengingMember?.name ?? null}
        onClose={() => setChallengingId(null)}
        onChallenge={handleChallenge}
      />
    </View>
  );
}
