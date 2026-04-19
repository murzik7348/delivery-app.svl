
---

## 🤖 AI Assistant Integration

This project uses an isolated Sidecar architecture for its AI assistant. 
The main driver is `services/AiService.js` and states are globally synchronized via the `aiSlice` Redux store.

### API Contract (`AiService.js`)
All AI processing passes through an HTTP-ready structure. The defined communication contract is:

- **Entity**: `POST /api/ai/chat`
- **Request Payload**: 
```json
{
  "message": "Де моє замовлення?",
  "appContext": { "orders": [...], "user": {...}, "cartItems": [...] }
}
```
- **Response Shape**:
```json
{
  "intent": "TRACK_ORDER",
  "reply": "Твоє замовлення номер 1234 вже в дорозі!",
  "actions": ["NAVIGATE_TO_TRACKING"]
}
```

### How to Toggle Real API
Currently, the App heavily mocks the Natural Language Processing directly on-device using string-matching to demonstrate the UI intent safely.

**To connect to a real Backend:**
1. Open `services/AiService.js`.
2. Change the literal `export const USE_MOCK_AI = true;` to `false`.
3. Provide your real HTTPS endpoint URL inside the bottom `fetch()` configuration.

---

## 🔐 Admin Panel Routing
The driver manipulation panel (`/admin`) is fiercely guarded. To view it, the active Redux `user` structure must hold:
* `user.role === 'admin'` OR 
* The user's logged-in email must contain an authorized whitelist alias (e.g. `admin@svl.com`).

Access without these credentials will yield a hard `Доступ заборонено` React component interception, blocking arbitrary API access or trigger misfires of the Live Activity iOS engine.
