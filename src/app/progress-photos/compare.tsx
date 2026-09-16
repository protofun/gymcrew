import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ProgressPhotoOverlay } from "@/components/ProgressPhotoOverlay";
import { goBack } from "@/lib/navigation";
import { api, isApiConfigured, type ProgressPhoto, type ProgressPhotoPose } from "@/lib/api";
import { colors } from "@/theme";

const POSES: { key: ProgressPhotoPose; label: string }[] = [
  { key: "front", label: "Front" },
  { key: "side", label: "Side" },
  { key: "back", label: "Back" },
];

const THUMB_SIZE = 108;

/** Photo grid per pose → pick any two to see them overlaid (see ProgressPhotoOverlay) — the payoff
 * for the capture flow's alignment-guided photos (see progress-photos/capture.tsx). */
export default function ComparePhotosScreen() {
  const insets = useSafeAreaInsets();
  const [pose, setPose] = useState<ProgressPhotoPose>("front");
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [loading, setLoading] = useState(isApiConfigured);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isApiConfigured) return;
    api
      .getProgressPhotos()
      .then(setPhotos)
      .catch((error) => console.warn("Failed to load progress photos", error))
      .finally(() => setLoading(false));
  }, []);

  const posePhotos = photos.filter((photo) => photo.pose === pose).sort((a, b) => b.capturedAt - a.capturedAt);
  const selectedPhotos = posePhotos.filter((photo) => selectedIds.includes(photo.id)).sort((a, b) => a.capturedAt - b.capturedAt);

  function handleSelectPose(next: ProgressPhotoPose) {
    setPose(next);
    setSelectedIds([]);
  }

  function toggleSelect(id: string) {
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((selectedId) => selectedId !== id);
      if (current.length < 2) return [...current, id];
      return [current[1], id]; // keep the most recent tap plus the newly tapped one
    });
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => goBack("/(tabs)/profile")} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Progress Photos</Text>
        <Pressable
          onPress={() => router.push({ pathname: "/progress-photos/capture", params: { pose } })}
          hitSlop={8}
          style={{ position: "absolute", right: 16 }}
        >
          <Ionicons name="camera-outline" size={24} color={colors.brand.yellow} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 16 }} showsVerticalScrollIndicator={false}>
        <View className="flex-row gap-2 rounded-2xl border border-divider bg-surface p-1.5">
          {POSES.map((option) => (
            <Pressable
              key={option.key}
              onPress={() => handleSelectPose(option.key)}
              className={`flex-1 items-center rounded-xl py-2.5 ${pose === option.key ? "bg-brand-yellow" : ""}`}
            >
              <Text className={`body-sm font-body-semibold ${pose === option.key ? "text-brand-iron" : "text-text-secondary"}`}>{option.label}</Text>
            </Pressable>
          ))}
        </View>

        {!isApiConfigured ? (
          <Text className="body-sm text-text-secondary">Progress photos need the app&apos;s backend configured — not available in this build yet.</Text>
        ) : loading ? (
          <View className="items-center py-10">
            <ActivityIndicator color={colors.brand.yellow} />
          </View>
        ) : posePhotos.length === 0 ? (
          <View className="items-center gap-3 rounded-2xl border border-divider bg-surface px-6 py-10">
            <Ionicons name="camera-outline" size={32} color={colors.neutral.textSecondary} />
            <Text className="body-md text-center text-text-primary">No {pose} photos yet</Text>
            <Text className="body-sm text-center text-text-secondary">Capture your first one to start tracking how your physique changes over time.</Text>
            <Pressable
              onPress={() => router.push({ pathname: "/progress-photos/capture", params: { pose } })}
              className="mt-2 items-center self-stretch rounded-full bg-brand-yellow py-3"
            >
              <Text className="body-sm font-body-semibold text-brand-iron">Take a Photo</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {selectedPhotos.length === 2 ? (
              <ProgressPhotoOverlay before={selectedPhotos[0]} after={selectedPhotos[1]} />
            ) : (
              <Text className="body-sm text-text-secondary">
                {selectedIds.length === 0 ? "Pick two photos to compare." : "Pick one more photo to compare."}
              </Text>
            )}

            <View className="flex-row flex-wrap gap-3">
              {posePhotos.map((photo) => {
                const selected = selectedIds.includes(photo.id);
                return (
                  <Pressable
                    key={photo.id}
                    onPress={() => toggleSelect(photo.id)}
                    style={{ width: THUMB_SIZE, height: THUMB_SIZE }}
                    className={`overflow-hidden rounded-xl border-2 ${selected ? "border-brand-yellow" : "border-transparent"}`}
                  >
                    <Image source={{ uri: photo.photoUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
