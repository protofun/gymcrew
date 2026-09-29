import { useAuth, useSignIn } from "@clerk/expo";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text } from "react-native";

import { AuthStatus } from "@/components/AuthStatus";
import { PrimaryButton } from "@/components/PrimaryButton";

import { waitForAuthToken } from "@/lib/api";
import { getClerkErrorMessage } from "@/lib/clerk";
import { useOnboardingStore } from "@/store/onboarding-store";

/**
 * Where `gymcrew://auth-handoff?ticket=...` lands — the deep link minted by the marketing site's
 * "Open the App" button (backend/routes/athlete-signup.php's /athlete-app-link) for someone who
 * already made a real account there (a Founding Athlete, or a Crew member who joined via invite).
 * Consumes the one-time Clerk sign-in ticket to sign that SAME account straight in — no sign-up
 * form, no re-entering the password they already chose on the website. From here on this is just a
 * normal returning sign-in: the post-auth gate (app/index.tsx) still requires onboarding, same as
 * for anyone else, but Crew selection is skipped automatically once it exists (see
 * build-crew/_layout.tsx) since this account's Crew was already carried over server-side.
 */
export default function AuthHandoffScreen() {
  const { ticket } = useLocalSearchParams<{ ticket?: string }>();
  const { signIn } = useSignIn();
  const { isSignedIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!signIn || !ticket || isSignedIn) return;

    let cancelled = false;
    (async () => {
      const { error: ticketError } = await signIn.ticket({ ticket });
      if (cancelled) return;
      if (ticketError) {
        setError(getClerkErrorMessage(ticketError));
        return;
      }
      if (signIn.status !== "complete") {
        setError("Couldn't complete sign-in. Try opening the link again.");
        return;
      }

      const { error: finalizeError } = await signIn.finalize();
      if (cancelled) return;
      if (finalizeError) {
        setError(getClerkErrorMessage(finalizeError));
        return;
      }

      await waitForAuthToken();
      await useOnboardingStore.getState().syncProfileFromServer();
      router.replace("/");
    })();

    return () => {
      cancelled = true;
    };
  }, [signIn, ticket, isSignedIn, attempt]);

  if (!ticket) {
    return (
      <AuthStatus message="This link is missing what it needs to sign you in.">
        <PrimaryButton label="Go to Sign In" hideArrow onPress={() => router.replace("/sign-in")} />
      </AuthStatus>
    );
  }

  if (error) {
    return (
      <AuthStatus message={error}>
        <PrimaryButton
          label="Try Again"
          hideArrow
          onPress={() => {
            setError(null);
            setAttempt((n) => n + 1);
          }}
        />
        <Pressable onPress={() => router.replace("/sign-in")} hitSlop={8} className="items-center">
          <Text className="body-sm text-brand-yellow">Sign in manually instead</Text>
        </Pressable>
      </AuthStatus>
    );
  }

  return <AuthStatus busy message="Signing you in…" />;
}
