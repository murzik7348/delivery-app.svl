/**
 * AiService.js
 * 
 * An isolated module responsible for handling Natural Language Processing (NLP).
 * Currently implemented as a local intent-matcher that reads the global App Context.
 * 
 * FUTURE SCALABILITY: Simply replace the `simulateResponse` logic with a backend API call 
 * (e.g. OpenAI / ChatGPT) passing the `appContext` as system prompt.
 */

export const AiService = {

    /**
     * Main entrypoint for processing user messages.
     * @param {string} text - User's input message
     * @param {object} appContext - Data from Redux (orders, cart, auth status)
     * @returns {Promise<string>} The AI's textual response
     */
    async processQuery(text, appContext) {
        const query = text.toLowerCase();

        // Fake network delay to simulate thinking
        await new Promise(resolve => setTimeout(resolve, 1500));

        // INTENT 1: Tracking Orders
        if (query.includes('статус') || query.includes('замовленн') || query.includes('де моє') || query.includes('кур\'єр')) {
            const activeOrder = appContext.orders.find(o => o.status !== 'completed');
            if (activeOrder) {

                let statusString = "";
                switch (activeOrder.status) {
                    case 'accepted': statusString = "прийняте і очікує підтвердження ресторану"; break;
                    case 'preparing': statusString = "зараз готується на кухні 👨‍🍳"; break;
                    case 'delivering': statusString = "уже в дорозі! Кур'єр прямує до вас 🛵"; break;
                    default: statusString = "оброблюється";
                }

                return `Я перевірив базу даних. Ваше поточне замовлення #${activeOrder.id.slice(-4)} ${statusString}. Сума: ${activeOrder.total} ₴. Ви можете відстежувати його на головному екрані або у вкладці Профіль -> Мої Замовлення.`;
            } else {
                return "Я перевірив ваші замовлення. Наразі у вас немає активних доставок. Бажаєте щось замовити?";
            }
        }

        // INTENT 2: Cart Help
        if (query.includes('кошик') || query.includes('корзин')) {
            if (appContext.cartItems.length > 0) {
                return `У вашому кошику зараз ${appContext.cartItems.length} позицій на суму ${appContext.cartTotal} ₴. Перейдіть до вкладки Кошик, щоб оформити замовлення.`;
            } else {
                return "Ваш кошик абсолютно пустий. Раджу заглянути в розділ 'Бургери' або 'Суші' - сьогодні там діють знижки!";
            }
        }

        // INTENT 3: Recommendations
        if (query.includes('що порадиш') || query.includes('їсти') || query.includes('рекоменд') || query.includes('смачн')) {
            return "Сьогодні чудова погода для піци! Пропоную переглянути 'SVL Dodo Pizza' або затишні суші-сети у 'Tom Sushi'. Можу відкрити для вас якийсь із цих закладів?";
        }

        // INTENT 4: Greeting
        if (query.includes('привіт') || query.includes('добрий день') || query.includes('вітаю')) {
            return `Привіт, ${appContext.user ? appContext.user.name : 'гостю'}! Я можу перевірити статус твого замовлення, порадити найсмачнішу страву поблизу або допомогти з оформленням. Що шукаєш?`;
        }

        // FALLBACK
        return "Я ще вчуся, тому не впевнений, що правильно зрозумів. Чи можу я допомогти вам відстежити замовлення або порадити ресторан?";
    }
};
