#!/usr/bin/env bash
# agent-git-identity.sh — make every agent commit come from the human driving it.
#
# Cloud Agents default to author "Cursor Agent <cursoragent@cursor.com>" and a
# managed commit-msg hook that appends Co-authored-by. Neither is configurable
# in the Cursor product today. This script is the repo's permanent override:
#
#   1. Resolves whose identity to commit under, and sets it on this repo.
#   2. Replaces Cursor's commit-msg.cursor.co-author injector with a no-op.
#
# It does NOT hardcode a person. `git blame` should answer "who decided this",
# and this repo has more than one contributor — pinning every agent commit to
# one name would attribute everyone's work to whoever the script named.
#
# Resolution order, first hit wins:
#
#   --name / --email arguments
#   GIT_AUTHOR_NAME / GIT_AUTHOR_EMAIL
#   the repo-local git config (if not the Cursor default)
#   the global git config (if not the Cursor default)
#
# If none of those identify a human, it exits non-zero rather than guessing.
#
# Idempotent. Safe to run from environment install, before every git commit
# (via .cursor/hooks.json), or by hand.
#
# Usage: ./scripts/agent-git-identity.sh [--name "Full Name"] [--email addr]

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

NAME=""
EMAIL=""
while [ $# -gt 0 ]; do
  case "$1" in
    --name) NAME="${2:-}"; shift 2 ;;
    --email) EMAIL="${2:-}"; shift 2 ;;
    *) echo "agent-git-identity: unknown argument '$1'" >&2; exit 2 ;;
  esac
done

# The identity we must never commit under, in any casing.
is_agent_identity() {
  case "$(printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]')" in
    ""|*cursor*|*"noreply@anthropic.com"*|*"claude"*) return 0 ;;
    *) return 1 ;;
  esac
}

take() {
  local candidate_name="$1" candidate_email="$2"
  [ -n "$NAME" ] && return 0
  [ -n "$candidate_name" ] && [ -n "$candidate_email" ] || return 0
  is_agent_identity "$candidate_name" && return 0
  is_agent_identity "$candidate_email" && return 0
  NAME="$candidate_name"
  EMAIL="$candidate_email"
}

take "${GIT_AUTHOR_NAME:-}" "${GIT_AUTHOR_EMAIL:-}"
take "$(git config --local user.name || true)" "$(git config --local user.email || true)"
take "$(git config --global user.name || true)" "$(git config --global user.email || true)"

if [ -z "$NAME" ] || [ -z "$EMAIL" ]; then
  cat >&2 <<'ERR'
agent-git-identity: cannot tell who is committing.

git blame must attribute a change to the person who asked for it, so this
script will not fall back to a default human. Set one of:

  ./scripts/agent-git-identity.sh --name "Your Name" --email you@example.com
  GIT_AUTHOR_NAME=... GIT_AUTHOR_EMAIL=... ./scripts/agent-git-identity.sh
  git config user.name / user.email

Contributor identities are listed in AGENTS.md.
ERR
  exit 1
fi

# Repo-local only. A shared machine or a second checkout should not inherit
# whoever last ran this, and the global config is the user's to set.
git config user.name "$NAME"
git config user.email "$EMAIL"

# Cursor points core.hooksPath at a per-workspace agent-hooks dir and runs
# commit-msg.cursor.co-author from there. Overwrite every copy we can see with
# a no-op so the dispatcher still finds an executable file, but nothing is
# appended. chmod -x alone is not enough — a fresh agent boot can recreate it.
noop_coauthor() {
  local f="$1"
  cat >"$f" <<'EOF'
#!/bin/bash
# NextXI policy: do not append Co-authored-by on agent commits.
# Replaces Cursor's managed commit-msg.cursor.co-author injector.
exit 0
EOF
  chmod +x "$f"
}

shopt -s nullglob
for f in \
  /home/ubuntu/.cursor/agent-hooks/*/commit-msg.cursor.co-author \
  /home/cursor/.cursor/agent-hooks/*/commit-msg.cursor.co-author \
  "$HOME"/.cursor/agent-hooks/*/commit-msg.cursor.co-author
do
  noop_coauthor "$f"
done
shopt -u nullglob

# Belt: a repo-native commit-msg that strips any Co-authored-by that still
# sneaks in. Cursor's dispatcher runs ORIGINAL_HOOKS_PATH first, then its own
# hooks — so this alone cannot beat a live co-author injector, but together
# with the no-op above it covers both orders and plain `git commit` without
# the agent hooksPath.
HOOKS_DIR="$ROOT/.git/hooks"
mkdir -p "$HOOKS_DIR"
cat >"$HOOKS_DIR/commit-msg" <<'EOF'
#!/bin/bash
# Strip Co-authored-by / Made-with-Cursor trailers from the commit message.
# Interior blank lines are preserved — the previous perl -00 pass collapsed
# the subject/body separator, running every commit message into one
# paragraph. Only leading and trailing blank runs are trimmed.
msg="$1"
tmp="$(mktemp)"
grep -v -E '^(Co-authored-by:|Made-with: Cursor)' "$msg" >"$tmp" || true
awk 'NF { if (started) for (i = 0; i < b; i++) print ""; b = 0; print; started = 1; next }
     { b++ }' "$tmp" >"$msg" || cp "$tmp" "$msg"
rm -f "$tmp"
exit 0
EOF
chmod +x "$HOOKS_DIR/commit-msg"

echo "git identity -> $NAME <$EMAIL> (repo-local)"
echo "co-author injector neutralized"
