import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";

import { BottomSheet } from "@/components/BottomSheet";
import { HomeRowLead } from "@/components/HomeRowLead";
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
 * crew/member/[id].tsx (report member). Same Reacticx `BottomSheet` shell every other Crew sheet
 * uses now, its reasons a flowing hairline-divided list (a radio dot in a `HomeRowLead` circle)
 * instead of a bordered box per reason. */
export function ReportModal({ visible, targetType, targetId, onClose }: ReportModalProps) {
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setReason(null);
    setDetails("");
    setSubmitting(false);
  }

  function handleClose() {
    reset();
    onClose();
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
    <BottomSheet visible={visible} onClose={handleClose} keyboardAware>
      <View className="gap-4 px-4 pb-4 pt-2">
        <View className="gap-1">
          <Text className="heading-4 text-text-primary">{targetType === "crew" ? "Report Crew" : "Report Member"}</Text>
          <Text className="body-sm text-text-secondary">What&apos;s the issue? We review every report.</Text>
        </View>

        <View>
          {REASONS.map((r, index) => {
            const selected = reason === r.key;
            return (
              <Pressable
                key={r.key}
                onPress={() => setReason(r.key)}
                className={`flex-row items-center gap-3 py-3 ${index === REASONS.length - 1 ? "" : "border-b border-divider"}`}
              >
                <HomeRowLead kind="flat">
                  <Ionicons name={selected ? "radio-button-on" : "radio-button-off"} size={18} color={selected ? colors.brand.yellow : colors.neutral.textSecondary} />
                </HomeRowLead>
                <Text className={`body-md flex-1 ${selected ? "font-body-semibold text-brand-yellow" : "text-text-primary"}`}>{r.label}</Text>
              </Pressable>
            );
          })}
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

        <Pressable
          onPress={handleSubmit}
          disabled={!reason || submitting}
          style={{ opacity: !reason || submitting ? 0.5 : 1 }}
          className="items-center rounded-full bg-error py-3.5"
        >
          <Text className="body-md font-body-semibold text-brand-white">{submitting ? "Submitting…" : "Submit Report"}</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}
