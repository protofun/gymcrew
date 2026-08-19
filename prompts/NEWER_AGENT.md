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

## Rank System, XP, Crew Points, Weak Point Engine & Arena

This section is the detailed spec for GymCrew's core game layer. Read it before building any rank, XP, crew-points, body-graph, or arena feature.

### Rank ladder (15 tiers)

Every ranked exercise and every muscle-group score is placed on the same 15-tier ladder, low to high:

1. Rookie
2. Novice
3. Bronze
4. Silver
5. Gold
6. Platinum
7. Diamond
8. Elite
9. Master
10. Grandmaster
11. Champion
12. Titan
13. Mythic
14. Immortal
15. Legend

Tiers 1–2 exist so brand-new users feel progress immediately. Tiers 3–11 are the broad middle where most active users spend years. Tiers 12–15 are deliberately rare and should be driven by percentile thresholds, not fixed score cutoffs, so "Legend" stays a real achievement. All rank scores are normalized by bodyweight and gender before placement on the ladder, so comparisons stay fair across different body types.

### Rank page

The main rank screen shows the user's overall standing and lets them drill into specifics.

- **Summary header** — an aggregate "power score" plus the user's highest current rank badge, and a Gym / Worldwide toggle that sets the comparison context for the whole page.
- **Per-exercise rank cards** — one card per ranked lift (bench, squat, deadlift, OHP, etc.), each showing the rank badge, a progress bar toward the next tier, and the user's percentile within their current tier.
- **Tapping a card** opens a detail view: strength trend over time, how close the user is to promotion/demotion, and nearby competitors at the same gym.
- **Visual flag for lagging lifts** — a card for an exercise that's lagging relative to the user's other lifts gets a distinct visual treatment (e.g. a warning border), feeding into the Weak Point Engine below.
- **Share button** — export the current rank overview or a rank-up as a shareable card.
- **Compare with a crew member** — pick a crew member and see a side-by-side of both users' ranks on one specific lift.
- **"Almost there" notifications** — a push notification when the user is close (e.g. within ~3%) to the next tier on a lift.
- **Rank decay warning** — a subtle warning when prolonged inactivity on a lift is about to cause a relative rank drop, so demotions don't feel like a surprise.
- **Rank history / timeline** — a simple log of past rank-ups per exercise over time.

### "What's my rank?" tool

A standalone lookup/simulation tool, separate from the regular workout log, reachable via a dedicated button on the rank page.

Flow:

1. **Pick an exercise** from the list of ranked lifts.
2. **Enter weight + reps for one set.** Bodyweight and gender are pulled automatically from the user's profile for normalization — no extra input needed.
3. **Reveal animation** — show the resulting rank with the same badge-reveal animation used for a real rank-up. This is intentional: it makes exploring hypothetical numbers ("what if I lifted 100kg?") satisfying on its own.
4. **Log or discard** — after the reveal, two actions:
   - **"Log as PR"** — writes the set into the user's real workout history; it now counts toward rank, XP, and crew points. Useful for retroactively logging a forgotten PR.
   - **"View only"** — dismisses the reveal, nothing is saved. Useful for exploring "what do I need to lift to hit the next tier?".

This tool bypasses the anti-cheat throttling used for crew points, because it is a personal, non-competitive utility — hypothetical input here has no effect on crew standings. It's also a good onboarding moment: new users can see how the rank system works before they've logged any real history.

### XP system (personal leveling)

XP rewards behavior that's hard to fake, not raw numbers:

- **Consistency** — logging on different days, maintaining streaks.
- **Balance** — training muscle groups the heatmap shows as neglected.
- **Relative progress** — XP scales with % improvement over the user's own baseline, not absolute weight, so progress counts proportionally at any level.
- **Variety** — trying new exercises, completing full workouts rather than stopping halfway.

### Crew points — fair by design, no photo/video proof required

Logged weight and reps are easy to fake, so instead of demanding proof (which raises friction and discourages casual use), the system makes any single lie low-impact and leans on inputs that can't be faked in one go:

- Points come mostly from **rank changes**, which are already normalized and smoothed — a single unrealistic entry barely moves a rank.
- **Per-session cap** — a single workout can never contribute more than a fixed maximum to crew points, regardless of what's entered.
- **Consistency & presence** — points for how often the crew trains on the same days or around the same time.
- **Crew-level balance** — points for how well the crew collectively covers all muscle groups.
- **Silent anomaly detection** — statistically unrealistic progress (e.g. a huge jump in one session) simply doesn't count toward crew points, with no accusation or account action shown to the user.

Rule of thumb: the harder a points source is to fake in a single entry, the more it should weigh in the system.

### Weak Point Engine

A rules-based (not black-box AI) analysis that looks at ratios between lifts and muscle-group volume (e.g. bench vs. overhead press, push vs. pull volume) using well-established strength-training heuristics, and surfaces concrete, explainable insights such as: "Your push volume is 40% higher than your pull volume — this can contribute to a bench press plateau. Consider adding more rowing variations." This gives users a reason to keep logging that's independent of competition or crews.

### Body rank graph (personal)

An extension of the existing muscle heatmap: instead of coloring each muscle group by training volume, color it by a **calculated rank for that muscle group**.

- Each muscle group maps to a fixed set of contributing exercises (e.g. chest = bench press, incline press, dips), each weighted by how representative it is of that muscle group.
- The muscle-group rank is a weighted composite of the user's individual exercise ranks within that group, expressed on the same 15-tier ladder, normalized by bodyweight/gender like every other rank.
- **Insufficient data state** — if a muscle group doesn't have enough logged exercises for a reliable rank, it must NOT guess or silently omit it. Render it with a distinct neutral/hatched state (visually different from a genuinely low rank) and, on tap, show exactly which exercises are already logged, which are missing, and how many sessions/sets are still needed for a reliable calculation, with a direct "Log this exercise" action.
- This reuses the same exercise-rank and normalization logic as the rest of the rank system — no separate calculation path.

### GymCrew Arena (crew battles)

A fast, real-time 1v1 (or crew-vs-crew) mini-match, playable anywhere, lasting roughly 3–5 minutes.

- **Roster** — a user's top 4–6 logged exercises become "cards" automatically (Push / Pull / Legs / Core types), with card power derived from the user's current rank/relative strength on that lift. Card power is fixed for the match — nothing can be changed live, so the match itself can't be gamed.
- **Match** — an arena split into lanes by type; players earn energy over time to deploy cards into lanes; a type-triangle (Push beats Legs, Legs beats Pull, Pull beats Push) rewards strategy and timing, not just raw stats.
- **Matchmaking** by rank tier, same as the individual rank system.
- **Crew War** — a 5v5 variant where each crew member represents one lane simultaneously against the opposing crew.
- Wins feed into the same XP / crew points system rather than creating a separate currency.

Keep implementation simple and readable.

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
`MuscleHeatmap`, `MuscleRankGraph`, `RankBadge`, `RankProgressBar`, `RankLadderList`, `WorkoutLogger`, `ExerciseSetRow`, `StrengthTrendChart`, `ProgressPhotoOverlay`, `PhotoCaptureGuide`, `WhatsMyRankModal`, `RankRevealAnimation`, `CrewCard`, `CrewMemberRow`, `CrewLeaderboard`, `CrewCompareRow`, `PRNotificationToast`, `GymLeaderboardRow`, `WeakPointInsightCard`, `ArenaLaneBoard`, `ArenaCard`, `ArenaEnergyBar`. Do not create components too early.

**data/** holds hardcoded content (e.g. exercise list, muscle group → exercise mapping with weights, rank tier thresholds, arena card type-triangle rules). Keep it typed.

**store/** holds Zustand stores. Examples of state to keep here: current user profile (weight, gender, gym, units), workout log entries, crew membership and crew state, rank/leaderboard data, XP and crew points state, muscle-group rank calculations, active arena match state, onboarding progress. Persist with AsyncStorage when needed.

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
