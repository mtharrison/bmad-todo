# Deferred Work

## Deferred from: code review of 1-6-session-long-undo-stack (2026-04-28)

- Unbounded undo stack growth — no size cap on `pushUndo`; session-scoped by design so practical concern only at thousands of operations; consider adding a max-entries eviction if memory profiling surfaces issues
- Stale index on undo-insert after intervening create/delete mutations — index-based `insertTaskAtIndex` uses the index captured at delete time; if other tasks are created/deleted before undo, the restored task may land at a slightly wrong position; a neighbor-anchor approach would be more robust but is a design change
- No undo entry for `createTask` — pressing `u` after creating a task undoes a prior unrelated action; explicitly out of scope per AC#1–9 (only complete/uncomplete/edit/delete are undoable); consider adding `delete` as the inverse of `create` in a future story
- No `isComposing` guard on `handleRowKeyDown` in TaskRow — pre-existing from Story 1.5; safe in practice due to `event.target !== event.currentTarget` guard filtering out events from child elements; consistency improvement for Story 1.7's keyboard refactor

## Deferred from: code review of 1-5-task-edit-and-delete (2026-04-28)

- Paste rich HTML in browsers that ignore `contenteditable="plaintext-only"` may store HTML markup as task text — add an `onPaste` handler that strips to `text/plain` for full cross-browser safety

## Deferred from: code review of 1-4 (2026-04-27)

- Row keydown handler does not honor Space/Enter as activation keys — defer to Story 1.7 (keyboard navigation) which lands the full focus + activation model
- `tabindex={0}` on every `<li>` linearizes tab traversal with N tasks — Story 1.7 replaces this with a roving-tabindex pattern (already commented in code)
- Clip-path-hidden checkbox stays in the tab order, producing a phantom focus stop with no visible indicator on some browsers — defer to Story 1.7 / 1.8 a11y audit
- Static `aria-label="Mark complete"` does not switch to `"Mark incomplete"` when the task is completed; screen readers announce "Mark complete, checked" — defer to Story 1.8 a11y audit (spec Task 4.1 prescribes the literal label for 1.4)
- Inline theme bootstrap throws if `window.matchMedia` is unavailable; pre-existing gap from Story 1.2 — add a fallback when target browser matrix expands

## Deferred from: code review of 1-2 + 1-3 (2026-04-27)

- `shamefully-hoist=true` in `apps/web/.npmrc` defeats pnpm strict isolation — pre-existing infra decision from Story 1.2 sandbox compatibility
- `pnpm.overrides` for `resolve` package lacks inline documentation — workaround for sandbox `.gitmodules` copy issue with `resolve@2.0.0-next.6`
- E2E tests (smoke.spec.ts, j4-first-ever-visit.spec.ts) assume desktop viewport for auto-focus assertions — will fail if mobile viewport added to Playwright config
- No maximum task count or text length limit in `task-store.ts` — address when persistence lands in Story 1.9

## Deferred from: code review of 1-1-repository-scaffold-and-ci-foundation (2026-04-27)

- Vite proxy target hardcoded to localhost:3000 — environment-configurable proxy is future work; acceptable for scaffold
- TaskSchema missing updatedAt/order fields — schema design decisions for later stories
- GET /health has no dependency checks — appropriate scope for scaffold story; address when real dependencies exist
