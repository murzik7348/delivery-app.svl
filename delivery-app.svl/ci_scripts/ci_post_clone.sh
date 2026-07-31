#!/bin/bash

# Зупинити виконання при виникненні помилок
set -e

echo "=== [Xcode Cloud] Post-Clone Script Started ==="

# 1. Визначення кореневої директорії додатка
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
if [ -f "$SCRIPT_DIR/../package.json" ]; then
    APP_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"
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

# 4. Якщо папки ios немає — створюємо її, інакше оновлюємо Pods
if [ ! -d "ios" ]; then
    echo "Генерація нативної папки ios через Expo Prebuild..."
    npx expo prebuild --platform ios
fi

# 5. Встановлення CocoaPods для KM.xcworkspace
echo "Встановлення CocoaPods..."
if [ -d "ios" ]; then
    cd ios
    pod install
    cd ..
fi

echo "=== [Xcode Cloud] Post-Clone Script Successfully Completed ==="
