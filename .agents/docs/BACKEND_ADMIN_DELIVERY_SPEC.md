# Backend Spec: Admin Delivery Override + Address in Response

Специфікація для backend-розробника. Потрібно для коректної роботи Admin Panel при зміні статусів доставок та відображенні адреси клієнта.

---

## Проблема

- Admin Panel викликає `PUT /restaurant/deliveries/{id}/confirm` та `/courier/deliveries/{id}/*` з **Admin** токеном → **403 Forbidden** (RBAC).
- `GET /admin/delivery` не повертає адресу доставки → у UI показується "No address".

---

## 1. Admin Endpoints для зміни статусу

Додати endpoints під тагом **Admin**, які дозволяють змінювати статус доставки при наявності ролі Admin.

### 1.1 Підтвердження замовлення (Restaurant Confirm)

```
PUT /admin/delivery/{id}/confirm
```

**Auth:** Bearer token, роль Admin  
**Path params:** `id` — deliveryId  
**Body:** `{}` (пустий JSON, щоб уникнути 400)  
**Response:** 200 OK

**Логіка:** аналогічно `PUT /restaurant/deliveries/{id}/confirm` — змінює статус на `preparing` (2), якщо поточний статус `accepted` (1).

---

### 1.2 Скасування замовлення

```
PUT /admin/delivery/{id}/cancel
```

**Auth:** Bearer token, роль Admin  
**Path params:** `id` — deliveryId  
**Body:** `{}`  
**Response:** 200 OK

**Логіка:** аналогічно `PUT /restaurant/deliveries/{id}/cancel` — змінює статус на `canceled` (5).

---

### 1.3 (Опціонально) Універсальна зміна статусу

```
PUT /admin/delivery/{id}/status
```

**Auth:** Bearer token, роль Admin  
**Path params:** `id` — deliveryId  
**Body:**
```json
{ "status": 1 }
```

**Response:** 200 OK

**Логіка:** змінює `deliveryStatus` на передане значення (0–5). Дозволяє Admin повністю керувати статусами без окремих endpoints для кожного переходу.

| status | значення |
|--------|----------|
| 0 | created |
| 1 | accepted |
| 2 | preparing |
| 3 | delivering |
| 4 | delivered |
| 5 | canceled |

---

## 2. Адреса в відповіді GET /admin/delivery

Зараз відповідь не містить адреси. Потрібно додати до кожного елемента масиву доставок поле `address` (обʼєкт або рядок).

### Поточна відповідь (приблизно):

```json
{
  "deliveryId": 247,
  "userId": 519,
  "restaurantId": 2,
  "statusDelivery": "accepted",
  "totalPrice": 351.4,
  "items": [...]
}
```

### Бажана відповідь:

```json
{
  "deliveryId": 247,
  "userId": 519,
  "restaurantId": 2,
  "addressId": 42,
  "address": {
    "title": "Дім",
    "street": "вул. Хрещатик",
    "house": "15",
    "apartment": "42",
    "entrance": "2",
    "floor": "5",
    "comment": "код від підʼїзду 1234"
  },
  "statusDelivery": "accepted",
  "totalPrice": 351.4,
  "items": [...]
}
```

**Або** (якщо зручніше) один рядок:

```json
{
  "deliveryId": 247,
  ...
  "addressText": "вул. Хрещатик, 15, кв. 42"
}
```

---

## 3. Приклад реалізації (C# / ASP.NET Core)

### Controller

```csharp
// AdminDeliveryController.cs

[ApiController]
[Route("admin/delivery")]
[Authorize(Roles = "Admin")]
public class AdminDeliveryController : ControllerBase
{
    private readonly IDeliveryService _deliveryService;

    public AdminDeliveryController(IDeliveryService deliveryService)
    {
        _deliveryService = deliveryService;
    }

    [HttpPut("{id}/confirm")]
    public async Task<IActionResult> Confirm(int id, [FromBody] object _ = null)
    {
        await _deliveryService.SetStatusAsync(id, DeliveryStatus.Preparing);
        return Ok();
    }

    [HttpPut("{id}/cancel")]
    public async Task<IActionResult> Cancel(int id, [FromBody] object _ = null)
    {
        await _deliveryService.SetStatusAsync(id, DeliveryStatus.Canceled);
        return Ok();
    }

    [HttpPut("{id}/status")]
    public async Task<IActionResult> SetStatus(int id, [FromBody] StatusRequest body)
    {
        if (body?.Status is < 0 or > 5)
            return BadRequest("Invalid status");
        await _deliveryService.SetStatusAsync(id, (DeliveryStatus)body.Status);
        return Ok();
    }
}

public class StatusRequest { public int Status { get; set; } }
```

### DTO з адресою

```csharp
// DeliveryAdminDto.cs

public class DeliveryAdminDto
{
    public int DeliveryId { get; set; }
    public int UserId { get; set; }
    public int? RestaurantId { get; set; }
    public int? AddressId { get; set; }
    public DeliveryAddressDto Address { get; set; }  // <-- додати
    public string StatusDelivery { get; set; }
    public decimal TotalPrice { get; set; }
    public List<DeliveryItemDto> Items { get; set; }
    // ... інші поля
}

public class DeliveryAddressDto
{
    public string Title { get; set; }
    public string Street { get; set; }
    public string House { get; set; }
    public string Apartment { get; set; }
    public string Entrance { get; set; }
    public string Floor { get; set; }
    public string Comment { get; set; }
}
```

При мапінгу з Delivery → DeliveryAdminDto додати `.Include(d => d.Address)` і заповнювати `Address` з повʼязаної сутності Address по `addressId`.

---

## 4. Checklist для backend

- [ ] `PUT /admin/delivery/{id}/confirm`
- [ ] `PUT /admin/delivery/{id}/cancel`
- [ ] (опційно) `PUT /admin/delivery/{id}/status` з body `{ "status": number }`
- [ ] `GET /admin/delivery` повертає поле `address` або `addressText` для кожної доставки
- [ ] Усі нові endpoints під ролью Admin (RBAC)

---

## 5. Що оновити на фронті після змін

Після деплою backend:

1. **admin-web** перемикати виклики на нові admin endpoints:
   - замість `PUT /restaurant/deliveries/{id}/confirm` → `PUT /admin/delivery/{id}/confirm`
   - замість `PUT /restaurant/deliveries/{id}/cancel` → `PUT /admin/delivery/{id}/cancel`
   - для courier-статусів → `PUT /admin/delivery/{id}/status` з відповідним `status` (1, 3, 4)
2. UI для адреси вже готовий — достатньо, щоб в відповіді було `address` або `addressText`.
