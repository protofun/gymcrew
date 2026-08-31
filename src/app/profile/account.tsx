import { useClerk, useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ConfirmModal } from "@/components/ConfirmModal";
import { api, isApiConfigured } from "@/lib/api";
import { resetLocalStateForAccountSwitch } from "@/lib/reset-local-state";
import { DEVELOPER_MODE_USER_ID, useDeveloperModeStore } from "@/store/developer-mode-store";
import { colors } from "@/theme";

/** The only account allowed to create/edit/delete app-wide challenges (see profile/admin-challenges.tsx
 * and backend/routes/admin-challenges.php, which re-checks this same email server-side). */
const ADMIN_CHALLENGE_EMAIL = "jaimy.mathon@gmail.com";

function PasswordField({ label, value, onChangeText }: { label: string; value: string; onChangeText: (value: string) => void }) {
  return (
    <View className="gap-1.5">
      <Text className="caption font-body-semibold text-text-secondary">{label.toUpperCase()}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="••••••••"
        placeholderTextColor={colors.neutral.textSecondary}
        className="body-md rounded-2xl border border-divider bg-surface px-4 py-3.5 text-text-primary"
        style={{ outlineWidth: 0, outlineColor: "transparent" }}
      />
    </View>
  );
}

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const { signOut } = useClerk();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [signOutConfirmVisible, setSignOutConfirmVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const isDeveloper = user?.id === DEVELOPER_MODE_USER_ID;
  const isChallengeAdmin = user?.primaryEmailAddress?.emailAddress?.toLowerCase() === ADMIN_CHALLENGE_EMAIL;
  const developerModeEnabled = useDeveloperModeStore((state) => state.enabled);
  const toggleDeveloperMode = useDeveloperModeStore((state) => state.toggleEnabled);
  const clearAllOverrides = useDeveloperModeStore((state) => state.clearAllOverrides);

  const hasPassword = user?.passwordEnabled ?? false;

  function resetPasswordForm() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError(null);
  }

  async function handleChangePassword() {
    if (!user) return;
    setPasswordError(null);

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords don't match.");
      return;
    }
    if (hasPassword && !currentPassword) {
      setPasswordError("Enter your current password.");
      return;
    }

    setPasswordSaving(true);
    try {
      await user.updatePassword({
        newPassword,
        ...(hasPassword ? { currentPassword } : {}),
      });
      resetPasswordForm();
      Alert.alert("Password Updated", hasPassword ? "Your password has been changed." : "A password has been set for your account.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong — double check your current password.";
      setPasswordError(message);
    } finally {
      setPasswordSaving(false);
    }
  }

  async function confirmSignOut() {
    setSignOutConfirmVisible(false);
    await signOut();
    // Reloads the page (web) — see reset-local-state.ts for why this must fully wipe local storage
    // rather than just navigating away, so a different account signing in next never inherits this
    // device's cached data.
    await resetLocalStateForAccountSwitch();
  }

  async function confirmDeleteAccount() {
    setDeleteConfirmVisible(false);
    try {
      // Deletes the server-side rows first — the JWT this call authenticates with stops being
      // valid the instant the Clerk account below is gone.
      if (isApiConfigured) await api.deleteAccount();
      await user?.delete();
      await resetLocalStateForAccountSwitch();
      router.replace("/");
    } catch (error) {
      Alert.alert("Couldn't Delete Account", error instanceof Error ? error.message : "Please try again.");
    }
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Account</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: insets.bottom + 24, gap: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-1 rounded-2xl border border-divider bg-surface p-4">
          <Text className="caption font-body-semibold text-text-secondary">EMAIL</Text>
          <Text className="body-md text-text-primary">{user?.primaryEmailAddress?.emailAddress ?? "—"}</Text>
        </View>

        <View className="gap-3">
          <Text className="body-md font-body-semibold text-text-primary">{hasPassword ? "Change Password" : "Set a Password"}</Text>
          {hasPassword && <PasswordField label="Current Password" value={currentPassword} onChangeText={setCurrentPassword} />}
          <PasswordField label="New Password" value={newPassword} onChangeText={setNewPassword} />
          <PasswordField label="Confirm New Password" value={confirmPassword} onChangeText={setConfirmPassword} />

          {passwordError && (
            <View className="flex-row items-start gap-2 rounded-2xl border border-error/40 bg-error/10 p-3">
              <Ionicons name="warning" size={16} color={colors.semantic.error} style={{ marginTop: 1 }} />
              <Text className="body-sm flex-1 text-text-secondary">{passwordError}</Text>
            </View>
          )}

          <Pressable
            onPress={handleChangePassword}
            disabled={passwordSaving}
            style={({ pressed }) => ({ opacity: passwordSaving ? 0.6 : pressed ? 0.75 : 1 })}
            className="items-center rounded-full bg-brand-yellow py-4"
          >
            <Text className="body-md font-body-semibold text-brand-iron">{passwordSaving ? "Saving…" : "Save Password"}</Text>
          </Pressable>
        </View>

        <Pressable onPress={() => setSignOutConfirmVisible(true)} className="items-center rounded-full border border-divider py-4">
          <Text className="body-md font-body-bold text-text-primary">Sign Out</Text>
        </Pressable>

        {isChallengeAdmin && (
          <Pressable
            onPress={() => router.push("/profile/admin-challenges")}
            className="flex-row items-center gap-3 rounded-2xl border border-brand-yellow/40 bg-surface p-4"
          >
            <Ionicons name="flag" size={18} color={colors.brand.yellow} />
            <View className="flex-1">
              <Text className="body-sm font-body-semibold text-text-primary">Manage Challenges</Text>
              <Text className="body-sm text-text-secondary">Create, edit, and start/stop app-wide challenges.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.neutral.textSecondary} />
          </Pressable>
        )}

        {isDeveloper && (
          <View className="gap-2 rounded-2xl border border-brand-yellow/40 bg-surface p-4">
            <Text className="body-sm font-body-semibold text-text-primary">Developer Mode</Text>
            <Text className="body-sm text-text-secondary">
              Tap-to-edit for text/numbers shown around the app — for setting up screenshots or videos. Overrides are
              local to this device only and are never saved to the server.
            </Text>
            <Pressable
              onPress={toggleDeveloperMode}
              className={`mt-1 items-center rounded-full border py-3.5 ${
                developerModeEnabled ? "border-brand-yellow bg-brand-yellow" : "border-brand-yellow"
              }`}
            >
              <Text className={`body-sm font-body-bold ${developerModeEnabled ? "text-brand-iron" : "text-brand-yellow"}`}>
                Developer Mode: {developerModeEnabled ? "On" : "Off"}
              </Text>
            </Pressable>
            {developerModeEnabled && (
              <Pressable onPress={clearAllOverrides} className="items-center rounded-full border border-divider py-3.5">
                <Text className="body-sm text-text-secondary">Reset All Overrides</Text>
              </Pressable>
            )}
          </View>
        )}

        <View className="gap-2 rounded-2xl border border-error/40 bg-error/10 p-4">
          <Text className="body-sm font-body-semibold" style={{ color: colors.semantic.error }}>
            Danger Zone
          </Text>
          <Text className="body-sm text-text-secondary">Permanently delete your account and all of your data. This can&apos;t be undone.</Text>
          <Pressable onPress={() => setDeleteConfirmVisible(true)} className="mt-1 items-center rounded-full border border-error py-3.5">
            <Text className="body-sm font-body-bold" style={{ color: colors.semantic.error }}>
              Delete Account
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <ConfirmModal
        visible={signOutConfirmVisible}
        title="Sign Out"
        message="Are you sure you want to sign out?"
        confirmLabel="Sign Out"
        destructive
        onConfirm={confirmSignOut}
        onCancel={() => setSignOutConfirmVisible(false)}
      />
      <ConfirmModal
        visible={deleteConfirmVisible}
        title="Delete Account"
        message="This permanently deletes your GymCrew account and can't be undone. Your crew and its other members are not affected."
        confirmLabel="Delete Account"
        destructive
        onConfirm={confirmDeleteAccount}
        onCancel={() => setDeleteConfirmVisible(false)}
      />
    </View>
  );
}
