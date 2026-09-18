import { Pressable, Text, View } from "react-native";

import { CREW_ACTIVITY_REACTION_EMOJIS, type CrewActivityReactionEmoji, type CrewActivityReactions } from "@/lib/api";

const PRESSED_STYLE = ({ pressed }: { pressed: boolean }) => ({ opacity: pressed ? 0.7 : 1 });

type CrewEventReactionBarProps = {
  reactions: CrewActivityReactions;
  onReact: (emoji: CrewActivityReactionEmoji) => void;
};

/** Tap-to-react row for one crew activity event (🔥/👏, always visible so a reaction can be the
 * first one) — shared by the compact CrewFeedList widget and the full crew/activity screen so the
 * toggle look/feel is identical in both places. */
export function CrewEventReactionBar({ reactions, onReact }: CrewEventReactionBarProps) {
  return (
    <View className="flex-row gap-2">
      {CREW_ACTIVITY_REACTION_EMOJIS.map((emoji) => {
        const { count, reacted } = reactions[emoji];
        return (
          <Pressable
            key={emoji}
            onPress={() => onReact(emoji)}
            hitSlop={6}
            style={PRESSED_STYLE}
            className={`flex-row items-center gap-1 rounded-full border px-2.5 py-1 ${
              reacted ? "border-brand-yellow bg-brand-yellow/10" : "border-divider bg-background"
            }`}
          >
            <Text style={{ fontSize: 13 }}>{emoji}</Text>
            {count > 0 && (
              <Text className={`caption font-body-semibold ${reacted ? "text-brand-yellow" : "text-text-secondary"}`}>{count}</Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
