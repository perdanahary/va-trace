#!/usr/bin/env bash
set -euo pipefail

# Branch naming convention:
#   <type>/<task-id>-<slug>
#
# Types: feat, fix, refactor, test, docs, chore, perf, ci
# Task IDs: T1, T2, T1.1, T2.3 (from task tracker)
# Slug: kebab-case description (auto-generated or manual)
#
# Examples:
#   scripts/git-branch.sh feat T1 "user authentication"
#   scripts/git-branch.sh fix T3.2 "token expiry race"
#   scripts/git-branch.sh refactor T5 delivery-progress

VALID_TYPES="feat fix refactor test docs chore perf ci"

usage() {
  echo "Usage: $0 <type> <task-id> [slug]"
  echo ""
  echo "Types: $VALID_TYPES"
  echo "Task ID: T1, T2, T1.1, T2.3, etc."
  echo "Slug: kebab-case description (optional, auto-generated from task-id)"
  echo ""
  echo "Examples:"
  echo "  $0 feat T1 'user auth'"
  echo "  $0 fix T3.2"
  echo "  $0 refactor T5 delivery-progress"
  exit 1
}

[[ $# -lt 2 ]] && usage

TYPE="$1"
TASK_ID="$2"
SLUG="${3:-}"

# Validate type
if ! echo "$VALID_TYPES" | grep -qw "$TYPE"; then
  echo "Error: Invalid type '$TYPE'. Must be one of: $VALID_TYPES"
  exit 1
fi

# Validate task ID format (T<number> or T<number>.<number>)
if ! echo "$TASK_ID" | grep -qE '^T[0-9]+(\.[0-9]+)?$'; then
  echo "Error: Invalid task ID '$TASK_ID'. Must match T<number> or T<number>.<number>"
  exit 1
fi

# Auto-generate slug from task ID if not provided
if [[ -z "$SLUG" ]]; then
  SLUG="task-${TASK_ID//./-}"
fi

# Convert slug to kebab-case
SLUG=$(echo "$SLUG" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//')

BRANCH_NAME="${TYPE}/${TASK_ID}-${SLUG}"

# Check if branch already exists
if git show-ref --verify --quiet "refs/heads/$BRANCH_NAME" 2>/dev/null; then
  echo "Branch '$BRANCH_NAME' already exists. Switching to it."
  git checkout "$BRANCH_NAME"
  exit 0
fi

# Create and switch to new branch from main
git fetch origin main --quiet 2>/dev/null || true
git checkout -b "$BRANCH_NAME" origin/main 2>/dev/null || git checkout -b "$BRANCH_NAME" main

echo "Created and switched to: $BRANCH_NAME"
