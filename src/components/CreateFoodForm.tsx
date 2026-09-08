import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { api, isApiConfigured } from "@/lib/api";
import { colors } from "@/theme";

export type CreateFoodInput = {
  name: string;
  brand?: string;
  servingSize: number;
  servingUnit: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number;
  sugarG?: number;
  saturatedFatG?: number;
  sodiumMg?: number;
  photoUrl?: string;
};

type CreateFoodFormProps = {
  initial?: Partial<CreateFoodInput>;
  onCancel: () => void;
  onSave: (input: CreateFoodInput) => void;
  submitLabel?: string;
};

const SERVING_UNITS = ["g", "ml", "piece"];

function NumberField({ label, value, onChangeText, placeholder }: { label: string; value: string; onChangeText: (text: string) => void; placeholder?: string }) {
  return (
    <View className="flex-1 gap-1.5">
      <Text className="body-sm text-text-secondary">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        placeholder={placeholder ?? "0"}
        placeholderTextColor={colors.neutral.textSecondary}
        className="body-md rounded-xl border border-divider bg-surface px-4 py-3 text-text-primary"
      />
    </View>
  );
}

/** Custom-food creation/edit form — shared by app/nutrition/create-food.tsx and FoodPickerModal's
 * inline "create" mode, same "one form, used from two entry points" pattern CreateExerciseForm
 * already sets for exercises (see ExercisePickerModal). Required: name + the four core macros
 * (section 10) — everything else, including fiber/sugar/etc., is optional. */
export function CreateFoodForm({ initial, onCancel, onSave, submitLabel = "Save Food" }: CreateFoodFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [brand, setBrand] = useState(initial?.brand ?? "");
  const [servingSize, setServingSize] = useState(String(initial?.servingSize ?? 100));
  const [servingUnit, setServingUnit] = useState(initial?.servingUnit ?? "g");
  const [calories, setCalories] = useState(initial?.calories !== undefined ? String(initial.calories) : "");
  const [proteinG, setProteinG] = useState(initial?.proteinG !== undefined ? String(initial.proteinG) : "");
  const [carbsG, setCarbsG] = useState(initial?.carbsG !== undefined ? String(initial.carbsG) : "");
  const [fatG, setFatG] = useState(initial?.fatG !== undefined ? String(initial.fatG) : "");
  const [fiberG, setFiberG] = useState(initial?.fiberG !== undefined ? String(initial.fiberG) : "");
  const [sugarG, setSugarG] = useState(initial?.sugarG !== undefined ? String(initial.sugarG) : "");
  const [saturatedFatG, setSaturatedFatG] = useState(initial?.saturatedFatG !== undefined ? String(initial.saturatedFatG) : "");
  const [sodiumMg, setSodiumMg] = useState(initial?.sodiumMg !== undefined ? String(initial.sodiumMg) : "");
  const [photoUrl, setPhotoUrl] = useState(initial?.photoUrl);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  async function handlePickPhoto() {
    if (!isApiConfigured) {
      Alert.alert("Photos need a backend", "Photo uploads require a configured backend — see backend/README.md.");
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo library access to add a food photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset?.base64) return;

    setUploadingPhoto(true);
    try {
      const { url } = await api.uploadFoodPhoto(asset.base64, asset.mimeType ?? "image/jpeg");
      setPhotoUrl(url);
    } catch (error) {
      Alert.alert("Couldn't upload photo", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  function num(text: string): number {
    const parsed = parseFloat(text.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  function optionalNum(text: string): number | undefined {
    const parsed = parseFloat(text.replace(",", "."));
    return Number.isFinite(parsed) && text.trim() !== "" ? parsed : undefined;
  }

  const canSubmit = name.trim().length > 0 && num(servingSize) > 0 && calories.trim() !== "";

  function handleSubmit() {
    if (!canSubmit) return;
    onSave({
      name: name.trim(),
      brand: brand.trim() || undefined,
      servingSize: num(servingSize),
      servingUnit: servingUnit.trim() || "g",
      calories: num(calories),
      proteinG: num(proteinG),
      carbsG: num(carbsG),
      fatG: num(fatG),
      fiberG: optionalNum(fiberG),
      sugarG: optionalNum(sugarG),
      saturatedFatG: optionalNum(saturatedFatG),
      sodiumMg: optionalNum(sodiumMg),
      photoUrl,
    });
  }

  return (
    <ScrollView className="flex-1" contentContainerClassName="gap-4 p-4" keyboardShouldPersistTaps="handled">
      <Pressable onPress={handlePickPhoto} disabled={uploadingPhoto} className="items-center gap-2">
        <View className="h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-divider bg-surface">
          {uploadingPhoto ? (
            <ActivityIndicator size="small" color={colors.brand.yellow} />
          ) : photoUrl ? (
            <Image source={{ uri: photoUrl }} style={{ width: 96, height: 96 }} resizeMode="cover" />
          ) : (
            <Ionicons name="camera-outline" size={26} color={colors.neutral.textSecondary} />
          )}
        </View>
        <Text className="caption font-body-semibold text-brand-yellow">{photoUrl ? "Change Photo" : "Add Photo (optional)"}</Text>
      </Pressable>

      <View className="gap-1.5">
        <Text className="body-sm text-text-secondary">Food Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Homemade Protein Bar"
          placeholderTextColor={colors.neutral.textSecondary}
          className="body-md rounded-xl border border-divider bg-surface px-4 py-3 text-text-primary"
        />
      </View>

      <View className="gap-1.5">
        <Text className="body-sm text-text-secondary">Brand (optional)</Text>
        <TextInput
          value={brand}
          onChangeText={setBrand}
          placeholder="e.g. AH"
          placeholderTextColor={colors.neutral.textSecondary}
          className="body-md rounded-xl border border-divider bg-surface px-4 py-3 text-text-primary"
        />
      </View>

      <View className="flex-row gap-3">
        <NumberField label="Serving Size" value={servingSize} onChangeText={setServingSize} placeholder="100" />
        <View className="flex-1 gap-1.5">
          <Text className="body-sm text-text-secondary">Unit</Text>
          <View className="flex-row gap-2">
            {SERVING_UNITS.map((unit) => {
              const selected = servingUnit === unit;
              return (
                <Pressable
                  key={unit}
                  onPress={() => setServingUnit(unit)}
                  className={`flex-1 items-center rounded-xl border py-3 ${selected ? "border-brand-yellow bg-brand-yellow" : "border-divider bg-surface"}`}
                >
                  <Text className={`body-sm font-body-semibold ${selected ? "text-brand-iron" : "text-text-secondary"}`}>{unit}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      <Text className="body-sm mt-1 font-body-semibold text-text-primary">Per {servingSize || "0"} {servingUnit}</Text>
      <View className="flex-row gap-3">
        <NumberField label="Calories" value={calories} onChangeText={setCalories} />
        <NumberField label="Protein (g)" value={proteinG} onChangeText={setProteinG} />
      </View>
      <View className="flex-row gap-3">
        <NumberField label="Carbs (g)" value={carbsG} onChangeText={setCarbsG} />
        <NumberField label="Fat (g)" value={fatG} onChangeText={setFatG} />
      </View>

      <Text className="body-sm mt-1 font-body-semibold text-text-primary">Optional</Text>
      <View className="flex-row gap-3">
        <NumberField label="Fiber (g)" value={fiberG} onChangeText={setFiberG} placeholder="—" />
        <NumberField label="Sugar (g)" value={sugarG} onChangeText={setSugarG} placeholder="—" />
      </View>
      <View className="flex-row gap-3">
        <NumberField label="Saturated Fat (g)" value={saturatedFatG} onChangeText={setSaturatedFatG} placeholder="—" />
        <NumberField label="Sodium (mg)" value={sodiumMg} onChangeText={setSodiumMg} placeholder="—" />
      </View>

      <View className="mt-2 flex-row gap-3">
        <Pressable onPress={onCancel} className="flex-1 items-center rounded-full border border-divider py-3.5">
          <Text className="body-md font-body-semibold text-text-primary">Cancel</Text>
        </Pressable>
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          className={`flex-1 items-center rounded-full py-3.5 ${canSubmit ? "bg-brand-yellow" : "bg-surface"}`}
        >
          <Text className={`body-md font-body-semibold ${canSubmit ? "text-brand-iron" : "text-text-secondary"}`}>{submitLabel}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
