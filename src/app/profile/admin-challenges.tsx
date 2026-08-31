import { useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AdminChallengeFormSheet } from "@/components/AdminChallengeFormSheet";
import { ConfirmModal } from "@/components/ConfirmModal";
import type { AdminChallengeInput, ApiAdminChallenge } from "@/lib/api";
import { useAdminChallengeStore } from "@/store/admin-challenge-store";
import { colors } from "@/theme";

/** Gated in profile/account.tsx to the same email — this screen never renders for anyone else, and
 * every mutation is re-checked server-side regardless (see backend/routes/admin-challenges.php). */
const ADMIN_CHALLENGE_EMAIL = "jaimy.mathon@gmail.com";

function ChallengeRow({
  challenge,
  onToggleActive,
  onEdit,
  onDelete,
}: {
  challenge: ApiAdminChallenge;
  onToggleActive: (value: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View className="gap-2.5 rounded-2xl border border-divider bg-surface p-3.5">
      <View className="flex-row items-start gap-3">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-brand-yellow/15">
          <Ionicons name={challenge.icon as keyof typeof Ionicons.glyphMap} size={16} color={colors.brand.yellow} />
        </View>
        <Pressable onPress={onEdit} className="flex-1 gap-0.5">
          <View className="flex-row items-center gap-1.5">
            <Text className="body-md font-body-semibold text-text-primary">{challenge.name}</Text>
            {challenge.isSummerChallenge && (
              <View className="rounded-full bg-brand-yellow/15 px-2 py-0.5">
                <Text className="caption font-body-semibold text-brand-yellow">SUMMER</Text>
              </View>
            )}
          </View>
          <Text className="caption text-text-secondary" numberOfLines={2}>
            {challenge.description}
          </Text>
          <Text className="caption text-text-secondary">
            Target: {challenge.perMemberTarget.toLocaleString("en-US")} {challenge.unit} / member
          </Text>
        </Pressable>
        <Pressable onPress={onDelete} hitSlop={8} className="p-1">
          <Ionicons name="trash-outline" size={18} color={colors.semantic.error} />
        </Pressable>
      </View>
      <View className="flex-row items-center justify-between border-t border-divider pt-2.5">
        <Text className={`caption font-body-semibold ${challenge.isActive ? "text-brand-yellow" : "text-text-secondary"}`}>
          {challenge.isActive ? "Active — visible to every crew" : "Stopped — hidden from crews"}
        </Text>
        <Switch
          value={challenge.isActive}
          onValueChange={onToggleActive}
          trackColor={{ false: colors.neutral.divider, true: colors.brand.yellow }}
          thumbColor={colors.brand.white}
        />
      </View>
    </View>
  );
}

export default function AdminChallengesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const isAdmin = user?.primaryEmailAddress?.emailAddress?.toLowerCase() === ADMIN_CHALLENGE_EMAIL;

  const challenges = useAdminChallengeStore((state) => state.challenges);
  const fetchChallenges = useAdminChallengeStore((state) => state.fetch);
  const createChallenge = useAdminChallengeStore((state) => state.create);
  const updateChallenge = useAdminChallengeStore((state) => state.update);
  const removeChallenge = useAdminChallengeStore((state) => state.remove);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ApiAdminChallenge | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    fetchChallenges().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top }} className="items-center justify-center bg-background px-6">
        <Text className="body-md text-center text-text-secondary">You don&apos;t have access to this screen.</Text>
        <Pressable onPress={() => router.back()} className="mt-4">
          <Text className="body-md font-body-semibold text-brand-yellow">Go back</Text>
        </Pressable>
      </View>
    );
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(challenge: ApiAdminChallenge) {
    setEditing(challenge);
    setFormOpen(true);
  }

  async function handleSubmit(input: AdminChallengeInput) {
    setSaving(true);
    const result = editing ? await updateChallenge(editing.id, input) : await createChallenge(input);
    setSaving(false);
    if (!result.ok) {
      Alert.alert("Couldn't save challenge", result.error);
      return;
    }
    setFormOpen(false);
  }

  async function handleToggleActive(challenge: ApiAdminChallenge, value: boolean) {
    const result = await updateChallenge(challenge.id, { isActive: value });
    if (!result.ok) Alert.alert("Couldn't update challenge", result.error);
  }

  async function confirmDelete() {
    if (!deletingId) return;
    const id = deletingId;
    setDeletingId(null);
    const result = await removeChallenge(id);
    if (!result.ok) Alert.alert("Couldn't delete challenge", result.error);
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Manage Challenges</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.brand.yellow} />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: insets.bottom + 16, gap: 10 }}
          showsVerticalScrollIndicator={false}
        >
          <Text className="body-sm text-text-secondary">
            App-wide challenges you create here show up in every crew&apos;s Challenges tab while active.
          </Text>

          {challenges.length === 0 ? (
            <View className="items-center gap-2 rounded-2xl border border-dashed border-divider px-6 py-12">
              <Ionicons name="flag-outline" size={26} color={colors.neutral.textSecondary} />
              <Text className="body-sm text-center text-text-secondary">No admin challenges yet — create one below.</Text>
            </View>
          ) : (
            challenges.map((challenge) => (
              <ChallengeRow
                key={challenge.id}
                challenge={challenge}
                onToggleActive={(value) => handleToggleActive(challenge, value)}
                onEdit={() => openEdit(challenge)}
                onDelete={() => setDeletingId(challenge.id)}
              />
            ))
          )}
        </ScrollView>
      )}

      <View style={{ paddingBottom: insets.bottom + 16 }} className="border-t border-divider px-4 pt-4">
        <Pressable onPress={openCreate} className="flex-row items-center justify-center gap-2 rounded-full bg-brand-yellow py-4">
          <Ionicons name="add" size={18} color={colors.brand.iron} />
          <Text className="body-md font-body-bold text-brand-iron">Create Challenge</Text>
        </Pressable>
      </View>

      <AdminChallengeFormSheet visible={formOpen} existing={editing} saving={saving} onClose={() => setFormOpen(false)} onSubmit={handleSubmit} />

      <ConfirmModal
        visible={deletingId !== null}
        title="Delete Challenge"
        message="This removes it from every crew's Challenges tab. This can't be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setDeletingId(null)}
      />
    </View>
  );
}
