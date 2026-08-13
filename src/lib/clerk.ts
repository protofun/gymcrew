export function getClerkErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const { longMessage, message } = error as { longMessage?: unknown; message?: unknown };
    if (typeof longMessage === "string") return longMessage;
    if (typeof message === "string") return message;
  }
  return "Something went wrong. Please try again.";
}
