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

echo "📦 Running standard-version..."
pnpm run release

VERSION=$(node -p "require('./package.json').version")
TAG="v$VERSION"

echo "🚀 Pushing commit and tag ($TAG) to origin/main..."
git push --follow-tags origin main

echo "✅ Release $TAG pushed. build-prd and build-prd-ibw will start and create the GitHub Release automatically."
