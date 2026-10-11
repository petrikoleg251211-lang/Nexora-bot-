# 🎴 NEXORA NFT Mini App v2

**Незалежна NFT-платформа всередині Telegram.** Користувачі створюють власні NFT, адмін модерує, і тільки після схвалення вони стають частиною екосистеми.

> ⚠️ **Важливо:** NEXORA не має жодного стосунку до Telegram Gifts, Telegram Stars або блокчейну Telegram. Це самостійна ігрова NFT-економіка.

---

## 📁 Структура проєкту

```
nexora/
├── bot/
│   └── main.py              # Telegram бот: /start, /admin, дисклеймер
├── app/
│   ├── index.html           # Mini App: 6 вкладок + адмін-панель
│   ├── styles.css           # Темна NFT-тема
│   ├── app.js               # Логіка: створення, модерація, торгівля, крафт
│   ├── privacy.html         # Політика конфіденційності
│   └── terms.html           # Умови використання
├── server/
│   └── main.py              # FastAPI: API + перевірка initData + upload
├── database/
│   └── models.py            # SQLite: User, NFT, NFTSubmission, MarketListing
├── static/
│   ├── images/              # NFT зображення (emoji fallback)
│   └── uploads/             # Завантажені користувачами файли
├── .env.example
├── requirements.txt
└── run.py
```

---

## 🚀 Швидкий старт

### 1. Встановлення

```bash
git clone <repo>
cd NEXORA_NFT_MiniApp_v2
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Налаштування

```bash
cp .env.example .env
# Редагуй .env:
# BOT_TOKEN=твій_токен_з_BotFather
# MINI_APP_URL=https://твій-домен.com/app
# ADMIN_ID=твій_telegram_id
# APP_SECRET=будь-який_секрет
```

### 3. Отримання токена та налаштування Mini App

1. **@BotFather** → `/newbot` → отримай токен
2. **Підключи Mini App:**
   - `/mybots` → вибери бота → **Bot Settings** → **Menu Button** → **Configure menu button**
   - Вкажи URL твого Mini App
3. **Вкажи ADMIN_ID** — твій telegram_id (дізнайся через @userinfobot)

### 4. Запуск

```bash
python run.py
```

Бот на polling, сервер на `http://localhost:8000`.

### 5. Деплой

**Варіант A — Простий (Cloudflare Pages):**
- Завантаж папку `app/` як статичний сайт
- Вкажи URL у BotFather

**Варіант B — Повний (VPS / Railway / Render):**
- Задеплой весь проєкт
- Порт 8000
- Домен у `.env` та BotFather

---

## 🎮 Функціонал

| Фіча | Опис |
|------|------|
| 🖼️ **Collection** | Твоя NFT колекція |
| ➕ **Create** | Завантаж свій NFT → модерація → схвалення |
| 🛒 **Market** | Купівля/продаж NFT за Credits |
| 🔨 **Craft** | 3+ NFT → злиття в більш рідкісний |
| 👤 **Profile** | Баланс, статистика, дисклеймер |
| 🏆 **Leaderboard** | Топ-50 гравців |
| 👑 **Admin** | Модерація поданих NFT (тільки для ADMIN_ID) |

### Рідкість NFT

| Рідкість | Шанс крафту |
|----------|-------------|
| ⚪ Common | Базова |
| 🔵 Rare | 3 Common |
| 🟣 Epic | 3 Rare+ |
| 🟡 Legendary | 3 Epic+ |
| 🔴 Mythic | 3 Legendary+ |

---

## 🔒 Безпека та правова база

- **Перевірка initData** — HMAC-SHA256 (Telegram WebApp)
- **Модерація контенту** — адмін схвалює кожен NFT вручну
- **Privacy Policy** — вбудована сторінка `privacy.html`
- **Terms of Service** — вбудована сторінка `terms.html`
- **Дисклеймер** — у боті, профілі та документації чітко вказано, що NEXORA не пов'язана з Telegram Gifts

### Що заборонено завантажувати:
- NSFW / порнографія
- Насильство / жорстокість
- Політична агітація
- Плагіат / порушення авторських прав
- Особисті дані третіх осіб

---

## 🛠️ Наступні кроки

- [ ] Telegram Stars платежі для Premium-функцій
- [ ] Аукціони з таймером
- [ ] Обмін NFT між гравцями (trade)
- [ ] Щоденні нагороди / streak
- [ ] Реферальна система
- [ ] Сповіщення про схвалення NFT
- [ ] Банерна реклама всередині Mini App

---

## 📄 Ліцензія

MIT — роби що хочеш, але згадуй NEXORA 😎

---

**NEXORA © 2026 · Незалежна NFT-платформа · Не пов'язана з Telegram Gifts**
