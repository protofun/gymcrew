# GymCrew Reacticx Migration Progress

Updated as of 2026-09-16.

```text
[x] Discovery
[x] Reacticx setup
[x] Design system
[x] Core components
[~] Authentication
[~] Onboarding
[ ] Home
[ ] Workout
[ ] Ranking
[ ] Crews
[ ] Nutrition
[ ] Profile
[ ] History
[ ] Progress
[ ] Settings
[ ] Support
[ ] Global polish
[ ] QA
[ ] Performance
[ ] Final audit
```

## Reacticx setup (Phase 1) — 2026-09-16 — DONE

**Files changed:** `package.json`, `package-lock.json` (added `expo-blur`), new `component.config.json`, `GYMCREW_REACTICX_MIGRATION.md` and `GYMCREW_REACTICX_COMPONENT_MAP.md` (corrected with live CLI registry data).

**Reacticx components used:** none added yet (deliberately deferred to Phase 3).

**Issues discovered:**
- The Phase 0 catalog research (done via WebFetch against reacticx.com's docs pages) disagreed with the real CLI registry in material ways — undercounted components (104 vs. real 163) and wrongly claimed no chart component exists. Corrected by running `npx reacticx list`/`reacticx info <name>` directly. **Lesson recorded in the migration doc: verify against the CLI, not the docs website, for all future component decisions.**
- The real registry has no bottom-sheet/drawer component at all (only `dialog` and a `floating-sheet` template) — changes the plan for `BottomSheet.tsx` (11+ dependents), which will likely keep `@gorhom/bottom-sheet` underneath rather than being replaced.

**Tests performed:**
- `npx tsc --noEmit` — clean, no errors.
- `npx expo export --platform web` — clean, all ~90 routes bundled successfully. Confirms Babel/Metro/NativeWind 5/React Compiler still cooperate.
- NOT run: iOS/Android simulator, physical device, or opening the web bundle in a browser.

**Remaining work:** Phase 1 is otherwise complete (dependency installed, CLI initialized, catalog verified, app confirmed still building). Phase 3's component-by-component migration order is documented in `GYMCREW_REACTICX_COMPONENT_MAP.md`.

---

## Authentication + Onboarding (Phase 4) — 2026-09-16 — IN PROGRESS

**Files changed:** `src/theme/colors.ts`/`radius.ts` (used, not modified further); 21 auth/onboarding screens + `AuthHeader.tsx`/`OnboardingHeader.tsx` (Reanimated `.springify().damping(N).mass(M)` magic numbers replaced with `spring.entranceBouncy`/`spring.press` tokens from Phase 2's `src/theme/motion.ts` — mechanical, behavior-preserving, one deliberate exception left alone: `rank-reveal.tsx`'s bespoke `damping(16)` with no mass, a flagship one-off animation not meant to join the shared scale); `VerificationCodeModal.tsx` rebuilt on `base/otp-input`; `SocialAuthButton.tsx` and `OnboardingFooter.tsx` rebuilt on `base/button` (which needed a small `fullWidth` prop added — documented in its `types.ts` — since it has no built-in way to stretch full-width). New: `src/components/ui/base/otp-input/`, `src/components/ui/base/button/`.

**Reacticx components used:** `otp-input`, `button` (+ shared `create-compound-component`).

**Issues discovered:** Another vendored `react/display-name` lint error (`otp-input`'s default-export `memo()` wrap) — same pattern as Phase 3, fixed the same way. Confirmed `createCompoundComponent` (used by `dialog`/`avatar`/`button`) already sets `.displayName` internally, so only raw `memo()`-wrapped components (not routed through it) need the manual fix.

**Tests performed:** `tsc --noEmit` (clean), `lint` (clean, same 6 pre-existing vendor warnings), `expo export --platform web` (clean). **Additionally — real visual verification**, not just compilation: exported the web build, served it statically, and drove it with Playwright (headless Chromium) — screenshotted `/sign-in`, `/onboarding/welcome`, `/onboarding` (intro), confirmed zero console/page errors, confirmed `SocialAuthButton`/`OnboardingFooter` render correctly full-width (the specific risk the `fullWidth` fix was for), and confirmed a real press-and-navigate interaction on the `OnboardingFooter` CTA works end to end (click → `router.push` → URL changed to `/onboarding/personal-info`). Screenshots are in this session's scratchpad, not committed to the repo.

**Remaining work:** This covers the components shared across all auth/onboarding screens, not the full per-screen AGENTS.md §21 14-step process for each of the ~19 individual screens (content/navigation/state/asset reconnection review, keyboard-behavior check, per-screen empty/error state check). Not yet done: `FormField` (kept custom per Phase 3, no further action needed), `UnitToggle` → `segmented-control` (not attempted this pass), native-platform (iOS/Android simulator) verification — only web has been visually confirmed. Both checklist items left `[~]` rather than `[x]` until a full per-screen pass happens.

---

## Core components (Phase 3) — 2026-09-16 — DONE

**Files changed:** `src/components/ConfirmModal.tsx`, `ProgressBar.tsx`, `Skeleton.tsx`, `AvatarStack.tsx` (rewritten on Reacticx primitives, same public APIs, zero call-site changes); new `src/components/ui/primitives/dialog/`, `src/components/ui/organisms/progress/`, `src/components/ui/molecules/Shimmer/`, `src/components/ui/primitives/avatar/`, `src/components/ui/base/gradient-avatar/`, `src/shared/utils/create-compound-component/` (vendored via `reacticx add`, with hand-fixes: broken import path in `avatar/index.tsx`, missing `displayName` on 4 memo'd components — both are real CLI/registry bugs, documented in `GYMCREW_REACTICX_COMPONENT_MAP.md`).

**Reacticx components used:** `dialog`, `progress`, `Shimmer`, `avatar` (+ their shared deps `gradient-avatar`, `create-compound-component`).

**Issues discovered:** Three real Reacticx CLI/registry bugs, all documented and worked around in `GYMCREW_REACTICX_COMPONENT_MAP.md`'s "CLI quirks" section — (1) `add` aborts entirely if a shared dependency file already exists, unless `--overwrite` is passed; (2) `primitives/avatar`'s vendored source has a broken import path pointing at `@/shared/components/...` instead of the project's real `outDir`; (3) several vendored components fail this project's lint (`react/display-name`) out of the box.

**Tests performed:** `npx tsc --noEmit` (clean), `npm run lint` (clean — 0 errors, 6 pre-existing warnings in vendor animation code, left alone), `npx expo export --platform web` (clean, all routes) — run after this batch.

**Remaining work:** none for Phase 3 itself — all 8 items in the recommended migration order are resolved (4 migrated: `ConfirmModal`/`ProgressBar`/`Skeleton`/`AvatarStack`; 2 kept custom with documented reasoning: `Stepper`/`FormField`; 1 investigated and declined: chart swap; 1 decided against a swap: `BottomSheet` stays on `@gorhom/bottom-sheet` since Reacticx has no bottom-sheet primitive — `floating-sheet` turned out to be a media-player demo on a different third-party library). Second follow-up finding: that same `floating-sheet` investigation left broken vendor files behind (`@lodev09/react-native-true-sheet`/`expo-video` unresolved) that briefly broke `tsc --noEmit` until removed — a reminder to always re-run `tsc` immediately after any `reacticx add`, even one being evaluated rather than adopted. The rest of the component catalog (`RankBadge`, `MuscleHeatmap`, `EditableText`, etc.) is deliberately deferred to Phases 4-11, screen-by-screen, not migrated as a standalone batch — see `GYMCREW_REACTICX_COMPONENT_MAP.md`'s closing note.

---

## Design system (Phase 2) — 2026-09-16 — DONE

**Files changed:** new `src/theme/spacing.ts`, `src/theme/radius.ts`, `src/theme/shadows.ts`, `src/theme/motion.ts`; `src/theme/colors.ts` (added `neutral.surfaceElevated`), `global.css` (mirrored `--color-surface-elevated`), `src/theme/index.ts` (re-exports). No screens or components touched.

**Reacticx components used:** none (still deferred to Phase 3).

**Issues discovered:** none new. Confirmed GymCrew had no second/elevated surface tone anywhere before this — a genuine gap, not something overlooked in Discovery.

**Tests performed:** `npx tsc --noEmit` (clean), `npm run lint` (clean), `npx expo export --platform web` (clean, all routes) — run after the change to confirm no regression.

**Remaining work:** AGENTS.md §17's "component conventions" and "icon conventions" sub-items are deferred to Phase 3, where they can be documented against real Reacticx component usage instead of speculated abstractly. See `GYMCREW_REACTICX_MIGRATION.md` Phase 2 section for the full reasoning behind each token's derivation.

---

## Discovery — 2026-09-16 — DONE

**Files changed:** none (read-only audit). Deliverables created:
- `GYMCREW_REACTICX_MIGRATION.md`
- `GYMCREW_SCREEN_INVENTORY.md`
- `GYMCREW_FEATURE_INVENTORY.md`
- `GYMCREW_ASSET_INVENTORY.md`
- `GYMCREW_REACTICX_COMPONENT_MAP.md`
- `GYMCREW_REACTICX_PROGRESS.md` (this file)

**Reacticx components used:** none yet.

**Issues discovered:**
- Repository has substantial uncommitted work in progress on `dev` (package.json, backend files, ~25 screens/components, several new untracked files) — not touched by this audit, needs a decision before Phase 1 (see `GYMCREW_REACTICX_MIGRATION.md` §2).
- Real Reacticx catalog (~100 components, motion/FX-heavy) has real gaps vs. AGENTS.md's assumption of a full basic design system (no generic Card/TextField/Chart/Calendar/Camera) — see component map §"Real Reacticx catalog."
- Several real bugs/inconsistencies found unrelated to the migration itself, logged per AGENTS.md §34 format below.
- Open product questions logged in `GYMCREW_REACTICX_MIGRATION.md` §7 (Arena naming, subscription enforcement, Dev Mode scope).

**Tests performed:** none (no code changed).

**Remaining work:** everything from Phase 1 onward. Blocked on user direction re: §2/§7 of the migration doc.

---

## Bugs found during Discovery (AGENTS.md §34 format — not fixed, since none block the audit itself)

### BUG 1
- Location: `src/app/profile/support/[id].tsx`
- Problem: `.catch(() => {})` empty catch on the ticket-detail fetch
- Expected: An error state or retry option if the fetch fails
- Actual: Screen sticks on the loading spinner forever
- Severity: Medium (rare path, but a real dead-end for the user)
- Related to migration: No — pre-existing bug, worth fixing while this screen is touched in Phase 11
- Recommended fix: Add a catch branch setting an error state with a retry action, mirroring `crew/join-workout.tsx`'s error banner pattern

### BUG 2
- Location: `src/app/onboarding/personal-info.tsx`
- Problem: The "Profile Picture" camera icon `Pressable` has no `onPress` handler
- Expected: Opens an image picker (or is removed if not planned)
- Actual: Dead UI element, does nothing on tap
- Severity: Low-medium (visible, but non-blocking)
- Related to migration: No
- Recommended fix: Wire it up or remove it during Phase 4 (Onboarding)

### BUG 3
- Location: `src/app/workout/build.tsx`, `src/app/nutrition/meal/[id].tsx`, `src/app/nutrition/my-foods.tsx`, `src/app/nutrition/my-meals.tsx`, `src/app/build-crew/discover.tsx`
- Problem: Use native `Alert.alert` for confirmations
- Expected: Per `workout/active.tsx`'s own documented reasoning, multi-button `Alert.alert` silently no-ops on React Native Web
- Actual: These screens likely have a broken/no-op confirmation dialog on the web/PWA build
- Severity: Medium (web-only, but a real functional gap on a supported platform per `app.config.js`'s `web.output: "static"`)
- Related to migration: Yes — natural to fix opportunistically while re-skinning onto `ConfirmModal`/Reacticx `dialog` in Phases 6/9/11
- Recommended fix: Replace with `ConfirmModal` (already the documented fix pattern elsewhere in the codebase)

### BUG 4
- Location: `src/app/crew/division.tsx`
- Problem: Uses static mock data (`data/crew-leaderboard.ts`'s `OTHER_CREWS_POWER`) for "rival count," while `crew/leaderboard.tsx` has moved to real API data
- Expected: Consistent real-vs-mock data usage across the crew feature area
- Actual: One screen shows a number that can't match the real leaderboard
- Severity: Low-medium (cosmetic inconsistency, not a crash)
- Related to migration: No, but worth flagging to the product owner since it'll be visible during Phase 8 QA
- Recommended fix: Reconcile with real crew standings data during Phase 8

### BUG 5
- Location: `src/app/profile/admin-challenges.tsx` and `src/app/profile/account.tsx`
- Problem: `ADMIN_CHALLENGE_EMAILS` array duplicated verbatim in both files
- Expected: A single shared constant
- Actual: Two independent lists that could drift
- Severity: Low
- Related to migration: No
- Recommended fix: Extract to a shared `lib/` or `constants/` constant during Phase 11 (Settings/Support)
