import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, Text, View, type ImageSourcePropType } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { nutritionIcons } from "@/constants/images";
import { leaveNutrition, switchNutritionSection, type NutritionSection } from "@/lib/nutrition-nav";
import { colors } from "@/theme";

const NAV_ITEMS: { key: NutritionSection; label: string; icon: ImageSourcePropType }[] = [
  { key: "diary", label: "Diary", icon: nutritionIcons.calendar },
  { key: "foods", label: "Foods", icon: nutritionIcons.myFoods },
  { key: "progress", label: "Progress", icon: nutritionIcons.progress },
  { key: "history", label: "History", icon: nutritionIcons.history },
];

const ICON_SLOT = 44;
const BAR_CLASS = "border border-divider bg-surface";
const BAR_STYLE = { paddingTop: 10, borderRadius: 32 };

/** The bottom of Nutrition, which is its own environment: the four hub pages in a rounded bar (the same
 * look as the app's own), and next to it a separate Home button that leaves Nutrition — always in the same
 * spot, so getting back to the rest of the app is one tap from any of the four. Sub-screens (food detail,
 * meal builder, ...) don't show it. */
export function NutritionNavBar({ active }: { active: NutritionSection }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: insets.bottom || 16 }} className="flex-row items-stretch gap-2">
      <Pressable onPress={leaveNutrition} accessibilityLabel="Back to the app" className={`items-center px-3.5 pb-2.5 ${BAR_CLASS}`} style={({ pressed }) => ({ ...BAR_STYLE, opacity: pressed ? 0.7 : 1 })}>
        <View style={{ height: ICON_SLOT, width: ICON_SLOT }} className="items-center justify-center">
          <Ionicons name="home" size={22} color={colors.brand.yellow} />
        </View>
        <Text className="caption font-body-semibold text-brand-yellow">Home</Text>
      </Pressable>

      <View style={{ ...BAR_STYLE, paddingHorizontal: 6 }} className={`flex-1 flex-row ${BAR_CLASS}`}>
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => !isActive && switchNutritionSection(item.key)}
              className="flex-1 items-center pb-2.5"
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <View style={{ height: ICON_SLOT, width: ICON_SLOT }} className="items-center justify-center">
                <Image source={item.icon} resizeMode="contain" style={{ width: 30, height: 30, opacity: isActive ? 1 : 0.5 }} />
              </View>
              <Text numberOfLines={1} className={`caption ${isActive ? "font-body-semibold text-brand-yellow" : "text-text-secondary"}`}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
