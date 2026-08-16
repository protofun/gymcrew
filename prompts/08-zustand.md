Read AGENTS.md first and follow it strictly.

Integrate onboarding & crew choice selection state. Store the selected onboarding / crew values using Zustand with the modern `@react-native-async-storage/async-storage` package. If an authenticated user has no selected values, route them to the onboarding / crew selection screen based on what they are missing. Only after selecting all neccessary options should they access the home route (/). Preserve the existing UI exactly.
