import { useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ConfirmModal } from "@/components/ConfirmModal";
import { isTestId } from "@/constants/test-data";
import { isApiConfigured } from "@/lib/api";
import { appTourRef } from "@/lib/app-tour";
import { SEED_RANGES, restoreFromDatabase, seedTestWeighIns, seedTestWorkouts } from "@/lib/dev-tools";
import { goBack } from "@/lib/navigation";
import { showToast } from "@/lib/toast";
import { useBodyLogStore } from "@/store/body-log-store";
import { DEVELOPER_MODE_EMAILS, useDeveloperModeStore } from "@/store/developer-mode-store";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";
import { colors } from "@/theme";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="caption font-body-semibold text-text-secondary">{title.toUpperCase()}</Text>
      <View className="gap-3 rounded-2xl border border-brand-yellow/40 bg-surface p-4">{children}</View>
    </View>
  );
}

function MenuRow({
  icon,
  title,
  subtitle,
  onPress,
  destructive,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  const color = destructive ? colors.semantic.error : colors.brand.yellow;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })} className="flex-row items-center gap-3">
      <Ionicons name={icon} size={18} color={color} />
      <View className="flex-1">
        <Text className="body-sm font-body-semibold" style={{ color: destructive ? colors.semantic.error : colors.neutral.textPrimary }}>
          {title}
        </Text>
        <Text className="body-sm text-text-secondary">{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.neutral.textSecondary} />
    </Pressable>
  );
}

function RangeChips({ label, onPick }: { label: string; onPick: (days: number) => void }) {
  return (
    <View className="gap-2">
      <Text className="body-sm font-body-semibold text-text-primary">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {SEED_RANGES.map((range) => (
          <Pressable
            key={range.days}
            onPress={() => onPick(range.days)}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            className="rounded-full border border-brand-yellow px-4 py-2"
          >
            <Text className="body-sm font-body-semibold text-brand-yellow">{range.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function DeveloperToolsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
  const isDeveloper = !!email && DEVELOPER_MODE_EMAILS.includes(email);

  const developerModeEnabled = useDeveloperModeStore((state) => state.enabled);
  const toggleDeveloperMode = useDeveloperModeStore((state) => state.toggleEnabled);
  const clearAllOverrides = useDeveloperModeStore((state) => state.clearAllOverrides);
  const testWorkoutCount = useWorkoutHistoryStore((state) => state.workouts.filter((workout) => isTestId(workout.id)).length);
  const testWeighInCount = useBodyLogStore((state) => state.entries.filter((entry) => isTestId(entry.id)).length);

  const [restoreConfirmVisible, setRestoreConfirmVisible] = useState(false);
  const [restoring, setRestoring] = useState(false);

  if (!isDeveloper) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top }} className="items-center justify-center bg-background px-6">
        <Text className="body-md text-center text-text-secondary">You don&apos;t have access to this screen.</Text>
        <Pressable onPress={() => goBack("/profile/account")} className="mt-4">
          <Text className="body-md font-body-semibold text-brand-yellow">Go back</Text>
        </Pressable>
      </View>
    );
  }

  function handleSeedWorkouts(days: number) {
    const added = seedTestWorkouts(days);
    showToast("success", added > 0 ? `Added ${added} test workouts` : "No new test workouts", "Local only — never sent to the server.");
  }

  function handleSeedWeighIns(days: number) {
    const added = seedTestWeighIns(days);
    showToast("success", added > 0 ? `Added ${added} test weigh-ins` : "No new test weigh-ins", "Local only — never sent to the server.");
  }

  async function confirmRestore() {
    setRestoreConfirmVisible(false);
    setRestoring(true);
    await restoreFromDatabase();
    clearAllOverrides();
    setRestoring(false);
    showToast("success", "Restored", isApiConfigured ? "Showing what's in the database again." : "Backend isn't configured — only real local data is left.");
  }

  function handleOpenTutorialWizard() {
    router.replace("/home");
    // The tour lives inside (tabs)/_layout.tsx's AppTourProvider — give it a beat to be the
    // active screen before asking it to start (see lib/app-tour.ts).
    setTimeout(() => appTourRef.current?.start(), 150);
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => goBack("/profile/account")} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Developer Tools</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: insets.bottom + 24, gap: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <Section title="Developer Mode">
          <View className="flex-row items-center gap-3">
            <View className="flex-1">
              <Text className="body-sm font-body-semibold text-text-primary">Tap-to-Edit Text</Text>
              <Text className="body-sm text-text-secondary">
                Tap text and numbers around the app to override them, for screenshots and videos. Local to this device only.
              </Text>
            </View>
            <Switch
              value={developerModeEnabled}
              onValueChange={toggleDeveloperMode}
              trackColor={{ false: colors.neutral.divider, true: colors.brand.yellow }}
              thumbColor={colors.brand.white}
            />
          </View>
          {developerModeEnabled && (
            <Pressable onPress={clearAllOverrides} className="items-center rounded-full border border-divider py-3">
              <Text className="body-sm text-text-secondary">Reset All Text Overrides</Text>
            </Pressable>
          )}
        </Section>

        <Section title="Test Data">
          <Text className="body-sm text-text-secondary">
            Fills the app with a realistic training history. Stored on this device only — never sent to the server, and it
            never earns XP, streaks or crew points.
          </Text>
          <RangeChips label="Add test workouts (and matching PRs)" onPick={handleSeedWorkouts} />
          <RangeChips label="Add test weigh-ins" onPick={handleSeedWeighIns} />
          <Text className="caption text-text-secondary">
            Currently in the app: {testWorkoutCount} test workouts, {testWeighInCount} test weigh-ins.
          </Text>
        </Section>

        <Section title="Edit My Data">
          <MenuRow
            icon="create-outline"
            title="Edit Records & Weight"
            subtitle="Set a personal record or add a weigh-in. Local only."
            onPress={() => router.push("/profile/developer-edit-data")}
          />
        </Section>

        <Section title="Restore">
          <MenuRow
            icon="refresh"
            title={restoring ? "Restoring…" : "Restore to Database State"}
            subtitle="Removes all test data, edits and text overrides, then reloads what's stored on the server."
            onPress={() => !restoring && setRestoreConfirmVisible(true)}
            destructive
          />
        </Section>

        <Section title="Tools">
          <MenuRow
            icon="school-outline"
            title="Open Tutorial Wizard"
            subtitle="Replays the mascot-narrated first-run walkthrough."
            onPress={handleOpenTutorialWizard}
          />
        </Section>

        <Section title="Info">
          <View className="gap-0.5">
            <Text className="caption font-body-semibold text-text-secondary">ACCOUNT</Text>
            <Text className="body-sm text-text-primary">{email}</Text>
            <Text className="caption text-text-secondary">{user?.id}</Text>
          </View>
          <View className="gap-0.5">
            <Text className="caption font-body-semibold text-text-secondary">BACKEND</Text>
            <Text className="body-sm text-text-primary">{isApiConfigured ? "Configured" : "Not configured — data stays local"}</Text>
          </View>
        </Section>
      </ScrollView>

      <ConfirmModal
        visible={restoreConfirmVisible}
        title="Restore to Database State"
        message="This removes all test workouts, weigh-ins, edited records and text overrides from this device and reloads your real data from the server."
        confirmLabel="Restore"
        destructive
        onConfirm={confirmRestore}
        onCancel={() => setRestoreConfirmVisible(false)}
      />
    </View>
  );
}
