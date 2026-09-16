import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Ellipse, Path } from "react-native-svg";

import { images } from "@/constants/images";
import type { ProgressPhotoPose } from "@/lib/api";
import { colors } from "@/theme";

const GUIDE_WIDTH = 200;
const GUIDE_HEIGHT = 420;

const POSE_LABEL: Record<ProgressPhotoPose, string> = { front: "Front", side: "Side", back: "Back" };

/** A single generic body-outline guide, not pose-specific art — good enough to line up distance and
 * framing consistently between shoots (the actual goal), without needing three illustrated poses. */
function BodyOutline() {
  return (
    <Svg width={GUIDE_WIDTH} height={GUIDE_HEIGHT} viewBox="0 0 200 420" fill="none">
      <Ellipse cx="100" cy="40" rx="34" ry="38" stroke={colors.brand.yellow} strokeWidth={2.5} opacity={0.6} />
      <Path
        d="M66 80 C40 95 30 140 34 200 L44 210 L50 160 L56 260 L48 400 L82 400 L96 250 L104 250 L118 400 L152 400 L144 260 L150 160 L156 210 L166 200 C170 140 160 95 134 80 C118 70 82 70 66 80 Z"
        stroke={colors.brand.yellow}
        strokeWidth={2.5}
        opacity={0.6}
      />
    </Svg>
  );
}

type Props = {
  pose: ProgressPhotoPose;
  onCapture: (photo: { base64: string; uri: string }) => void;
  onCancel: () => void;
};

/**
 * Live camera view with a fixed, semi-transparent body-outline overlay so photos taken weeks apart
 * line up at roughly the same distance/framing — that consistency is what makes
 * `ProgressPhotoOverlay`'s before/after comparison actually readable instead of two unrelated snapshots.
 */
export function PhotoCaptureGuide({ pose, onCapture, onCancel }: Props) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  async function handleCapture() {
    if (capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current?.takePictureAsync({ base64: true, quality: 0.7 });
      if (photo?.base64) onCapture({ base64: photo.base64, uri: photo.uri });
    } catch (error) {
      console.warn("Failed to capture progress photo", error);
    } finally {
      setCapturing(false);
    }
  }

  if (!permission) return <View style={{ flex: 1 }} className="bg-background" />;

  if (!permission.granted) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top }} className="items-center justify-center gap-4 bg-background px-8">
        <Image source={images.mascotFlexing} resizeMode="contain" style={{ width: 130, height: 130 * (205 / 250) }} />
        <Text className="heading-4 text-center text-text-primary">Camera access needed</Text>
        <Text className="body-sm text-center text-text-secondary">GymCrew needs camera access to capture your progress photos.</Text>
        <Pressable onPress={requestPermission} className="mt-2 items-center self-stretch rounded-full bg-brand-yellow py-3.5">
          <Text className="body-md font-body-semibold text-brand-iron">Allow Camera</Text>
        </Pressable>
        <Pressable onPress={onCancel} className="items-center self-stretch rounded-full border border-divider py-3.5">
          <Text className="body-md font-body-semibold text-text-primary">Cancel</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }} className="bg-background">
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing="front" />

      <View style={{ position: "absolute", top: insets.top + 12, left: 16, right: 16 }} className="flex-row items-center justify-between">
        <Pressable onPress={onCancel} hitSlop={8} className="h-10 w-10 items-center justify-center rounded-full bg-black/50">
          <Ionicons name="close" size={22} color={colors.brand.white} />
        </Pressable>
        <Text className="body-sm font-body-semibold rounded-full bg-black/50 px-3 py-1.5 text-brand-white">{POSE_LABEL[pose]} Pose</Text>
        <View className="h-10 w-10" />
      </View>

      <View pointerEvents="none" style={{ position: "absolute", top: "50%", left: "50%", marginTop: -GUIDE_HEIGHT / 2, marginLeft: -GUIDE_WIDTH / 2 }}>
        <BodyOutline />
      </View>

      <View style={{ position: "absolute", bottom: insets.bottom + 24, left: 0, right: 0 }} className="items-center">
        <Pressable
          onPress={handleCapture}
          disabled={capturing}
          className="h-20 w-20 items-center justify-center rounded-full border-4 border-brand-white bg-black/30"
        >
          {capturing ? <ActivityIndicator color={colors.brand.white} /> : <View className="h-16 w-16 rounded-full bg-brand-white" />}
        </Pressable>
      </View>
    </View>
  );
}
