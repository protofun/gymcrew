import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";

import { MacroTotalsBar } from "@/components/MacroTotalsBar";
import { MealItemRow } from "@/components/MealItemRow";
import { images } from "@/constants/images";
import { api, isApiConfigured, type MealItem, type MealPhotoItem, type MealScanCorrection, type MealScanQuota } from "@/lib/api";
import { toDateKey } from "@/lib/date";
import { MEAL_SLOTS, mealSlotForTime, type MealSlot } from "@/lib/meal-slot";
import { goBack } from "@/lib/navigation";
import { scaleMacros, sumMacros } from "@/lib/nutrition-macros";
import { useNutritionLogStore } from "@/store/nutrition-log-store";
import { colors } from "@/theme";

type Phase = "camera" | "analyzing" | "review";
type Photo = { base64: string; uri: string };

// Low JPEG quality keeps the upload small; it's still plenty of detail to recognise food.
const PHOTO_QUALITY = 0.4;

/** The AI's estimate as an editable ingredient row — `servingSize` is the estimated portion, so
 * `scaleMacros` scales the macros as the user corrects the grams. */
function toMealItem(item: MealPhotoItem, index: number): MealItem {
  return {
    id: `scan-${Date.now()}-${index}`,
    name: item.name,
    source: "user_created",
    servingSize: item.grams,
    servingUnit: "g",
    calories: item.calories,
    proteinG: item.proteinG,
    carbsG: item.carbsG,
    fatG: item.fatG,
    quantity: item.grams,
  };
}

/** Photo → AI estimate → editable list → log. The photo goes to the backend (see
 * backend/routes/nutrition-photo-scan.php), which asks Gemini what's on the plate and never stores
 * it — so the screen keeps the photo itself, to send it again with a correction. Nothing is logged
 * until the user taps "Add" on a single ingredient or "Add All to Log": portions from a photo are a
 * best guess, so every row can be corrected (grams, or a typed description) or removed first. */
export default function ScanMealScreen() {
  const insets = useSafeAreaInsets();
  const posthog = usePostHog();
  const { date } = useLocalSearchParams<{ date?: string }>();
  const targetDateKey = date ?? toDateKey(new Date());
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const addEntry = useNutritionLogStore((state) => state.addEntry);

  const [phase, setPhase] = useState<Phase>("camera");
  const [quota, setQuota] = useState<MealScanQuota | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [items, setItems] = useState<MealItem[]>([]);
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const [hint, setHint] = useState("");
  const [mealSlot, setMealSlot] = useState<MealSlot>(mealSlotForTime());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isApiConfigured) return;
    api
      .getMealScanQuota()
      .then(setQuota)
      .catch((err) => console.warn("Failed to load meal scan quota", err));
  }, []);

  const pendingItems = useMemo(() => items.filter((item) => !addedIds.includes(item.id) && item.quantity > 0), [items, addedIds]);
  const totals = useMemo(() => sumMacros(pendingItems.map((item) => scaleMacros(item, item.quantity))), [pendingItems]);

  function handleBack() {
    goBack("/nutrition/add");
  }

  async function analyze(next: Photo, correction?: MealScanCorrection) {
    if (!isApiConfigured) {
      setError("Meal scanning needs a connection to the GymCrew server.");
      return;
    }

    setPhoto(next);
    setError(null);
    setPhase("analyzing");
    // A failed correction goes back to the list the user already had; a failed first scan to the camera.
    const fallbackPhase: Phase = correction ? "review" : "camera";
    try {
      const result = await api.scanMealPhoto(next.base64, "image/jpeg", correction);
      setQuota(result.quota);
      posthog.capture("meal_photo_scanned", { item_count: result.items.length, is_correction: !!correction });
      if (result.items.length === 0) {
        setError(correction ? "We couldn't find any food with that description. Try describing it differently." : "We couldn't spot any food in that photo. Try again with the whole plate in view.");
        setPhase(fallbackPhase);
        return;
      }
      setItems(result.items.map(toMealItem));
      setAddedIds([]);
      setHint("");
      setPhase("review");
    } catch (err) {
      console.warn("Meal photo scan failed", err);
      setError(err instanceof Error ? err.message : "Couldn't analyse that photo. Try again.");
      setPhase(fallbackPhase);
      // A "used all your scans" error should flip to the limit screen, so re-read the real count.
      api.getMealScanQuota().then(setQuota).catch(() => {});
    }
  }

  function handleReanalyse() {
    const text = hint.trim();
    if (!photo || !text) return;
    analyze(photo, { hint: text, previousItems: items.map((item) => ({ name: item.name, grams: item.quantity })) });
  }

  async function handleCapture() {
    if (capturing) return;
    setCapturing(true);
    try {
      const taken = await cameraRef.current?.takePictureAsync({ base64: true, quality: PHOTO_QUALITY });
      if (!taken?.base64) {
        setError("Couldn't take the photo. Try again.");
        return;
      }
      await analyze({ base64: taken.base64, uri: taken.uri });
    } catch (err) {
      console.warn("Failed to take meal photo", err);
      setError("Couldn't take the photo. Try again.");
    } finally {
      setCapturing(false);
    }
  }

  async function handlePickFromLibrary() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: PHOTO_QUALITY, base64: true });
    const asset = result.assets?.[0];
    if (result.canceled || !asset?.base64) return;
    await analyze({ base64: asset.base64, uri: asset.uri });
  }

  function handleChangeQuantity(id: string, quantity: number) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, quantity } : item)));
  }

  function handleRemoveItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  function logItem(item: MealItem) {
    addEntry({
      foodId: null,
      mealId: null,
      name: item.name,
      mealSlot,
      quantity: item.quantity,
      unit: "g",
      dateKey: targetDateKey,
      ...scaleMacros(item, item.quantity),
    });
  }

  /** Logs just this ingredient and keeps the rest of the list, so a meal can be saved piece by piece. */
  function handleAddOne(item: MealItem) {
    if (item.quantity <= 0) return;
    logItem(item);
    setAddedIds((current) => [...current, item.id]);
    posthog.capture("food_logged", { source: "photo_scan", meal_slot: mealSlot, item_count: 1, calories: scaleMacros(item, item.quantity).calories });
  }

  function handleAddAll() {
    for (const item of pendingItems) logItem(item);
    posthog.capture("food_logged", { source: "photo_scan", meal_slot: mealSlot, item_count: pendingItems.length, calories: totals.calories });
    router.replace("/nutrition");
  }

  if (phase === "review") {
    const nothingAddedYet = addedIds.length === 0;
    const outOfScans = quota?.remaining === 0;
    return (
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
        <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
          <Pressable onPress={handleBack} hitSlop={8} style={{ position: "absolute", left: 16 }}>
            <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
          </Pressable>
          <View className="flex-row items-center gap-2">
            <Ionicons name="sparkles" size={16} color={colors.brand.yellow} />
            <Text className="heading-4 text-text-primary">Your Meal</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View className="flex-row items-center gap-3">
            {photo && <Image source={{ uri: photo.uri }} resizeMode="cover" style={{ width: 64, height: 64, borderRadius: 16 }} />}
            <Text className="body-sm flex-1 text-text-secondary">
              Estimated from your photo. Change the grams, add each item on its own, or add them all at once.
            </Text>
          </View>

          <View className="gap-2.5">
            <Text className="body-sm font-body-semibold text-text-secondary">WHAT WE FOUND</Text>
            {items.length === 0 ? (
              <View className="items-center gap-2 rounded-2xl border border-dashed border-divider py-10">
                <Text className="body-sm text-text-secondary">Nothing left to add.</Text>
              </View>
            ) : (
              items.map((item) => (
                <MealItemRow
                  key={item.id}
                  item={item}
                  onChangeQuantity={(quantity) => handleChangeQuantity(item.id, quantity)}
                  onRemove={() => handleRemoveItem(item.id)}
                  onAdd={() => handleAddOne(item)}
                  added={addedIds.includes(item.id)}
                />
              ))
            )}
          </View>

          {nothingAddedYet && (
            <View className="gap-2.5 rounded-2xl border border-divider bg-surface p-3.5">
              <Text className="body-md font-body-semibold text-text-primary">Something not right?</Text>
              <Text className="body-sm text-text-secondary">Describe what it got wrong and we&apos;ll look at the photo again.</Text>
              <TextInput
                value={hint}
                onChangeText={setHint}
                placeholder="e.g. That's cauliflower rice, and there's no sauce"
                placeholderTextColor={colors.neutral.textSecondary}
                multiline
                maxLength={300}
                className="body-md rounded-xl border border-divider bg-background px-4 py-3 text-text-primary"
                style={{ minHeight: 72, textAlignVertical: "top" }}
              />
              {error && <Text className="body-sm text-error">{error}</Text>}
              <Pressable
                onPress={handleReanalyse}
                disabled={!hint.trim() || outOfScans}
                className={`flex-row items-center justify-center gap-2 rounded-full py-3 ${hint.trim() && !outOfScans ? "bg-brand-yellow" : "bg-background"}`}
              >
                <Ionicons name="sparkles" size={16} color={hint.trim() && !outOfScans ? colors.brand.iron : colors.neutral.textSecondary} />
                <Text className={`body-sm font-body-semibold ${hint.trim() && !outOfScans ? "text-brand-iron" : "text-text-secondary"}`}>Analyse Again</Text>
              </Pressable>
              <Text className="caption text-center text-text-secondary">
                {outOfScans ? "No AI scans left today." : quota?.remaining != null ? `Uses 1 AI scan · ${quota.remaining} left today` : "Uses 1 AI scan"}
              </Text>
            </View>
          )}

          <View className="gap-2">
            <Text className="body-sm text-text-secondary">Meal</Text>
            <View className="flex-row gap-2">
              {MEAL_SLOTS.map((option) => {
                const selected = mealSlot === option.key;
                return (
                  <Pressable
                    key={option.key}
                    onPress={() => setMealSlot(option.key)}
                    className={`flex-1 items-center rounded-xl border py-2.5 ${selected ? "border-brand-yellow bg-brand-yellow" : "border-divider bg-surface"}`}
                  >
                    <Text className={`caption font-body-semibold ${selected ? "text-brand-iron" : "text-text-secondary"}`}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>

        <View style={{ paddingBottom: insets.bottom + 12 }} className="gap-3 border-t border-divider bg-surface px-4 pt-3">
          {pendingItems.length > 0 && <MacroTotalsBar totals={totals} />}
          {pendingItems.length > 0 ? (
            <Pressable onPress={handleAddAll} className="items-center rounded-full bg-brand-yellow py-4">
              <Text className="body-md font-body-semibold text-brand-iron">{pendingItems.length === 1 ? "Add to Log" : "Add All to Log"}</Text>
            </Pressable>
          ) : addedIds.length > 0 ? (
            <Pressable onPress={() => router.replace("/nutrition")} className="items-center rounded-full bg-brand-yellow py-4">
              <Text className="body-md font-body-semibold text-brand-iron">Done</Text>
            </Pressable>
          ) : (
            <View className="items-center rounded-full bg-background py-4">
              <Text className="body-md font-body-semibold text-text-secondary">Add to Log</Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    );
  }

  if (phase === "analyzing") {
    return (
      <View style={{ flex: 1 }} className="bg-background">
        {photo && <Image source={{ uri: photo.uri }} resizeMode="cover" style={{ flex: 1, opacity: 0.4 }} />}
        <View style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }} className="items-center justify-center gap-3">
          <ActivityIndicator size="large" color={colors.brand.yellow} />
          <Text className="body-md font-body-semibold text-brand-white">Analysing your meal…</Text>
        </View>
      </View>
    );
  }

  if (quota?.remaining === 0) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top }} className="items-center justify-center gap-4 bg-background px-8">
        <Image source={images.mascotFlexing} resizeMode="contain" style={{ width: 130, height: 130 * (205 / 250) }} />
        <Text className="heading-4 text-center text-text-primary">You&apos;ve used all your AI scans for today</Text>
        <Text className="body-sm text-center text-text-secondary">
          Your scans reset tomorrow. You can still log this meal by searching for the food or with Quick Add.
        </Text>
        <Pressable onPress={() => router.replace({ pathname: "/nutrition/add", params: { date: targetDateKey } })} className="mt-2 items-center self-stretch rounded-full bg-brand-yellow py-3.5">
          <Text className="body-md font-body-semibold text-brand-iron">Search Food</Text>
        </Pressable>
        <Pressable onPress={handleBack} className="items-center self-stretch rounded-full border border-divider py-3.5">
          <Text className="body-md font-body-semibold text-text-primary">Cancel</Text>
        </Pressable>
      </View>
    );
  }

  if (!permission) {
    return <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background" />;
  }

  if (!permission.granted) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top }} className="items-center justify-center gap-4 bg-background px-8">
        <Image source={images.mascotFlexing} resizeMode="contain" style={{ width: 130, height: 130 * (205 / 250) }} />
        <Text className="heading-4 text-center text-text-primary">Camera access needed</Text>
        <Text className="body-sm text-center text-text-secondary">GymCrew needs camera access to photograph your meal and estimate its nutrition.</Text>
        <Pressable onPress={requestPermission} className="mt-2 items-center self-stretch rounded-full bg-brand-yellow py-3.5">
          <Text className="body-md font-body-semibold text-brand-iron">Allow Camera</Text>
        </Pressable>
        <Pressable onPress={handleBack} className="items-center self-stretch rounded-full border border-divider py-3.5">
          <Text className="body-md font-body-semibold text-text-primary">Cancel</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }} className="bg-background">
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />

      <View style={{ position: "absolute", top: insets.top + 12, left: 16, right: 16 }} className="flex-row items-center justify-between">
        <Pressable onPress={handleBack} hitSlop={8} className="h-10 w-10 items-center justify-center rounded-full bg-black/50">
          <Ionicons name="close" size={22} color={colors.brand.white} />
        </Pressable>
        <Text className="body-sm font-body-semibold rounded-full bg-black/50 px-3 py-1.5 text-brand-white">Scan Meal</Text>
        <View className="h-10 w-10" />
      </View>

      <View style={{ position: "absolute", bottom: insets.bottom + 24, left: 16, right: 16 }} className="items-center gap-4">
        {error && <Text className="body-sm rounded-2xl bg-black/70 px-4 py-3 text-center text-brand-white">{error}</Text>}
        {quota?.remaining != null && (
          <Text className="caption font-body-semibold rounded-full bg-black/50 px-3 py-1.5 text-brand-white">
            {`${quota.remaining} AI scan${quota.remaining === 1 ? "" : "s"} left today`}
          </Text>
        )}
        <View className="flex-row items-center justify-between self-stretch px-4">
          <Pressable onPress={handlePickFromLibrary} hitSlop={8} className="h-12 w-12 items-center justify-center rounded-full bg-black/50">
            <Ionicons name="images-outline" size={22} color={colors.brand.white} />
          </Pressable>
          <Pressable onPress={handleCapture} disabled={capturing} className="h-20 w-20 items-center justify-center rounded-full border-4 border-brand-white">
            {capturing ? <ActivityIndicator color={colors.brand.yellow} /> : <View className="h-14 w-14 rounded-full bg-brand-yellow" />}
          </Pressable>
          <View className="h-12 w-12" />
        </View>
      </View>
    </View>
  );
}
