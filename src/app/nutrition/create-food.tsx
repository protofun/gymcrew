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
  const { name, barcode, date } = useLocalSearchParams<{ name?: string; barcode?: string; date?: string }>();
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
    router.replace({ pathname: "/nutrition/food/[id]", params: { id: food.id, date } });
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={handleBack} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">{barcode ? "Add This Product" : "Create Food"}</Text>
      </View>

      {barcode && (
        <View className="flex-row items-center gap-1.5 border-b border-divider bg-surface px-4 py-2.5">
          <Ionicons name="barcode-outline" size={14} color={colors.neutral.textSecondary} />
          <Text className="caption text-text-secondary">{`Barcode ${barcode}`}</Text>
        </View>
      )}

      <CreateFoodForm initial={name ? { name } : undefined} onCancel={handleBack} onSave={handleSave} />
    </View>
  );
}
