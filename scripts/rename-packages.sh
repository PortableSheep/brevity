#!/bin/bash

# Usage: ./scripts/rename-packages.sh my-username
# This renames @brevity/* to @my-username/brevity-*

if [ -z "$1" ]; then
  echo "Usage: ./scripts/rename-packages.sh <npm-username>"
  echo "Example: ./scripts/rename-packages.sh john-doe"
  exit 1
fi

USERNAME=$1
echo "🔄 Renaming packages to @${USERNAME}/brevity-*..."

# Rename in package.json files
find packages -name "package.json" -exec sed -i '' "s/\"@brevity\//\"@${USERNAME}\/brevity-/g" {} \;
sed -i '' "s/@brevity\//@${USERNAME}\/brevity-/g" examples/**/*.ts
sed -i '' "s/@brevity\//@${USERNAME}\/brevity-/g" test/**/*.ts
sed -i '' "s/@brevity\//@${USERNAME}\/brevity-/g" starter/package.json

echo "✅ Package names updated to @${USERNAME}/brevity-*"
echo "📝 Next steps:"
echo "  1. npm run build"
echo "  2. npm test"
echo "  3. npm run publish:dry-run"
echo "  4. npm run publish:all"
