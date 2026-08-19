import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { InviteMembersModal } from "@/components/InviteMembersModal";
import { MemberActionsSheet } from "@/components/MemberActionsSheet";
import { useTodayWorkout } from "@/hooks/use-today-workout";
import { CURRENT_MEMBER_ID, useCrewStore, type CrewMember } from "@/store/crew-store";
import { colors } from "@/theme";

const FILTERS = ["all", "admin", "online"] as const;
type Filter = (typeof FILTERS)[number];

const FILTER_LABEL: Record<Filter, string> = { all: "All", admin: "Admin", online: "Online" };

const ROLE_LABEL: Record<CrewMember["role"], string | null> = {
  leader: "Leader",
  "co-leader": "Co-Leader",
  member: null,
};

function inviteCodeFor(crewName: string): string {
  const slug = crewName.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 10) || "GYMCREW";
  return `${slug}-CREW`;
}

function MemberRow({
  member,
  trainingLabel,
  canManage,
  onManage,
  onPress,
}: {
  member: CrewMember;
  trainingLabel: string | null;
  canManage: boolean;
  onManage: () => void;
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
        <Image source={{ uri: member.avatarUrl }} className="rounded-full bg-divider" style={{ width: 44, height: 44 }} />
        {member.isOnline && (
          <View
            className="absolute rounded-full border-2 border-surface bg-success"
            style={{ right: -1, bottom: -1, width: 12, height: 12 }}
          />
        )}
      </View>

      <View className="flex-1 gap-0.5">
        <View className="flex-row items-center gap-2">
          <Text className="body-md font-body-semibold text-text-primary">{member.name}</Text>
          {roleLabel && (
            <View className="rounded-full bg-background px-2 py-0.5">
              <Text className="caption text-text-secondary">{roleLabel}</Text>
            </View>
          )}
        </View>
        <Text className="caption text-text-secondary">@{member.username}</Text>
        {trainingLabel ? (
          <View className="mt-0.5 flex-row items-center gap-1">
            <Ionicons name="barbell" size={11} color={colors.brand.yellow} />
            <Text className="caption text-brand-yellow">{trainingLabel}</Text>
          </View>
        ) : (
          <Text className="caption mt-0.5 text-text-secondary">Resting today</Text>
        )}
      </View>

      <Text className="body-md font-body-bold text-brand-yellow">LVL {member.level}</Text>

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
  const members = useCrewStore((state) => state.members);
  const crewName = useCrewStore((state) => state.name);
  const todayPlan = useCrewStore((state) => state.todayPlan);
  const setMemberRole = useCrewStore((state) => state.setMemberRole);
  const toggleMemberAdmin = useCrewStore((state) => state.toggleMemberAdmin);
  const removeMember = useCrewStore((state) => state.removeMember);
  const myWorkout = useTodayWorkout();

  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [managingId, setManagingId] = useState<string | null>(null);

  const me = members.find((member) => member.id === CURRENT_MEMBER_ID);
  const iAmAdmin = me?.isAdmin ?? false;
  const managingMember = members.find((member) => member.id === managingId) ?? null;

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
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ position: "absolute", left: 16 }}>
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
              trainingLabel={trainingLabelFor(member)}
              canManage={iAmAdmin && member.id !== CURRENT_MEMBER_ID && member.role !== "leader"}
              onManage={() => setManagingId(member.id)}
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
        inviteCode={inviteCodeFor(crewName)}
      />

      <MemberActionsSheet
        visible={managingId !== null}
        member={managingMember}
        onClose={() => setManagingId(null)}
        onPromote={() => managingId && setMemberRole(managingId, "co-leader")}
        onDemote={() => managingId && setMemberRole(managingId, "member")}
        onToggleAdmin={() => managingId && toggleMemberAdmin(managingId)}
        onRemove={() => {
          if (managingId) removeMember(managingId);
          setManagingId(null);
        }}
      />
    </View>
  );
}
