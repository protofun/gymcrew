import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useEffect } from "react";
import { Platform, Pressable, Text, View, type LayoutChangeEvent } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
const FAB_SIZE = 58;
// How much of the FAB pokes up above the bar's top edge — smaller than half its own height, so it
// sits low and settled into the bar rather than floating way above it.
const FAB_RAISE = FAB_SIZE * 0.32;

const CIRCLE_SIZE = 46;
const BAR_PADDING_X = 10;
const BAR_PADDING_TOP = 10;
const SPRING_CONFIG = { damping: 16, mass: 0.5, stiffness: 200 };
// A quiet, neutral lift for the FAB — depth, not a colored glow. GymCrew's other "raised" surfaces
// (cards, sheets) all use this same restrained elevation, so the FAB doesn't stand out as a
// different, flashier kind of UI than the rest of the app.
const FAB_SHADOW = Platform.select({
  ios: { shadowColor: "#000000", shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  default: { elevation: 8 },
});

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const barWidth = useSharedValue(0);
  const indicatorX = useSharedValue(0);
  const indicatorOpacity = useSharedValue(1);
  const itemCount = state.routes.length;

  function positionFor(index: number, width: number) {
    // `width` is the bar's full measured frame, which includes its own horizontal padding — the
    // tab items themselves only occupy the space inside that padding, so the indicator's per-item
    // math has to use the same narrower width or it drifts further off with every tab to the right.
    const contentWidth = width - BAR_PADDING_X * 2;
    const itemWidth = contentWidth / itemCount;
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
    indicatorOpacity.value = withSpring(focused ? 0 : 1, SPRING_CONFIG);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.index]);

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: indicatorOpacity.value,
    transform: [{ translateX: indicatorX.value }],
  }));

  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: insets.bottom || 16 }}>
      <View
        onLayout={handleLayout}
        style={{ paddingHorizontal: BAR_PADDING_X, paddingTop: BAR_PADDING_TOP, borderRadius: 32 }}
        className="flex-row border border-divider bg-surface"
      >
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              top: BAR_PADDING_TOP,
              left: BAR_PADDING_X,
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
            return <FabButton key={route.key} focused={isFocused} onPress={onPress} />;
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
                  size={21}
                  color={isFocused ? colors.brand.iron : colors.neutral.textSecondary}
                />
              </View>
              <Text numberOfLines={1} className={`caption ${isFocused ? "opacity-0" : "text-text-secondary"}`}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** A chunky, rounded-off cross — deliberately not the thin Ionicons "add" glyph, so the FAB reads as
 * its own distinct mark rather than just another icon-in-a-circle like the rest of the bar. */
function PlusMark({ size, color }: { size: number; color: string }) {
  const thickness = size * 0.24;
  const radius = thickness / 2;
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ position: "absolute", top: (size - thickness) / 2, left: 0, width: size, height: thickness, borderRadius: radius, backgroundColor: color }} />
      <View style={{ position: "absolute", left: (size - thickness) / 2, top: 0, width: thickness, height: size, borderRadius: radius, backgroundColor: color }} />
    </View>
  );
}

function FabButton({ focused, onPress }: { focused: boolean; onPress: () => void }) {
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);
  const bubbleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const markStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotate.value}deg` }] }));

  function handlePress() {
    // A one-shot twist-and-pop on tap — motion as the reward for pressing it, not a permanent
    // animation running whether you're touching it or not.
    scale.value = withSequence(withSpring(1.18, { damping: 8, stiffness: 320 }), withSpring(1, SPRING_CONFIG));
    rotate.value = withSequence(withSpring(90, { damping: 9, stiffness: 260 }), withSpring(0, SPRING_CONFIG));
    onPress();
  }

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={() => {
        scale.value = withSpring(0.88, SPRING_CONFIG);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, SPRING_CONFIG);
      }}
      className="flex-1 items-center pb-2.5"
    >
      <Animated.View
        style={[
          {
            width: FAB_SIZE,
            height: FAB_SIZE,
            borderRadius: FAB_SIZE / 2,
            marginTop: -FAB_RAISE,
            backgroundColor: colors.brand.yellow,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 4,
            borderColor: colors.neutral.background,
            ...FAB_SHADOW,
          },
          bubbleStyle,
        ]}
      >
        <Animated.View style={markStyle}>
          <PlusMark size={22} color={colors.brand.iron} />
        </Animated.View>
        {focused && (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              width: FAB_SIZE + 8,
              height: FAB_SIZE + 8,
              borderRadius: (FAB_SIZE + 8) / 2,
              borderWidth: 2,
              borderColor: colors.brand.yellow,
            }}
          />
        )}
      </Animated.View>
    </Pressable>
  );
}
