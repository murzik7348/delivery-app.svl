
// data/mockData.js

// --- 1. КАТЕГОРІЇ (ОБОВ'ЯЗКОВО ПОТРІБНІ ДЛЯ ГОЛОВНОЇ) ---
export const categories = [
  { 
    category_id: 1, 
    name: "Бургери", 
    image: "https://cdn-icons-png.flaticon.com/512/3075/3075977.png" 
  },
  { 
    category_id: 2, 
    name: "Суші", 
    image: "https://cdn-icons-png.flaticon.com/512/2252/2252075.png" 
  },
  { 
    category_id: 3, 
    name: "Піца", 
    image: "https://cdn-icons-png.flaticon.com/512/1404/1404945.png" 
  },
  { 
    category_id: 4, 
    name: "Магазини", 
    image: "https://cdn-icons-png.flaticon.com/512/3081/3081559.png" 
  },
  { 
    category_id: 5, 
    name: "Кава", 
    image: "https://cdn-icons-png.flaticon.com/512/2935/2935303.png" 
  },
];

// --- 2. АКЦІЇ (ОБОВ'ЯЗКОВО ПОТРІБНІ ДЛЯ ГОЛОВНОЇ) ---
export const promotions = [
  {
    id: 1,
    title: "Знижка -50% на другий бургер",
    image: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=800",
    description: "Купуй один бургер у Дубліні та отримуй другий за півціни!",
  },
  {
    id: 2,
    title: "Безкоштовна доставка з Алми",
    image: "https://images.unsplash.com/photo-1604719312566-b7cb0463d339?w=800",
    description: "Замовляй продукти на суму від 500 грн.",
  }
];

// --- 3. ЗАКЛАДИ (СВАЛЯВА) ---
export const stores = [
  // МАГАЗИНИ
  {
    store_id: 1,
    name: "Промінь",
    // 👇 Нове надійне фото (магазин продуктів)
    image: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800", 
    rating: 4.4,
    delivery_time: "15-25 хв",
    tags: ["Магазин", "Продукти", "Напої"],
  },
  {
    store_id: 2,
    name: "Алма",
    image: "https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?w=800",
    rating: 4.8,
    delivery_time: "20-30 хв",
    tags: ["Супермаркет", "Продукти", "Власна випічка"],
  },
  {
    store_id: 3,
    name: "Курортний",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800",
    rating: 4.3,
    delivery_time: "10-20 хв",
    tags: ["Магазин", "Снеки", "Вода"],
  },

  // РЕСТОРАНИ
  {
    store_id: 4,
    name: "Рутенія",
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800",
    rating: 4.9,
    delivery_time: "40-50 хв",
    tags: ["Ресторан", "Гриль", "Банкет"],
  },
  {
    store_id: 5,
    name: "Дублін",
    image: "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800",
    rating: 4.7,
    delivery_time: "30-45 хв",
    tags: ["Паб", "Бургери", "Пиво"],
  },
  {
    store_id: 6,
    name: "Кардамон",
    image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800",
    rating: 4.8,
    delivery_time: "20-35 хв",
    tags: ["Кав'ярня", "Тістечка", "Кава"],
  },
  {
    store_id: 7,
    name: "Наві",
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800",
    rating: 4.6,
    delivery_time: "35-45 хв",
    tags: ["Ресторан", "Піца", "Суші"],
  }
];

// --- 4. МЕНЮ ---
export const products = [
  // ПРОМІНЬ (id 1)
  {
    product_id: 101,
    store_id: 1,
    name: "Хліб Домашній",
    price: 24,
    image: "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=500",
    description: "Свіжий білий хліб, хрустка скоринка.",
  },
  {
    product_id: 102,
    store_id: 1,
    name: "Мінеральна вода (1.5л)",
    price: 28,
    image: "https://images.unsplash.com/photo-1616118132534-381148898bb4?w=500",
    description: "Вода газована Поляна.",
  },
  
  // АЛМА (id 2)
  {
    product_id: 201,
    store_id: 2,
    name: "Ковбаса Салямі",
    price: 145,
    image: "https://images.unsplash.com/photo-1624462966581-bc6d768cbce5?w=500",
    description: "Ковбаса вищого ґатунку.",
  },
  {
    product_id: 202,
    store_id: 2,
    name: "Сік Rich (1л)",
    price: 62,
    image: "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500",
    description: "Апельсиновий сік, 100%.",
  },
  {
    product_id: 203,
    store_id: 2,
    name: "Банани (1кг)",
    price: 69,
    image: "https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=500",
    description: "Свіжі еквадорські банани.",
  },

  // КУРОРТНИЙ (id 3)
  {
    product_id: 301,
    store_id: 3,
    name: "Морозиво Ріжок",
    price: 45,
    image: "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=500",
    description: "Великий ріжок з шоколадом.",
  },

  // РУТЕНІЯ (id 4)
  {
    product_id: 401,
    store_id: 4,
    name: "Бограч Закарпатський",
    price: 180,
    image: "https://images.unsplash.com/photo-1547592166-23acbe346499?w=500",
    description: "Традиційний гострий суп з м'ясом.",
  },
  {
    product_id: 402,
    store_id: 4,
    name: "Шашлик зі свинини (200г)",
    price: 260,
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500",
    description: "Соковитий шашлик на мангалі.",
  },

  // ДУБЛІН (id 5)
  {
    product_id: 501,
    store_id: 5,
    name: "Бургер Irish Beef",
    price: 290,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500",
    description: "Велика котлета, сир чеддер, бекон, соус BBQ.",
  },
  {
    product_id: 502,
    store_id: 5,
    name: "Пивна тарілка",
    price: 220,
    image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=500",
    description: "Крильця, цибулеві кільця, грінки, соуси.",
  },

  // КАРДАМОН (id 6)
  {
    product_id: 601,
    store_id: 6,
    name: "Наполеон",
    price: 95,
    image: "https://images.unsplash.com/photo-1565259469777-628f877f8045?w=500",
    description: "Ніжний торт за фірмовим рецептом.",
  },
  {
    product_id: 602,
    store_id: 6,
    name: "Лате Карамель",
    price: 75,
    image: "https://images.unsplash.com/photo-1570968992193-6e5c8802efff?w=500",
    description: "Кава з молоком та карамельним сиропом.",
  },

  // НАВІ (id 7)
  {
    product_id: 701,
    store_id: 7,
    name: "Піца Папероні",
    price: 230,
    image: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500",
    description: "Томатний соус, моцарела, пікантна ковбаса.",
  },
  {
    product_id: 702,
    store_id: 7,
    name: "Рол Зелений Дракон",
    price: 340,
    image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=500",
    description: "Вугор, авокадо, унагі соус, кунжут.",
  }
];