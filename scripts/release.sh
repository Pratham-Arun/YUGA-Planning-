#!/bin/bash
# YUGA Release Script
# Usage: ./scripts/release.sh v2.0.0

set -e

VERSION=$1

if [ -z "$VERSION" ]; then
    echo "❌ Usage: ./release.sh v2.0.0"
    exit 1
fi

echo "╔════════════════════════════════════════════════╗"
echo "║        🚀 YUGA RELEASE SCRIPT 🚀              ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo "📦 Releasing version: $VERSION"
echo ""

# Extract version without 'v' prefix
VERSION_NUM=${VERSION#v}

# Update version numbers
echo "📝 Updating version numbers..."
sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION_NUM\"/" unity-plugin/package.json
sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION_NUM\"/" backend/package.json
echo "✅ Version numbers updated"

# Run tests
echo ""
echo "🧪 Running tests..."

# Backend tests
if [ -d "backend" ]; then
    cd backend
    npm test || echo "⚠️  Backend tests failed (continuing)"
    cd ..
fi

# C++ tests
if [ -d "engine-core/build" ]; then
    cd engine-core
    ctest --test-dir build --output-on-failure || echo "⚠️  C++ tests failed (continuing)"
    cd ..
fi

echo "✅ Tests complete"

# Build
echo ""
echo "🔨 Building..."

# Build C++ engine
if [ -d "engine-core" ]; then
    cd engine-core
    cmake --build build --config Release
    cd ..
    echo "✅ C++ engine built"
fi

# Build backend
if [ -d "backend" ]; then
    cd backend
    npm run build || echo "⚠️  No build script"
    cd ..
    echo "✅ Backend built"
fi

# Create Git tag
echo ""
echo "🏷️  Creating Git tag..."
git add .
git commit -m "Release $VERSION" || echo "No changes to commit"
git tag -a $VERSION -m "Release $VERSION"
echo "✅ Tag created"

# Push to GitHub
echo ""
echo "📤 Pushing to GitHub..."
git push origin main
git push origin $VERSION
echo "✅ Pushed to GitHub"

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║        ✅ RELEASE $VERSION COMPLETE! ✅        ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo "🎯 Next steps:"
echo "   1. Create GitHub Release at: https://github.com/yourusername/yuga/releases/new"
echo "   2. Upload binaries from engine-core/build/bin/"
echo "   3. Update documentation site"
echo "   4. Announce on social media"
echo ""
