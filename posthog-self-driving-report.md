# PostHog Self-driving Setup Report

**Project:** GymCrew (Expo / React Native)
**Date:** 2026-08-17
**PostHog project ID:** 561673

## Summary

PostHog Self-driving has been configured for GymCrew. Session Replay, Error Tracking, and Support are enabled as products; their native signal sources are wired to the inbox alongside health checks and the scout gate. The scout troop is active with 5 scouts — general, product-analytics, feature-flags, health-checks, and observability-gaps. Findings will start appearing in the Self-driving inbox within ~30 minutes: https://us.posthog.com/project/561673/inbox

## AI data processing

**Approved.** Organization-level AI data processing consent was granted before this run started.

## GitHub

**Connected during this run.** GitHub App installed under the `protofun` account (integration ID 226222, connected 2026-08-17). Self-driving can now research findings against this project's repository and open fix PRs.

## Products enabled

| Product | Status | Notes |
|---|---|---|
| Session Replay | Enabled (inert on mobile) | Server toggle is ON. `posthog-react-native` requires `enableSessionRecording: true` in the SDK init before mobile sessions are captured — see Follow-ups. |
| Error Tracking | Enabled (inert on mobile) | Server toggle is ON. Requires `captureNativeExceptions: true` (or equivalent) in the SDK — see Follow-ups. |
| Support (Conversations) | Enabled | Server toggle is ON. Tickets only arrive once an inbound channel is connected (email / inbox / Slack) in PostHog — see Follow-ups. |

> `products-enable` MCP tool was not available on this deploy. All three products were enabled via their server-side defaults. The mobile app's SDK must be configured to make replay and error tracking active — the server flip is on but inert until then.

## Signal sources

| source_product | source_type | Action |
|---|---|---|
| `signals_scout` | `cross_source_issue` | **Already on by default** — no row needed; scout findings reach the inbox automatically |
| `health_checks` | `health_issue` | **Enabled** (id: 01a00dd4-b827-783d-bddc-0de1b4c2d1e1) |
| `error_tracking` | `issue_created` | **Enabled** (id: 01a00dd4-bfca-7187-b212-fcffb81dc35a) |
| `error_tracking` | `issue_reopened` | **Enabled** (id: 01a00dd4-c10f-7bb5-8f38-c8c23fc3d162) |
| `error_tracking` | `issue_spiking` | **Enabled** (id: 01a00dd4-c204-7a2b-bf51-0e6aa45f036d) |
| `session_replay` | `session_analysis_cluster` | **Enabled** (id: 01a00dd4-c303-751f-944f-0085499832ca, sample_rate: 0.1) |
| `conversations` | `ticket` | **Enabled** (id: 01a00dd4-c436-7320-ae2e-bca18e59ea28) |
| `replay_vision` | — | **Skipped** — self-authorizing via scanner `emits_signals` flag; no source row required |
| `llm_analytics` | — | **Skipped** — no LLM/AI usage in this project |
| `logs` | — | **Skipped** — PostHog logs product not in use |

## Connected tools

| Tool | Status |
|---|---|
| GitHub Issues | Not used (not selected) |
| Linear | Not used (not selected) |
| Jira | Not used (not selected) |
| Sentry | Not used (not selected) |
| Zendesk | Not used (not selected) |

No connected-tool sources were selected. The full catalog (36 tools) remains available in PostHog if needed later.

## Scout troop

**Run budget:** 100 runs/day (early-access default, confirmed via `scout-metadata-get`). 0 runs used today. Banner: *"Scouts are in early access. Each project gets up to 100 scout runs a day. Contact team-self-driving@posthog.com if you need more."*

### Enabled (5 scouts)

| Scout | Reason enabled |
|---|---|
| `signals-scout-general` | Always on — cross-product generalist, watches surfaces no specialist covers |
| `signals-scout-product-analytics` | Primary instrumented surface — `posthog-react-native` installed, core events expected |
| `signals-scout-feature-flags` | Feature flags likely used for paid-tier gating (rank system, crew features) |
| `signals-scout-health-checks` | Cross-product; critical for catching PostHog setup issues on a fresh project |
| `signals-scout-observability-gaps` | Cross-product; identifies event volumes with no insight/dashboard/alert coverage |

### Disabled (22 scouts)

| Scout | Reason |
|---|---|
| `signals-scout-error-tracking` | **Covered by native source** (error_tracking signal source enabled in step 4) |
| `signals-scout-session-replay` | **Covered by native source** (session_replay signal source enabled in step 4) |
| `signals-scout-web-analytics` | Not applicable — GymCrew is a mobile app, no web traffic/UTM tracking |
| `signals-scout-web-vitals` | Not applicable — mobile app, no Core Web Vitals |
| `signals-scout-apm` | Not applicable — no OpenTelemetry spans instrumented |
| `signals-scout-ai-observability` | Not in use — no LLM/AI features in this project |
| `signals-scout-revenue-analytics` | Not in use — no payment SDK (Stripe, RevenueCat, etc.) |
| `signals-scout-surveys` | Not in use — no PostHog surveys configured |
| `signals-scout-csp-violations` | Not applicable — no web surface, no CSP reporting |
| `signals-scout-logs` | Not in use — PostHog logs product not active |
| `signals-scout-customer-analytics` | Not applicable — B2C fitness app, no group/accounts analytics |
| `signals-scout-data-pipelines` | Not in use — no CDP destinations, batch exports, or hog flows |
| `signals-scout-data-warehouse` | Not in use — no external data sources connected |
| `signals-scout-experiments` | Not in use — no active A/B experiments |
| `signals-scout-anomaly-detection` | No dashboards/insights yet; enable when analytics coverage matures |
| `signals-scout-conversations` | No inbound channel connected yet; enable once Conversations has data |
| `signals-scout-inbox-validation` | Not useful on a fresh project — no shipped fixes to validate |
| `signals-scout-insight-alerts` | No alerts configured yet |
| `signals-scout-replay-vision` | No existing scanners with accumulated observations to trend over |
| `signals-scout-skills-store` | Not relevant to product monitoring |
| `signals-scout-tasks` | Not relevant to product monitoring |
| `signals-scout-mcp-tool-calls` | Not relevant to product monitoring |

> To re-enable a surface-specific scout later: go to the [Self-driving inbox](https://us.posthog.com/project/561673/inbox) → Scout settings and flip the relevant scout on.

## Custom scouts

**No custom scouts created** (user declined all proposals).

### Proposed and declined

| Proposed scout | Surface | Why no built-in covers it | Filter that excluded it |
|---|---|---|---|
| `signals-scout-gymcrew-onboarding` | Multi-step sign-up → first workout funnel | `signals-scout-product-analytics` only watches saved PostHog funnels (none exist yet on this fresh project) | User declined |
| `signals-scout-gymcrew-workout-health` | Workout start vs. finish abandonment rate | Core daily loop not covered by any built-in without a saved funnel | User declined |
| `signals-scout-gymcrew-crew-engagement` | Paid crew/social feature adoption and activity | No built-in watches social feature engagement | User declined |

These can be added later. If a proposed scout turns out noisy after creation, set `emit: false` on its config in PostHog to switch it to dry-run without disabling it.

## Replay Vision scanners

**Both skeletons skipped — GymCrew is a pure React Native mobile app.**

| Scanner | Status | Reason |
|---|---|---|
| Broken experiences | Skipped | URL-scoped scanner (`$current_url icontains`) is not applicable for React Native session recordings — mobile sessions don't have web URL properties |
| User frustration | Skipped | `$rageclick` is a browser event; it does not fire in React Native mobile sessions |

**Follow-up:** If GymCrew adds a web surface (Expo web), create both scanners:
- **Broken experiences** — scope `$current_url icontains` to the onboarding or workout-logging routes (e.g. `/onboarding`, `/log`), `sampling_rate: 0.5`
- **User frustration** — gate on `$rageclick` events with `sampling_rate: 1.0`, no URL filter

## Follow-ups

- [ ] **Enable Session Replay in the SDK** — add `enableSessionRecording: true` to the `posthog-react-native` init config so mobile sessions are actually captured. ([PostHog Session Replay docs for React Native](https://posthog.com/docs/session-replay/react-native))
- [ ] **Enable Error Tracking in the SDK** — add `captureNativeExceptions: true` (or the equivalent for your Expo setup) so native crashes are captured. ([PostHog Error Tracking docs](https://posthog.com/docs/error-tracking))
- [ ] **Connect a Support inbound channel** — go to the PostHog product sidebar → Support → connect email, inbox, or Slack so the `conversations / ticket` source starts receiving data.
- [ ] **Create Replay Vision scanners** — once GymCrew has a web surface, create "Broken experiences" and "User frustration" scanners from the PostHog Replay Vision UI ([https://us.posthog.com/project/561673/replay-vision](https://us.posthog.com/project/561673/replay-vision)).
- [ ] **Save onboarding and workout funnels in PostHog** — the `signals-scout-product-analytics` specialist watches saved flows; creating funnels for sign-up → first workout and workout start → complete gives it something to watch.
- [ ] **Add custom scouts (optional)** — three gaps were identified but declined: onboarding funnel drop-off, workout session abandonment, and crew engagement health. Re-run Self-driving setup or create them manually once you want tighter coverage.
- [ ] **Connect an issue tracker (optional)** — GitHub Issues, Linear, or Jira can feed the inbox so Self-driving can also fix tracked issues. Add via [https://us.posthog.com/project/561673/pipeline/new/source](https://us.posthog.com/project/561673/pipeline/new/source).

## What happens next

- The scout coordinator picks up new configs within **~30 minutes**; first scans fire on the next tick.
- Each scout run draws from the project's daily budget (100 runs/day during early access).
- Findings cluster into reports in the [Self-driving inbox](https://us.posthog.com/project/561673/inbox); actionable ones can auto-start fix tasks.
- Scout findings from `signals-scout-*` reach the inbox through the `signals_scout / cross_source_issue` gate (on by default — no source row needed).
- Error tracking findings arrive via the three `error_tracking` source rows; session replay cluster findings arrive via `session_replay / session_analysis_cluster`.
