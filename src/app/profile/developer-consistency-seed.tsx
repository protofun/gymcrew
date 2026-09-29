import { useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { isTestId } from "@/constants/test-data";
import { seedConsistencyHistory } from "@/lib/dev-tools";
import { goBack } from "@/lib/navigation";
import { showToast } from "@/lib/toast";
import { DEVELOPER_MODE_EMAILS } from "@/store/developer-mode-store";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";
import { colors } from "@/theme";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const YEAR_OPTIONS = [1, 2, 3, 5];
const DENSITY_OPTIONS = [1, 2, 3, 4, 5];
const STRUCTURED_FROM_OPTIONS = [
  { label: "Always random", days: 0 },
  { label: "Last 3 months", days: 90 },
  { label: "Last 6 months", days: 180 },
  { label: "Last year", days: 365 },
  { label: "Always structured", days: Number.MAX_SAFE_INTEGER },
];

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="caption font-body-semibold text-text-secondary">{title.toUpperCase()}</Text>
      {subtitle && <Text className="body-sm text-text-secondary">{subtitle}</Text>}
      {children}
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      className={`rounded-full border px-4 py-2 ${active ? "border-brand-yellow bg-brand-yellow" : "border-divider bg-surface"}`}
    >
      <Text className={`body-sm font-body-semibold ${active ? "text-brand-iron" : "text-text-secondary"}`}>{label}</Text>
    </Pressable>
  );
}

/** A configurable generator for `lib/dev-tools.ts`'s `seedConsistencyHistory`, its own screen since a
 * real dev account rarely has the years of history `profile/training-consistency.tsx` is actually
 * meant to show — its own chips for how many years back, which weekdays the structured phase trains
 * on, how far back that structured phase reaches (older than that stays a random, inconsistent
 * stretch — the shape real training history actually has), and how many sessions/week the random
 * phase averages. */
export default function DeveloperConsistencySeedScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
  const isDeveloper = !!email && DEVELOPER_MODE_EMAILS.includes(email);

  const [yearsBack, setYearsBack] = useState(2);
  const [weekdays, setWeekdays] = useState<number[]>([0, 2, 4]); // Mon / Wed / Fri
  const [structuredFromDays, setStructuredFromDays] = useState(180);
  const [randomDensity, setRandomDensity] = useState(2);
  const testWorkoutCount = useWorkoutHistoryStore((state) => state.workouts.filter((workout) => isTestId(workout.id)).length);

  if (!isDeveloper) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top }} className="items-center justify-center bg-background px-6">
        <Text className="body-md text-center text-text-secondary">You don&apos;t have access to this screen.</Text>
        <Pressable onPress={() => goBack("/profile/developer-tools")} className="mt-4">
          <Text className="body-md font-body-semibold text-brand-yellow">Go back</Text>
        </Pressable>
      </View>
    );
  }

  function toggleWeekday(day: number) {
    setWeekdays((prev) => (prev.includes(day) ? prev.filter((candidate) => candidate !== day) : [...prev, day].sort((a, b) => a - b)));
  }

  function handleGenerate() {
    const added = seedConsistencyHistory({ yearsBack, weekdays, structuredFromDaysAgo: structuredFromDays, randomSessionsPerWeek: randomDensity });
    showToast(
      "success",
      added > 0 ? `Added ${added} workouts across ${yearsBack} year${yearsBack === 1 ? "" : "s"}` : "Nothing new to add",
      "Local only — never sent to the server. See it on the Training Consistency page.",
    );
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => goBack("/profile/developer-tools")} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Consistency Test Data</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: insets.bottom + 24, gap: 24 }} showsVerticalScrollIndicator={false}>
        <Section title="Years back" subtitle="How far the heatmap should go.">
          <View className="flex-row flex-wrap gap-2">
            {YEAR_OPTIONS.map((years) => (
              <Chip key={years} label={`${years} year${years === 1 ? "" : "s"}`} active={years === yearsBack} onPress={() => setYearsBack(years)} />
            ))}
          </View>
        </Section>

        <Section title="Structured from" subtitle="Older than this stays random and inconsistent — the shape real history actually has.">
          <View className="flex-row flex-wrap gap-2">
            {STRUCTURED_FROM_OPTIONS.map((option) => (
              <Chip key={option.label} label={option.label} active={option.days === structuredFromDays} onPress={() => setStructuredFromDays(option.days)} />
            ))}
          </View>
        </Section>

        <Section title="Structured training days" subtitle="Which weekdays the structured phase trains on.">
          <View className="flex-row flex-wrap gap-2">
            {WEEKDAY_LABELS.map((label, index) => (
              <Chip key={label} label={label} active={weekdays.includes(index)} onPress={() => toggleWeekday(index)} />
            ))}
          </View>
        </Section>

        <Section title="Random phase density" subtitle="Average sessions per week before the structured phase takes over.">
          <View className="flex-row flex-wrap gap-2">
            {DENSITY_OPTIONS.map((count) => (
              <Chip key={count} label={`${count}/week`} active={count === randomDensity} onPress={() => setRandomDensity(count)} />
            ))}
          </View>
        </Section>

        <Pressable onPress={handleGenerate} className="items-center rounded-full bg-brand-yellow py-4">
          <Text className="body-md font-body-bold text-brand-iron">Generate</Text>
        </Pressable>

        <Text className="caption text-center text-text-secondary">{`${testWorkoutCount} test workouts currently in the app.`}</Text>
      </ScrollView>
    </View>
  );
}
