import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { api, isApiConfigured } from "@/lib/api";
import { colors } from "@/theme";

/** The admin panel's "Page Management" banner (see backend/routes/announcement.php), shown once
 * per app session until dismissed — not persisted across sessions, so a still-active announcement
 * naturally resurfaces next time the app is opened rather than being dismissed forever after one
 * tap. */
export function AnnouncementBanner() {
  const [message, setMessage] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isApiConfigured) return;
    api
      .getAnnouncement()
      .then((result) => setMessage(result?.message ?? null))
      .catch(() => {});
  }, []);

  if (!message || dismissed) return null;

  return (
    <View className="mx-4 mt-4 flex-row items-start gap-3 rounded-2xl border border-brand-yellow/40 bg-surface p-4">
      <Ionicons name="megaphone" size={18} color={colors.brand.yellow} style={{ marginTop: 1 }} />
      <Text className="body-sm flex-1 text-text-primary">{message}</Text>
      <Pressable onPress={() => setDismissed(true)} hitSlop={8}>
        <Ionicons name="close" size={18} color={colors.neutral.textSecondary} />
      </Pressable>
    </View>
  );
}
