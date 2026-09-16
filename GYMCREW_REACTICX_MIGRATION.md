# GymCrew × Reacticx Migration Plan

This is the master planning document for migrating GymCrew's UI onto the Reacticx component system while preserving all existing functionality, business logic, and brand identity (AGENTS.md, this repo's migration brief). It records what Phase 0 discovery found and lays out the phased plan going forward. See also: `GYMCREW_SCREEN_INVENTORY.md`, `GYMCREW_FEATURE_INVENTORY.md`, `GYMCREW_ASSET_INVENTORY.md`, `GYMCREW_REACTICX_COMPONENT_MAP.md`, `GYMCREW_REACTICX_PROGRESS.md`.

**Status: Phase 0 (Discovery) complete. No UI code has been changed yet.** Per AGENTS.md §37/41, this document makes no claim that any screen, component, or platform works beyond what is explicitly stated below.

---

## 1. What GymCrew is (verified)

Expo 54 / React Native 0.81 fitness-social app, `expo-router` (typed routes, React Compiler enabled), Zustand 5 state, Clerk auth, NativeWind 5 (Tailwind-on-native) styling, custom PHP backend on shared hosting (no framework). Core identity: bodyweight/gender-normalized strength ranking, crew-based social competition (divisions, wars, leagues, duels, challenges), full nutrition tracking, and workout-history-driven AI-ish split generation. ~90 route files, 125 reusable components, 39 Zustand stores, 69 business-logic modules, 873-exercise library, hand-authored body-silhouette SVG heatmap system. Full detail in the four inventory documents.

## 2. Repository state at the start of this migration — important, read before touching anything

The working tree on branch `dev` had **substantial uncommitted work in progress** at the time of this audit: modified `package.json`/`package-lock.json`, `backend/db/schema.sql`, `backend/index.php`, and ~25 screens/components, plus several new untracked files (progress-photos screens, toast/skeleton components, strength-trend/weekly-recap libs). **This is the user's own in-progress work, not migration output — it has not been touched, committed, or reverted by this audit.**

**This matters for Phase 1**: installing Reacticx's native dependencies and running `npx reacticx init` will itself modify `package.json`. Doing that on top of an already-dirty `package.json` makes it hard to tell "pre-existing change" from "migration change" and hard to roll back cleanly. **Recommend resolving this before Phase 1 begins** — either commit the in-progress work as its own commit(s), or confirm with the project owner it's safe to proceed with it uncommitted. This decision belongs to the project owner, not this audit.

## 3. Reacticx: what it actually is (verified against reacticx.com, not assumed from the brief)

- CLI-based, copy-into-project model confirmed: `npx reacticx init` (reads `tsconfig.json` paths, writes `component.config.json`) → `npx reacticx list` → `npx reacticx add <name>` (copies source, rewrites imports, reports/installs missing deps, never overwrites without `--overwrite`). "Nothing is installed from npm... From that moment the code is yours to edit."
- Required shared native deps: `react-native-reanimated`, `react-native-gesture-handler`, `react-native-svg`, `@shopify/react-native-skia`, `expo-haptics`, `expo-blur`. **GymCrew already has all of these except `expo-blur`** (`package.json` has reanimated 4.1.1, gesture-handler 2.28, svg 15.12.1, skia 2.2.12, haptics 15.0.8; no `expo-blur` or `expo-symbols`/`@expo/vector-icons` pin conflict expected but verify versions during Phase 1). `react-native-worklets` is already present too (Reacticx docs don't list it as required but GymCrew has it for Reanimated 4's worklet runtime).
- **Real catalog: ~100 components**, skewing heavily toward motion/FX (orbs, gradients, marquees, carousels) and control primitives (button, switch, stepper, tabs, bottom-sheet, dialog, accordion, dropdown, progress, loaders). **Gap versus AGENTS.md's assumption**: no generic Card, no full-featured labeled TextField, no chart, no calendar, no camera component. Full catalog and gap analysis in `GYMCREW_REACTICX_COMPONENT_MAP.md`. This means a non-trivial share of GymCrew's UI (charts, calendars, camera flows, the entire branded rank/division/muscle-heatmap visual system) will **not** be replaced by Reacticx components — it gets re-skinned onto Reacticx's layout/motion primitives while keeping its current underlying implementation (gifted-charts, react-native-calendars, expo-camera, hand-rolled SVG).

## 4. Existing GymCrew design system (verified, Phase 2 will formalize this)

- **Colors** (`src/theme/colors.ts`, mirrored in `global.css` as CSS vars): brand (`yellow #E3FF00`, `green #00C853`, `white`, `iron #1F2328`), semantic (`success`, `warning`, `streak #FF6D00`, `error`, `info`), neutral (`textPrimary #EDEFF2`, `textSecondary #8B929E`, `divider`, `surface #161A20`, `background #0D1117`). Dark-only app (`userInterfaceStyle: "dark"` in `app.config.js`).
- **Typography** (`src/theme/typography.ts` + `global.css` utilities): Bebas Neue (heading, one weight only) + Poppins (4 weights: regular/medium/semibold/bold, since RN doesn't synthesize weights). Scale: h1(64)/h2(40)/h3(28)/h4(20)/bodyLarge(16)/bodyMedium(14)/bodySmall(12)/caption(11), plus a special `heroItalic` (96px, `skewX(-10deg)`) used for the "GYMCREW" wordmark — **must stay inline style, not className**, per a documented NativeWind-on-native limitation (transform + font-style don't reliably compile from a custom `@utility` on device even though it works on web).
- **Styling approach**: NativeWind classes by default; `StyleSheet`/inline only for the documented exception list (SafeAreaView, KeyboardAvoidingView, Modal, Animated.View, dynamic runtime styles like heatmap intensity, platform-specific styles, pressed states, shadows).
- **Signature visual identity**: skewed-italic wordmark/stat typography (`SkewedStat`, 14 usages), the 15-tier rank medal system, the 20-tier division ladder, and — most distinctively — the gendered front/back muscle-silhouette heatmap (`data/body-muscle-paths.ts`, ported from the MIT-licensed MuscleMap Swift SDK). **These are what make GymCrew look like GymCrew and are explicitly out of scope for replacement** — Reacticx supplies the chrome and motion around them.

## 5. Phased plan (adapted from AGENTS.md §20 to this codebase's actual shape)

**Phase 0 — Discovery.** ✅ Complete. See `GYMCREW_REACTICX_PROGRESS.md`.

**Phase 1 — Reacticx foundation.** Not started. Resolve the uncommitted-work question above first. Then: confirm/install `expo-blur` (the one missing shared dep), run `npx reacticx init`, decide the component output directory (`src/components/ui` default vs. this project's existing flat `src/components/` — recommend a new `src/components/ui/` subdirectory for Reacticx-sourced components specifically, keeping the current flat directory for GymCrew-branded/composite components, to make "what came from Reacticx vs. what's bespoke" visually obvious in the tree). Verify Babel/Metro config compatibility with React Compiler (already enabled in `app.config.js` experiments) and NativeWind 5 (a preview-tagged version — verify Reacticx's Reanimated/Skia components don't conflict with NativeWind's own style compilation). Confirm the app still runs (Expo Go where possible; note that Skia-based Reacticx components will need a dev build, same as GymCrew's existing Skia usage in `BadgeRevealFx`/`DivisionUpOverlay` already does).

**Phase 2 — Design system.** Not started. Formalize section 4 above into whatever token format Reacticx components expect (check each component's `conf.ts`/theme props as they're added — Reacticx has no single global theme file based on the catalog fetched). Do not redesign screens yet.

**Phase 3 — Core UI components.** Not started. Order recommended in `GYMCREW_REACTICX_COMPONENT_MAP.md`: `ConfirmModal`→`dialog` first (fixes a real, documented Alert.alert/web bug as a side effect), then `ProgressBar`→`progress`, `Stepper`/`FormField`, `Skeleton`→`shimmer`, `AvatarStack`→`avatar-group`, then the higher-risk `BottomSheet` (11+ direct dependents) last among the "easy" tier, once confidence is established.

**Phases 4-11 — Screen-by-screen migration.** Not started. Order per AGENTS.md's own sequencing (Auth/Onboarding → Home → Workout → Ranking → Crews → Nutrition → Profile/History/Progress → Settings/Support), using `GYMCREW_SCREEN_INVENTORY.md` as the per-screen checklist and AGENTS.md §21's 14-step screen procedure for each one. Two codebase-specific priorities to fold in during these phases (not separate phases):
- **Fix the `Alert.alert`-on-web inconsistency** (`workout/build.tsx`, `nutrition/meal/[id].tsx`, `nutrition/my-foods.tsx`, `nutrition/my-meals.tsx`, `build-crew/discover.tsx`) opportunistically as each screen is touched, using the already-fixed `ConfirmModal`/`AvatarActionSheet` pattern.
- **Consolidate the 2-3 duplicated hand-rolled SVG line charts** (`RankProgressionChart`, `ProgressionChart`) into `StrengthProgressChart` when migrating the Ranks screens.

**Phase 12 — Global polish.** Not started.

## 6. Explicit risk register (things Phase 1+ must not break)

1. **Workout-logging backend sync** (`lib/backend-sync.ts`) fires a full-state POST on every keystroke, unthrottled, fire-and-forget. Not currently broken, but any change to the data layer during the rewrite must not make this worse, and is a good opportunity to add debouncing if the store layer is touched anyway.
2. **`ranks-board.ts`'s Overall Power computation** is duplicated at 3+ call sites (Ranks tab hero, `workout-split/analyze.tsx`, `crew/all-divisions.tsx`) that must stay numerically identical — any UI rewrite touching these screens must re-verify this invariant, not just visually.
3. **`BottomSheet.tsx`'s web-platform workaround** (forced remount via `key`) — if Reacticx's own bottom-sheet has the same gorhom-inherited bug or a different one, this needs re-discovery, not an assumption that "a newer library fixes it."
4. **`crew-store`'s `CURRENT_MEMBER_ID = "m1"` remapping** and the 3 curated demo-member IDs (Lee Priest, "Bro," Glute-only) — cosmetic/demo mechanics that must not leak into real crew data during any store-adjacent refactor.
5. **Dev Mode / `EditableText` / `ranks/build-your-graph.tsx`** — confirm with the product owner whether these ship in the migrated app at all before spending migration effort on them (see Feature Inventory).
6. **Skia confetti is native-only** — `BadgeRevealFx`/`DivisionUpOverlay` already have no web equivalent; don't let a Reacticx-based rebuild silently drop the *existing* graceful platform branch.
7. **Progress-photo camera/overlay components** (`PhotoCaptureGuide`, `ProgressPhotoOverlay`) are tightly coupled to `expo-camera`'s specific API and hand-authored SVG coordinates — full rewrites, not restyles, if touched.
8. **Legal screens have unfilled placeholder tokens** (`[DATE]`, `[COMPANY NAME]`, `[CONTACT EMAIL]`) — not a migration concern per se, but don't accidentally "fix" these as part of a redesign without the product owner's copy.

## 7. Open questions for the product owner (do not guess — ask)

- Is "Arena" (AGENTS.md's feature list) a planned rename/umbrella for Crew Wars/Duels/Leagues, or an unbuilt feature?
- Is the in-app purchase/subscription enforcement actually built server-side, or is `profile/subscription.tsx` explainer-only today (this audit could not find a payment flow)?
- Should Dev Mode tooling (`EditableText` overrides, `ranks/build-your-graph.tsx`, Admin Challenges panel) ship in the Reacticx-migrated app, or be explicitly cut?
- Confirm the uncommitted working-tree changes (§2) — commit first, or proceed with them in place?

## 8. Next action

Awaiting direction on §2 and §7 before Phase 1 begins, per AGENTS.md §33 ("do not move to the next major phase if the current phase has unresolved errors/questions") and this project's own low-risk-action default of checking before hard-to-reverse steps (installing/upgrading dependencies, running `reacticx init`).
