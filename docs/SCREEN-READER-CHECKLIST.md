# Screen-Reader Pre-Ship Checklist

Manual verification checklist for assistive technology compatibility. Run before each release.

## VoiceOver (macOS Safari)

### Journey 1: Capture & Review

- [ ] CaptureLine announced as "Add a task" when focused
- [ ] Typing text is echoed correctly
- [ ] After pressing Enter, new task announced
- [ ] Task list reads items in newest-first order
- [ ] Each task row announces text and completion state

### Journey 2: Delete & Undo

- [ ] Pressing `d` on a focused task announces deletion
- [ ] Task removed from virtual cursor order
- [ ] Pressing `u` announces undo/restore
- [ ] Restored task reappears in correct list position

### Journey 3: Return After Absence

- [ ] On reopening, tasks load from cache immediately
- [ ] Task list is announced without delay
- [ ] No stale or duplicate announcements

### Journey 4: First-Ever Visit

- [ ] Empty state announces only the capture input
- [ ] No decorative or hidden content confuses the reader
- [ ] Focus lands on CaptureLine automatically

### Journey 5: Inline Edit

- [ ] Pressing `e` on a task announces edit mode
- [ ] Edit input is focused and previous text readable
- [ ] Pressing Enter commits and announces updated text
- [ ] Pressing Escape cancels and announces revert

### Journey 6: Offline Reconcile

- [ ] Going offline triggers annunciator with `role="status"`
- [ ] Annunciator text announced via `aria-live="polite"`
- [ ] Reconnecting dismisses annunciator; recovery announced
- [ ] No data-loss announcements or confusing state changes

---

## VoiceOver (iOS Safari)

### Journey 1: Capture & Review

- [ ] CaptureLine announced as "Add a task" when focused
- [ ] On-screen keyboard input is echoed
- [ ] After tapping Enter, new task announced
- [ ] Swiping through task list reads items in order
- [ ] Each task row announces text and completion state

### Journey 2: Delete & Undo

- [ ] Delete action announced on task removal
- [ ] Task removed from swipe order
- [ ] Undo action announces restore
- [ ] Restored task reappears in correct position

### Journey 3: Return After Absence

- [ ] On reopening, tasks load from cache immediately
- [ ] Task list is announced without delay

### Journey 4: First-Ever Visit

- [ ] Empty state announces only the capture input
- [ ] No decorative content confuses the reader

### Journey 5: Inline Edit

- [ ] Edit mode announced when activated
- [ ] Edit input focused with previous text
- [ ] Commit announces updated text
- [ ] Cancel announces revert

### Journey 6: Offline Reconcile

- [ ] Annunciator announced via `aria-live="polite"`
- [ ] Recovery announced on reconnection

---

## NVDA (Windows Firefox)

### Journey 1: Capture & Review

- [ ] CaptureLine announced as "Add a task" edit field
- [ ] Typing text is echoed correctly
- [ ] After pressing Enter, new task announced
- [ ] Browsing task list reads items in newest-first order
- [ ] Each task row announces text and completion state

### Journey 2: Delete & Undo

- [ ] Pressing `d` on a focused task announces deletion
- [ ] Task removed from browse order
- [ ] Pressing `u` announces undo/restore
- [ ] Restored task reappears in correct position

### Journey 3: Return After Absence

- [ ] On reopening, tasks load from cache immediately
- [ ] Task list is announced without delay

### Journey 4: First-Ever Visit

- [ ] Empty state announces only the capture input
- [ ] No decorative or hidden content confuses the reader
- [ ] Focus lands on CaptureLine automatically

### Journey 5: Inline Edit

- [ ] Edit mode announced when activated
- [ ] Edit input focused and previous text readable
- [ ] Enter commits and announces updated text
- [ ] Escape cancels and announces revert

### Journey 6: Offline Reconcile

- [ ] Annunciator announced via live region
- [ ] Recovery announced on reconnection
- [ ] No data-loss announcements or confusing state

---

## NVDA (Windows Edge)

### Journey 1: Capture & Review

- [ ] CaptureLine announced as "Add a task" edit field
- [ ] Typing text is echoed correctly
- [ ] After pressing Enter, new task announced
- [ ] Browsing task list reads items in newest-first order
- [ ] Each task row announces text and completion state

### Journey 2: Delete & Undo

- [ ] Pressing `d` on a focused task announces deletion
- [ ] Task removed from browse order
- [ ] Pressing `u` announces undo/restore
- [ ] Restored task reappears in correct position

### Journey 3: Return After Absence

- [ ] On reopening, tasks load from cache immediately
- [ ] Task list is announced without delay

### Journey 4: First-Ever Visit

- [ ] Empty state announces only the capture input
- [ ] No decorative or hidden content confuses the reader

### Journey 5: Inline Edit

- [ ] Edit mode announced when activated
- [ ] Edit input focused and previous text readable
- [ ] Enter commits and announces updated text
- [ ] Escape cancels and announces revert

### Journey 6: Offline Reconcile

- [ ] Annunciator announced via live region
- [ ] Recovery announced on reconnection
