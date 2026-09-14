import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUser } from "@clerk/expo";
import { usePostHog } from "posthog-react-native";

import { goBack } from "@/lib/navigation";
import { api, isApiConfigured, type ApiSupportTicket } from "@/lib/api";
import { colors } from "@/theme";

export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const posthog = usePostHog();
  const { user } = useUser();
  const [tickets, setTickets] = useState<ApiSupportTicket[] | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [composing, setComposing] = useState(false);

  useEffect(() => {
    if (!isApiConfigured) {
      setTickets([]);
      return;
    }
    api
      .getMySupportTickets()
      .then(setTickets)
      .catch(() => setTickets([]));
  }, []);

  async function handleSubmit() {
    const trimmed = message.trim();
    if (!trimmed || !isApiConfigured) return;

    setSubmitting(true);
    try {
      const result = await api.sendSupportMessage(trimmed, user?.primaryEmailAddress?.emailAddress);
      posthog.capture("support_message_sent");
      setMessage("");
      setComposing(false);
      router.push({ pathname: "/profile/support/[id]", params: { id: String(result.id) } });
    } catch {
      Alert.alert("Couldn't Send", "Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const showCompose = composing || (tickets !== null && tickets.length === 0);

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => goBack("/(tabs)/profile")} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Contact & Support</Text>
        {!showCompose && (
          <Pressable onPress={() => setComposing(true)} hitSlop={8} style={{ position: "absolute", right: 16 }}>
            <Ionicons name="add-circle-outline" size={24} color={colors.brand.yellow} />
          </Pressable>
        )}
      </View>

      {tickets === null ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.brand.yellow} />
      ) : showCompose ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View className="gap-1.5">
              <Text className="body-md font-body-semibold text-text-primary">Report a Problem</Text>
              <Text className="body-sm text-text-secondary">
                Found a bug, or something feels off? Tell us what happened — we read every message, and you can reply back and forth with us right here.
              </Text>
            </View>

            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="What went wrong?"
              placeholderTextColor={colors.neutral.textSecondary}
              multiline
              numberOfLines={6}
              className="body-md rounded-2xl border border-divider bg-surface px-4 py-3.5 text-text-primary"
              style={{ outlineWidth: 0, outlineColor: "transparent", minHeight: 140, textAlignVertical: "top" }}
            />

            {user?.primaryEmailAddress?.emailAddress && (
              <Text className="body-sm text-text-secondary">We&apos;ll follow up at {user.primaryEmailAddress.emailAddress} if needed.</Text>
            )}

            <Pressable
              onPress={handleSubmit}
              disabled={!message.trim() || submitting}
              style={{ opacity: !message.trim() || submitting ? 0.5 : 1 }}
              className="items-center rounded-full bg-brand-yellow py-4"
            >
              <Text className="body-md font-body-semibold text-brand-iron">{submitting ? "Sending…" : "Send Message"}</Text>
            </Pressable>

            {tickets.length > 0 && (
              <Pressable onPress={() => setComposing(false)} className="items-center py-2">
                <Text className="body-sm text-text-secondary">Cancel</Text>
              </Pressable>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
          {tickets.map((ticket) => (
            <Pressable
              key={ticket.id}
              onPress={() => router.push({ pathname: "/profile/support/[id]", params: { id: String(ticket.id) } })}
              className="gap-2 rounded-2xl border border-divider bg-surface p-4"
            >
              <View className="flex-row items-center justify-between">
                <Text className="body-sm font-body-semibold text-text-primary">
                  {ticket.status === "open" ? "Open" : "Resolved"}
                </Text>
                <Text className="caption text-text-secondary">{new Date(ticket.createdAt).toLocaleDateString()}</Text>
              </View>
              <Text className="body-sm text-text-secondary" numberOfLines={2}>
                {ticket.message}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
