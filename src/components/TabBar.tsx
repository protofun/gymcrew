import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useEffect } from "react";
import { Platform, Pressable, Text, View, type LayoutChangeEvent } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/theme";

const TAB_ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  home: { active: "home", inactive: "home-outline" },
  crew: { active: "people", inactive: "people-outline" },
  ranks: { active: "trophy", inactive: "trophy-outline" },
  profile: { active: "person", inactive: "person-outline" },
};

// The "+" tab is the app's main feature (quick log). It always renders as a
// raised, glowing circle instead of the icon+label treatment other tabs use.
const LOG_ROUTE_NAME = "log";
const FAB_SIZE = 60;

const CIRCLE_SIZE = 52;
const ROW_PADDING_TOP = 10;
const SPRING_CONFIG = { damping: 16, mass: 0.5, stiffness: 180 };
const FAB_SHADOW = Platform.select({
  ios: {
    shadowColor: colors.brand.yellow,
    shadowOpacity: 0.55,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  default: { elevation: 10 },
});

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const barWidth = useSharedValue(0);
  const indicatorX = useSharedValue(0);
  const indicatorOpacity = useSharedValue(1);
  const fabGlow = useSharedValue(1);
  const itemCount = state.routes.length;

  function positionFor(index: number, width: number) {
    const itemWidth = width / itemCount;
    return index * itemWidth + (itemWidth - CIRCLE_SIZE) / 2;
  }

  function handleLayout(event: LayoutChangeEvent) {
    const width = event.nativeEvent.layout.width;
    barWidth.value = width;
    indicatorX.value = positionFor(state.index, width);
    indicatorOpacity.value = state.routes[state.index].name === LOG_ROUTE_NAME ? 0 : 1;
  }

  useEffect(() => {
    if (barWidth.value === 0) return;
    const focused = state.routes[state.index].name === LOG_ROUTE_NAME;
    indicatorX.value = withSpring(positionFor(state.index, barWidth.value), SPRING_CONFIG);
    indicatorOpacity.value = withTiming(focused ? 0 : 1, { duration: 150 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.index]);

  useEffect(() => {
    fabGlow.value = withRepeat(
      withSequence(withTiming(1.08, { duration: 900 }), withTiming(1, { duration: 900 })),
      -1,
      true,
    );
  }, [fabGlow]);

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: indicatorOpacity.value,
    transform: [{ translateX: indicatorX.value }],
  }));

  const fabGlowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabGlow.value }],
  }));

  return (
    <View
      onLayout={handleLayout}
      style={{ paddingBottom: insets.bottom || 12, paddingTop: ROW_PADDING_TOP }}
      className="flex-row border-t border-divider bg-surface"
    >
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            top: ROW_PADDING_TOP,
            width: CIRCLE_SIZE,
            height: CIRCLE_SIZE,
            borderRadius: CIRCLE_SIZE / 2,
            backgroundColor: colors.brand.yellow,
          },
          indicatorStyle,
        ]}
      />

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
          return (
            <Pressable key={route.key} onPress={onPress} className="flex-1 items-center">
              <Animated.View
                style={[
                  {
                    width: FAB_SIZE,
                    height: FAB_SIZE,
                    borderRadius: FAB_SIZE / 2,
                    marginTop: -FAB_SIZE / 2 - ROW_PADDING_TOP / 2,
                    backgroundColor: colors.brand.yellow,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: isFocused ? 3 : 0,
                    borderColor: colors.brand.white,
                    ...FAB_SHADOW,
                  },
                  fabGlowStyle,
                ]}
              >
                <Ionicons name="add" size={28} color={colors.brand.iron} />
              </Animated.View>
            </Pressable>
          );
        }

        const icons = TAB_ICONS[route.name] ?? TAB_ICONS.home;

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            className="flex-1 items-center"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <View style={{ height: CIRCLE_SIZE, width: CIRCLE_SIZE }} className="items-center justify-center">
              <Ionicons
                name={isFocused ? icons.active : icons.inactive}
                size={22}
                color={isFocused ? colors.brand.iron : colors.neutral.textSecondary}
              />
            </View>
            <Text
              numberOfLines={1}
              className={`caption ${isFocused ? "opacity-0" : "text-text-secondary"}`}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
