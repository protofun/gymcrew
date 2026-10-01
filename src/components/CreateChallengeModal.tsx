import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { BottomSheet } from "@/components/BottomSheet";
import { HomeRowLead } from "@/components/HomeRowLead";
import { PillRow } from "@/components/PillRow";
import { CHALLENGE_TEMPLATES, type ChallengeTemplate } from "@/data/challenges";
import type { RivalCrewInput } from "@/lib/crew-league";
import { colors } from "@/theme";

const DURATION_OPTIONS = [7, 14, 30] as const;

type CreateChallengeModalProps = {
  visible: boolean;
  /** Same-division rival crews only — a battle should be a fair fight. */
  rivalCrews: RivalCrewInput[];
  onClose: () => void;
  onCreate: (template: ChallengeTemplate, opponent: RivalCrewInput, durationDays: number) => void;
};

export function CreateChallengeModal({ visible, rivalCrews, onClose, onCreate }: CreateChallengeModalProps) {
  const [template, setTemplate] = useState<ChallengeTemplate>(CHALLENGE_TEMPLATES[0]);
  const [opponentCrewName, setOpponentCrewName] = useState(rivalCrews[0]?.name);
  const [durationDays, setDurationDays] = useState<(typeof DURATION_OPTIONS)[number]>(14);

  const opponent = rivalCrews.find((crew) => crew.name === opponentCrewName) ?? rivalCrews[0];

  function handleCreate() {
    if (!opponent) return;
    onCreate(template, opponent, durationDays);
    onClose();
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} snapPoints={["65%", "92%"]}>
      <View className="flex-row items-center justify-between px-5 pb-2">
        <Text className="heading-4 text-text-primary">Challenge a Crew</Text>
        <Pressable onPress={onClose} hitSlop={12}>
          <Ionicons name="close" size={22} color={colors.neutral.textSecondary} />
        </Pressable>
      </View>

      <BottomSheetScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}>
        <View className="gap-5">
          <View className="gap-2">
            <Text className="body-sm text-text-secondary">Challenge Type</Text>
            <View>
              {CHALLENGE_TEMPLATES.map((option, index) => {
                const selected = option.id === template.id;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => setTemplate(option)}
                    className={`flex-row items-center gap-3 py-3 active:opacity-70 ${index === CHALLENGE_TEMPLATES.length - 1 ? "" : "border-b border-divider"}`}
                  >
                    <HomeRowLead kind="flat">
                      <Ionicons name={option.icon} size={18} color={selected ? colors.brand.yellow : colors.neutral.textSecondary} />
                    </HomeRowLead>
                    <View className="flex-1 gap-0.5">
                      <Text className={`body-sm font-body-semibold ${selected ? "text-brand-yellow" : "text-text-primary"}`}>{option.name}</Text>
                      <Text className="caption text-text-secondary" numberOfLines={1}>
                        {option.description}
                      </Text>
                    </View>
                    {selected && <Ionicons name="checkmark-circle" size={20} color={colors.brand.yellow} />}
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View className="gap-2">
            <Text className="body-sm text-text-secondary">Opponent Crew (your division)</Text>
            {rivalCrews.length === 0 ? (
              <Text className="caption text-text-secondary">No rival crews in your division yet — check back after this week&apos;s league.</Text>
            ) : (
              <PillRow options={rivalCrews.map((crew) => ({ key: crew.name, label: crew.name }))} value={opponentCrewName ?? null} onChange={setOpponentCrewName} wrap bleed={0} />
            )}
          </View>

          <View className="gap-2">
            <Text className="body-sm text-text-secondary">Duration</Text>
            <PillRow
              options={DURATION_OPTIONS.map((days) => ({ key: String(days), label: `${days} days` }))}
              value={String(durationDays)}
              onChange={(key) => setDurationDays(Number(key) as (typeof DURATION_OPTIONS)[number])}
              wrap
              bleed={0}
            />
          </View>

          <Pressable
            onPress={handleCreate}
            disabled={!opponent}
            className={`items-center rounded-full py-3.5 ${opponent ? "bg-brand-yellow" : "bg-surface"}`}
          >
            <Text className={`body-md font-body-bold ${opponent ? "text-brand-iron" : "text-text-secondary"}`}>Send Challenge</Text>
          </Pressable>
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
