import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TabBarFab } from "@/components/TabBarFab";
import { colors } from "@/theme";

const TAB_ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  home: { active: "home", inactive: "home-outline" },
  crew: { active: "people", inactive: "people-outline" },
  ranks: { active: "trophy", inactive: "trophy-outline" },
  profile: { active: "person", inactive: "person-outline" },
};

// The "+" tab is the app's main feature (quick log). It always renders as a raised circle instead
// of the icon+label treatment other tabs use.
const LOG_ROUTE_NAME = "log";
const CIRCLE_SIZE = 46;
const BAR_PADDING_X = 10;
const BAR_PADDING_TOP = 10;

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: insets.bottom || 16 }}>
      <View
        style={{ paddingHorizontal: BAR_PADDING_X, paddingTop: BAR_PADDING_TOP, borderRadius: 32 }}
        className="flex-row border border-divider bg-surface"
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const label = typeof options.title === "string" ? options.title : route.name;

          function onPress() {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          }

          if (route.name === LOG_ROUTE_NAME) {
            return <TabBarFab key={route.key} focused={isFocused} onPress={onPress} />;
          }

          const icons = TAB_ICONS[route.name] ?? TAB_ICONS.home;

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              className="flex-1 items-center pb-2.5"
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <View style={{ height: CIRCLE_SIZE, width: CIRCLE_SIZE }} className="items-center justify-center">
                <Ionicons
                  name={isFocused ? icons.active : icons.inactive}
                  size={22}
                  color={isFocused ? colors.brand.yellow : colors.neutral.textSecondary}
                />
              </View>
              <Text numberOfLines={1} className={`caption ${isFocused ? "font-body-semibold text-brand-yellow" : "text-text-secondary"}`}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
