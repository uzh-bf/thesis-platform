#!/bin/bash
set -euo pipefail

BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$BRANCH" != "main" ]]; then
  echo "❌ Must be on 'main' branch (currently on '$BRANCH')"
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "❌ Working directory is not clean. Commit or stash changes first."
  exit 1
fi

# A release built on a stale main misses merged changes, and its tag is
# pushed even when the main push is rejected.
git fetch --quiet origin main
read -r BEHIND AHEAD < <(git rev-list --left-right --count origin/main...HEAD)
if [[ "$BEHIND" -gt 0 ]]; then
  echo "❌ Local main is $BEHIND commit(s) behind origin/main. Run 'git pull --ff-only' first."
  exit 1
fi
if [[ "$AHEAD" -gt 0 ]]; then
  echo "❌ Local main has $AHEAD commit(s) that are not on origin/main. Push or drop them first."
  exit 1
fi

echo "📦 Running standard-version..."
pnpm run release

VERSION=$(node -p "require('./package.json').version")
TAG="v$VERSION"

echo "🚀 Pushing commit and tag ($TAG) to origin/main..."
git push --atomic --follow-tags origin main

echo "✅ Release $TAG pushed. Production images will build, deployment tags will update, and the GitHub Release will be created automatically."
