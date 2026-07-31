#!/bin/bash

# Зупинити виконання при виникненні помилок
set -e

echo "=== [Xcode Cloud] Post-Clone Script Started ==="

# 1. Визначення кореневої директорії додатка
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPO_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

if [ -d "$REPO_ROOT/delivery-app.svl" ]; then
    APP_DIR="$REPO_ROOT/delivery-app.svl"
elif [ -f "$REPO_ROOT/package.json" ]; then
    APP_DIR="$REPO_ROOT"
else
    APP_DIR="$(pwd)"
fi

echo "Робоча директорія додатка: $APP_DIR"
cd "$APP_DIR"

# 2. Перевірка та встановлення Node.js
if ! command -v node &> /dev/null; then
    echo "Node.js не знайдено. Встановлення через Homebrew..."
    brew install node
fi

echo "Node.js version: $(node -v)"
echo "NPM version: $(npm -v)"

# 3. Встановлення npm-залежностей проєкту
echo "Встановлення npm dependencies..."
npm install --legacy-peer-deps

# 4. Генерація нативного iOS-проєкту через Expo Prebuild
echo "Генерація нативної папки ios через Expo Prebuild..."
npx expo prebuild --platform ios --clean

# 5. Встановлення CocoaPods залежностей
echo "Встановлення CocoaPods..."
if [ -d "ios" ]; then
    cd ios
    pod install
    cd ..
fi

echo "=== [Xcode Cloud] Post-Clone Script Successfully Completed ==="
