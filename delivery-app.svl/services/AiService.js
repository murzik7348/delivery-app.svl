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

export const AiService = {

    /**
     * Main entrypoint for processing user messages.
     * @param {string} text - User's input message
     * @param {object} appContext - Data from Redux (orders, cart, auth status)
     * @returns {Promise<{intent: string, reply: string, actions: array}>} The structured AI response
     */
    async processQuery(text, appContext) {
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
            console.error("Gemini API Error:", error);
            throw error;
        }
    }
};
