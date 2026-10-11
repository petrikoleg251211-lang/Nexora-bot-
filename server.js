import express from 'express';
import cors from 'cors';
import multer from 'multer';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure directories exist
fs.mkdirSync(path.join(__dirname, 'static/images'), { recursive: true });
fs.mkdirSync(path.join(__dirname, 'static/uploads'), { recursive: true });

// Environment configuration
const APP_SECRET = process.env.APP_SECRET || 'nexora_secret_key';
const BOT_TOKEN = (process.env.BOT_TOKEN || '').trim();
const ADMIN_ID = parseInt(process.env.ADMIN_ID || '100001', 10) || 100001;

// Multer setup for NFT image submissions
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'static/uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '');
    cb(null, `sub_${timestamp}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// ============================================================
// IN-MEMORY DATA STORE (Mocked from PostgreSQL SQLAlchemy models)
// ============================================================

let nextUserId = 1;
let nextNftId = 1;
let nextSubmissionId = 1;
let nextTransactionId = 1;
let nextListingId = 1;

const users = new Map(); // id -> user
const nfts = new Map(); // id -> nft
const submissions = new Map(); // id -> submission
const transactions = []; // array of transaction objects
const marketListings = new Map(); // id -> listing

function seedData() {
  // System user (telegram_id = 0)
  const systemUser = {
    id: nextUserId++,
    telegram_id: 0,
    username: 'NEXORA_System',
    first_name: 'System',
    balance: 999999.0,
    created_at: new Date().toISOString()
  };
  users.set(systemUser.id, systemUser);

  // Default preview/admin user (telegram_id = ADMIN_ID)
  const demoUser = {
    id: nextUserId++,
    telegram_id: ADMIN_ID,
    username: 'nexora_player',
    first_name: 'Гравець',
    balance: 1000.0,
    created_at: new Date().toISOString()
  };
  users.set(demoUser.id, demoUser);

  transactions.push({
    id: nextTransactionId++,
    user_id: demoUser.id,
    type: 'reward',
    amount: 1000.0,
    description: 'Стартовий бонус NEXORA',
    created_at: new Date().toISOString()
  });

  // Seed Market NFTs owned by System
  const wolfNft = {
    id: nextNftId++,
    name: 'Cyber Wolf',
    description: 'Дикий кібер-вовк',
    image_url: '/static/images/cyber_wolf.png',
    rarity: 'epic',
    price: 500,
    is_on_market: true,
    owner_id: systemUser.id,
    creator_id: systemUser.id,
    created_at: new Date().toISOString()
  };
  nfts.set(wolfNft.id, wolfNft);

  const dragonNft = {
    id: nextNftId++,
    name: 'Digital Dragon',
    description: 'Легендарний дракон',
    image_url: '/static/images/dragon.png',
    rarity: 'legendary',
    price: 2500,
    is_on_market: true,
    owner_id: systemUser.id,
    creator_id: systemUser.id,
    created_at: new Date().toISOString()
  };
  nfts.set(dragonNft.id, dragonNft);

  const crystalNft = {
    id: nextNftId++,
    name: 'Quantum Shard',
    description: 'Кристал квантової енергії',
    image_url: '/static/images/rare.png',
    rarity: 'rare',
    price: 250,
    is_on_market: true,
    owner_id: systemUser.id,
    creator_id: systemUser.id,
    created_at: new Date().toISOString()
  };
  nfts.set(crystalNft.id, crystalNft);

  [wolfNft, dragonNft, crystalNft].forEach((nft) => {
    const listing = {
      id: nextListingId++,
      nft_id: nft.id,
      seller_id: systemUser.id,
      price: nft.price,
      is_active: true,
      created_at: new Date().toISOString()
    };
    marketListings.set(listing.id, listing);
  });

  // Starter NFTs for the demo player so Collection & Craft work immediately
  const starterNfts = [
    {
      name: 'Neon Pulse #01',
      description: 'Стартовий артефакт колекціонера NEXORA',
      image_url: '/static/images/common.png',
      rarity: 'common',
      price: 100
    },
    {
      name: 'Void Relic #02',
      description: 'Енергетичний релікт глибин космосу',
      image_url: '/static/images/rare.png',
      rarity: 'rare',
      price: 300
    },
    {
      name: 'Aether Core #03',
      description: 'Ядро ефірної сингулярності',
      image_url: '/static/images/epic.png',
      rarity: 'epic',
      price: 650
    }
  ];

  starterNfts.forEach((item) => {
    const nft = {
      id: nextNftId++,
      name: item.name,
      description: item.description,
      image_url: item.image_url,
      rarity: item.rarity,
      price: item.price,
      is_on_market: false,
      owner_id: demoUser.id,
      creator_id: demoUser.id,
      created_at: new Date().toISOString()
    };
    nfts.set(nft.id, nft);
  });
}

seedData();

// ============================================================
// TELEGRAM INIT DATA & USER HELPERS
// ============================================================

function verifyTelegramInitData(initData) {
  // Fallback for browser preview mode when outside Telegram WebApp
  if (!initData || !BOT_TOKEN) {
    return {
      id: ADMIN_ID,
      username: 'nexora_player',
      first_name: 'Гравець'
    };
  }

  try {
    const params = new URLSearchParams(initData);
    const checkHash = params.get('hash') || '';
    if (!checkHash) {
      return {
        id: ADMIN_ID,
        username: 'nexora_player',
        first_name: 'Гравець'
      };
    }

    const pairs = [];
    for (const [key, value] of params.entries()) {
      if (key !== 'hash') {
        pairs.push([key, value]);
      }
    }
    pairs.sort((a, b) => a[0].localeCompare(b[0]));
    const dataCheckString = pairs.map(([k, v]) => `${k}=${v}`).join('\n');

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(BOT_TOKEN)
      .digest();

    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (calculatedHash !== checkHash) {
      return null;
    }

    const userJson = params.get('user') || '{}';
    return JSON.parse(userJson);
  } catch (err) {
    console.error('[TELEGRAM] initData error:', err);
    return null;
  }
}

function findUserByTelegramId(telegramId) {
  const numericId = Number(telegramId);
  for (const user of users.values()) {
    if (user.telegram_id === numericId) {
      return user;
    }
  }
  return null;
}

function getUserNfts(userId) {
  const result = [];
  for (const nft of nfts.values()) {
    if (nft.owner_id === userId) {
      result.push(nft);
    }
  }
  return result;
}

function getOrCreateUser(telegramId, userData) {
  const numericId = Number(telegramId);
  let user = findUserByTelegramId(numericId);
  if (user) {
    if (userData.username) user.username = userData.username;
    if (userData.first_name) user.first_name = userData.first_name;
    return user;
  }

  user = {
    id: nextUserId++,
    telegram_id: numericId,
    username: userData.username || null,
    first_name: userData.first_name || 'Гравець',
    balance: 1000.0,
    created_at: new Date().toISOString()
  };
  users.set(user.id, user);

  transactions.push({
    id: nextTransactionId++,
    user_id: user.id,
    type: 'system',
    amount: 1000.0,
    description: 'Стартовий бонус NEXORA',
    created_at: new Date().toISOString()
  });

  return user;
}

function requireAdmin(initData) {
  const userData = verifyTelegramInitData(initData);
  if (!userData) {
    const err = new Error('Invalid Telegram init data');
    err.status = 401;
    throw err;
  }
  const telegramId = Number(userData.id || 0);
  if (telegramId !== ADMIN_ID) {
    const err = new Error('Access denied');
    err.status = 403;
    throw err;
  }
  return userData;
}

// ============================================================
// API ROUTES
// ============================================================

app.get('/api/status', (req, res) => {
  res.json({
    status: 'NEXORA API',
    version: '4.0',
    database: 'In-Memory (AI Studio)',
    message: 'NEXORA is online'
  });
});

// ME
app.get('/api/me', (req, res) => {
  const initData = req.query.init_data || '';
  const userData = verifyTelegramInitData(initData);
  if (!userData || !userData.id) {
    return res.status(401).json({ detail: 'Invalid Telegram init data' });
  }

  const user = getOrCreateUser(userData.id, userData);
  const ownedNfts = getUserNfts(user.id);
  const collectionValue = ownedNfts.reduce((sum, n) => sum + (n.price || 0), 0);
  const isAdmin = Number(userData.id) === ADMIN_ID;

  res.json({
    id: user.id,
    telegram_id: user.telegram_id,
    username: user.username,
    first_name: user.first_name,
    balance: user.balance,
    nft_count: ownedNfts.length,
    collection_value: collectionValue,
    is_admin: isAdmin
  });
});

// ADMIN STATUS
app.get('/api/admin/status', (req, res) => {
  const initData = req.query.init_data || '';
  const userData = verifyTelegramInitData(initData);
  if (!userData) {
    return res.status(401).json({ detail: 'Invalid Telegram init data' });
  }
  const telegramId = Number(userData.id || 0);
  res.json({
    telegram_id: telegramId,
    admin_id: ADMIN_ID,
    is_admin: telegramId === ADMIN_ID
  });
});

// COLLECTION
app.get('/api/collection', (req, res) => {
  const initData = req.query.init_data || '';
  const userData = verifyTelegramInitData(initData);
  if (!userData) {
    return res.status(401).json({ detail: 'Invalid init data' });
  }
  const user = getOrCreateUser(userData.id, userData);
  const ownedNfts = getUserNfts(user.id);

  res.json({
    nfts: ownedNfts.map((nft) => ({
      id: nft.id,
      name: nft.name,
      description: nft.description,
      image_url: nft.image_url,
      rarity: nft.rarity,
      price: nft.price,
      is_on_market: nft.is_on_market
    }))
  });
});

// MARKET
app.get('/api/market', (req, res) => {
  const result = [];
  for (const listing of marketListings.values()) {
    if (!listing.is_active) continue;
    const nft = nfts.get(listing.nft_id);
    const seller = users.get(listing.seller_id);
    if (!nft || !seller) continue;

    result.push({
      id: listing.id,
      nft: {
        id: nft.id,
        name: nft.name,
        description: nft.description,
        image_url: nft.image_url,
        rarity: nft.rarity
      },
      price: listing.price,
      seller: seller.username || `User_${seller.telegram_id}`
    });
  }
  res.json({ listings: result });
});

// BUY
app.post('/api/market/buy', (req, res) => {
  const { init_data, listing_id } = req.body;
  const userData = verifyTelegramInitData(init_data);
  if (!userData) {
    return res.status(401).json({ detail: 'Invalid init data' });
  }

  const buyer = getOrCreateUser(userData.id, userData);
  const listing = marketListings.get(Number(listing_id));
  if (!listing || !listing.is_active) {
    return res.status(404).json({ detail: 'Listing not found' });
  }

  const nft = nfts.get(listing.nft_id);
  if (!nft) {
    return res.status(404).json({ detail: 'NFT not found' });
  }

  const seller = users.get(listing.seller_id);
  if (!seller) {
    return res.status(404).json({ detail: 'Seller not found' });
  }

  if (seller.id === buyer.id) {
    return res.status(400).json({ detail: 'Не можна купити власний NFT' });
  }

  if (buyer.balance < listing.price) {
    return res.status(400).json({ detail: 'Insufficient balance' });
  }

  buyer.balance -= listing.price;
  seller.balance += listing.price;

  nft.owner_id = buyer.id;
  nft.is_on_market = false;
  listing.is_active = false;

  transactions.push({
    id: nextTransactionId++,
    user_id: buyer.id,
    type: 'buy',
    amount: -listing.price,
    description: `Купівля ${nft.name}`,
    created_at: new Date().toISOString()
  });

  transactions.push({
    id: nextTransactionId++,
    user_id: seller.id,
    type: 'sell',
    amount: listing.price,
    description: `Продаж ${nft.name}`,
    created_at: new Date().toISOString()
  });

  res.json({
    success: true,
    message: `Ви купили ${nft.name}!`
  });
});

// SELL
app.post('/api/market/sell', (req, res) => {
  const { init_data, nft_id, price } = req.body;
  const numericPrice = Number(price);
  if (!numericPrice || numericPrice <= 0) {
    return res.status(400).json({ detail: 'Ціна повинна бути більше 0' });
  }

  const userData = verifyTelegramInitData(init_data);
  if (!userData) {
    return res.status(401).json({ detail: 'Invalid init data' });
  }

  const seller = getOrCreateUser(userData.id, userData);
  const nft = nfts.get(Number(nft_id));
  if (!nft || nft.owner_id !== seller.id) {
    return res.status(404).json({ detail: 'NFT not found' });
  }

  if (nft.is_on_market) {
    return res.status(400).json({ detail: 'Already on market' });
  }

  nft.is_on_market = true;
  nft.price = numericPrice;

  const listing = {
    id: nextListingId++,
    nft_id: nft.id,
    seller_id: seller.id,
    price: numericPrice,
    is_active: true,
    created_at: new Date().toISOString()
  };
  marketListings.set(listing.id, listing);

  res.json({
    success: true,
    message: 'NFT виставлено на продаж!'
  });
});

// CANCEL SELL
app.post('/api/market/cancel', (req, res) => {
  const { init_data, nft_id } = req.body;
  const userData = verifyTelegramInitData(init_data);
  if (!userData) {
    return res.status(401).json({ detail: 'Invalid init data' });
  }

  const seller = getOrCreateUser(userData.id, userData);
  const nft = nfts.get(Number(nft_id));
  if (!nft || nft.owner_id !== seller.id) {
    return res.status(404).json({ detail: 'NFT not found' });
  }

  let activeListing = null;
  for (const l of marketListings.values()) {
    if (l.nft_id === nft.id && l.seller_id === seller.id && l.is_active) {
      activeListing = l;
      break;
    }
  }

  if (!activeListing) {
    return res.status(404).json({ detail: 'Active listing not found' });
  }

  activeListing.is_active = false;
  nft.is_on_market = false;

  res.json({
    success: true,
    message: 'NFT знято з продажу!'
  });
});

// LEADERBOARD
app.get('/api/leaderboard', (req, res) => {
  const playerList = Array.from(users.values())
    .filter((u) => u.telegram_id !== 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 50);

  res.json({
    leaderboard: playerList.map((user, i) => ({
      rank: i + 1,
      username: user.username || `Player_${user.telegram_id}`,
      balance: user.balance,
      nft_count: getUserNfts(user.id).length
    }))
  });
});

// CRAFT
app.post('/api/craft', (req, res) => {
  const { init_data, nft_ids } = req.body;
  const userData = verifyTelegramInitData(init_data);
  if (!userData) {
    return res.status(401).json({ detail: 'Invalid init data' });
  }

  const user = getOrCreateUser(userData.id, userData);
  if (!Array.isArray(nft_ids) || nft_ids.length < 3) {
    return res.status(400).json({ detail: 'Потрібно мінімум 3 NFT' });
  }

  const selectedNfts = nft_ids
    .map((id) => nfts.get(Number(id)))
    .filter((nft) => nft && nft.owner_id === user.id);

  if (selectedNfts.length < 3) {
    return res.status(400).json({ detail: 'Не всі NFT належать вам' });
  }

  const rarities = selectedNfts.map((n) => n.rarity);
  let newRarity = 'rare';
  if (rarities.includes('mythic')) newRarity = 'mythic';
  else if (rarities.includes('legendary')) newRarity = 'mythic';
  else if (rarities.includes('epic')) newRarity = 'legendary';
  else if (rarities.includes('rare')) newRarity = 'epic';

  selectedNfts.forEach((nft) => {
    for (const listing of marketListings.values()) {
      if (listing.nft_id === nft.id) {
        marketListings.delete(listing.id);
      }
    }
    nfts.delete(nft.id);
  });

  const newNft = {
    id: nextNftId++,
    name: `Crafted ${newRarity.charAt(0).toUpperCase() + newRarity.slice(1)} NFT`,
    description: 'Створено через крафт NEXORA',
    image_url: `/static/images/${newRarity}.png`,
    rarity: newRarity,
    price: 0.0,
    is_on_market: false,
    owner_id: user.id,
    creator_id: user.id,
    created_at: new Date().toISOString()
  };
  nfts.set(newNft.id, newNft);

  res.json({
    success: true,
    nft: {
      id: newNft.id,
      name: newNft.name,
      rarity: newNft.rarity,
      image_url: newNft.image_url
    }
  });
});

// NFT SUBMIT
app.post('/api/nft/submit', upload.single('image'), (req, res) => {
  const { init_data = '', name = '', description = '', price = 0 } = req.body;
  const userData = verifyTelegramInitData(init_data);
  if (!userData) {
    return res.status(401).json({ detail: 'Invalid init data' });
  }

  const user = getOrCreateUser(userData.id, userData);
  if (!req.file) {
    return res.status(400).json({ detail: 'Завантажте зображення' });
  }

  const ext = path.extname(req.file.originalname || '').toLowerCase();
  if (!['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext)) {
    return res.status(400).json({ detail: 'Дозволені формати: PNG, JPG, WEBP, GIF' });
  }

  const submission = {
    id: nextSubmissionId++,
    name: String(name).trim(),
    description: String(description).trim(),
    image_url: `/static/uploads/${req.file.filename}`,
    price: Number(price) || 0.0,
    creator_id: user.id,
    status: 'pending',
    admin_comment: null,
    created_at: new Date().toISOString(),
    reviewed_at: null
  };
  submissions.set(submission.id, submission);

  res.json({
    success: true,
    message: 'NFT надіслано на модерацію!',
    submission_id: submission.id
  });
});

// MY SUBMISSIONS
app.get('/api/nft/my-submissions', (req, res) => {
  const initData = req.query.init_data || '';
  const userData = verifyTelegramInitData(initData);
  if (!userData) {
    return res.status(401).json({ detail: 'Invalid init data' });
  }

  const user = getOrCreateUser(userData.id, userData);
  const userSubs = Array.from(submissions.values())
    .filter((s) => s.creator_id === user.id)
    .sort((a, b) => b.id - a.id);

  res.json({
    submissions: userSubs.map((s) => ({
      id: s.id,
      name: s.name,
      image_url: s.image_url,
      price: s.price,
      status: s.status,
      admin_comment: s.admin_comment,
      created_at: s.created_at
    }))
  });
});

// ADMIN SUBMISSIONS
app.get('/api/admin/submissions', (req, res) => {
  try {
    requireAdmin(req.query.init_data || '');
    const status = req.query.status || 'pending';
    const filtered = Array.from(submissions.values())
      .filter((s) => s.status === status)
      .sort((a, b) => b.id - a.id);

    res.json({
      submissions: filtered.map((s) => {
        const creator = users.get(s.creator_id);
        return {
          id: s.id,
          name: s.name,
          description: s.description,
          image_url: s.image_url,
          price: s.price,
          status: s.status,
          creator: creator ? creator.username || `User_${creator.telegram_id}` : 'Unknown',
          created_at: s.created_at
        };
      })
    });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});

// ADMIN APPROVE
app.post('/api/admin/approve', (req, res) => {
  try {
    const { init_data = '', submission_id, comment = '' } = req.body;
    requireAdmin(init_data);

    const sub = submissions.get(Number(submission_id));
    if (!sub || sub.status !== 'pending') {
      return res.status(404).json({ detail: 'Submission not found' });
    }

    const nft = {
      id: nextNftId++,
      name: sub.name,
      description: sub.description,
      image_url: sub.image_url,
      rarity: 'common',
      price: sub.price,
      owner_id: sub.creator_id,
      creator_id: sub.creator_id,
      is_on_market: false,
      created_at: new Date().toISOString()
    };
    nfts.set(nft.id, nft);

    sub.status = 'approved';
    sub.admin_comment = comment || 'Схвалено адміністратором';
    sub.reviewed_at = new Date().toISOString();

    res.json({
      success: true,
      message: `NFT '${sub.name}' схвалено!`,
      nft_id: nft.id
    });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});

// ADMIN REJECT
app.post('/api/admin/reject', (req, res) => {
  try {
    const { init_data = '', submission_id, comment = 'Rejected' } = req.body;
    requireAdmin(init_data);

    const sub = submissions.get(Number(submission_id));
    if (!sub || sub.status !== 'pending') {
      return res.status(404).json({ detail: 'Submission not found' });
    }

    sub.status = 'rejected';
    sub.admin_comment = comment;
    sub.reviewed_at = new Date().toISOString();

    res.json({
      success: true,
      message: `NFT '${sub.name}' відхилено.`
    });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});

// ADMIN STATS
app.get('/api/admin/stats', (req, res) => {
  try {
    requireAdmin(req.query.init_data || '');
    const activeMarketCount = Array.from(marketListings.values()).filter((l) => l.is_active).length;
    const totalBalance = Array.from(users.values()).reduce((sum, u) => sum + (u.balance || 0), 0);

    res.json({
      users: users.size,
      nfts: nfts.size,
      market: activeMarketCount,
      transactions: transactions.length,
      submissions: submissions.size,
      total_balance: totalBalance,
      admin_id: ADMIN_ID
    });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});

// ADMIN FIND USER
app.get('/api/admin/user/:telegram_id', (req, res) => {
  try {
    requireAdmin(req.query.init_data || '');
    const user = findUserByTelegramId(req.params.telegram_id);
    if (!user) {
      return res.status(404).json({ detail: 'Користувача не знайдено' });
    }
    const ownedNfts = getUserNfts(user.id);
    res.json({
      id: user.id,
      telegram_id: user.telegram_id,
      username: user.username,
      first_name: user.first_name,
      balance: user.balance,
      nft_count: ownedNfts.length,
      nfts: ownedNfts.map((nft) => ({
        id: nft.id,
        name: nft.name,
        rarity: nft.rarity,
        price: nft.price,
        is_on_market: nft.is_on_market
      }))
    });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});

// ADMIN USERS
app.get('/api/admin/users', (req, res) => {
  try {
    requireAdmin(req.query.init_data || '');
    const userList = Array.from(users.values())
      .filter((u) => u.telegram_id !== 0)
      .sort((a, b) => b.id - a.id)
      .slice(0, 100);

    res.json({
      users: userList.map((u) => ({
        id: u.id,
        telegram_id: u.telegram_id,
        username: u.username,
        first_name: u.first_name,
        balance: u.balance,
        nft_count: getUserNfts(u.id).length
      }))
    });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});

// ADMIN BALANCE
app.post('/api/admin/balance', (req, res) => {
  try {
    const { init_data = '', telegram_id, amount, mode = 'give' } = req.body;
    requireAdmin(init_data);

    const user = findUserByTelegramId(telegram_id);
    if (!user) {
      return res.status(404).json({ detail: 'Користувача не знайдено' });
    }

    const oldBalance = user.balance;
    const numericAmount = Number(amount);
    let txType = 'admin_give';
    let txAmount = numericAmount;
    let description = '';

    if (mode === 'give') {
      if (numericAmount <= 0) {
        return res.status(400).json({ detail: 'Сума повинна бути > 0' });
      }
      user.balance += numericAmount;
      txType = 'admin_give';
      txAmount = numericAmount;
      description = `Адміністратор видав ${numericAmount} NXR`;
    } else if (mode === 'take') {
      const absAmount = Math.abs(numericAmount);
      if (absAmount <= 0) {
        return res.status(400).json({ detail: 'Сума повинна бути > 0' });
      }
      if (user.balance < absAmount) {
        return res.status(400).json({ detail: 'У користувача недостатньо NXR' });
      }
      user.balance -= absAmount;
      txType = 'admin_take';
      txAmount = -absAmount;
      description = `Адміністратор забрав ${absAmount} NXR`;
    } else if (mode === 'set') {
      if (numericAmount < 0) {
        return res.status(400).json({ detail: "Баланс не може бути від'ємним" });
      }
      txAmount = numericAmount - user.balance;
      user.balance = numericAmount;
      txType = 'admin_set';
      description = `Адміністратор встановив баланс ${numericAmount} NXR`;
    } else {
      return res.status(400).json({ detail: 'Невідомий режим' });
    }

    transactions.push({
      id: nextTransactionId++,
      user_id: user.id,
      type: txType,
      amount: txAmount,
      description,
      created_at: new Date().toISOString()
    });

    res.json({
      success: true,
      telegram_id: user.telegram_id,
      old_balance: oldBalance,
      new_balance: user.balance,
      change: user.balance - oldBalance
    });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});

// ADMIN CREATE NFT
app.post('/api/admin/nft/create', (req, res) => {
  try {
    const {
      init_data = '',
      telegram_id,
      name,
      description = '',
      rarity = 'common',
      price = 0,
      image_url = ''
    } = req.body;
    requireAdmin(init_data);

    const user = findUserByTelegramId(telegram_id);
    if (!user) {
      return res.status(404).json({ detail: 'Користувача не знайдено' });
    }

    const allowedRarities = new Set(['common', 'rare', 'epic', 'legendary', 'mythic']);
    const cleanRarity = String(rarity).toLowerCase();
    if (!allowedRarities.has(cleanRarity)) {
      return res.status(400).json({ detail: 'Невідома рідкість NFT' });
    }

    const nft = {
      id: nextNftId++,
      name: String(name || 'NFT'),
      description: String(description || ''),
      image_url: image_url || `/static/images/${cleanRarity}.png`,
      rarity: cleanRarity,
      price: Math.max(0, Number(price) || 0),
      owner_id: user.id,
      creator_id: user.id,
      is_on_market: false,
      created_at: new Date().toISOString()
    };
    nfts.set(nft.id, nft);

    res.json({
      success: true,
      message: 'NFT створено',
      nft: {
        id: nft.id,
        name: nft.name,
        rarity: nft.rarity,
        price: nft.price,
        owner: user.telegram_id,
        image_url: nft.image_url
      }
    });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});

// ADMIN DELETE NFT
app.post('/api/admin/nft/delete', (req, res) => {
  try {
    const { init_data = '', nft_id } = req.body;
    requireAdmin(init_data);

    const nft = nfts.get(Number(nft_id));
    if (!nft) {
      return res.status(404).json({ detail: 'NFT не знайдено' });
    }

    for (const listing of marketListings.values()) {
      if (listing.nft_id === nft.id) {
        marketListings.delete(listing.id);
      }
    }

    nfts.delete(nft.id);

    res.json({
      success: true,
      message: `NFT '${nft.name}' видалено`,
      nft_id: nft.id
    });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});

// ADMIN CANCEL MARKET
app.post('/api/admin/market/cancel', (req, res) => {
  try {
    const { init_data = '', listing_id } = req.body;
    requireAdmin(init_data);

    const listing = marketListings.get(Number(listing_id));
    if (!listing) {
      return res.status(404).json({ detail: 'Listing не знайдено' });
    }

    listing.is_active = false;
    const nft = nfts.get(listing.nft_id);
    if (nft) {
      nft.is_on_market = false;
    }

    res.json({
      success: true,
      message: 'NFT примусово знято з маркету',
      listing_id: listing.id
    });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});

// ADMIN TRANSACTIONS
app.get('/api/admin/transactions', (req, res) => {
  try {
    requireAdmin(req.query.init_data || '');
    const recent = [...transactions].sort((a, b) => b.id - a.id).slice(0, 200);
    res.json({ transactions: recent });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});

// ADMIN PANEL HTML
app.get('/admin', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>NEXORA Admin</title>
<script src="https://telegram.org/js/telegram-web-app.js"></script>
<style>
* { box-sizing: border-box; }
body { margin: 0; padding: 20px; background: #080b12; color: #ffffff; font-family: Arial, sans-serif; }
.container { max-width: 1000px; margin: auto; }
h1 { margin-bottom: 5px; }
.subtitle { color: #8d96a8; margin-bottom: 25px; }
.card { background: #111722; border: 1px solid #202838; border-radius: 14px; padding: 20px; margin-bottom: 18px; }
.card h2 { margin-top: 0; }
input, select, button, textarea { width: 100%; padding: 11px; margin-top: 8px; margin-bottom: 8px; border-radius: 8px; border: 1px solid #30394c; background: #0b1019; color: white; }
button { background: #2563eb; border: none; cursor: pointer; font-weight: bold; }
button:hover { opacity: 0.85; }
.danger { background: #dc2626; }
.success { background: #16a34a; }
.warning { background: #d97706; }
.stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; }
.stat { background: #0b1019; padding: 15px; border-radius: 10px; }
.stat-value { font-size: 25px; font-weight: bold; }
.result { white-space: pre-wrap; background: #05080d; padding: 15px; border-radius: 10px; max-height: 400px; overflow: auto; }
.item { border: 1px solid #252e40; border-radius: 10px; padding: 12px; margin: 8px 0; }
</style>
</head>
<body>
<div class="container">
<h1>⚡ NEXORA ADMIN</h1>
<div class="subtitle">Панель тестування NEXORA CryptoGame</div>
<div class="card">
<h2>📊 Статистика</h2>
<div class="stat-grid">
<div class="stat"><div>Користувачі</div><div id="usersCount" class="stat-value">-</div></div>
<div class="stat"><div>NFT</div><div id="nftsCount" class="stat-value">-</div></div>
<div class="stat"><div>На маркеті</div><div id="marketCount" class="stat-value">-</div></div>
<div class="stat"><div>Транзакції</div><div id="transactionsCount" class="stat-value">-</div></div>
</div>
<button onclick="loadStats()">🔄 Оновити</button>
</div>
<div class="card">
<h2>👤 Користувач</h2>
<input id="telegramId" placeholder="Telegram ID" value="${ADMIN_ID}" />
<button onclick="findUser()">🔍 Знайти користувача</button>
<div id="userResult" class="result">Немає даних</div>
</div>
<div class="card">
<h2>💰 NXR</h2>
<input id="balanceTelegramId" placeholder="Telegram ID" value="${ADMIN_ID}" />
<input id="balanceAmount" type="number" step="0.01" placeholder="Кількість NXR" />
<button class="success" onclick="giveBalance()">💰 Видати NXR</button>
<button class="danger" onclick="takeBalance()">💸 Забрати NXR</button>
<button class="warning" onclick="setBalance()">🔢 Встановити баланс</button>
</div>
<div class="card">
<h2>🖼️ Створити тестовий NFT</h2>
<input id="nftTelegramId" placeholder="Telegram ID власника" value="${ADMIN_ID}" />
<input id="nftName" placeholder="Назва NFT" />
<textarea id="nftDescription" placeholder="Опис"></textarea>
<select id="nftRarity">
<option value="common">Common</option>
<option value="rare">Rare</option>
<option value="epic">Epic</option>
<option value="legendary">Legendary</option>
<option value="mythic">Mythic</option>
</select>
<input id="nftPrice" type="number" step="0.01" placeholder="Ціна" />
<input id="nftImage" placeholder="/static/images/example.png" />
<button class="success" onclick="createNFT()">🎁 Створити NFT</button>
</div>
<div class="card">
<h2>🎯 NFT</h2>
<input id="deleteNftId" type="number" placeholder="NFT ID" />
<button class="danger" onclick="deleteNFT()">🗑️ Видалити NFT</button>
</div>
<div class="card">
<h2>🛒 Маркет</h2>
<button onclick="loadMarket()">🔄 Оновити маркет</button>
<div id="marketResult"></div>
</div>
<div class="card">
<h2>👥 Користувачі</h2>
<button onclick="loadUsers()">🔄 Завантажити користувачів</button>
<div id="usersResult"></div>
</div>
<div class="card">
<h2>💳 Транзакції</h2>
<button onclick="loadTransactions()">🔄 Завантажити транзакції</button>
<div id="transactionsResult"></div>
</div>
<div class="card">
<h2>📋 Результат</h2>
<div id="result" class="result">Готово.</div>
</div>
</div>
<script>
const tg = window.Telegram && window.Telegram.WebApp;
if (tg) { tg.ready(); tg.expand(); }
function initData() { return (tg && tg.initData) ? tg.initData : ""; }
async function api(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Помилка API");
  return data;
}
function show(data) { document.getElementById("result").textContent = JSON.stringify(data, null, 2); }
async function loadStats() {
  try {
    const data = await api("/api/admin/stats?init_data=" + encodeURIComponent(initData()));
    document.getElementById("usersCount").textContent = data.users;
    document.getElementById("nftsCount").textContent = data.nfts;
    document.getElementById("marketCount").textContent = data.market;
    document.getElementById("transactionsCount").textContent = data.transactions;
    show(data);
  } catch (e) { show({ error: e.message }); }
}
async function findUser() {
  try {
    const id = document.getElementById("telegramId").value;
    const data = await api("/api/admin/user/" + encodeURIComponent(id) + "?init_data=" + encodeURIComponent(initData()));
    document.getElementById("userResult").textContent = JSON.stringify(data, null, 2);
    show(data);
  } catch (e) { show({ error: e.message }); }
}
async function changeBalance(mode) {
  try {
    const id = Number(document.getElementById("balanceTelegramId").value);
    const amount = Number(document.getElementById("balanceAmount").value);
    const data = await api("/api/admin/balance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ init_data: initData(), telegram_id: id, amount: mode === "take" ? -amount : amount, mode })
    });
    show(data);
    loadStats();
  } catch (e) { show({ error: e.message }); }
}
function giveBalance() { changeBalance("give"); }
function takeBalance() { changeBalance("take"); }
function setBalance() { changeBalance("set"); }
async function createNFT() {
  try {
    const data = await api("/api/admin/nft/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        init_data: initData(),
        telegram_id: Number(document.getElementById("nftTelegramId").value),
        name: document.getElementById("nftName").value,
        description: document.getElementById("nftDescription").value,
        rarity: document.getElementById("nftRarity").value,
        price: Number(document.getElementById("nftPrice").value),
        image_url: document.getElementById("nftImage").value
      })
    });
    show(data);
    loadStats();
  } catch (e) { show({ error: e.message }); }
}
async function deleteNFT() {
  try {
    const nftId = Number(document.getElementById("deleteNftId").value);
    const data = await api("/api/admin/nft/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ init_data: initData(), nft_id: nftId })
    });
    show(data);
    loadStats();
  } catch (e) { show({ error: e.message }); }
}
async function loadMarket() {
  try {
    const data = await api("/api/market");
    const container = document.getElementById("marketResult");
    container.innerHTML = "";
    data.listings.forEach(listing => {
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = "<b>" + listing.nft.name + "</b><br>NFT ID: " + listing.nft.id + "<br>Listing ID: " + listing.id + "<br>Price: " + listing.price + " NXR<br>Seller: " + listing.seller + "<br><br><button class='danger' onclick='cancelListing(" + listing.id + ")'>Зняти з продажу</button>";
      container.appendChild(div);
    });
    show(data);
  } catch (e) { show({ error: e.message }); }
}
async function cancelListing(listingId) {
  try {
    const data = await api("/api/admin/market/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ init_data: initData(), listing_id: listingId })
    });
    show(data);
    loadMarket();
    loadStats();
  } catch (e) { show({ error: e.message }); }
}
async function loadUsers() {
  try {
    const data = await api("/api/admin/users?init_data=" + encodeURIComponent(initData()));
    const container = document.getElementById("usersResult");
    container.innerHTML = "";
    data.users.forEach(user => {
      const div = document.createElement("div");
      div.className = "item";
      div.textContent = JSON.stringify(user, null, 2);
      container.appendChild(div);
    });
    show(data);
  } catch (e) { show({ error: e.message }); }
}
async function loadTransactions() {
  try {
    const data = await api("/api/admin/transactions?init_data=" + encodeURIComponent(initData()));
    const container = document.getElementById("transactionsResult");
    container.innerHTML = "";
    data.transactions.forEach(transaction => {
      const div = document.createElement("div");
      div.className = "item";
      div.textContent = JSON.stringify(transaction, null, 2);
      container.appendChild(div);
    });
    show(data);
  } catch (e) { show({ error: e.message }); }
}
loadStats();
</script>
</body>
</html>`);
});

// Static assets & Frontend serving
app.use('/static', express.static(path.join(__dirname, 'static')));
app.use('/app', express.static(path.join(__dirname, 'app')));
app.use('/', express.static(path.join(__dirname, 'app')));

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`NEXORA server listening on http://0.0.0.0:${PORT}`);
});
