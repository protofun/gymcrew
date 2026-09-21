import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { usePostHog } from "posthog-react-native";

import { AiScanAnalyzing, type AnalysisStatus } from "@/components/AiScanAnalyzing";
import { AiScanCamera } from "@/components/AiScanCamera";
import { SLIDER_STEP } from "@/components/AiScanIngredientRow";
import { AiScanNotice } from "@/components/AiScanNotice";
import { PORTION_FACTORS, type PortionSize } from "@/components/AiScanPortionChips";
import { AiScanResults } from "@/components/AiScanResults";
import { ConfirmModal } from "@/components/ConfirmModal";
import { api, isApiConfigured, type MealItem, type MealPhotoItem, type MealScanCorrection, type MealScanQuota } from "@/lib/api";
import { newAiMealId, saveAiMealToLog } from "@/lib/ai-meals";
import { toDateKey } from "@/lib/date";
import { mealSlotForTime, type MealSlot } from "@/lib/meal-slot";
import { goBack } from "@/lib/navigation";
import { scaleMacros, sumMacros } from "@/lib/nutrition-macros";
import { useAiMealsStore, type AiMealItem } from "@/store/ai-meals-store";
import { useNutritionLogStore } from "@/store/nutrition-log-store";
import { useNutritionTargetsStore } from "@/store/nutrition-targets-store";

type Phase = "camera" | "analyzing" | "review";
type Photo = { base64: string; uri: string };

// Low JPEG quality keeps the upload small; it's still plenty of detail to recognise food.
const PHOTO_QUALITY = 0.4;
/** How long after the last change (a slider drag, a removed ingredient) the log entry is rewritten. */
const COMMIT_DELAY_MS = 500;

/** The AI's estimate as an editable ingredient — `servingSize` is the estimated portion, so
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

/** What gets stored for an ingredient: its grams and the macros of that whole portion. */
function toAiMealItem(item: MealItem): AiMealItem {
  return { id: item.id, name: item.name, grams: item.quantity, ...scaleMacros(item, item.quantity) };
}

/** Identifies the meal's current state, to tell whether the log entry is still up to date. */
function signatureOf(items: MealItem[], slot: MealSlot): string {
  return JSON.stringify([slot, items.map((item) => [item.id, item.quantity])]);
}

/** Photo → AI estimate → the meal is logged straight away. The photo goes to the backend (see
 * backend/routes/nutrition-photo-scan.php), which asks Gemini what's on the plate. The whole meal is
 * then written to the food log as ONE entry (see lib/ai-meals.ts) — and this screen only adjusts that
 * entry: grams, a trash can per ingredient, the meal slot, or a typed correction that re-analyses the
 * photo. The photo is also uploaded (in the background) so it can be shown with the meal in the log.
 * This file holds the state and the API calls; every step is its own AiScan* component. */
export default function ScanMealScreen() {
  const posthog = usePostHog();
  const { date } = useLocalSearchParams<{ date?: string }>();
  const targetDateKey = date ?? toDateKey(new Date());
  const cameraRef = useRef<CameraView>(null);
  const applyOutcomeRef = useRef<(() => void) | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const entries = useNutritionLogStore((state) => state.entries);
  const targetCalories = useNutritionTargetsStore((state) => state.calories);

  const [phase, setPhase] = useState<Phase>("camera");
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>("working");
  const [quota, setQuota] = useState<MealScanQuota | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [items, setItems] = useState<MealItem[]>([]);
  const [hint, setHint] = useState("");
  const [portion, setPortion] = useState<PortionSize>("regular");
  const [mealSlot, setMealSlot] = useState<MealSlot>(mealSlotForTime());
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  // The meal being logged. Refs, not state: they're read from timers and the unmount cleanup, and must
  // never be stale — a stale copy is exactly how an item ends up logged twice.
  const aiMealIdRef = useRef<string | null>(null);
  const createdAtRef = useRef(Date.now());
  const photoRef = useRef<Photo | null>(null);
  const photoUrlRef = useRef<string | null>(null);
  const photoUploadStartedRef = useRef(false);
  const savedSignatureRef = useRef("");
  const latestRef = useRef({ items, mealSlot });

  useEffect(() => {
    latestRef.current = { items, mealSlot };
  });

  useEffect(() => {
    if (!isApiConfigured) return;
    api
      .getMealScanQuota()
      .then(setQuota)
      .catch((err) => console.warn("Failed to load meal scan quota", err));
  }, []);

  const dayCalories = useMemo(() => sumMacros(entries.filter((entry) => entry.dateKey === targetDateKey)).calories, [entries, targetDateKey]);

  /** Writes the meal to the log — its single entry is replaced, never added to. */
  const commitMeal = useCallback(
    (list: MealItem[], slot: MealSlot) => {
      if (!aiMealIdRef.current) aiMealIdRef.current = newAiMealId();
      saveAiMealToLog({
        id: aiMealIdRef.current,
        photoUrl: photoUrlRef.current ?? photoRef.current?.uri ?? "",
        items: list.map(toAiMealItem),
        mealSlot: slot,
        dateKey: targetDateKey,
        createdAt: createdAtRef.current,
      });
      savedSignatureRef.current = signatureOf(list, slot);
    },
    [targetDateKey],
  );

  /** Uploads the photo once, in the background, and points the meal at the uploaded copy when it's there
   * — until then (or if it fails) the meal keeps the phone's own file. */
  function uploadPhotoOnce() {
    const source = photoRef.current;
    const mealId = aiMealIdRef.current;
    if (!source || !mealId || photoUploadStartedRef.current || !isApiConfigured) return;
    photoUploadStartedRef.current = true;
    api
      .uploadFoodPhoto(source.base64, "image/jpeg")
      .then(({ url }) => {
        photoUrlRef.current = url;
        useAiMealsStore.getState().setPhotoUrl(mealId, url);
      })
      .catch((err) => console.warn("Failed to upload the meal photo", err));
  }

  // Changes made in the results screen reach the log a moment after you stop touching things.
  useEffect(() => {
    if (phase !== "review" || !aiMealIdRef.current) return;
    if (signatureOf(items, mealSlot) === savedSignatureRef.current) return;
    const timer = setTimeout(() => commitMeal(items, mealSlot), COMMIT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [items, mealSlot, phase, commitMeal]);

  // Leaving before that moment has passed must not lose the last change.
  useEffect(
    () => () => {
      const { items: latestItems, mealSlot: latestSlot } = latestRef.current;
      if (aiMealIdRef.current && signatureOf(latestItems, latestSlot) !== savedSignatureRef.current) commitMeal(latestItems, latestSlot);
    },
    [commitMeal],
  );

  function handleBack() {
    goBack("/nutrition/add");
  }

  function handleFlush() {
    if (aiMealIdRef.current && signatureOf(items, mealSlot) !== savedSignatureRef.current) commitMeal(items, mealSlot);
  }

  function handleDone() {
    router.replace("/nutrition");
  }

  /** Takes the whole meal out of the log again. */
  function handleRemoveMeal() {
    setConfirmRemove(false);
    if (aiMealIdRef.current) {
      saveAiMealToLog({ id: aiMealIdRef.current, photoUrl: "", items: [], mealSlot, dateKey: targetDateKey });
      aiMealIdRef.current = null;
      posthog.capture("ai_meal_removed");
    }
    router.replace("/nutrition");
  }

  /** The result is in — but the analysing screen first winds its glow down. Whatever should happen
   * next is parked here and runs when that animation calls back (`handleAnalysisExited`). */
  function finishAnalysis(status: AnalysisStatus, applyOutcome: () => void) {
    applyOutcomeRef.current = applyOutcome;
    setAnalysisStatus(status);
  }

  const handleAnalysisExited = useCallback(() => {
    applyOutcomeRef.current?.();
    applyOutcomeRef.current = null;
  }, []);

  async function analyze(next: Photo, correction?: MealScanCorrection) {
    if (!isApiConfigured) {
      setError("Meal scanning needs a connection to the GymCrew server.");
      return;
    }

    photoRef.current = next;
    setPhoto(next);
    setError(null);
    setAnalysisStatus("working");
    setPhase("analyzing");
    // A failed correction goes back to the list the user already had; a failed first scan to the camera.
    const fallbackPhase: Phase = correction ? "review" : "camera";
    try {
      const result = await api.scanMealPhoto(next.base64, "image/jpeg", correction);
      setQuota(result.quota);
      posthog.capture("meal_photo_scanned", { item_count: result.items.length, is_correction: !!correction });
      if (result.items.length === 0) {
        const message = correction
          ? "We couldn't find any food with that description. Try describing it differently."
          : "We couldn't spot any food in that photo. Try again with the whole plate in view.";
        finishAnalysis("failed", () => {
          setError(message);
          setPhase(fallbackPhase);
        });
        return;
      }
      const nextItems = result.items.map(toMealItem);
      finishAnalysis("done", () => {
        setItems(nextItems);
        setHint("");
        setPortion("regular");
        setPhase("review");
        // The meal goes into the log right away; a correction replaces the earlier version.
        commitMeal(nextItems, mealSlot);
        uploadPhotoOnce();
        posthog.capture("food_logged", { source: "photo_scan", meal_slot: mealSlot, item_count: nextItems.length, calories: sumMacros(nextItems.map((item) => scaleMacros(item, item.quantity))).calories });
      });
    } catch (err) {
      console.warn("Meal photo scan failed", err);
      const message = err instanceof Error ? err.message : "Couldn't analyse that photo. Try again.";
      finishAnalysis("failed", () => {
        setError(message);
        setPhase(fallbackPhase);
      });
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

  /** Scales every ingredient from the AI's original estimate (`servingSize`), rounded to slider steps. */
  function handleChangePortion(next: PortionSize) {
    setPortion(next);
    const factor = PORTION_FACTORS[next];
    setItems((current) => current.map((item) => ({ ...item, quantity: Math.max(SLIDER_STEP, Math.round((item.servingSize * factor) / SLIDER_STEP) * SLIDER_STEP) })));
  }

  function handleRemoveItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  if (phase === "review" && photo) {
    return (
      <>
        <AiScanResults
          photoUri={photo.uri}
          items={items}
          mealSlot={mealSlot}
          portion={portion}
          hint={hint}
          error={error}
          scansRemaining={quota?.remaining ?? null}
          dayCalories={dayCalories}
          targetCalories={targetCalories}
          onBack={() => {
            handleFlush();
            handleDone();
          }}
          onRemoveMeal={() => setConfirmRemove(true)}
          onChangeMealSlot={setMealSlot}
          onChangePortion={handleChangePortion}
          onChangeHint={setHint}
          onReanalyse={handleReanalyse}
          onChangeQuantity={handleChangeQuantity}
          onRemoveItem={handleRemoveItem}
          onFlush={handleFlush}
          onDone={handleDone}
        />
        <ConfirmModal
          visible={confirmRemove}
          title="Remove this meal?"
          message="It will be taken out of your food log, with all its ingredients."
          confirmLabel="Remove"
          destructive
          onConfirm={handleRemoveMeal}
          onCancel={() => setConfirmRemove(false)}
        />
      </>
    );
  }

  if (phase === "analyzing" && photo) {
    return <AiScanAnalyzing photoUri={photo.uri} status={analysisStatus} onExited={handleAnalysisExited} />;
  }

  if (quota?.remaining === 0) {
    return (
      <AiScanNotice
        title="SCANS USED UP"
        body="Your AI scans reset tomorrow. You can still log this meal by searching for the food or with Quick Add."
        primaryLabel="Search Food"
        onPrimary={() => router.replace({ pathname: "/nutrition/add", params: { date: targetDateKey } })}
        secondaryLabel="Cancel"
        onSecondary={handleBack}
      />
    );
  }

  if (!permission) {
    return <View className="flex-1 bg-background" />;
  }

  if (!permission.granted) {
    return (
      <AiScanNotice
        title="CAMERA NEEDED"
        body="GymCrew needs camera access to photograph your meal and estimate its nutrition."
        primaryLabel="Allow Camera"
        onPrimary={requestPermission}
        secondaryLabel="Cancel"
        onSecondary={handleBack}
      />
    );
  }

  return (
    <AiScanCamera
      cameraRef={cameraRef}
      remaining={quota?.remaining ?? null}
      error={error}
      capturing={capturing}
      onCapture={handleCapture}
      onPickFromLibrary={handlePickFromLibrary}
      onClose={handleBack}
    />
  );
}
