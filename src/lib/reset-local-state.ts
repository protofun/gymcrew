import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

/**
 * Wipes every locally-persisted store so the next account that signs in on this device never
 * inherits a previous account's cached data. This matters most for onboarding-store: the wizard
 * runs before sign-up exists, and `pushAllOnboardingData()` pushes whatever's currently sitting in
 * that store wholesale to whichever account just signed up — without this reset, testing/using a
 * second account on the same device (or a shared/test device in general) could push the FIRST
 * account's name/weight/gender/etc. onto the SECOND account's profile in the database.
 *
 * Reloads the page on web so every store's in-memory state resets too, not just its AsyncStorage
 * copy — Zustand has no built-in "reset every store to its initial state" hook, and a plain
 * `AsyncStorage.clear()` alone would leave already-mounted stores holding stale in-memory data
 * until the next full app load. Call this right after `signOut()` resolves.
 */
export async function resetLocalStateForAccountSwitch(): Promise<void> {
  await AsyncStorage.clear();
  if (Platform.OS === "web") {
    window.location.reload();
  }
}
