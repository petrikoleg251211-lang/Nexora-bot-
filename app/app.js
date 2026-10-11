// NEXORA Mini App v3 — i18n + Effects + Filters + Transactions
const API_URL = window.location.origin;

let tg = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : {
    ready: () => {},
    expand: () => {},
    enableClosingConfirmation: () => {},
    themeParams: {},
    initData: ''
};
let userData = null;
let myNFTs = [];
let selectedForCraft = [];
let selectedFile = null;
let currentLang = localStorage.getItem('nexora_lang') || 'uk';
let marketListings = [];

try {
    tg.ready();
    tg.expand();
    if (tg.initData && tg.enableClosingConfirmation) tg.enableClosingConfirmation();
} catch (e) {}

document.body.style.background = (tg.themeParams && tg.themeParams.bg_color) || '#0a0a0f';
const initData = tg.initData || '';
const isAdminMode = new URLSearchParams(window.location.search).get('admin') === '1';

// ============ I18N ============
const i18n = {
    uk: {
        collection: '🖼️ Моя Колекція', create_nft: '➕ Створити NFT', market: '🛒 Ринок NFT',
        craft: '🔨 Крафт', profile: '👤 Профіль', leaderboard: '🏆 Топ Гравців', admin: '👑 Модерація NFT',
        nav_collection: 'Collection', nav_create: 'Create', nav_market: 'Market', nav_craft: 'Craft', nav_profile: 'Profile',
        sort_newest: 'Новіші', sort_rarity: 'За рідкістю', sort_price: 'За ціною',
        sort_price_asc: 'Дешевші', sort_price_desc: 'Дорожчі',
        filter_all: 'Всі', search_placeholder: '🔍 Пошук NFT...',
        label_name: 'Назва NFT *', label_desc: 'Опис', label_price: 'Ціна (Credits, 0 = не продавати)',
        label_image: 'Зображення *', upload_text: 'Натисни або перетягни зображення',
        upload_hint: 'PNG, JPG, WEBP, GIF до 5MB', btn_submit: '📤 Надіслати на модерацію',
        my_submissions: '🕐 Мої подання', craft_info: 'Виберіть 3+ NFT для злиття в більш рідкісний',
        btn_craft: '🔥 Злити вибрані', stat_nfts: 'NFT', stat_credits: 'Credits', stat_value: 'Value',
        transactions: '📜 Історія', terms_link: 'Умови використання', privacy_link: 'Конфіденційність',
        empty_collection: 'Колекція порожня', empty_market: 'Ринок порожній',
        empty_craft: 'Немає NFT для крафту', empty_leaderboard: 'Поки немає гравців',
        empty_submissions: 'Поки немає подань', empty_transactions: 'Немає транзакцій',
        empty_admin: 'Немає подань на модерацію',
        disclaimer1: 'незалежна NFT-платформа.', disclaimer2: 'Ми не пов\'язані з Telegram Gifts та не використовуємо блокчейн Telegram.',
        disclaimer3: 'NEX Credits — ігрова валюта без реальної вартості.',
        toast_buy_success: '✅ Купівля успішна!', toast_sell_success: '✅ Виставлено на продаж!',
        toast_craft_success: '✨ Створено', toast_submit_success: '✅ Надіслано на модерацію!',
        toast_approve: '✅ Схвалено!', toast_reject: '❌ Відхилено!',
        toast_no_name: 'Вкажіть назву NFT', toast_no_image: 'Завантажте зображення',
        toast_no_price: 'Вкажіть ціну', toast_insufficient: 'Недостатньо коштів',
        toast_select_more: 'Виберіть ще', toast_confirm_craft: 'Злити вибрані NFT? Старі буде видалено назавжди!',
        modal_buy: 'Купівля NFT', modal_sell: 'Продаж NFT', modal_sell_btn: '📤 Виставити на продаж',
        modal_cancel: 'Скасувати', modal_buy_btn: '🛒 Купити', modal_sell_price: 'Ціна в Credits',
        tx_buy: 'Купівля', tx_sell: 'Продаж', tx_craft: 'Крафт', tx_reward: 'Нагорода',
        rarity_common: 'Звичайний', rarity_rare: 'Рідкісний', rarity_epic: 'Епічний',
        rarity_legendary: 'Легендарний', rarity_mythic: 'Міфічний',
        status_pending: 'Очікує', status_approved: 'Схвалено', status_rejected: 'Відхилено'
    },
    en: {
        collection: '🖼️ My Collection', create_nft: '➕ Create NFT', market: '🛒 NFT Market',
        craft: '🔨 Craft', profile: '👤 Profile', leaderboard: '🏆 Leaderboard', admin: '👑 Moderation',
        nav_collection: 'Collection', nav_create: 'Create', nav_market: 'Market', nav_craft: 'Craft', nav_profile: 'Profile',
        sort_newest: 'Newest', sort_rarity: 'By Rarity', sort_price: 'By Price',
        sort_price_asc: 'Cheapest', sort_price_desc: 'Most Expensive',
        filter_all: 'All', search_placeholder: '🔍 Search NFT...',
        label_name: 'NFT Name *', label_desc: 'Description', label_price: 'Price (Credits, 0 = not for sale)',
        label_image: 'Image *', upload_text: 'Click or drag image here',
        upload_hint: 'PNG, JPG, WEBP, GIF up to 5MB', btn_submit: '📤 Submit for Review',
        my_submissions: '🕐 My Submissions', craft_info: 'Select 3+ NFTs to merge into a rarer one',
        btn_craft: '🔥 Merge Selected', stat_nfts: 'NFTs', stat_credits: 'Credits', stat_value: 'Value',
        transactions: '📜 History', terms_link: 'Terms of Use', privacy_link: 'Privacy Policy',
        empty_collection: 'Collection is empty', empty_market: 'Market is empty',
        empty_craft: 'No NFTs to craft', empty_leaderboard: 'No players yet',
        empty_submissions: 'No submissions yet', empty_transactions: 'No transactions',
        empty_admin: 'No pending submissions',
        disclaimer1: 'independent NFT platform.', disclaimer2: 'We are not affiliated with Telegram Gifts and do not use Telegram blockchain.',
        disclaimer3: 'NEX Credits are in-game currency with no real value.',
        toast_buy_success: '✅ Purchase successful!', toast_sell_success: '✅ Listed for sale!',
        toast_craft_success: '✨ Created', toast_submit_success: '✅ Submitted for review!',
        toast_approve: '✅ Approved!', toast_reject: '❌ Rejected!',
        toast_no_name: 'Enter NFT name', toast_no_image: 'Upload an image',
        toast_no_price: 'Enter a price', toast_insufficient: 'Insufficient funds',
        toast_select_more: 'Select more', toast_confirm_craft: 'Merge selected NFTs? Old ones will be permanently deleted!',
        modal_buy: 'Buy NFT', modal_sell: 'Sell NFT', modal_sell_btn: '📤 List for Sale',
        modal_cancel: 'Cancel', modal_buy_btn: '🛒 Buy', modal_sell_price: 'Price in Credits',
        tx_buy: 'Purchase', tx_sell: 'Sale', tx_craft: 'Craft', tx_reward: 'Reward',
        rarity_common: 'Common', rarity_rare: 'Rare', rarity_epic: 'Epic',
        rarity_legendary: 'Legendary', rarity_mythic: 'Mythic',
        status_pending: 'Pending', status_approved: 'Approved', status_rejected: 'Rejected'
    },
    ru: {
        collection: '🖼️ Моя Коллекция', create_nft: '➕ Создать NFT', market: '🛒 Рынок NFT',
        craft: '🔨 Крафт', profile: '👤 Профиль', leaderboard: '🏆 Топ Игроков', admin: '👑 Модерация NFT',
        nav_collection: 'Коллекция', nav_create: 'Создать', nav_market: 'Рынок', nav_craft: 'Крафт', nav_profile: 'Профиль',
        sort_newest: 'Новые', sort_rarity: 'По редкости', sort_price: 'По цене',
        sort_price_asc: 'Дешевле', sort_price_desc: 'Дороже',
        filter_all: 'Все', search_placeholder: '🔍 Поиск NFT...',
        label_name: 'Название NFT *', label_desc: 'Описание', label_price: 'Цена (Credits, 0 = не продавать)',
        label_image: 'Изображение *', upload_text: 'Нажми или перетащи изображение',
        upload_hint: 'PNG, JPG, WEBP, GIF до 5MB', btn_submit: '📤 Отправить на модерацию',
        my_submissions: '🕐 Мои заявки', craft_info: 'Выбери 3+ NFT для слияния в более редкий',
        btn_craft: '🔥 Слить выбранные', stat_nfts: 'NFT', stat_credits: 'Credits', stat_value: 'Value',
        transactions: '📜 История', terms_link: 'Условия использования', privacy_link: 'Конфиденциальность',
        empty_collection: 'Коллекция пуста', empty_market: 'Рынок пуст',
        empty_craft: 'Нет NFT для крафта', empty_leaderboard: 'Пока нет игроков',
        empty_submissions: 'Пока нет заявок', empty_transactions: 'Нет транзакций',
        empty_admin: 'Нет заявок на модерацию',
        disclaimer1: 'независимая NFT-платформа.', disclaimer2: 'Мы не связаны с Telegram Gifts и не используем блокчейн Telegram.',
        disclaimer3: 'NEX Credits — игровая валюта без реальной стоимости.',
        toast_buy_success: '✅ Покупка успешна!', toast_sell_success: '✅ Выставлено на продажу!',
        toast_craft_success: '✨ Создано', toast_submit_success: '✅ Отправлено на модерацию!',
        toast_approve: '✅ Одобрено!', toast_reject: '❌ Отклонено!',
        toast_no_name: 'Укажи название NFT', toast_no_image: 'Загрузи изображение',
        toast_no_price: 'Укажи цену', toast_insufficient: 'Недостаточно средств',
        toast_select_more: 'Выбери еще', toast_confirm_craft: 'Слить выбранные NFT? Старые будут удалены навсегда!',
        modal_buy: 'Покупка NFT', modal_sell: 'Продажа NFT', modal_sell_btn: '📤 Выставить на продажу',
        modal_cancel: 'Отмена', modal_buy_btn: '🛒 Купить', modal_sell_price: 'Цена в Credits',
        tx_buy: 'Покупка', tx_sell: 'Продажа', tx_craft: 'Крафт', tx_reward: 'Награда',
        rarity_common: 'Обычный', rarity_rare: 'Редкий', rarity_epic: 'Эпический',
        rarity_legendary: 'Легендарный', rarity_mythic: 'Мифический',
        status_pending: 'Ожидает', status_approved: 'Одобрено', status_rejected: 'Отклонено'
    }
};

function t(key) {
    return i18n[currentLang][key] || key;
}

function applyLanguage() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (i18n[currentLang][key]) el.textContent = i18n[currentLang][key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.dataset.i18nPlaceholder;
        if (i18n[currentLang][key]) el.placeholder = i18n[currentLang][key];
    });
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === currentLang);
    });
}

document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        currentLang = btn.dataset.lang;
        localStorage.setItem('nexora_lang', currentLang);
        applyLanguage();
        const activeTab = document.querySelector('.tab.active').id.replace('tab-', '');
        switchTab(activeTab);
    });
});

// ============ TOAST SYSTEM ============
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ============ CONFETTI ============
function fireConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const particles = [];
    const colors = ['#7c3aed', '#f59e0b', '#22c55e', '#ef4444', '#3b82f6', '#a855f7'];
    for (let i = 0; i < 100; i++) {
        particles.push({
            x: canvas.width / 2, y: canvas.height / 2,
            vx: (Math.random() - 0.5) * 15, vy: (Math.random() - 0.5) * 15 - 5,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: Math.random() * 8 + 4, life: 1
        });
    }
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let alive = false;
        particles.forEach(p => {
            if (p.life <= 0) return;
            alive = true;
            p.x += p.vx; p.y += p.vy; p.vy += 0.3; p.life -= 0.015;
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fill();
        });
        if (alive) requestAnimationFrame(animate);
        else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    animate();
}

// ============ NAVIGATION ============
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        switchTab(tab);
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    const tabEl = document.getElementById(`tab-${tabName}`);
    if (tabEl) tabEl.classList.add('active');
    if (tabName === 'collection') loadCollection();
    if (tabName === 'create') loadMySubmissions();
    if (tabName === 'market') loadMarket();
    if (tabName === 'craft') loadCraft();
    if (tabName === 'profile') loadProfile();
    if (tabName === 'leaderboard') loadLeaderboard();
    if (tabName === 'admin') loadAdminSubmissions();
}

// ============ API ============
async function apiGet(endpoint) {
    const sep = endpoint.includes('?') ? '&' : '?';
    const url = `${API_URL}${endpoint}${sep}init_data=${encodeURIComponent(initData)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

async function apiPost(endpoint, body) {
    const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, init_data: initData })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

// ============ USER ============
async function loadUser() {
    try {
        userData = await apiGet('/api/me');
        document.getElementById('balance').textContent = Math.floor(userData.balance).toLocaleString();
        document.getElementById('profile-name').textContent = userData.first_name || t('nav_profile');
        document.getElementById('profile-avatar').textContent = (userData.first_name || '👤').charAt(0);
        document.getElementById('stat-nfts').textContent = userData.nft_count;
        document.getElementById('stat-balance').textContent = Math.floor(userData.balance);
        document.getElementById('stat-value').textContent = Math.floor(userData.collection_value || 0);
        if (userData.is_admin) {
            const nav = document.getElementById('bottom-nav');
            if (!document.querySelector('[data-tab="admin"]')) {
                const btn = document.createElement('button');
                btn.className = 'nav-btn';
                btn.dataset.tab = 'admin';
                btn.innerHTML = '<span class="nav-icon">👑</span><span class="nav-label">Admin</span>';
                btn.addEventListener('click', () => {
                    switchTab('admin');
                    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                });
                nav.appendChild(btn);
            }
        }
        if (isAdminMode && userData.is_admin) switchTab('admin');
    } catch (e) { console.error(e); }
}

// ============ COLLECTION ============
async function loadCollection() {
    showSkeleton('collection');
    try {
        const data = await apiGet('/api/collection');
        myNFTs = data.nfts || [];
        hideSkeleton('collection');
        const grid = document.getElementById('collection-grid');
        const empty = document.getElementById('empty-collection');
        const sortVal = document.getElementById('collection-sort')?.value || 'newest';
        myNFTs = sortNFTs(myNFTs, sortVal);
        if (myNFTs.length === 0) {
            grid.classList.add('hidden');
            empty.classList.remove('hidden');
            return;
        }
        empty.classList.add('hidden');
        grid.classList.remove('hidden');
        grid.innerHTML = myNFTs.map(nft => renderNFTCard(nft)).join('');
        grid.querySelectorAll('.nft-card').forEach((card, i) => {
            card.addEventListener('click', () => showNFTDetails(myNFTs[i]));
        });
    } catch (e) { console.error(e); hideSkeleton('collection'); }
}

document.getElementById('collection-sort')?.addEventListener('change', () => {
    if (document.getElementById('tab-collection').classList.contains('active')) loadCollection();
});

// ============ CREATE NFT ============
const fileUpload = document.getElementById('file-upload');
const fileInput = document.getElementById('create-image');
const filePreview = document.getElementById('file-preview');

fileUpload.addEventListener('click', () => fileInput.click());
fileUpload.addEventListener('dragover', (e) => { e.preventDefault(); fileUpload.classList.add('dragover'); });
fileUpload.addEventListener('dragleave', () => fileUpload.classList.remove('dragover'));
fileUpload.addEventListener('drop', (e) => {
    e.preventDefault();
    fileUpload.classList.remove('dragover');
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', (e) => { if (e.target.files.length) handleFile(e.target.files[0]); });

function handleFile(file) {
    if (file.size > 5 * 1024 * 1024) { showToast('Max 5MB', 'error'); return; }
    selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        filePreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        filePreview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

document.getElementById('create-submit').addEventListener('click', async () => {
    const name = document.getElementById('create-name').value.trim();
    const desc = document.getElementById('create-desc').value.trim();
    const price = parseFloat(document.getElementById('create-price').value) || 0;
    if (!name) { showToast(t('toast_no_name'), 'error'); return; }
    if (!selectedFile) { showToast(t('toast_no_image'), 'error'); return; }
    const formData = new FormData();
    formData.append('init_data', initData);
    formData.append('name', name);
    formData.append('description', desc);
    formData.append('price', price);
    formData.append('image', selectedFile);
    try {
        const res = await fetch(`${API_URL}/api/nft/submit`, { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Error');
        showToast(t('toast_submit_success'), 'success');
        document.getElementById('create-name').value = '';
        document.getElementById('create-desc').value = '';
        document.getElementById('create-price').value = '0';
        selectedFile = null;
        filePreview.classList.add('hidden');
        loadMySubmissions();
    } catch (e) { showToast(e.message, 'error'); }
});

async function loadMySubmissions() {
    try {
        const data = await apiGet('/api/nft/my-submissions');
        const container = document.getElementById('my-submissions');
        const subs = data.submissions || [];
        if (subs.length === 0) {
            container.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><p>${t('empty_submissions')}</p></div>`;
            return;
        }
        container.innerHTML = subs.map(s => renderSubmissionCard(s)).join('');
    } catch (e) { console.error(e); }
}

// ============ MARKET ============
async function loadMarket() {
    showSkeleton('market');
    try {
        const res = await fetch(`${API_URL}/api/market`);
        const data = await res.json();
        marketListings = data.listings || [];
        hideSkeleton('market');
        renderMarket();
    } catch (e) { console.error(e); hideSkeleton('market'); }
}

function renderMarket() {
    const grid = document.getElementById('market-grid');
    const search = (document.getElementById('market-search')?.value || '').toLowerCase();
    const filter = document.getElementById('market-filter')?.value || 'all';
    const sort = document.getElementById('market-sort')?.value || 'newest';
    let listings = [...marketListings];
    if (search) listings = listings.filter(l => l.nft.name.toLowerCase().includes(search));
    if (filter !== 'all') listings = listings.filter(l => l.nft.rarity === filter);
    if (sort === 'price_asc') listings.sort((a, b) => a.price - b.price);
    if (sort === 'price_desc') listings.sort((a, b) => b.price - a.price);
    if (listings.length === 0) {
        grid.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><p>${t('empty_market')}</p></div>`;
        return;
    }
    grid.innerHTML = listings.map(l => renderMarketCard(l)).join('');
    grid.querySelectorAll('.nft-card').forEach((card, i) => {
        card.addEventListener('click', () => showBuyModal(listings[i]));
    });
}

document.getElementById('market-search')?.addEventListener('input', () => { if (document.getElementById('tab-market').classList.contains('active')) renderMarket(); });
document.getElementById('market-filter')?.addEventListener('change', () => { if (document.getElementById('tab-market').classList.contains('active')) renderMarket(); });
document.getElementById('market-sort')?.addEventListener('change', () => { if (document.getElementById('tab-market').classList.contains('active')) renderMarket(); });

// ============ CRAFT ============
async function loadCraft() {
    try {
        const data = await apiGet('/api/collection');
        myNFTs = data.nfts || [];
        selectedForCraft = [];
        updateCraftButton();
        const grid = document.getElementById('craft-grid');
        if (myNFTs.length === 0) {
            grid.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><p>${t('empty_craft')}</p></div>`;
            return;
        }
        grid.innerHTML = myNFTs.map((nft, i) => renderNFTCard(nft, true, i)).join('');
        grid.querySelectorAll('.nft-card').forEach((card, i) => {
            card.addEventListener('click', () => toggleCraftSelection(card, myNFTs[i]));
        });
    } catch (e) { console.error(e); }
}

function toggleCraftSelection(card, nft) {
    const id = nft.id;
    if (selectedForCraft.includes(id)) {
        selectedForCraft = selectedForCraft.filter(x => x !== id);
        card.classList.remove('selected');
    } else {
        selectedForCraft.push(id);
        card.classList.add('selected');
    }
    updateCraftButton();
}

function updateCraftButton() {
    const btn = document.getElementById('craft-btn');
    const need = Math.max(0, 3 - selectedForCraft.length);
    btn.disabled = selectedForCraft.length < 3;
    btn.textContent = need === 0 ? `🔥 ${t('btn_craft')} (${selectedForCraft.length})` : `🔥 ${t('toast_select_more')} ${need}`;
}

document.getElementById('craft-btn').addEventListener('click', async () => {
    if (selectedForCraft.length < 3) return;
    const executeCraft = async (confirmed) => {
        if (!confirmed) return;
        try {
            const res = await apiPost('/api/craft', { nft_ids: selectedForCraft });
            fireConfetti();
            showToast(`${t('toast_craft_success')}: ${res.nft.name} (${res.nft.rarity})!`, 'success');
            selectedForCraft = [];
            loadCraft();
            loadUser();
        } catch (e) { showToast(e.message, 'error'); }
    };
    if (tg && tg.initData && typeof tg.showConfirm === 'function') {
        try {
            tg.showConfirm(t('toast_confirm_craft'), executeCraft);
            return;
        } catch (e) {}
    }
    executeCraft(true);
});

// ============ PROFILE ============
async function loadProfile() {
    await loadUser();
    loadTransactions();
}

async function loadTransactions() {
    const container = document.getElementById('transactions-list');
    const txs = [
        { type: 'reward', desc: 'Starter Pack', amount: 1000, date: new Date().toISOString() }
    ];
    if (txs.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><p>${t('empty_transactions')}</p></div>`;
        return;
    }
    container.innerHTML = txs.map(tx => renderTransaction(tx)).join('');
}

// ============ LEADERBOARD ============
async function loadLeaderboard() {
    showSkeleton('leaderboard');
    try {
        const res = await fetch(`${API_URL}/api/leaderboard`);
        const data = await res.json();
        hideSkeleton('leaderboard');
        const list = document.getElementById('leaderboard-list');
        const board = data.leaderboard || [];
        if (board.length === 0) {
            list.innerHTML = `<div class="empty-state"><div class="empty-icon">🏆</div><p>${t('empty_leaderboard')}</p></div>`;
            return;
        }
        list.innerHTML = board.map(p => `
            <div class="leaderboard-item">
                <div class="leaderboard-rank rank-${p.rank <= 3 ? p.rank : 'other'}">${p.rank}</div>
                <div class="leaderboard-info">
                    <div class="leaderboard-name">${escapeHtml(p.username)}</div>
                    <div class="leaderboard-meta">${p.nft_count} NFT</div>
                </div>
                <div class="leaderboard-balance">${Math.floor(p.balance).toLocaleString()} 💎</div>
            </div>
        `).join('');
    } catch (e) { console.error(e); hideSkeleton('leaderboard'); }
}

// ============ ADMIN ============
async function loadAdminSubmissions() {
    try {
        const data = await apiGet('/api/admin/submissions?status=pending');
        const container = document.getElementById('admin-submissions');
        const subs = data.submissions || [];
        if (subs.length === 0) {
            container.innerHTML = `<div class="empty-state"><div class="empty-icon">✅</div><p>${t('empty_admin')}</p></div>`;
            return;
        }
        container.innerHTML = subs.map(s => `
            <div class="submission-card" style="flex-direction:column;align-items:stretch;">
                <div style="display:flex;gap:12px;align-items:center;">
                    <img src="${s.image_url}" class="submission-img" style="width:80px;height:80px;" alt="" onerror="this.style.display='none'; this.parentElement.insertAdjacentHTML('afterbegin','<div style='width:80px;height:80px;background:var(--surface-light);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:32px;flex-shrink:0;'>🎴</div>'); this.remove();">
                    <div class="submission-info">
                        <div class="submission-name">${escapeHtml(s.name)}</div>
                        <div class="submission-meta">${escapeHtml(s.description || '—')}</div>
                        <div class="submission-meta">💎 ${Math.floor(s.price)} · ${escapeHtml(s.creator)}</div>
                    </div>
                </div>
                <div class="admin-actions">
                    <button class="btn-approve" onclick="approveSubmission(${s.id})">✅ ${t('toast_approve')}</button>
                    <button class="btn-reject" onclick="rejectSubmission(${s.id})">❌ ${t('toast_reject')}</button>
                </div>
            </div>
        `).join('');
    } catch (e) { showToast(e.message, 'error'); }
}

window.approveSubmission = async (id) => {
    try {
        const res = await apiPost('/api/admin/approve', { submission_id: id, comment: '' });
        showToast(t('toast_approve'), 'success');
        loadAdminSubmissions();
    } catch (e) { showToast(e.message, 'error'); }
};

window.rejectSubmission = async (id) => {
    try {
        const res = await apiPost('/api/admin/reject', { submission_id: id, comment: 'Rejected' });
        showToast(t('toast_reject'), 'error');
        loadAdminSubmissions();
    } catch (e) { showToast(e.message, 'error'); }
};

// ============ HELPERS ============
function sortNFTs(nfts, sortType) {
    const sorted = [...nfts];
    const rarityOrder = { mythic: 5, legendary: 4, epic: 3, rare: 2, common: 1 };
    if (sortType === 'rarity') sorted.sort((a, b) => (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0));
    if (sortType === 'price') sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
    return sorted;
}

function showSkeleton(type) {
    const skeleton = document.getElementById(`${type}-skeleton`);
    const grid = document.getElementById(`${type}-grid`);
    if (skeleton) skeleton.classList.remove('hidden');
    if (grid) grid.classList.add('hidden');
}

function hideSkeleton(type) {
    const skeleton = document.getElementById(`${type}-skeleton`);
    const grid = document.getElementById(`${type}-grid`);
    if (skeleton) skeleton.classList.add('hidden');
    if (grid) grid.classList.remove('hidden');
}

function renderNFTCard(nft, isCraft = false, index = 0) {
    const emoji = getNFTEmoji(nft.rarity);
    return `
        <div class="nft-card ${isCraft ? 'craft-card' : ''}" data-id="${nft.id}" data-index="${index}" data-rarity="${nft.rarity}">
            <div class="nft-image">
                ${nft.image_url ? `<img src="${nft.image_url}" alt="${escapeHtml(nft.name)}" loading="lazy" onerror="this.style.display='none'; this.parentElement.innerHTML='${emoji}'">` : emoji}
                <span class="nft-rarity rarity-${nft.rarity}">${t('rarity_' + nft.rarity) || nft.rarity}</span>
            </div>
            <div class="nft-info">
                <div class="nft-name">${escapeHtml(nft.name)}</div>
                ${nft.price > 0 ? `<div class="nft-price">💎 ${Math.floor(nft.price)}</div>` : ''}
            </div>
        </div>
    `;
}

function renderMarketCard(listing) {
    const nft = listing.nft;
    const emoji = getNFTEmoji(nft.rarity);
    return `
        <div class="nft-card" data-listing-id="${listing.id}" data-rarity="${nft.rarity}">
            <div class="nft-image">
                ${nft.image_url ? `<img src="${nft.image_url}" alt="${escapeHtml(nft.name)}" loading="lazy" onerror="this.style.display='none'; this.parentElement.innerHTML='${emoji}'">` : emoji}
                <span class="nft-rarity rarity-${nft.rarity}">${t('rarity_' + nft.rarity) || nft.rarity}</span>
            </div>
            <div class="nft-info">
                <div class="nft-name">${escapeHtml(nft.name)}</div>
                <div class="nft-price">💎 ${Math.floor(listing.price)}</div>
                <div class="nft-seller">@${escapeHtml(listing.seller)}</div>
            </div>
        </div>
    `;
}

function renderSubmissionCard(s) {
    return `
        <div class="submission-card">
            <img src="${s.image_url}" class="submission-img" alt="" onerror="this.style.display='none'; this.parentElement.querySelector('.submission-img').insertAdjacentHTML('afterend','<div style='width:64px;height:64px;background:var(--surface-light);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;'>🎴</div>'); this.remove();">
            <div class="submission-info">
                <div class="submission-name">${escapeHtml(s.name)}</div>
                <div class="submission-meta">💎 ${Math.floor(s.price)} · ${new Date(s.created_at).toLocaleDateString()}</div>
                ${s.admin_comment ? `<div class="submission-meta" style="color:var(--danger);margin-top:4px;">💬 ${escapeHtml(s.admin_comment)}</div>` : ''}
            </div>
            <span class="submission-status status-${s.status}">${t('status_' + s.status) || s.status}</span>
        </div>
    `;
}

function renderTransaction(tx) {
    const isPositive = tx.amount >= 0;
    const icons = { buy: '🛒', sell: '💰', craft: '🔨', reward: '🎁' };
    return `
        <div class="transaction-item">
            <div class="transaction-icon">${icons[tx.type] || '💎'}</div>
            <div class="transaction-info">
                <div class="transaction-desc">${escapeHtml(tx.desc)}</div>
                <div class="transaction-date">${new Date(tx.date).toLocaleDateString()}</div>
            </div>
            <div class="transaction-amount ${isPositive ? 'tx-positive' : 'tx-negative'}">${isPositive ? '+' : ''}${Math.floor(tx.amount)}</div>
        </div>
    `;
}

function getNFTEmoji(rarity) {
    const map = { common: '📦', rare: '💎', epic: '🔮', legendary: '👑', mythic: '🔥' };
    return map[rarity] || '🎴';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============ MODALS ============
function showNFTDetails(nft) {
    const modal = document.getElementById('modal');
    document.getElementById('modal-title').textContent = nft.name;
    document.getElementById('modal-body').innerHTML = `
        <div style="text-align:center; font-size:72px; margin-bottom:16px;">${getNFTEmoji(nft.rarity)}</div>
        <p style="color:var(--text-muted); margin-bottom:8px;">${escapeHtml(nft.description || '—')}</p>
        <div style="display:flex; gap:12px; justify-content:center; margin:16px 0;">
            <span class="nft-rarity rarity-${nft.rarity}" style="position:static;">${t('rarity_' + nft.rarity) || nft.rarity}</span>
            ${nft.price > 0 ? `<span style="color:var(--accent); font-weight:800;">💎 ${Math.floor(nft.price)}</span>` : ''}
        </div>
        ${!nft.is_on_market ? `<button class="btn-primary" onclick="showSellModal(${nft.id}, '${escapeHtml(nft.name)}')">💰 ${t('modal_sell')}</button>` : '<p style="color:var(--text-muted); text-align:center;">On market</p>'}
    `;
    modal.classList.remove('hidden');
}

function showBuyModal(listing) {
    const modal = document.getElementById('modal');
    const nft = listing.nft;
    document.getElementById('modal-title').textContent = t('modal_buy');
    document.getElementById('modal-body').innerHTML = `
        <div style="text-align:center; font-size:72px; margin-bottom:16px;">${getNFTEmoji(nft.rarity)}</div>
        <h4 style="text-align:center; margin-bottom:8px;">${escapeHtml(nft.name)}</h4>
        <p style="color:var(--text-muted); text-align:center; margin-bottom:16px;">${escapeHtml(nft.description || '')}</p>
        <div style="text-align:center; font-size:22px; font-weight:800; color:var(--accent); margin-bottom:8px;">💎 ${Math.floor(listing.price)}</div>
        <p style="text-align:center; color:var(--text-muted); font-size:13px;">@${escapeHtml(listing.seller)}</p>
        <button class="btn-primary" onclick="buyNFT(${listing.id})">${t('modal_buy_btn')}</button>
        <button class="btn-secondary" onclick="closeModal()">${t('modal_cancel')}</button>
    `;
    modal.classList.remove('hidden');
}

function showSellModal(nftId, nftName) {
    const modal = document.getElementById('modal');
    document.getElementById('modal-title').textContent = t('modal_sell');
    document.getElementById('modal-body').innerHTML = `
        <p style="margin-bottom:16px;">${escapeHtml(nftName)}</p>
        <input type="number" id="sell-price" placeholder="${t('modal_sell_price')}" style="width:100%; padding:14px; background:var(--surface-light); border:1px solid var(--border); border-radius:12px; color:var(--text); font-size:16px; margin-bottom:16px;" min="1">
        <button class="btn-primary" onclick="sellNFT(${nftId})">${t('modal_sell_btn')}</button>
        <button class="btn-secondary" onclick="closeModal()">${t('modal_cancel')}</button>
    `;
    modal.classList.remove('hidden');
}

window.buyNFT = async (listingId) => {
    try {
        const res = await apiPost('/api/market/buy', { listing_id: listingId });
        showToast(t('toast_buy_success'), 'success');
        closeModal();
        loadMarket();
        loadUser();
    } catch (e) { showToast(e.message, 'error'); }
};

window.sellNFT = async (nftId) => {
    const price = parseFloat(document.getElementById('sell-price').value);
    if (!price || price <= 0) { showToast(t('toast_no_price'), 'error'); return; }
    try {
        const res = await apiPost('/api/market/sell', { nft_id: nftId, price: price });
        showToast(t('toast_sell_success'), 'success');
        closeModal();
        loadCollection();
        loadUser();
    } catch (e) { showToast(e.message, 'error'); }
};

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

document.querySelector('.modal-close').addEventListener('click', closeModal);
document.getElementById('modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal') closeModal();
});

// ============ INIT ============
applyLanguage();
loadUser();
loadCollection();
