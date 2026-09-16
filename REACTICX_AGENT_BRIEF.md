# GymCrew Reacticx Migration Agent

## ROLE

You are a senior React Native engineer, product engineer, UI/UX engineer, and codebase migration agent.

Your task is to take the existing GymCrew mobile application located at:

`~/Documents/gymcrew`

and rebuild/refactor its entire UI using the Reacticx component system:

`https://www.reacticx.com/components/`

The goal is **NOT** to create a new GymCrew app from scratch.

The goal is to take the existing GymCrew application — including its existing screens, navigation, functionality, business logic, assets, data structures, interactions, animations, and user flows — and progressively replace/rebuild its UI using Reacticx components while preserving the existing functionality.

The finished application must still be GymCrew.

The difference is that the entire UI system should be based on Reacticx components and a consistent GymCrew design system built on top of them.

---

# 1. PRIMARY OBJECTIVE

Rebuild the existing GymCrew application using Reacticx components without losing existing functionality.

You must:

- inspect the entire existing codebase first
- understand the existing architecture
- understand every screen
- understand every navigation flow
- understand existing state management
- understand existing API/database logic
- understand existing workout logic
- understand existing ranking logic
- understand existing nutrition logic
- understand existing assets
- understand existing animations
- understand existing reusable components
- understand existing authentication
- understand existing user flows
- understand what is already implemented versus unfinished
- identify technical debt
- identify components that can be directly replaced with Reacticx
- identify components that need Reacticx-based compositions
- progressively migrate the application
- test every migration step
- keep the application runnable throughout the process

Do NOT throw away existing working logic simply because the UI is being rebuilt.

---

# 2. VERY IMPORTANT: EXISTING PROJECT IS THE SOURCE OF TRUTH

The existing project at:

`~/Documents/gymcrew`

is the source of truth for:

- functionality
- business logic
- navigation
- data models
- assets
- copy
- existing user flows
- existing feature behavior
- workout calculations
- ranking calculations
- nutrition calculations
- authentication
- API integrations
- database integrations
- permissions
- persistence
- user state

Do not invent replacement functionality unless the existing implementation is incomplete or broken.

Before modifying anything, inspect the repository.

---

# 3. FIRST TASK: COMPLETE CODEBASE AUDIT

Before writing significant code, perform a complete audit.

Do NOT immediately start rebuilding screens.

First inspect:

### Project structure

Look through:

- `package.json`
- `app.json`
- `app.config.*`
- `tsconfig.json`
- `babel.config.*`
- Expo configuration
- navigation/router configuration
- source directories
- components
- hooks
- services
- utilities
- assets
- fonts
- images
- SVGs
- icons
- animations
- state management
- API clients
- database code
- authentication
- storage
- environment configuration

Also inspect all nested directories.

Do not assume the project follows a standard Expo structure.

---

# 4. CREATE A PROJECT INVENTORY

Before implementation, create:

`GYMCREW_REACTICX_MIGRATION.md`

This document must contain:

## Existing Screens

Create a complete list of every screen.

For every screen record:

- screen name
- file location
- navigation route
- purpose
- current UI
- current components
- important interactions
- data dependencies
- API dependencies
- state dependencies
- animations
- assets
- navigation actions
- loading states
- empty states
- error states
- modal/sheet interactions
- completion status

Example:

```text
Home
Location:
src/screens/Home.tsx

Purpose:
Main GymCrew dashboard.

Contains:
- calendar
- workout status
- muscle suggestions
- goals
- last workout
- nutrition overview
- crew overview
- quick start

Dependencies:
- user profile
- workout history
- nutrition data
- crew data
```

Do this for EVERY screen.

---

# 5. COMPLETE FEATURE INVENTORY

Create a second section documenting every feature.

Include features such as:

- authentication
- onboarding
- profile
- home
- workout logging
- workout planner
- exercise selection
- sets/reps/weight logging
- workout completion
- PR detection
- rankings
- power score
- global ranking
- gym ranking
- exercise ranking
- divisions
- percentile calculations
- weak-point engine
- Arena
- crew creation
- crew joining
- crew rankings
- crew members
- nutrition
- food logging
- meals
- saved foods
- macros
- calories
- protein
- carbs
- fats
- progress
- history
- goals
- settings
- notifications
- support
- sharing
- any additional existing feature

Do not assume these features exist merely because they are listed here.

Verify them in the codebase.

---

# 6. COMPLETE ASSET INVENTORY

Find every existing asset.

Do not recreate assets that already exist.

Search for:

- logos
- gorilla mascot
- body illustrations
- muscle illustrations
- exercise illustrations
- icons
- badges
- medals
- division graphics
- backgrounds
- gradients
- fonts
- animations
- SVG files
- PNG files
- JPG files
- WebP files
- Lottie files
- video assets

Create an asset inventory containing:

```text
Asset
Path
Purpose
Used by
Dimensions
Format
Should be preserved?
```

Use the existing GymCrew assets wherever possible.

---

# 7. UNDERSTAND THE EXISTING GYMCREW DESIGN

Before changing the UI, identify the existing GymCrew visual identity.

Document:

- primary colors
- secondary colors
- typography
- spacing
- border radius
- cards
- buttons
- iconography
- backgrounds
- shadows
- gradients
- animation style
- mascot usage
- badges
- ranking visuals
- workout visuals
- nutrition visuals

The objective is NOT to make GymCrew look like a generic Reacticx showcase.

Reacticx provides the underlying interaction and component primitives.

GymCrew must still look like GymCrew.

---

# 8. REACTICX IS THE UI FOUNDATION

Use:

`https://www.reacticx.com/components/`

as the primary UI component source.

Reacticx components are copied into the project and become local source code rather than being consumed as a conventional runtime UI library. Use the Reacticx CLI and local components where appropriate.

Before implementing the migration:

```bash
npx reacticx list
```

Study the available component catalog.

For each UI pattern in GymCrew, determine whether Reacticx already provides a suitable component.

---

# 9. STRICT COMPONENT RULE

The default rule is:

> If a UI element can reasonably be implemented using a Reacticx component, use Reacticx.

Do NOT create generic custom UI components when an appropriate Reacticx component exists.

Examples:

Buttons → Reacticx button/component

Cards → Reacticx card/container pattern

Inputs → Reacticx input

Switches → Reacticx switch

Tabs → Reacticx tab/navigation component

Sheets → Reacticx bottom sheet

Dialogs → Reacticx modal/dialog pattern

Accordions → Reacticx accordion

Animated interactions → Reacticx animated component

Gestures → Reacticx gesture-based component

Menus → Reacticx menu component

Progress → Reacticx progress component where applicable

Loaders → Reacticx animation component where applicable

Lists → Reacticx-compatible list patterns

Navigation UI → Reacticx-compatible components wherever available

---

# 10. "EVERYTHING MUST USE REACTICX" REQUIREMENT

The goal is that the application UI is built with Reacticx components.

This means:

Do NOT leave old UI components in place simply because they already exist.

For every existing custom UI component, ask:

1. Is there an equivalent Reacticx component?
2. Can several Reacticx components be composed to recreate it?
3. Can an existing Reacticx component be customized to match GymCrew?
4. Can Reacticx primitives be combined to create the required component?

Only when the required behavior genuinely does not exist in Reacticx should you create a custom component.

Even then, the custom component should be:

- Reacticx-based
- visually consistent with Reacticx
- reusable
- documented
- compatible with the GymCrew design system

Do not introduce a second unrelated UI library.

---

# 11. DO NOT USE RANDOM UI LIBRARIES

Do not introduce:

- NativeBase
- Tamagui
- Gluestack
- Paper
- UI Kitten
- React Native Elements
- NativeWind UI components
- random GitHub UI libraries
- random npm component libraries

unless there is an unavoidable technical requirement and it has been explicitly justified.

Reacticx should be the primary UI component foundation.

---

# 12. REACTICX INSTALLATION

First determine whether the existing GymCrew project is:

- Expo
- Expo Router
- bare React Native
- React Native Community CLI
- another architecture

Then configure Reacticx correctly for the existing project.

Reacticx documentation indicates that common native dependencies include:

- `react-native-reanimated`
- `react-native-worklets`
- `react-native-gesture-handler`
- `react-native-svg`
- `@shopify/react-native-skia`
- `expo-haptics`
- `expo-blur`
- `expo-symbols`
- `@expo/vector-icons`

Install only what is actually required by the selected components.

Do not blindly install every dependency if unnecessary.

Run:

```bash
npx reacticx init
```

when appropriate.

Configure the component directory consistently.

For example:

```text
src/
  components/
    ui/
```

or preserve the project's existing architecture if it has a better established convention.

---

# 13. NATIVE BUILD REQUIREMENT

Be aware that some Reacticx components require native functionality.

In particular:

- Reanimated
- Worklets
- Gesture Handler
- Skia
- Blur
- Haptics

must be configured correctly.

Some Reacticx components will not work inside Expo Go and may require a development build. Skia-based components are one example.

Do not hide this problem.

If a component requires a development build:

1. document it
2. configure the project correctly
3. make sure the development build can be generated
4. test it on a real device when possible

---

# 14. REACTICX COMPONENT RESEARCH

Before implementing each screen, research the Reacticx catalog.

For every screen create a mapping:

```text
GymCrew UI
↓
Reacticx component
↓
Required customization
↓
Existing GymCrew asset
↓
Existing logic
```

Example:

```text
GymCrew Quick Start Button
→ Reacticx Button
→ customize typography + colors + haptic feedback
→ GymCrew icon
→ existing workout navigation logic
```

---

# 15. DO NOT REBUILD LOGIC

The migration is primarily a UI architecture migration.

Do NOT rewrite business logic unnecessarily.

For example:

If workout calculations already work:

```ts
calculateWorkoutScore();
```

keep them.

If ranking logic already works:

```ts
calculateRank();
```

keep it.

If nutrition calculations already work:

```ts
calculateMacros();
```

keep them.

Refactor only when necessary for:

- bugs
- type safety
- architecture
- performance
- Reacticx integration
- maintainability

---

# 16. PRESERVE DATA CONTRACTS

Do not casually change:

- database schemas
- API contracts
- API response structures
- storage keys
- authentication state
- user IDs
- exercise IDs
- food IDs
- crew IDs
- ranking IDs

If a change is necessary, document it before implementation.

---

# 17. CREATE A GYMCREW UI SYSTEM

Build a thin design layer on top of Reacticx.

Create reusable GymCrew configuration for:

### Colors

Example categories:

```text
background
surface
surfaceElevated
primary
secondary
success
warning
danger
textPrimary
textSecondary
textMuted
border
```

Use the existing GymCrew colors discovered from the project.

Do NOT invent an unrelated color palette.

---

### Typography

Define:

```text
display
heading1
heading2
heading3
body
bodySmall
caption
button
stat
number
badge
```

Use the existing GymCrew fonts if available.

---

### Spacing

Define a consistent spacing system.

---

### Radius

Define consistent:

- small
- medium
- large
- pill
- circular

radii.

---

### Motion

Define consistent:

- entrance animations
- press animations
- spring behavior
- transitions
- loading animations
- success animations
- ranking transitions

Reacticx is specifically designed around animated/gesture-driven React Native components, so motion should be treated as part of the UI architecture rather than an afterthought.

---

# 18. GYMCREW SHOULD FEEL LIKE A GYM APP

Do not make the app feel like:

- a finance dashboard
- a SaaS dashboard
- a generic component demo
- an Apple settings clone
- a web application inside a phone

The experience should communicate:

- training
- competition
- progression
- strength
- crews
- rankings
- PRs
- achievement
- intensity
- social competition

The UI should make users want to:

- train
- log their workout
- beat their previous performance
- improve their rank
- help their crew
- challenge friends
- chase PRs

---

# 19. MIGRATION STRATEGY

Do NOT rebuild the entire app in one pass.

The application must be migrated incrementally.

Each phase must:

1. start from the existing working application
2. modify a controlled section
3. run type checks
4. run linting
5. run the application
6. test the affected flows
7. compare the result against the original
8. fix regressions
9. commit the work
10. document what changed

---

# 20. PHASED DEVELOPMENT PLAN

## PHASE 0 — DISCOVERY

Goal:

Understand everything before changing anything.

Tasks:

- inspect repository
- inspect package manager
- inspect Expo/RN version
- inspect router
- inspect all screens
- inspect all components
- inspect all hooks
- inspect all services
- inspect assets
- inspect fonts
- inspect navigation
- inspect state management
- inspect API/database
- inspect authentication
- inspect animations
- inspect existing design

Deliverables:

```text
GYMCREW_REACTICX_MIGRATION.md
GYMCREW_SCREEN_INVENTORY.md
GYMCREW_FEATURE_INVENTORY.md
GYMCREW_ASSET_INVENTORY.md
```

Do not begin large UI changes during this phase.

---

# PHASE 1 — REACTICX FOUNDATION

Goal:

Install and configure Reacticx without changing the application's user experience yet.

Tasks:

- install required Reacticx dependencies
- configure Reanimated
- configure Worklets
- configure Gesture Handler
- configure SVG
- configure Skia if needed
- configure Blur if needed
- configure Haptics if needed
- initialize Reacticx
- configure component directory
- verify aliases
- verify Babel configuration
- verify Metro configuration
- verify native configuration
- verify TypeScript
- create development build if required

Test:

The original GymCrew app must still run.

Deliverable:

A working GymCrew project with Reacticx available.

---

# PHASE 2 — DESIGN SYSTEM

Goal:

Create the GymCrew visual foundation.

Implement:

- colors
- typography
- spacing
- radii
- shadows
- surfaces
- gradients
- motion
- icon conventions
- component conventions

Do NOT redesign every screen yet.

Create reusable theme/design utilities.

Deliverable:

A consistent GymCrew design system based on Reacticx.

---

# PHASE 3 — CORE UI COMPONENTS

Migrate the most common components first.

Examples:

- buttons
- text inputs
- cards
- badges
- chips
- tabs
- modals
- bottom sheets
- dropdowns
- switches
- progress indicators
- loading states
- empty states
- error states
- list items
- stat components
- headers
- navigation components

Every component should be Reacticx-based where possible.

Deliverable:

A reusable GymCrew UI component layer.

---

# PHASE 4 — AUTHENTICATION + ONBOARDING

Migrate:

- splash
- welcome
- login
- signup
- password screens
- verification
- onboarding
- profile setup
- gym setup
- goals setup

Preserve all existing authentication logic.

Focus heavily on:

- smooth transitions
- input interactions
- validation feedback
- keyboard behavior
- loading states
- errors
- success states

---

# PHASE 5 — HOME

Rebuild the main GymCrew home screen.

Preserve existing functionality.

Potential sections:

- training calendar
- today's workout state
- muscle suggestions
- goals
- last workout
- nutrition overview
- crew overview
- quick start
- PR information

Use Reacticx components for:

- cards
- animated sections
- buttons
- progress
- transitions
- interaction states

This screen should establish the final GymCrew visual language.

---

# PHASE 6 — WORKOUT SYSTEM

This is one of the most important phases.

Migrate:

- workout planner
- workout selection
- exercise selection
- add exercise
- exercise search
- sets
- reps
- weight
- rest timer
- supersets
- workout progression
- workout completion
- PR detection
- workout summary
- workout history

Important:

Logging a set must remain extremely fast.

Do not introduce animations that slow down workout logging.

The user should be able to log:

```text
Exercise
→ weight
→ reps
→ save
```

with minimal friction.

---

# PHASE 7 — RANKING SYSTEM

Migrate:

- power score
- My Gym
- Global
- exercise rankings
- tiers
- percentile
- rank progress
- division badges
- rank cards
- share cards
- weak points
- "What is my rank?"
- Arena

The ranking UI should feel competitive.

Use motion to communicate:

- rank changes
- PRs
- promotions
- percentile improvements
- leaderboard movement

Do not change the underlying ranking calculations.

---

# PHASE 8 — CREWS

Migrate:

- crew creation
- crew joining
- crew overview
- crew members
- crew ranking
- crew competitions
- crew activity
- invites
- crew profile
- crew statistics

The crew system should feel social and competitive.

---

# PHASE 9 — NUTRITION

Migrate:

- calorie dashboard
- protein
- carbs
- fats
- food logging
- food search
- food details
- custom foods
- saved foods
- meals
- saved meals
- progress
- nutrition history

Preserve the existing nutrition logic and data structures.

Optimize for fast food logging.

---

# PHASE 10 — PROFILE / HISTORY / PROGRESS

Migrate:

- profile
- workout history
- progress
- PR history
- nutrition history
- goals
- achievements
- badges
- statistics

Use Reacticx interactions for filters, tabs, expandable sections and transitions where appropriate.

---

# PHASE 11 — SETTINGS / SUPPORT / SECONDARY FLOWS

Migrate:

- settings
- account
- notifications
- privacy
- support
- contact
- Discord/support links
- logout
- secondary dialogs
- confirmation flows

Do not neglect:

- loading
- error
- success
- empty
- disabled
- destructive states

---

# PHASE 12 — GLOBAL POLISH

Once every screen has been migrated:

Perform a full application-wide consistency pass.

Check:

### Typography

Does every screen use the same hierarchy?

### Spacing

Are margins/paddings consistent?

### Cards

Do cards feel like the same product?

### Buttons

Do buttons behave consistently?

### Motion

Do animations have a consistent personality?

### Navigation

Are transitions consistent?

### Haptics

Are meaningful interactions providing appropriate feedback?

### Loading

Are loading states consistent?

### Errors

Are errors consistent?

### Empty states

Are empty states consistent?

### Dark/light behavior

If supported, is the behavior consistent?

---

# 21. SCREEN-BY-SCREEN MIGRATION RULE

For each screen:

## Step 1

Read the existing screen completely.

## Step 2

Identify all UI elements.

## Step 3

Map each UI element to a Reacticx component.

## Step 4

Install the required Reacticx components.

## Step 5

Create the screen using those components.

## Step 6

Reconnect existing logic.

## Step 7

Reconnect navigation.

## Step 8

Reconnect state.

## Step 9

Reconnect APIs.

## Step 10

Reconnect assets.

## Step 11

Test every interaction.

## Step 12

Compare with original functionality.

## Step 13

Fix regressions.

## Step 14

Only then mark the screen complete.

---

# 22. DO NOT MARK A SCREEN COMPLETE TOO EARLY

A screen is only complete when:

- UI is migrated
- Reacticx components are used
- navigation works
- data loads
- interactions work
- loading works
- errors work
- empty states work
- animations work
- keyboard behavior works
- scrolling works
- gestures work
- assets work
- Android works
- iOS works
- TypeScript passes
- no obvious regressions exist

---

# 23. TESTING REQUIREMENTS

After every meaningful migration:

Run the appropriate checks.

At minimum:

```bash
npx tsc --noEmit
```

and the project's existing lint/test commands.

Also run the application.

Test:

### iOS

- navigation
- gestures
- keyboard
- animations
- scrolling
- haptics
- sheets
- modals

### Android

- navigation
- gestures
- keyboard
- animations
- scrolling
- haptics
- sheets
- modals

Do not assume something working on iOS means it works on Android.

---

# 24. PERFORMANCE REQUIREMENTS

GymCrew must remain fast.

Pay special attention to:

- workout logging
- large exercise lists
- food databases
- ranking lists
- crew lists
- history
- animations
- Skia rendering
- Reanimated worklets
- unnecessary re-renders
- image loading

Do not introduce expensive animations into frequently updated workout inputs.

Prefer UI-thread animations when Reacticx already provides them.

---

# 25. ACCESSIBILITY

Every migrated component should consider:

- accessibility labels
- touch target size
- readable contrast
- dynamic text where practical
- screen reader semantics
- disabled states
- focus behavior
- keyboard navigation where applicable

Do not sacrifice usability for visual effects.

---

# 26. MOBILE-FIRST RULE

This is a native mobile application.

Do not design it like a responsive website.

Avoid:

- desktop-first layouts
- web-style navigation
- tiny touch targets
- excessive dense tables
- hover-dependent interactions
- web-only interactions

Everything should feel native on iOS and Android.

---

# 27. ASSET RULES

Use the existing assets from:

`~/Documents/gymcrew`

Do not replace the GymCrew gorilla or existing visual assets unnecessarily.

If an existing asset can be integrated into a Reacticx component, do that.

For example:

```text
Reacticx Card
+
GymCrew Gorilla
+
GymCrew typography
+
GymCrew colors
=
GymCrew component
```

---

# 28. CODE QUALITY

Keep the project maintainable.

Use:

- TypeScript
- reusable components
- clear naming
- small focused components
- hooks where appropriate
- separation of UI and business logic
- existing architecture where practical

Avoid:

- giant screen files
- duplicated UI
- duplicated styles
- duplicated business logic
- magic numbers
- unnecessary global state
- unnecessary rewrites

---

# 29. REACTICX SOURCE OWNERSHIP

Remember:

Reacticx components are copied into the project source and become project-owned code. They are not a conventional runtime component package.

Therefore:

- customize components when necessary
- keep customizations organized
- do not blindly overwrite modified components
- document significant modifications
- use `reacticx diff` where useful to understand divergence from the registry

---

# 30. COMPONENT REGISTRY

Maintain:

`GYMCREW_REACTICX_COMPONENT_MAP.md`

For every Reacticx component used, document:

```text
Component:
Reacticx component:
Location:
Used by:
Purpose:
Dependencies:
Customizations:
```

Example:

```text
Component:
Workout Set Input

Reacticx:
[input component]

Location:
src/components/workout/WorkoutSetInput.tsx

Used by:
Workout Logger

Purpose:
Weight/reps input

Customizations:
GymCrew typography
GymCrew colors
Haptic feedback
PR state
```

---

# 31. MIGRATION TRACKER

Maintain:

`GYMCREW_REACTICX_PROGRESS.md`

Use:

```text
[ ] Discovery
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

For each item document:

- status
- date
- files changed
- Reacticx components used
- issues discovered
- tests performed
- remaining work

---

# 32. GIT STRATEGY

Do not make one enormous commit.

Use logical commits.

Examples:

```text
chore: initialize Reacticx
feat(ui): add GymCrew design system
feat(ui): migrate core buttons and inputs
feat(auth): migrate authentication screens
feat(home): migrate home dashboard
feat(workout): migrate workout logger
feat(rank): migrate ranking experience
feat(crew): migrate crew experience
feat(nutrition): migrate nutrition experience
feat(profile): migrate profile and history
chore: polish global UI consistency
chore: final Reacticx migration cleanup
```

This makes the migration reversible.

---

# 33. AGENT BEHAVIOR

You are NOT allowed to blindly execute the entire migration in one huge operation.

Work in phases.

After each phase:

1. inspect changes
2. run checks
3. identify problems
4. fix problems
5. document changes
6. commit changes
7. continue

Do not move to the next major phase if the current phase has major unresolved errors.

---

# 34. WHEN YOU ENCOUNTER AN EXISTING BUG

If you find a bug unrelated to the UI migration:

Document it.

Use:

```text
BUG FOUND

Location:
Problem:
Expected:
Actual:
Severity:
Related to migration:
Recommended fix:
```

Fix it immediately only if:

- it blocks the migration
- it is trivial
- it directly affects the current screen

Otherwise document it and continue.

---

# 35. WHEN A REACTICX COMPONENT DOES NOT FIT

Do not force a component into an inappropriate use case.

Instead:

1. inspect other Reacticx components
2. check whether multiple components can be composed
3. check whether the component can be customized
4. check the component's source
5. check its dependencies
6. consider another Reacticx component
7. only then create a custom Reacticx-based composition

The goal is not "use random Reacticx components everywhere."

The goal is:

> Build GymCrew's UI architecture using Reacticx as the primary component foundation.

---

# 36. DOCUMENTATION RESEARCH RULE

Before implementing unfamiliar Reacticx components, read their documentation.

Use:

`https://www.reacticx.com/docs`

and the relevant component page.

Do not invent component APIs.

Do not invent imports.

Do not invent component names.

Reacticx explicitly warns that components are copied into the project and that agents commonly make mistakes such as invented package imports, missing Babel configuration, Skia/Expo Go incompatibility, or missing Gesture Handler setup.

---

# 37. IMPORTANT: NO FAKE COMPLETION

Never say:

"Done"

unless the feature has actually been implemented and tested.

Never claim:

- a screen works
- a component works
- navigation works
- iOS works
- Android works

unless you actually verified it.

If something cannot be tested, explicitly mark it:

```text
NOT VERIFIED
```

---

# 38. FINAL AUDIT

At the end of the entire migration perform a full audit.

Check:

## UI

- Are all screens migrated?
- Are old UI components removed where appropriate?
- Is Reacticx used consistently?
- Are GymCrew assets preserved?
- Is GymCrew branding consistent?

## Functionality

- Does authentication work?
- Does navigation work?
- Does workout logging work?
- Does ranking work?
- Do crews work?
- Does nutrition work?
- Does profile work?
- Does history work?
- Does progress work?

## Technical

- TypeScript passes
- lint passes
- tests pass
- no broken imports
- no missing assets
- no missing dependencies
- no navigation errors
- no obvious performance regressions

## Native

- iOS tested
- Android tested
- native dependencies configured
- development build works when required

---

# 39. FINAL DELIVERABLES

At the end of the project the repository should contain:

```text
GYMCREW_REACTICX_MIGRATION.md
GYMCREW_SCREEN_INVENTORY.md
GYMCREW_FEATURE_INVENTORY.md
GYMCREW_ASSET_INVENTORY.md
GYMCREW_REACTICX_COMPONENT_MAP.md
GYMCREW_REACTICX_PROGRESS.md
```

and a fully migrated GymCrew application.

---

# 40. EXECUTION ORDER

Your execution order is:

```text
1. Inspect existing GymCrew
2. Document architecture
3. Document screens
4. Document features
5. Document assets
6. Inspect Reacticx
7. Configure Reacticx
8. Verify native dependencies
9. Build GymCrew design system
10. Build core Reacticx-based UI layer
11. Migrate authentication
12. Migrate onboarding
13. Migrate Home
14. Migrate Workout
15. Migrate Ranking
16. Migrate Crews
17. Migrate Nutrition
18. Migrate Profile
19. Migrate History
20. Migrate Progress
21. Migrate Settings
22. Migrate Support
23. Global polish
24. Performance pass
25. Accessibility pass
26. iOS QA
27. Android QA
28. Final code audit
29. Final documentation
30. Final migration report
```

---

# 41. FIRST ACTION

Do NOT start coding immediately.

Your first response/action should be to:

1. inspect `~/Documents/gymcrew`
2. determine the project architecture
3. determine the package manager
4. determine React Native/Expo version
5. determine navigation architecture
6. inspect the directory structure
7. identify all screens
8. identify all major components
9. identify all assets
10. identify all business logic areas
11. identify all existing dependencies
12. inspect the current UI architecture
13. inspect the Reacticx documentation/catalog
14. create the migration documentation
15. create the phased implementation plan

Only after the audit is complete should implementation begin.

---

# SUCCESS CRITERIA

The project is successful when:

> GymCrew still has all of its original functionality and data flows, but its UI has been comprehensively rebuilt around Reacticx components, while preserving GymCrew's own visual identity, assets, competitive gym-focused experience, performance, and native mobile behavior.

The result should feel like:

**GymCrew × Reacticx**

not:

**Reacticx demo × GymCrew logo**

The product identity must remain GymCrew.
