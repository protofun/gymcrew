import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { HOME_ROW_DETAIL, HOME_ROW_TITLE } from "@/components/homeStyle";
import { HomeRowLead } from "@/components/HomeRowLead";
import { ContextMenu } from "@/components/ui/molecules/context-menu";
import { colors } from "@/theme";

type WorkoutListRowProps = {
  name: string;
  dateLabel: string;
  detail: string;
  hasPr: boolean;
  isLast: boolean;
  /** Omit for a plain, non-interactive row — used where there's nothing to open (another crew
   * member's workout, which only ever comes through as a light summary, not the full object a
   * share card or the real summary screen needs). */
  onPress?: () => void;
  /** Omit to skip the long-press menu entirely and make a plain tap-to-open row instead — most
   * callers have this (any real `CompletedWorkout`); the few that only have a summary don't. */
  onShare?: () => void;
};

/** One workout in a list — the same shape everywhere a workout list appears (`profile/history.tsx`'s
 * Recent Workouts, `workout/history.tsx`'s day list, `crew/member/[id].tsx`'s Workouts tab): the same
 * leading circle every flowing-list row opens with (a trophy for a PR session, a plain dumbbell
 * otherwise), flowing — no boxed card — and, wherever there's a real workout behind it, a genuine
 * long-press menu (Reacticx `context-menu`) to view or share it without necessarily navigating in
 * first. A plain tap still opens the full summary either way — the menu adds Share, it doesn't
 * replace the tap (see the GymCrew patch note on `ContextMenu.Trigger`'s `onPress` for why the tap
 * lives on the trigger itself rather than a second, nested Pressable). */
export function WorkoutListRow({ name, dateLabel, detail, hasPr, isLast, onPress, onShare }: WorkoutListRowProps) {
  const content = (
    <View className={`flex-row items-center gap-3 py-3.5 ${isLast ? "" : "border-b border-divider"}`}>
      <HomeRowLead kind="flat">
        <Ionicons name={hasPr ? "trophy" : "barbell-outline"} size={18} color={hasPr ? colors.brand.yellow : colors.neutral.textSecondary} />
      </HomeRowLead>
      <View className="flex-1 gap-0.5">
        <Text style={[HOME_ROW_TITLE, { fontSize: 17, lineHeight: 19 }]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={HOME_ROW_DETAIL} numberOfLines={1}>{`${dateLabel} · ${detail}`}</Text>
      </View>
      {onPress && <Ionicons name="chevron-forward" size={16} color={colors.neutral.textSecondary} />}
    </View>
  );

  if (!onPress) return content;

  if (!onShare) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
        {content}
      </Pressable>
    );
  }

  return (
    <ContextMenu theme="dark">
      <ContextMenu.Trigger onPress={onPress}>{content}</ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Item onPress={onPress}>
          <ContextMenu.Item.Icon>
            <Ionicons name="eye-outline" size={20} color={colors.brand.white} />
          </ContextMenu.Item.Icon>
          <ContextMenu.Item.Label>View Summary</ContextMenu.Item.Label>
        </ContextMenu.Item>
        <ContextMenu.Item onPress={onShare}>
          <ContextMenu.Item.Icon>
            <Ionicons name="share-outline" size={20} color={colors.brand.white} />
          </ContextMenu.Item.Icon>
          <ContextMenu.Item.Label>Share</ContextMenu.Item.Label>
        </ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu>
  );
}
