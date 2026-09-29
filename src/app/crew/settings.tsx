import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useState, type ReactNode } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";

import { goBack } from "@/lib/navigation";
import { AvatarActionSheet } from "@/components/AvatarActionSheet";
import { BottomSheet } from "@/components/BottomSheet";
import { ConfirmModal } from "@/components/ConfirmModal";
import { CrewAvatarGeneratorModal } from "@/components/CrewAvatarGeneratorModal";
import { CrewIconBadge } from "@/components/CrewIconBadge";
import { EditableText } from "@/components/EditableText";
import { HOME_EYEBROW, HOME_ROW_DETAIL, HOME_ROW_TITLE } from "@/components/homeStyle";
import { HomeRowLead } from "@/components/HomeRowLead";
import { InviteMembersModal } from "@/components/InviteMembersModal";
import { ReportModal } from "@/components/ReportModal";
import { SearchableSelectField } from "@/components/SearchableSelectField";
import { ToggleRow } from "@/components/ToggleRow";
import { CREW_TRAINING_TYPES } from "@/data/crew-training-types";
import { useCrewStore, type CrewPrivacy } from "@/store/crew-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors, fontFamily } from "@/theme";

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
  { role: "Leader", icon: "star" as const, description: "Full control — edit crew info, manage members, transfer leadership, disband the crew." },
  { role: "Co-Leader", icon: "shield" as const, description: "Can invite and remove members, manage roles, and edit crew info." },
  { role: "Member", icon: "person" as const, description: "Can train, log workouts, and take part in crew challenges." },
] as const;

/** Every settings sheet's shell — the same Reacticx `BottomSheet` (drag-to-dismiss, real keyboard avoidance)
 * every other sheet in the app uses now, not a plain centered `Modal` card. */
function SettingsSheet({ visible, onClose, title, children, keyboardAware }: { visible: boolean; onClose: () => void; title: string; children: ReactNode; keyboardAware?: boolean }) {
  return (
    <BottomSheet visible={visible} onClose={onClose} keyboardAware={keyboardAware}>
      <View className="gap-4 px-4 pb-4 pt-2">
        <Text className="heading-4 text-text-primary">{title}</Text>
        {children}
      </View>
    </BottomSheet>
  );
}

/** One row of the settings list — the same flowing, icon-led shape every other Crew screen uses now
 * (`HomeRowLead`, hairline divider, no bordered box around the row or the list). */
function SettingsLink({
  icon,
  label,
  value,
  danger,
  isLast,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  danger?: boolean;
  isLast?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      className={`flex-row items-center gap-3 py-3.5 ${!isLast ? "border-b border-divider" : ""}`}
    >
      <HomeRowLead kind="flat">
        <Ionicons name={icon} size={17} color={danger ? colors.semantic.error : colors.brand.yellow} />
      </HomeRowLead>
      <Text style={[HOME_ROW_TITLE, { fontSize: 15, lineHeight: 17, flex: 1, color: danger ? colors.semantic.error : colors.brand.white }]}>{label}</Text>
      {!!value && <Text style={HOME_ROW_DETAIL}>{value}</Text>}
      <Ionicons name="chevron-forward" size={16} color={danger ? colors.semantic.error : colors.neutral.textSecondary} />
    </Pressable>
  );
}

/** A settings section — an eyebrow, then its rows, a top hairline separating it from the section above
 * (the `border-t` sits on the section, not each row, so the FIRST row in a section doesn't also draw one). */
function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-2 border-t border-divider pt-4">
      <Text style={HOME_EYEBROW}>{title}</Text>
      <View>{children}</View>
    </View>
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
  const posthog = usePostHog();

  const crewId = useCrewStore((state) => state.id);
  const name = useCrewStore((state) => state.name);
  const tagline = useCrewStore((state) => state.tagline);
  const icon = useCrewStore((state) => state.icon);
  const createdAt = useCrewStore((state) => state.createdAt);
  const members = useCrewStore((state) => state.members);
  const maxMembers = useCrewStore((state) => state.maxMembers);
  const privacy = useCrewStore((state) => state.privacy);
  const joinRequestsEnabled = useCrewStore((state) => state.joinRequestsEnabled);
  const warAutoMatchEnabled = useCrewStore((state) => state.warAutoMatchEnabled);
  const trainingType = useCrewStore((state) => state.trainingType);
  const notifications = useCrewStore((state) => state.notifications);
  const updateInfo = useCrewStore((state) => state.updateInfo);
  const setIcon = useCrewStore((state) => state.setIcon);
  const uploadIcon = useCrewStore((state) => state.uploadIcon);
  const setPrivacy = useCrewStore((state) => state.setPrivacy);
  const toggleJoinRequests = useCrewStore((state) => state.toggleJoinRequests);
  const toggleWarAutoMatch = useCrewStore((state) => state.toggleWarAutoMatch);
  const setTrainingType = useCrewStore((state) => state.setTrainingType);
  const setMaxMembers = useCrewStore((state) => state.setMaxMembers);
  const toggleNotification = useCrewStore((state) => state.toggleNotification);
  const leaveCrew = useCrewStore((state) => state.leaveCrew);
  const inviteCode = useCrewStore((state) => state.inviteCode);
  const resetCrewSelection = useOnboardingStore((state) => state.resetCrewSelection);

  const [leaveConfirmVisible, setLeaveConfirmVisible] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [joinRequestsOpen, setJoinRequestsOpen] = useState(false);
  const [warAutoMatchOpen, setWarAutoMatchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const [editName, setEditName] = useState(name);
  const [editTagline, setEditTagline] = useState(tagline);
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function openEdit() {
    setEditName(name);
    setEditTagline(tagline);
    setEditError(null);
    setEditOpen(true);
  }

  async function saveEdit() {
    setSaving(true);
    const result = await updateInfo({ name: editName, tagline: editTagline });
    setSaving(false);
    if (!result.ok) {
      setEditError(result.error);
      return;
    }
    setEditError(null);
    setEditOpen(false);
    posthog.capture("crew_info_updated");
  }

  async function handleChooseCrewPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo library access to set a crew photo.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset?.base64) return;

    setUploadingIcon(true);
    const uploadResult = await uploadIcon(asset.base64, asset.mimeType ?? "image/jpeg");
    setUploadingIcon(false);
    if (!uploadResult.ok) {
      Alert.alert("Couldn't update crew photo", uploadResult.error);
      return;
    }
    posthog.capture("crew_photo_updated");
  }

  function handleLeaveCrew() {
    setLeaveConfirmVisible(true);
  }

  async function confirmLeaveCrew() {
    setLeaveConfirmVisible(false);
    await leaveCrew();
    posthog.capture("crew_left");
    resetCrewSelection();
    router.replace("/build-crew");
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => goBack("/(tabs)/crew")} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Crew Settings</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: insets.bottom + 24, gap: 4 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center gap-3 pb-2">
          <Pressable onPress={() => setIconPickerOpen(true)} disabled={uploadingIcon} style={{ opacity: uploadingIcon ? 0.5 : 1 }}>
            <CrewIconBadge iconKey={icon} size={64} />
            <View
              className="absolute bottom-0 right-0 items-center justify-center rounded-full border-2 border-background bg-brand-yellow"
              style={{ width: 24, height: 24 }}
            >
              {uploadingIcon ? <ActivityIndicator size="small" color={colors.brand.iron} /> : <Ionicons name="camera" size={12} color={colors.brand.iron} />}
            </View>
          </Pressable>
          <View className="flex-1 gap-0.5">
            <EditableText id="crew.settings.name" style={[HOME_ROW_TITLE, { fontSize: 18, lineHeight: 20 }]}>
              {name.toUpperCase()}
            </EditableText>
            <EditableText id="crew.settings.establishedDate" style={HOME_ROW_DETAIL}>
              {`Est. ${new Date(createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`}
            </EditableText>
          </View>
        </View>

        <SettingsSection title="CREW INFO">
          <SettingsLink icon="information-circle" label="Crew Info" onPress={openEdit} />
          <SettingsLink icon="options" label="Crew Preferences" isLast onPress={() => setPreferencesOpen(true)} />
        </SettingsSection>

        <SettingsSection title="ACCESS & COMPETITION">
          <SettingsLink icon="lock-closed" label="Privacy" value={PRIVACY_LABEL[privacy]} onPress={() => setPrivacyOpen(true)} />
          <SettingsLink icon="person-add" label="Join Requests" value={joinRequestsEnabled ? "On" : "Off"} onPress={() => setJoinRequestsOpen(true)} />
          <SettingsLink icon="flash" label="Crew War Auto-Match" value={warAutoMatchEnabled ? "On" : "Off"} onPress={() => setWarAutoMatchOpen(true)} />
          <SettingsLink icon="notifications" label="Notifications" isLast onPress={() => setNotificationsOpen(true)} />
        </SettingsSection>

        <SettingsSection title="PEOPLE">
          <SettingsLink icon="people" label="Manage Members" onPress={() => router.push("/crew/members")} />
          <SettingsLink icon="mail" label="Invite Members" onPress={() => setInviteOpen(true)} />
          <SettingsLink icon="shield-checkmark" label="Roles & Permissions" isLast onPress={() => setRolesOpen(true)} />
        </SettingsSection>

        <SettingsSection title="MORE">
          <SettingsLink icon="flag" label="Report Crew" isLast onPress={() => setReportOpen(true)} />
        </SettingsSection>

        <View className="border-t border-divider pt-6">
          <Pressable onPress={handleLeaveCrew} className="items-center rounded-full border border-error py-4">
            <Text className="body-md font-body-bold" style={{ color: colors.semantic.error }}>
              Leave Crew
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <SettingsSheet visible={editOpen} onClose={() => setEditOpen(false)} title="Crew Info" keyboardAware>
        <View className="gap-3">
          <View className="gap-1.5">
            <Text className="body-sm text-text-secondary">Crew Name</Text>
            <TextInput
              value={editName}
              onChangeText={(text) => {
                setEditName(text);
                setEditError(null);
              }}
              placeholder="Crew name"
              placeholderTextColor={colors.neutral.textSecondary}
              className={`rounded-xl border bg-background px-4 py-3 body-md text-text-primary ${editError ? "border-error" : "border-divider"}`}
              style={{ outlineWidth: 0, outlineColor: "transparent" }}
            />
            {editError && <Text className="body-sm text-error">{editError}</Text>}
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
          <Pressable onPress={saveEdit} disabled={saving} className="items-center rounded-full bg-brand-yellow py-3.5" style={{ opacity: saving ? 0.7 : 1 }}>
            <Text className="body-md font-body-bold text-brand-iron">{saving ? "Saving…" : "Save Changes"}</Text>
          </Pressable>
        </View>
      </SettingsSheet>

      <AvatarActionSheet
        visible={iconPickerOpen}
        onClose={() => setIconPickerOpen(false)}
        onChoosePhoto={() => {
          setIconPickerOpen(false);
          handleChooseCrewPhoto();
        }}
        onGenerateAvatar={() => {
          setIconPickerOpen(false);
          setGeneratorOpen(true);
        }}
      />

      <CrewAvatarGeneratorModal visible={generatorOpen} onClose={() => setGeneratorOpen(false)} onPick={setIcon} />

      <SettingsSheet visible={preferencesOpen} onClose={() => setPreferencesOpen(false)} title="Crew Preferences">
        <View className="gap-4">
          <SearchableSelectField label="Training Focus" value={trainingType} options={CREW_TRAINING_TYPES} onChange={setTrainingType} />
          <StepperField
            label="Max Crew Size"
            value={maxMembers}
            onDecrement={() => setMaxMembers(Math.max(members.length, 2, maxMembers - 1))}
            onIncrement={() => setMaxMembers(Math.min(20, maxMembers + 1))}
          />
        </View>
      </SettingsSheet>

      <InviteMembersModal visible={inviteOpen} onClose={() => setInviteOpen(false)} crewName={name} inviteCode={inviteCode} />

      <ReportModal visible={reportOpen} targetType="crew" targetId={crewId} onClose={() => setReportOpen(false)} />

      <ConfirmModal
        visible={leaveConfirmVisible}
        title="Leave Crew"
        message={`Are you sure you want to leave ${name}? You'll keep all your challenge points.`}
        confirmLabel="Leave Crew"
        destructive
        onConfirm={confirmLeaveCrew}
        onCancel={() => setLeaveConfirmVisible(false)}
      />

      <SettingsSheet visible={joinRequestsOpen} onClose={() => setJoinRequestsOpen(false)} title="Join Requests">
        <ToggleRow
          title="Require approval"
          subtitle="Review new join requests before they're added to the crew"
          value={joinRequestsEnabled}
          onValueChange={toggleJoinRequests}
        />
      </SettingsSheet>

      <SettingsSheet visible={warAutoMatchOpen} onClose={() => setWarAutoMatchOpen(false)} title="Crew War Auto-Match">
        <ToggleRow
          title="Auto-match into a War"
          subtitle="On (default): your crew always has an active War, matched automatically. Off: your crew only enters one when a leader or co-leader starts it from the War tab."
          value={warAutoMatchEnabled}
          onValueChange={toggleWarAutoMatch}
        />
      </SettingsSheet>

      <SettingsSheet visible={notificationsOpen} onClose={() => setNotificationsOpen(false)} title="Notifications">
        <View>
          <ToggleRow
            title="Workout Reminders"
            subtitle="Get nudged when the crew is training"
            value={notifications.workoutReminders}
            onValueChange={() => toggleNotification("workoutReminders")}
          />
          <ToggleRow
            title="PR Alerts"
            subtitle="Know when a crew member hits a personal record"
            value={notifications.prAlerts}
            onValueChange={() => toggleNotification("prAlerts")}
          />
          <ToggleRow
            title="Challenge Updates"
            subtitle="New challenges and progress milestones"
            value={notifications.challengeUpdates}
            onValueChange={() => toggleNotification("challengeUpdates")}
          />
        </View>
      </SettingsSheet>

      <SettingsSheet visible={privacyOpen} onClose={() => setPrivacyOpen(false)} title="Crew Privacy">
        <View>
          {(Object.keys(PRIVACY_LABEL) as CrewPrivacy[]).map((key, index, all) => {
            const active = key === privacy;
            return (
              <Pressable
                key={key}
                onPress={() => {
                  setPrivacy(key);
                  posthog.capture("crew_privacy_changed", { privacy: key });
                  setPrivacyOpen(false);
                }}
                className={`flex-row items-center gap-3 py-3.5 ${index === all.length - 1 ? "" : "border-b border-divider"}`}
              >
                <HomeRowLead kind="flat">
                  <Ionicons name={active ? "checkmark-circle" : "ellipse-outline"} size={18} color={active ? colors.brand.yellow : colors.neutral.textSecondary} />
                </HomeRowLead>
                <View className="flex-1 gap-0.5">
                  <Text style={[HOME_ROW_TITLE, { fontSize: 15, lineHeight: 17, color: active ? colors.brand.yellow : colors.brand.white }]}>{PRIVACY_LABEL[key]}</Text>
                  <Text style={HOME_ROW_DETAIL}>{PRIVACY_DESCRIPTION[key]}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </SettingsSheet>

      <SettingsSheet visible={rolesOpen} onClose={() => setRolesOpen(false)} title="Roles & Permissions">
        <View>
          {ROLE_PERMISSIONS.map((entry, index) => (
            <View key={entry.role} className={`flex-row items-center gap-3 py-3.5 ${index === ROLE_PERMISSIONS.length - 1 ? "" : "border-b border-divider"}`}>
              <HomeRowLead kind="flat">
                <Ionicons name={entry.icon} size={17} color={colors.brand.yellow} />
              </HomeRowLead>
              <View className="flex-1 gap-0.5">
                <Text style={{ fontFamily: fontFamily.heading, fontSize: 15, letterSpacing: 0.5, color: colors.brand.yellow }}>{entry.role}</Text>
                <Text style={HOME_ROW_DETAIL}>{entry.description}</Text>
              </View>
            </View>
          ))}
        </View>
      </SettingsSheet>
    </View>
  );
}
