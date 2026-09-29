import { useAuth } from "@clerk/expo";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";

import { AuthStatus } from "@/components/AuthStatus";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useCrewStore } from "@/store/crew-store";
import { useOnboardingStore } from "@/store/onboarding-store";

/**
 * Where `gymcrew://invite/{code}` lands — the real link `InviteMembersModal`'s Share button sends
 * now, instead of a bare code someone had to retype by hand into build-crew/join.tsx.
 *
 * Not signed in yet: the code is stashed (`setPendingInviteCode`, persisted — this can span an
 * app restart) and the normal sign-up wizard starts. `build-crew/_layout.tsx` auto-joins this crew
 * with it once a real session exists, the same way an already-linked Founding Athlete's crew shows
 * up there automatically (see that file's own comment) — so onboarding never asks "create or join a
 * crew" for someone who already answered that by tapping this link. Already signed in (an existing
 * account tapping a friend's link) joins immediately, no detour through the wizard at all.
 */
export default function InviteCodeScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { isLoaded, isSignedIn } = useAuth();
  const joinCrewByCode = useCrewStore((state) => state.joinCrewByCode);
  const setPendingInviteCode = useOnboardingStore((state) => state.setPendingInviteCode);
  const completeCrewSelection = useOnboardingStore((state) => state.completeCrewSelection);
  const setCrewData = useOnboardingStore((state) => state.setCrewData);
  const [error, setError] = useState<string | null>(null);
  const attempted = useRef(false);

  useEffect(() => {
    if (!isLoaded || !code || attempted.current) return;
    attempted.current = true;

    if (!isSignedIn) {
      setPendingInviteCode(code);
      router.replace("/onboarding");
      return;
    }

    (async () => {
      const result = await joinCrewByCode(code);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCrewData({ choice: "join" });
      completeCrewSelection();
      router.replace("/home");
    })();
  }, [isLoaded, isSignedIn, code, joinCrewByCode, setPendingInviteCode, completeCrewSelection, setCrewData]);

  if (!code) {
    return (
      <AuthStatus message="This invite link is missing its code.">
        <PrimaryButton label="Go to GymCrew" hideArrow onPress={() => router.replace("/")} />
      </AuthStatus>
    );
  }

  if (error) {
    return (
      <AuthStatus message={error}>
        <PrimaryButton label="Continue" hideArrow onPress={() => router.replace("/home")} />
      </AuthStatus>
    );
  }

  return <AuthStatus busy message="Joining the crew…" />;
}
