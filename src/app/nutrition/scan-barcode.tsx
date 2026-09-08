import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { images } from "@/constants/images";
import { api, isApiConfigured } from "@/lib/api";
import { useOffFoodsCacheStore } from "@/store/off-foods-cache-store";
import { colors } from "@/theme";

const FRAME_SIZE = 240;

/** Barcode scanner — see NUTRITION.md section 12. Scan → Open Food Facts lookup (cached
 * server-side, see backend/routes/nutrition-off.php) → product found or "we don't have this one
 * yet, add it yourself". Never silently fails on an unknown barcode — that's a normal outcome the
 * flow is explicitly designed to handle. */
export default function ScanBarcodeScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "looking-up" | "not-found" | "error">("idle");
  const rememberOffFoods = useOffFoodsCacheStore((state) => state.remember);

  function handleBack() {
    if (router.canGoBack()) router.back();
    else router.replace("/nutrition/add");
  }

  async function handleBarcodeScanned({ data }: { data: string }) {
    if (scannedCode) return; // already handling one scan
    setScannedCode(data);

    if (!isApiConfigured) {
      setStatus("error");
      return;
    }

    setStatus("looking-up");
    try {
      const result = await api.lookupBarcode(data);
      if (result.found) {
        rememberOffFoods([result.food]);
        router.replace({ pathname: "/nutrition/food/[id]", params: { id: result.food.id } });
      } else {
        setStatus("not-found");
      }
    } catch (error) {
      console.warn("Barcode lookup failed", error);
      setStatus("error");
    }
  }

  function handleRescan() {
    setScannedCode(null);
    setStatus("idle");
  }

  function handleAddManually() {
    router.replace({ pathname: "/nutrition/create-food", params: { barcode: scannedCode ?? undefined } });
  }

  if (!permission) {
    return <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background" />;
  }

  if (!permission.granted) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top }} className="items-center justify-center gap-4 bg-background px-8">
        <Image source={images.mascotFlexing} resizeMode="contain" style={{ width: 130, height: 130 * (205 / 250) }} />
        <Text className="heading-4 text-center text-text-primary">Camera access needed</Text>
        <Text className="body-sm text-center text-text-secondary">
          GymCrew needs camera access to scan a product&apos;s barcode and look up its nutrition.
        </Text>
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
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128"] }}
        onBarcodeScanned={status === "idle" ? handleBarcodeScanned : undefined}
      />

      <View style={{ position: "absolute", top: insets.top + 12, left: 16, right: 16 }} className="flex-row items-center justify-between">
        <Pressable onPress={handleBack} hitSlop={8} className="h-10 w-10 items-center justify-center rounded-full bg-black/50">
          <Ionicons name="close" size={22} color={colors.brand.white} />
        </Pressable>
        <Text className="body-sm font-body-semibold rounded-full bg-black/50 px-3 py-1.5 text-brand-white">Scan Barcode</Text>
        <View className="h-10 w-10" />
      </View>

      {status === "idle" && (
        <View pointerEvents="none" style={{ position: "absolute", top: "50%", left: "50%", marginTop: -FRAME_SIZE / 2, marginLeft: -FRAME_SIZE / 2 }}>
          <View style={{ width: FRAME_SIZE, height: FRAME_SIZE, borderRadius: 24, borderWidth: 3, borderColor: colors.brand.yellow }} />
        </View>
      )}

      {status === "looking-up" && (
        <View style={{ position: "absolute", bottom: insets.bottom + 32, left: 16, right: 16 }} className="flex-row items-center justify-center gap-2 rounded-2xl bg-black/70 py-4">
          <ActivityIndicator size="small" color={colors.brand.yellow} />
          <Text className="body-sm font-body-semibold text-brand-white">Looking up product…</Text>
        </View>
      )}

      {status === "not-found" && (
        <View style={{ position: "absolute", bottom: insets.bottom + 20, left: 16, right: 16 }} className="gap-3 rounded-2xl bg-surface p-4">
          <Text className="body-md font-body-semibold text-text-primary">We don&apos;t have this one yet.</Text>
          <Text className="body-sm text-text-secondary">Enter its nutrition info yourself and it&apos;ll be saved to My Foods.</Text>
          <View className="flex-row gap-3">
            <Pressable onPress={handleRescan} className="flex-1 items-center rounded-full border border-divider py-3">
              <Text className="body-sm font-body-semibold text-text-primary">Scan Again</Text>
            </Pressable>
            <Pressable onPress={handleAddManually} className="flex-1 items-center rounded-full bg-brand-yellow py-3">
              <Text className="body-sm font-body-semibold text-brand-iron">Add This Product</Text>
            </Pressable>
          </View>
        </View>
      )}

      {status === "error" && (
        <View style={{ position: "absolute", bottom: insets.bottom + 20, left: 16, right: 16 }} className="gap-3 rounded-2xl bg-surface p-4">
          <Text className="body-md font-body-semibold text-text-primary">Couldn&apos;t look that up right now.</Text>
          <View className="flex-row gap-3">
            <Pressable onPress={handleRescan} className="flex-1 items-center rounded-full border border-divider py-3">
              <Text className="body-sm font-body-semibold text-text-primary">Try Again</Text>
            </Pressable>
            <Pressable onPress={handleAddManually} className="flex-1 items-center rounded-full bg-brand-yellow py-3">
              <Text className="body-sm font-body-semibold text-brand-iron">Add Manually</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
