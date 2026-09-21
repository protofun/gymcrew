import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Animated, { FadeInRight } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AmountPicker } from "@/components/AmountPicker";
import { SaveButton } from "@/components/ui/micro-interactions/save-button";
import { AnimatedChip } from "@/components/ui/molecules/animated-chip";
import AnimatedText from "@/components/ui/organisms/animated-text";
import { AnimatedProgressBar } from "@/components/ui/organisms/progress";
import { AI_SAVE_BUTTON_COLORS } from "@/constants/ai-scan-theme";
import { api, isApiConfigured } from "@/lib/api";
import { NUTRITION_COLORS } from "@/lib/nutrition-colors";
import { colors, fontFamily } from "@/theme";

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

const SERVING_UNITS: { key: string; label: string; mark: string }[] = [
  { key: "g", label: "Grams", mark: "g" },
  { key: "ml", label: "Milliliters", mark: "ml" },
  { key: "piece", label: "Pieces", mark: "pc" },
];

const STEPS = ["basics", "serving", "nutrition"] as const;
type Step = (typeof STEPS)[number];
const STEP_TITLE: Record<Step, string> = { basics: "THE BASICS", serving: "ONE SERVING", nutrition: "NUTRITION" };

function LineField({ label, value, onChangeText, placeholder, keyboardType, color, autoFocus }: { label: string; value: string; onChangeText: (text: string) => void; placeholder?: string; keyboardType?: "decimal-pad"; color?: string; autoFocus?: boolean }) {
  return (
    <View className="flex-1 gap-1.5">
      <View className="flex-row items-center gap-1.5">
        {color ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} /> : null}
        <Text className="caption font-body-bold text-text-secondary" style={{ letterSpacing: 0.8 }}>
          {label}
        </Text>
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder ?? (keyboardType ? "0" : undefined)}
        placeholderTextColor={colors.neutral.textSecondary}
        autoFocus={autoFocus}
        className="body-lg border-b border-divider pb-2 text-text-primary"
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
 * Custom-food creation/edit form — shared by app/nutrition/create-food.tsx, My Foods' edit sheet and
 * FoodPickerModal's inline "create" mode. A 3-step wizard (Basics → Serving → Nutrition) rather than one
 * long form — 12 fields on one screen read as overwhelming; 2-4 at a time reads as quick. The serving
 * size is picked on a ruler, the unit with expanding chips. Calories auto-fills from protein/carbs/fat
 * (4/4/9 kcal per gram) the moment any of those three change, for as long as the user hasn't typed their
 * own — most people know a label's macros and serving size by heart but have to do the calorie math
 * themselves; this does it for them without blocking a manual override. Fiber/sugar/saturated
 * fat/sodium are real fields but rarely filled in, so they stay collapsed behind "Add more details".
 */
export function CreateFoodForm({ initial, onCancel, onSave, submitLabel = "Save Food" }: CreateFoodFormProps) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>("basics");
  const [name, setName] = useState(initial?.name ?? "");
  const [brand, setBrand] = useState(initial?.brand ?? "");
  const [servingSize, setServingSize] = useState(String(initial?.servingSize ?? 100));
  const [servingUnit, setServingUnit] = useState(initial?.servingUnit ?? "g");
  const [unitResetToken, setUnitResetToken] = useState(0);
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
  const isPiece = servingUnit === "piece";
  const servingStep = isPiece ? 1 : 5;
  const servingMax = useMemo(() => (isPiece ? Math.max(20, Math.ceil(num(String(initial?.servingSize ?? 0))) + 10) : Math.max(500, Math.ceil((initial?.servingSize ?? 0) * 1.5))), [isPiece, initial?.servingSize]);

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
  }

  function handleBack() {
    if (step === "basics") onCancel();
    else if (step === "serving") setStep("basics");
    else setStep("serving");
  }

  return (
    <View className="flex-1">
      <View className="gap-3 px-5 pt-3">
        <AnimatedProgressBar progress={(stepIndex + 1) / STEPS.length} height={5} borderRadius={3} progressColor={colors.brand.yellow} trackColor={colors.neutral.divider} animationDuration={500} />
        <View className="flex-row items-baseline justify-between">
          <AnimatedText
            key={step}
            text={STEP_TITLE[step]}
            animationConfig={{ characterDelay: 28 }}
            enterFrom={{ translateY: 28, scale: 0.4 }}
            style={{ fontFamily: fontFamily.heading, fontSize: 34, letterSpacing: 1, color: colors.brand.white }}
          />
          <Text className="caption font-body-semibold text-text-secondary">{`${stepIndex + 1} / ${STEPS.length}`}</Text>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 32, gap: 28 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {step === "basics" && (
          <Animated.View key="basics" entering={FadeInRight.springify().damping(16)} className="gap-7">
            <Pressable onPress={handlePickPhoto} disabled={uploadingPhoto} className="items-center gap-2.5">
              <View className="h-28 w-28 items-center justify-center overflow-hidden rounded-[32px] border border-dashed border-divider bg-surface">
                {uploadingPhoto ? (
                  <ActivityIndicator size="small" color={colors.brand.yellow} />
                ) : photoUrl ? (
                  <Image source={{ uri: photoUrl }} style={{ width: 112, height: 112 }} resizeMode="cover" />
                ) : (
                  <Ionicons name="camera-outline" size={30} color={colors.neutral.textSecondary} />
                )}
              </View>
              <Text className="caption font-body-semibold text-brand-yellow">{photoUrl ? "Change photo" : "Add a photo (optional)"}</Text>
            </Pressable>

            <View className="gap-6">
              <LineField label="FOOD NAME" value={name} onChangeText={setName} placeholder="e.g. Homemade Protein Bar" autoFocus />
              <LineField label="BRAND (OPTIONAL)" value={brand} onChangeText={setBrand} placeholder="e.g. AH" />
            </View>
          </Animated.View>
        )}

        {step === "serving" && (
          <Animated.View key="serving" entering={FadeInRight.springify().damping(16)} className="gap-7">
            <Text className="body-sm text-text-secondary">How is this food usually measured? The nutrition on the next step is for exactly this much.</Text>
            <View className="items-start">
              <AnimatedChip.Group
                value={servingUnit}
                onValueChange={(next) => {
                  setServingUnit(String(next));
                  setServingSize(next === "piece" ? "1" : "100");
                  setUnitResetToken((token) => token + 1);
                }}
              >
                {SERVING_UNITS.map((unit) => (
                  <AnimatedChip.Item key={unit.key} value={unit.key} activeColor={colors.brand.yellow} inactiveColor={colors.neutral.surface}>
                    <AnimatedChip.Icon>{({ selected }) => <Text style={{ fontFamily: fontFamily.heading, fontSize: 17, color: selected ? colors.brand.iron : colors.neutral.textSecondary }}>{unit.mark}</Text>}</AnimatedChip.Icon>
                    <AnimatedChip.Label color={colors.brand.iron} style={{ fontFamily: fontFamily.bodyBold, fontSize: 13 }}>
                      {unit.label}
                    </AnimatedChip.Label>
                  </AnimatedChip.Item>
                ))}
              </AnimatedChip.Group>
            </View>
            <AmountPicker
              value={num(servingSize)}
              unit={servingUnit}
              min={servingStep}
              max={servingMax}
              step={servingStep}
              onChange={(value) => setServingSize(String(value))}
              resetToken={unitResetToken}
              presets={(isPiece ? [1, 2, 3] : [30, 50, 100, 150, 200]).map((value) => ({ label: `${value}`, value }))}
            />
          </Animated.View>
        )}

        {step === "nutrition" && (
          <Animated.View key="nutrition" entering={FadeInRight.springify().damping(16)} className="gap-7">
            <Text className="body-md font-body-semibold text-text-primary">{`Per ${servingSize || "0"} ${servingUnit}`}</Text>
            <View className="flex-row gap-5">
              <LineField label="PROTEIN (G)" value={proteinG} onChangeText={setProteinG} keyboardType="decimal-pad" color={NUTRITION_COLORS.protein} />
              <LineField label="CARBS (G)" value={carbsG} onChangeText={setCarbsG} keyboardType="decimal-pad" color={NUTRITION_COLORS.carbs} />
              <LineField label="FAT (G)" value={fatG} onChangeText={setFatG} keyboardType="decimal-pad" color={NUTRITION_COLORS.fat} />
            </View>

            <View className="gap-1.5">
              <LineField
                label="CALORIES"
                value={calories}
                onChangeText={(text) => {
                  setCaloriesTouched(true);
                  setCalories(text);
                }}
                keyboardType="decimal-pad"
                color={NUTRITION_COLORS.calories}
              />
              {!caloriesTouched && num(calories) > 0 && <Text className="caption text-text-secondary">Estimated from the macros — type your own if the label says otherwise.</Text>}
            </View>

            {showMoreDetails ? (
              <View className="gap-6">
                <Text className="body-sm font-body-semibold text-text-primary">More details (optional)</Text>
                <View className="flex-row gap-5">
                  <LineField label="FIBER (G)" value={fiberG} onChangeText={setFiberG} keyboardType="decimal-pad" placeholder="—" />
                  <LineField label="SUGAR (G)" value={sugarG} onChangeText={setSugarG} keyboardType="decimal-pad" placeholder="—" />
                </View>
                <View className="flex-row gap-5">
                  <LineField label="SAT FAT (G)" value={saturatedFatG} onChangeText={setSaturatedFatG} keyboardType="decimal-pad" placeholder="—" />
                  <LineField label="SODIUM (MG)" value={sodiumMg} onChangeText={setSodiumMg} keyboardType="decimal-pad" placeholder="—" />
                </View>
              </View>
            ) : (
              <Pressable onPress={() => setShowMoreDetails(true)} className="flex-row items-center gap-1.5 self-start">
                <Ionicons name="add-circle-outline" size={16} color={colors.brand.yellow} />
                <Text className="body-sm font-body-semibold text-brand-yellow">Add fiber, sugar, sat fat, sodium</Text>
              </Pressable>
            )}
          </Animated.View>
        )}
      </ScrollView>

      <View className="flex-row items-center gap-3 border-t border-divider bg-background px-5 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
        <Pressable onPress={handleBack} className="h-[52px] flex-1 items-center justify-center rounded-full border border-divider">
          <Text className="body-md font-body-semibold text-text-primary">{step === "basics" ? "Cancel" : "Back"}</Text>
        </Pressable>
        {step === "nutrition" ? (
          <View className="flex-1 items-end">
            <SaveButton.Root onSave={() => {}} onSaved={handleSubmit} disabled={!canAdvance} colors={AI_SAVE_BUTTON_COLORS} minLoading={350} successPause={250}>
              <SaveButton.Label style={{ fontFamily: fontFamily.bodyBold, fontSize: 15 }}>{submitLabel}</SaveButton.Label>
              <SaveButton.Saved style={{ fontFamily: fontFamily.bodyBold, fontSize: 15 }}>Saved</SaveButton.Saved>
            </SaveButton.Root>
          </View>
        ) : (
          <Pressable onPress={handleNext} disabled={!canAdvance} className={`h-[52px] flex-1 items-center justify-center rounded-full ${canAdvance ? "bg-brand-yellow" : "bg-surface"}`}>
            <Text className={`body-md font-body-semibold ${canAdvance ? "text-brand-iron" : "text-text-secondary"}`}>Next</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
