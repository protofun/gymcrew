import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Platform, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CreateFoodForm } from "@/components/CreateFoodForm";
import { FoodThumbnail } from "@/components/FoodThumbnail";
import type { Food } from "@/data/nutrition-foods";
import { useOffSearch } from "@/hooks/use-off-search";
import { searchCustomFoods } from "@/lib/food-search";
import { useCustomFoodsStore } from "@/store/custom-foods-store";
import { useFavoriteFoodsStore } from "@/store/favorite-foods-store";
import { colors } from "@/theme";

type FoodPickerModalProps = {
  visible: boolean;
  title?: string;
  onClose: () => void;
  onSelect: (food: Food) => void;
};

function FoodRow({ food, isFavorite, onPress, onToggleFavorite }: { food: Food; isFavorite: boolean; onPress: () => void; onToggleFavorite: () => void }) {
  const isOff = food.source === "open_food_facts";
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 px-4 py-2.5"
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <FoodThumbnail photoUrl={food.photoUrl} icon={isOff ? "globe-outline" : "fast-food"} color={isOff ? colors.semantic.info : colors.brand.yellow} size={46} />
      <View className="flex-1 gap-0.5">
        <Text className="body-md font-body-semibold text-text-primary" numberOfLines={1}>
          {food.name}
          {food.brand ? <Text className="body-sm text-text-secondary"> — {food.brand}</Text> : null}
        </Text>
        <View className="flex-row items-center gap-2">
          <Text className="caption font-body-bold" style={{ color: colors.brand.yellow }}>{`${Math.round(food.calories)} kcal`}</Text>
          <Text className="caption text-text-secondary" numberOfLines={1}>{`${food.proteinG}g protein / ${food.servingSize}${food.servingUnit}`}</Text>
        </View>
      </View>
      <Pressable onPress={onToggleFavorite} hitSlop={8} className="h-9 w-9 shrink-0 items-center justify-center">
        <Ionicons name={isFavorite ? "star" : "star-outline"} size={20} color={isFavorite ? colors.brand.yellow : colors.neutral.textSecondary} />
      </Pressable>
    </Pressable>
  );
}

function CreateFoodRow({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 border-b border-divider px-4 py-3"
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <View className="h-11 w-11 items-center justify-center rounded-xl border border-dashed border-divider">
        <Ionicons name="add" size={20} color={colors.brand.yellow} />
      </View>
      <Text className="body-md font-body-semibold text-brand-yellow">Can&apos;t find your food? Create it</Text>
    </Pressable>
  );
}

/** Search + favorites + create-your-own food picker — shared by the meal and shake builders to add
 * an ingredient without leaving that screen. Mirrors ExercisePickerModal's structure exactly
 * (search + favorites toggle + inline "create" mode) for the same library of foods search.ts
 * already merges for the main Add Food screen. */
export function FoodPickerModal({ visible, title = "Add Ingredient", onClose, onSelect }: FoodPickerModalProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"search" | "create">("search");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const customFoods = useCustomFoodsStore((state) => state.foods);
  const addCustomFood = useCustomFoodsStore((state) => state.addFood);
  const favoriteIds = useFavoriteFoodsStore((state) => state.favoriteIds);
  const toggleFavorite = useFavoriteFoodsStore((state) => state.toggleFavorite);

  useEffect(() => {
    if (Platform.OS !== "web" || !visible) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [visible]);

  // The real food database is Open Food Facts (see data/nutrition-foods.ts) — custom foods match
  // instantly, OFF results arrive debounced with real pagination, same split search as the main
  // Add Food screen (see hooks/use-off-search.ts).
  const { results: offResults, loading: offLoading, loadingMore: offLoadingMore, hasMore: offHasMore, loadMore: loadMoreOff } = useOffSearch(query);

  const results = useMemo(() => {
    const local = searchCustomFoods(query, customFoods);
    const localIds = new Set(local.map((food) => food.id));
    const all = [...local, ...offResults.filter((food) => !localIds.has(food.id))];
    return favoritesOnly ? all.filter((food) => favoriteIds.includes(food.id)) : all;
  }, [query, customFoods, offResults, favoritesOnly, favoriteIds]);

  function reset() {
    setQuery("");
    setMode("search");
    setFavoritesOnly(false);
  }

  function handleSelect(food: Food) {
    onSelect(food);
    reset();
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleCreate(input: Parameters<typeof addCustomFood>[0]) {
    const food = addCustomFood(input);
    handleSelect(food);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: colors.neutral.background }}>
        <View className="border-b border-divider px-4 pb-3 pt-2">
          <View className="flex-row items-center justify-between">
            <Text className="heading-4 text-text-primary">{mode === "search" ? title : "Create Food"}</Text>
            <Pressable onPress={mode === "search" ? handleClose : () => setMode("search")} hitSlop={8}>
              <Ionicons name={mode === "search" ? "close" : "arrow-back"} size={24} color={colors.neutral.textSecondary} />
            </Pressable>
          </View>
        </View>

        {mode === "create" ? (
          <CreateFoodForm onCancel={() => setMode("search")} onSave={handleCreate} submitLabel="Add Food" />
        ) : (
          <>
            <View className="flex-row items-center gap-2 border-b border-divider px-4 py-3">
              <Ionicons name="search" size={18} color={colors.neutral.textSecondary} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search foods..."
                placeholderTextColor={colors.neutral.textSecondary}
                autoCorrect={false}
                className="body-md flex-1 text-text-primary"
                style={{ minWidth: 0 }}
              />
              <Pressable
                onPress={() => setFavoritesOnly((current) => !current)}
                hitSlop={8}
                className={`shrink-0 flex-row items-center gap-1 rounded-full px-2.5 py-1 ${favoritesOnly ? "bg-brand-yellow" : "border border-divider"}`}
              >
                <Ionicons name={favoritesOnly ? "star" : "star-outline"} size={13} color={favoritesOnly ? colors.brand.iron : colors.neutral.textSecondary} />
                <Text className={`caption font-body-semibold ${favoritesOnly ? "text-brand-iron" : "text-text-secondary"}`}>Favorites</Text>
              </Pressable>
            </View>

            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <FoodRow food={item} isFavorite={favoriteIds.includes(item.id)} onPress={() => handleSelect(item)} onToggleFavorite={() => toggleFavorite(item.id)} />
              )}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
              ListHeaderComponent={<CreateFoodRow onPress={() => setMode("create")} />}
              ListFooterComponent={
                offLoading ? (
                  <View className="flex-row items-center justify-center gap-2 py-4">
                    <ActivityIndicator size="small" color={colors.neutral.textSecondary} />
                    <Text className="caption text-text-secondary">Searching Open Food Facts…</Text>
                  </View>
                ) : offHasMore ? (
                  <Pressable onPress={loadMoreOff} disabled={offLoadingMore} className="mx-4 my-3 items-center rounded-full border border-divider py-3">
                    {offLoadingMore ? (
                      <ActivityIndicator size="small" color={colors.neutral.textSecondary} />
                    ) : (
                      <Text className="body-sm font-body-semibold text-brand-yellow">Load More Results</Text>
                    )}
                  </Pressable>
                ) : null
              }
              ListEmptyComponent={
                offLoading ? null : (
                  <Text className="body-md py-10 text-center text-text-secondary">
                    {favoritesOnly ? "No favorites yet — tap the star on a food to save it." : "No foods found."}
                  </Text>
                )
              }
            />
          </>
        )}
      </View>
    </Modal>
  );
}
