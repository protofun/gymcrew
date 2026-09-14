import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { goBack } from "@/lib/navigation";
import { api, type ApiSupportReply, type ApiSupportTicket } from "@/lib/api";
import { colors } from "@/theme";

function ChatBubble({ senderType, body, createdAt }: { senderType: "admin" | "user"; body: string; createdAt: number }) {
  const isMe = senderType === "user";
  return (
    <View className={`flex-row ${isMe ? "justify-end" : "justify-start"}`}>
      <View className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${isMe ? "bg-brand-yellow" : "bg-surface"}`}>
        <Text className={`body-sm ${isMe ? "text-brand-iron" : "text-text-primary"}`}>{body}</Text>
        <Text className={`caption mt-1 ${isMe ? "text-brand-iron/60" : "text-text-secondary"}`}>{new Date(createdAt).toLocaleString()}</Text>
      </View>
    </View>
  );
}

export default function SupportTicketScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [ticket, setTicket] = useState<ApiSupportTicket | null>(null);
  const [replies, setReplies] = useState<ApiSupportReply[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  function load() {
    if (!id) return;
    api
      .getSupportTicketDetail(Number(id))
      .then((result) => {
        setTicket(result.ticket);
        setReplies(result.replies);
      })
      .catch(() => {});
  }

  useEffect(load, [id]);

  async function handleSend() {
    if (!reply.trim() || !id) return;
    setSending(true);
    try {
      await api.replySupportTicket(Number(id), reply.trim());
      setReply("");
      load();
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => goBack("/profile/support")} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Support</Text>
      </View>

      {!ticket ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.brand.yellow} />
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView
            ref={scrollRef}
            className="flex-1"
            contentContainerStyle={{ padding: 16, gap: 10 }}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            <ChatBubble senderType="user" body={ticket.message} createdAt={ticket.createdAt} />
            {replies.map((r) => (
              <ChatBubble key={r.id} senderType={r.senderType} body={r.body} createdAt={r.createdAt} />
            ))}
          </ScrollView>

          <View className="flex-row items-center gap-2 border-t border-divider px-4 py-3" style={{ paddingBottom: insets.bottom + 8 }}>
            <TextInput
              value={reply}
              onChangeText={setReply}
              placeholder="Type a reply…"
              placeholderTextColor={colors.neutral.textSecondary}
              className="body-md flex-1 rounded-full border border-divider bg-surface px-4 py-2.5 text-text-primary"
              style={{ outlineWidth: 0, outlineColor: "transparent" }}
            />
            <Pressable
              onPress={handleSend}
              disabled={!reply.trim() || sending}
              style={{ opacity: !reply.trim() || sending ? 0.5 : 1 }}
              className="h-11 w-11 items-center justify-center rounded-full bg-brand-yellow"
            >
              <Ionicons name="arrow-up" size={20} color={colors.brand.iron} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}
