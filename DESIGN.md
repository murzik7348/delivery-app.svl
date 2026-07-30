# K&M Delivery — Дизайн-система та UI/UX Специфікація

> **Загальний опис:**  
> Документ містить повну дизайн-систему мобільного додатка доставки їжі **K&M Delivery**. Описує колірні палітри (Light/Dark themes), типографіку, радіуси закруглення, тіні, глассморфізм, сітки та розміри, анімації, стан компонентів та стандарти адаптивного верстання.

---

## 1. Концепція та UI Aesthetics

1. **Елегантність та Преміальність:**  
   - Глибокі темні панелі (`#121212`, `#1C1C1E`, `#2C2C2E`) та чистий світлий фон (`#F8F9FA`, `#FFFFFF`).
   - Яскравий акцентний колір: **Neon Pink / Purple Accent** (`#e334e3`).
2. **Бездоганна типографіка:**  
   - Використання шрифту **Inter** (Regular 400, Medium 500, SemiBold 600, Bold 700, Black 900).
   - Динамічне підтягування товщини через оновлений `Text.render` без використання подвійного bold на Android.
3. **Форми та скруглення:**  
   - Високі радіуси карт, модальних вікон та штор (`borderRadius: 24` – `28`).
   - Кнопки та інпути (`borderRadius: 14` – `18`).
   - Pill-badges (`borderRadius: 16` або `9999`).
4. **Скло та Глассморфізм (Glassmorphism):**  
   - Використання `BlurView` з напівпрозорими плашками та розмиттям заднього фону для плаваючих кнопок та кошика.
5. **Динамічні мікро-анімації:**  
   - Плавне згортання/розгортання штор кошика через чистий `Animated` + `PanResponder`.
   - Rubber-band ефект з `extrapolate: 'clamp'`.

---

## 2. Колірна палітра (Color System)

### Акцентний колір (Brand Color)
- **Primary / Accent:** `#e334e3` (Яскравий рожево-фіолетовий)
- **Primary Light Alpha:** `rgba(227, 52, 227, 0.12)`
- **Primary Border Alpha:** `rgba(227, 52, 227, 0.25)`

### Світла тема (Light Mode)
```js
Colors.light = {
  text: '#000000',           // Основний текст
  textSecondary: '#666666',  // Другорядний текст
  background: '#F8F9FA',     // Фон додатку (преміальний off-white)
  card: '#FFFFFF',           // Картки та панелі
  input: '#F1F3F5',          // Поля вводу
  icon: '#000000',           // Іконки
  tabIconDefault: '#ADB5BD', // Неактивні вкладки
  tabIconSelected: '#e334e3',// Активна вкладка
  border: '#E9ECEF',         // Бордери
  subtleBorder: 'rgba(0,0,0,0.06)',
  separator: 'rgba(0,0,0,0.04)',
  modalOverlay: 'rgba(0,0,0,0.5)',
  tabBar: '#FFFFFF',
  primary: '#e334e3',
  success: '#2ECC71',        // Успіх / Зелений
  warning: '#F39C12',        // Попередження / Помаранчевий
  danger: '#E74C3C',         // Помилка / Червоний
  info: '#3498DB',           // Інфо / Блакитний
}
```

### Темна тема (Dark Mode)
```js
Colors.dark = {
  text: '#FFFFFF',           // Основний білий текст
  textSecondary: '#9BA1A6',  // М'який сірий
  background: '#121212',     // Глибокий темний фон
  card: '#1C1C1E',           // Темні картки
  input: '#2C2C2E',          // Темні поці вводу
  icon: '#FFFFFF',           // Білі іконки
  tabIconDefault: '#48484A', // Неактивні вкладки
  tabIconSelected: '#e334e3',// Активна вкладка
  border: '#38383A',         // Бордери
  subtleBorder: 'rgba(255,255,255,0.1)',
  separator: 'rgba(255,255,255,0.06)',
  modalOverlay: 'rgba(0,0,0,0.7)',
  tabBar: '#1C1C1E',
  primary: '#e334e3',
  success: '#2ECC71',
  warning: '#F39C12',
  danger: '#E74C3C',
  info: '#3498DB',
}
```

---

## 3. Радиуси та Тіні (Radii, Shadows & Glass)

### Радіуси (Border Radius Tokens)
- `Radii.small`: `8px` — дрібні елементи, теги
- `Radii.medium`: `12px` — кнопки системні, невеликі картки
- `Radii.large`: `18px` — кнопки дій, поці вводу, картки товарів
- `Radii.xlarge`: `24px` – `28px` — модальні вікна, bottom sheets, головні плашки
- `Radii.full`: `9999px` — кругові аватарки, круглі кнопки, бейджі

### Тіні (Shadows & Elevation)
- **Soft Shadow (iOS / Android):**
  - iOS: `shadowColor: '#000'`, `shadowOffset: { width: 0, height: 4 }`, `shadowOpacity: 0.08`, `shadowRadius: 12`
  - Android: `elevation: 4`
- **Medium Shadow:**
  - iOS: `shadowColor: '#000'`, `shadowOffset: { width: 0, height: 8 }`, `shadowOpacity: 0.12`, `shadowRadius: 16`
  - Android: `elevation: 8`
- **Premium Shadow:**
  - iOS: `shadowColor: '#000'`, `shadowOffset: { width: 0, height: 12 }`, `shadowOpacity: 0.15`, `shadowRadius: 24`
  - Android: `elevation: 12`

### Ефекти скла (Glass Config)
- **Glass Light:** `background: 'rgba(255, 255, 255, 0.75)'`, `border: 'rgba(255, 255, 255, 0.5)'`, `blur: 65`
- **Glass Dark:** `background: 'rgba(28, 28, 30, 0.75)'`, `border: 'rgba(255, 255, 255, 0.08)'`, `blur: 75`

---

## 4. Типографіка та Шрифтова сітка

| Стиль / Варіант | Гарнітура (Inter) | Розмір (Size) | Line Height | Використання |
|---|---|---|---|---|
| **Header / Hero** | `Inter_700Bold` / `Black` | 28px – 32px | 36px | Заголовки екранів, назви ресторанів |
| **Title / Subheader** | `Inter_600SemiBold` | 20px – 22px | 28px | Заголовки розділів, категорій |
| **Card Title** | `Inter_600SemiBold` | 16px – 18px | 22px | Назви товарів, страв у сітці |
| **Body Text** | `Inter_400Regular` | 15px – 16px | 24px | Основні описи, тексти додатку |
| **Button Text** | `Inter_500Medium` / `700Bold` | 15px – 17px | 22px | Текст у кнопках дій |
| **Caption / Badge** | `Inter_500Medium` | 11px – 13px | 16px | Ціна доставки, час приготування |

---

## 5. UI Компоненти та Дизайн-патерни

### 1. Картки товарів (Product Cards)
- Власне зображення з округленням `borderRadius: 18`.
- Тінь `Shadows.soft` або `medium`.
- Окрема кнопка додавання в кошик `+` у правому куті із `hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}`.
- Ціна форматується тільки в ₴ з розділювачем тисяч (наприклад, `250 ₴`).

### 2. Нижній штор кошика (Cart Bottom Sheet)
- Реалізується **ВИКЛЮЧНО** на React Native `Animated` + `PanResponder`.
- Заборонено використання важких нативних бібліотек (`@gorhom/bottom-sheet`, `reanimated`).
- Фіксований згорнутий стан: `COLLAPSED_HEIGHT = 120` (завжди показує суму та кнопку "Оформити").
- Drag-зони обмежені лише верхнім хендлом (`locationY < 80`), щоб не блокувати скролл списку страв.

### 3. Форматування цін та сум (Math & Format Doctrine)
- Заборона виводу `NaN`, `null`, `undefined` або рядків `"Безкоштовно"`.
- Вартість доставки в замовленні **ЗАВЖДИ** виводиться у вигляді числової суми в гривнях (наприклад, `50 ₴`).

---

## 6. Взаємодії та Анімації (Interactions)

1. **Pull-to-Refresh:**  
   - Усі списки з `RefreshControl` мають `try / catch / finally` блок.
   - Спінер завантаження **обов'язково** скидається в `false` у блоці `finally`.
2. **Клікабельні зони (Hit Slops):**  
   - Дрібні іконки та кнопки закриття мають `hitSlop` мінімум `12px` з усіх боків.
3. **layoutAnimation:**  
   - На Android увімкнено `UIManager.setLayoutAnimationEnabledExperimental(true)` для плавної появи/зникання елементів.

---

## 7. Відповідність вимогам Apple App Store (App Review Standards)

- **Ніяких мокових даних або однакових заглушок:** Усі зображення товарів та категорій є реальними та унікальними.
- **Відсутність нерозпізнаних статусів:** Усі поля доставки чітко валідуються та нормалізуються.
- **Підтримка Dark / Light тем:** Автоматична адаптація кольорів відповідно до налаштувань ОС iOS/iPadOS.
- **Адаптивність під iPad:** Підтримка масштабування сітки товарів та коректна робота нижніх панелей на планшетах.
