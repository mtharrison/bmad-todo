# Story 1.12: CI Performance, Accessibility & Visual-Regression Gates

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want every CI run to enforce the product's quality commitments — latency, bundle size, accessibility, contrast, and visual regression — so that no PR can ship a regression silently,
so that the product's budgets are a living contract enforced by the build pipeline.

## Acceptance Criteria

1. **Given** a PR is opened, **When** the latency CI gate runs, **Then** p95 keystroke-to-render <16ms (NFR1), p95 completion-to-strikethrough <50ms (NFR2), and p95 enter-to-task-visible <100ms (NFR3) are each asserted; any regression fails the build.

2. **Given** a PR is opened, **When** the bundle-size gate runs, **Then** initial JS bundle ≤50KB gzipped and total bundle ≤150KB gzipped are asserted; any regression fails the build.

3. **Given** a PR is opened, **When** the axe-core accessibility audit runs against the rendered app, **Then** zero Level AA violations are reported; any violation fails the build.

4. **Given** both themes are evaluated, **When** the contrast assertion test runs, **Then** body ink on paper ≥4.5:1, muted ink ≥4.5:1, accent ≥3:1 are each asserted for both light and dark themes independently; any failure fails the build.

5. **Given** the keyboard-only E2E Playwright test runs, **When** it exercises Journeys 1 (add task), 2 (complete task), and 5 (undo delete), **Then** all three journeys complete successfully with zero pointer events; any pointer dependency fails the test.

6. **Given** visual-regression snapshots are run, **When** the suite covers mobile/tablet/desktop viewports × both themes × all journey states (empty, populated, focused, completed, edit, annunciator-surfaced), **Then** all snapshots match baselines; the empty-state snapshot contains only the capture-line cursor (no chrome, illustration, copy) — the load-bearing anti-feature regression check.

7. **And** the property-based sync test (1000-op workload, offline/online/conflict) runs in CI; any never-duplicate or never-lose invariant violation fails the build.

8. **And** the `prefers-reduced-motion` path is covered: latency budgets hold under reduced-motion; tests run with the preference emulated.

9. **And** `docs/` contains a manual screen-reader pre-ship checklist for VoiceOver (macOS Safari + iOS Safari) and NVDA (Windows Firefox/Edge) covering Journeys 1–6.

## Tasks / Subtasks

- [ ] **Task 1: Create latency budget benchmark tests** (AC: #1)
  - [ ] 1.1 Create `tests/perf/keystroke-to-render.bench.ts` — Playwright test that:
    - Opens the app, types 50 characters into CaptureLine.
    - Uses `page.evaluate()` with `performance.now()` to measure each keystroke-to-next-paint latency (same strategy as `lib/latency.ts`: mark before keydown, measure in rAF callback).
    - Collects all samples, sorts, asserts p95 < 16ms.
    - Runs with `{ reducedMotion: 'no-preference' }` (default).
  - [ ] 1.2 Create `tests/perf/check-to-strike.bench.ts` — Playwright test that:
    - Adds 10 tasks, toggles completion on each.
    - Measures time from `x` keypress to `data-completed="true"` attribute appearing (via `page.evaluate` with `MutationObserver` or rAF timing).
    - Asserts p95 < 50ms.
  - [ ] 1.3 Create `tests/perf/add-to-appear.bench.ts` — Playwright test that:
    - Types task text and presses Enter 20 times.
    - Measures time from Enter keypress to new `<li>` appearing in the DOM.
    - Asserts p95 < 100ms.
  - [ ] 1.4 Create `tests/perf/cold-load-paint.bench.ts` — Playwright test that:
    - Seeds 100 tasks via the API (`POST /tasks` × 100).
    - Navigates to `/` with network cache and IDB pre-populated.
    - Measures time from navigation start to all 100 `<li>` elements visible.
    - Asserts < 100ms after JS evaluation completes.
  - [ ] 1.5 Add a `tests/perf/playwright.config.ts` (or section in root playwright config) that configures perf tests as a separate Playwright project named `perf` — uses chromium only, `fullyParallel: false`, `workers: 1` (deterministic timing).

- [ ] **Task 2: Create axe-core accessibility audit test** (AC: #3)
  - [ ] 2.1 Install `@axe-core/playwright` as a dev dependency: `pnpm add -D @axe-core/playwright -w`.
  - [ ] 2.2 Create `tests/e2e/a11y.spec.ts` with axe-core integration:
    - **Empty state (both themes):** Navigate to `/`, run axe. Zero violations.
    - **Populated state:** Add 3 tasks, run axe. Zero violations.
    - **Task completed state:** Complete a task, run axe. Zero violations.
    - **Task focused state:** Focus a task row (Tab), run axe. Zero violations.
    - **Edit mode state:** Enter edit on a task, run axe. Zero violations.
    - **Annunciator visible state:** Go offline for 2.5s, verify annunciator, run axe. Zero violations.
    - Use `new AxeBuilder(page).analyze()` and assert `results.violations` is empty.
    - For each test, tag the theme (`light` / `dark`) and run both.
  - [ ] 2.3 Configure axe to check against WCAG 2.1 AA: `new AxeBuilder(page).withTags(['wcag2a', 'wcag21a', 'wcag2aa', 'wcag21aa'])`.

- [ ] **Task 3: Expand visual-regression snapshot suite** (AC: #6)
  - [ ] 3.1 Update `tests/e2e/visual-regression.spec.ts` to add viewport variations. Currently has blank-screen and annunciator snapshots at desktop only. Add:
    - Mobile viewport (375×667): empty state, both themes.
    - Tablet viewport (768×1024): empty state, both themes.
    - Desktop viewport (1280×800): already covered.
  - [ ] 3.2 Add populated-state snapshots: Add 3 tasks. Capture at mobile, tablet, desktop × both themes.
  - [ ] 3.3 Add focused-state snapshots: Add 3 tasks, Tab to focus first row. Capture at desktop × both themes.
  - [ ] 3.4 Add completed-state snapshots: Add 3 tasks, complete one. Capture at desktop × both themes.
  - [ ] 3.5 Add edit-mode snapshots: Add a task, enter edit mode. Capture at desktop × both themes.
  - [ ] 3.6 Ensure existing annunciator snapshots remain. They currently cover light + dark at desktop.
  - [ ] 3.7 Verify the empty-state structural assertion (lines 100-111) is preserved — it's the load-bearing anti-feature regression check.

- [ ] **Task 4: Add reduced-motion latency verification** (AC: #8)
  - [ ] 4.1 Create `tests/perf/reduced-motion-latency.bench.ts` — same tests as Task 1.1 and 1.2, but with `page.emulateMedia({ reducedMotion: 'reduce' })`.
  - [ ] 4.2 Assert the same p95 budgets hold: keystroke <16ms, completion <50ms.
  - [ ] 4.3 This complements the existing `tests/e2e/j5-reduced-motion-latency.spec.ts` which verifies the CSS token resolves to 0ms and synchronous completion — the perf bench adds statistical confidence.

- [ ] **Task 5: Create manual screen-reader pre-ship checklist** (AC: #9)
  - [ ] 5.1 Create `docs/SCREEN-READER-CHECKLIST.md` with sections for:
    - **VoiceOver (macOS Safari)**: Journeys 1–6 with pass/fail checkboxes.
    - **VoiceOver (iOS Safari)**: Journeys 1–6 with pass/fail checkboxes.
    - **NVDA (Windows Firefox)**: Journeys 1–6 with pass/fail checkboxes.
    - **NVDA (Windows Edge)**: Journeys 1–6 with pass/fail checkboxes.
  - [ ] 5.2 Define each journey's screen-reader checkpoints:
    - J1 (Capture & Review): CaptureLine announced as "Add a task"; task list reads items; newest-first order verified.
    - J2 (Delete & Undo): Deletion announced; undo restores; list updates announced.
    - J3 (Return after absence): Cache-first load announces tasks immediately.
    - J4 (First-ever visit): Empty state announces just the capture input.
    - J5 (Inline edit): Edit mode announced; commit/cancel announced.
    - J6 (Offline reconcile): Annunciator `role="status"` announces offline state; recovery announced.

- [ ] **Task 6: Update CI workflow with new jobs** (AC: #1, #2, #3, #6, #7, #8)
  - [ ] 6.1 Update `.github/workflows/ci.yml` to match the architecture's job matrix:
    - **Rename `test` → `unit-and-property`**: Runs `pnpm test` (includes vitest unit + property tests + sync-invariants).
    - **Rename `e2e` → `e2e-and-a11y`**: Runs `pnpm test:e2e` (now includes axe-core tests + visual regression + keyboard-only tests).
    - **Add `latency-budget` job**: Builds app, installs Playwright, runs perf tests only (`playwright test --project=perf`).
    - **Add `audit` job**: Runs `pnpm audit --audit-level=high`.
    - Keep existing: `lint`, `typecheck`, `anti-features`, `bundle-budget`.
  - [ ] 6.2 Configure the `latency-budget` job:
    ```yaml
    latency-budget:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: pnpm/action-setup@v4
        - uses: actions/setup-node@v4
          with:
            node-version-file: ".nvmrc"
            cache: "pnpm"
        - run: pnpm install --frozen-lockfile
        - run: pnpm exec playwright install --with-deps chromium
        - run: pnpm build
        - run: pnpm exec playwright test --project=perf
    ```
  - [ ] 6.3 Add `audit` job:
    ```yaml
    audit:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: pnpm/action-setup@v4
        - uses: actions/setup-node@v4
          with:
            node-version-file: ".nvmrc"
            cache: "pnpm"
        - run: pnpm install --frozen-lockfile
        - run: pnpm audit --audit-level=high
    ```
  - [ ] 6.4 Verify all jobs are `required` status checks for PRs (documented in README or repo settings).

- [ ] **Task 7: Update Playwright config for perf project** (AC: #1, #8)
  - [ ] 7.1 Update root `playwright.config.ts` to add a `perf` project:
    ```ts
    {
      name: "perf",
      testDir: "./tests/perf",
      use: { ...devices["Desktop Chrome"] },
    }
    ```
  - [ ] 7.2 The perf project tests use the same `webServer` config as the main e2e tests (API on :3000, web on :5173).
  - [ ] 7.3 Default `pnpm test:e2e` should NOT run perf tests (they run in a separate CI job). Configure by setting `testDir` in the default chromium project to `./tests/e2e` explicitly.

- [ ] **Task 8: Verify all existing gates still pass** (AC: all)
  - [ ] 8.1 Run `pnpm test` — all unit/property tests pass (281+ tests).
  - [ ] 8.2 Run `pnpm test:e2e` — all E2E tests pass without regression.
  - [ ] 8.3 Run `pnpm lint && pnpm typecheck` — clean.
  - [ ] 8.4 Run `bash scripts/check-anti-features.sh` — no forbidden patterns.
  - [ ] 8.5 Run `pnpm build && pnpm exec tsx scripts/check-bundle-size.ts` — within budget.
  - [ ] 8.6 Run the new perf tests: `pnpm exec playwright test --project=perf` — all latency budgets met.
  - [ ] 8.7 Update visual regression baselines: `pnpm exec playwright test --update-snapshots` for new viewport/state combinations.

## Dev Notes

### CRITICAL: Architecture Compliance

**The architecture document is the source of truth.** Key requirements for this story:

1. **CI job names must match architecture.md § CI/CD table** (line 340-352): `lint`, `typecheck`, `unit-and-property`, `e2e-and-a11y`, `latency-budget`, `bundle-budget`, `audit`, `stress-sync` (nightly), `deploy` (push to main). Current ci.yml has `test` and `e2e` — rename to match.
2. **Tests live in architecture-specified directories**: `tests/perf/*.bench.ts` for latency benchmarks, `tests/e2e/*.spec.ts` for E2E/a11y/visual-regression, `tests/property/*.test.ts` for property-based cross-cutting tests.
3. **`@axe-core/playwright`** is the mandated a11y audit tool (architecture line 776, NFR-A11y-1).
4. **Visual-regression snapshots** must cover: mobile/tablet/desktop × both themes × empty/populated/focused/completed/edit/annunciator (architecture line 777).
5. **Latency budget perf tests** are Playwright-based (architecture line 781-784), NOT Vitest bench tests. They run in a browser context to measure real DOM timing.
6. **`pnpm audit --audit-level=high`** must run in CI (architecture line 350, NFR-Sec-4).
7. **`stress-sync` is nightly + on-tag only** (architecture line 351) — do NOT add it to every-PR CI. The existing `tests/property/sync-invariants.test.ts` already runs via `pnpm test` on every PR as a vitest test.

### Existing Infrastructure (DO NOT recreate)

**Already implemented — consume or extend:**

- `.github/workflows/ci.yml` — current 7-job config (lint, typecheck, test, anti-features, bundle-budget, e2e). Rename `test` → `unit-and-property`, `e2e` → `e2e-and-a11y`, add `latency-budget` and `audit`.
- `scripts/check-bundle-size.ts` — complete, asserts ≤50KB initial / ≤150KB total gzipped. No changes needed.
- `scripts/check-anti-features.sh` — complete, blocks forbidden patterns. No changes needed.
- `tests/e2e/visual-regression.spec.ts` — has blank-screen snapshots (both themes, high-contrast, forced-colors, annunciator). Extend with viewport variations and populated states.
- `tests/e2e/keyboard-only.spec.ts` — complete, covers J1/J2/J5 keyboard-only paths. No changes needed (AC #5 already satisfied).
- `tests/e2e/j5-reduced-motion-latency.spec.ts` — verifies CSS token and synchronous completion under reduced-motion. Complements the new perf bench.
- `apps/web/src/design-tokens.test.ts` — complete contrast ratio assertions for both themes and high-contrast. No changes needed (AC #4 already satisfied).
- `tests/property/sync-invariants.test.ts` — 1000-op stress test using fast-check. Already runs via `pnpm test`. No changes needed (AC #7 already satisfied).
- `playwright.config.ts` — root config with chromium project, webServer config for API (:3000) and web (:5173). Extend with `perf` project.
- `tests/e2e/test-fixtures.ts` — custom test fixture with server reset loop. Perf tests should use this same fixture.

### What Already Satisfies ACs Without New Code

Several ACs are already covered by existing tests and infrastructure:

- **AC #2 (bundle-size):** `scripts/check-bundle-size.ts` + `bundle-budget` CI job already enforce this.
- **AC #4 (contrast):** `apps/web/src/design-tokens.test.ts` already verifies contrast ratios for both themes + high-contrast.
- **AC #5 (keyboard-only):** `tests/e2e/keyboard-only.spec.ts` already covers J1, J2, J5 with zero pointer events.
- **AC #7 (sync stress):** `tests/property/sync-invariants.test.ts` already runs in CI via `pnpm test`.

The primary new work is: latency perf benchmarks (AC #1), axe-core integration (AC #3), expanded visual-regression snapshots (AC #6), reduced-motion perf coverage (AC #8), screen-reader checklist doc (AC #9), and CI workflow updates to match architecture job names.

### Latency Benchmark Strategy

The perf benchmarks are **Playwright tests** (not Vitest bench), because they need a real browser rendering pipeline to measure keystroke-to-paint latency. Strategy:

1. **Keystroke-to-render (NFR-Perf-1):** Use `page.evaluate()` to inject a measurement script that hooks `keydown` → `requestAnimationFrame` → `performance.now()` delta. This mirrors the approach in `lib/latency.ts` but runs in the Playwright-controlled browser.

2. **Completion-to-strikethrough (NFR-Perf-2):** Use `MutationObserver` to detect `data-completed` attribute change after dispatching `x` key.

3. **Enter-to-task-visible (NFR-Perf-3):** Use `MutationObserver` to detect new `<li>` child added to the task list after Enter press.

4. **Cold-load paint (NFR-Perf-4):** Seed tasks via API, navigate to `/`, wait for all `<li>` elements. Measure via `PerformanceObserver` or `requestAnimationFrame` timing.

**CI runner variance warning:** Shared GitHub Actions runners may have timing variance. The architecture notes (line 1104-1106): "if latency-budget breach occurs on shared runners, parallelize Playwright into shards, and run latency-budget only on main post-merge." For now, implement the tests; if CI flakes emerge, the mitigation path is documented.

### axe-core Integration Pattern

```ts
import AxeBuilder from "@axe-core/playwright";

const results = await new AxeBuilder(page)
  .withTags(["wcag2a", "wcag21a", "wcag2aa", "wcag21aa"])
  .analyze();
expect(results.violations).toEqual([]);
```

The `@axe-core/playwright` package is NOT currently installed. Must be added as a workspace root dev dependency.

### Visual Regression Viewport Dimensions

Per architecture and UX spec:

- **Mobile:** 375×667 (iPhone SE-class)
- **Tablet:** 768×1024 (iPad-class)
- **Desktop:** 1280×800 (current default in Playwright chromium project)

Use `page.setViewportSize()` before snapshots. Keep `maxDiffPixelRatio: 0.01` consistent with existing tests.

### Screen-Reader Checklist Journeys

The 6 journeys referenced in the checklist (from UX spec):

- **J1:** Capture → Work → Review (add tasks, scan the list)
- **J2:** Delete → Undo (delete a task, press u to restore)
- **J3:** Return after absence (close app, reopen, tasks persist)
- **J4:** First-ever visit (empty state, capture immediately)
- **J5:** Inline edit (edit text, commit, cancel)
- **J6:** Offline reconcile (go offline, make changes, reconnect)

### Anti-Feature Contract Compliance

**Forbidden patterns that must NOT appear in any new code:**

- No `toast(`, `Snackbar`, `Toaster`, `Skeleton`, `Spinner`
- No `confirm(`, `alert(`, `<Modal`, `<Dialog`
- No `<ErrorBoundary>` — errors route to annunciator
- No decorative motion on any new element (FR53)
- No new colors beyond the existing token palette

### Testing Standards

**Perf tests (`tests/perf/*.bench.ts`):**

- Playwright-based, import from `@playwright/test`.
- Use the same `test-fixtures.ts` pattern for server reset.
- Each test collects N samples, sorts, asserts p95 < budget.
- Run via `playwright test --project=perf`, NOT via `vitest`.

**axe-core tests (`tests/e2e/a11y.spec.ts`):**

- Import `AxeBuilder` from `@axe-core/playwright`.
- Run against multiple app states (empty, populated, focused, completed, edit, annunciator).
- Both themes tested independently.
- WCAG 2.1 AA tag filter.

**Visual regression tests (`tests/e2e/visual-regression.spec.ts`):**

- Extend existing file, don't replace.
- Add `test.describe` blocks for each viewport × theme × state combination.
- Use `page.setViewportSize()` for mobile/tablet variants.

### Previous Story Intelligence

**From Story 1.11 (Dev Mode Latency Display, status: `review`):**

- 281 unit tests passing, 48/49 E2E passing (1 pre-existing flaky, different test each run).
- `lib/latency.ts` has the measurement primitives — the perf benchmarks can reference the same rAF-based timing pattern.
- Fixed sentinel value for latency start: `0` → `-1` (potential rAF timing gotcha).
- CSS placement: DevLatencyDisplay at `top: 24px; right: 24px`, annunciator at `bottom: 24px; right: 24px`.
- Anti-feature check, lint, typecheck all clean.

**From Story 1.10 (Annunciator, status: `done`):**

- Annunciator at `.annunciator` class, `position: fixed; bottom: 24px; right: 24px`.
- `role="status"`, `aria-live="polite"` — axe-core should validate these.
- 2-second transient threshold before surfacing.

**From Story 1.9 (Persistence, status: `done`):**

- Property-based sync test exists at `tests/property/sync-invariants.test.ts` — 1000-op workload with offline/online/conflict.
- Uses `fast-check` + in-memory SQLite harness.
- Already runs in CI via `pnpm test`.

### File Structure Requirements

**New files:**

- `tests/perf/keystroke-to-render.bench.ts` — NFR-Perf-1 benchmark
- `tests/perf/check-to-strike.bench.ts` — NFR-Perf-2 benchmark
- `tests/perf/add-to-appear.bench.ts` — NFR-Perf-3 benchmark
- `tests/perf/cold-load-paint.bench.ts` — NFR-Perf-4 benchmark
- `tests/perf/reduced-motion-latency.bench.ts` — NFR-Perf-9 verification
- `tests/e2e/a11y.spec.ts` — axe-core audit
- `docs/SCREEN-READER-CHECKLIST.md` — manual pre-ship checklist

**Modified files:**

- `.github/workflows/ci.yml` — rename jobs, add `latency-budget` + `audit`
- `playwright.config.ts` — add `perf` project, explicit `testDir` on chromium
- `tests/e2e/visual-regression.spec.ts` — add viewport/state combinations
- `package.json` — add `@axe-core/playwright` dev dependency

**Unchanged (verify still passes):**

- `scripts/check-bundle-size.ts`
- `scripts/check-anti-features.sh`
- `tests/e2e/keyboard-only.spec.ts`
- `tests/e2e/j5-reduced-motion-latency.spec.ts`
- `apps/web/src/design-tokens.test.ts`
- `tests/property/sync-invariants.test.ts`

### References

- Source acceptance criteria: [epics.md Story 1.12](../../_bmad-output/planning-artifacts/epics.md) (lines 787-822)
- Architecture CI/CD table: [architecture.md](../../_bmad-output/planning-artifacts/architecture.md) (lines 340-352)
- Architecture directory tree: [architecture.md](../../_bmad-output/planning-artifacts/architecture.md) (lines 768-792)
- Architecture latency budget files: [architecture.md](../../_bmad-output/planning-artifacts/architecture.md) (lines 781-784)
- Architecture NFR coverage: [architecture.md](../../_bmad-output/planning-artifacts/architecture.md) (lines 1038-1074)
- PRD NFR-Perf-1/2/3/4: [prd.md](../../_bmad-output/planning-artifacts/prd.md) — <16ms, <50ms, <100ms, <100ms after JS eval
- PRD NFR-A11y-1: WCAG 2.1 AA via axe-core in CI
- PRD NFR-Sec-4: `pnpm audit --audit-level=high` in CI
- PRD NFR-Maint-3: visual-regression on empty state + codebase grep
- UX-DR26: visual-regression snapshot suite specification
- UX-DR27: keyboard-only E2E test (already implemented)
- UX-DR28: manual screen-reader pre-ship checklist
- Existing CI config: `.github/workflows/ci.yml`
- Existing perf measurement: `apps/web/src/lib/latency.ts`
- Existing contrast tests: `apps/web/src/design-tokens.test.ts`
- Existing visual-regression: `tests/e2e/visual-regression.spec.ts`
- Existing keyboard-only tests: `tests/e2e/keyboard-only.spec.ts`
- Existing sync stress test: `tests/property/sync-invariants.test.ts`
- Previous story: [1-11-dev-mode-latency-display-and-anti-feature-contract.md](./1-11-dev-mode-latency-display-and-anti-feature-contract.md) (status: `review`)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### Change Log

### File List
