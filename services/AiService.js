/**
 * AiService.js
 * 
 * An isolated module responsible for handling Natural Language Processing (NLP).
 * 
 * FUTURE SCALABILITY: Simply replace the `simulateResponse` logic with a backend API call 
 * (e.g. OpenAI / ChatGPT) passing the `appContext` as system prompt.
 * 
 * API Contract:
 * POST /api/ai/chat
 * Request:  { message: string, appContext: object }
 * Response: { intent: string, reply: string, actions: array }
 */

import { GoogleGenAI } from '@google/genai';

export const USE_REAL_AI = true;
const GEMINI_API_KEY = "AIzaSyDD80Om-U4VhWNODWjP0F0CubFpPtTNeQk";

// Initialize the official SDK
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const MockAiBackend = {
    async process(request) {
        const { message, appContext } = request;
        const query = message.toLowerCase();

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

                return {
                    intent: 'TRACK_ORDER',
                    reply: `Я перевірив базу даних. Ваше поточне замовлення #${activeOrder.id.slice(-4)} ${statusString}. Сума: ${activeOrder.total} ₴. Ви можете відстежувати його на головному екрані або у вкладці Профіль -> Мої Замовлення.`,
                    actions: []
                };
            } else {
                return {
                    intent: 'TRACK_ORDER',
                    reply: "Я перевірив ваші замовлення. Наразі у вас немає активних доставок. Бажаєте щось замовити?",
                    actions: []
                };
            }
        }

        // INTENT 2: Cart Help
        if (query.includes('кошик') || query.includes('корзин')) {
            if (appContext.cartItems.length > 0) {
                return {
                    intent: 'CART_STATUS',
                    reply: `У вашому кошику зараз ${appContext.cartItems.length} позицій на суму ${appContext.cartTotal} ₴. Перейдіть до вкладки Кошик, щоб оформити замовлення.`,
                    actions: ['NAVIGATE_CART']
                };
            } else {
                return {
                    intent: 'CART_STATUS',
                    reply: "Ваш кошик абсолютно пустий. Раджу заглянути в розділ 'Бургери' або 'Суші' - сьогодні там діють знижки!",
                    actions: []
                };
            }
        }

        // INTENT 3: Recommendations
        if (query.includes('що порадиш') || query.includes('їсти') || query.includes('рекоменд') || query.includes('смачн')) {
            return {
                intent: 'RECOMMENDATION',
                reply: "Сьогодні чудова погода для піци! Пропоную переглянути 'SVL Dodo Pizza' або затишні суші-сети у 'Tom Sushi'. Можу відкрити для вас якийсь із цих закладів?",
                actions: ['SHOW_RECOMMENDATIONS']
            };
        }

        // INTENT 4: Greeting
        if (query.includes('привіт') || query.includes('добрий день') || query.includes('вітаю')) {
            return {
                intent: 'GREETING',
                reply: `Привіт, ${appContext.user ? appContext.user.name : 'гостю'}! Я можу перевірити статус твого замовлення, порадити найсмачнішу страву поблизу або допомогти з оформленням. Що шукаєш?`,
                actions: []
            };
        }

        // FALLBACK
        return {
            intent: 'UNKNOWN',
            reply: "Я ще вчуся, тому не впевнений, що правильно зрозумів. Чи можу я допомогти вам відстежити замовлення або порадити ресторан?",
            actions: []
        };
    }
};

export const AiService = {

    /**
     * Main entrypoint for processing user messages.
     * @param {string} text - User's input message
     * @param {object} appContext - Data from Redux (orders, cart, auth status)
     * @returns {Promise<{intent: string, reply: string, actions: array}>} The structured AI response
     */
    async processQuery(text, appContext) {
        const requestPayload = { message: text, appContext };

        if (!USE_REAL_AI) {
            return await MockAiBackend.process(requestPayload);
        }

        try {
            // Construct the prompt for Gemini
            const prompt = `
            You are an AI assistant for a delivery app in Ukraine. 
            Respond ONLY with a valid JSON object matching this schema:
            {
              "intent": "string (e.g., TRACK_ORDER, CART_STATUS, RECOMMENDATION, GREETING)",
              "reply": "string (your conversational response in Ukrainian)",
              "actions": ["string"] (e.g., NAVIGATE_CART, SHOW_RECOMMENDATIONS)
            }
            
            Current App Context:
            - User: ${appContext.user ? appContext.user.name : "Guest"}
            - Cart total: ${appContext.cartTotal} UAH
            - Items in cart: ${appContext.cartItems.length}
            - Active orders: ${appContext.orders.filter(o => o.status !== 'completed').length}
            
            User message: "${text}"
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [{ text: prompt }], // The SDK expects an array of parts for contents
                generationConfig: {
                    responseMimeType: "application/json"
                }
            });

            let textResponse = response.text;

            // Clean up Markdown backticks if the model ignores the responseMimeType
            textResponse = textResponse.replace(/```json/gi, '').replace(/```/gi, '').trim();

            // Parse the JSON returned by Gemini
            const parsedResponse = JSON.parse(textResponse);

            // Ensure the required fields are present
            return {
                intent: parsedResponse.intent || 'UNKNOWN',
                reply: parsedResponse.reply || 'Вибачте, я не зміг сформувати відповідь.',
                actions: parsedResponse.actions || []
            };

        } catch (error) {
            console.error("Gemini API Error, falling back to mock:", error);
            // Fallback to mock logic if the API fails
            return await MockAiBackend.process(requestPayload);
        }
    }
};
