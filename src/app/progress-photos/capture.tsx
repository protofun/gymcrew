import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PhotoCaptureGuide } from "@/components/PhotoCaptureGuide";
import { goBack } from "@/lib/navigation";
import { api, isApiConfigured, type ProgressPhotoPose } from "@/lib/api";
import { colors } from "@/theme";

const POSES: { key: ProgressPhotoPose; label: string }[] = [
  { key: "front", label: "Front" },
  { key: "side", label: "Side" },
  { key: "back", label: "Back" },
];

type CapturedPhoto = { base64: string; uri: string };

/** Pose picker → live camera with an alignment guide → confirm → upload. See
 * components/PhotoCaptureGuide.tsx for the camera step and components/ProgressPhotoOverlay.tsx
 * (used on the compare screen) for what this is all in service of. */
export default function CapturePhotoScreen() {
  const insets = useSafeAreaInsets();
  const { pose: initialPose } = useLocalSearchParams<{ pose?: ProgressPhotoPose }>();
  const [pose, setPose] = useState<ProgressPhotoPose>(initialPose ?? "front");
  const [step, setStep] = useState<"pose-select" | "camera" | "preview">("pose-select");
  const [captured, setCaptured] = useState<CapturedPhoto | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleBack() {
    goBack("/progress-photos/compare");
  }

  async function handleUsePhoto() {
    if (!captured) return;
    setUploading(true);
    setError(null);
    try {
      await api.uploadProgressPhoto({ pose, imageBase64: captured.base64, contentType: "image/jpeg", capturedAt: Date.now() });
      goBack("/progress-photos/compare");
    } catch (err) {
      console.warn("Failed to upload progress photo", err);
      setError("Couldn't upload that photo — check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  if (step === "camera") {
    return (
      <PhotoCaptureGuide
        pose={pose}
        onCancel={() => setStep("pose-select")}
        onCapture={(photo) => {
          setCaptured(photo);
          setStep("preview");
        }}
      />
    );
  }

  if (step === "preview" && captured) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
        <Image source={{ uri: captured.uri }} style={{ flex: 1 }} resizeMode="cover" />
        {error && <Text className="body-sm px-4 pt-3 text-center text-error">{error}</Text>}
        <View style={{ paddingBottom: insets.bottom + 16 }} className="flex-row gap-3 px-4 pt-4">
          <Pressable
            onPress={() => setStep("camera")}
            disabled={uploading}
            className="flex-1 items-center rounded-full border border-divider py-3.5"
          >
            <Text className="body-md font-body-semibold text-text-primary">Retake</Text>
          </Pressable>
          <Pressable onPress={handleUsePhoto} disabled={uploading} className="flex-1 items-center rounded-full bg-brand-yellow py-3.5">
            {uploading ? <ActivityIndicator color={colors.brand.iron} /> : <Text className="body-md font-body-semibold text-brand-iron">Use Photo</Text>}
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={handleBack} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">New Progress Photo</Text>
      </View>

      <View className="gap-4 px-4 pt-6">
        <Text className="body-sm text-text-secondary">Pick a pose — line yourself up with the on-screen guide so this photo lines up with your others.</Text>

        <View className="flex-row gap-2 rounded-2xl border border-divider bg-surface p-1.5">
          {POSES.map((option) => (
            <Pressable
              key={option.key}
              onPress={() => setPose(option.key)}
              className={`flex-1 items-center rounded-xl py-2.5 ${pose === option.key ? "bg-brand-yellow" : ""}`}
            >
              <Text className={`body-sm font-body-semibold ${pose === option.key ? "text-brand-iron" : "text-text-secondary"}`}>{option.label}</Text>
            </Pressable>
          ))}
        </View>

        {!isApiConfigured ? (
          <Text className="body-sm text-text-secondary">Progress photos need the app&apos;s backend configured — not available in this build yet.</Text>
        ) : (
          <Pressable onPress={() => setStep("camera")} className="mt-2 items-center rounded-full bg-brand-yellow py-3.5">
            <Text className="body-md font-body-semibold text-brand-iron">Open Camera</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
