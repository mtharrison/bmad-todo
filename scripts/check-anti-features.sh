#!/usr/bin/env bash
set -euo pipefail

# Run from repo root regardless of invocation location
cd "$(git rev-parse --show-toplevel)"

FORBIDDEN_PATTERNS=(
  'toast('
  'Snackbar'
  'Toaster'
  'Skeleton'
  'Spinner'
  'confirm('
  'alert('
  '<Modal'
  '<Dialog'
  'Streak'
  'Achievement'
  'Karma'
  '<ErrorBoundary'
  'tooltip'
  'onboarding'
  'walkthrough'
  'Press ? for help'
  'Press ? for shortcuts'
)

# Patterns requiring portable word-boundary matching (handled with -w)
FORBIDDEN_WORD_PATTERNS=(
  'XP'
)

FORBIDDEN_EMOJI=(
  '🎉'
  '✨'
  '🏆'
)

SEARCH_DIRS=("apps/" "packages/")
EXIT_CODE=0

for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
  if grep -rn --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' -E "$pattern" "${SEARCH_DIRS[@]}" 2>/dev/null; then
    echo "ANTI-FEATURE VIOLATION: Found '$pattern'"
    EXIT_CODE=1
  fi
done

for pattern in "${FORBIDDEN_WORD_PATTERNS[@]}"; do
  if grep -rn --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' -w "$pattern" "${SEARCH_DIRS[@]}" 2>/dev/null; then
    echo "ANTI-FEATURE VIOLATION: Found '$pattern'"
    EXIT_CODE=1
  fi
done

for emoji in "${FORBIDDEN_EMOJI[@]}"; do
  if grep -rn --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' "$emoji" "${SEARCH_DIRS[@]}" 2>/dev/null; then
    echo "ANTI-FEATURE VIOLATION: Found emoji '$emoji'"
    EXIT_CODE=1
  fi
done

if [ $EXIT_CODE -eq 0 ]; then
  echo "Anti-feature check passed."
fi

exit $EXIT_CODE
