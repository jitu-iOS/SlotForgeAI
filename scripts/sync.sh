#!/usr/bin/env bash
# scripts/sync.sh — one-command commit + push.
# Usage:  npm run sync                     # auto timestamped message
#         npm run sync -- "your message"   # custom message
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

# Pick a message: explicit > timestamped fallback
MSG="${1:-Sync at $(date '+%Y-%m-%d %H:%M:%S %Z')}"

# Refuse to push if a real OpenAI key is staged in any tracked file (defense-in-depth).
if git diff --cached -U0 -- '*.ts' '*.tsx' '*.js' '*.json' '*.md' 2>/dev/null | grep -E "sk-[A-Za-z0-9_-]{20,}" >/dev/null; then
  echo "✗ Aborting: a string that looks like an OpenAI key is in the staged diff."
  echo "  Run:  git diff --cached | grep -nE 'sk-[A-Za-z0-9_-]{20,}'"
  echo "  Then unstage the file before retrying."
  exit 1
fi

git add -A

# Nothing to do?
if git diff --cached --quiet; then
  echo "✓ Working tree clean — nothing to sync."
  exit 0
fi

git commit -m "$MSG"

# Push to current branch's upstream (if any). On first push the user will need
# `git push -u origin <branch>` once — see DEPLOY.md.
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if git rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
  git push
  echo "✓ Synced ${BRANCH} → $(git config branch.${BRANCH}.remote)/${BRANCH}"
else
  echo "✓ Committed locally on ${BRANCH}."
  echo "  No upstream configured yet. Run once:  git push -u origin ${BRANCH}"
  echo "  Subsequent runs of \`npm run sync\` will push automatically."
fi
