import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

const STEPS = ["basics", "serving", "nutrition"] as const;
type Step = (typeof STEPS)[number];
const STEP_LABEL: Record<Step, string> = { basics: "Basics", serving: "Serving", nutrition: "Nutrition" };

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

function num(text: string): number {
  const parsed = parseFloat(text.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}
function optionalNum(text: string): number | undefined {
  const parsed = parseFloat(text.replace(",", "."));
  return Number.isFinite(parsed) && text.trim() !== "" ? parsed : undefined;
}

/**
 * Custom-food creation/edit form — shared by app/nutrition/create-food.tsx and FoodPickerModal's
 * inline "create" mode. A 3-step wizard (Basics → Serving → Nutrition) rather than one long form —
 * 12 fields on one screen read as overwhelming; 2-4 at a time reads as quick. Calories auto-fills
 * from protein/carbs/fat (4/4/9 kcal per gram) the moment any of those three change, for as long as
 * the user hasn't typed their own — most people know a label's macros and serving size by heart but
 * have to do the calorie math themselves; this does it for them without blocking a manual override.
 * Fiber/sugar/saturated fat/sodium are real fields but rarely filled in, so they stay collapsed
 * behind "Add more details" instead of padding out the main nutrition step.
 */
export function CreateFoodForm({ initial, onCancel, onSave, submitLabel = "Save Food" }: CreateFoodFormProps) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>("basics");
  const [name, setName] = useState(initial?.name ?? "");
  const [brand, setBrand] = useState(initial?.brand ?? "");
  const [servingSize, setServingSize] = useState(String(initial?.servingSize ?? 100));
  const [servingUnit, setServingUnit] = useState(initial?.servingUnit ?? "g");
  const [calories, setCalories] = useState(initial?.calories !== undefined ? String(initial.calories) : "");
  const [caloriesTouched, setCaloriesTouched] = useState(initial?.calories !== undefined);
  const [proteinG, setProteinG] = useState(initial?.proteinG !== undefined ? String(initial.proteinG) : "");
  const [carbsG, setCarbsG] = useState(initial?.carbsG !== undefined ? String(initial.carbsG) : "");
  const [fatG, setFatG] = useState(initial?.fatG !== undefined ? String(initial.fatG) : "");
  const [fiberG, setFiberG] = useState(initial?.fiberG !== undefined ? String(initial.fiberG) : "");
  const [sugarG, setSugarG] = useState(initial?.sugarG !== undefined ? String(initial.sugarG) : "");
  const [saturatedFatG, setSaturatedFatG] = useState(initial?.saturatedFatG !== undefined ? String(initial.saturatedFatG) : "");
  const [sodiumMg, setSodiumMg] = useState(initial?.sodiumMg !== undefined ? String(initial.sodiumMg) : "");
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(initial?.photoUrl);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Auto-estimate calories from macros (4/4/9 kcal per gram) until the user types their own number —
  // see the doc comment above for why.
  useEffect(() => {
    if (caloriesTouched) return;
    const estimated = Math.round(num(proteinG) * 4 + num(carbsG) * 4 + num(fatG) * 9);
    setCalories(estimated > 0 ? String(estimated) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proteinG, carbsG, fatG]);

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

  const stepIndex = STEPS.indexOf(step);
  const canAdvance = step === "basics" ? name.trim().length > 0 : step === "serving" ? num(servingSize) > 0 : calories.trim() !== "";

  function handleSubmit() {
    if (!canAdvance) return;
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

  function handleNext() {
    if (!canAdvance) return;
    if (step === "basics") setStep("serving");
    else if (step === "serving") setStep("nutrition");
    else handleSubmit();
  }

  function handleBack() {
    if (step === "basics") onCancel();
    else if (step === "serving") setStep("basics");
    else setStep("serving");
  }

  return (
    <View className="flex-1">
      <View className="gap-2 px-4 pt-3">
        <View className="flex-row gap-1.5">
          {STEPS.map((s, i) => (
            <View
              key={s}
              className="h-1 flex-1 rounded-full"
              style={{ backgroundColor: i <= stepIndex ? colors.brand.yellow : colors.neutral.divider }}
            />
          ))}
        </View>
        <Text className="caption font-body-semibold text-text-secondary">{`STEP ${stepIndex + 1} OF ${STEPS.length} · ${STEP_LABEL[step].toUpperCase()}`}</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="gap-4 p-4" keyboardShouldPersistTaps="handled">
        {step === "basics" && (
          <>
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
                autoFocus
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
          </>
        )}

        {step === "serving" && (
          <>
            <Text className="body-sm text-text-secondary">How is this food usually measured?</Text>
            <NumberField label="Serving Size" value={servingSize} onChangeText={setServingSize} placeholder="100" />
            <View className="gap-1.5">
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
          </>
        )}

        {step === "nutrition" && (
          <>
            <Text className="body-sm font-body-semibold text-text-primary">{`Per ${servingSize || "0"} ${servingUnit}`}</Text>
            <View className="flex-row gap-3">
              <NumberField label="Protein (g)" value={proteinG} onChangeText={setProteinG} />
              <NumberField label="Carbs (g)" value={carbsG} onChangeText={setCarbsG} />
              <NumberField label="Fat (g)" value={fatG} onChangeText={setFatG} />
            </View>

            <View className="gap-1.5">
              <View className="flex-row items-center justify-between">
                <Text className="body-sm text-text-secondary">Calories</Text>
                {!caloriesTouched && num(calories) > 0 && (
                  <Text className="caption text-text-secondary">Estimated from macros</Text>
                )}
              </View>
              <TextInput
                value={calories}
                onChangeText={(text) => {
                  setCaloriesTouched(true);
                  setCalories(text);
                }}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.neutral.textSecondary}
                className="body-md rounded-xl border border-divider bg-surface px-4 py-3 text-text-primary"
              />
            </View>

            {showMoreDetails ? (
              <>
                <Text className="body-sm mt-1 font-body-semibold text-text-primary">More details (optional)</Text>
                <View className="flex-row gap-3">
                  <NumberField label="Fiber (g)" value={fiberG} onChangeText={setFiberG} placeholder="—" />
                  <NumberField label="Sugar (g)" value={sugarG} onChangeText={setSugarG} placeholder="—" />
                </View>
                <View className="flex-row gap-3">
                  <NumberField label="Saturated Fat (g)" value={saturatedFatG} onChangeText={setSaturatedFatG} placeholder="—" />
                  <NumberField label="Sodium (mg)" value={sodiumMg} onChangeText={setSodiumMg} placeholder="—" />
                </View>
              </>
            ) : (
              <Pressable onPress={() => setShowMoreDetails(true)} className="flex-row items-center gap-1.5 self-start">
                <Ionicons name="add-circle-outline" size={16} color={colors.brand.yellow} />
                <Text className="body-sm font-body-semibold text-brand-yellow">Add fiber, sugar, sat fat, sodium</Text>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>

      <View className="flex-row gap-3 border-t border-divider bg-background px-4 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
        <Pressable onPress={handleBack} className="flex-1 items-center rounded-full border border-divider py-3.5">
          <Text className="body-md font-body-semibold text-text-primary">{step === "basics" ? "Cancel" : "Back"}</Text>
        </Pressable>
        <Pressable
          onPress={handleNext}
          disabled={!canAdvance}
          className={`flex-1 items-center rounded-full py-3.5 ${canAdvance ? "bg-brand-yellow" : "bg-surface"}`}
        >
          <Text className={`body-md font-body-semibold ${canAdvance ? "text-brand-iron" : "text-text-secondary"}`}>
            {step === "nutrition" ? submitLabel : "Next"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
