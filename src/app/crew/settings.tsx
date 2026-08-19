import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInUp } from "react-native-reanimated";

import { CrewIconBadge } from "@/components/CrewIconBadge";
import { InviteMembersModal } from "@/components/InviteMembersModal";
import { SearchableSelectField } from "@/components/SearchableSelectField";
import { CREW_ICONS } from "@/data/crew-icons";
import { CREW_TRAINING_TYPES } from "@/data/crew-training-types";
import { useCrewStore, type CrewPrivacy } from "@/store/crew-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors } from "@/theme";

function inviteCodeFor(crewName: string): string {
  const slug = crewName.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 10) || "GYMCREW";
  return `${slug}-CREW`;
}

const PRIVACY_LABEL: Record<CrewPrivacy, string> = {
  "invite-only": "Invite Only",
  open: "Open",
  public: "Public",
};

const PRIVACY_DESCRIPTION: Record<CrewPrivacy, string> = {
  "invite-only": "Only people with an invite code can join.",
  open: "Anyone can request to join; an admin must approve.",
  public: "Anyone can find and join this crew instantly.",
};

const ROLE_PERMISSIONS = [
  { role: "Leader", description: "Full control — edit crew info, manage members, transfer leadership, disband the crew." },
  { role: "Co-Leader", description: "Can invite and remove members, manage roles, and edit crew info." },
  { role: "Member", description: "Can train, log workouts, and take part in crew challenges." },
] as const;

function SheetModal({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.7)", paddingHorizontal: 24 }}>
        <Animated.View entering={FadeInUp.springify().damping(16).mass(0.7)} className="w-full gap-4 rounded-3xl border border-divider bg-surface p-5">
          <View className="flex-row items-center justify-between">
            <Text className="heading-4 text-text-primary">{title}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={colors.neutral.textSecondary} />
            </Pressable>
          </View>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

function SettingsRow({ label, value, danger, isLast, onPress }: { label: string; value?: string; danger?: boolean; isLast?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      className={`flex-row items-center justify-between px-4 py-4 ${!isLast ? "border-b border-divider" : ""}`}
    >
      <Text className={`body-md font-body-semibold ${danger ? "text-error" : "text-text-primary"}`}>{label}</Text>
      <View className="flex-row items-center gap-1.5">
        {value && <Text className="body-sm text-text-secondary">{value}</Text>}
        <Ionicons name="chevron-forward" size={16} color={danger ? colors.semantic.error : colors.neutral.textSecondary} />
      </View>
    </Pressable>
  );
}

function StepperField({ label, value, onDecrement, onIncrement }: { label: string; value: number; onDecrement: () => void; onIncrement: () => void }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="body-md text-text-primary">{label}</Text>
      <View className="flex-row items-center gap-4 rounded-full border border-divider bg-background px-2 py-1.5">
        <Pressable onPress={onDecrement} hitSlop={8}>
          <Ionicons name="remove" size={16} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="body-md w-6 text-center font-body-bold text-text-primary">{value}</Text>
        <Pressable onPress={onIncrement} hitSlop={8}>
          <Ionicons name="add" size={16} color={colors.neutral.textPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

export default function CrewSettingsScreen() {
  const insets = useSafeAreaInsets();

  const name = useCrewStore((state) => state.name);
  const tagline = useCrewStore((state) => state.tagline);
  const icon = useCrewStore((state) => state.icon);
  const createdAt = useCrewStore((state) => state.createdAt);
  const members = useCrewStore((state) => state.members);
  const maxMembers = useCrewStore((state) => state.maxMembers);
  const privacy = useCrewStore((state) => state.privacy);
  const joinRequestsEnabled = useCrewStore((state) => state.joinRequestsEnabled);
  const trainingType = useCrewStore((state) => state.trainingType);
  const subscriptionActive = useCrewStore((state) => state.subscriptionActive);
  const notifications = useCrewStore((state) => state.notifications);
  const updateInfo = useCrewStore((state) => state.updateInfo);
  const setIcon = useCrewStore((state) => state.setIcon);
  const setPrivacy = useCrewStore((state) => state.setPrivacy);
  const toggleJoinRequests = useCrewStore((state) => state.toggleJoinRequests);
  const setTrainingType = useCrewStore((state) => state.setTrainingType);
  const setMaxMembers = useCrewStore((state) => state.setMaxMembers);
  const toggleNotification = useCrewStore((state) => state.toggleNotification);
  const leaveCrew = useCrewStore((state) => state.leaveCrew);
  const resetCrewSelection = useOnboardingStore((state) => state.resetCrewSelection);

  const [editOpen, setEditOpen] = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [joinRequestsOpen, setJoinRequestsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [rolesOpen, setRolesOpen] = useState(false);

  const [editName, setEditName] = useState(name);
  const [editTagline, setEditTagline] = useState(tagline);

  function openEdit() {
    setEditName(name);
    setEditTagline(tagline);
    setEditOpen(true);
  }

  function saveEdit() {
    updateInfo({ name: editName, tagline: editTagline });
    setEditOpen(false);
  }

  function handleLeaveCrew() {
    Alert.alert("Leave Crew", `Are you sure you want to leave ${name}? You'll keep all your challenge points.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave Crew",
        style: "destructive",
        onPress: () => {
          leaveCrew();
          resetCrewSelection();
          router.replace("/build-crew");
        },
      },
    ]);
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Crew Settings</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: insets.bottom + 24, gap: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center gap-3">
          <CrewIconBadge iconKey={icon} size={56} />
          <View className="flex-1 gap-0.5">
            <Text className="body-lg font-body-bold text-text-primary">{name.toUpperCase()}</Text>
            <Text className="caption text-text-secondary">
              Est. {new Date(createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
            </Text>
          </View>
          <Pressable onPress={() => setIconPickerOpen(true)} hitSlop={8}>
            <Text className="body-sm font-body-bold text-brand-yellow">Change</Text>
          </Pressable>
        </View>

        <View className="overflow-hidden rounded-2xl border border-divider bg-surface">
          <SettingsRow label="Crew Info" onPress={openEdit} />
          <SettingsRow label="Crew Preferences" onPress={() => setPreferencesOpen(true)} />
          <SettingsRow label="Privacy" value={PRIVACY_LABEL[privacy]} onPress={() => setPrivacyOpen(true)} />
          <SettingsRow label="Join Requests" value={joinRequestsEnabled ? "On" : "Off"} onPress={() => setJoinRequestsOpen(true)} />
          <SettingsRow label="Notifications" onPress={() => setNotificationsOpen(true)} />
          <SettingsRow label="Subscription" value={subscriptionActive ? "Active" : "Inactive"} onPress={() => setSubscriptionOpen(true)} />
          <SettingsRow label="Manage Members" onPress={() => router.push("/crew/members")} />
          <SettingsRow label="Invite Members" onPress={() => setInviteOpen(true)} />
          <SettingsRow label="Roles & Permissions" onPress={() => setRolesOpen(true)} />
          <SettingsRow label="Danger Zone" danger isLast onPress={handleLeaveCrew} />
        </View>

        <Pressable onPress={handleLeaveCrew} className="items-center rounded-full border border-error py-4">
          <Text className="body-md font-body-bold" style={{ color: colors.semantic.error }}>
            Leave Crew
          </Text>
        </Pressable>
      </ScrollView>

      <SheetModal visible={editOpen} onClose={() => setEditOpen(false)} title="Crew Info">
        <View className="gap-3">
          <View className="gap-1.5">
            <Text className="body-sm text-text-secondary">Crew Name</Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholder="Crew name"
              placeholderTextColor={colors.neutral.textSecondary}
              className="rounded-xl border border-divider bg-background px-4 py-3 body-md text-text-primary"
              style={{ outlineWidth: 0, outlineColor: "transparent" }}
            />
          </View>
          <View className="gap-1.5">
            <Text className="body-sm text-text-secondary">Tagline</Text>
            <TextInput
              value={editTagline}
              onChangeText={setEditTagline}
              placeholder="Tagline"
              placeholderTextColor={colors.neutral.textSecondary}
              className="rounded-xl border border-divider bg-background px-4 py-3 body-md text-text-primary"
              style={{ outlineWidth: 0, outlineColor: "transparent" }}
            />
          </View>
          <Pressable onPress={saveEdit} className="items-center rounded-full bg-brand-yellow py-3.5">
            <Text className="body-md font-body-bold text-brand-iron">Save Changes</Text>
          </Pressable>
        </View>
      </SheetModal>

      <SheetModal visible={iconPickerOpen} onClose={() => setIconPickerOpen(false)} title="Change Crew Logo">
        <View className="flex-row flex-wrap gap-3">
          {CREW_ICONS.map((item) => {
            const active = item.key === icon;
            return (
              <Pressable
                key={item.key}
                onPress={() => {
                  setIcon(item.key);
                  setIconPickerOpen(false);
                }}
                className={`h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 ${
                  active ? "border-brand-yellow" : "border-divider"
                }`}
              >
                <CrewIconBadge iconKey={item.key} size={60} tint={active ? colors.brand.yellow : colors.neutral.textPrimary} />
              </Pressable>
            );
          })}
        </View>
      </SheetModal>

      <SheetModal visible={preferencesOpen} onClose={() => setPreferencesOpen(false)} title="Crew Preferences">
        <View className="gap-4">
          <SearchableSelectField label="Training Focus" value={trainingType} options={CREW_TRAINING_TYPES} onChange={setTrainingType} />
          <StepperField
            label="Max Crew Size"
            value={maxMembers}
            onDecrement={() => setMaxMembers(Math.max(members.length, 2, maxMembers - 1))}
            onIncrement={() => setMaxMembers(Math.min(20, maxMembers + 1))}
          />
        </View>
      </SheetModal>

      <InviteMembersModal visible={inviteOpen} onClose={() => setInviteOpen(false)} crewName={name} inviteCode={inviteCodeFor(name)} />

      <SheetModal visible={subscriptionOpen} onClose={() => setSubscriptionOpen(false)} title="Subscription">
        <View className="gap-4">
          <View className="flex-row items-center gap-3 rounded-2xl border border-divider bg-background p-4">
            <Ionicons name="card" size={22} color={subscriptionActive ? colors.semantic.success : colors.neutral.textSecondary} />
            <View className="flex-1">
              <Text className="body-md font-body-semibold text-text-primary">Crew Plan</Text>
              <Text className="body-sm text-text-secondary">
                {subscriptionActive ? "Active — unlocks ranks, leaderboards & crew challenges" : "Inactive — upgrade to unlock the competitive layer"}
              </Text>
            </View>
          </View>
          <Text className="body-sm text-text-secondary">
            Your crew can split the subscription cost between members. Manage billing from your profile.
          </Text>
        </View>
      </SheetModal>

      <SheetModal visible={joinRequestsOpen} onClose={() => setJoinRequestsOpen(false)} title="Join Requests">
        <View className="flex-row items-center justify-between rounded-xl border border-divider bg-background px-4 py-3.5">
          <View className="flex-1 pr-3">
            <Text className="body-md text-text-primary">Require approval</Text>
            <Text className="body-sm text-text-secondary">Review new join requests before they&apos;re added to the crew</Text>
          </View>
          <Switch
            value={joinRequestsEnabled}
            onValueChange={toggleJoinRequests}
            trackColor={{ false: colors.neutral.divider, true: colors.brand.yellow }}
            thumbColor={colors.brand.white}
          />
        </View>
      </SheetModal>

      <SheetModal visible={notificationsOpen} onClose={() => setNotificationsOpen(false)} title="Notifications">
        <View className="gap-3">
          <View className="flex-row items-center justify-between rounded-xl border border-divider bg-background px-4 py-3.5">
            <View className="flex-1 pr-3">
              <Text className="body-md text-text-primary">Workout Reminders</Text>
              <Text className="body-sm text-text-secondary">Get nudged when the crew is training</Text>
            </View>
            <Switch
              value={notifications.workoutReminders}
              onValueChange={() => toggleNotification("workoutReminders")}
              trackColor={{ false: colors.neutral.divider, true: colors.brand.yellow }}
              thumbColor={colors.brand.white}
            />
          </View>
          <View className="flex-row items-center justify-between rounded-xl border border-divider bg-background px-4 py-3.5">
            <View className="flex-1 pr-3">
              <Text className="body-md text-text-primary">PR Alerts</Text>
              <Text className="body-sm text-text-secondary">Know when a crew member hits a personal record</Text>
            </View>
            <Switch
              value={notifications.prAlerts}
              onValueChange={() => toggleNotification("prAlerts")}
              trackColor={{ false: colors.neutral.divider, true: colors.brand.yellow }}
              thumbColor={colors.brand.white}
            />
          </View>
          <View className="flex-row items-center justify-between rounded-xl border border-divider bg-background px-4 py-3.5">
            <View className="flex-1 pr-3">
              <Text className="body-md text-text-primary">Challenge Updates</Text>
              <Text className="body-sm text-text-secondary">New challenges and progress milestones</Text>
            </View>
            <Switch
              value={notifications.challengeUpdates}
              onValueChange={() => toggleNotification("challengeUpdates")}
              trackColor={{ false: colors.neutral.divider, true: colors.brand.yellow }}
              thumbColor={colors.brand.white}
            />
          </View>
        </View>
      </SheetModal>

      <SheetModal visible={privacyOpen} onClose={() => setPrivacyOpen(false)} title="Crew Privacy">
        <View className="gap-2.5">
          {(Object.keys(PRIVACY_LABEL) as CrewPrivacy[]).map((key) => {
            const active = key === privacy;
            return (
              <Pressable
                key={key}
                onPress={() => {
                  setPrivacy(key);
                  setPrivacyOpen(false);
                }}
                className={`flex-row items-center gap-3 rounded-xl border p-4 ${active ? "border-brand-yellow bg-brand-yellow/10" : "border-divider bg-background"}`}
              >
                <View className="flex-1 gap-0.5">
                  <Text className="body-md font-body-semibold text-text-primary">{PRIVACY_LABEL[key]}</Text>
                  <Text className="body-sm text-text-secondary">{PRIVACY_DESCRIPTION[key]}</Text>
                </View>
                {active && <Ionicons name="checkmark-circle" size={20} color={colors.brand.yellow} />}
              </Pressable>
            );
          })}
        </View>
      </SheetModal>

      <SheetModal visible={rolesOpen} onClose={() => setRolesOpen(false)} title="Roles & Permissions">
        <View className="gap-3">
          {ROLE_PERMISSIONS.map((entry) => (
            <View key={entry.role} className="gap-1 rounded-xl border border-divider bg-background p-3.5">
              <Text className="body-md font-body-bold text-brand-yellow">{entry.role}</Text>
              <Text className="body-sm text-text-secondary">{entry.description}</Text>
            </View>
          ))}
        </View>
      </SheetModal>
    </View>
  );
}
