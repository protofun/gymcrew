# GymCrew Reacticx Migration Progress

Updated as of 2026-09-17.

## Direct override (2026-09-17) — the scope correction below was itself reversed

The user explicitly overrode the `AGENTS.md`-based correction above: login, onboarding, and Home must run on Reacticx after all, with GymCrew's own hand-rolled UI-chrome components removed in favor of it. Restored every reverted commit (`git revert` of the revert), then went further than before — components previously kept custom after a first "doesn't fit" pass were re-evaluated more aggressively:

- **`FormField` → `base/animated-input-bar`** (single-entry `placeholders` array so its reveal animation never rotates). Trade-off: the old persistent label-above-value is gone, placeholder-only now. Visually confirmed on `sign-in`.
- **`OnboardingDots` → `molecules/Pagination`**. Real upgrade (animated sliding pill vs. grow-in-place dot); accepted trade-off is an unused drag-to-jump gesture the primitive ships with.
- **`SliderField` → `micro-interactions/elastic-slider`** (Root/Track/Fill), replacing the `@react-native-community/slider`-backed version. Visually confirmed on `your-stats` (Age, Height) — real elastic-overshoot feel.
- **Gender picker in `your-stats.tsx` → `organisms/segmented-control`** (was a hand-rolled two-`Pressable` pair) — a good fit this time since it's already full-width, unlike `UnitToggle`'s tight inline slot. Visually confirmed, looks and animates correctly.
- **`Stepper` → attempted via a new `RulerStepper` on `base/ruler` (a Skia-rendered drag-to-scroll scale), then reverted.** `Ruler` had a real, separate bug fixed along the way (no controlled initial-position — always opened scrolled to `minValue`, ignoring an existing default; fixed by adding an `initialValue` prop to the vendored component). But verification caught something more serious: **`Ruler`'s Skia `Canvas` renders as a completely blank box on web** — `CanvasKit is not defined` / `Cannot read properties of undefined (reading 'PictureRecorder')` in the console, exactly the "Skia/Expo Go incompatibility" class of problem `AGENTS.md`'s own Reacticx section warns about. Since the user is testing live via a browser, shipping this would mean an invisible weight/lift input — reverted `your-stats.tsx`/`your-metrics.tsx` back to the original `Stepper`, deleted `RulerStepper.tsx` and the vendored `ui/base/ruler` (unused, and broken on the platform being tested). **Not ruled out for native** (Skia doesn't need CanvasKit/WASM on iOS/Android) — worth revisiting specifically for a native build/simulator test, not web.
- **Not yet touched**: `UnitToggle` (previously investigated and kept custom — that reasoning still holds, tight inline slot), the single-select pill patterns in `your-goal.tsx`/`training-experience.tsx` (not yet reconsidered against `segmented-control`/`check-box`), and `Card`/`AuthSubmitButton` (already Reacticx-based internally via `Button`/`atoms/pressable` — read as satisfying "runs on Reacticx" rather than needing to be inlined everywhere, since they're thin compositions over the primitive, not competing hand-rolled UI).

Verified after every step: `tsc --noEmit` (clean throughout), `lint` (0 errors — 30 warnings, all the same pre-existing vendor `exhaustive-deps` pattern scaled up with more vendored components), `expo export --platform web` (clean), and Playwright screenshots of the actual changed screens (not synthetic preview routes) — `sign-in`, `your-stats`, `your-metrics` — with a full before/after pass specifically to catch the `Ruler` regression, which is exactly what caught it.

---

## Visible-flair pass (animated text) — 2026-09-17 — IN PROGRESS

The user rejected the previous batch as insufficient: internally-Reacticx-but-pixel-identical isn't what was asked for — they want dramatic, *visible* change (their words: "kom aan met nieuwe dingen zoals de animated tekst... maak het ziek"). This pass targets that directly by rolling out `organisms/animated-text` (exported as `StaggeredText`, a per-character entrance/exit reveal built on pure Reanimated) to the highest-visibility headline text in the three screens already in scope (auth, onboarding, Home):

- **`AuthHeader.tsx`** — the "GYMCREW" wordmark (split into two `StaggeredText` runs, "GYM" in white / "CREW" in yellow, staggered relative to each other via a later `characterDelay`) and the screen title (e.g. "Welcome back") both now animate in character-by-character instead of appearing as static `Text`.
- **`OnboardingHeader.tsx`** — the big italic yellow title (e.g. "Your Stats") now uses `StaggeredText` instead of static `Text`, styled inline to match the original look (`fontFamily.bodyBold`, 48px, italic, brand yellow).
- **`WelcomeWidget.tsx`** (Home) — the "READY TO / BE UNSTOPPABLE?" headline is now two `StaggeredText` lines instead of a static `Animated.Text`.

**Reacticx components used:** `organisms/animated-text` (new addition this batch).

**Issues discovered:**
- `StaggeredText`'s default look includes a per-character blur reveal via `expo-blur`'s animated `intensity` prop. **This is broken on web** — the animated intensity doesn't interpolate correctly and the text renders as a permanent unreadable smudge instead of resolving to sharp. Since the user tests live in a browser, this had to be disabled everywhere it's used: `animationConfig={{ maxBlurIntensity: 0 }}`. The fade/slide/scale/rotate portion of the reveal (the rest of the animation) works correctly on web and is what actually ships. Documented as a reusable `NO_BLUR` constant in each consuming file.
- Two other flashy Reacticx components were evaluated and rejected before landing on `animated-text`, both for the same underlying reason — **Skia-based rendering breaks on web in this project** (CanvasKit/WASM doesn't load correctly in the Metro web bundle):
  - `base/ruler` — see the entry above; already reverted.
  - `molecules/gradient-wave-text` — a Skia-`Canvas`-based gradient text-reveal, which would otherwise have been a strong fit for the wordmark/headlines. Confirmed broken the same way (blank canvas), and it also doesn't support multi-line text (`numberOfLines={1}` hardcoded). Added, verified broken, then deleted along with the `@react-native-masked-view/masked-view` dependency it required (uninstalled via `npm uninstall` after confirming no other file references it).
  - Also added-then-deleted as unused/not-a-fit after the same Skia-safety sweep: `organisms/staggered-text` (Skia, name-confusingly similar to the kept `animated-text`'s `StaggeredText` export but a completely different Skia implementation), `molecules/letter-swarm` (Skia), `base/border-beam` (Skia), `organisms/aura-lift` (Skia). And safe-but-unused, also removed: `molecules/dynamic-text`, `molecules/number-flow`, `organisms/fade-text`, `micro-interactions/verified-shine`.
- Fixed the same recurring vendor bug pattern as every other component this session: `Character` and `StaggeredText` in `organisms/animated-text/index.tsx` are wrapped in raw `memo()` without a `.displayName`, tripping `react/display-name`. Added `Character.displayName = "Character"` and `StaggeredText.displayName = "StaggeredText"`.

**Tests performed:** `npx tsc --noEmit` (clean), `npm run lint` (0 errors, 30 pre-existing vendor warnings — none new), `npx expo export --platform web` (clean), Playwright screenshots of the real screens (`sign-in`, `your-stats`, and a temporary isolated preview route for `WelcomeWidget` since it needs store data Home's real route doesn't provide standalone) confirming the animated headlines render crisp and correctly laid out with no blur artifacts. The only console error was the already-documented, pre-existing, migration-unrelated React `#418` hydration warning (reproduces on untouched routes too; absent on the live Metro dev server).

**Remaining work — the user's "gebruik alle components" (use all components) demand is not yet fully met.** Still not reconsidered for a Reacticx swap: `UnitToggle`, the single-select pill patterns in `your-goal.tsx`/`training-experience.tsx`, `AnnouncementBanner`'s body text (a dismissable banner, not really a headline — likely not a good fit for character-reveal treatment).

---

## Visible-flair pass, part 2 (wider rollout) — 2026-09-17 — IN PROGRESS

Continuation of the pass above, closing most of its "remaining work" list:

- **`your-goal.tsx`, `training-experience.tsx`, `workout-preferences.tsx`, `training-schedule.tsx`, `notifications.tsx`, `personal-info.tsx`** — turned out to need **no direct changes**: all six already render their title through the shared `OnboardingHeader.tsx`, which was already converted to `StaggeredText` in part 1. They inherited the animated title automatically.
- **`onboarding/all-set.tsx`** (the final "You're All Set!" celebration screen, the one screen in the wizard that doesn't go through `OnboardingHeader`) — converted its title from static `Text` to `StaggeredText` directly, matching `OnboardingHeader`'s styling (`fontFamily.bodyBold`, 48px, italic, brand yellow) and the same `NO_BLUR` workaround.
- **`TopBar.tsx`** — the small persistent "GYMCREW" wordmark shown on every authenticated screen (not just auth/onboarding) now uses the same split-`StaggeredText` treatment as `AuthHeader`'s wordmark ("GYM" white / "CREW" yellow, offset stagger), at its original 22px/skewed size.
- **`GoalsWidget.tsx`** (Home) — the "YOUR GOALS" headline converted from `EditableText` (a plain-`Text` wrapper that becomes tap-to-edit in Developer Mode, see that component's docstring) to `StaggeredText`. **Trade-off accepted, same precedent as `WelcomeWidget`'s headline in part 1**: this string can no longer be overridden via Developer Mode's demo-content tool. Every other `EditableText` usage on Home (goal labels/percentages, welcome greeting, etc.) is untouched.

**Reacticx components used:** `organisms/animated-text` (no new components — same one as part 1, just wider rollout).

**Issues discovered:** none new — same `NO_BLUR` workaround applied consistently.

**Tests performed:** `npx tsc --noEmit` (clean), `npm run lint` (0 errors, same 30 pre-existing vendor warnings), `npx expo export --platform web` (clean, all routes). Playwright screenshots: `onboarding/all-set.html` (title renders crisp, correct), and a temporary combined preview route for `TopBar`+`GoalsWidget` (deleted after verification — neither renders standalone without mock props/store data) confirming both the header wordmark and the goals headline render crisp, correctly colored/skewed, with no blur artifacts. Only console output was the pre-existing, migration-unrelated React `#418` hydration warning.

**Remaining work:** `UnitToggle` and the single-select pill patterns in `your-goal.tsx`/`training-experience.tsx` are still hand-rolled and not yet reconsidered against a Reacticx primitive — the last items on the "alle andere components die je zelf hebt gemaakt moeten weg" (all custom components must go) list from the direct-override instruction. `AnnouncementBanner` deliberately left as plain text (dismissable body copy, not a headline — animating it on every dismiss/remount would likely read as glitchy rather than premium).

---

```text
[x] Discovery
[x] Reacticx setup
[x] Design system
[x] Core components
[~] Authentication
[~] Onboarding
[~] Home
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

**Update:** extracted a new `AuthSubmitButton` component (also on `base/button`) after finding the exact same hand-rolled full-width submit button duplicated 4 times verbatim (`sign-in.tsx`, `sign-up.tsx`, `forgot-password.tsx` ×2) plus a compact retry variant duplicated 3 more times (`sign-in.tsx`'s stuck-resume screen, `auth-handoff.tsx` ×2) — wired into all 7 call sites, replacing per-screen `submitting ? "X-ing..." : "Label"` text-swaps with the same spinner-crossfade loading language `OnboardingFooter` already uses. Re-verified with the same tsc/lint/export + Playwright screenshot pass (`sign-in`, `sign-up`, `forgot-password`, `auth-handoff`'s missing-ticket state) — all four render correctly, zero console errors.

**`UnitToggle` investigated and declined**: `organisms/segmented-control` defaults its width to "screen width minus 32" and is fundamentally a wide, both-options-visible picker (iOS-tab-switcher style) — `UnitToggle` is a compact single-button tap-to-cycle control that fits inline as a `SliderField`/`Stepper` `rightAdornment` (5 call sites in `your-stats.tsx`/`your-metrics.tsx`); a segmented control would not fit that tight slot without redesigning those rows. Kept custom.

**Remaining work:** This covers the components shared across all auth/onboarding screens, not the full per-screen AGENTS.md §21 14-step process for each of the ~19 individual screens (content/navigation/state/asset reconnection review, keyboard-behavior check, per-screen empty/error state check). `FormField` was already kept custom (Phase 3). Native-platform (iOS/Android simulator) verification is still outstanding — only web has been visually confirmed. Both checklist items left `[~]` rather than `[x]` until a full per-screen pass happens.

---

## Home (Phase 5) — 2026-09-16 — IN PROGRESS

**Files changed:** new `src/components/Card.tsx` (GymCrew-composed card shell built on Reacticx's `atoms/pressable`); `CrewCard.tsx`, `HomeNutritionWidget.tsx`, `LastWorkoutWidget.tsx`, `MuscleSuggestions.tsx`, `BiggestOpportunityCard.tsx`, `CrewWarWidget.tsx` migrated onto it (exact same classNames, just restructured between shell/layout). New: `src/components/ui/atoms/pressable/`.

**Reacticx components used:** `atoms/pressable` (a real press-scale/haptics-capable Pressable — the app's first genuine "component," as opposed to compound primitives like `dialog`/`button`).

**Issues discovered:** Two more real bugs in vendored Reacticx source: `atoms/pressable`'s long-press timer ref was typed `useRef<NodeJS.Timeout | null>`, which doesn't match what `setTimeout` returns in a React Native/web environment (fixed to `ReturnType<typeof setTimeout>`); and the same missing-`displayName` pattern on its two `memo()`-wrapped exports (`Pressable`, `PressableProvider`), fixed the same way as every previous instance this migration has hit.

**Tests performed:** `tsc`/`lint`/`expo export` all clean. Home itself is behind Clerk auth *and* a data-sync gate (renders `HomeSkeleton` until a real backend sync completes) — confirmed the route still redirects cleanly to `/onboarding` when signed out, zero console errors, proving the app shell isn't broken. Since a real authenticated render isn't reachable without live credentials, built a temporary, uncommitted preview route rendering `Card` directly in all 4 shapes it's used in (default/pressable/accent/row-layout), screenshotted it (including mid-press), confirmed it works, then deleted the route before committing. The 6 migrated widgets' own visuals were not independently screenshotted.

**Update — `WelcomeWidget`'s "Start Workout" CTA migrated.** The earlier revert was about not being able to verify the layout, not about the approach being wrong — came back to it, added a `containerStyle` prop to the vendored `Button` (reaches the outer `Pressable` directly, since `fullWidth`'s `alignSelf` toggle can't provide `flex:1`-style main-axis growth), and since `WelcomeWidget` has no store dependencies it could be rendered and screenshotted directly. Confirmed correct.

**A real debugging detour, corrected after more testing:** the verification screenshot run threw a `React error #418` (hydration mismatch). A first round of isolation testing (4 temp routes, ending with the exact original pre-migration `WelcomeWidget` code) pointed at "artifact of `_dev-*`-prefixed route naming" — wrong conclusion, reached too fast. Migrated `VisualTrainingCalendar` next (see below), hit the *same* error on its own preview route despite **no** underscore prefix this time, which disproved the naming theory. Widened the test to real, pre-existing routes never touched by this migration (`legal/terms.html`, `legal/privacy.html`) — both show the identical error. Confirmed via the live Metro dev server (`expo start --web`, not the static export) that the error doesn't occur there at all. Conclusion: **this is a real, pre-existing bug in the app's `expo export --platform web` prerender/hydration step**, unrelated to this migration — logged as a proper bug entry below rather than fixed (out of scope, doesn't block the migration, native iOS/Android have no hydration concept to mismatch). All temporary preview/isolation routes deleted before each commit.

**`VisualTrainingCalendar` migrated onto `Card`** — same `rounded-3xl border-divider bg-surface p-4` shell as the other Home cards, not pressable as a whole (day cells and header chevrons keep their own inner `Pressable`s). Verified via a standalone preview route with mock `CalendarWorkout` data (it takes `workouts` as a prop, no store dependency) — renders correctly: muscle-heatmap day figures, today's yellow ring, header nav, all intact. The only error present was the pre-existing hydration bug above, confirmed unrelated.

**Remaining work:** `GoalsWidget`'s "+" button and `AnnouncementBanner` deliberately left alone — trivial one-off Pressable and a genuinely different visual treatment (different alpha/background than `Card`'s `accent` variant) respectively, where forcing them onto shared components would be a regression, not an improvement. Real device/authenticated-session verification of the whole Home screen (with real store data) is still outstanding — this is why the checklist item stays `[~]`, not `[x]`.

---

## Bug found during Phase 5 (unrelated to the migration)

- Location: `expo export --platform web`'s static output (confirmed on `legal/terms.html`, `legal/privacy.html`, and reproducible on any sufficiently content-heavy route) — not present when running the live Metro dev server (`expo start --web`)
- Problem: React throws a minified hydration-mismatch error (`#418`, "Hydration failed because the initial UI does not match what was rendered on the server") on initial page load
- Expected: Clean hydration, no console error
- Actual: `pageerror: Minified React error #418` fires once per page load; content still renders correctly in every case observed so far (not a visible breakage), but a live hydration mismatch is never fully safe to ignore — React discards and re-renders the mismatched subtree client-side, which is wasted work at best
- Severity: Low-medium — no visible breakage found in any tested case, web/PWA-only (native iOS/Android builds have no hydration step to mismatch), but worth root-causing before the web/PWA build is relied on for anything production-sensitive
- Related to migration: No — reproduces identically on `legal/terms.html`/`legal/privacy.html`, real pre-existing routes this migration has never touched, and reproduces with or without every Reacticx change made so far
- Recommended fix: Needs a non-minified production build of the static export to get React's real diagnostic (which DOM node/text actually differs) — the minified error only gives an error code. Worth checking first: anything in the root `_layout.tsx` shared by every route (it gates rendering on font-loading — `return null` until `useAppFonts` resolves — a classic source of server/client mismatch if the static prerender and the client's first paint disagree about whether fonts are "ready" yet), since that's the one thing every affected route has in common.

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
