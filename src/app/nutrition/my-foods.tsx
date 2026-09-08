import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CreateFoodForm } from "@/components/CreateFoodForm";
import { IconBadge } from "@/components/IconBadge";
import { SkewedStat } from "@/components/SkewedStat";
import type { Food } from "@/data/nutrition-foods";
import { useCustomFoodsStore } from "@/store/custom-foods-store";
import { colors } from "@/theme";

/** Custom foods management (see NUTRITION.md section 11) — every food the user has created,
 * editable or deletable in place. Favorites/frequently-used already live on the Add Food hub;
 * this screen is specifically the "foods I made myself" list. */
export default function MyFoodsScreen() {
  const insets = useSafeAreaInsets();
  const foods = useCustomFoodsStore((state) => state.foods);
  const updateFood = useCustomFoodsStore((state) => state.updateFood);
  const removeFood = useCustomFoodsStore((state) => state.removeFood);
  const [editingFood, setEditingFood] = useState<Food | null>(null);

  function handleDelete(food: Food) {
    Alert.alert("Delete Food", `Remove "${food.name}" from My Foods?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => removeFood(food.id) },
    ]);
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/nutrition"))} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">My Foods</Text>
        <Pressable onPress={() => router.push("/nutrition/create-food")} hitSlop={8} style={{ position: "absolute", right: 16 }}>
          <Ionicons name="add-circle" size={26} color={colors.brand.yellow} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 10 }} showsVerticalScrollIndicator={false}>
        {foods.length === 0 ? (
          <View className="items-center gap-2 rounded-2xl border border-dashed border-divider py-14">
            <Ionicons name="fast-food-outline" size={28} color={colors.neutral.textSecondary} />
            <Text className="body-md text-text-secondary">No custom foods yet.</Text>
            <Text className="body-sm text-text-secondary">Can&apos;t find something? Create it.</Text>
          </View>
        ) : (
          foods.map((food) => (
            <Pressable
              key={food.id}
              onPress={() => setEditingFood(food)}
              className="flex-row items-center gap-3 rounded-2xl border border-divider bg-surface px-3.5 py-3"
            >
              <IconBadge icon="fast-food-outline" color={colors.brand.yellow} size={36} />
              <View className="flex-1 gap-0.5">
                <Text className="body-md font-body-semibold text-text-primary" numberOfLines={1}>
                  {food.name}
                  {food.brand ? <Text className="body-sm text-text-secondary"> — {food.brand}</Text> : null}
                </Text>
                <Text className="caption text-text-secondary">{`${food.proteinG}g P · ${food.carbsG}g C · ${food.fatG}g F / ${food.servingSize}${food.servingUnit}`}</Text>
              </View>
              <SkewedStat size={18} color={colors.neutral.textPrimary}>{String(Math.round(food.calories))}</SkewedStat>
              <Pressable onPress={() => handleDelete(food)} hitSlop={8} className="h-9 w-9 items-center justify-center">
                <Ionicons name="trash-outline" size={17} color={colors.neutral.textSecondary} />
              </Pressable>
            </Pressable>
          ))
        )}
      </ScrollView>

      <Modal visible={editingFood !== null} animationType="slide" onRequestClose={() => setEditingFood(null)}>
        <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: colors.neutral.background }}>
          <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
            <Text className="heading-4 text-text-primary">Edit Food</Text>
            <Pressable onPress={() => setEditingFood(null)} hitSlop={8} style={{ position: "absolute", right: 16 }}>
              <Ionicons name="close" size={22} color={colors.neutral.textSecondary} />
            </Pressable>
          </View>
          {editingFood && (
            <CreateFoodForm
              initial={editingFood}
              submitLabel="Save Changes"
              onCancel={() => setEditingFood(null)}
              onSave={(input) => {
                updateFood(editingFood.id, input);
                setEditingFood(null);
              }}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}
