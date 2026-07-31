#!/bin/sh

# Зупинити виконання при будь-якій помилці
set -e

echo "=== Xcode Cloud Post-Clone Script Started ==="

# Перехід у корінь проєкту
if [ -n "$CI_PRIMARY_REPOSITORY_DIR" ]; then
    cd "$CI_PRIMARY_REPOSITORY_DIR"
else
    cd "$(dirname "$0")/.."
fi

# Додаємо шляхи для Homebrew / Node / Pods
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

# Перевірка та встановлення CocoaPods якщо відсутні
if ! command -v pod &> /dev/null; then
    echo "CocoaPods not found, installing..."
    brew install cocoapods || gem install cocoapods
fi

# 1. Встановлення npm-залежностей проєкту
echo "Installing Node modules..."
npm install --legacy-peer-deps

# 2. Встановлення Pods
echo "Installing iOS Pods..."
if [ -d "ios" ]; then
    cd ios
    pod install
    cd ..
fi

echo "=== Post-Clone Completed Successfully ==="
