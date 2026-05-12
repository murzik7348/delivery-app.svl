.
├── app/                            # Основні екрани (Expo Router)
│   ├── (auth)/                     # Авторизація та реєстрація
│   │   ├── _layout.js              # Налаштування заголовків для входу/реєстрації
│   │   ├── login.js                # Екран входу в акаунт
│   │   └── register.js             # Екран реєстрації нового користувача
│   ├── restaurant/                 # Робота з конкретним закладом
│   │   ├── [id].js                 # Екран ресторану (меню, інфо)
│   │   └── index.js                # Список усіх ресторанів (якщо окремо)
│   ├── _layout.js                  # Головний файл: Redux, Push, LiveActivity, BottomBar
│   ├── cart.js                     # Екран оформлення замовлення (кошик)
│   ├── catalog.js                  # Повний каталог товарів (пошук, категорії)
│   ├── courier-earnings.js         # Статистика заробітку кур'єра та історія
│   ├── courier.js                  # Панель активної роботи кур'єра
│   ├── favorites.js                # Список збережених страв/ресторанів
│   ├── home.js                     # Головний екран: акції, рекомендації
│   ├── index.js                    # Початкова точка входу в додаток
│   ├── language.js                 # Вибір мови інтерфейсу
│   ├── location-picker.js          # Мапа для вибору адреси доставки
│   ├── order-details.js            # Деталі та статус активного замовлення (клієнт)
│   ├── orders.js                   # Історія замовлень користувача
│   ├── payment.js                  # Екран вибору методу оплати (LiqPay/Картка)
│   ├── profile-edit.js             # Редагування імені, телефону, адреси
│   ├── profile.js                  # Особистий кабінет користувача
│   ├── promocodes.js               # Керування промокодами
│   └── search.js                   # Глобальний пошук по всьому додатку
├── assets/                         # Зображення, іконки, шрифти
├── components/                     # UI Компоненти (Re-usable)
│   ├── ui/                         # Базові системні компоненти
│   ├── AddressBottomSheet.js       # Вибір адреси у випадаючому вікні
│   ├── AiAssistantFAB.js           # Плаваюча кнопка AI помічника
│   ├── AiChatSheet.js              # Чат з AI (консультації по меню)
│   ├── BackButton.js               # Кнопка "Назад" з тактильним відгуком
│   ├── BottomBar.js                # Нижня панель (меню навігації)
│   ├── CardFormSheet.js            # Додавання банківської картки
│   ├── CartBottomSheet.js          # Швидкий кошик на головному екрані
│   ├── CourierOrderSheet.js        # Деталі замовлення для кур'єра
│   ├── CourierOrdersPanel.js       # Список доступних доставок для кур'єра
│   ├── DynamicIsland.js            # Візуалізація Dynamic Island в додатку
│   ├── ProductSheet.js             # Картка товару (опис, добавки)
│   ├── PromoSheet.js               # Деталі акційної пропозиції
│   ├── SwipeButton.js              # Кнопка-слайдер для підтвердження дії
│   └── ...                         # Інші технічні компоненти (parallax, wave)
├── constants/                      # Глобальні налаштування
│   ├── Colors.js                   # Кольорова палітра (Light/Dark)
│   ├── theme.ts                    # Налаштування тем та шрифтів
│   └── translations.js             # Локалізація (UK/EN тексти)
├── hooks/                          # Кастомні React хуки
│   ├── useCheckoutFlow.js          # Логіка оформлення замовлення
│   ├── useLiveActivity.js          # Керування Live Activity з компонентів
│   ├── useLiveActivitySync.js      # Синхронізація стейту з віджетами
│   ├── usePushNotifications.js     # Налаштування Push-повідомлень
│   └── ...                         # Тематичні хуки та кольори
├── services/                       # Бізнес-логіка (API Services)
│   ├── AiService.js                # Логіка обробки запитів до AI
│   ├── ApiService.js               # Загальний сервіс для мережевих запитів
│   ├── CatalogService.js           # Отримання меню та ресторанів
│   ├── LiveActivityService.js      # Керування віджетами iOS (Status Update)
│   ├── OrderService.js             # Створення та відстеження замовлень
│   ├── auth.service.js             # Логіка входу та збереження токенів
│   └── product.service.js          # Робота з товарами та фільтрами
├── src/                            # Джерело даних API
│   └── api/                        # Пряма взаємодія з бекендом
│       ├── address.js              # Ендпоінти адрес
│       ├── auth.js                 # Ендпоінти логіну/реєстрації
│       ├── client.js               # Налаштування Axios (Headers, Interceptors)
│       ├── courier.js              # Ендпоінти для роботи кур'єра
│       ├── delivery.js             # Ендпоінти статусу доставки
│       ├── index.js                # Експорт усіх API методів
│       ├── payment.js              # Інтеграція з платіжними системами
│       ├── product.js              # Запити на отримання товарів
│       └── restaurant.js           # Запити на дані ресторанів
├── store/                          # Redux State Management
│   ├── aiSlice.js                  # Стан чату з AI
│   ├── authSlice.js                # Стан користувача (Профіль, Токен)
│   ├── cartSlice.js                # Стан кошика (Товари, Сума)
│   ├── catalogSlice.js             # Стан меню та категорій
│   ├── courierSlice.js             # Стан роботи кур'єра (Активні замовлення)
│   ├── favoritesSlice.js           # Стан обраних товарів
│   ├── index.js                    # Конфігурація Store та Persist
│   ├── locationSlice.js            # Стан обраної локації доставки
│   └── ordersSlice.js              # Стан усіх замовлень (Історія)
├── utils/                          # Допоміжні функції
│   ├── dateUtils.js                # Форматування часу та дат
│   ├── formatOrderNumber.js        # Форматування ID замовлення (#0001)
│   └── navigation.js               # Хелпер для безпечної навігації
├── widgets/                        # Native Swift Code (iOS Widgets)
│   ├── LiveActivityWidget.swift    # Основний код віджета для iPhone
│   ├── LiveActivityView.swift      # Дизайн віджета (SwiftUI)
│   └── ...                         # Swift хелпери для зображень та таймерів
├── app.json                        # Налаштування Expo (Icons, Splashes, Bundles)
├── babel.config.js                 # Налаштування компіляції JS
├── package.json                    # Залежності та скрипти запуску
└── tsconfig.json                   # Налаштування TypeScript
