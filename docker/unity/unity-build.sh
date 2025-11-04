#!/bin/bash
set -e

# Default values
BUILD_TARGET=${BUILD_TARGET:-"StandaloneLinux64"}
BUILD_PATH=${BUILD_PATH:-"/project/Build"}
LOG_FILE=${LOG_FILE:-"/project/Build/build.log"}
PROJECT_PATH=${1:-"/project"}

# Create build directory
mkdir -p "$BUILD_PATH"

# Unity command construction
UNITY_COMMAND="unity-editor \
    -batchmode \
    -nographics \
    -logFile $LOG_FILE \
    -projectPath $PROJECT_PATH \
    -executeMethod BuildScript.PerformBuild \
    -buildTarget $BUILD_TARGET \
    -buildPath $BUILD_PATH"

# Additional arguments for different modes
case "$2" in
    "test")
        UNITY_COMMAND="$UNITY_COMMAND -runTests -testPlatform PlayMode"
        ;;
    "build")
        UNITY_COMMAND="$UNITY_COMMAND -quit"
        ;;
    *)
        UNITY_COMMAND="$UNITY_COMMAND -quit"
        ;;
esac

# Execute Unity command
echo "Starting Unity build process..."
echo "Command: $UNITY_COMMAND"

eval $UNITY_COMMAND

# Check build result
if [ -f "$LOG_FILE" ]; then
    if grep -q "Build completed with a result of 'Succeeded'" "$LOG_FILE"; then
        echo "Build succeeded!"
        exit 0
    else
        echo "Build failed. Check $LOG_FILE for details."
        cat "$LOG_FILE"
        exit 1
    fi
else
    echo "Build log file not found!"
    exit 1
fi