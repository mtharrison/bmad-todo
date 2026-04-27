#!/usr/bin/env bash
set -euo pipefail

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
  '\bXP\b'
  'Karma'
  '<ErrorBoundary'
)

FORBIDDEN_EMOJI=(
  '🎉'
  '✨'
  '🏆'
)

SEARCH_DIRS="apps/ packages/"
EXIT_CODE=0

for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
  if grep -rn --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' -E "$pattern" $SEARCH_DIRS 2>/dev/null; then
    echo "ANTI-FEATURE VIOLATION: Found '$pattern'"
    EXIT_CODE=1
  fi
done

for emoji in "${FORBIDDEN_EMOJI[@]}"; do
  if grep -rn --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' "$emoji" $SEARCH_DIRS 2>/dev/null; then
    echo "ANTI-FEATURE VIOLATION: Found emoji '$emoji'"
    EXIT_CODE=1
  fi
done

if [ $EXIT_CODE -eq 0 ]; then
  echo "Anti-feature check passed."
fi

exit $EXIT_CODE
