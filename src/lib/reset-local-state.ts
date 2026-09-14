import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

import { useOnboardingStore } from "@/store/onboarding-store";

/**
 * Wipes every locally-persisted store so the next account that signs in on this device never
 * inherits a previous account's cached data. This matters most for onboarding-store: the wizard
 * runs before sign-up exists, and `pushAllOnboardingData()` pushes whatever's currently sitting in
 * that store wholesale to whichever account just signed up — without this reset, testing/using a
 * second account on the same device (or a shared/test device in general) could push the FIRST
 * account's name/weight/gender/etc. onto the SECOND account's profile in the database.
 *
 * `AsyncStorage.clear()` alone only wipes the persisted copy — every already-mounted store keeps
 * its in-memory state until the next full app load, which is what actually caused the leak: on web
 * a page reload forces that reload, but native has no equivalent "reload the JS bundle" primitive
 * without adding a new dependency (expo-updates). So onboarding-store — the one store that gets
 * wholesale-pushed to a fresh account on sign-up — is explicitly reset in memory here too, on every
 * platform, not just cleared from storage. Call this right after `signOut()` resolves.
 */
export async function resetLocalStateForAccountSwitch(): Promise<void> {
  await AsyncStorage.clear();
  useOnboardingStore.getState().resetForAccountSwitch();
  if (Platform.OS === "web") {
    window.location.reload();
  }
}
