import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";

import { CreateFoodForm } from "@/components/CreateFoodForm";
import { useCustomFoodsStore } from "@/store/custom-foods-store";
import { colors } from "@/theme";

export default function CreateFoodScreen() {
  const insets = useSafeAreaInsets();
  const posthog = usePostHog();
  const { name, barcode, date, slot } = useLocalSearchParams<{ name?: string; barcode?: string; date?: string; slot?: string }>();
  const addFood = useCustomFoodsStore((state) => state.addFood);

  function handleBack() {
    if (router.canGoBack()) router.back();
    else router.replace("/nutrition/add");
  }

  function handleSave(input: Parameters<typeof addFood>[0]) {
    // Carries a scanned-but-unrecognized barcode through onto the new food (see NUTRITION.md
    // section 12) — not a form field, since it's only ever set by the scan flow, never typed in.
    const food = addFood(barcode ? { ...input, barcode } : input);
    posthog.capture("custom_food_created", {
      from_barcode_scan: !!barcode,
      has_photo: !!input.photoUrl,
      has_brand: !!input.brand,
      serving_unit: input.servingUnit,
    });
    router.replace({ pathname: "/nutrition/food/[id]", params: { id: food.id, date, slot } });
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top + 8 }} className="bg-background">
      <View className="flex-row items-center justify-between px-4">
        <Pressable onPress={handleBack} hitSlop={8} className="h-10 w-10 items-center justify-center rounded-full border border-divider bg-surface" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={19} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="caption font-body-bold text-text-secondary" style={{ letterSpacing: 1.4 }}>
          {barcode ? "ADD THIS PRODUCT" : "CREATE FOOD"}
        </Text>
        <View className="h-10 w-10" />
      </View>

      {barcode && (
        <View className="mx-5 mt-3 flex-row items-center gap-1.5 self-start rounded-full bg-surface px-3 py-1.5">
          <Ionicons name="barcode-outline" size={14} color={colors.neutral.textSecondary} />
          <Text className="caption text-text-secondary">{`Barcode ${barcode}`}</Text>
        </View>
      )}

      <CreateFoodForm initial={name ? { name } : undefined} onCancel={handleBack} onSave={handleSave} />
    </View>
  );
}
