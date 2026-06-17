#!/usr/bin/env bash
set -euo pipefail

# One-time git aliases setup for agentic workflow
# Run: bash scripts/git-setup.sh

echo "Setting up git aliases..."

git config alias.co checkout
git config alias.br branch
git config alias.st status
git config alias.lg "log --oneline --graph --decorate -15"
git config alias.last "log -1 --stat"
git config alias.unstage "reset HEAD --"

# Agentic workflow aliases
git config alias.wip '!git add -A && git commit -m "chore: wip" --no-verify'
git config alias.undo '!git reset --soft HEAD~1'
git config alias.amend '!git commit --amend --no-verify'
git config alias.prune-branches '!git branch --merged main | grep -v "main\|master" | xargs -n 1 git branch -d'

# Diff aliases
git config alias.df "diff --stat"
git config alias.dfs "diff --stat --cached"

echo "✅ Git aliases configured:"
echo "   git co    → checkout"
echo "   git br    → branch"
echo "   git st    → status"
echo "   git lg    → pretty log"
echo "   git wip   → quick save (no verify)"
echo "   git undo  → undo last commit (keep changes)"
echo "   git amend → amend last commit"
echo "   git prune-branches → delete merged branches"
