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
const DB_FILE = path.join(DATA_DIR, 'nexora-custom-gifts-v4.json');

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

// Original 2-stage gifts: Stage 1 (Sealed Box) -> Stage 2 (Revealed 3D Item)
const GIFT_PRESETS = [
    {
        id: 'nexphone',
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

const COLLECTIONS_CATALOG = [
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
        id: 'mystery_box_starter',
        name: 'Tech & Hype Drop Box',
        subtitle: 'Випадають запаковані коробки телефонів, кросівок, геймпадів та відеокарт для прокачки',
        price: 160,
        icon: '📦',
        accent: '#2ea6ff',
        probabilities: { common: 25, rare: 45, epic: 20, legendary: 8, mythic: 2 },
        pool: GIFT_PRESETS
    },
    {
        id: 'vip_unboxing_vault',
        name: 'VIP Collector Vault',
        subtitle: 'Підвищений шанс на Бокс Суперкара, Коробку NexPhone та Сейф Відеокарти',
        price: 450,
        icon: '🏎️',
        accent: '#f5a623',
        probabilities: { common: 0, rare: 30, epic: 38, legendary: 22, mythic: 10 },
        pool: GIFT_PRESETS
    }
];

const ACHIEVEMENTS_CATALOG = [
    { id: 'first_upgrade', name: 'Перша Прокачка', desc: 'Розпакувати та прокачати коробку в NFT з фоном і значком', icon: '✨', reward_nxr: 150, reward_xp: 80 },
    { id: 'first_case', name: 'Мисливець за Боксами', desc: 'Відкрити свій перший Drop Box у рулетці', icon: '📦', reward_nxr: 100, reward_xp: 50 },
    { id: 'collector_5', name: 'Колекціонер', desc: 'Зібрати 5+ предметів у своїй колекції', icon: '🏆', reward_nxr: 250, reward_xp: 120 },
    { id: 'staker_pro', name: 'Пасивний Дохід', desc: 'Відправити прокачаний NFT у стейкінг', icon: '⚡', reward_nxr: 150, reward_xp: 80 },
    { id: 'market_shark', name: 'Трейдер Маркету', desc: 'Купити або зробити ставку на маркеті', icon: '💎', reward_nxr: 200, reward_xp: 100 },
    { id: 'proposer', name: 'Автор Подарунка', desc: 'Запропонувати свою коробку/предмет адміну', icon: '🎨', reward_nxr: 300, reward_xp: 150 }
];

const DAILY_QUESTS_CATALOG = [
    { id: 'q_upgrade_gift', name: 'Прокачати 1 коробку до NFT з фоном та значком', reward_nxr: 180, reward_xp: 90, target: 1 },
    { id: 'q_open_case', name: 'Відкрити 1 Drop Box у рулетці', reward_nxr: 120, reward_xp: 60, target: 1 },
    { id: 'q_stake_nft', name: 'Застейкати або зібрати дохід зі стейкінгу', reward_nxr: 100, reward_xp: 50, target: 1 },
    { id: 'q_market_action', name: 'Зробити ставку, оффер або покупку на маркеті', reward_nxr: 150, reward_xp: 75, target: 1 }
];

// ============ DATABASE STATE ============
let state = {
    users: {},
    nfts: [],
    submissions: [],
    transactions: [],
    offers: [],
    counters: {
        userId: 1,
        nftId: 1,
        submissionId: 1,
        txId: 1,
        offerId: 1
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
                return true;
            }
        } catch (e) {
            console.error('Failed to load DB, seeding fresh:', e.message);
        }
    }
    return false;
}

function createInitialUser(telegramId, username = 'collector', firstName = 'Колекціонер') {
    const id = state.counters.userId++;
    const user = {
        id,
        telegram_id: telegramId,
        username,
        first_name: firstName,
        balance: 3200.0,
        xp: 260,
        level: 2,
        streak_days: 1,
        last_daily_Bonus: null,
        last_staking_claim: new Date().toISOString(),
        unclaimed_staking: 0,
        achievements: [],
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

    const previewUser = createInitialUser(100001, 'nexora_owner', 'Колекціонер');
    previewUser.balance = 3200;
    previewUser.xp = 340;
    previewUser.level = 3;

    const now = Date.now();
    const initialNfts = [
        // 1. Starter Collection: UN-UPGRADED SEALED PHONE BOX (Ready for the user to test Upgrade!)
        {
            name: 'Коробка NexPhone #12',
            base_box_name: 'Коробка NexPhone',
            revealed_name: 'NexPhone 16 Titanium',
            description: 'Запакована фірмова коробка смартфона з голографічною пломбою. Натисніть «Прокачати», щоб розпакувати сам телефон, вибити рідкісний фон та значок ззаду!',
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
        // 2. Starter Collection: UN-UPGRADED SEALED GPU VAULT BOX
        {
            name: 'Сейф Відеокарти #21',
            base_box_name: 'Сейф Відеокарти',
            revealed_name: 'RTX 9090 Liquid Gold',
            description: 'Броньований металевий кейс для топового заліза. Прокачайте, щоб відкрити золоту відеокарту RTX 9090 з фоном та значком!',
            rarity: 'epic',
            price: 0,
            collection_id: 'tech_drop',
            serial_number: 21,
            is_upgraded: false,
            upgrade_cost: 100,
            model: 'Запакований кейс',
            backdrop: 'Стандартний бокс',
            backdrop_gradient: 'radial-gradient(circle at 50% 45%, #262238 0%, #12101c 70%)',
            backdrop_glow: '#a855f7',
            symbol: 'Не розпаковано',
            symbol_icon: '📦',
            image_url: '/src/assets/images/gift_box_gpu_1791712997798.jpg',
            box_image_url: '/src/assets/images/gift_box_gpu_1791712997798.jpg',
            revealed_image_url: '/src/assets/images/gift_item_gpu_1791713008994.jpg',
            owner_id: previewUser.id,
            creator_id: systemUser.id,
            on_sale: false,
            sale_type: 'fixed',
            is_staked: false
        },
        // 3. Starter Collection: UN-UPGRADED SEALED SNEAKER BOX
        {
            name: 'Бокс Лімітованих Кросів #34',
            base_box_name: 'Бокс Лімітованих Кросів',
            revealed_name: 'Air Gold & Ice Sole',
            description: 'Карбоновий шубокс із металевими замками. Прокачайте, щоб дістати лімітовані кросівки з неоновою підошвою!',
            rarity: 'rare',
            price: 0,
            collection_id: 'street_hype',
            serial_number: 34,
            is_upgraded: false,
            upgrade_cost: 100,
            model: 'Запакована коробка',
            backdrop: 'Стандартний бокс',
            backdrop_gradient: 'radial-gradient(circle at 50% 45%, #1e2c3a 0%, #101720 70%)',
            backdrop_glow: '#2ea6ff',
            symbol: 'Не розпаковано',
            symbol_icon: '📦',
            image_url: '/src/assets/images/gift_box_sneaker_1791712974977.jpg',
            box_image_url: '/src/assets/images/gift_box_sneaker_1791712974977.jpg',
            revealed_image_url: '/src/assets/images/gift_item_sneaker_1791712984440.jpg',
            owner_id: previewUser.id,
            creator_id: systemUser.id,
            on_sale: false,
            sale_type: 'fixed',
            is_staked: false
        },
        // 4. Starter Collection: ALREADY UPGRADED HYPERCAR (Shows how an upgraded item looks with Backdrop + Symbol Icons behind!)
        {
            name: 'HyperCar Rose-Gold #3',
            base_box_name: 'Карбоновий Бокс Авто',
            revealed_name: 'HyperCar Rose-Gold',
            description: 'Розпакований колекційний гіперкар 1:18 із рожевого золота та карбону з фоном Royal Gold та коронами ззаду.',
            rarity: 'mythic',
            price: 0,
            collection_id: 'motorsport_club',
            serial_number: 3,
            is_upgraded: true,
            upgrade_cost: 100,
            model: 'Rose-Gold Carbon 1:18 (0.5%)',
            backdrop: 'Royal Gold (1.2%)',
            backdrop_gradient: 'radial-gradient(circle at 50% 42%, #784b08 0%, #362003 58%, #120d06 100%)',
            backdrop_glow: '#f5a623',
            symbol: 'Golden Crown (0.8%)',
            symbol_icon: '👑',
            image_url: '/src/assets/images/gift_item_supercar_1791713069652.jpg',
            box_image_url: '/src/assets/images/gift_box_supercar_1791713059172.jpg',
            revealed_image_url: '/src/assets/images/gift_item_supercar_1791713069652.jpg',
            owner_id: previewUser.id,
            creator_id: systemUser.id,
            on_sale: false,
            sale_type: 'fixed',
            is_staked: true,
            staked_at: new Date(now - 1000 * 60 * 180).toISOString()
        },
        // 5. Market Items (Both Upgraded Collectibles & Un-upgraded Boxes)
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
            sale_type: 'auction',
            auction_end: new Date(now + 1000 * 60 * 140).toISOString(),
            highest_bid: 680,
            highest_bidder_id: null,
            min_bid_step: 50,
            buyout_price: 1250,
            is_staked: false
        },
        {
            name: 'ProPad Smoked Gold #9',
            base_box_name: 'Футляр Геймпаду',
            revealed_name: 'ProPad Smoked Gold',
            description: 'Прокачаний напівпрозорий геймпад із золотими стіками 24K на рубіновому фоні Crimson Flame.',
            rarity: 'epic',
            price: 390,
            collection_id: 'street_hype',
            serial_number: 9,
            is_upgraded: true,
            upgrade_cost: 100,
            model: 'Smoked Crystal 24K (1.7%)',
            backdrop: 'Crimson Flame (0.9%)',
            backdrop_gradient: 'radial-gradient(circle at 50% 42%, #7c1926 0%, #3b0b12 58%, #170609 100%)',
            backdrop_glow: '#ef4444',
            symbol: 'Plasma Flame (1.6%)',
            symbol_icon: '🔥',
            image_url: '/src/assets/images/gift_item_gamepad_1791713047624.jpg',
            box_image_url: '/src/assets/images/gift_box_gamepad_1791713037888.jpg',
            revealed_image_url: '/src/assets/images/gift_item_gamepad_1791713047624.jpg',
            owner_id: systemUser.id,
            creator_id: systemUser.id,
            on_sale: true,
            sale_type: 'fixed',
            is_staked: false
        },
        {
            name: 'Карбоновий Бокс Авто #15',
            base_box_name: 'Карбоновий Бокс Авто',
            revealed_name: 'HyperCar Rose-Gold',
            description: 'Нерозпакований восьмикутний бокс із кованого карбону. Купіть та прокачайте, щоб вибити гіперкар з випадковим фоном!',
            rarity: 'legendary',
            price: 490,
            collection_id: 'motorsport_club',
            serial_number: 15,
            is_upgraded: false,
            upgrade_cost: 100,
            model: 'Запакована коробка',
            backdrop: 'Стандартний бокс',
            backdrop_gradient: 'radial-gradient(circle at 50% 45%, #232d3b 0%, #111722 70%)',
            backdrop_glow: '#f5a623',
            symbol: 'Не розпаковано',
            symbol_icon: '📦',
            image_url: '/src/assets/images/gift_box_supercar_1791713059172.jpg',
            box_image_url: '/src/assets/images/gift_box_supercar_1791713059172.jpg',
            revealed_image_url: '/src/assets/images/gift_item_supercar_1791713069652.jpg',
            owner_id: systemUser.id,
            creator_id: systemUser.id,
            on_sale: true,
            sale_type: 'fixed',
            is_staked: false
        }
    ];

    for (const item of initialNfts) {
        state.nfts.push({
            id: state.counters.nftId++,
            ...item,
            created_at: new Date().toISOString()
        });
    }

    // Seed a sample player proposal (a 2-stage Phone Box -> Phone proposal) for Admin Moderation
    state.submissions.push({
        id: state.counters.submissionId++,
        user_id: previewUser.id,
        telegram_id: previewUser.telegram_id,
        author_name: 'Maksym_UA',
        name: 'Коробка NexPhone Ultra',
        revealed_name: 'NexPhone Ultra Gold',
        description: 'Пропоную нову коробку зі смартфоном: спочатку чорний матовий бокс із пломбою, а при прокачці випадає золотий смартфон!',
        model: 'Titanium Gold (1.0%)',
        backdrop: 'Royal Gold',
        suggested_rarity: 'legendary',
        image_url: '/src/assets/images/gift_box_phone_1791712954553.jpg',
        box_image_url: '/src/assets/images/gift_box_phone_1791712954553.jpg',
        revealed_image_url: '/src/assets/images/gift_item_phone_1791712963927.jpg',
        desired_price: 0,
        status: 'pending',
        reject_reason: null,
        reviewed_by: null,
        created_at: new Date(now - 1000 * 60 * 25).toISOString()
    });

    // Seed a sample incoming offer
    state.offers.push({
        id: state.counters.offerId++,
        nft_id: 4,
        buyer_id: systemUser.id,
        buyer_name: 'CryptoCollector',
        seller_id: previewUser.id,
        amount: 950,
        status: 'pending',
        created_at: new Date(now - 1000 * 60 * 40).toISOString()
    });

    logTx(previewUser.id, 'daily_bonus', 3200, 'Стартовий баланс колекціонера NEXORA');
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

function addXp(user, amount) {
    user.xp = (user.xp || 0) + amount;
    const newLevel = Math.floor(user.xp / 200) + 1;
    if (newLevel > (user.level || 1)) {
        const levelDiff = newLevel - (user.level || 1);
        const bonus = levelDiff * 150;
        user.level = newLevel;
        user.balance += bonus;
        logTx(user.id, 'level_up', bonus, `Нагорода за досягнення Рівня ${newLevel}!`);
    }
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
    logTx(user.id, 'achievement', ach.reward_nxr, `Досягнення розблоковано: ${ach.name}`);
    return ach;
}

function checkAutoAchievements(user) {
    const myNfts = state.nfts.filter(n => n.owner_id === user.id);
    if (myNfts.length >= 5) unlockAchievement(user, 'collector_5');
}

function getNftDailyYield(nft) {
    const base = RARITY_STAKING_RATES[nft.rarity] || 15;
    return nft.is_upgraded ? base : Math.round(base * 0.45);
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

// ============ API ROUTES ============

app.get('/api/status', (req, res) => {
    res.json({ name: 'NEXORA NFT API', status: 'online', version: '4.0.0' });
});

app.get('/api/presets', (req, res) => {
    res.json({
        presets: GIFT_PRESETS,
        collections: COLLECTIONS_CATALOG,
        backdrops: BACKDROP_POOL,
        symbols: SYMBOL_POOL
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
        const pendingSubsCount = state.submissions.filter(s => s.status === 'pending').length;

        const now = new Date();
        let canClaimDaily = true;
        if (user.last_daily_Bonus) {
            const diffSec = (now.getTime() - new Date(user.last_daily_Bonus).getTime()) / 1000;
            if (diffSec < 86400) canClaimDaily = false;
        }

        res.json({
            id: user.id,
            telegram_id: user.telegram_id,
            username: user.username,
            first_name: user.first_name,
            balance: Number(user.balance.toFixed(2)),
            xp: user.xp || 0,
            level: user.level || 1,
            xp_next_level: (user.level || 1) * 200,
            streak_days: user.streak_days || 1,
            nft_count: myNfts.length,
            submissions_count: mySubs.length,
            pending_moderation_count: pendingSubsCount,
            can_claim_daily: canClaimDaily,
            staking,
            achievements: user.achievements || [],
            achievements_catalog: ACHIEVEMENTS_CATALOG,
            quests: DAILY_QUESTS_CATALOG.map(q => ({
                ...q,
                progress: Math.min(q.target, user.quest_progress?.counts?.[q.id] || 0),
                claimed: (user.quest_progress?.claimed || []).includes(q.id)
            })),
            incoming_offers_count: incomingOffers.length
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

        // Find matching preset or use custom uploaded revealed image
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

        // Chance to boost rarity on upgrade
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

        incrementQuest(user, 'q_upgrade_gift');
        addXp(user, 95);
        unlockAchievement(user, 'first_upgrade');
        logTx(user.id, 'upgrade_nft', -cost, `Прокачка коробки → ${nft.name} (${rolledBackdrop.name} + ${rolledSymbol.icon})`, nft.id);
        saveDatabase();

        res.json({
            success: true,
            nft: {
                ...nft,
                daily_yield: getNftDailyYield(nft)
            },
            backdrops_reel: BACKDROP_POOL,
            symbols_reel: SYMBOL_POOL,
            new_balance: Number(user.balance.toFixed(2)),
            xp: user.xp,
            level: user.level
        });
    } catch (e) {
        res.status(e.status || 500).json({ detail: e.message });
    }
});

// Collection + Sets + Staking
app.post('/api/collection', (req, res) => {
    try {
        settleExpiredAuctions();
        const user = extractUser(req);
        const sort = req.query.sort || req.body?.sort || 'newest';
        const myNfts = state.nfts.filter(n => n.owner_id === user.id);

        if (sort === 'rarity') {
            const order = { mythic: 0, legendary: 1, epic: 2, rare: 3, common: 4 };
            myNfts.sort((a, b) => (order[a.rarity] ?? 5) - (order[b.rarity] ?? 5));
        } else if (sort === 'price') {
            myNfts.sort((a, b) => (b.price || 0) - (a.price || 0));
        } else {
            myNfts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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

        const setsProgress = COLLECTIONS_CATALOG.map(col => {
            const ownedInCol = myNfts.filter(n => n.collection_id === col.id && n.is_upgraded);
            const currentCount = Math.min(col.required_count, ownedInCol.length);
            return {
                ...col,
                owned_count: currentCount,
                completed: currentCount >= col.required_count
            };
        });

        res.json({
            nfts: myNfts.map(n => ({
                ...n,
                daily_yield: getNftDailyYield(n)
            })),
            staking,
            sets: setsProgress,
            incoming_offers: incomingOffers
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

        if (nft.is_staked) {
            incrementQuest(user, 'q_stake_nft');
            unlockAchievement(user, 'staker_pro');
        }

        saveDatabase();
        const updatedStats = calculateUserStakingStats(user);

        res.json({
            success: true,
            is_staked: nft.is_staked,
            staking: updatedStats,
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
        addXp(user, 25);
        logTx(user.id, 'staking_claim', claimed, `Збір пасивного доходу зі стейкінгу (+${claimed} NXR)`);
        saveDatabase();

        res.json({
            success: true,
            claimed,
            new_balance: Number(user.balance.toFixed(2)),
            staking: calculateUserStakingStats(user)
        });
    } catch (e) {
        res.status(e.status || 500).json({ detail: e.message });
    }
});

// ============ DROP BOXES & ROULETTE ============
app.get('/api/cases', (req, res) => {
    res.json({ cases: CASES_CATALOG });
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

        const template = box.pool[Math.floor(Math.random() * box.pool.length)];
        const serialNumber = Math.floor(Math.random() * 400) + 15;

        const newNft = {
            id: state.counters.nftId++,
            name: `${template.box_name} #${serialNumber}`,
            base_box_name: template.box_name,
            revealed_name: template.revealed_name,
            description: template.description,
            rarity: template.rarity,
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

        const rouletteStrip = [];
        for (let i = 0; i < 28; i++) {
            if (i === 22) {
                rouletteStrip.push({
                    name: newNft.name,
                    rarity: newNft.rarity,
                    image_url: newNft.image_url
                });
            } else {
                const sample = box.pool[Math.floor(Math.random() * box.pool.length)];
                rouletteStrip.push({
                    name: sample.box_name,
                    rarity: sample.rarity,
                    image_url: sample.box_image_url
                });
            }
        }

        incrementQuest(user, 'q_open_case');
        addXp(user, 40);
        unlockAchievement(user, 'first_case');
        checkAutoAchievements(user);
        logTx(user.id, 'case_open', -box.price, `Відкрито "${box.name}" → ${newNft.name}`, newNft.id);
        saveDatabase();

        res.json({
            success: true,
            won_nft: {
                ...newNft,
                daily_yield: getNftDailyYield(newNft)
            },
            roulette_strip: rouletteStrip,
            winner_index: 22,
            new_balance: Number(user.balance.toFixed(2)),
            xp: user.xp,
            level: user.level
        });
    } catch (e) {
        res.status(e.status || 500).json({ detail: e.message });
    }
});

// ============ MARKETPLACE ============
app.get('/api/market', (req, res) => {
    settleExpiredAuctions();
    const { rarity, sort = 'newest', search = '', mode = 'all' } = req.query;

    let nfts = state.nfts.filter(n => n.on_sale);

    if (mode === 'fixed') {
        nfts = nfts.filter(n => (n.sale_type || 'fixed') === 'fixed');
    } else if (mode === 'auction') {
        nfts = nfts.filter(n => n.sale_type === 'auction');
    }

    if (rarity && rarity !== 'all') {
        nfts = nfts.filter(n => n.rarity === rarity);
    }
    if (search && String(search).trim() !== '') {
        const q = String(search).trim().toLowerCase();
        nfts = nfts.filter(n =>
            n.name.toLowerCase().includes(q) ||
            (n.model && n.model.toLowerCase().includes(q)) ||
            (n.backdrop && n.backdrop.toLowerCase().includes(q))
        );
    }

    if (sort === 'price_asc') {
        nfts.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort === 'price_desc') {
        nfts.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else {
        nfts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    res.json({
        nfts: nfts.map(n => {
            const owner = Object.values(state.users).find(u => u.id === n.owner_id);
            return {
                ...n,
                owner_name: owner ? owner.first_name : 'NEXORA Official',
                daily_yield: getNftDailyYield(n)
            };
        })
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
            saveDatabase();
            return res.json({ success: true, message: 'Знято з продажу' });
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

        saveDatabase();
        res.json({
            success: true,
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
        const nft = state.nfts.find(n => n.id === nftId && n.on_sale);

        if (!nft) return res.status(404).json({ detail: 'Лот не знайдено або вже продано' });
        if (nft.owner_id === buyer.id) return res.status(400).json({ detail: 'Не можна купити власний лот' });

        const purchasePrice = nft.sale_type === 'auction' ? (nft.buyout_price || nft.price * 2) : nft.price;
        if (buyer.balance < purchasePrice) {
            return res.status(400).json({ detail: `Недостатньо NXR (потрібно ${purchasePrice})` });
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
            logTx(seller.id, 'sale', purchasePrice, `Продаж "${nft.name}"`, nft.id);
        }

        nft.owner_id = buyer.id;
        nft.on_sale = false;
        nft.price = 0;
        nft.sale_type = 'fixed';
        nft.auction_end = null;
        nft.highest_bidder_id = null;

        incrementQuest(buyer, 'q_market_action');
        addXp(buyer, 50);
        unlockAchievement(buyer, 'market_shark');
        checkAutoAchievements(buyer);
        logTx(buyer.id, 'purchase', -purchasePrice, `Покупка "${nft.name}"`, nft.id);
        saveDatabase();

        res.json({
            success: true,
            nft_name: nft.name,
            new_balance: Number(buyer.balance.toFixed(2))
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
        if (!nft) return res.status(404).json({ detail: 'Активний аукціон не знайдено' });
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

        incrementQuest(bidder, 'q_market_action');
        addXp(bidder, 35);
        unlockAchievement(bidder, 'market_shark');
        logTx(bidder.id, 'auction_bid', -bidAmount, `Ставка ${bidAmount} NXR на "${nft.name}"`, nft.id);
        saveDatabase();

        res.json({
            success: true,
            highest_bid: nft.highest_bid,
            new_balance: Number(bidder.balance.toFixed(2)),
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

// Player proposes a 2-stage gift (Box + Revealed Item) for Admin Moderation
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
        unlockAchievement(user, 'proposer');
        addXp(user, 35);
        saveDatabase();

        res.json({
            success: true,
            submission_id: sub.id,
            message: 'Пропозицію коробки та предмета надіслано власнику на розгляд!'
        });
    } catch (e) {
        res.status(e.status || 500).json({ detail: e.message });
    }
});

// Admin directly releases new 2-stage Box or Upgraded NFT
app.post('/api/admin/nft/create', multiUpload, (req, res) => {
    try {
        const user = extractUser(req);
        const boxName = (req.body.name || '').trim();
        const revealedName = (req.body.revealed_name || boxName).trim();
        const description = (req.body.description || '').trim();
        const rarity = RARITY_ORDER.includes(req.body.rarity) ? req.body.rarity : 'legendary';
        const collectionId = req.body.collection_id || 'tech_drop';
        const targetModel = (req.body.model || 'Titanium Custom (1.0%)').trim();
        const initialStage = req.body.initial_stage || 'sealed_box'; // 'sealed_box' | 'already_upgraded'
        const destination = req.body.destination || 'my_collection'; // 'my_collection' | 'market_fixed' | 'market_auction'
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
            nft: createdNfts[0],
            message: `✅ Додано ${createdNfts.length} шт. "${createdNfts[0].name}"!`
        });
    } catch (e) {
        res.status(e.status || 500).json({ detail: e.message });
    }
});

// Craft / Merge 3+ items
app.post('/api/craft', (req, res) => {
    try {
        const user = extractUser(req);
        const nftIds = req.body?.nft_ids || [];
        if (!Array.isArray(nftIds) || nftIds.length < 3) {
            return res.status(400).json({ detail: 'Виберіть мінімум 3 предмети для злиття' });
        }

        const nfts = state.nfts.filter(n => nftIds.includes(n.id) && n.owner_id === user.id && !n.is_staked && !n.on_sale);
        if (nfts.length !== nftIds.length) {
            return res.status(400).json({ detail: 'Деякі предмети не знайдені або знаходяться у стейкінгу/на продажу' });
        }

        const maxRarityIdx = Math.max(...nfts.map(n => RARITY_ORDER.indexOf(n.rarity)));
        const newRarityIdx = Math.min(maxRarityIdx + 1, RARITY_ORDER.length - 1);
        const newRarity = RARITY_ORDER[newRarityIdx];

        state.nfts = state.nfts.filter(n => !nftIds.includes(n.id));

        const chosenPreset = GIFT_PRESETS[Math.floor(Math.random() * GIFT_PRESETS.length)];
        const rolledBackdrop = BACKDROP_POOL[Math.floor(Math.random() * BACKDROP_POOL.length)];
        const rolledSymbol = SYMBOL_POOL[Math.floor(Math.random() * SYMBOL_POOL.length)];
        const serial = Math.floor(Math.random() * 300) + 5;

        const newNft = {
            id: state.counters.nftId++,
            name: `${chosenPreset.revealed_name} #${serial}`,
            base_box_name: chosenPreset.box_name,
            revealed_name: chosenPreset.revealed_name,
            description: `Ексклюзивний предмет, викуваний зі злиття ${nfts.length} подарунків.`,
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

        addXp(user, 90);
        logTx(user.id, 'craft', 0, `Злиття ${nfts.length} предметів → ${newNft.name}`, newNft.id);
        saveDatabase();

        res.json({
            success: true,
            upgraded: true,
            nft: {
                ...newNft,
                daily_yield: getNftDailyYield(newNft)
            }
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
        addXp(user, 45);
        logTx(user.id, 'daily_bonus', baseReward, `Щоденний чек-ін (День ${user.streak_days}): +${baseReward} NXR`);
        saveDatabase();

        res.json({
            success: true,
            bonus: baseReward,
            streak_days: user.streak_days,
            new_balance: Number(user.balance.toFixed(2)),
            xp: user.xp,
            level: user.level
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
        addXp(user, quest.reward_xp);
        logTx(user.id, 'quest_reward', quest.reward_nxr, `Виконано квест: ${quest.name}`);
        saveDatabase();

        res.json({
            success: true,
            reward_nxr: quest.reward_nxr,
            reward_xp: quest.reward_xp,
            new_balance: Number(user.balance.toFixed(2)),
            xp: user.xp,
            level: user.level
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
    // Approved proposals enter the game as a Sealed Box ready to be upgraded into the Revealed Item + Backdrop + Symbol!
    const nft = {
        id: state.counters.nftId++,
        name: sub.name.includes('#') ? sub.name : `${sub.name} #${serial}`,
        base_box_name: sub.name,
        revealed_name: sub.revealed_name || sub.name.replace(/^Коробка\s+/i, ''),
        description: sub.description || 'Авторська коробка з подарунком, схвалена адміністратором. Натисніть «Прокачати», щоб розпакувати предмет, фон та значок!',
        rarity,
        price: sub.desired_price || 0,
        collection_id: 'tech_drop',
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
    console.log(`✦ NEXORA 2-Stage Collectible Gifts Server v4.0 running on http://0.0.0.0:${PORT}`);
});
