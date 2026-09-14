import { Component, type ReactNode } from "react";

/** Catches render errors anywhere below it — without this, an uncaught error (e.g. a page reacting
 * badly to an unexpected API response shape) blanks the entire panel to a white screen with no way
 * out except a hard refresh. "Try Again" resets the boundary and re-renders; if the underlying data
 * was the problem, refreshing the page re-fetches it. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error("Uncaught render error:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-white px-6 text-center dark:bg-gray-900">
        <h1 className="text-lg font-semibold text-gray-800 dark:text-white/90">Something went wrong</h1>
        <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">
          Try again, or refresh the page. If it keeps happening, check the browser console for details.
        </p>
        <button
          onClick={() => this.setState({ error: null })}
          className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
        >
          Try Again
        </button>
      </div>
    );
  }
}
