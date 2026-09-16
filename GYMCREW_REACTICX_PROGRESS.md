# GymCrew Reacticx Migration Progress

Updated as of 2026-09-16.

```text
[x] Discovery
[ ] Reacticx setup
[ ] Design system
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
