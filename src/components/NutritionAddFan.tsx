import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { FanMenu } from "@/components/ui/molecules/fan-menu";
import { colors, fontFamily } from "@/theme";

type Action = { label: string; badge?: string; onPress: () => void };

/** The Nutrition tab's "add" button — one round button that fans out into the five ways to log something
 * (Reacticx `fan-menu`), so adding is one tap plus one choice from anywhere in the section. It positions
 * itself against the screen, so render it as a direct child of the full-screen container. */
export function NutritionAddFan({ dateKey, bottom }: { dateKey: string; bottom: number }) {
  const actions: Action[] = [
    { label: "Search food", onPress: () => router.push({ pathname: "/nutrition/add", params: { date: dateKey } }) },
    { label: "Scan barcode", onPress: () => router.push({ pathname: "/nutrition/scan-barcode", params: { date: dateKey } }) },
    { label: "Scan a meal", badge: "AI", onPress: () => router.push({ pathname: "/nutrition/scan-meal", params: { date: dateKey } }) },
    { label: "Quick add", onPress: () => router.push({ pathname: "/nutrition/quick-add", params: { date: dateKey } }) },
    { label: "Create food", onPress: () => router.push({ pathname: "/nutrition/create-food", params: { date: dateKey } }) },
  ];

  return (
    <FanMenu position="bottom-right" offset={{ vertical: bottom, horizontal: 16 }} buttonSize={58} direction="up" itemDirection="left" spacing={56} spread={2}>
      <FanMenu.Trigger style={{ backgroundColor: colors.brand.yellow }}>
        <Ionicons name="add" size={30} color={colors.brand.iron} />
      </FanMenu.Trigger>
      {actions.map((action) => (
        <FanMenu.Item key={action.label} value={action.label} onPress={action.onPress} style={{ backgroundColor: colors.neutral.surfaceElevated, borderWidth: 1, borderColor: colors.neutral.divider, paddingHorizontal: 16, paddingVertical: 9 }}>
          <View className="flex-row items-center gap-2">
            <FanMenu.Label style={{ color: colors.brand.white, fontFamily: fontFamily.bodySemiBold, fontSize: 14 }}>{action.label}</FanMenu.Label>
            {action.badge && (
              <View style={{ backgroundColor: colors.brand.yellow }} className="rounded-md px-1.5 py-0.5">
                <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 9, color: colors.brand.iron }}>{action.badge}</Text>
              </View>
            )}
          </View>
        </FanMenu.Item>
      ))}
    </FanMenu>
  );
}
