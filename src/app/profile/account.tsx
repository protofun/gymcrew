import { useClerk, useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/theme";

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

  function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          signOut();
          router.replace("/");
        },
      },
    ]);
  }

  function handleDeleteAccount() {
    Alert.alert(
      "Delete Account",
      "This permanently deletes your GymCrew account and can't be undone. Your crew and its other members are not affected.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: async () => {
            try {
              await user?.delete();
              router.replace("/");
            } catch (error) {
              Alert.alert("Couldn't Delete Account", error instanceof Error ? error.message : "Please try again.");
            }
          },
        },
      ],
    );
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

        <Pressable onPress={handleSignOut} className="items-center rounded-full border border-divider py-4">
          <Text className="body-md font-body-bold text-text-primary">Sign Out</Text>
        </Pressable>

        <View className="gap-2 rounded-2xl border border-error/40 bg-error/10 p-4">
          <Text className="body-sm font-body-semibold" style={{ color: colors.semantic.error }}>
            Danger Zone
          </Text>
          <Text className="body-sm text-text-secondary">Permanently delete your account and all of your data. This can&apos;t be undone.</Text>
          <Pressable onPress={handleDeleteAccount} className="mt-1 items-center rounded-full border border-error py-3.5">
            <Text className="body-sm font-body-bold" style={{ color: colors.semantic.error }}>
              Delete Account
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
