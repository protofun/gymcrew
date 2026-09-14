import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EditableText } from "@/components/EditableText";
import { CHANGELOG, type ChangelogEntry, type ChangelogEntryType } from "@/data/changelog";
import { goBack } from "@/lib/navigation";
import { colors } from "@/theme";

const TYPE_CONFIG: Record<ChangelogEntryType, { label: string; color: string }> = {
  feature: { label: "Feature", color: colors.semantic.info },
  update: { label: "Update", color: colors.semantic.warning },
  bug: { label: "Bug Fix", color: colors.semantic.error },
};

function ChangelogRow({ entry, isLast }: { entry: ChangelogEntry; isLast: boolean }) {
  const config = TYPE_CONFIG[entry.type];
  const dateLabel = new Date(entry.publishedAtMs).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <View className="flex-row gap-3">
      <View className="items-center">
        <View className="mt-1.5 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: config.color }} />
        {!isLast && <View className="w-px flex-1" style={{ backgroundColor: colors.neutral.divider }} />}
      </View>

      <View className={`flex-1 gap-1.5 ${isLast ? "" : "pb-7"}`}>
        <EditableText id={`profile.changelog.${entry.id}.date`} className="caption text-text-secondary">
          {dateLabel}
        </EditableText>

        <View className="flex-row items-start justify-between gap-2">
          <EditableText id={`profile.changelog.${entry.id}.title`} className="body-md flex-1 font-body-semibold text-text-primary">
            {entry.title}
          </EditableText>
          <View className="flex-row items-center gap-1.5 rounded-full px-2.5 py-1" style={{ backgroundColor: `${config.color}22` }}>
            <Text className="caption font-body-semibold" style={{ color: config.color }}>
              {config.label}
            </Text>
          </View>
        </View>

        <EditableText id={`profile.changelog.${entry.id}.description`} className="body-sm text-text-secondary">
          {entry.description}
        </EditableText>
      </View>
    </View>
  );
}

export default function ChangelogScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => goBack("/(tabs)/profile")} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Changelog</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        {CHANGELOG.map((entry, index) => (
          <ChangelogRow key={entry.id} entry={entry} isLast={index === CHANGELOG.length - 1} />
        ))}
      </ScrollView>
    </View>
  );
}
