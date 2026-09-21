import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { Image, StyleSheet, View } from "react-native";

import SiriProviderBase from "@/components/ui/organisms/apple-intelligence";
import { useSiri } from "@/components/ui/organisms/apple-intelligence/context";
import type { IAppleIntelligenceProvider, ISiriToggleOptions } from "@/components/ui/organisms/apple-intelligence/types";
import { AI_SCAN } from "@/constants/ai-scan-theme";

// The library types its provider as an intersection of memo/FC types that JSX rejects — this is the same component.
const SiriProvider = SiriProviderBase as unknown as ComponentType<IAppleIntelligenceProvider>;

type AiPhotoGlowProps = {
  photoUri: string;
  /** True once the analysis has finished — the glow winds down, then `onExited` fires. */
  done: boolean;
  onExited: () => void;
};

const SIRI_CONFIG: ISiriToggleOptions = {
  glow: { colors: [...AI_SCAN.glow], speed: 0.24 },
  border: { radius: 0, spread: 16, margin: 0 },
  wave: { strength: 0.8, origin: [0.5, 1] },
  shimmer: { amount: 0.4, speed: 2.8 },
};

function PhotoStage({ photoUri, done, onExited }: AiPhotoGlowProps) {
  const siri = useSiri();
  const siriRef = useRef(siri);
  const onExitedRef = useRef(onExited);
  const doneRef = useRef(done);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    siriRef.current = siri;
    onExitedRef.current = onExited;
    doneRef.current = done;
  });

  // Start the glow once the photo is on screen (the effect snapshots the view, so it has to be there).
  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(() => {
      if (!doneRef.current) siriRef.current.toggle(SIRI_CONFIG);
    }, 250);
    return () => clearTimeout(timer);
  }, [loaded]);

  // Wind the glow down when the result is in, and only then hand over to the next screen.
  useEffect(() => {
    if (!done) return;
    const wasGlowing = siriRef.current.isActive;
    if (wasGlowing) siriRef.current.toggle();
    const timer = setTimeout(() => onExitedRef.current(), wasGlowing ? 1000 : 0);
    return () => clearTimeout(timer);
  }, [done]);

  return (
    <>
      <Image source={{ uri: photoUri }} resizeMode="cover" style={StyleSheet.absoluteFill} onLoad={() => setLoaded(true)} />
      {/* Inside the provider on purpose, so the darkening is part of what the glow effect snapshots. */}
      <LinearGradient colors={["rgba(0,0,0,0.35)", "rgba(0,0,0,0.15)", "rgba(0,0,0,0.75)"]} style={StyleSheet.absoluteFill} />
    </>
  );
}

/** The captured photo with the Reacticx Apple-Intelligence glow rolling over it while the AI works
 * (a Skia shader — native only; the web build uses AiPhotoGlow.web.tsx). */
export function AiPhotoGlow(props: AiPhotoGlowProps) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <SiriProvider>
        <PhotoStage {...props} />
      </SiriProvider>
    </View>
  );
}
