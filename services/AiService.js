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
const GEMINI_API_KEY = "AIzaSyDS5FJhuZMibVOb8K0t7hxWm3SJ7x4gW60";

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
🚨 SYSTEM INSTRUCTIONS 🚨
You are a strict, professional AI assistant for a food delivery app in Ukraine.
Your ONLY purpose is to help users order food, check delivery status, and parse addresses.
You are STRICTLY FORBIDDEN from answering off-topic questions (e.g., coding, history, jokes).

🛑 OUTPUT FORMAT (CRITICAL):
NEVER return plain text. ALWAYS return STRICT VALID JSON with EXACTLY this structure:
{
  "intent": "ONE_OF_THE_5_INTENTS_BELOW",
  "payload": { ... object based on the chosen intent ... }
}
No markdown block ticks (like \`\`\`json). No comments.

🧠 DECISION LOGIC (CHOOSE EXACTLY ONE INTENT):
Analyze the "User input" and "APP STATE", then pick the most appropriate intent from the 5 below.

1. SEMANTIC_FOOD_SEARCH
- WHEN: User searches for food or asks for recommendations (e.g., "I want meat", "find pizza", "sweet things").
- ACTION: Find the best matching products from "AVAILABLE CATALOG".
- PAYLOAD FORMAT: {"productIds": [id1, id2]} (Max 3 IDs).

2. SMART_CART_UPSELL
- WHEN: User asks to add something to their existing cart, or asks what goes well with their current cart.
- ACTION: Pick ONE highly relevant product from the catalog that complements the cart.
- PAYLOAD FORMAT: {"productId": 123, "reason": "Ця страва ідеально доповнить ваше замовлення!"} (reason MUST be in Ukrainian).

3. ORDER_ASSISTANT
- WHEN: User asks "where is my order?", "when will it arrive?", etc.
- ACTION: Read "activeOrders". If exists, explain status. If empty, say they have no orders.
- PAYLOAD FORMAT: {"message": "Ваше замовлення #123 вже в дорозі!"} (message MUST be in Ukrainian).

4. SMART_ADDRESS_PARSE
- WHEN: User types a complex or messy delivery address.
- ACTION: Extract address components.
- PAYLOAD FORMAT: {"city": "...", "street": "...", "building": "...", "apartment": "...", "courierComment": "..."}

5. GENERAL_CHAT
- WHEN: User says hi, thanks, OR asks an OFF-TOPIC question.
- ACTION: If off-topic, politely refuse and remind them you are a food delivery assistant. If greeting, say hi.
- PAYLOAD FORMAT: {"message": "Привіт! Я помічник з доставки їжі. Чим можу допомогти?"} (message MUST be in Ukrainian).

📦 APP STATE:
- cartItems: ${JSON.stringify(appContext.cartItems || [])}
- cartTotal: ${appContext.cartTotal || 0}
- activeOrders: ${JSON.stringify(appContext.orders?.filter(o => o.status !== 'completed') || [])}
- user: ${JSON.stringify(appContext.user || null)}

🛒 AVAILABLE CATALOG:
${JSON.stringify(appContext.catalogProducts?.map(p => ({ id: p.product_id, name: p.name, desc: p.description, price: p.price })) || [])}

User input: "${text}"
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
                payload: parsedResponse.payload || {},
                rawJson: JSON.stringify(parsedResponse, null, 2)
            };

        } catch (error) {
            console.error("Gemini API Error, falling back to mock:", error);
            // Fallback to mock logic if the API fails
            return await MockAiBackend.process(requestPayload);
        }
    }
};
