import express from 'express';
import cors from 'cors';
import multer from 'multer';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const BOT_TOKEN = process.env.BOT_TOKEN || '';
const ADMIN_ID = parseInt(process.env.ADMIN_ID || '100001', 10);

const UPLOAD_DIR = path.join(__dirname, 'static', 'uploads');
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'nexora-custom-gifts-v5.json');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });

// ============ CONSTANTS & CONFIG ============
const RARITY_STAKING_RATES = {
    common: 15,
    rare: 45,
    epic: 110,
    legendary: 250,
    mythic: 480
};

const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary', 'mythic'];

// Randomizable Backdrops when upgrading a Box into an NFT
const BACKDROP_POOL = [
    { name: 'Royal Gold (1.2%)', gradient: 'radial-gradient(circle at 50% 42%, #784b08 0%, #362003 58%, #120d06 100%)', glow: '#f5a623' },
    { name: 'Cyber Emerald (1.8%)', gradient: 'radial-gradient(circle at 50% 42%, #0c5938 0%, #062b1c 58%, #071410 100%)', glow: '#10b981' },
    { name: 'Midnight Sapphire (2.4%)', gradient: 'radial-gradient(circle at 50% 42%, #134678 0%, #09223d 58%, #07111e 100%)', glow: '#2ea6ff' },
    { name: 'Violet Nebula (1.5%)', gradient: 'radial-gradient(circle at 50% 42%, #521d82 0%, #270d42 58%, #0f071a 100%)', glow: '#a855f7' },
    { name: 'Crimson Flame (0.9%)', gradient: 'radial-gradient(circle at 50% 42%, #7c1926 0%, #3b0b12 58%, #170609 100%)', glow: '#ef4444' },
    { name: 'Arctic Cyan (2.1%)', gradient: 'radial-gradient(circle at 50% 42%, #0e5c6b 0%, #072c36 58%, #06141a 100%)', glow: '#06b6d4' }
];

// Randomizable Pattern Icons (Значки ззаду) when upgrading a Box into an NFT
const SYMBOL_POOL = [
    { name: 'Golden Crown (0.8%)', icon: '👑' },
    { name: 'Diamond Core (1.4%)', icon: '💎' },
    { name: 'High Voltage (2.0%)', icon: '⚡' },
    { name: 'Plasma Flame (1.6%)', icon: '🔥' },
    { name: 'Starlight (2.5%)', icon: '✦' },
    { name: 'Rocket Boost (1.9%)', icon: '🚀' },
    { name: 'Trophy Crest (1.2%)', icon: '🏆' },
    { name: 'Cyber Shield (2.2%)', icon: '🛡️' }
];

// 14 2-Stage Gifts: Stage 1 (Sealed 3D Box) -> Stage 2 (Detailed Multi-Part 3D Item on Pedestal)
const GIFT_PRESETS = [
    {
        id: 'chrono_watch',
        archetype: 'watch',
        category: 'luxury',
        box_name: 'Шкатулка Хронографа',
        revealed_name: 'Tourbillon Royal 24K',
        collection_id: 'horology_luxury',
        box_image_url: '/api/art/chrono_watch/box.svg',
        revealed_image_url: '/api/art/chrono_watch/item.svg',
        models: [
            'Tourbillon Skeleton Gold (0.6%)',
            'Sapphire Chrono Perpetual (1.4%)',
            'Platinum Moonphase (2.2%)'
        ],
        rarity: 'legendary',
        description: 'Лакована шкатулка з червоного дерева та золота. Прокачайте, щоб розпакувати 3D-хронограф із живим турбійоном та рухомими стрілками!'
    },
    {
        id: 'imperial_crown',
        archetype: 'crown',
        category: 'royal',
        box_name: 'Імперський Ларець Корони',
        revealed_name: 'Imperial Crystal Crown',
        collection_id: 'royal_treasury',
        box_image_url: '/api/art/imperial_crown/box.svg',
        revealed_image_url: '/api/art/imperial_crown/item.svg',
        models: [
            'Imperial Ruby & Diamond (0.4%)',
            'Sovereign 24K Gold (1.1%)',
            'Emerald Monarch (1.9%)'
        ],
        rarity: 'mythic',
        description: 'Королівський оксамитовий ларець із золотими застібками. При прокачці відкриває 3D-корону з левітуючим діамантом і самоцвітами!'
    },
    {
        id: 'gold_bullion',
        archetype: 'bullion',
        category: 'royal',
        box_name: 'Броньований Тубус Злитка',
        revealed_name: 'Fine Gold Bar 999.9',
        collection_id: 'royal_treasury',
        box_image_url: '/api/art/gold_bullion/box.svg',
        revealed_image_url: '/api/art/gold_bullion/item.svg',
        models: [
            '1KG Swiss Mint 999.9 (0.9%)',
            'Holo-Sealed Reserve Ingot (1.8%)',
            'Central Bank Gold Bar (2.6%)'
        ],
        rarity: 'legendary',
        description: 'Банківський броньований футляр із пломбою монетного двору. Після прокачки відкриває 3D-злиток золота 999.9 проби з голограмою!'
    },
    {
        id: 'cyber_drone',
        archetype: 'drone',
        category: 'cyber',
        box_name: 'Тактичний Кейс Дрона',
        revealed_name: 'Quantum Quad-Drone X9',
        collection_id: 'cyber_crypto',
        box_image_url: '/api/art/cyber_drone/box.svg',
        revealed_image_url: '/api/art/cyber_drone/item.svg',
        models: [
            'Carbon Stealth 8K Gimbal (1.2%)',
            'Neon Interceptor Pro (2.1%)',
            'Gold Rotor Edition (3.0%)'
        ],
        rarity: 'epic',
        description: 'Ударостійкий кейс із неоновим індикатором. Прокачайте, щоб запустити 3D-квадрокоптер із чотирма обертовими пропелерами та лазерним сканером!'
    },
    {
        id: 'vision_vr',
        archetype: 'vr_headset',
        category: 'cyber',
        box_name: 'Капсула Нейро-Шолома',
        revealed_name: 'Vision Cyber Visor Pro',
        collection_id: 'cyber_crypto',
        box_image_url: '/api/art/vision_vr/box.svg',
        revealed_image_url: '/api/art/vision_vr/item.svg',
        models: [
            'Spatial Glass 24K Edition (1.3%)',
            'Neural Neon Pulse (2.4%)',
            'Titanium Optic Pro (3.2%)'
        ],
        rarity: 'epic',
        description: 'Футуристична титанова капсула. Розпакуйте, щоб отримати 3D нейро-шолом із вигнутим сапфіровим візором та живою світловою хвилею!'
    },
    {
        id: 'crypto_vault',
        archetype: 'crypto_vault',
        category: 'cyber',
        box_name: 'Контейнер Крипто-Сейфа',
        revealed_name: 'Quantum Hardware Vault',
        collection_id: 'cyber_crypto',
        box_image_url: '/api/art/crypto_vault/box.svg',
        revealed_image_url: '/api/art/crypto_vault/item.svg',
        models: [
            'Satoshi Genesis Vault (0.7%)',
            'Titanium Cold Storage (1.7%)',
            'Biometric Gold Node (2.5%)'
        ],
        rarity: 'legendary',
        description: 'Криптографічний контейнер холодного зберігання. Прокачайте, щоб відкрити 3D-сейф із обертовим кодовим коліщатком та енергетичним ядром!'
    },
    {
        id: 'champion_cup',
        archetype: 'trophy_cup',
        category: 'prestige',
        box_name: 'Кофр Кубка Чемпіона',
        revealed_name: 'Grand Champion Chalice',
        collection_id: 'champions_prestige',
        box_image_url: '/api/art/champion_cup/box.svg',
        revealed_image_url: '/api/art/champion_cup/item.svg',
        models: [
            'World Finals 24K Chalice (0.8%)',
            'Starlight Victory Trophy (1.6%)',
            'Obsidian & Gold Cup (2.8%)'
        ],
        rarity: 'legendary',
        description: 'Чемпіонський тубус із золотим гравіюванням. Після прокачки відкриває 3D-кубок переможця з подвійними ручками та обертовою зіркою!'
    },
    {
        id: 'royal_perfume',
        archetype: 'perfume',
        category: 'prestige',
        box_name: 'Оксамитовий Футляр Еліксиру',
        revealed_name: 'Royal Oud Elixir Flacon',
        collection_id: 'champions_prestige',
        box_image_url: '/api/art/royal_perfume/box.svg',
        revealed_image_url: '/api/art/royal_perfume/item.svg',
        models: [
            'Baccarat Crystal Gold (1.5%)',
            'Amber Extrait 24K (2.6%)',
            'Midnight Velvet Flacon (3.8%)'
        ],
        rarity: 'rare',
        description: 'Парфумерний кофр ручної роботи. Прокачайте, щоб розкрити 3D гранований кришталевий флакон із золотим пульверизатором та бурштиновим ядром!'
    },
    {
        id: 'diamond_ring',
        archetype: 'diamond_ring',
        category: 'luxury',
        box_name: 'Ювелірна Коробочка Персня',
        revealed_name: 'Solitaire Diamond Ring',
        collection_id: 'horology_luxury',
        box_image_url: '/api/art/diamond_ring/box.svg',
        revealed_image_url: '/api/art/diamond_ring/item.svg',
        models: [
            'Flawless 5ct Solitaire (0.5%)',
            'Royal Halo Platinum (1.3%)',
            'Rose-Gold Pink Diamond (2.0%)'
        ],
        rarity: 'mythic',
        description: 'Смарагдова ювелірна коробочка з підсвіткою. При прокачці відкриває 3D золотий перстень із багатогранним діамантом чистої води!'
    },
    {
        id: 'nexphone',
        archetype: 'phone',
        category: 'tech',
        box_name: 'Коробка NexPhone',
        revealed_name: 'NexPhone 16 Titanium',
        collection_id: 'tech_drop',
        box_image_url: '/src/assets/images/gift_box_phone_1791712954553.jpg',
        revealed_image_url: '/src/assets/images/gift_item_phone_1791712963927.jpg',
        models: [
            'Titanium 24K Gold (0.8%)',
            'Obsidian Pro Max (1.9%)',
            'Sapphire Glass Edition (2.7%)'
        ],
        rarity: 'legendary',
        description: 'Запакована фірмова коробка смартфона з голографічною пломбою. Прокачайте, щоб розпакувати смартфон, отримати унікальний фон та значок ззаду!'
    },
    {
        id: 'supercar',
        archetype: 'supercar',
        category: 'supercar',
        box_name: 'Карбоновий Бокс Авто',
        revealed_name: 'HyperCar Rose-Gold',
        collection_id: 'motorsport_club',
        box_image_url: '/src/assets/images/gift_box_supercar_1791713059172.jpg',
        revealed_image_url: '/src/assets/images/gift_item_supercar_1791713069652.jpg',
        models: [
            'Rose-Gold Carbon 1:18 (0.5%)',
            'Track Edition V12 (1.4%)',
            'Stealth Aero Coupe (2.2%)'
        ],
        rarity: 'mythic',
        description: 'Восьмикутний кейс із кованого карбону та алькантари із золотим гербом. При прокачці відкриває колекційний гіперкар!'
    },
    {
        id: 'gpu_vault',
        archetype: 'gpu',
        category: 'tech',
        box_name: 'Сейф Відеокарти',
        revealed_name: 'RTX 9090 Liquid Gold',
        collection_id: 'tech_drop',
        box_image_url: '/src/assets/images/gift_box_gpu_1791712997798.jpg',
        revealed_image_url: '/src/assets/images/gift_item_gpu_1791713008994.jpg',
        models: [
            'Founders Gold 24GB (1.1%)',
            'Triple Turbine RGB (2.3%)',
            'Overclock Titanium (3.0%)'
        ],
        rarity: 'epic',
        description: 'Броньований металевий кейс для топового заліза. Прокачайте, щоб вибити лімітовану золоту відеокарту з RGB-турбінами!'
    },
    {
        id: 'sneaker_box',
        archetype: 'sneaker',
        category: 'streetwear',
        box_name: 'Бокс Лімітованих Кросів',
        revealed_name: 'Air Gold & Ice Sole',
        collection_id: 'street_hype',
        box_image_url: '/src/assets/images/gift_box_sneaker_1791712974977.jpg',
        revealed_image_url: '/src/assets/images/gift_item_sneaker_1791712984440.jpg',
        models: [
            'Gold Swoosh Ice Sole (1.6%)',
            'White Leather High (3.2%)',
            'Neon Gel Collector (4.1%)'
        ],
        rarity: 'rare',
        description: 'Карбоновий шубокс із помаранчевими замками. Прокачайте коробку, щоб дістати рідкісні хайпові кросівки з неоновою підошвою!'
    },
    {
        id: 'gamepad_case',
        archetype: 'gamepad',
        category: 'gaming',
        box_name: 'Футляр Геймпаду',
        revealed_name: 'ProPad Smoked Gold',
        collection_id: 'street_hype',
        box_image_url: '/src/assets/images/gift_box_gamepad_1791713037888.jpg',
        revealed_image_url: '/src/assets/images/gift_item_gamepad_1791713047624.jpg',
        models: [
            'Smoked Crystal 24K (1.7%)',
            'Gold Triggers Pro (3.5%)',
            'Esports Custom (4.8%)'
        ],
        rarity: 'rare',
        description: 'Оксамитовий захисний кофр із золотою хрестовиною. Після прокачки відкриває напівпрозорий геймпад із золотими стіками!'
    }
];

function findPresetByIds(ids) {
    return GIFT_PRESETS.filter(p => ids.includes(p.id));
}

const COLLECTIONS_CATALOG = [
    {
        id: 'horology_luxury',
        name: 'Horology & Diamond Atelier',
        icon: '⌚',
        description: 'Золотий хронограф Tourbillon Royal 24K та діамантовий перстень Solitaire 5ct',
        required_count: 2,
        staking_multiplier_bonus: 0.35,
        reward_nxr: 900
    },
    {
        id: 'royal_treasury',
        name: 'Royal Imperial Treasury',
        icon: '👑',
        description: 'Імперська корона з кристалами та банківський золотий злиток 999.9 проби',
        required_count: 2,
        staking_multiplier_bonus: 0.40,
        reward_nxr: 1100
    },
    {
        id: 'cyber_crypto',
        name: 'Cyber & Crypto Lab',
        icon: '🛸',
        description: 'Квантовий дрон X9, нейро-візор Vision Pro та апаратний крипто-сейф',
        required_count: 3,
        staking_multiplier_bonus: 0.30,
        reward_nxr: 800
    },
    {
        id: 'champions_prestige',
        name: 'Champions & Prestige',
        icon: '🏆',
        description: 'Кубок чемпіона Grand Chalice та королівський кришталевий флакон парфумів',
        required_count: 2,
        staking_multiplier_bonus: 0.25,
        reward_nxr: 650
    },
    {
        id: 'tech_drop',
        name: 'NexTech Hardware',
        icon: '📱',
        description: 'Флагманський смартфон NexPhone Titanium та золота відеокарта RTX 9090',
        required_count: 2,
        staking_multiplier_bonus: 0.25,
        reward_nxr: 600
    },
    {
        id: 'motorsport_club',
        name: 'HyperCar Garage',
        icon: '🏎️',
        description: 'Колекційні суперкари Rose-Gold Carbon та закриті карбонові бокси',
        required_count: 2,
        staking_multiplier_bonus: 0.35,
        reward_nxr: 850
    },
    {
        id: 'street_hype',
        name: 'Hype & Gaming Drop',
        icon: '👟',
        description: 'Лімітовані кросівки Air Gold та кастомний геймпад ProPad Smoked Gold',
        required_count: 2,
        staking_multiplier_bonus: 0.20,
        reward_nxr: 500
    }
];

const CASES_CATALOG = [
    {
        id: 'luxury_horology_case',
        name: 'Luxury Horology & Gems',
        subtitle: 'Ювелірне ательє: Шкатулка Хронографа Tourbillon, Коробочка Діамантового Персня та Флакон Еліксиру',
        price: 340,
        icon: '⌚',
        accent: '#f5a623',
        probabilities: { common: 0, rare: 26, epic: 30, legendary: 28, mythic: 16 },
        pool: findPresetByIds(['chrono_watch', 'diamond_ring', 'royal_perfume', 'gold_bullion'])
    },
    {
        id: 'royal_bullion_case',
        name: 'Royal & Bullion Treasury',
        subtitle: 'Королівська скарбниця: Імперська Корона, Золотий Злиток 999.9, Кубок Чемпіона та Суперкар',
        price: 460,
        icon: '👑',
        accent: '#ef4444',
        probabilities: { common: 0, rare: 12, epic: 26, legendary: 38, mythic: 24 },
        pool: findPresetByIds(['imperial_crown', 'gold_bullion', 'champion_cup', 'supercar'])
    },
    {
        id: 'cyber_crypto_case',
        name: 'Cyber & Crypto Lab Box',
        subtitle: 'Кібер-лабораторія: Квантовий Дрон з пропелерами, VR-Візор, Крипто-Сейф та RTX 9090',
        price: 280,
        icon: '🛸',
        accent: '#06b6d4',
        probabilities: { common: 0, rare: 24, epic: 44, legendary: 24, mythic: 8 },
        pool: findPresetByIds(['cyber_drone', 'vision_vr', 'crypto_vault', 'gpu_vault', 'nexphone'])
    },
    {
        id: 'champions_prestige_case',
        name: 'Champions Prestige Box',
        subtitle: 'Престижний набір: Кубок Чемпіона, Флакон Парфумів, Хронограф та Геймпад ProPad',
        price: 220,
        icon: '🏆',
        accent: '#a855f7',
        probabilities: { common: 0, rare: 42, epic: 32, legendary: 20, mythic: 6 },
        pool: findPresetByIds(['champion_cup', 'royal_perfume', 'gamepad_case', 'chrono_watch'])
    },
    {
        id: 'mystery_box_starter',
        name: 'Tech & Hype Drop Box',
        subtitle: 'Базовий бокс: запаковані коробки смартфонів, кросівок, геймпадів та відеокарт для прокачки',
        price: 160,
        icon: '📦',
        accent: '#2ea6ff',
        probabilities: { common: 15, rare: 48, epic: 23, legendary: 10, mythic: 4 },
        pool: findPresetByIds(['nexphone', 'gpu_vault', 'sneaker_box', 'gamepad_case', 'royal_perfume'])
    },
    {
        id: 'vip_unboxing_vault',
        name: 'VIP All-Stars Vault',
        subtitle: 'Повне VIP-сховище з усіма 14 моделями: максимальний шанс на Mythic та Legendary 3D-подарунки',
        price: 520,
        icon: '💎',
        accent: '#f59e0b',
        probabilities: { common: 0, rare: 14, epic: 28, legendary: 34, mythic: 24 },
        pool: GIFT_PRESETS
    }
];

const WHEEL_SECTORS = [
    { index: 0, label: '🎁 3D Бокс', sub: 'Випадковий бокс', type: 'nft_box', rarity: 'epic', color: '#a855f7', weight: 14 },
    { index: 1, label: '💎 +80 NXR', sub: 'Миттєвий бонус', type: 'nxr', amount: 80, color: '#2ea6ff', weight: 22 },
    { index: 2, label: '⭐ +120 XP', sub: 'Досвід рівня', type: 'xp', amount: 120, color: '#10b981', weight: 20 },
    { index: 3, label: '💎 +160 NXR', sub: 'Подвійний куш', type: 'nxr', amount: 160, color: '#f5a623', weight: 14 },
    { index: 4, label: '👑 ДЖЕКПОТ БОКС', sub: 'Legendary/Mythic', type: 'nft_box', rarity: 'legendary', color: '#ef4444', weight: 6 },
    { index: 5, label: '💎 +50 NXR', sub: 'Втішний приз', type: 'nxr', amount: 50, color: '#3b82f6', weight: 24 },
    { index: 6, label: '🔥 +250 NXR', sub: 'Золотий сектор', type: 'nxr', amount: 250, color: '#eab308', weight: 8 },
    { index: 7, label: '🎁 Престиж Бокс', sub: '3D Коробка', type: 'nft_box', rarity: 'rare', color: '#ec4899', weight: 16 }
];

const ACHIEVEMENTS_CATALOG = [
    { id: 'first_upgrade', name: 'Перша Прокачка', desc: 'Розпакувати та прокачати коробку в 3D-NFT з фоном і значком', icon: '✨', reward_nxr: 150, reward_xp: 80, target: 1 },
    { id: 'first_case', name: 'Мисливець за Боксами', desc: 'Відкрити свій перший Drop Box у рулетці', icon: '📦', reward_nxr: 100, reward_xp: 50, target: 1 },
    { id: 'collector_5', name: 'Колекціонер', desc: 'Зібрати 5 або більше предметів у своїй колекції', icon: '🏆', reward_nxr: 250, reward_xp: 120, target: 5 },
    { id: 'staker_pro', name: 'Пасивний Дохід', desc: 'Відправити NFT або коробку у стейкінг', icon: '⚡', reward_nxr: 150, reward_xp: 80, target: 1 },
    { id: 'market_shark', name: 'Трейдер Маркету', desc: 'Купити лот, обміняти предмет або зробити ставку', icon: '💎', reward_nxr: 200, reward_xp: 100, target: 1 },
    { id: 'proposer', name: 'Автор Подарунка', desc: 'Запропонувати свою коробку/предмет на модерацію', icon: '🎨', reward_nxr: 300, reward_xp: 150, target: 1 },
    { id: 'craft_alchemist', name: 'Майстер Алхімії', desc: 'Викувати новий 3D-NFT у Кузні Злиття', icon: '🔥', reward_nxr: 220, reward_xp: 110, target: 1 },
    { id: 'cyber_magnate', name: 'Кібер-Магнат', desc: 'Досягти 5-го рівня колекціонера NEXORA', icon: '👑', reward_nxr: 400, reward_xp: 200, target: 5 }
];

const DAILY_QUESTS_CATALOG = [
    { id: 'q_upgrade_gift', name: 'Прокачати 1 коробку до 3D-NFT з фоном та значком', reward_nxr: 180, reward_xp: 90, target: 1 },
    { id: 'q_open_case', name: 'Відкрити 1 Кейс або покрутити Колесо Фортуни', reward_nxr: 120, reward_xp: 60, target: 1 },
    { id: 'q_stake_nft', name: 'Застейкати або зібрати дохід зі стейкінгу', reward_nxr: 100, reward_xp: 50, target: 1 },
    { id: 'q_market_action', name: 'Купити лот, зробити ставку або обмін на маркеті', reward_nxr: 150, reward_xp: 75, target: 1 }
];

// ============ DATABASE STATE ============
let state = {
    users: {},
    nfts: [],
    submissions: [],
    transactions: [],
    offers: [],
    trades: [],
    live_drops: [],
    counters: {
        userId: 1,
        nftId: 1,
        submissionId: 1,
        txId: 1,
        offerId: 1,
        tradeId: 1,
        dropId: 1
    }
};

function saveDatabase() {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf8');
    } catch (e) {
        console.error('Failed to save DB:', e.message);
    }
}

function loadDatabase() {
    if (fs.existsSync(DB_FILE)) {
        try {
            const raw = fs.readFileSync(DB_FILE, 'utf8');
            const parsed = JSON.parse(raw);
            if (parsed && parsed.users && Array.isArray(parsed.nfts)) {
                state = parsed;
                if (!state.trades) state.trades = [];
                if (!state.live_drops) state.live_drops = [];
                if (!state.counters.tradeId) state.counters.tradeId = 1;
                if (!state.counters.dropId) state.counters.dropId = 1;
                return true;
            }
        } catch (e) {
            console.error('Failed to load DB, seeding fresh:', e.message);
        }
    }
    return false;
}

function pushLiveDrop(playerName, actionLabel, nft) {
    if (!state.live_drops) state.live_drops = [];
    state.live_drops.unshift({
        id: state.counters.dropId++,
        player_name: playerName || 'Колекціонер',
        action_label: actionLabel,
        nft_id: nft.id,
        nft_name: nft.name,
        nft_image: nft.image_url,
        rarity: nft.rarity || 'rare',
        is_upgraded: Boolean(nft.is_upgraded),
        symbol_icon: nft.symbol_icon || '✨',
        created_at: new Date().toISOString()
    });
    if (state.live_drops.length > 20) {
        state.live_drops = state.live_drops.slice(0, 20);
    }
}

function createInitialUser(telegramId, username = 'collector', firstName = 'Колекціонер') {
    const id = state.counters.userId++;
    const user = {
        id,
        telegram_id: telegramId,
        username,
        first_name: firstName,
        balance: 3600.0,
        xp: 280,
        level: 2,
        streak_days: 1,
        last_daily_Bonus: null,
        last_free_wheel_date: null,
        last_staking_claim: new Date().toISOString(),
        unclaimed_staking: 0,
        achievements: [],
        stats: {
            upgrades: 0,
            cases_opened: 0,
            staked_ever: 1,
            market_actions: 0,
            proposals: 0,
            crafts: 0
        },
        quest_progress: {
            date: new Date().toISOString().slice(0, 10),
            counts: { q_upgrade_gift: 0, q_open_case: 0, q_stake_nft: 0, q_market_action: 0 },
            claimed: []
        },
        is_banned: false,
        created_at: new Date().toISOString()
    };
    state.users[String(telegramId)] = user;
    return user;
}

function seedDatabase() {
    if (loadDatabase()) return;

    const systemUser = createInitialUser(0, 'system', 'NEXORA Official');
    systemUser.balance = 999999;

    const whaleUser = createInitialUser(200002, 'whale_ton', 'CryptoWhale');
    whaleUser.balance = 14500;
    whaleUser.xp = 1850;
    whaleUser.level = 10;

    const previewUser = createInitialUser(100001, 'nexora_owner', 'Колекціонер');
    previewUser.balance = 3850;
    previewUser.xp = 360;
    previewUser.level = 2;

    const now = Date.now();
    const initialNfts = [
        // 1. Starter Collection: UN-UPGRADED CHRONOGRAPH WATCH BOX (Ready to test 3D Watch upgrade!)
        {
            name: 'Шкатулка Хронографа #7',
            base_box_name: 'Шкатулка Хронографа',
            revealed_name: 'Tourbillon Royal 24K',
            description: 'Лакована шкатулка з червоного дерева та золота. Натисніть «Прокачати», щоб розпакувати 3D-хронограф із живим турбійоном і рухомими стрілками!',
            rarity: 'legendary',
            price: 0,
            collection_id: 'horology_luxury',
            serial_number: 7,
            is_upgraded: false,
            upgrade_cost: 100,
            model: 'Запакована шкатулка',
            backdrop: 'Стандартний бокс',
            backdrop_gradient: 'radial-gradient(circle at 50% 45%, #2b2318 0%, #14100b 70%)',
            backdrop_glow: '#f5a623',
            symbol: 'Не розпаковано',
            symbol_icon: '📦',
            image_url: '/api/art/chrono_watch/box.svg',
            box_image_url: '/api/art/chrono_watch/box.svg',
            revealed_image_url: '/api/art/chrono_watch/item.svg',
            owner_id: previewUser.id,
            creator_id: systemUser.id,
            on_sale: false,
            sale_type: 'fixed',
            is_staked: false
        },
        // 2. Starter Collection: ALREADY UPGRADED IMPERIAL CRYSTAL CROWN (Shows 3D Crown on Pedestal!)
        {
            name: 'Imperial Crystal Crown #1',
            base_box_name: 'Імперський Ларець Корони',
            revealed_name: 'Imperial Crystal Crown',
            description: 'Імперська золота корона #1 із рубінами, сапфірами та левітуючим центральним діамантом на фоні Royal Gold.',
            rarity: 'mythic',
            price: 0,
            collection_id: 'royal_treasury',
            serial_number: 1,
            is_upgraded: true,
            upgrade_cost: 100,
            model: 'Imperial Ruby & Diamond (0.4%)',
            backdrop: 'Royal Gold (1.2%)',
            backdrop_gradient: 'radial-gradient(circle at 50% 42%, #784b08 0%, #362003 58%, #120d06 100%)',
            backdrop_glow: '#f5a623',
            symbol: 'Golden Crown (0.8%)',
            symbol_icon: '👑',
            image_url: '/api/art/imperial_crown/item.svg',
            box_image_url: '/api/art/imperial_crown/box.svg',
            revealed_image_url: '/api/art/imperial_crown/item.svg',
            owner_id: previewUser.id,
            creator_id: systemUser.id,
            on_sale: false,
            sale_type: 'fixed',
            is_staked: true,
            staked_at: new Date(now - 1000 * 60 * 180).toISOString()
        },
        // 3. Starter Collection: ALREADY UPGRADED QUANTUM DRONE (Shows 3D Drone with 4 spinning rotors!)
        {
            name: 'Quantum Quad-Drone X9 #14',
            base_box_name: 'Тактичний Кейс Дрона',
            revealed_name: 'Quantum Quad-Drone X9',
            description: 'Прокачаний 3D кібер-дрон із чотирма активними роторами та гіроскопічним лазерним сканером на фоні Arctic Cyan.',
            rarity: 'epic',
            price: 0,
            collection_id: 'cyber_crypto',
            serial_number: 14,
            is_upgraded: true,
            upgrade_cost: 100,
            model: 'Carbon Stealth 8K Gimbal (1.2%)',
            backdrop: 'Arctic Cyan (2.1%)',
            backdrop_gradient: 'radial-gradient(circle at 50% 42%, #0e5c6b 0%, #072c36 58%, #06141a 100%)',
            backdrop_glow: '#06b6d4',
            symbol: 'High Voltage (2.0%)',
            symbol_icon: '⚡',
            image_url: '/api/art/cyber_drone/item.svg',
            box_image_url: '/api/art/cyber_drone/box.svg',
            revealed_image_url: '/api/art/cyber_drone/item.svg',
            owner_id: previewUser.id,
            creator_id: systemUser.id,
            on_sale: false,
            sale_type: 'fixed',
            is_staked: false
        },
        // 4. Starter Collection: UN-UPGRADED SEALED PHONE BOX
        {
            name: 'Коробка NexPhone #12',
            base_box_name: 'Коробка NexPhone',
            revealed_name: 'NexPhone 16 Titanium',
            description: 'Запакована фірмова коробка смартфона з голографічною пломбою. Натисніть «Прокачати», щоб розпакувати сам телефон!',
            rarity: 'legendary',
            price: 0,
            collection_id: 'tech_drop',
            serial_number: 12,
            is_upgraded: false,
            upgrade_cost: 100,
            model: 'Запакована коробка',
            backdrop: 'Стандартний бокс',
            backdrop_gradient: 'radial-gradient(circle at 50% 45%, #232d3b 0%, #111722 70%)',
            backdrop_glow: '#2ea6ff',
            symbol: 'Не розпаковано',
            symbol_icon: '📦',
            image_url: '/src/assets/images/gift_box_phone_1791712954553.jpg',
            box_image_url: '/src/assets/images/gift_box_phone_1791712954553.jpg',
            revealed_image_url: '/src/assets/images/gift_item_phone_1791712963927.jpg',
            owner_id: previewUser.id,
            creator_id: systemUser.id,
            on_sale: false,
            sale_type: 'fixed',
            is_staked: false
        },
        // 5. Starter Collection: ALREADY UPGRADED HYPERCAR
        {
            name: 'HyperCar Rose-Gold #3',
            base_box_name: 'Карбоновий Бокс Авто',
            revealed_name: 'HyperCar Rose-Gold',
            description: 'Розпакований колекційний гіперкар 1:18 із рожевого золота та карбону з фоном Crimson Flame.',
            rarity: 'mythic',
            price: 0,
            collection_id: 'motorsport_club',
            serial_number: 3,
            is_upgraded: true,
            upgrade_cost: 100,
            model: 'Rose-Gold Carbon 1:18 (0.5%)',
            backdrop: 'Crimson Flame (0.9%)',
            backdrop_gradient: 'radial-gradient(circle at 50% 42%, #7c1926 0%, #3b0b12 58%, #170609 100%)',
            backdrop_glow: '#ef4444',
            symbol: 'Plasma Flame (1.6%)',
            symbol_icon: '🔥',
            image_url: '/src/assets/images/gift_item_supercar_1791713069652.jpg',
            box_image_url: '/src/assets/images/gift_box_supercar_1791713059172.jpg',
            revealed_image_url: '/src/assets/images/gift_item_supercar_1791713069652.jpg',
            owner_id: previewUser.id,
            creator_id: systemUser.id,
            on_sale: false,
            sale_type: 'fixed',
            is_staked: false
        },
        // ============ MARKETPLACE ITEMS (Showcase all new 3D models!) ============
        {
            name: 'Tourbillon Royal 24K #2',
            base_box_name: 'Шкатулка Хронографа',
            revealed_name: 'Tourbillon Royal 24K',
            description: 'Швейцарський золотий хронограф із відкритим механізмом турбійона, сапфіровим склом та живими стрілками.',
            rarity: 'mythic',
            price: 1380,
            collection_id: 'horology_luxury',
            serial_number: 2,
            is_upgraded: true,
            upgrade_cost: 100,
            model: 'Tourbillon Skeleton Gold (0.6%)',
            backdrop: 'Royal Gold (1.2%)',
            backdrop_gradient: 'radial-gradient(circle at 50% 42%, #784b08 0%, #362003 58%, #120d06 100%)',
            backdrop_glow: '#f5a623',
            symbol: 'Golden Crown (0.8%)',
            symbol_icon: '👑',
            image_url: '/api/art/chrono_watch/item.svg',
            box_image_url: '/api/art/chrono_watch/box.svg',
            revealed_image_url: '/api/art/chrono_watch/item.svg',
            owner_id: whaleUser.id,
            creator_id: systemUser.id,
            on_sale: true,
            sale_type: 'fixed',
            is_staked: false
        },
        {
            name: 'Solitaire Diamond Ring #4',
            base_box_name: 'Ювелірна Коробочка Персня',
            revealed_name: 'Solitaire Diamond Ring',
            description: 'Платиново-золотий перстень із діамантом 5 карат класичної огранки на фоні Violet Nebula.',
            rarity: 'mythic',
            price: 1290,
            collection_id: 'horology_luxury',
            serial_number: 4,
            is_upgraded: true,
            upgrade_cost: 100,
            model: 'Flawless 5ct Solitaire (0.5%)',
            backdrop: 'Violet Nebula (1.5%)',
            backdrop_gradient: 'radial-gradient(circle at 50% 42%, #521d82 0%, #270d42 58%, #0f071a 100%)',
            backdrop_glow: '#a855f7',
            symbol: 'Diamond Core (1.4%)',
            symbol_icon: '💎',
            image_url: '/api/art/diamond_ring/item.svg',
            box_image_url: '/api/art/diamond_ring/box.svg',
            revealed_image_url: '/api/art/diamond_ring/item.svg',
            owner_id: whaleUser.id,
            creator_id: systemUser.id,
            on_sale: true,
            sale_type: 'auction',
            auction_end: new Date(now + 1000 * 60 * 180).toISOString(),
            highest_bid: 1290,
            highest_bidder_id: null,
            min_bid_step: 60,
            buyout_price: 2200,
            is_staked: false
        },
        {
            name: 'Fine Gold Bar 999.9 #8',
            base_box_name: 'Броньований Тубус Злитка',
            revealed_name: 'Fine Gold Bar 999.9',
            description: 'Банківський золотий злиток 999.9 проби вагою 1 кг зі штампованим рельєфом та голографічною пломбою.',
            rarity: 'legendary',
            price: 820,
            collection_id: 'royal_treasury',
            serial_number: 8,
            is_upgraded: true,
            upgrade_cost: 100,
            model: '1KG Swiss Mint 999.9 (0.9%)',
            backdrop: 'Royal Gold (1.2%)',
            backdrop_gradient: 'radial-gradient(circle at 50% 42%, #784b08 0%, #362003 58%, #120d06 100%)',
            backdrop_glow: '#f5a623',
            symbol: 'Starlight (2.5%)',
            symbol_icon: '✦',
            image_url: '/api/art/gold_bullion/item.svg',
            box_image_url: '/api/art/gold_bullion/box.svg',
            revealed_image_url: '/api/art/gold_bullion/item.svg',
            owner_id: systemUser.id,
            creator_id: systemUser.id,
            on_sale: true,
            sale_type: 'fixed',
            is_staked: false
        },
        {
            name: 'Quantum Hardware Vault #11',
            base_box_name: 'Контейнер Крипто-Сейфа',
            revealed_name: 'Quantum Hardware Vault',
            description: 'Броньований титановий крипто-сейф із активним кодовим диском та смарагдовим неоновим кільцем.',
            rarity: 'legendary',
            price: 740,
            collection_id: 'cyber_crypto',
            serial_number: 11,
            is_upgraded: true,
            upgrade_cost: 100,
            model: 'Satoshi Genesis Vault (0.7%)',
            backdrop: 'Cyber Emerald (1.8%)',
            backdrop_gradient: 'radial-gradient(circle at 50% 42%, #0c5938 0%, #062b1c 58%, #071410 100%)',
            backdrop_glow: '#10b981',
            symbol: 'Cyber Shield (2.2%)',
            symbol_icon: '🛡️',
            image_url: '/api/art/crypto_vault/item.svg',
            box_image_url: '/api/art/crypto_vault/box.svg',
            revealed_image_url: '/api/art/crypto_vault/item.svg',
            owner_id: whaleUser.id,
            creator_id: systemUser.id,
            on_sale: true,
            sale_type: 'fixed',
            is_staked: false
        },
        {
            name: 'Grand Champion Chalice #5',
            base_box_name: 'Кофр Кубка Чемпіона',
            revealed_name: 'Grand Champion Chalice',
            description: 'Золотий кубок чемпіона світу на мармурово-золотому постаменті з левітуючою зіркою переможця.',
            rarity: 'legendary',
            price: 690,
            collection_id: 'champions_prestige',
            serial_number: 5,
            is_upgraded: true,
            upgrade_cost: 100,
            model: 'World Finals 24K Chalice (0.8%)',
            backdrop: 'Midnight Sapphire (2.4%)',
            backdrop_gradient: 'radial-gradient(circle at 50% 42%, #134678 0%, #09223d 58%, #07111e 100%)',
            backdrop_glow: '#2ea6ff',
            symbol: 'Trophy Crest (1.2%)',
            symbol_icon: '🏆',
            image_url: '/api/art/champion_cup/item.svg',
            box_image_url: '/api/art/champion_cup/box.svg',
            revealed_image_url: '/api/art/champion_cup/item.svg',
            owner_id: systemUser.id,
            creator_id: systemUser.id,
            on_sale: true,
            sale_type: 'auction',
            auction_end: new Date(now + 1000 * 60 * 140).toISOString(),
            highest_bid: 690,
            highest_bidder_id: null,
            min_bid_step: 45,
            buyout_price: 1200,
            is_staked: false
        },
        {
            name: 'Vision Cyber Visor Pro #19',
            base_box_name: 'Капсула Нейро-Шолома',
            revealed_name: 'Vision Cyber Visor Pro',
            description: 'Просторовий 3D нейро-шолом із вигнутим сапфіровим склом та пульсуючою неоновою хвилею.',
            rarity: 'epic',
            price: 520,
            collection_id: 'cyber_crypto',
            serial_number: 19,
            is_upgraded: true,
            upgrade_cost: 100,
            model: 'Spatial Glass 24K Edition (1.3%)',
            backdrop: 'Arctic Cyan (2.1%)',
            backdrop_gradient: 'radial-gradient(circle at 50% 42%, #0e5c6b 0%, #072c36 58%, #06141a 100%)',
            backdrop_glow: '#06b6d4',
            symbol: 'Rocket Boost (1.9%)',
            symbol_icon: '🚀',
            image_url: '/api/art/vision_vr/item.svg',
            box_image_url: '/api/art/vision_vr/box.svg',
            revealed_image_url: '/api/art/vision_vr/item.svg',
            owner_id: systemUser.id,
            creator_id: systemUser.id,
            on_sale: true,
            sale_type: 'fixed',
            is_staked: false
        },
        {
            name: 'Royal Oud Elixir Flacon #22',
            base_box_name: 'Оксамитовий Футляр Еліксиру',
            revealed_name: 'Royal Oud Elixir Flacon',
            description: 'Гранований кришталевий флакон королівського еліксиру із золотим розпилювачем 24K.',
            rarity: 'rare',
            price: 340,
            collection_id: 'champions_prestige',
            serial_number: 22,
            is_upgraded: true,
            upgrade_cost: 100,
            model: 'Baccarat Crystal Gold (1.5%)',
            backdrop: 'Crimson Flame (0.9%)',
            backdrop_gradient: 'radial-gradient(circle at 50% 42%, #7c1926 0%, #3b0b12 58%, #170609 100%)',
            backdrop_glow: '#ef4444',
            symbol: 'Starlight (2.5%)',
            symbol_icon: '✦',
            image_url: '/api/art/royal_perfume/item.svg',
            box_image_url: '/api/art/royal_perfume/box.svg',
            revealed_image_url: '/api/art/royal_perfume/item.svg',
            owner_id: whaleUser.id,
            creator_id: systemUser.id,
            on_sale: true,
            sale_type: 'fixed',
            is_staked: false
        },
        {
            name: 'NexPhone 16 Titanium #1',
            base_box_name: 'Коробка NexPhone',
            revealed_name: 'NexPhone 16 Titanium',
            description: 'Перший серійний випуск #1! Розпакований титановий смартфон із золотими вставками 24K, фоном Violet Nebula та діамантами ззаду.',
            rarity: 'mythic',
            price: 1450,
            collection_id: 'tech_drop',
            serial_number: 1,
            is_upgraded: true,
            upgrade_cost: 100,
            model: 'Titanium 24K Gold (0.8%)',
            backdrop: 'Violet Nebula (1.5%)',
            backdrop_gradient: 'radial-gradient(circle at 50% 42%, #521d82 0%, #270d42 58%, #0f071a 100%)',
            backdrop_glow: '#a855f7',
            symbol: 'Diamond Core (1.4%)',
            symbol_icon: '💎',
            image_url: '/src/assets/images/gift_item_phone_1791712963927.jpg',
            box_image_url: '/src/assets/images/gift_box_phone_1791712954553.jpg',
            revealed_image_url: '/src/assets/images/gift_item_phone_1791712963927.jpg',
            owner_id: systemUser.id,
            creator_id: systemUser.id,
            on_sale: true,
            sale_type: 'fixed',
            is_staked: false
        },
        {
            name: 'RTX 9090 Liquid Gold #5',
            base_box_name: 'Сейф Відеокарти',
            revealed_name: 'RTX 9090 Liquid Gold',
            description: 'Прокачана золота відеокарта з трьома турбінами, смарагдовим фоном Cyber Emerald та блискавками ззаду.',
            rarity: 'legendary',
            price: 680,
            collection_id: 'tech_drop',
            serial_number: 5,
            is_upgraded: true,
            upgrade_cost: 100,
            model: 'Founders Gold 24GB (1.1%)',
            backdrop: 'Cyber Emerald (1.8%)',
            backdrop_gradient: 'radial-gradient(circle at 50% 42%, #0c5938 0%, #062b1c 58%, #071410 100%)',
            backdrop_glow: '#10b981',
            symbol: 'High Voltage (2.0%)',
            symbol_icon: '⚡',
            image_url: '/src/assets/images/gift_item_gpu_1791713008994.jpg',
            box_image_url: '/src/assets/images/gift_box_gpu_1791712997798.jpg',
            revealed_image_url: '/src/assets/images/gift_item_gpu_1791713008994.jpg',
            owner_id: systemUser.id,
            creator_id: systemUser.id,
            on_sale: true,
            sale_type: 'fixed',
            is_staked: false
        }
    ];

    for (const item of initialNfts) {
        const created = {
            id: state.counters.nftId++,
            ...item,
            created_at: new Date().toISOString()
        };
        state.nfts.push(created);
    }

    // Seed initial Live Drops for the top ticker
    pushLiveDrop('CryptoWhale', '✨ Прокачав 3D', state.nfts[5]);
    pushLiveDrop('Колекціонер', '👑 Вибив Mythic', state.nfts[1]);
    pushLiveDrop('Maksym_UA', '🎲 Відкрив кейс', state.nfts[2]);
    pushLiveDrop('Elena_TON', '💎 Виграв у Колесі', state.nfts[7]);
    pushLiveDrop('CyberNinja', '🔥 Викував у Кузні', state.nfts[6]);

    // Seed a sample player proposal
    state.submissions.push({
        id: state.counters.submissionId++,
        user_id: previewUser.id,
        telegram_id: previewUser.telegram_id,
        author_name: 'Maksym_UA',
        name: 'Шкатулка Tourbillon Emerald',
        revealed_name: 'Tourbillon Emerald 24K',
        description: 'Пропоную лімітовану смарагдову версію 3D-хронографа з золотим турбійоном!',
        model: 'Emerald Skeleton (0.7%)',
        backdrop: 'Cyber Emerald',
        suggested_rarity: 'legendary',
        image_url: '/api/art/chrono_watch/box.svg',
        box_image_url: '/api/art/chrono_watch/box.svg',
        revealed_image_url: '/api/art/chrono_watch/item.svg',
        desired_price: 0,
        status: 'pending',
        reject_reason: null,
        reviewed_by: null,
        created_at: new Date(now - 1000 * 60 * 25).toISOString()
    });

    // Seed a sample incoming price offer
    state.offers.push({
        id: state.counters.offerId++,
        nft_id: 2,
        buyer_id: whaleUser.id,
        buyer_name: 'CryptoWhale',
        seller_id: previewUser.id,
        amount: 1450,
        status: 'pending',
        created_at: new Date(now - 1000 * 60 * 40).toISOString()
    });

    // Seed a sample incoming P2P NFT-for-NFT Trade Offer (Whale offers Quantum Hardware Vault #11 + 120 NXR for Player's HyperCar #3)
    state.trades.push({
        id: state.counters.tradeId++,
        target_nft_id: 5,
        offered_nft_id: 9,
        buyer_id: whaleUser.id,
        buyer_name: 'CryptoWhale',
        seller_id: previewUser.id,
        cash_bonus_nxr: 150,
        status: 'pending',
        created_at: new Date(now - 1000 * 60 * 18).toISOString()
    });

    logTx(previewUser.id, 'daily_bonus', 3850, 'Стартовий баланс колекціонера NEXORA v5.0');
    saveDatabase();
}

seedDatabase();

// ============ HELPERS ============
function logTx(userId, txType, amount, description = '', relatedNftId = null) {
    state.transactions.push({
        id: state.counters.txId++,
        user_id: userId,
        tx_type: txType,
        amount,
        description,
        related_nft_id: relatedNftId,
        created_at: new Date().toISOString()
    });
}

function getRankTitle(level = 1) {
    if (level >= 10) return '👑 Легенда NEXORA';
    if (level >= 7) return '💎 Кібер-Магнат';
    if (level >= 5) return '🔥 Елітний Трейдер';
    if (level >= 3) return '✨ Колекціонер 3D';
    return '📦 Шукач Дропів';
}

function ensureUserStats(user) {
    if (!user.stats) {
        const myNfts = state.nfts.filter(n => n.owner_id === user.id);
        user.stats = {
            upgrades: (user.achievements || []).includes('first_upgrade') ? 1 : 0,
            cases_opened: (user.achievements || []).includes('first_case') ? 1 : 0,
            staked_ever: myNfts.some(n => n.is_staked) || (user.achievements || []).includes('staker_pro') ? 1 : 0,
            market_actions: (user.achievements || []).includes('market_shark') ? 1 : 0,
            proposals: state.submissions.some(s => s.user_id === user.id) ? 1 : 0,
            crafts: (user.achievements || []).includes('craft_alchemist') ? 1 : 0
        };
    }
}

function addXp(user, amount) {
    user.xp = (user.xp || 0) + amount;
    const prevLevel = user.level || 1;
    const newLevel = Math.floor(user.xp / 200) + 1;
    let leveledUp = null;
    if (newLevel > prevLevel) {
        const levelDiff = newLevel - prevLevel;
        const bonus = levelDiff * 150;
        user.level = newLevel;
        user.balance += bonus;
        logTx(user.id, 'level_up', bonus, `Нагорода за досягнення Рівня ${newLevel} (+${bonus} NXR)!`);
        leveledUp = { new_level: newLevel, bonus_nxr: bonus, rank_title: getRankTitle(newLevel) };
    }
    if (user.level >= 5) {
        unlockAchievement(user, 'cyber_magnate');
    }
    return leveledUp;
}

function ensureQuestState(user) {
    const today = new Date().toISOString().slice(0, 10);
    if (!user.quest_progress || user.quest_progress.date !== today) {
        user.quest_progress = {
            date: today,
            counts: { q_upgrade_gift: 0, q_open_case: 0, q_stake_nft: 0, q_market_action: 0 },
            claimed: []
        };
    }
}

function incrementQuest(user, questId) {
    ensureQuestState(user);
    user.quest_progress.counts[questId] = (user.quest_progress.counts[questId] || 0) + 1;
}

function unlockAchievement(user, achId) {
    if (!user.achievements) user.achievements = [];
    if (user.achievements.includes(achId)) return null;
    const ach = ACHIEVEMENTS_CATALOG.find(a => a.id === achId);
    if (!ach) return null;
    user.achievements.push(achId);
    user.balance += ach.reward_nxr;
    addXp(user, ach.reward_xp);
    logTx(user.id, 'achievement', ach.reward_nxr, `🏅 Досягнення: "${ach.name}" (+${ach.reward_nxr} NXR)`);
    return ach;
}

function getAchievementProgress(user, achId) {
    ensureUserStats(user);
    const myNfts = state.nfts.filter(n => n.owner_id === user.id);
    const unlocked = (user.achievements || []).includes(achId);
    switch (achId) {
        case 'first_upgrade':
            return unlocked ? 1 : Math.min(1, user.stats.upgrades || 0);
        case 'first_case':
            return unlocked ? 1 : Math.min(1, user.stats.cases_opened || 0);
        case 'collector_5':
            return unlocked ? 5 : Math.min(5, myNfts.length);
        case 'staker_pro':
            return unlocked ? 1 : (myNfts.some(n => n.is_staked) ? 1 : Math.min(1, user.stats.staked_ever || 0));
        case 'market_shark':
            return unlocked ? 1 : Math.min(1, user.stats.market_actions || 0);
        case 'proposer':
            return unlocked ? 1 : Math.min(1, user.stats.proposals || 0);
        case 'craft_alchemist':
            return unlocked ? 1 : Math.min(1, user.stats.crafts || 0);
        case 'cyber_magnate':
            return unlocked ? 5 : Math.min(5, user.level || 1);
        default:
            return unlocked ? 1 : 0;
    }
}

function checkAutoAchievements(user) {
    ensureUserStats(user);
    const unlockedList = [];
    const myNfts = state.nfts.filter(n => n.owner_id === user.id);
    if (myNfts.length >= 5) {
        const a = unlockAchievement(user, 'collector_5');
        if (a) unlockedList.push(a);
    }
    if ((user.level || 1) >= 5) {
        const a = unlockAchievement(user, 'cyber_magnate');
        if (a) unlockedList.push(a);
    }
    return unlockedList;
}

function getCollectionMeta(collectionId) {
    return COLLECTIONS_CATALOG.find(c => c.id === collectionId) || {
        id: 'tech_drop',
        name: 'NexTech Hardware',
        icon: '📱'
    };
}

function getNftDailyYield(nft) {
    const base = RARITY_STAKING_RATES[nft.rarity] || 15;
    return nft.is_upgraded ? base : Math.round(base * 0.45);
}

function getNftEstimatedValue(nft) {
    if (nft.on_sale && nft.price > 0) return nft.price;
    const baseValues = { common: 110, rare: 240, epic: 420, legendary: 780, mythic: 1450 };
    const base = baseValues[nft.rarity] || 180;
    return nft.is_upgraded ? base : Math.round(base * 0.65);
}

function enrichNft(nft, currentUserId = null) {
    const col = getCollectionMeta(nft.collection_id);
    const owner = Object.values(state.users).find(u => u.id === nft.owner_id);
    const highestBidder = nft.highest_bidder_id
        ? Object.values(state.users).find(u => u.id === nft.highest_bidder_id)
        : null;
    return {
        ...nft,
        collection_name: col.name,
        collection_icon: col.icon,
        daily_yield: getNftDailyYield(nft),
        estimated_value: getNftEstimatedValue(nft),
        owner_name: owner ? (owner.first_name || owner.username || 'Колекціонер') : 'NEXORA Official',
        highest_bidder_name: highestBidder ? (highestBidder.first_name || highestBidder.username) : null,
        is_mine: currentUserId ? nft.owner_id === currentUserId : false,
        market_status: nft.on_sale
            ? (nft.sale_type === 'auction' ? 'auction' : 'on_sale')
            : (nft.is_staked ? 'staked' : 'in_collection')
    };
}

function rollWeightedRarity(probabilities = {}) {
    const entries = Object.entries(probabilities).filter(([, weight]) => weight > 0);
    const totalWeight = entries.reduce((acc, [, w]) => acc + w, 0);
    if (totalWeight <= 0) return 'rare';
    let random = Math.random() * totalWeight;
    for (const [rarity, weight] of entries) {
        if (random < weight) return rarity;
        random -= weight;
    }
    return entries[entries.length - 1][0];
}

function calculateUserStakingStats(user) {
    const myNfts = state.nfts.filter(n => n.owner_id === user.id);
    const stakedNfts = myNfts.filter(n => n.is_staked);

    const completedSets = [];
    let multiplier = 1.0;

    for (const col of COLLECTIONS_CATALOG) {
        const ownedInCol = myNfts.filter(n => n.collection_id === col.id && n.is_upgraded);
        if (ownedInCol.length >= col.required_count) {
            completedSets.push(col.id);
            multiplier += col.staking_multiplier_bonus;
        }
    }

    let baseDailyRate = 0;
    for (const nft of stakedNfts) {
        baseDailyRate += getNftDailyYield(nft);
    }

    const totalDailyRate = Math.round(baseDailyRate * multiplier);

    const now = Date.now();
    const lastClaim = user.last_staking_claim ? new Date(user.last_staking_claim).getTime() : now;
    const elapsedHours = Math.max(0, (now - lastClaim) / (1000 * 60 * 60));
    const accrued = (totalDailyRate / 24) * elapsedHours;
    const demoBoost = stakedNfts.length > 0 ? Math.min(elapsedHours * 12, totalDailyRate * 0.5) : 0;
    const pendingYield = Number(((user.unclaimed_staking || 0) + accrued + demoBoost).toFixed(2));

    return {
        stakedCount: stakedNfts.length,
        baseDailyRate,
        multiplier: Number(multiplier.toFixed(2)),
        totalDailyRate,
        pendingYield,
        completedSets
    };
}

function settleExpiredAuctions() {
    const now = Date.now();
    let changed = false;
    for (const nft of state.nfts) {
        if (nft.on_sale && nft.sale_type === 'auction' && nft.auction_end) {
            if (new Date(nft.auction_end).getTime() <= now) {
                if (nft.highest_bidder_id) {
                    const seller = Object.values(state.users).find(u => u.id === nft.owner_id);
                    if (seller) {
                        seller.balance += nft.highest_bid;
                        logTx(seller.id, 'sale', nft.highest_bid, `Аукціон завершено: ${nft.name}`, nft.id);
                    }
                    nft.owner_id = nft.highest_bidder_id;
                }
                nft.on_sale = false;
                nft.sale_type = 'fixed';
                nft.auction_end = null;
                nft.highest_bidder_id = null;
                changed = true;
            }
        }
    }
    if (changed) saveDatabase();
}

function validateInitData(initData) {
    if (!initData) return { id: 100001, username: 'nexora_owner', first_name: 'Колекціонер' };
    try {
        const parsed = new URLSearchParams(initData);
        const hashValue = parsed.get('hash');
        parsed.delete('hash');

        if (!BOT_TOKEN) {
            const userData = parsed.get('user');
            if (userData) return JSON.parse(userData);
            return { id: 100001, username: 'nexora_owner', first_name: 'Колекціонер' };
        }

        const entries = Array.from(parsed.entries()).sort(([a], [b]) => a.localeCompare(b));
        const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');
        const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
        const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

        if (calculatedHash !== hashValue) return null;
        const userData = parsed.get('user');
        return userData ? JSON.parse(userData) : null;
    } catch {
        return { id: 100001, username: 'nexora_owner', first_name: 'Колекціонер' };
    }
}

function getOrCreateUser(tgUser) {
    const tgId = tgUser?.id || 100001;
    let user = state.users[String(tgId)];
    if (!user) {
        user = createInitialUser(tgId, tgUser?.username || 'collector', tgUser?.first_name || 'Колекціонер');
        saveDatabase();
    } else if (user.is_banned) {
        const err = new Error('Ваш акаунт заблоковано');
        err.status = 403;
        throw err;
    }
    ensureUserStats(user);
    ensureQuestState(user);
    checkAutoAchievements(user);
    return user;
}

function extractUser(req) {
    const initData = req.headers['x-telegram-init-data'] || req.query.init_data || req.body?.init_data || '';
    const tgUser = validateInitData(initData);
    if (!tgUser) {
        const err = new Error('Невірні дані авторизації');
        err.status = 401;
        throw err;
    }
    return getOrCreateUser(tgUser);
}

// ============ EXPRESS SETUP ============
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
});

app.use('/static', express.static(path.join(__dirname, 'static')));
app.use('/src/assets', express.static(path.join(__dirname, 'src', 'assets')));
app.use('/app', express.static(path.join(__dirname, 'app')));

// ============ STUDIO SVG ARTWORK GENERATOR FOR NEW 3D PRESETS ============
function renderPresetSvg(presetId, stage) {
    const isBox = stage.startsWith('box');
    const themes = {
        chrono_watch: { bg1: '#3b240c', bg2: '#120b04', accent: '#f5a623', glow: '#fde047', icon: isBox ? '📦⌚' : '⌚', label: isBox ? 'TOURBILLON BOX' : 'CHRONO 24K' },
        imperial_crown: { bg1: '#4c1130', bg2: '#14050d', accent: '#f43f5e', glow: '#fbbf24', icon: isBox ? '👑📦' : '👑', label: isBox ? 'IMPERIAL CHEST' : 'CRYSTAL CROWN' },
        gold_bullion: { bg1: '#422c06', bg2: '#140d02', accent: '#facc15', glow: '#fef08a', icon: isBox ? '🔐🪙' : '🪙', label: isBox ? 'BULLION SAFE' : '999.9 FINE GOLD' },
        cyber_drone: { bg1: '#083344', bg2: '#04131a', accent: '#06b6d4', glow: '#67e8f9', icon: isBox ? '🛸📦' : '🛸', label: isBox ? 'TACTICAL CASE' : 'QUAD-DRONE X9' },
        vr_helmet: { bg1: '#2e1065', bg2: '#0f0524', accent: '#a855f7', glow: '#38bdf8', icon: isBox ? '🥽📦' : '🥽', label: isBox ? 'NEURO CAPSULE' : 'VISION PRO 3D' },
        crypto_vault: { bg1: '#064e3b', bg2: '#031c15', accent: '#10b981', glow: '#6ee7b7', icon: isBox ? '🛡️📦' : '🔐', label: isBox ? 'ARMORED CONTAINER' : 'QUANTUM VAULT' },
        champion_cup: { bg1: '#451a03', bg2: '#170801', accent: '#f59e0b', glow: '#fde68a', icon: isBox ? '🏆📦' : '🏆', label: isBox ? 'TROPHY CASE' : 'WORLD CUP 24K' },
        royal_perfume: { bg1: '#500724', bg2: '#19020b', accent: '#ec4899', glow: '#fbcfe8', icon: isBox ? '💎📦' : '🧪', label: isBox ? 'VELVET COFFRET' : 'ELIXIR ROYAL' },
        diamond_ring: { bg1: '#0c4a6e', bg2: '#041824', accent: '#38bdf8', glow: '#e0f2fe', icon: isBox ? '💍📦' : '💍', label: isBox ? 'RING BOX' : 'SOLITAIRE 10CT' }
    };
    const t = themes[presetId] || themes.chrono_watch;

    const illustration = isBox
        ? `<g transform="translate(200,195)">
            <ellipse cx="0" cy="78" rx="95" ry="22" fill="rgba(0,0,0,0.55)"/>
            <polygon points="-75,-25 0,-62 75,-25 75,48 0,85 -75,48" fill="${t.bg1}" stroke="${t.accent}" stroke-width="4"/>
            <polygon points="-75,-25 0,-62 75,-25 0,12" fill="${t.accent}" fill-opacity="0.28" stroke="${t.glow}" stroke-width="2.5"/>
            <line x1="0" y1="-62" x2="0" y2="85" stroke="${t.glow}" stroke-width="5" stroke-dasharray="8 4"/>
            <line x1="-75" y1="10" x2="75" y2="10" stroke="${t.glow}" stroke-width="4"/>
            <circle cx="0" cy="12" r="22" fill="${t.bg2}" stroke="${t.glow}" stroke-width="3.5"/>
        </g>`
        : `<g transform="translate(200,185)">
            <ellipse cx="0" cy="92" rx="106" ry="24" fill="${t.accent}" fill-opacity="0.22" stroke="${t.glow}" stroke-width="2"/>
            <ellipse cx="0" cy="84" rx="86" ry="16" fill="${t.bg1}" stroke="${t.accent}" stroke-width="3"/>
            <circle cx="0" cy="-6" r="76" fill="${t.accent}" fill-opacity="0.16" stroke="${t.glow}" stroke-width="2.5" stroke-dasharray="10 6"/>
            <polygon points="0,-78 68,-12 42,64 -42,64 -68,-12" fill="${t.bg1}" stroke="${t.glow}" stroke-width="3.5"/>
        </g>`;

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
    <defs>
        <radialGradient id="bg" cx="50%" cy="42%" r="65%">
            <stop offset="0%" stop-color="${t.bg1}"/>
            <stop offset="65%" stop-color="${t.bg2}"/>
            <stop offset="100%" stop-color="#05070c"/>
        </radialGradient>
        <radialGradient id="halo" cx="50%" cy="45%" r="45%">
            <stop offset="0%" stop-color="${t.glow}" stop-opacity="0.45"/>
            <stop offset="100%" stop-color="${t.accent}" stop-opacity="0"/>
        </radialGradient>
    </defs>
    <rect width="400" height="400" rx="36" fill="url(#bg)"/>
    <circle cx="200" cy="185" r="145" fill="url(#halo)"/>
    ${illustration}
    <text x="200" y="198" text-anchor="middle" dominant-baseline="middle" font-size="68" filter="drop-shadow(0 6px 16px rgba(0,0,0,0.65))">${t.icon}</text>
    <rect x="65" y="324" width="270" height="38" rx="19" fill="rgba(8,12,20,0.82)" stroke="${t.accent}" stroke-width="2"/>
    <text x="200" y="348" text-anchor="middle" fill="${t.glow}" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="800" letter-spacing="2">${t.label}</text>
</svg>`;
}

// ============ API ROUTES ============

app.get('/api/art/:presetId/:stage', (req, res) => {
    const { presetId, stage } = req.params;
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(renderPresetSvg(presetId, stage || 'item.svg'));
});

app.get('/api/status', (req, res) => {
    res.json({ name: 'NEXORA NFT API', status: 'online', version: '5.0.0' });
});

app.get('/api/presets', (req, res) => {
    res.json({
        presets: GIFT_PRESETS,
        collections: COLLECTIONS_CATALOG,
        backdrops: BACKDROP_POOL,
        symbols: SYMBOL_POOL,
        wheel_sectors: WHEEL_SECTORS
    });
});

app.get('/api/live-drops', (req, res) => {
    res.json({
        drops: (state.live_drops || []).slice(0, 15)
    });
});

app.post('/api/user', (req, res) => {
    try {
        settleExpiredAuctions();
        const user = extractUser(req);
        const myNfts = state.nfts.filter(n => n.owner_id === user.id);
        const mySubs = state.submissions.filter(s => s.user_id === user.id);
        const staking = calculateUserStakingStats(user);
        const incomingOffers = state.offers.filter(o => o.seller_id === user.id && o.status === 'pending');
        const incomingTrades = (state.trades || []).filter(t => t.seller_id === user.id && t.status === 'pending');
        const pendingSubsCount = state.submissions.filter(s => s.status === 'pending').length;

        const now = new Date();
        let canClaimDaily = true;
        if (user.last_daily_Bonus) {
            const diffSec = (now.getTime() - new Date(user.last_daily_Bonus).getTime()) / 1000;
            if (diffSec < 86400) canClaimDaily = false;
        }

        const todayStr = now.toISOString().slice(0, 10);
        const freeWheelAvailable = user.last_free_wheel_date !== todayStr;

        const level = user.level || 1;
        const xp = user.xp || 0;
        const xpInLevel = xp % 200;
        const upgradedCount = myNfts.filter(n => n.is_upgraded).length;
        const boxesCount = myNfts.filter(n => !n.is_upgraded).length;
        const listedCount = myNfts.filter(n => n.on_sale).length;
        const estimatedValue = myNfts.reduce((sum, n) => sum + getNftEstimatedValue(n), 0);

        const recentTxs = state.transactions
            .filter(t => t.user_id === user.id)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 6);

        res.json({
            id: user.id,
            telegram_id: user.telegram_id,
            username: user.username,
            first_name: user.first_name,
            balance: Number(user.balance.toFixed(2)),
            xp,
            level,
            rank_title: getRankTitle(level),
            xp_in_level: xpInLevel,
            xp_level_span: 200,
            xp_next_level: level * 200,
            next_level_reward_nxr: 150,
            streak_days: user.streak_days || 1,
            nft_count: myNfts.length,
            upgraded_count: upgradedCount,
            boxes_count: boxesCount,
            listed_count: listedCount,
            estimated_value: estimatedValue,
            submissions_count: mySubs.length,
            pending_moderation_count: pendingSubsCount,
            can_claim_daily: canClaimDaily,
            free_wheel_available: freeWheelAvailable,
            wheel_spin_cost: 90,
            staking,
            achievements: user.achievements || [],
            achievements_catalog: ACHIEVEMENTS_CATALOG.map(a => ({
                ...a,
                progress: getAchievementProgress(user, a.id),
                unlocked: (user.achievements || []).includes(a.id)
            })),
            quests: DAILY_QUESTS_CATALOG.map(q => ({
                ...q,
                progress: Math.min(q.target, user.quest_progress?.counts?.[q.id] || 0),
                claimed: (user.quest_progress?.claimed || []).includes(q.id)
            })),
            recent_transactions: recentTxs,
            incoming_offers_count: incomingOffers.length + incomingTrades.length
        });
    } catch (e) {
        res.status(e.status || 500).json({ detail: e.message });
    }
});

// ============ UPGRADE SEALED BOX -> REVEALED NFT + BACKDROP + SYMBOL ============
app.post('/api/nft/upgrade', (req, res) => {
    try {
        const user = extractUser(req);
        const nftId = parseInt(req.body?.nft_id, 10);
        const nft = state.nfts.find(n => n.id === nftId && n.owner_id === user.id);

        if (!nft) return res.status(404).json({ detail: 'Подарунок не знайдено у вашій колекції' });
        if (nft.is_upgraded) return res.status(400).json({ detail: 'Цей подарунок вже прокачано до NFT!' });
        if (nft.on_sale) return res.status(400).json({ detail: 'Зніміть коробку з продажу перед прокачкою' });

        const cost = nft.upgrade_cost || 100;
        if (user.balance < cost) {
            return res.status(400).json({ detail: `Для прокачки потрібно ${cost} NXR` });
        }

        user.balance -= cost;

        const preset = GIFT_PRESETS.find(p =>
            p.box_image_url === nft.box_image_url ||
            p.revealed_image_url === nft.revealed_image_url
        );

        const rolledBackdrop = BACKDROP_POOL[Math.floor(Math.random() * BACKDROP_POOL.length)];
        const rolledSymbol = SYMBOL_POOL[Math.floor(Math.random() * SYMBOL_POOL.length)];
        const rolledModel = preset
            ? preset.models[Math.floor(Math.random() * preset.models.length)]
            : (nft.target_model || 'Collector Custom 3D (1.2%)');

        const serial = nft.serial_number || Math.floor(Math.random() * 200) + 1;
        const baseRevealedTitle = nft.revealed_name || (preset ? preset.revealed_name : nft.name.replace(/^Коробка\s+/i, ''));

        const curRarityIdx = RARITY_ORDER.indexOf(nft.rarity);
        if (curRarityIdx >= 0 && curRarityIdx < RARITY_ORDER.length - 1 && Math.random() < 0.45) {
            nft.rarity = RARITY_ORDER[curRarityIdx + 1];
        }

        nft.is_upgraded = true;
        nft.name = baseRevealedTitle.includes('#') ? baseRevealedTitle : `${baseRevealedTitle} #${serial}`;
        nft.image_url = nft.revealed_image_url || (preset ? preset.revealed_image_url : nft.image_url);
        nft.model = rolledModel;
        nft.backdrop = rolledBackdrop.name;
        nft.backdrop_gradient = rolledBackdrop.gradient;
        nft.backdrop_glow = rolledBackdrop.glow;
        nft.symbol = rolledSymbol.name;
        nft.symbol_icon = rolledSymbol.icon;
        nft.description = `Прокачаний 3D-предмет із коробки "${nft.base_box_name || 'Mystery Box'}". Модель: ${rolledModel}, Фон: ${rolledBackdrop.name}, Значок: ${rolledSymbol.name}.`;

        ensureUserStats(user);
        user.stats.upgrades = (user.stats.upgrades || 0) + 1;
        incrementQuest(user, 'q_upgrade_gift');
        const levelUp = addXp(user, 95);
        const unlockedAch = unlockAchievement(user, 'first_upgrade');
        pushLiveDrop(user.first_name || user.username, '✨ Прокачав 3D', nft);
        logTx(user.id, 'upgrade_nft', -cost, `Прокачка коробки → ${nft.name} (${rolledBackdrop.name} + ${rolledSymbol.icon})`, nft.id);
        saveDatabase();

        res.json({
            success: true,
            nft: enrichNft(nft, user.id),
            backdrops_reel: BACKDROP_POOL,
            symbols_reel: SYMBOL_POOL,
            new_balance: Number(user.balance.toFixed(2)),
            xp: user.xp,
            level: user.level,
            level_up: levelUp,
            unlocked_achievement: unlockedAch
        });
    } catch (e) {
        res.status(e.status || 500).json({ detail: e.message });
    }
});

// Transfer NFT to another player
app.post('/api/nft/transfer', (req, res) => {
    try {
        const sender = extractUser(req);
        const nftId = parseInt(req.body?.nft_id, 10);
        const recipientRaw = String(req.body?.recipient || '').trim().replace(/^@/, '');

        if (!recipientRaw) {
            return res.status(400).json({ detail: 'Вкажіть @username або Telegram ID отримувача' });
        }

        const nft = state.nfts.find(n => n.id === nftId && n.owner_id === sender.id);
        if (!nft) return res.status(404).json({ detail: 'Предмет не знайдено у вашій колекції' });
        if (nft.on_sale) return res.status(400).json({ detail: 'Спочатку зніміть предмет з продажу' });
        if (nft.is_staked) return res.status(400).json({ detail: 'Спочатку виведіть предмет зі стейкінгу' });

        let recipient = Object.values(state.users).find(u =>
            String(u.telegram_id) === recipientRaw ||
            (u.username && u.username.toLowerCase() === recipientRaw.toLowerCase()) ||
            (u.first_name && u.first_name.toLowerCase() === recipientRaw.toLowerCase())
        );

        if (!recipient) {
            const syntheticTgId = /^\d+$/.test(recipientRaw) ? parseInt(recipientRaw, 10) : Math.floor(200000 + Math.random() * 700000);
            recipient = createInitialUser(syntheticTgId, recipientRaw, recipientRaw);
        }

        if (recipient.id === sender.id) {
            return res.status(400).json({ detail: 'Не можна передати предмет самому собі' });
        }

        nft.owner_id = recipient.id;
        nft.on_sale = false;
        nft.is_staked = false;

        addXp(sender, 20);
        logTx(sender.id, 'transfer_out', 0, `Подаровано "${nft.name}" користувачу @${recipient.username || recipient.first_name}`, nft.id);
        logTx(recipient.id, 'transfer_in', 0, `Отримано в подарунок "${nft.name}" від @${sender.username || sender.first_name}`, nft.id);
        saveDatabase();

        res.json({
            success: true,
            message: `🎁 Предмет "${nft.name}" успішно передано @${recipient.username || recipient.first_name}!`
        });
    } catch (e) {
        res.status(e.status || 500).json({ detail: e.message });
    }
});

// Collection + Sets + Staking + Filters & Sorting + Incoming Offers & P2P Trades
app.post('/api/collection', (req, res) => {
    try {
        settleExpiredAuctions();
        const user = extractUser(req);
        const sort = req.query.sort || req.body?.sort || 'newest';
        const rarity = req.query.rarity || req.body?.rarity || 'all';
        const type = req.query.type || req.body?.type || 'all';
        const category = req.query.category || req.body?.category || 'all';
        const search = String(req.query.search || req.body?.search || '').trim().toLowerCase();

        const allMyNfts = state.nfts.filter(n => n.owner_id === user.id);
        let filtered = [...allMyNfts];

        if (rarity && rarity !== 'all') {
            filtered = filtered.filter(n => n.rarity === rarity);
        }
        if (type === 'upgraded') {
            filtered = filtered.filter(n => n.is_upgraded);
        } else if (type === 'box') {
            filtered = filtered.filter(n => !n.is_upgraded);
        } else if (type === 'staked') {
            filtered = filtered.filter(n => n.is_staked);
        } else if (type === 'on_sale') {
            filtered = filtered.filter(n => n.on_sale);
        }
        if (category && category !== 'all') {
            filtered = filtered.filter(n => n.collection_id === category);
        }
        if (search) {
            filtered = filtered.filter(n =>
                n.name.toLowerCase().includes(search) ||
                (n.model && n.model.toLowerCase().includes(search)) ||
                (n.backdrop && n.backdrop.toLowerCase().includes(search)) ||
                (n.symbol && n.symbol.toLowerCase().includes(search))
            );
        }

        const rarityRank = { mythic: 5, legendary: 4, epic: 3, rare: 2, common: 1 };
        if (sort === 'rarity' || sort === 'rarity_desc') {
            filtered.sort((a, b) => (rarityRank[b.rarity] || 0) - (rarityRank[a.rarity] || 0));
        } else if (sort === 'rarity_asc') {
            filtered.sort((a, b) => (rarityRank[a.rarity] || 0) - (rarityRank[b.rarity] || 0));
        } else if (sort === 'price' || sort === 'price_desc') {
            filtered.sort((a, b) => getNftEstimatedValue(b) - getNftEstimatedValue(a));
        } else if (sort === 'price_asc') {
            filtered.sort((a, b) => getNftEstimatedValue(a) - getNftEstimatedValue(b));
        } else if (sort === 'oldest') {
            filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        } else {
            filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }

        const staking = calculateUserStakingStats(user);
        const incomingOffers = state.offers
            .filter(o => o.seller_id === user.id && o.status === 'pending')
            .map(o => {
                const nft = state.nfts.find(n => n.id === o.nft_id);
                return {
                    ...o,
                    nft_name: nft?.name || 'NFT',
                    nft_image: nft?.image_url || ''
                };
            });

        const incomingTrades = (state.trades || [])
            .filter(t => t.seller_id === user.id && t.status === 'pending')
            .map(t => {
                const targetNft = state.nfts.find(n => n.id === t.target_nft_id);
                const offeredNft = state.nfts.find(n => n.id === t.offered_nft_id);
                return {
                    ...t,
                    target_nft_name: targetNft?.name || 'Ваш NFT',
                    target_nft_image: targetNft?.image_url || '',
                    target_nft_rarity: targetNft?.rarity || 'rare',
                    offered_nft_name: offeredNft?.name || 'Запропонований NFT',
                    offered_nft_image: offeredNft?.image_url || '',
                    offered_nft_rarity: offeredNft?.rarity || 'rare'
                };
            });

        const setsProgress = COLLECTIONS_CATALOG.map(col => {
            const ownedInCol = allMyNfts.filter(n => n.collection_id === col.id && n.is_upgraded);
            const currentCount = Math.min(col.required_count, ownedInCol.length);
            return {
                ...col,
                owned_count: currentCount,
                completed: currentCount >= col.required_count
            };
        });

        res.json({
            total_owned_count: allMyNfts.length,
            nfts: filtered.map(n => enrichNft(n, user.id)),
            staking,
            sets: setsProgress,
            incoming_offers: incomingOffers,
            incoming_trades: incomingTrades
        });
    } catch (e) {
        res.status(e.status || 500).json({ detail: e.message });
    }
});

// Toggle Staking
app.post('/api/staking/toggle', (req, res) => {
    try {
        const user = extractUser(req);
        const nftId = parseInt(req.body?.nft_id, 10);
        const nft = state.nfts.find(n => n.id === nftId && n.owner_id === user.id);

        if (!nft) return res.status(404).json({ detail: 'Предмет не знайдено у вашій колекції' });
        if (nft.on_sale) return res.status(400).json({ detail: 'Спочатку зніміть предмет з продажу на маркеті' });

        const currentStats = calculateUserStakingStats(user);
        user.unclaimed_staking = currentStats.pendingYield;
        user.last_staking_claim = new Date().toISOString();

        nft.is_staked = !nft.is_staked;
        nft.staked_at = nft.is_staked ? new Date().toISOString() : null;

        let unlockedAch = null;
        if (nft.is_staked) {
            ensureUserStats(user);
            user.stats.staked_ever = (user.stats.staked_ever || 0) + 1;
            incrementQuest(user, 'q_stake_nft');
            unlockedAch = unlockAchievement(user, 'staker_pro');
        }

        saveDatabase();
        const updatedStats = calculateUserStakingStats(user);

        res.json({
            success: true,
            is_staked: nft.is_staked,
            staking: updatedStats,
            unlocked_achievement: unlockedAch,
            message: nft.is_staked
                ? `⚡ "${nft.name}" додано у стейкінг (+${getNftDailyYield(nft)} NXR/день)`
                : `📤 "${nft.name}" виведено зі стейкінгу`
        });
    } catch (e) {
        res.status(e.status || 500).json({ detail: e.message });
    }
});

// Claim Staking Yield
app.post('/api/staking/claim', (req, res) => {
    try {
        const user = extractUser(req);
        const stats = calculateUserStakingStats(user);
        if (stats.pendingYield < 0.5) {
            return res.status(400).json({ detail: 'Мінімальна сума для збору: 0.5 NXR' });
        }

        const claimed = stats.pendingYield;
        user.balance += claimed;
        user.unclaimed_staking = 0;
        user.last_staking_claim = new Date().toISOString();
        incrementQuest(user, 'q_stake_nft');
        const levelUp = addXp(user, 25);
        logTx(user.id, 'staking_claim', claimed, `Збір пасивного доходу зі стейкінгу (+${claimed} NXR)`);
        saveDatabase();

        res.json({
            success: true,
            claimed,
            new_balance: Number(user.balance.toFixed(2)),
            staking: calculateUserStakingStats(user),
            level_up: levelUp
        });
    } catch (e) {
        res.status(e.status || 500).json({ detail: e.message });
    }
});

// ============ DROP BOXES, ROULETTE & WHEEL OF FORTUNE ============
app.get('/api/cases', (req, res) => {
    let freeWheelAvailable = true;
    try {
        const user = extractUser(req);
        const todayStr = new Date().toISOString().slice(0, 10);
        freeWheelAvailable = user.last_free_wheel_date !== todayStr;
    } catch {}

    res.json({
        free_wheel_available: freeWheelAvailable,
        wheel_spin_cost: 90,
        wheel_sectors: WHEEL_SECTORS,
        cases: CASES_CATALOG.map(c => ({
            ...c,
            pool: c.pool.map(p => ({
                ...p,
                daily_yield_box: Math.round((RARITY_STAKING_RATES[p.rarity] || 45) * 0.45),
                daily_yield_upgraded: RARITY_STAKING_RATES[p.rarity] || 45
            }))
        }))
    });
});

app.post('/api/wheel/spin', (req, res) => {
    try {
        const user = extractUser(req);
        const todayStr = new Date().toISOString().slice(0, 10);
        const isFree = user.last_free_wheel_date !== todayStr;
        const spinCost = isFree ? 0 : 90;

        if (!isFree && user.balance < spinCost) {
            return res.status(400).json({ detail: `Для додаткового спіна потрібно ${spinCost} NXR` });
        }

        if (isFree) {
            user.last_free_wheel_date = todayStr;
        } else {
            user.balance -= spinCost;
        }

        // Weighted sector selection
        const totalWeight = WHEEL_SECTORS.reduce((sum, s) => sum + s.weight, 0);
        let rand = Math.random() * totalWeight;
        let chosenSector = WHEEL_SECTORS[0];
        for (const sector of WHEEL_SECTORS) {
            if (rand < sector.weight) {
                chosenSector = sector;
                break;
            }
            rand -= sector.weight;
        }

        let wonNft = null;
        let rewardSummary = '';

        if (chosenSector.type === 'nxr') {
            user.balance += chosenSector.amount;
            rewardSummary = `+${chosenSector.amount} NXR на баланс!`;
            logTx(user.id, 'wheel_win', chosenSector.amount - spinCost, `Колесо Фортуни: виграно ${chosenSector.amount} NXR`);
        } else if (chosenSector.type === 'xp') {
            addXp(user, chosenSector.amount);
            rewardSummary = `+${chosenSector.amount} XP до рівня колекціонера!`;
            logTx(user.id, 'wheel_win', -spinCost, `Колесо Фортуни: виграно +${chosenSector.amount} XP`);
        } else if (chosenSector.type === 'nft_box') {
            const targetPool = chosenSector.rarity === 'legendary'
                ? GIFT_PRESETS.filter(p => p.rarity === 'legendary' || p.rarity === 'mythic')
                : GIFT_PRESETS;
            const template = targetPool[Math.floor(Math.random() * targetPool.length)] || GIFT_PRESETS[0];
            const serialNumber = Math.floor(Math.random() * 450) + 10;

            const newNft = {
                id: state.counters.nftId++,
                name: `${template.box_name} #${serialNumber}`,
                base_box_name: template.box_name,
                revealed_name: template.revealed_name,
                description: template.description,
                rarity: chosenSector.rarity === 'legendary' ? template.rarity : (template.rarity || 'epic'),
                price: 0,
                collection_id: template.collection_id,
                serial_number: serialNumber,
                is_upgraded: false,
                upgrade_cost: 100,
                model: 'Запакована коробка',
                backdrop: 'Стандартний бокс',
                backdrop_gradient: 'radial-gradient(circle at 50% 45%, #232d3b 0%, #111722 70%)',
                backdrop_glow: '#f5a623',
                symbol: 'Не розпаковано',
                symbol_icon: '📦',
                image_url: template.box_image_url,
                box_image_url: template.box_image_url,
                revealed_image_url: template.revealed_image_url,
                owner_id: user.id,
                creator_id: 1,
                on_sale: false,
                sale_type: 'fixed',
                is_staked: false,
                created_at: new Date().toISOString()
            };
            state.nfts.push(newNft);
            wonNft = enrichNft(newNft, user.id);
            rewardSummary = `🎁 3D-Коробка: "${newNft.name}"!`;
            pushLiveDrop(user.first_name || user.username, '🎡 Виграв у Колесі', newNft);
            logTx(user.id, 'wheel_win', -spinCost, `Колесо Фортуни: виграно "${newNft.name}"`, newNft.id);
        }

        incrementQuest(user, 'q_open_case');
        const levelUp = addXp(user, 30);
        const autoAchs = checkAutoAchievements(user);
        saveDatabase();

        res.json({
            success: true,
            sector_index: chosenSector.index,
            sector: chosenSector,
            reward_summary: rewardSummary,
            won_nft: wonNft,
            free_wheel_available: false,
            new_balance: Number(user.balance.toFixed(2)),
            xp: user.xp,
            level: user.level,
            level_up: levelUp,
            unlocked_achievement: autoAchs[0] || null
        });
    } catch (e) {
        res.status(e.status || 500).json({ detail: e.message });
    }
});

app.post('/api/cases/open', (req, res) => {
    try {
        const user = extractUser(req);
        const { case_id } = req.body;
        const box = CASES_CATALOG.find(c => c.id === case_id);
        if (!box) return res.status(404).json({ detail: 'Бокс не знайдено' });

        if (user.balance < box.price) {
            return res.status(400).json({ detail: `Недостатньо NXR. Потрібно ${box.price} NXR` });
        }

        user.balance -= box.price;

        const rolledRarity = rollWeightedRarity(box.probabilities);
        const matchingPresets = box.pool.filter(p => p.rarity === rolledRarity);
        const template = matchingPresets.length > 0
            ? matchingPresets[Math.floor(Math.random() * matchingPresets.length)]
            : box.pool[Math.floor(Math.random() * box.pool.length)];

        const finalRarity = RARITY_ORDER.includes(rolledRarity) ? rolledRarity : template.rarity;
        const serialNumber = Math.floor(Math.random() * 400) + 15;

        const newNft = {
            id: state.counters.nftId++,
            name: `${template.box_name} #${serialNumber}`,
            base_box_name: template.box_name,
            revealed_name: template.revealed_name,
            description: template.description,
            rarity: finalRarity,
            price: 0,
            collection_id: template.collection_id,
            serial_number: serialNumber,
            is_upgraded: false,
            upgrade_cost: 100,
            model: 'Запакована коробка',
            backdrop: 'Стандартний бокс',
            backdrop_gradient: 'radial-gradient(circle at 50% 45%, #232d3b 0%, #111722 70%)',
            backdrop_glow: '#2ea6ff',
            symbol: 'Не розпаковано',
            symbol_icon: '📦',
            image_url: template.box_image_url,
            box_image_url: template.box_image_url,
            revealed_image_url: template.revealed_image_url,
            owner_id: user.id,
            creator_id: 1,
            on_sale: false,
            sale_type: 'fixed',
            is_staked: false,
            created_at: new Date().toISOString()
        };
        state.nfts.push(newNft);

        const winnerIndex = 24;
        const totalSlots = 30;
        const rouletteStrip = [];
        for (let i = 0; i < totalSlots; i++) {
            if (i === winnerIndex) {
                rouletteStrip.push({
                    name: newNft.name,
                    revealed_name: newNft.revealed_name,
                    rarity: newNft.rarity,
                    image_url: newNft.image_url
                });
            } else {
                const sampleRarity = rollWeightedRarity(box.probabilities);
                const samplePool = box.pool.filter(p => p.rarity === sampleRarity);
                const sample = samplePool.length > 0
                    ? samplePool[Math.floor(Math.random() * samplePool.length)]
                    : box.pool[Math.floor(Math.random() * box.pool.length)];
                rouletteStrip.push({
                    name: sample.box_name,
                    revealed_name: sample.revealed_name,
                    rarity: sampleRarity || sample.rarity,
                    image_url: sample.box_image_url
                });
            }
        }

        ensureUserStats(user);
        user.stats.cases_opened = (user.stats.cases_opened || 0) + 1;
        incrementQuest(user, 'q_open_case');
        const levelUp = addXp(user, 45);
        const unlockedAch = unlockAchievement(user, 'first_case');
        const autoAchs = checkAutoAchievements(user);
        pushLiveDrop(user.first_name || user.username, '🎲 Відкрив кейс', newNft);
        logTx(user.id, 'case_open', -box.price, `Відкрито "${box.name}" → ${newNft.name} (${newNft.rarity.toUpperCase()})`, newNft.id);
        saveDatabase();

        res.json({
            success: true,
            case_name: box.name,
            won_nft: enrichNft(newNft, user.id),
            roulette_strip: rouletteStrip,
            winner_index: winnerIndex,
            new_balance: Number(user.balance.toFixed(2)),
            xp: user.xp,
            level: user.level,
            level_up: levelUp,
            unlocked_achievement: unlockedAch || autoAchs[0] || null
        });
    } catch (e) {
        res.status(e.status || 500).json({ detail: e.message });
    }
});

// ============ MARKETPLACE & P2P NFT-FOR-NFT TRADE OFFERS ============
app.get('/api/market', (req, res) => {
    settleExpiredAuctions();
    let currentUserId = null;
    try {
        const u = extractUser(req);
        currentUserId = u?.id || null;
    } catch {}

    const {
        rarity = 'all',
        category = 'all',
        item_type = 'all',
        min_price = '',
        max_price = '',
        sort = 'newest',
        search = '',
        mode = 'all'
    } = req.query;

    let nfts = state.nfts.filter(n => n.on_sale);

    if (mode === 'fixed') {
        nfts = nfts.filter(n => (n.sale_type || 'fixed') === 'fixed');
    } else if (mode === 'auction') {
        nfts = nfts.filter(n => n.sale_type === 'auction');
    } else if (mode === 'my_listings' && currentUserId) {
        nfts = nfts.filter(n => n.owner_id === currentUserId);
    }

    if (rarity && rarity !== 'all') {
        nfts = nfts.filter(n => n.rarity === rarity);
    }
    if (category && category !== 'all') {
        nfts = nfts.filter(n => n.collection_id === category);
    }
    if (item_type === 'upgraded') {
        nfts = nfts.filter(n => n.is_upgraded);
    } else if (item_type === 'box') {
        nfts = nfts.filter(n => !n.is_upgraded);
    }

    const minP = parseFloat(min_price);
    const maxP = parseFloat(max_price);
    if (!Number.isNaN(minP) && minP > 0) {
        nfts = nfts.filter(n => (n.price || 0) >= minP);
    }
    if (!Number.isNaN(maxP) && maxP > 0) {
        nfts = nfts.filter(n => (n.price || 0) <= maxP);
    }

    if (search && String(search).trim() !== '') {
        const q = String(search).trim().toLowerCase();
        nfts = nfts.filter(n =>
            n.name.toLowerCase().includes(q) ||
            (n.model && n.model.toLowerCase().includes(q)) ||
            (n.backdrop && n.backdrop.toLowerCase().includes(q)) ||
            (n.symbol && n.symbol.toLowerCase().includes(q))
        );
    }

    const rarityRank = { mythic: 5, legendary: 4, epic: 3, rare: 2, common: 1 };
    if (sort === 'price_asc') {
        nfts.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort === 'price_desc') {
        nfts.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sort === 'rarity_desc') {
        nfts.sort((a, b) => (rarityRank[b.rarity] || 0) - (rarityRank[a.rarity] || 0));
    } else if (sort === 'oldest') {
        nfts.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else {
        nfts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    const myActiveListingsCount = currentUserId
        ? state.nfts.filter(n => n.on_sale && n.owner_id === currentUserId).length
        : 0;

    res.json({
        my_listings_count: myActiveListingsCount,
        nfts: nfts.map(n => enrichNft(n, currentUserId))
    });
});

app.post('/api/nft/sell', (req, res) => {
    try {
        const user = extractUser(req);
        const nftId = parseInt(req.body?.nft_id || req.query.nft_id, 10);
        const price = parseFloat(req.body?.price ?? req.query.price ?? 0);
        const saleType = req.body?.sale_type || 'fixed';
        const durationHours = parseFloat(req.body?.duration_hours || 12);
        const buyoutPrice = parseFloat(req.body?.buyout_price || 0);

        const nft = state.nfts.find(n => n.id === nftId && n.owner_id === user.id);
        if (!nft) return res.status(404).json({ detail: 'Предмет не знайдено' });
        if (nft.is_staked) return res.status(400).json({ detail: 'Спочатку виведіть предмет зі стейкінгу' });

        if (price <= 0) {
            nft.on_sale = false;
            nft.price = 0;
            nft.sale_type = 'fixed';
            nft.auction_end = null;
            nft.highest_bid = 0;
            nft.highest_bidder_id = null;
            logTx(user.id, 'delist', 0, `Знято з продажу "${nft.name}"`, nft.id);
            saveDatabase();
            return res.json({ success: true, nft: enrichNft(nft, user.id), message: 'Лот знято з продажу' });
        }

        nft.price = price;
        nft.on_sale = true;
        nft.sale_type = saleType === 'auction' ? 'auction' : 'fixed';

        if (nft.sale_type === 'auction') {
            nft.highest_bid = price;
            nft.highest_bidder_id = null;
            nft.min_bid_step = Math.max(10, Math.round(price * 0.1));
            nft.buyout_price = buyoutPrice > price ? buyoutPrice : Math.round(price * 2);
            nft.auction_end = new Date(Date.now() + durationHours * 3600 * 1000).toISOString();
        } else {
            nft.auction_end = null;
        }

        ensureUserStats(user);
        user.stats.market_actions = (user.stats.market_actions || 0) + 1;
        incrementQuest(user, 'q_market_action');
        const unlockedAch = unlockAchievement(user, 'market_shark');
        logTx(user.id, 'list_sale', 0, `Виставлено "${nft.name}" на маркет за ${price} NXR`, nft.id);
        saveDatabase();

        res.json({
            success: true,
            nft: enrichNft(nft, user.id),
            unlocked_achievement: unlockedAch,
            message: nft.sale_type === 'auction'
                ? `Аукціон запущено зі стартовою ставкою ${price} NXR!`
                : `Виставлено на продаж за ${price} NXR!`
        });
    } catch (e) {
        res.status(e.status || 500).json({ detail: e.message });
    }
});

app.post('/api/market/buy', (req, res) => {
    try {
        settleExpiredAuctions();
        const buyer = extractUser(req);
        const nftId = parseInt(req.body?.nft_id || req.query.nft_id, 10);
        const nft = state.nfts.find(n => n.id === nftId);

        if (!nft || !nft.on_sale) {
            return res.status(404).json({ detail: 'Цей предмет вже продано або знято з продажу' });
        }
        if (nft.owner_id === buyer.id) return res.status(400).json({ detail: 'Це ваш власний лот — ви можете зняти його з продажу' });

        const purchasePrice = nft.sale_type === 'auction' ? (nft.buyout_price || nft.price * 2) : nft.price;
        if (buyer.balance < purchasePrice) {
            return res.status(400).json({ detail: `Недостатньо NXR (потрібно ${purchasePrice} NXR)` });
        }

        if (nft.sale_type === 'auction' && nft.highest_bidder_id) {
            const prevBidder = Object.values(state.users).find(u => u.id === nft.highest_bidder_id);
            if (prevBidder) {
                prevBidder.balance += nft.highest_bid;
                logTx(prevBidder.id, 'bid_refund', nft.highest_bid, `Повернення ставки (викуп лота "${nft.name}")`, nft.id);
            }
        }

        const seller = Object.values(state.users).find(u => u.id === nft.owner_id);
        buyer.balance -= purchasePrice;
        if (seller) {
            seller.balance += purchasePrice;
            logTx(seller.id, 'sale', purchasePrice, `Продаж "${nft.name}" за ${purchasePrice} NXR`, nft.id);
        }

        nft.owner_id = buyer.id;
        nft.on_sale = false;
        nft.price = 0;
        nft.sale_type = 'fixed';
        nft.auction_end = null;
        nft.highest_bidder_id = null;

        ensureUserStats(buyer);
        buyer.stats.market_actions = (buyer.stats.market_actions || 0) + 1;
        incrementQuest(buyer, 'q_market_action');
        const levelUp = addXp(buyer, 50);
        const unlockedAch = unlockAchievement(buyer, 'market_shark');
        const autoAchs = checkAutoAchievements(buyer);
        pushLiveDrop(buyer.first_name || buyer.username, '🛒 Купив на маркеті', nft);
        logTx(buyer.id, 'purchase', -purchasePrice, `Покупка "${nft.name}" на маркеті`, nft.id);
        saveDatabase();

        res.json({
            success: true,
            nft: enrichNft(nft, buyer.id),
            nft_name: nft.name,
            new_balance: Number(buyer.balance.toFixed(2)),
            level_up: levelUp,
            unlocked_achievement: unlockedAch || autoAchs[0] || null
        });
    } catch (e) {
        res.status(e.status || 500).json({ detail: e.message });
    }
});

app.post('/api/market/bid', (req, res) => {
    try {
        settleExpiredAuctions();
        const bidder = extractUser(req);
        const nftId = parseInt(req.body?.nft_id, 10);
        const bidAmount = parseFloat(req.body?.amount);

        const nft = state.nfts.find(n => n.id === nftId && n.on_sale && n.sale_type === 'auction');
        if (!nft) return res.status(404).json({ detail: 'Активний аукціон не знайдено або вже завершено' });
        if (nft.owner_id === bidder.id) return res.status(400).json({ detail: 'Не можна ставити на власний лот' });

        const minRequired = nft.highest_bidder_id
            ? nft.highest_bid + (nft.min_bid_step || 25)
            : nft.price;

        if (!bidAmount || bidAmount < minRequired) {
            return res.status(400).json({ detail: `Мінімальна ставка: ${minRequired} NXR` });
        }
        if (bidder.balance < bidAmount) {
            return res.status(400).json({ detail: 'Недостатньо NXR для ставки' });
        }

        if (nft.highest_bidder_id) {
            const prevBidder = Object.values(state.users).find(u => u.id === nft.highest_bidder_id);
            if (prevBidder) {
                prevBidder.balance += nft.highest_bid;
                logTx(prevBidder.id, 'bid_refund', nft.highest_bid, `Вашу ставку на "${nft.name}" перебили`, nft.id);
            }
        }

        bidder.balance -= bidAmount;
        nft.highest_bid = bidAmount;
        nft.price = bidAmount;
        nft.highest_bidder_id = bidder.id;

        ensureUserStats(bidder);
        bidder.stats.market_actions = (bidder.stats.market_actions || 0) + 1;
        incrementQuest(bidder, 'q_market_action');
        const levelUp = addXp(bidder, 35);
        const unlockedAch = unlockAchievement(bidder, 'market_shark');
        logTx(bidder.id, 'auction_bid', -bidAmount, `Ставка ${bidAmount} NXR на "${nft.name}"`, nft.id);
        saveDatabase();

        res.json({
            success: true,
            highest_bid: nft.highest_bid,
            new_balance: Number(bidder.balance.toFixed(2)),
            level_up: levelUp,
            unlocked_achievement: unlockedAch,
            message: `Ставку ${bidAmount} NXR прийнято!`
        });
    } catch (e) {
        res.status(e.status || 500).json({ detail: e.message });
    }
});

app.post('/api/market/offer', (req, res) => {
    try {
        const buyer = extractUser(req);
        const nftId = parseInt(req.body?.nft_id, 10);
        const amount = parseFloat(req.body?.amount);

        const nft = state.nfts.find(n => n.id === nftId);
        if (!nft) return res.status(404).json({ detail: 'Предмет не знайдено' });
        if (nft.owner_id === buyer.id) return res.status(400).json({ detail: 'Це ваш предмет' });
        if (!amount || amount < 20) return res.status(400).json({ detail: 'Мінімальний оффер — 20 NXR' });
        if (buyer.balance < amount) return res.status(400).json({ detail: 'Недостатньо NXR на балансі' });

        state.offers.push({
            id: state.counters.offerId++,
            nft_id: nft.id,
            buyer_id: buyer.id,
            buyer_name: buyer.first_name || buyer.username || 'Колекціонер',
            seller_id: nft.owner_id,
            amount,
            status: 'pending',
            created_at: new Date().toISOString()
        });

        ensureUserStats(buyer);
        buyer.stats.market_actions = (buyer.stats.market_actions || 0) + 1;
        incrementQuest(buyer, 'q_market_action');
        addXp(buyer, 20);
        saveDatabase();

        res.json({
            success: true,
            message: `Пропозицію ${amount} NXR надіслано власнику "${nft.name}"!`
        });
    } catch (e) {
        res.status(e.status || 500).json({ detail: e.message });
    }
});

app.post('/api/market/offer/respond', (req, res) => {
    try {
        const seller = extractUser(req);
        const offerId = parseInt(req.body?.offer_id, 10);
        const action = req.body?.action;

        const offer = state.offers.find(o => o.id === offerId && o.seller_id === seller.id && o.status === 'pending');
        if (!offer) return res.status(404).json({ detail: 'Оффер не знайдено' });

        if (action === 'decline') {
            offer.status = 'declined';
            saveDatabase();
            return res.json({ success: true, message: 'Оффер відхилено' });
        }

        const nft = state.nfts.find(n => n.id === offer.nft_id && n.owner_id === seller.id);
        if (!nft) {
            offer.status = 'declined';
            saveDatabase();
            return res.status(400).json({ detail: 'Предмет більше не у вашій власності' });
        }

        const buyer = Object.values(state.users).find(u => u.id === offer.buyer_id);
        if (buyer && buyer.id !== 1 && buyer.balance < offer.amount) {
            offer.status = 'declined';
            saveDatabase();
            return res.status(400).json({ detail: 'У покупця недостатньо коштів' });
        }

        if (buyer && buyer.id !== 1) {
            buyer.balance -= offer.amount;
            logTx(buyer.id, 'purchase', -offer.amount, `Оффер прийнято: "${nft.name}"`, nft.id);
        }

        seller.balance += offer.amount;
        nft.owner_id = offer.buyer_id;
        nft.on_sale = false;
        nft.is_staked = false;
        offer.status = 'accepted';

        addXp(seller, 45);
        logTx(seller.id, 'sale', offer.amount, `Прийнято оффер за "${nft.name}" (+${offer.amount} NXR)`, nft.id);
        saveDatabase();

        res.json({
            success: true,
            new_balance: Number(seller.balance.toFixed(2)),
            message: `Ви продали "${nft.name}" за ${offer.amount} NXR!`
        });
    } catch (e) {
        res.status(e.status || 500).json({ detail: e.message });
    }
});

// P2P Trade Offer: Propose swapping one of your NFTs (+ optional NXR bonus) for a Market NFT
app.post('/api/market/trade', (req, res) => {
    try {
        const buyer = extractUser(req);
        const targetNftId = parseInt(req.body?.target_nft_id, 10);
        const offeredNftId = parseInt(req.body?.offered_nft_id, 10);
        const cashBonus = Math.max(0, parseFloat(req.body?.cash_bonus_nxr || 0) || 0);

        const targetNft = state.nfts.find(n => n.id === targetNftId);
        if (!targetNft) return res.status(404).json({ detail: 'Бажаний предмет не знайдено' });
        if (targetNft.owner_id === buyer.id) return res.status(400).json({ detail: 'Це вже ваш власний предмет' });

        const offeredNft = state.nfts.find(n => n.id === offeredNftId && n.owner_id === buyer.id);
        if (!offeredNft) return res.status(404).json({ detail: 'Виберіть свій предмет із колекції для обміну' });
        if (offeredNft.is_staked) return res.status(400).json({ detail: 'Ваш предмет у стейкінгу — спочатку виведіть його' });
        if (offeredNft.on_sale) return res.status(400).json({ detail: 'Зніміть свій предмет з продажу перед обміном' });

        if (cashBonus > 0 && buyer.balance < cashBonus) {
            return res.status(400).json({ detail: `Недостатньо NXR для доплати (${cashBonus} NXR)` });
        }

        // If target NFT belongs to System (NEXORA Official), auto-evaluate fair trade immediately so player can test instant P2P swap!
        const targetVal = getNftEstimatedValue(targetNft);
        const offeredVal = getNftEstimatedValue(offeredNft);

        if (targetNft.owner_id === 1 && (offeredVal + cashBonus >= targetVal * 0.7)) {
            if (cashBonus > 0) buyer.balance -= cashBonus;
            offeredNft.owner_id = 1;
            offeredNft.on_sale = true;
            offeredNft.price = offeredVal;

            targetNft.owner_id = buyer.id;
            targetNft.on_sale = false;
            targetNft.price = 0;
            targetNft.sale_type = 'fixed';

            ensureUserStats(buyer);
            buyer.stats.market_actions = (buyer.stats.market_actions || 0) + 1;
            incrementQuest(buyer, 'q_market_action');
            const levelUp = addXp(buyer, 65);
            const unlockedAch = unlockAchievement(buyer, 'market_shark');
            pushLiveDrop(buyer.first_name || buyer.username, '🔄 Обміняв 3D-NFT', targetNft);
            logTx(buyer.id, 'trade_swap', -cashBonus, `Миттєвий P2P-обмін: "${offeredNft.name}" → "${targetNft.name}"`, targetNft.id);
            saveDatabase();

            return res.json({
                success: true,
                instant_swap: true,
                new_balance: Number(buyer.balance.toFixed(2)),
                level_up: levelUp,
                unlocked_achievement: unlockedAch,
                message: `🔄 Успішний обмін! Ви отримали "${targetNft.name}" взамін на "${offeredNft.name}"!`
            });
        }

        if (!state.trades) state.trades = [];
        state.trades.push({
            id: state.counters.tradeId++,
            target_nft_id: targetNft.id,
            offered_nft_id: offeredNft.id,
            buyer_id: buyer.id,
            buyer_name: buyer.first_name || buyer.username || 'Колекціонер',
            seller_id: targetNft.owner_id,
            cash_bonus_nxr: cashBonus,
            status: 'pending',
            created_at: new Date().toISOString()
        });

        ensureUserStats(buyer);
        buyer.stats.market_actions = (buyer.stats.market_actions || 0) + 1;
        incrementQuest(buyer, 'q_market_action');
        addXp(buyer, 25);
        saveDatabase();

        res.json({
            success: true,
            instant_swap: false,
            message: `🔄 Пропозицію обміну ("${offeredNft.name}"${cashBonus > 0 ? ` + ${cashBonus} NXR` : ''}) надіслано власнику!`
        });
    } catch (e) {
        res.status(e.status || 500).json({ detail: e.message });
    }
});

// Respond to incoming P2P Trade Offer (Accept or Decline)
app.post('/api/market/trade/respond', (req, res) => {
    try {
        const seller = extractUser(req);
        const tradeId = parseInt(req.body?.trade_id, 10);
        const action = req.body?.action;

        const trade = (state.trades || []).find(t => t.id === tradeId && t.seller_id === seller.id && t.status === 'pending');
        if (!trade) return res.status(404).json({ detail: 'Пропозицію обміну не знайдено' });

        if (action === 'decline') {
            trade.status = 'declined';
            saveDatabase();
            return res.json({ success: true, message: 'Пропозицію обміну відхилено' });
        }

        const targetNft = state.nfts.find(n => n.id === trade.target_nft_id && n.owner_id === seller.id);
        const offeredNft = state.nfts.find(n => n.id === trade.offered_nft_id && n.owner_id === trade.buyer_id);

        if (!targetNft || !offeredNft) {
            trade.status = 'declined';
            saveDatabase();
            return res.status(400).json({ detail: 'Один із предметів обміну більше недоступний' });
        }

        const buyer = Object.values(state.users).find(u => u.id === trade.buyer_id);
        const bonus = trade.cash_bonus_nxr || 0;
        if (bonus > 0 && buyer && buyer.id !== 1) {
            if (buyer.balance < bonus) {
                trade.status = 'declined';
                saveDatabase();
                return res.status(400).json({ detail: 'У ініціатора обміну недостатньо NXR для доплати' });
            }
            buyer.balance -= bonus;
        }

        seller.balance += bonus;
        targetNft.owner_id = trade.buyer_id;
        targetNft.on_sale = false;
        targetNft.is_staked = false;

        offeredNft.owner_id = seller.id;
        offeredNft.on_sale = false;
        offeredNft.is_staked = false;

        trade.status = 'accepted';
        ensureUserStats(seller);
        seller.stats.market_actions = (seller.stats.market_actions || 0) + 1;
        incrementQuest(seller, 'q_market_action');
        const levelUp = addXp(seller, 60);
        const unlockedAch = unlockAchievement(seller, 'market_shark');
        pushLiveDrop(seller.first_name || seller.username, '🔄 Завершив P2P-обмін', offeredNft);
        logTx(seller.id, 'trade_swap', bonus, `Обмін "${targetNft.name}" ⇄ "${offeredNft.name}"${bonus > 0 ? ` (+${bonus} NXR)` : ''}`, offeredNft.id);
        saveDatabase();

        res.json({
            success: true,
            new_balance: Number(seller.balance.toFixed(2)),
            level_up: levelUp,
            unlocked_achievement: unlockedAch,
            message: `🔄 Обмін завершено! Ви отримали "${offeredNft.name}"${bonus > 0 ? ` та +${bonus} NXR` : ''}!`
        });
    } catch (e) {
        res.status(e.status || 500).json({ detail: e.message });
    }
});

// ============ PLAYER PROPOSALS & ADMIN DIRECT ADDITION ============
const multiUpload = upload.fields([
    { name: 'box_image', maxCount: 1 },
    { name: 'revealed_image', maxCount: 1 },
    { name: 'image', maxCount: 1 }
]);

function saveUploadedBuffer(fileObj, prefix = 'gift') {
    const extMap = {
        'image/png': '.png',
        'image/jpeg': '.jpg',
        'image/webp': '.webp',
        'image/gif': '.gif'
    };
    const ext = extMap[fileObj.mimetype] || '.png';
    const filename = `${prefix}_${crypto.randomUUID().replace(/-/g, '')}${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);
    fs.writeFileSync(filepath, fileObj.buffer);
    return `/static/uploads/${filename}`;
}

app.post('/api/nft/submit', multiUpload, (req, res) => {
    try {
        const user = extractUser(req);
        const boxName = (req.body.name || '').trim();
        const revealedName = (req.body.revealed_name || boxName.replace(/^Коробка\s+/i, '') || boxName).trim();
        const description = (req.body.description || '').trim();
        const model = (req.body.model || 'Collector 3D (1.5%)').trim();
        const suggestedRarity = RARITY_ORDER.includes(req.body.suggested_rarity) ? req.body.suggested_rarity : 'rare';
        const desiredPrice = parseFloat(req.body.desired_price || '0') || 0;

        if (!boxName || boxName.length > 100) {
            return res.status(400).json({ detail: 'Назва коробки обовʼязкова (до 100 символів)' });
        }

        const boxFile = req.files?.box_image?.[0] || req.files?.image?.[0];
        const revealedFile = req.files?.revealed_image?.[0];

        if (!boxFile) {
            return res.status(400).json({ detail: 'Завантажте фото коробки (або подарунка)' });
        }

        const boxImageUrl = saveUploadedBuffer(boxFile, 'box');
        const revealedImageUrl = revealedFile ? saveUploadedBuffer(revealedFile, 'item') : boxImageUrl;

        const sub = {
            id: state.counters.submissionId++,
            user_id: user.id,
            telegram_id: user.telegram_id,
            author_name: user.first_name || user.username || 'Гравець',
            name: boxName,
            revealed_name: revealedName,
            description,
            model,
            suggested_rarity: suggestedRarity,
            image_url: boxImageUrl,
            box_image_url: boxImageUrl,
            revealed_image_url: revealedImageUrl,
            desired_price: desiredPrice,
            status: 'pending',
            reject_reason: null,
            reviewed_by: null,
            created_at: new Date().toISOString()
        };
        state.submissions.push(sub);
        ensureUserStats(user);
        user.stats.proposals = (user.stats.proposals || 0) + 1;
        const unlockedAch = unlockAchievement(user, 'proposer');
        const levelUp = addXp(user, 35);
        saveDatabase();

        res.json({
            success: true,
            submission_id: sub.id,
            level_up: levelUp,
            unlocked_achievement: unlockedAch,
            message: 'Пропозицію коробки та предмета надіслано власнику на розгляд!'
        });
    } catch (e) {
        res.status(e.status || 500).json({ detail: e.message });
    }
});

app.post('/api/admin/nft/create', multiUpload, (req, res) => {
    try {
        const user = extractUser(req);
        const boxName = (req.body.name || '').trim();
        const revealedName = (req.body.revealed_name || boxName).trim();
        const description = (req.body.description || '').trim();
        const rarity = RARITY_ORDER.includes(req.body.rarity) ? req.body.rarity : 'legendary';
        const collectionId = req.body.collection_id || 'horology_luxury';
        const targetModel = (req.body.model || 'Titanium Custom (1.0%)').trim();
        const initialStage = req.body.initial_stage || 'sealed_box';
        const destination = req.body.destination || 'my_collection';
        const price = parseFloat(req.body.price || '350') || 350;
        const supply = Math.min(10, Math.max(1, parseInt(req.body.supply || '1', 10)));

        const presetBoxUrl = (req.body.preset_box_url || '').trim();
        const presetRevealedUrl = (req.body.preset_revealed_url || '').trim();

        if (!boxName) {
            return res.status(400).json({ detail: 'Вкажіть назву коробки / подарунка' });
        }

        const boxFile = req.files?.box_image?.[0] || req.files?.image?.[0];
        const revealedFile = req.files?.revealed_image?.[0];

        const boxImageUrl = boxFile ? saveUploadedBuffer(boxFile, 'admin_box') : (presetBoxUrl || GIFT_PRESETS[0].box_image_url);
        const revealedImageUrl = revealedFile ? saveUploadedBuffer(revealedFile, 'admin_item') : (presetRevealedUrl || boxImageUrl);

        const existingSame = state.nfts.filter(n =>
            (n.base_box_name && n.base_box_name.toLowerCase() === boxName.toLowerCase()) ||
            n.name.toLowerCase().startsWith(boxName.toLowerCase())
        );
        let nextSerial = existingSame.length + 1;

        const createdNfts = [];
        for (let i = 0; i < supply; i++) {
            const serial = nextSerial++;
            const isUpgraded = initialStage === 'already_upgraded';
            const displayTitle = isUpgraded ? `${revealedName} #${serial}` : `${boxName} #${serial}`;
            const isMarket = destination === 'market_fixed' || destination === 'market_auction';
            const isAuction = destination === 'market_auction';

            const rolledBackdrop = BACKDROP_POOL[Math.floor(Math.random() * BACKDROP_POOL.length)];
            const rolledSymbol = SYMBOL_POOL[Math.floor(Math.random() * SYMBOL_POOL.length)];

            const nft = {
                id: state.counters.nftId++,
                name: displayTitle,
                base_box_name: boxName,
                revealed_name: revealedName,
                description: description || `Офіційний колекційний реліз. Прокачайте коробку, щоб розпакувати ${revealedName}, фон та значок!`,
                rarity,
                price: isMarket ? price : 0,
                collection_id: collectionId,
                serial_number: serial,
                is_upgraded: isUpgraded,
                upgrade_cost: 100,
                target_model: targetModel,
                model: isUpgraded ? targetModel : 'Запакована коробка',
                backdrop: isUpgraded ? rolledBackdrop.name : 'Стандартний бокс',
                backdrop_gradient: isUpgraded ? rolledBackdrop.gradient : 'radial-gradient(circle at 50% 45%, #232d3b 0%, #111722 70%)',
                backdrop_glow: isUpgraded ? rolledBackdrop.glow : '#2ea6ff',
                symbol: isUpgraded ? rolledSymbol.name : 'Не розпаковано',
                symbol_icon: isUpgraded ? rolledSymbol.icon : '📦',
                image_url: isUpgraded ? revealedImageUrl : boxImageUrl,
                box_image_url: boxImageUrl,
                revealed_image_url: revealedImageUrl,
                owner_id: isMarket ? 1 : user.id,
                creator_id: user.id,
                on_sale: isMarket,
                sale_type: isAuction ? 'auction' : 'fixed',
                auction_end: isAuction ? new Date(Date.now() + 12 * 3600 * 1000).toISOString() : null,
                highest_bid: isAuction ? price : 0,
                highest_bidder_id: null,
                min_bid_step: isAuction ? Math.max(10, Math.round(price * 0.1)) : 0,
                buyout_price: isAuction ? Math.round(price * 2) : 0,
                is_staked: false,
                created_at: new Date().toISOString()
            };
            state.nfts.push(nft);
            createdNfts.push(nft);
        }

        saveDatabase();
        res.json({
            success: true,
            created_count: createdNfts.length,
            nft: enrichNft(createdNfts[0], user.id),
            message: `✅ Додано ${createdNfts.length} шт. "${createdNfts[0].name}"!`
        });
    } catch (e) {
        res.status(e.status || 500).json({ detail: e.message });
    }
});

// ============ MYTHIC FORGE / CRAFTING 3+ ITEMS ============
app.post('/api/craft', (req, res) => {
    try {
        const user = extractUser(req);
        const nftIds = req.body?.nft_ids || [];
        const recipeTarget = req.body?.recipe_id || 'auto';

        if (!Array.isArray(nftIds) || nftIds.length < 3) {
            return res.status(400).json({ detail: 'Виберіть мінімум 3 предмети для злиття у Кузні' });
        }

        const nfts = state.nfts.filter(n => nftIds.includes(n.id) && n.owner_id === user.id && !n.is_staked && !n.on_sale);
        if (nfts.length !== nftIds.length) {
            return res.status(400).json({ detail: 'Деякі предмети не знайдені або знаходяться у стейкінгу/на продажу' });
        }

        const maxRarityIdx = Math.max(...nfts.map(n => RARITY_ORDER.indexOf(n.rarity)));
        const hasLegendaryOrEpic = maxRarityIdx >= 2;
        const newRarityIdx = hasLegendaryOrEpic && nfts.length >= 3
            ? Math.min( RARITY_ORDER.length - 1, maxRarityIdx + 1 )
            : Math.min(maxRarityIdx + 1, RARITY_ORDER.length - 1);
        const newRarity = RARITY_ORDER[newRarityIdx];

        state.nfts = state.nfts.filter(n => !nftIds.includes(n.id));

        let chosenPreset = null;
        if (recipeTarget && recipeTarget !== 'auto') {
            chosenPreset = GIFT_PRESETS.find(p => p.id === recipeTarget);
        }
        if (!chosenPreset) {
            const highTierPresets = GIFT_PRESETS.filter(p =>
                ['imperial_crown', 'chrono_watch', 'diamond_ring', 'champion_cup', 'gold_bullion', 'vr_helmet'].includes(p.id)
            );
            chosenPreset = highTierPresets[Math.floor(Math.random() * highTierPresets.length)] || GIFT_PRESETS[0];
        }

        const rolledBackdrop = BACKDROP_POOL[Math.floor(Math.random() * BACKDROP_POOL.length)];
        const rolledSymbol = SYMBOL_POOL[Math.floor(Math.random() * SYMBOL_POOL.length)];
        const serial = Math.floor(Math.random() * 150) + 1;

        const newNft = {
            id: state.counters.nftId++,
            name: `${chosenPreset.revealed_name} #${serial}`,
            base_box_name: chosenPreset.box_name,
            revealed_name: chosenPreset.revealed_name,
            description: `Ексклюзивний 3D-предмет на подіумі, викуваний у Mythic-Кузні зі злиття ${nfts.length} подарунків.`,
            rarity: newRarity,
            price: 0,
            collection_id: chosenPreset.collection_id,
            serial_number: serial,
            is_upgraded: true,
            upgrade_cost: 100,
            model: chosenPreset.models[0],
            backdrop: rolledBackdrop.name,
            backdrop_gradient: rolledBackdrop.gradient,
            backdrop_glow: rolledBackdrop.glow,
            symbol: rolledSymbol.name,
            symbol_icon: rolledSymbol.icon,
            image_url: chosenPreset.revealed_image_url,
            box_image_url: chosenPreset.box_image_url,
            revealed_image_url: chosenPreset.revealed_image_url,
            owner_id: user.id,
            creator_id: user.id,
            on_sale: false,
            sale_type: 'fixed',
            is_staked: false,
            created_at: new Date().toISOString()
        };
        state.nfts.push(newNft);

        ensureUserStats(user);
        user.stats.crafts = (user.stats.crafts || 0) + 1;
        const levelUp = addXp(user, 110);
        const unlockedAch = unlockAchievement(user, 'craft_alchemist');
        pushLiveDrop(user.first_name || user.username, '🔥 Викував у Кузні', newNft);
        logTx(user.id, 'craft', 0, `Кузня 3D: злиття ${nfts.length} предметів → ${newNft.name} (${newNft.rarity.toUpperCase()})`, newNft.id);
        saveDatabase();

        res.json({
            success: true,
            upgraded: true,
            nft: enrichNft(newNft, user.id),
            level_up: levelUp,
            unlocked_achievement: unlockedAch
        });
    } catch (e) {
        res.status(e.status || 500).json({ detail: e.message });
    }
});

// Daily Check-in Bonus
app.post('/api/daily-bonus', (req, res) => {
    try {
        const user = extractUser(req);
        const now = new Date();
        if (user.last_daily_Bonus) {
            const diffSec = (now.getTime() - new Date(user.last_daily_Bonus).getTime()) / 1000;
            if (diffSec < 86400) {
                const hoursLeft = Math.floor((86400 - diffSec) / 3600);
                const minsLeft = Math.floor(((86400 - diffSec) % 3600) / 60);
                return res.status(400).json({ detail: `Наступний бонус через ${hoursLeft}г ${minsLeft}хв` });
            }
            user.streak_days = diffSec < 172800 ? Math.min(7, (user.streak_days || 1) + 1) : 1;
        } else {
            user.streak_days = 1;
        }

        const baseReward = 100 + (user.streak_days * 40);
        user.balance += baseReward;
        user.last_daily_Bonus = now.toISOString();
        const levelUp = addXp(user, 45);
        logTx(user.id, 'daily_bonus', baseReward, `Щоденний чек-ін (День ${user.streak_days}): +${baseReward} NXR`);
        saveDatabase();

        res.json({
            success: true,
            bonus: baseReward,
            streak_days: user.streak_days,
            new_balance: Number(user.balance.toFixed(2)),
            xp: user.xp,
            level: user.level,
            level_up: levelUp
        });
    } catch (e) {
        res.status(e.status || 500).json({ detail: e.message });
    }
});

// Claim Quest Reward
app.post('/api/quests/claim', (req, res) => {
    try {
        const user = extractUser(req);
        const { quest_id } = req.body;
        ensureQuestState(user);

        const quest = DAILY_QUESTS_CATALOG.find(q => q.id === quest_id);
        if (!quest) return res.status(404).json({ detail: 'Квест не знайдено' });

        if (user.quest_progress.claimed.includes(quest_id)) {
            return res.status(400).json({ detail: 'Нагороду вже отримано' });
        }

        const current = user.quest_progress.counts[quest_id] || 0;
        if (current < quest.target) {
            return res.status(400).json({ detail: 'Квест ще не виконано' });
        }

        user.quest_progress.claimed.push(quest_id);
        user.balance += quest.reward_nxr;
        const levelUp = addXp(user, quest.reward_xp);
        logTx(user.id, 'quest_reward', quest.reward_nxr, `Виконано квест: ${quest.name} (+${quest.reward_nxr} NXR)`);
        saveDatabase();

        res.json({
            success: true,
            quest_name: quest.name,
            reward_nxr: quest.reward_nxr,
            reward_xp: quest.reward_xp,
            new_balance: Number(user.balance.toFixed(2)),
            xp: user.xp,
            level: user.level,
            level_up: levelUp
        });
    } catch (e) {
        res.status(e.status || 500).json({ detail: e.message });
    }
});

app.post('/api/my-submissions', (req, res) => {
    try {
        const user = extractUser(req);
        const subs = state.submissions
            .filter(s => s.user_id === user.id)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        res.json({ submissions: subs });
    } catch (e) {
        res.status(e.status || 500).json({ detail: e.message });
    }
});

app.get('/api/leaderboard', (req, res) => {
    const usersList = Object.values(state.users).filter(u => u.telegram_id !== 0);
    const board = usersList.map(u => {
        const userNfts = state.nfts.filter(n => n.owner_id === u.id);
        return {
            username: u.username || u.first_name || 'Колекціонер',
            first_name: u.first_name || 'Колекціонер',
            nft_count: userNfts.length,
            level: u.level || 1,
            xp: u.xp || 0,
            balance: Math.round(u.balance)
        };
    });
    board.sort((a, b) => b.nft_count - a.nft_count || b.xp - a.xp || b.balance - a.balance);
    res.json({ leaderboard: board.slice(0, 20) });
});

app.post('/api/transactions', (req, res) => {
    try {
        const user = extractUser(req);
        const txs = state.transactions
            .filter(t => t.user_id === user.id)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 30);
        res.json({ transactions: txs });
    } catch (e) {
        res.status(e.status || 500).json({ detail: e.message });
    }
});

// ============ ADMIN MODERATION ROUTES ============
app.get('/api/admin/submissions', (req, res) => {
    const pending = state.submissions
        .filter(s => s.status === 'pending')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    res.json({ submissions: pending });
});

app.post('/api/admin/approve/:sub_id', (req, res) => {
    const subId = parseInt(req.params.sub_id, 10);
    const rarity = RARITY_ORDER.includes(req.query.rarity || req.body?.rarity)
        ? (req.query.rarity || req.body?.rarity)
        : 'rare';
    const sub = state.submissions.find(s => s.id === subId);

    if (!sub || sub.status !== 'pending') {
        return res.status(404).json({ detail: 'Пропозицію не знайдено або вже оброблено' });
    }

    sub.status = 'approved';
    sub.reviewed_by = ADMIN_ID;

    const serial = Math.floor(Math.random() * 200) + 1;
    const nft = {
        id: state.counters.nftId++,
        name: sub.name.includes('#') ? sub.name : `${sub.name} #${serial}`,
        base_box_name: sub.name,
        revealed_name: sub.revealed_name || sub.name.replace(/^Коробка\s+/i, ''),
        description: sub.description || 'Авторська коробка з подарунком, схвалена адміністратором. Натисніть «Прокачати», щоб розпакувати предмет, фон та значок!',
        rarity,
        price: sub.desired_price || 0,
        collection_id: 'horology_luxury',
        serial_number: serial,
        is_upgraded: false,
        upgrade_cost: 100,
        target_model: sub.model || 'Community Edition (1.5%)',
        model: 'Запакована коробка',
        backdrop: 'Стандартний бокс',
        backdrop_gradient: 'radial-gradient(circle at 50% 45%, #232d3b 0%, #111722 70%)',
        backdrop_glow: '#2ea6ff',
        symbol: 'Не розпаковано',
        symbol_icon: '📦',
        image_url: sub.box_image_url || sub.image_url,
        box_image_url: sub.box_image_url || sub.image_url,
        revealed_image_url: sub.revealed_image_url || sub.image_url,
        owner_id: sub.user_id,
        creator_id: sub.user_id,
        on_sale: (sub.desired_price || 0) > 0,
        sale_type: 'fixed',
        is_staked: false,
        created_at: new Date().toISOString()
    };
    state.nfts.push(nft);

    const author = Object.values(state.users).find(u => u.id === sub.user_id);
    if (author) {
        author.balance += 100;
        addXp(author, 100);
        logTx(author.id, 'author_reward', 100, `Схвалено вашу коробку "${nft.name}" (+100 NXR)`, nft.id);
    }

    pushLiveDrop(sub.author_name || 'Автор', '🎨 Схвалено 3D-бокс', nft);
    saveDatabase();
    res.json({
        success: true,
        nft_id: nft.id,
        rarity,
        message: `Схвалено! Коробку "${nft.name}" видано гравцю (готова до прокачки в "${nft.revealed_name}").`
    });
});

app.post('/api/admin/reject/:sub_id', (req, res) => {
    const subId = parseInt(req.params.sub_id, 10);
    const reason = req.query.reason || req.body?.reason || 'Не відповідає стандартам колекції';
    const sub = state.submissions.find(s => s.id === subId);

    if (!sub || sub.status !== 'pending') {
        return res.status(404).json({ detail: 'Пропозицію не знайдено' });
    }

    sub.status = 'rejected';
    sub.reject_reason = reason;
    sub.reviewed_by = ADMIN_ID;
    saveDatabase();

    res.json({ success: true, message: 'Пропозицію відхилено' });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'app', 'index.html'));
});

app.use(express.static(path.join(__dirname, 'app')));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✦ NEXORA 3D Collectible Gifts Server v5.0 running on http://0.0.0.0:${PORT}`);
});

