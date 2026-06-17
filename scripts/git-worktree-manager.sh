#!/usr/bin/env bash
# git-worktree-manager.sh — Orchestrate per-task worktree lifecycle
# Usage: git-worktree-manager.sh {prep|new|new-dependent|close|pr-merged|sync|list} [args...]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
META="$ROOT/.claude/worktrees.json"
REPO="$(cd "$ROOT" && git rev-parse --show-toplevel)"

if [ ! -f "$META" ]; then echo '{}' > "$META"; fi

cmd="${1:-help}"; shift || true

# ── Utility helpers ──────────────────────────────────────────────────────────

# Detect if a remote named 'origin' exists (for local-only repos)
has_remote() {
  git remote get-url origin &>/dev/null
}

# Resolve base branch to a local ref — use local branch directly (no fetch)
resolve_base() {
  local base="$1"
  # Ensure base branch exists locally
  if ! git show-ref --verify --quiet "refs/heads/$base"; then
    echo "✖ Base branch '$base' does not exist locally" >&2
    exit 1
  fi
  echo "$base"
}

# Install dependencies inside a worktree (pnpm preferred, fallback npm)
install_deps() {
  local wtree="$1"
  if [ -f "$wtree/package.json" ]; then
    echo "  Installing dependencies in worktree..."
    if command -v pnpm &>/dev/null; then
      (cd "$wtree" && pnpm install --frozen-lockfile 2>/dev/null \
        || pnpm install 2>/dev/null) && echo "  ✔ pnpm install done" || echo "  ⚠ pnpm install skipped"
    elif command -v npm &>/dev/null; then
      (cd "$wtree" && npm ci 2>/dev/null || npm install 2>/dev/null) && echo "  ✔ npm install done" || echo "  ⚠ npm install skipped"
    fi
  fi
}

# ── prep <base-branch> ──────────────────────────────────────────────────────
# Ensure base branch is up-to-date locally before spawning worktree.
# No remote fetch — just switch to base and back to refresh local ref.
prep() {
  local base="${1:-main}"
  local current
  current=$(git branch --show-current)

  if ! git show-ref --verify --quiet "refs/heads/$base"; then
    echo "✖ Base branch '$base' does not exist locally"
    exit 1
  fi

  # Refresh — switch to base, then back. This ensures base is fully resolved.
  git switch "$base"
  git switch "$current" 2>/dev/null || true
  echo "✔ Base branch '$base' ready"
}

# ── new <task-id> <base-branch> [slug] ──────────────────────────────────────
# Creates a worktree on a fresh branch, records metadata.
# Example: git-worktree-manager.sh new T8 main update-allocations
new() {
  local task_id="$1" base="${2:-main}" slug="${3:-}"
  [ -z "$task_id" ] && echo "✖ Usage: $0 new <task-id> [base] [slug]" && exit 1

  local branch="feat/$task_id"
  [ -n "$slug" ] && branch="feat/$task_id-$(echo "$slug" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//' | head -c40)"
  local wtree="${ROOT}/../VA-Trace-${task_id}"

  if [ -d "$wtree" ]; then
    echo "✖ Worktree path already exists: $wtree"
    exit 1
  fi

  # Resolve base to a local ref — no remote fetch needed for local-only repos
  local_base=$(resolve_base "$base")

  git worktree add -b "$branch" "$wtree" "$local_base" 2>/dev/null \
    || { echo "✖ Failed to create worktree from $local_base"; exit 1; }

  jq --arg id "$task_id" \
     --arg br "$branch" \
     --arg wt "$wtree" \
     --arg base "$base" \
     '.[$id] = {
        branch: $br,
        worktreePath: $wt,
        baseBranch: $base,
        createdAt: (now | strftime("%Y-%m-%dT%H:%M:%S")),
        status: "active"
      }' "$META" > "$META.tmp" && mv "$META.tmp" "$META"

  echo "✔ Worktree created: $wtree → $branch (base: $base)"
  echo "  cd $wtree"

  install_deps "$wtree"
}

# ── new-dependent <task-id> <parent-task-id> [slug] ───────────────────────
# Creates a worktree whose base is the PARENT TASK's branch (not main).
# For dependent tasks: DeveloperAgent needs DesignerAgent's results first.
# The parent branch must already exist (parent worktree must have been created
# by a prior 'new' call that was not yet closed).
# Example: git-worktree-manager.sh new-dependent T8 T7
new-dependent() {
  local task_id="$1" parent_id="$2" slug="${3:-}"
  [ -z "$task_id" ] && echo "✖ Usage: $0 new-dependent <task-id> <parent-task-id> [slug]" && exit 1
  [ -z "$parent_id" ] && echo "✖ Usage: $0 new-dependent <task-id> <parent-task-id> [slug]" && exit 1

  # Lookup parent metadata to get its branch name
  local parent_meta
  parent_meta=$(jq -r ".[\"$parent_id\"] // empty" "$META")
  if [ -z "$parent_meta" ]; then
    echo "✖ Parent task '$parent_id' not found in worktree metadata"
    echo "  Create it first with: $0 new $parent_id <base> [slug]"
    exit 1
  fi

  local parent_branch
  parent_branch=$(echo "$parent_meta" | jq -r '.branch')

  # Verify parent branch exists locally
  if ! git show-ref --verify --quiet "refs/heads/$parent_branch"; then
    echo "✖ Parent branch '$parent_branch' does not exist locally"
    echo "  Ensure parent worktree has been created and branch exists"
    exit 1
  fi

  # Delegate to 'new' with parent branch as base
  "$0" new "$task_id" "$parent_branch" "$slug"
}

# ── close <task-id> [--discard] [--no-deps] ────────────────────────────────
# Commits uncommitted changes, removes worktree & branch.
# Cleanup sequence: worktree remove → branch -d (safety check by git)
close() {
  local task_id="$1"
  local discard=false no_deps=false
  for arg in "$@"; do
    [ "$arg" = "--discard" ] && discard=true
    [ "$arg" = "--no-deps" ] && no_deps=true
  done

  # ── Check dependent tasks ──────────────────────────────────────────────
  if [ "$no_deps" = false ]; then
    local dependents
    dependents=$(jq -r --arg base_branch '' \
      'to_entries[]
       | select(.value.baseBranch == (
           $ARGS.named.base_branch // (
             (.[$task_id].branch) // ""
           )
         ) // false)
       | .key' \
      --arg task_id "$task_id" \
      "$META" 2>/dev/null || echo "")
    # Actually simpler: scan metadata for any task whose baseBranch points to this task's branch
    local this_branch
    this_branch=$(jq -r ".[\"$task_id\"].branch // empty" "$META")
    local deps
    deps=$(jq -r --arg br "$this_branch" \
      'to_entries[] | select(.value.baseBranch == $br) | .key' \
      "$META" 2>/dev/null || true)

    if [ -n "$deps" ]; then
      echo "✖ Cannot close task $task_id — dependent task(s) still active: $deps"
      echo "  Close dependents first, or use --no-deps to override"
      exit 1
    fi
  fi

  local meta
  meta=$(jq -r ".[\"$task_id\"] // empty" "$META")
  if [ -z "$meta" ]; then
    echo "⚠ Task $task_id not found in $META — attempting fallback cleanup"
    close_fallback "$task_id"
    return
  fi

  local branch;  branch=$(echo "$meta" | jq -r '.branch')
  local wtree;   wtree=$(echo "$meta" | jq -r '.worktreePath')

  # ── Commit uncommitted changes ─────────────────────────────────────────
  if [ -d "$wtree" ]; then
    if [ "$discard" = false ]; then
      cd "$wtree"
      local has_changes=false
      if ! git diff --quiet 2>/dev/null; then has_changes=true; fi
      if ! git diff --cached --quiet 2>/dev/null; then has_changes=true; fi

      if [ "$has_changes" = true ]; then
        git add -A
        git commit -m "chore: finalize $task_id" 2>/dev/null || true
        echo "  Committed pending changes"
      fi
    fi

    # Push only if remote exists
    if has_remote; then
      git push origin "$branch" 2>/dev/null || echo "  ⚠ Push to remote skipped"
    fi

    cd "$ROOT"
    git worktree remove "$wtree" 2>/dev/null || rm -rf "$wtree"
    echo "  Removed worktree at $wtree"
  fi

  # ── Delete local branch (git -d checks merge status = safety) ──────────
  if git show-ref --verify --quiet "refs/heads/$branch"; then
    if git branch -d "$branch" 2>/dev/null; then
      echo "  ✔ Local branch '$branch' deleted"
    else
      echo "  ⚠ Local branch '$branch' not fully merged — use git branch -D to force"
    fi
  fi

  # Delete remote branch if remote exists
  if has_remote; then
    git push origin --delete "$branch" 2>/dev/null || true
  fi

  jq "del(.[\"$task_id\"])" "$META" > "$META.tmp" && mv "$META.tmp" "$META"
  echo "✔ Worktree $task_id closed"
}

# Fallback: close by branch name when metadata is stale
close_fallback() {
  local task_id="$1"
  local wtree="${ROOT}/../VA-Trace-${task_id}"
  if [ -d "$wtree" ]; then
    echo "  Removing orphan worktree at $wtree..."
    git worktree remove "$wtree" 2>/dev/null || rm -rf "$wtree"
  fi

  # Try to find and delete branch by pattern
  local branch="feat/$task_id"
  if git show-ref --verify --quiet "refs/heads/$branch"; then
    git branch -d "$branch" 2>/dev/null && echo "  Branch '$branch' deleted" || echo "  ⚠ Branch '$branch' kept (not merged)"
  fi
}

# ── pr-merged <task-id> ────────────────────────────────────────────────────
# Detect if the PR branch has been merged into its base, then clean up.
# For local-only repos: checks if base branch contains task branch commits.
pr-merged() {
  local task_id="$1"
  local meta
  meta=$(jq -r ".[\"$task_id\"] // empty" "$META")
  [ -z "$meta" ] && echo "✖ Task $task_id not found" && exit 1

  local branch;  branch=$(echo "$meta" | jq -r '.branch')
  local base;    base=$(echo "$meta" | jq -r '.baseBranch')

  # Ensure base branch exists locally
  if ! git show-ref --verify --quiet "refs/heads/$base"; then
    echo "✖ Base branch '$base' does not exist locally"
    exit 1
  fi

  # Ensure task branch exists locally
  if ! git show-ref --verify --quiet "refs/heads/$branch"; then
    echo "✖ Branch '$branch' does not exist locally"
    exit 1
  fi

  # Check if branch is merged: base branch already contains all commits from branch
  # git branch --merged lists branches whose tip is reachable from base
  if git branch --merged "$base" | grep -qx "  $branch" || git branch --merged "$base" | grep -qx "* $branch"; then
    echo "✔ Branch $branch merged into $base. Cleaning up..."
    "$0" close "$task_id" --no-deps
    # close already handles branch deletion, but double-check
    if git show-ref --verify --quiet "refs/heads/$branch"; then
      git branch -d "$branch" 2>/dev/null || true
    fi
    echo "✔ Branch $branch cleaned up"
  else
    echo "⏳ Branch $branch not yet merged into $base"
    echo "  Merge it with:"
    echo "    git switch $base && git merge $branch && git branch -d $branch"
  fi
}

# ── sync ────────────────────────────────────────────────────────────────────
# Sync metadata against actual git worktree list (--porcelain).
# This is the source of truth — not the JSON metadata.
sync() {
  # Build a map of current git worktrees
  local -A actual=()
  while IFS=' ' read -r path branch_head; do
    [ -z "$path" ] && continue
    actual["$path"]="$branch_head"
  done < <(git worktree list --porcelain | awk '
    /^worktree / {path=substr($0,9)}
    /^branch   / {branch=substr($0,8); gsub("^refs/heads/","",branch); print path, branch}
  ')

  # Check each tracked item against actual worktrees
  local tracked_ids
  tracked_ids=$(jq -r 'keys[]' "$META")
  local updated=false

  while IFS= read -r id; do
    [ -z "$id" ] && continue
    local wtree meta_branch meta_status
    wtree=$(jq -r ".[\"$id\"].worktreePath" "$META")
    meta_branch=$(jq -r ".[\"$id\"].branch" "$META")
    meta_status=$(jq -r ".[\"$id\"].status // \"active\"" "$META")

    # Check if this worktree still exists in git's actual list
    local found=false
    for actual_path in "${!actual[@]}"; do
      if [ "$actual_path" = "$wtree" ]; then
        found=true
        break
      fi
    done

    if [ "$found" = false ] && [ -d "$wtree" ]; then
      # Path exists on disk but not registered with git — orphan
      echo "  Orphan: $id ($wtree) — not registered with git"
      jq ".[\"$id\"].status = \"orphan\"" "$META" > "$META.tmp" && mv "$META.tmp" "$META"
      updated=true
    elif [ "$found" = false ]; then
      # Completely gone — remove from metadata
      echo "  Stale: $id — worktree gone, removing"
      jq "del(.[\"$id\"])" "$META" > "$META.tmp" && mv "$META.tmp" "$META"
      updated=true
    elif [ "$meta_status" = "stale" ] || [ "$meta_status" = "orphan" ]; then
      # Restored
      jq ".[\"$id\"].status = \"active\"" "$META" > "$META.tmp" && mv "$META.tmp" "$META"
      updated=true
    fi
  done <<< "$tracked_ids"

  # Register any worktrees git knows but metadata doesn't
  for actual_path in "${!actual[@]}"; do
    # Check if already tracked
    local found_in_meta=false
    tracked_ids=$(jq -r 'keys[]' "$META")
    while IFS= read -r id; do
      [ -z "$id" ] && continue
      local meta_wtree
      meta_wtree=$(jq -r ".[\"$id\"].worktreePath" "$META")
      if [ "$meta_wtree" = "$actual_path" ]; then
        found_in_meta=true
        break
      fi
    done <<< "$tracked_ids"

    if [ "$found_in_meta" = false ]; then
      local actual_branch="${actual[$actual_path]}"
      local auto_id
      auto_id=$(basename "$actual_path" | sed 's/^VA-Trace-//')
      echo "  Unregistered: $actual_path → $actual_branch (auto-id: $auto_id)"
      if [ -n "$auto_id" ] && [ "$auto_id" != "$(basename "$actual_path")" ]; then
        jq --arg id "$auto_id" \
           --arg br "$actual_branch" \
           --arg wt "$actual_path" \
           --arg base "main" \
           '.[$id] = {
              branch: $br,
              worktreePath: $wt,
              baseBranch: $base,
              createdAt: (now | strftime("%Y-%m-%dT%H:%M:%S")),
              status: "active"
            }' "$META" > "$META.tmp" && mv "$META.tmp" "$META"
        updated=true
      fi
    fi
  done

  if [ "$updated" = true ]; then
    echo "✔ Metadata synced with actual worktrees"
  else
    echo "✔ Metadata already in sync"
  fi
}

# ── list ────────────────────────────────────────────────────────────────────
list() {
  if [ "$(jq 'length' "$META")" -eq 0 ]; then
    echo "(no worktrees tracked)"
  else
    jq -r '
      to_entries[]
      | [.key, .value.branch, .value.status, .value.createdAt[0:10], .value.worktreePath]
      | @tsv
    ' "$META" | column -t -s $'\t' -N ID,BRANCH,STATUS,CREATED,PATH
  fi

  # Show git's actual worktree list
  echo ""
  echo "── git worktree list ──"
  if git worktree list 2>/dev/null | head -20; then
    echo ""
  else
    echo "(none)"
  fi
}

case "$cmd" in
  prep)         prep "$@" ;;
  new)          new "$@" ;;
  new-dependent) new-dependent "$@" ;;
  close)        close "$@" ;;
  pr-merged)    pr-merged "$@" ;;
  sync)         sync ;;
  list)         list ;;
  *)
    echo "Usage: $0 {prep|new|new-dependent|close|pr-merged|sync|list} [args...]"
    echo ""
    echo "Commands:"
    echo "  prep [base]                          Ensure base branch is up-to-date locally"
    echo "  new <task-id> [base] [slug]          Create worktree + branch + install deps"
    echo "  new-dependent <t> <parent-t> [slug]  Create worktree branching from parent task"
    echo "  close <task-id> [--discard] [--no-deps]  Remove worktree & delete branch"
    echo "  pr-merged <task-id>                  Clean up if branch is merged into base"
    echo "  sync                                 Sync metadata vs git worktree list"
    echo "  list                                 Show tracked worktrees + git list"
    echo ""
    echo "Features:"
    echo "  - Local-only repos: no remote fetch/push unless origin exists"
    echo "  - Dependent task chains: T8 branches from T7, not main"
    echo "  - Safety: close refuses if dependent tasks still active"
    echo "  - Auto deps install: pnpm install on new worktree"
    echo "  - Branch cleanup: git branch -d (safety check), not -D"
    ;;
esac
