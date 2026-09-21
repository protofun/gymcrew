import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useEffect } from "react";
import { AppState, Linking, Platform, Pressable, Text, View } from "react-native";

import { isOlderVersion } from "@/lib/app-version";
import { useAppConfigStore } from "@/store/app-config-store";
import { colors } from "@/theme";

/** Full-screen blocker for the two "stop everyone" switches on the admin panel's App Controls page:
 * maintenance mode, and a minimum app version. Public (works signed out) and fails open — if the
 * config can't be fetched nobody is locked out. The web version never needs the update gate: it
 * updates itself on reload. */
export function AppGate() {
  const config = useAppConfigStore((state) => state.config);
  const fetchConfig = useAppConfigStore((state) => state.fetch);

  useEffect(() => {
    fetchConfig();
    // Coming back to the app after a while is when a switch flipped in the meantime matters.
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") fetchConfig();
    });
    return () => subscription.remove();
  }, [fetchConfig]);

  if (!config) return null;

  const { maintenance, update } = config;
  const currentVersion = Constants.expoConfig?.version ?? "0.0.0";
  const updateRequired = Platform.OS !== "web" && update.minVersion !== "" && isOlderVersion(currentVersion, update.minVersion);
  if (!maintenance.enabled && !updateRequired) return null;

  const storeUrl = Platform.OS === "ios" ? update.iosUrl : update.androidUrl;

  return (
    <View className="absolute inset-0 items-center justify-center gap-5 bg-background p-8" style={{ zIndex: 1000, elevation: 1000 }}>
      <View className="h-16 w-16 items-center justify-center rounded-full bg-surface">
        <Ionicons name={maintenance.enabled ? "construct" : "cloud-download"} size={28} color={colors.brand.yellow} />
      </View>
      <View className="items-center gap-2">
        <Text className="heading-4 text-center text-text-primary">{maintenance.enabled ? "We'll be right back" : "Update GymCrew"}</Text>
        <Text className="body-md text-center text-text-secondary">
          {maintenance.enabled
            ? maintenance.message || "GymCrew is being updated. Please try again in a few minutes."
            : update.message || "A new version of GymCrew is available. Update to keep using the app."}
        </Text>
      </View>
      {maintenance.enabled ? (
        <Pressable onPress={fetchConfig} className="rounded-full bg-brand-yellow px-8 py-3.5">
          <Text className="body-md font-body-semibold text-brand-iron">Try again</Text>
        </Pressable>
      ) : (
        storeUrl !== "" && (
          <Pressable onPress={() => Linking.openURL(storeUrl)} className="rounded-full bg-brand-yellow px-8 py-3.5">
            <Text className="body-md font-body-semibold text-brand-iron">Update now</Text>
          </Pressable>
        )
      )}
    </View>
  );
}
