import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TabBarFab } from "@/components/TabBarFab";
import { colors } from "@/theme";

export type NutritionNavRoute = "diary" | "foods" | "progress" | "history";

const NAV_ITEMS: {
  key: NutritionNavRoute;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  path: "/nutrition" | "/nutrition/my-foods" | "/nutrition/progress" | "/nutrition/history";
}[] = [
  { key: "diary", label: "Diary", icon: "book-outline", activeIcon: "book", path: "/nutrition" },
  { key: "foods", label: "Foods", icon: "fast-food-outline", activeIcon: "fast-food", path: "/nutrition/my-foods" },
  { key: "progress", label: "Progress", icon: "trending-up-outline", activeIcon: "trending-up", path: "/nutrition/progress" },
  { key: "history", label: "History", icon: "bar-chart-outline", activeIcon: "bar-chart", path: "/nutrition/history" },
];

/** A section-local bottom nav for Nutrition — same chrome as the app's main `TabBar` (rounded bar,
 * raised "+" FAB in the middle, same `TabBarFab` component and press animation) but scoped to the 4
 * Nutrition hub screens, since Nutrition lives as a pushed stack outside the main tab bar and
 * previously had no consistent way to hop between its own sections. Mounted fixed at the bottom of
 * each hub screen (Diary/Foods/Progress/History) rather than via a nested Tabs navigator, since
 * sub-screens (food detail, meal builder, ...) shouldn't show it. */
export function NutritionNavBar({ active, dateKey }: { active: NutritionNavRoute; dateKey: string }) {
  const insets = useSafeAreaInsets();
  const leftItems = NAV_ITEMS.slice(0, 2);
  const rightItems = NAV_ITEMS.slice(2);

  return (
    <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingBottom: insets.bottom || 16 }}>
      <View style={{ paddingHorizontal: 10, paddingTop: 10, borderRadius: 32 }} className="flex-row border border-divider bg-surface">
        {leftItems.map((item) => (
          <NavTab key={item.key} item={item} isActive={active === item.key} />
        ))}

        <TabBarFab onPress={() => router.push({ pathname: "/nutrition/add", params: { date: dateKey } })} />

        {rightItems.map((item) => (
          <NavTab key={item.key} item={item} isActive={active === item.key} />
        ))}
      </View>
    </View>
  );
}

function NavTab({ item, isActive }: { item: (typeof NAV_ITEMS)[number]; isActive: boolean }) {
  return (
    <Pressable
      onPress={() => !isActive && router.replace(item.path)}
      className="flex-1 items-center pb-2.5"
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <View style={{ height: 46, width: 46 }} className="items-center justify-center">
        <Ionicons name={isActive ? item.activeIcon : item.icon} size={22} color={isActive ? colors.brand.yellow : colors.neutral.textSecondary} />
      </View>
      <Text numberOfLines={1} className={`caption ${isActive ? "font-body-semibold text-brand-yellow" : "text-text-secondary"}`}>
        {item.label}
      </Text>
    </Pressable>
  );
}
