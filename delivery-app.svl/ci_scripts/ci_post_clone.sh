#!/bin/sh
set -e

echo "=== Xcode Cloud Post-Clone Started ==="

# Перехід у корінь репозиторію
if [ -n "$CI_PRIMARY_REPOSITORY_DIR" ]; then
    cd "$CI_PRIMARY_REPOSITORY_DIR"
else
    cd "$(dirname "$0")/.."
fi

# Експорт шляхів для системних утиліт Xcode Cloud
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

# Встановлення Node.js якщо відсутній
if ! command -v node &> /dev/null; then
    echo "Node.js not found. Installing via Homebrew..."
    brew install node
fi

# Встановлення CocoaPods якщо відсутні
if ! command -v pod &> /dev/null; then
    echo "CocoaPods not found. Installing..."
    brew install cocoapods || gem install cocoapods
fi

# Встановлення npm-пакетів
echo "Installing npm dependencies..."
npm install --legacy-peer-deps

# Встановлення Pods
echo "Installing CocoaPods dependencies..."
if [ -d "ios" ]; then
    cd ios
    pod install --repo-update
    cd ..
fi

echo "=== Xcode Cloud Post-Clone Finished ==="
