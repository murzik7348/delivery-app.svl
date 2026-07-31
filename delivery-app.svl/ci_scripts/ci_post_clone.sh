#!/bin/bash
set -e

echo "=== [Xcode Cloud] Post-Clone Script Started ==="

# 1. Export PATH for Node.js, Homebrew, Ruby & CocoaPods in Xcode Cloud VM
export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH
export PATH=$HOME/.gem/ruby/$(ruby -e 'puts RUBY_VERSION' 2>/dev/null || echo "3.0.0")/bin:$PATH

# 2. Locate App Root Directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
if [ -f "$SCRIPT_DIR/../package.json" ]; then
    APP_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"
elif [ -n "$CI_PRIMARY_REPOSITORY_DIR" ]; then
    APP_DIR="$CI_PRIMARY_REPOSITORY_DIR"
else
    APP_DIR="$(pwd)"
fi

echo "App directory: $APP_DIR"
cd "$APP_DIR"

# 3. Check and install Node.js / npm if missing
if ! command -v node &> /dev/null; then
    echo "Node.js not found in PATH. Installing via Homebrew..."
    brew install node
fi

echo "Node.js version: $(node -v)"
echo "NPM version: $(npm -v)"

# 4. Check and install CocoaPods (pod) if missing
if ! command -v pod &> /dev/null; then
    echo "CocoaPods (pod) not found in PATH. Installing via Homebrew..."
    brew install cocoapods || gem install cocoapods --user-install || true
fi

echo "CocoaPods version: $(pod --version || echo 'checking...')"

# 5. Install Node dependencies
echo "Installing npm dependencies..."
npm install --legacy-peer-deps

# 6. Ensure ios directory exists
if [ ! -d "ios" ]; then
    echo "Generating ios directory via Expo Prebuild..."
    npx expo prebuild --platform ios
fi

# 7. Run pod install in ios/ directory to generate Pods and xcconfig files
echo "Running pod install in ios/ directory..."
cd ios
pod install
cd ..

echo "=== [Xcode Cloud] Post-Clone Script Successfully Completed ==="
