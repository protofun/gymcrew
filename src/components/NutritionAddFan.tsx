import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { FanMenu } from "@/components/ui/molecules/fan-menu";
import { colors, fontFamily } from "@/theme";

type Action = { label: string; icon: keyof typeof Ionicons.glyphMap; badge?: string; onPress: () => void };

const ITEM_SIZE = 64;

/** The Nutrition tab's "add" button — one round button that fans out into the five ways to log something
 * (Reacticx `fan-menu`), so adding is one tap plus one choice from anywhere in the section. It positions
 * itself against the screen, so render it as a direct child of the full-screen container.
 *
 * Same shape as `TabBarFan`'s own "+" now — small round icon circles on one arc with a label underneath
 * (`layout="arc"`, the default), not the wide text pills this used to be: five things you tap once, not
 * five things you read. `bottom-center`, not the corner it used to sit in — a fan anchored at the very
 * right edge pushed items toward/off that edge. */
export function NutritionAddFan({ dateKey, bottom }: { dateKey: string; bottom: number }) {
  const actions: Action[] = [
    { label: "Search", icon: "search", onPress: () => router.push({ pathname: "/nutrition/add", params: { date: dateKey } }) },
    { label: "Barcode", icon: "barcode", onPress: () => router.push({ pathname: "/nutrition/scan-barcode", params: { date: dateKey } }) },
    { label: "Scan", icon: "camera", badge: "AI", onPress: () => router.push({ pathname: "/nutrition/scan-meal", params: { date: dateKey } }) },
    { label: "Quick add", icon: "flash", onPress: () => router.push({ pathname: "/nutrition/quick-add", params: { date: dateKey } }) },
    { label: "Create", icon: "create", onPress: () => router.push({ pathname: "/nutrition/create-food", params: { date: dateKey } }) },
  ];

  return (
    <FanMenu position="bottom-center" offset={{ vertical: bottom, horizontal: 0 }} buttonSize={58} direction="up" spread={40} spacing={150} tilt={0} stagger={40}>
      <FanMenu.Trigger style={{ backgroundColor: colors.brand.yellow }}>
        <Ionicons name="add" size={30} color={colors.brand.iron} />
      </FanMenu.Trigger>
      {actions.map((action) => (
        <FanMenu.Item
          key={action.label}
          value={action.label}
          onPress={action.onPress}
          style={{ width: ITEM_SIZE, flexDirection: "column", backgroundColor: "transparent", paddingHorizontal: 0, paddingVertical: 0, gap: 5, shadowOpacity: 0, elevation: 0 }}
        >
          <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.neutral.surfaceElevated, borderWidth: 1, borderColor: colors.neutral.divider }} className="items-center justify-center">
            <Ionicons name={action.icon} size={20} color={colors.brand.yellow} />
            {action.badge && (
              <View style={{ position: "absolute", top: -4, right: -6, backgroundColor: colors.brand.yellow }} className="rounded-md px-1 py-0.5">
                <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 8, color: colors.brand.iron }}>{action.badge}</Text>
              </View>
            )}
          </View>
          <FanMenu.Label style={{ color: colors.brand.white, fontFamily: fontFamily.bodySemiBold, fontSize: 10.5, textAlign: "center", width: ITEM_SIZE }}>{action.label}</FanMenu.Label>
        </FanMenu.Item>
      ))}
    </FanMenu>
  );
}
