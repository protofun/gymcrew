import { useState } from "react";
import { Alert, Modal, Pressable, Text, TextInput, View } from "react-native";

import { api, isApiConfigured } from "@/lib/api";
import { colors } from "@/theme";

const REASONS: { key: string; label: string }[] = [
  { key: "inappropriate_name", label: "Inappropriate name" },
  { key: "inappropriate_photo", label: "Inappropriate photo" },
  { key: "harassment", label: "Harassment or abuse" },
  { key: "spam", label: "Spam" },
  { key: "other", label: "Other" },
];

type ReportModalProps = {
  visible: boolean;
  targetType: "crew" | "user";
  targetId: string;
  onClose: () => void;
};

/** Shared reason-picker + optional details sheet for reporting a Crew or a specific member — see
 * backend/routes/reports.php. Reused from crew/settings.tsx (report crew) and
 * crew/member/[id].tsx (report member). */
export function ReportModal({ visible, targetType, targetId, onClose }: ReportModalProps) {
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setReason(null);
    setDetails("");
    setSubmitting(false);
  }

  async function handleSubmit() {
    if (!reason || !isApiConfigured) return;
    setSubmitting(true);
    try {
      await api.reportContent(targetType, targetId, reason, details.trim() || undefined);
      reset();
      onClose();
      Alert.alert("Report Submitted", "Thanks — we'll take a look.");
    } catch {
      setSubmitting(false);
      Alert.alert("Couldn't Submit Report", "Please try again.");
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: 24 }}
        onPress={() => {
          reset();
          onClose();
        }}
      >
        <Pressable onPress={() => {}} className="gap-4 rounded-2xl border border-divider bg-surface p-5">
          <View className="gap-1.5">
            <Text className="heading-4 text-text-primary">{targetType === "crew" ? "Report Crew" : "Report Member"}</Text>
            <Text className="body-sm text-text-secondary">What&apos;s the issue? We review every report.</Text>
          </View>

          <View className="gap-2">
            {REASONS.map((r) => (
              <Pressable
                key={r.key}
                onPress={() => setReason(r.key)}
                className={`flex-row items-center gap-3 rounded-xl border px-4 py-3 ${reason === r.key ? "border-brand-yellow" : "border-divider"}`}
              >
                <View
                  className={`h-4 w-4 rounded-full border ${reason === r.key ? "border-brand-yellow bg-brand-yellow" : "border-divider"}`}
                />
                <Text className="body-md text-text-primary">{r.label}</Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            value={details}
            onChangeText={setDetails}
            placeholder="Add details (optional)"
            placeholderTextColor={colors.neutral.textSecondary}
            multiline
            numberOfLines={3}
            className="body-md rounded-xl border border-divider bg-background px-4 py-3 text-text-primary"
            style={{ outlineWidth: 0, outlineColor: "transparent", minHeight: 72, textAlignVertical: "top" }}
          />

          <View className="flex-row gap-3">
            <Pressable
              onPress={() => {
                reset();
                onClose();
              }}
              className="flex-1 items-center rounded-full border border-divider py-3.5"
            >
              <Text className="body-md font-body-semibold text-text-primary">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              disabled={!reason || submitting}
              style={{ opacity: !reason || submitting ? 0.5 : 1 }}
              className="flex-1 items-center rounded-full bg-error py-3.5"
            >
              <Text className="body-md font-body-semibold text-brand-white">{submitting ? "Submitting…" : "Submit Report"}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
