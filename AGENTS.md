You are an expert React Native and Expo engineer helping me build
GymCrew.
Write clean, simple, maintainable code. Prioritize clarity over
unnecessary abstraction.
Think like a senior mobile developer.

---

## Project Overview

We are building GymCrew, a gym-tracking app that turns working out into a game — with skill-based ranks, competition between friend groups, and clear, automatic proof of your progress.
The app includes:

- **Workout logging** — quick entry of exercise, weight, reps, and sets, fast enough to use between sets without breaking focus.
- **Body heatmap overview** — a body silhouette where each muscle group is colored by how much it's been trained recently (bright = heavily trained, gray/cold = neglected), so imbalances (e.g. skipping legs) are obvious at a glance.
- **Objective proof of progress** — since day-to-day change is too gradual to notice yourself, the app makes it explicit:
  - A strength-over-time trend graph (not per single session, but a clear trendline)
  - Automatic notifications when measurable progress has been made (e.g. "you're X% stronger this month")
  - Periodic progress photos taken with an on-screen alignment guide for consistent pose, with old vs. new photos overlaid so the difference is visible, not just felt
- **Fair rank system** — per major lift (bench, squat, deadlift, etc.) users get a rank (Bronze, Silver, Gold, Platinum) similar to games/chess, based on performance relative to others in the same rank tier — not the strongest people in the world, but peers, so it stays competitive for everyone. Rankings are normalized by bodyweight and gender for fair relative-strength comparison. Users can view standings both globally and within their own gym (the gym-level view tends to be more personal and motivating).
- **Crew (friend group) training** — small groups of gym friends can:
  - See what everyone's planning to train that day, to make spontaneous joint sessions easier
  - Have a shared crew score based on everyone's progress, to compete against other crews
  - Get notified when a crew member hits a personal record
  - See which muscle groups the crew as a whole is neglecting
- **Profile & settings** — manage personal data (weight, gym, goals), units (kg/lbs), and an overview of all ranks and achievements.
- **First-time onboarding** — a short, fast step-by-step flow on first open: quick explainer of what the app does, account creation, basic info (weight, gender — needed for fair comparison), gym selection, and a brief intro to how the rank system works. Must be fast enough that people don't drop off before reaching real app usage.

**Monetization**: Free tier covers the basics — logging, personal body heatmap, personal strength graph. Paid tier unlocks the competitive/social layer: participating in the rank system (vs. just viewing it), your own gym's leaderboard, the crew system, and the photo-comparison feature. Rationale: logging alone is now a baseline expectation, but playing the game and training with friends is where the real value — and willingness to pay — is. (Consider allowing crews to split a shared subscription to lower the per-person cost.)

Keep the implementation simple and readable.

---

## Tech Stack

- Expo

- React Native

- TypeScript

- Expo Router

- NativeWind

- Zustand

- AsyncStorage

- Clerk for authentication
  Do not introduce new major libraries unless there is a strong reason.
  Ask before installing anything new.

---

## Development Philosophy

Build feature by feature.
For every feature:

1. Read this file first.

2. Keep the implementation simple.

3. Avoid overengineering.

4. Prefer readable code over clever code.

5. Build the smallest useful version first.

6. Refactor only when repetition appears.

---

## Decision Making

If something is unclear or could be improved, suggest a better
approach. If a new library would significantly help, recommend it,
explain why, and ask before adding it.
Do not install new libraries without approval.

---

## Architecture

Use this folder structure:

```
app/
 (auth)/
 (tabs)/
components/
constants/
data/
hooks/
lib/
store/
types/
assets/
```

**app/** is for routes and screens only. Screens compose components and
call hooks or stores. They should not contain large reusable UI blocks
or business logic.

**components/** is for reusable UI. Create a component when it is
reused in multiple places, when it makes a screen easier to read, or
when it represents a clear UI concept. Examples for this app:
`MuscleHeatmap`, `RankBadge`, `RankProgressBar`, `WorkoutLogger`, `ExerciseSetRow`, `StrengthTrendChart`, `ProgressPhotoOverlay`, `PhotoCaptureGuide`, `CrewCard`, `CrewMemberRow`, `CrewLeaderboard`, `PRNotificationToast`, `GymLeaderboardRow`. Do not create components too early.

**data/** holds hardcoded content (e.g. exercise list, muscle group mapping, rank tier thresholds). Keep it typed.

**store/** holds Zustand stores. Examples of state to keep here: current user profile (weight, gender, gym, units), workout log entries, crew membership and crew state, rank/leaderboard data, onboarding progress. Persist with AsyncStorage when needed.

**lib/** holds external service helpers (clerk.ts, api.ts, cn.ts).
Never expose secret keys here.

---

## UI Rules

For any UI task:

- Replicate the provided design exactly.
- Match layout, spacing, padding, font sizes, font hierarchy, colors,
  border radius, shadows, alignment, and proportions.

- Do not approximate. Do not simplify unless explicitly asked.

---

## Styling Rules

Use NativeWind classes. Do not use StyleSheet unless it is not possible
to style with className.
Use the NativeWind version installed in this project. Check
package.json. Do not upgrade without approval.
Reuse class patterns through utilities in global.css.

### Style Exception List

Use StyleSheet or inline styles for:

- SafeAreaView (className not supported)

- KeyboardAvoidingView (behavior props)

- Modal (visible, transparent props)

- Animated.View (animated style values)

- Dynamic styles calculated at runtime (e.g. heatmap muscle color intensity)

- Platform specific styles

- Pressable or TouchableOpacity pressed states

- Shadows (different per platform)
  Everywhere else, use NativeWind.

---

## Image Rule

Use centralized image imports.

1. Check if constants/images.ts exists.

2. If not, create it.

3. Import all app images there.

4. Use them through the centralized object.

```ts
import mascot from "@/assets/images/mascot.png";
export const images = {
  mascot,
};
```

```tsx
<Image source={images.mascot} />
```

Do not import image assets directly inside screens or components.

---

## State Management

- Zustand for global client state.

- Local state for temporary UI state.

- AsyncStorage for persistence.

---

## TypeScript

- Strict mode.

- No `any`.

- Keep types simple and readable.

---

## Feature Implementation

When building a feature:

1. Read this file first.

2. Identify the files to change.

3. Keep changes focused.

4. Do not rewrite unrelated code.

5. Follow existing patterns.

6. Make sure the feature works end to end.

7. Fix lint and type errors before finishing.

---

## Secrets

- Never expose secret keys in client code.

- Use server routes for tokens, AI calls, and any external API access.

---

## Authentication

Use Clerk. Do not build custom auth.

---

## Communication

Be concise. Explain what changed and how to test it.

---

## Final Reminder

Before every feature:

- Read this file.

- Follow it strictly.

- Build clean, simple code.

- Replicate UI exactly when designs are provided.
