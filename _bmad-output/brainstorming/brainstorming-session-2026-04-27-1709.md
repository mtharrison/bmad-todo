---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: ['docs/Product Requirement Document (PRD) for the Todo App.md']
session_topic: 'Breaking out of the standard Todo app mental model — aesthetic and UX provocation, with speed and test-rigor as supporting pillars'
session_goals: 'Generate distinctive design/UX directions that refuse to look or feel like every other Todo app, while honoring the three pillars: shockingly fast (optimistic UI), test-first quality, and unique visual/interaction design.'
selected_approach: 'ai-recommended'
techniques_used: ['Reverse Brainstorming', 'Cross-Pollination', 'SCAMPER Method']
ideas_generated: 82
session_active: false
workflow_completed: true
context_file: ''
---

# Brainstorming Session Results

**Facilitator:** Matt
**Date:** 2026-04-27

## Session Overview

**Topic:** Breaking out of the standard Todo app mental model — aesthetic and UX provocation, with speed and test-rigor as supporting pillars.

**Goals:** Generate distinctive design/UX directions that refuse to look or feel like every other Todo app, while honoring the three pillars:
1. **Shockingly fast** — optimistic UI, instant perceived response, zero waiting states.
2. **Test-first rigor** — quality discipline as a feature, not an afterthought.
3. **Distinctively designed** — refuses to look like every other Todo app.

### Session Setup

The user has an existing PRD draft in `docs/` describing a minimal personal Todo app (CRUD, single-user, no auth in v1). This session is intentionally happening **before** the PRD is locked, to push past the obvious feature list into design and interaction territory that will make v1 distinctive.

The aesthetic/UX provocation framing means the session will focus on **breaking the standard Todo app mental model** — questioning conventions like the linear list, the checkbox, the "add task" input field, and the visual language of productivity apps generally.


## Technique Selection

**Approach:** AI-Recommended Techniques
**Analysis Context:** Aesthetic/UX provocation for a Todo app, with three pillars (shockingly fast, test-first rigor, distinctively designed). User is opinionated and concrete — calls for a *disrupt → diverge → converge* shape rather than pure divergence.

**Recommended Sequence:**

1. **Reverse Brainstorming** *(creative, ~15 min)* — "Design the worst possible Todo app." Surfaces unspoken genre conventions by deliberately violating them; we then flip those into distinctiveness levers.
2. **Cross-Pollination** *(creative, ~20 min)* — "What if a Todo app behaved like [adjacent unrelated domain]?" Imports patterns from games, music tools, kitchens, gardens, etc. — domains that have already solved zero-latency feedback better than productivity apps.
3. **SCAMPER on the Checkbox & List** *(structured, ~15 min)* — Wraps wild divergence into a concrete output by applying 7 lenses to the two most ossified atoms of the genre.

**AI Rationale:** A pure-divergent flow risks fun-but-unusable output; a pure-structured flow risks producing yet another Todo app. This sequence first exposes the rules, then breaks them with imported energy from other domains, then converges on shippable moves.


## Phase 1 — Reverse Brainstorming

**Prompt:** "Design the worst possible Todo app."

**Approach:** User and facilitator riffed on awful ideas; each surfaced an *implicit rule* that Todo apps silently obey. We then flipped each rule into an inverse design move for v1.

### 26 Awful Ideas Captured

1. **Unbreakable Modal** — 14-field required form to add a task.
2. **Performative Loading** — gratuitous spinners that reveal the backend.
3. **Productivity Lecture Empty State** — paragraphs of GTD methodology + stock photo.
4. **Overeager Autocomplete** *(user)* — irrelevant probabilistic suggestions everywhere.
5. **Confidence Reverser** — suggestions that flash and un-flash mid-typing.
6. **Helpful Correction** — silently rewrites user text without telling them.
7. **Achievement Notification** — full-screen "+10 XP! Streak: 4!" modal on every check-off.
8. **Productivity Beige** — same blue/grey/white as every other tool.
9. **Empty State Stock Photo** — illustration + hollow inspirational quote.
10. **Cargo-Cult Dark Mode** *(user)* — `#222` text on `#1a1a1a`.
11. **Scrolljacking & Parallax** *(user)* — landing-page motion in a daily tool.
12. **Microscopic Type** *(user)* — 11px body for "elegance."
13. **Font Salad** *(user)* — three typefaces, no hierarchy.
14. **10-Second Victory Lap** *(user)* — blocking confetti animation on check-off.
15. **Partner-Waker** *(user)* — unmuted ding by default at 11pm.
16. **Oldest-First Sort** *(user)* — buries the thing you just typed.
17. **Gaslighting Sync** — task appears, disappears, re-appears triplicated.
18. **Undo of Death** — "undo" undoes the gesture but not the data loss.
19. **Settings Maze** — fix for default-bad behavior buried six levels deep.
20. **Onboarding Tour** — 9 tooltips pointing at obvious buttons.
21. **Skeleton Loaders for Local Data** — fake loading where there is no labor.
22. **Empty State Mockery** — "0 tasks today! ✨" while 47 are overdue.
23. **Zombie Reminder** *(user)* — daily nag about a 47-day-old task.
24. **Time-Shame Counter** *(user)* — "4h 23m used, 3 tasks done. Hmm."
25. **Peer Shame Leaderboard** *(user)* — social comparison for personal tasks.
26. **Wrong Massacre** *(user)* — check one task, app deletes 10 others.

### v1 Design Constitution (the flipped rules)

| # | Implicit Rule (broken) | Inverse Design Move for v1 |
|---|---|---|
| 1 | Apps over-ask for metadata | **Single-field add.** Just text. Everything else inferred or absent. |
| 2 | Speed is a hardware property | **Optimistic everything.** Zero spinners. Zero "saving…". Reconcile silently. |
| 3 | Empty states explain the app | **Empty = empty.** No stock photos, no quotes. A single, quiet input. |
| 4 | Suggestion UIs perform intelligence rather than serve the user | **Sensible autocomplete only.** History-grounded; one suggestion, not a dropdown; stable (no flicker, no mid-keystroke rewrite); dismissible by ignoring; Tab/right-arrow to accept. If <90% sure, say nothing. |
| 5 | Probabilistic UI flickers | **Nothing appears/disappears mid-keystroke.** Stillness while typing. |
| 6 | Silent corrections are arrogant | **Never auto-correct task text.** What you typed is what's saved. |
| 7 | Gamification taxes inherent satisfaction | **No XP, no streaks, no levels.** Completing the task IS the reward. |
| 8 | Productivity beige aesthetic | **One intentional color identity.** Not blue. Not grey. Something. |
| 9 | Empty states fill voids with positivity | **Empty is dignified.** No "✨", no mock cheer. |
| 10 | "Has dark mode" ≠ "designed dark mode" | **Both themes fully designed.** No half-job. |
| 11 | Productivity apps borrow marketing-page motion | **No parallax. No scrolljack.** Motion serves state, never decoration. |
| 12 | Density as designer vanity | **Generous, readable type.** 16px+ body. |
| 13 | Type chaos | **One typeface. One scale.** |
| 14 | Ceremony for small actions = hostility | **Sub-100ms feedback on check-off.** No animation that blocks the next action. |
| 15 | Default sound = designer didn't try it at night | **Silent by default.** Sound is opt-in. |
| 16 | Default sort = silent assertion | **Newest first.** The thing you just typed is what you're thinking about. |
| 17 | Optimistic UI without conflict resolution = lying | **Honest sync state.** Never duplicate. Never lose. Show conflict if real. |
| 18 | "Undo" must mean undo | **Real undo for every destructive action.** |
| 19 | Burying fixes for bad defaults = hostile | **Defaults must already be right.** Settings = preferences, not damage control. |
| 20 | Onboarding is a confession | **No tour. No tooltips.** The UI explains itself. |
| 21 | Skeleton loaders for local data = theatre | **Local-first.** Tasks instantly present on open. |
| 22 | Performing emotion the app hasn't earned | **Calm and quiet.** No fake cheer, no fake concern. |
| 23 | Backlog as moral debt | **Zombie tasks fade visually**, never nag. The app is not the user's conscience. |
| 24 | "Usage stats" deliver guilt | **No stats screen.** The app does not measure you. |
| 25 | Productivity ≠ sport | **No social, no comparison, no leaderboards.** |
| 26 | Trust is binary | **Test-first rigor maps here directly.** Destructive operations need property-based tests; sync needs invariant tests. |

### Emerging Thesis: The Quiet Tool

The pattern across all 26 flips: **distinctiveness via competent restraint.** This Todo app stands out by *what it refuses to do* — it doesn't lecture, gamify, shame, narrate, theatre, or perform. The character is calm, silent, fast, honest. In a category obsessed with visible features and emotional manipulation, the differentiator is dignified absence of those things.


## Phase 2 — Cross-Pollination

**Prompt:** "What if a Todo app behaved like [adjacent unrelated domain]?"

**Domains chosen:** Aviation cockpit (legibility under pressure), Audio production software (flow state), Zen garden / Ikebana (emptiness as composition). All three reinforce the Quiet Tool thesis with positive texture.

### Imported Patterns

**Aviation Cockpit / Glass Cockpit Avionics** — *No surprises. Legible at a glance.*

- **A1. Dark Cockpit philosophy** — UI is silent until something is *abnormal*. Empty/normal = empty screen.
- **A2. Annunciator panel** — Sync conflict, offline, error → a single calm indicator in a fixed corner. Never modal, never blocking toast.
- **A3. State legibility at a glance** — Whole app readable in one fixation. "Tasks visible at default zoom" is a primary design metric.
- **A4. Stable spatial layout** — Controls never reorder by context, AI ranking, or "smart" suggestions. Muscle memory > novelty.
- **A5. Pre-flight checklist completion model** — Checking off strikes through and dims a task but **keeps it visible** (for a session/day). Completion is *evidence of work*, not "make it disappear."
- **A6. Latency budgets as discipline** — Numeric, tested commitments: <16ms keystroke→render, <50ms check→strike, <100ms add→appear.

**Audio Production Software (Ableton / Logic / modular synths)** — *Flow state is sacred.*

- **B1. Keyboard-first everything** — Every action has a key (`n` new, `j/k` move, `x` check, `u` undo, `/` filter, `?` shortcut overlay). Fully operable without mouse.
- **B2. Global "record" hotkey** — System-wide (or `cmd+enter` from anywhere on web) drops a task in instantly. Capture latency = ~0.
- **B3. Undo as session-long history, not a button** — Multi-level undo across the session, including "completed an hour ago."
- **B4. Direct manipulation, never modal** — Inline edit. Click the text → cursor appears. No "edit task" screen. `enter` commits, `esc` cancels.
- **B5. Learn-once user mappings** — All shortcuts user-configurable.
- **B6. Visible latency as honesty** — Debug/dev mode shows live keystroke→render latency. Builds trust; enforces the budget.

**Zen Garden / Ikebana** — *The space between things matters.*

- **C1. Negative space as composition** — Empty list = a deliberately composed empty space. Quiet, centered single-line input on generous canvas. Beautiful empty.
- **C2. Asymmetry over grid** — Layout uses asymmetry intentionally. Long and short tasks breathe differently.
- **C3. Earned presence** — Every UI element must justify itself. Toolbars hide until invoked. No persistent navigation. No always-on settings cog.
- **C4. Placement is meaningful** — Adding a task feels like *placing*, not "submitting." Sub-100ms deliberate motion.
- **C5. Seasonal patience** — No re-engagement nudges. No "you haven't visited in 3 days." The app waits, calm.
- **C6. Single-typeface composition** — Reinforces rule #13. Distinctiveness through restraint, not collage.

### Signature Intersections (multi-domain reinforcements)

- **🎯 Latency Budget Discipline** *(A6 + B6 + C4)* — Pillar 1 + 2 fused: latency as a tested, numeric, visible engineering discipline. Likely a marketing differentiator.
- **🎯 The Empty Canvas** *(A1 + C1)* — Empty isn't void; it's *composed silence.*
- **🎯 Keyboard-Everything Flow** *(A4 + B1 + B2 + B4)* — App operable at the speed of thought, never breaking flow.


## Phase 3 — SCAMPER on the Checkbox & List

**Targets:** the two most ossified atoms of the genre — the checkbox (or whatever marks "done") and the linear list (the universal layout).

### Checkbox — 14 SCAMPER outputs

- **S1.** Strikethrough only — no checkbox UI; act of completion is striking the text.
- **S2.** The keystroke `x` — keyboard is the primary "checkbox," visual mark is downstream.
- **C1.** Check + timestamp — checking captures completion time as faint inline evidence.
- **C2.** Check + inline undo — moment of completion surfaces a `z`-to-undo affordance for ~4s.
- **A1.** Hand-textured tick — slight randomness per check, inky human texture.
- **A2.** Long-press to confirm for "important" tasks (optional flag).
- **M1.** No visual chrome until row is focused/hovered — list at rest is just text.
- **M2.** Mobile: full-row tap target, checkbox visually shrinks but interaction surface magnifies.
- **P1.** Long-press = snooze (one mark, two outcomes).
- **P2.** Double-check = "this happened twice" for recurring tasks.
- **E1.** Eliminate UI element entirely — completion is purely behavioral (swipe right / press `x`).
- **E2.** Drag-to-done-zone (named for completeness; probably wrong for v1).
- **R1.** Inverted defaults: tasks pre-checked, you uncheck what you'll do today (cursed).
- **R2.** Auto-undo after a period unless explicitly archived (too aggressive).

### List — 14 SCAMPER outputs

- **S1.** Single column with vertical rhythm — paragraphs not list-component.
- **S2.** Spatial canvas with positioned tasks (gains expressiveness, loses defaults).
- **C1.** Strike-through history visible at bottom as "today's record," not a hidden archive.
- **C2.** Capture input merged into top of the list — no separate "+" button or text field.
- **A1.** PFD-style hierarchy — active dominate, older/snoozed progressively smaller and dimmer.
- **A2.** DAW timeline view (probably v2).
- **M1.** Generous, almost-uncomfortable line-height — restraint as character.
- **M2.** Default = spacious; power users can compact.
- **P1.** List as ambient evidence — visual contrast narrates the day without reading.
- **P2.** `f` to focus = single-task mode without screen change.
- **E1.** No section headers — one list, position = priority.
- **E2.** No persistent filter UI — `/` summons search.
- **R1.** Newest at top, completed slide down but stay visible — one direction, one mental model.
- **R2.** "Reads like a journal page, not a UI" — likely the strongest distinctiveness lever.

### Tier ranking (which moves are signature)

| Tier | Move | Rationale |
|---|---|---|
| ⭐⭐⭐ | List M1 + E1 + R1 — single asymmetric list, no headers, no filter chrome by default, newest at top, completed remain visible | This *is* the visual identity. Differentiates instantly. |
| ⭐⭐⭐ | List R2 — "Reads like a journal page, not a UI" | The aesthetic move that breaks the genre most decisively. |
| ⭐⭐⭐ | Checkbox M1 — No checkbox until focus/hover | Reinforces R2; the journal aesthetic dies if there's a square next to every line. |
| ⭐⭐ | List C2 — Input merged into top of list | Removes a UI element + reinforces "place a task" feel. |
| ⭐⭐ | Checkbox A1 — Hand-textured tick mark | Cheap, distinctive, almost free to ship. |
| ⭐⭐ | Checkbox C1+C2 — Stamp time + inline undo | Trust + reversibility wired into one gesture. |


---

## Synthesis & Action Plan

### The product thesis (one-line)

> **A Todo app that operates at the speed of thought, where empty is beautiful, and every millisecond is on the spec sheet.**

### Three pillars × Concrete moves

#### Pillar 1: Shockingly Fast
- **Latency budgets as engineering discipline** — <16ms keystroke→render; <50ms check→strike; <100ms add→appear.
- **Local-first architecture** — tasks instantly present on open; no skeleton loaders.
- **Optimistic-everything** with honest sync state — never duplicate, never lose, surface conflict only if real.
- **Sub-100ms feedback on check-off** — no animation that blocks the next action.
- **Global quick-capture hotkey** — `cmd+enter` from anywhere drops a task in.

#### Pillar 2: Test-First Rigor
- **Latency budgets are tested** — automated regression tests on input → render timings.
- **Property-based tests on destructive operations** — completion, deletion, undo, sync conflict resolution.
- **Sync invariant tests** — never duplicate, never lose data; validated by stress test.
- **Visible latency** in dev/debug mode — discipline made tangible.
- **Real undo proven by test** — every destructive action reversible AND verified to actually restore data.

#### Pillar 3: Distinctively Designed
- **Reads like a journal page, not a UI** — single column, generous line-height, single typeface.
- **No checkbox until row is focused/hovered** — list at rest is just text.
- **One single asymmetric list** — no headers (Today/Upcoming/Someday), no persistent filter chrome.
- **Newest at top; completed slide down but stay visible** — list visually narrates the day.
- **Capture input merged into top of list** — no separate "+" button.
- **Hand-textured tick mark** — slight randomness, inky human texture.
- **Empty Canvas** — empty state is composed silence, not stock photo + quote.
- **One intentional, non-blue color identity.**
- **No tour, no tooltips, no onboarding.**
- **No XP, no streaks, no leaderboards, no usage stats.**
- **The app doesn't measure or shame the user.**

### Themes that emerged across phases

1. **The Quiet Tool** — distinctiveness via competent restraint. The app stands out by what it refuses to do.
2. **Honesty over theatre** — no fake loading, no fake cheer, no performative intelligence.
3. **Flow state is sacred** — keyboard-first, direct manipulation, never modal, real undo.
4. **Empty is a designed state** — the negative space is composed, not a placeholder.
5. **Trust is binary** — destructive operations need test discipline; one bug = uninstall forever.

### Top priority moves (the v1 signature)

| Priority | Move | Why |
|---|---|---|
| **P0** | Latency Budget Discipline (numeric + tested) | The marketing differentiator + proof of pillars 1 & 2. |
| **P0** | Journal-page list aesthetic (single column, no chrome, no headers, generous type) | The visual identity. The thing screenshots will show. |
| **P0** | No checkbox until focused/hovered | Required for the journal aesthetic to land. |
| **P0** | Local-first + optimistic everything + honest sync | Required for "shockingly fast" to be true, not marketing. |
| **P0** | Real undo across the session | Required for trust. |
| **P1** | Capture input merged into top of list | Removes UI element + reinforces "place a task." |
| **P1** | Hand-textured tick mark | Cheap, distinctive, ~free to ship. |
| **P1** | Inline undo on completion | Trust + reversibility wired into one gesture. |
| **P1** | One intentional color identity (not blue/grey) | Visual differentiation. |
| **P2** | Sensible autocomplete (history-grounded only, single suggestion, no flicker) | Useful without performing intelligence. |
| **P2** | Global quick-capture hotkey | Capture latency = ~0. |
| **P2** | User-rebindable shortcuts | Power-user respect. |

### Anti-features (deliberately NOT in v1)

These came up across the session as things every competitor does that we explicitly refuse:

- No XP / streaks / levels / gamification
- No social / leaderboards / peer comparison
- No usage stats / time tracking against the user
- No re-engagement notifications
- No onboarding tour or tooltips
- No empty-state stock photos or motivational quotes
- No persistent navigation chrome
- No section headers (Today / Upcoming / Someday)
- No skeleton loaders for local data
- No blocking animations on completion
- No autocomplete that guesses or rewrites mid-keystroke
- No silent text correction
- No default sound notifications
- No spinners / "saving…" / "syncing…" indicators
- No spatial canvas mode (deferred, possibly v2)
- No timeline view (deferred, possibly v2)

### Session statistics

- **Total ideas generated:** 82 across 3 techniques
  - Phase 1 (Reverse Brainstorming): 26 awful ideas → 26 flipped design rules
  - Phase 2 (Cross-Pollination): 18 imported patterns + 3 signature intersections
  - Phase 3 (SCAMPER): 28 candidate moves + 6 tier-ranked signature moves
- **Techniques completed:** 3 of 3 in planned sequence
- **Duration:** ~50 minutes
- **Output:** v1 design constitution + thesis + tier-ranked priority list

### Recommended next steps

This session's output should flow directly into the next BMad phase. The PRD draft in `docs/` describes the *functional* skeleton (CRUD, single-user, persistence). This brainstorm has produced the *characterological* layer that makes v1 distinctive. Both need to merge.

**Recommended sequence (run each in a fresh context window):**

1. **`bmad-create-prd`** *(Phase 2-planning, required)* — start the formal PRD workflow. Reference this session document so the design constitution, anti-features list, and signature moves get baked in as non-functional requirements and explicit out-of-scope items.
2. **`bmad-create-ux-design`** *(Phase 2-planning, recommended)* — strongly recommended given how UI-led this product is. The journal-page aesthetic and SCAMPER moves are UX specifications waiting to be made concrete.
3. **`bmad-technical-research`** *(Phase 1-analysis, optional)* — if the latency budgets and local-first architecture need stack validation before the PRD locks. Particularly if "<16ms keystroke→render" requires specific framework / persistence / sync technology choices.
4. **`bmad-create-architecture`** *(Phase 3-solutioning, required, later)* — the architecture phase will need to explicitly address the latency budgets and local-first sync model as primary design constraints, not afterthoughts.

### Session reflections

**What worked:** The disrupt → diverge → converge sequence was the right shape. Reverse Brainstorming exposed the genre's unwritten rules quickly; Cross-Pollination injected positive borrowed energy from three carefully chosen non-productivity domains; SCAMPER converged on shippable atoms.

**Breakthrough moments:**
- The "Quiet Tool" thesis crystallizing after the 26 reverse-brainstormed flips.
- The aviation/audio/zen-garden trio reinforcing each other (latency discipline appeared in all three independently).
- "Reads like a journal page, not a UI" emerging as the single most distinctive aesthetic move.
- User pushback on "no autocomplete" → sharper rule about *sensible* autocomplete that performs no intelligence.

**Creative dynamic:** User brought strong opinions and sharp critique; AI brought structured technique scaffolding and rapid synthesis. Productive partnership characterized by user willingness to push back on AI proposals (e.g., the autocomplete revision) — exactly the dynamic these techniques are designed to enable.

