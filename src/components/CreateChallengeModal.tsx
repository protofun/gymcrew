import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.7)", paddingHorizontal: 24 }}>
        <Animated.View
          entering={FadeInUp.springify().damping(16).mass(0.7)}
          className="w-full gap-4 rounded-3xl border border-divider bg-surface p-5"
          style={{ maxHeight: "85%" }}
        >
          <View className="flex-row items-center justify-between">
            <Text className="heading-4 text-text-primary">Challenge a Crew</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={colors.neutral.textSecondary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="gap-4">
              <View className="gap-2">
                <Text className="body-sm text-text-secondary">Challenge Type</Text>
                <View className="gap-2">
                  {CHALLENGE_TEMPLATES.map((option) => {
                    const selected = option.id === template.id;
                    return (
                      <Pressable
                        key={option.id}
                        onPress={() => setTemplate(option)}
                        className={`flex-row items-center gap-3 rounded-xl border p-3 ${selected ? "border-brand-yellow bg-brand-yellow/10" : "border-divider bg-background"}`}
                      >
                        <Ionicons name={option.icon} size={18} color={selected ? colors.brand.yellow : colors.neutral.textSecondary} />
                        <View className="flex-1 gap-0.5">
                          <Text className={`body-sm font-body-semibold ${selected ? "text-brand-yellow" : "text-text-primary"}`}>
                            {option.name}
                          </Text>
                          <Text className="caption text-text-secondary" numberOfLines={1}>
                            {option.description}
                          </Text>
                        </View>
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
                  <View className="flex-row flex-wrap gap-2">
                    {rivalCrews.map((crew) => {
                      const selected = crew.name === opponentCrewName;
                      return (
                        <Pressable
                          key={crew.name}
                          onPress={() => setOpponentCrewName(crew.name)}
                          className={`rounded-full border px-3 py-2 ${selected ? "border-brand-yellow bg-brand-yellow" : "border-divider bg-background"}`}
                        >
                          <Text className={`caption font-body-semibold ${selected ? "text-brand-iron" : "text-text-secondary"}`}>
                            {crew.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>

              <View className="gap-2">
                <Text className="body-sm text-text-secondary">Duration</Text>
                <View className="flex-row gap-2">
                  {DURATION_OPTIONS.map((days) => {
                    const selected = days === durationDays;
                    return (
                      <Pressable
                        key={days}
                        onPress={() => setDurationDays(days)}
                        className={`flex-1 items-center rounded-xl border py-2.5 ${selected ? "border-brand-yellow bg-brand-yellow" : "border-divider bg-background"}`}
                      >
                        <Text className={`body-sm font-body-semibold ${selected ? "text-brand-iron" : "text-text-secondary"}`}>
                          {days} days
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          </ScrollView>

          <Pressable
            onPress={handleCreate}
            disabled={!opponent}
            className={`items-center rounded-full py-3.5 ${opponent ? "bg-brand-yellow" : "bg-surface"}`}
          >
            <Text className={`body-md font-body-bold ${opponent ? "text-brand-iron" : "text-text-secondary"}`}>Send Challenge</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}
