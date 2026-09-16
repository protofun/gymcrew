# GymCrew Reacticx Migration Progress

Updated as of 2026-09-16.

```text
[x] Discovery
[x] Reacticx setup
[x] Design system
[ ] Core components
[ ] Authentication
[ ] Onboarding
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
