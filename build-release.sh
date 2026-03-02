#!/bin/bash
set -e

# Get absolute path to the directory where this script is located
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
RELEASE_ZIP="$PROJECT_ROOT/hdrezka-release.zip"
VERSION_TAG="${1:-}" # Optional version tag passed as argument

echo "==================================="
echo " Building HDRezka Release Bundle "
echo "==================================="

APP_DIR="$PROJECT_ROOT"

echo "▶ Installing dependencies..."
npm install

echo "▶ Building application bundle..."
npm run build

echo "▶ Preparing standalone build..."
# Next.js standalone mode requires these folders to be copied over manually
mkdir -p .next/standalone/.next/static
mkdir -p .next/standalone/public

if [ -d ".next/static" ]; then
    cp -r .next/static/* .next/standalone/.next/static/
fi

if [ -d "public" ]; then
    cp -r public/* .next/standalone/public/
fi

echo "▶ Zipping release bundle..."
# Remove old zip if it exists to avoid adding to it
rm -f "$RELEASE_ZIP"

cd .next/standalone
# Create zip archive
zip -r "$RELEASE_ZIP" . > /dev/null

echo "==================================="
echo "▶ ✅ Done! The release bundle is ready at:"
echo "   $RELEASE_ZIP"

# Automatically upload using GitHub CLI if a tag was provided and gh is installed
if [ -n "$VERSION_TAG" ]; then
    if command -v gh &> /dev/null; then
        echo "==================================="
        echo "▶ Creating GitHub Release $VERSION_TAG and uploading bundle..."
        
        # Navigate back to project root to run gh command where the git repo is
        cd "$PROJECT_ROOT"
        
        # Check if tag already exists locally, and if not create/push it
        if ! git rev-parse "$VERSION_TAG" >/dev/null 2>&1; then
            echo "▶ Tag $VERSION_TAG not found. Creating and pushing tag to remote..."
            git tag "$VERSION_TAG"
            git push origin "$VERSION_TAG" || echo "⚠️ Failed to push tag to remote, but it was created locally."
        else
            echo "▶ Tag $VERSION_TAG already exists, skipping creation."
        fi
        
        # Create the GitHub release for the tag
        gh release create "$VERSION_TAG" "$RELEASE_ZIP" \
            --title "Release $VERSION_TAG" \
            --generate-notes \
            || echo "⚠️ Failed to create release. Does the tag exist or do you need to 'gh auth login'?"
            
        echo "▶ ✅ Successfully uploaded to GitHub Releases!"
    else
        echo "==================================="
        echo "⚠️ Note: You passed a version tag ($VERSION_TAG), but GitHub CLI ('gh') is not installed."
        echo "   Please install 'gh' to automatically upload releases, or upload manually."
    fi
else
    echo "==================================="
    echo "💡 Tip: You can automatically create a GitHub release by passing a version tag:"
    echo "   ./build-release.sh v1.0.0"
    echo "   (Requires GitHub CLI 'gh' to be installed and authenticated)"
fi
echo "==================================="
