#!/bin/bash
set -e

# Default values
BUILD_TYPE=${1:-"release"}
PROJECT_PATH=${2:-"/project"}

# Change to project directory
cd "$PROJECT_PATH"

# Function to check build status
check_build_status() {
    if [ $? -eq 0 ]; then
        echo "Build succeeded!"
        return 0
    else
        echo "Build failed!"
        return 1
    fi
}

# Build based on type
case "$BUILD_TYPE" in
    "test")
        echo "Running tests..."
        cargo test --all-features
        check_build_status
        ;;
    "debug")
        echo "Building debug..."
        cargo build
        check_build_status
        ;;
    "release")
        echo "Building release..."
        cargo build --release
        check_build_status
        ;;
    "watch")
        echo "Starting watch mode..."
        cargo watch -x "build --release"
        ;;
    *)
        echo "Unknown build type: $BUILD_TYPE"
        echo "Available options: test, debug, release, watch"
        exit 1
        ;;
esac