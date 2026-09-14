import { Component, type ReactNode } from "react";
import { Platform, Pressable, SafeAreaView, Text } from "react-native";

import { Sentry } from "@/config/sentry";
import { colors } from "@/theme";

type ErrorBoundaryProps = { children: ReactNode };
type ErrorBoundaryState = { error: Error | null };

/**
 * Catches render errors anywhere below it in the tree — without this, an uncaught error just
 * unmounts the whole app to a blank white screen on native (or a broken page on web), with zero
 * visibility for us unless the user happens to report it. Reports to Sentry when configured (see
 * config/sentry.ts — safe no-op otherwise) and always logs to console so it's visible in dev.
 *
 * "Try Again" resets the boundary and re-renders the tree — a soft reset, not a full app reload
 * (this project doesn't have expo-updates installed for that). Good enough for a one-off render
 * glitch; a genuinely broken app state still needs the user to force-quit and reopen, same as
 * before this existed — this only replaces "blank screen, no way out" with "an actual message and
 * one thing to try."
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error("Uncaught render error:", error, info.componentStack);
    Sentry.captureException(error);
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.neutral.background, gap: 16, padding: 24 }}>
        <Text className="heading-4 text-text-primary">Something went wrong</Text>
        <Text className="body-md text-center text-text-secondary">
          {Platform.OS === "web"
            ? "Try refreshing the page. If it keeps happening, let us know."
            : "Try again. If it keeps happening, close and reopen the app."}
        </Text>
        <Pressable onPress={this.handleRetry} className="rounded-full bg-brand-yellow px-6 py-3">
          <Text className="body-md font-body-bold text-brand-iron">Try Again</Text>
        </Pressable>
      </SafeAreaView>
    );
  }
}
