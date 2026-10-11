// NEXORA v4.0 — 2-Stage Collectible Gifts (Box -> Revealed Item + Backdrop + Pattern Symbol) & 3D Entry Animations
const API_URL = window.location.origin;

let tg = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : {
    ready: () => {},
    expand: () => {},
    setHeaderColor: () => {},
    setBackgroundColor: () => {},
    initData: '',
    HapticFeedback: null
};
try {
    tg.ready();
    tg.expand();
    tg.setHeaderColor('#17212b');
    tg.setBackgroundColor('#0e1621');
} catch {}

// ============ SOUND EFFECTS (Web Audio API) ============
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
function ensureAudio() {
    if (!audioCtx && AudioCtx) audioCtx = new AudioCtx();
}
function playTone(freq = 520, dur = 0.08, type = 'sine', vol = 0.07) {
    try {
        ensureAudio();
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(vol, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + dur);
    } catch {}
}
const sfx = {
    tick: () => playTone(660, 0.035, 'triangle', 0.045),
    entry: () => {
        playTone(440, 0.07, 'sine', 0.05);
        setTimeout(() => playTone(587, 0.09, 'sine', 0.06), 60);
        setTimeout(() => playTone(880, 0.16, 'triangle', 0.07), 120);
    },
    win: () => {
        playTone(523, 0.1, 'sine', 0.09);
        setTimeout(() => playTone(659, 0.1, 'sine', 0.09), 90);
        setTimeout(() => playTone(784, 0.12, 'sine', 0.1), 180);
        setTimeout(() => playTone(1046, 0.26, 'triangle', 0.12), 270);
    },
    coin: () => {
        playTone(880, 0.07, 'sine', 0.07);
        setTimeout(() => playTone(1174, 0.14, 'sine', 0.08), 70);
    }
};

// ============ STATE ============
let currentLang = localStorage.getItem('nexora_lang') || 'uk';
let currentUser = null;
let myNFTs = [];
let craftSelected = [];
let selectedBoxFile = null;
let selectedItemFile = null;
let adminBoxFile = null;
let adminItemFile = null;
let adminSelectedPreset = null;
let giftPresets = [];
let currentMarketMode = 'all';
let isSpinningRoulette = false;

// ============ HELPERS ============
function getInitData() {
    return tg.initData || 'user=%7B%22id%22%3A100001%2C%22first_name%22%3A%22%D0%9A%D0%BE%D0%BB%D0%B5%D0%BA%D1%86%D1%96%D0%BE%D0%BD%D0%B5%D1%80%22%2C%22username%22%3A%22nexora_owner%22%7D';
}

async function apiRequest(endpoint, options = {}) {
    const headers = {
        'X-Telegram-Init-Data': getInitData(),
        ...(options.headers || {})
    };
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }
    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Помилка запиту');
    return data;
}

function showToast(msg, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = `toast ${type}`;
    setTimeout(() => toast.classList.add('hidden'), 3200);
}

function haptic(type = 'light') {
    try {
        if (tg.HapticFeedback) {
            if (type === 'success' || type === 'error' || type === 'warning') {
                tg.HapticFeedback.notificationOccurred(type);
            } else if (type === 'selection') {
                tg.HapticFeedback.selectionChanged();
            } else {
                tg.HapticFeedback.impactOccurred(type);
            }
        }
    } catch {}
}

function spawnConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const particles = [];
    const colors = ['#2ea6ff', '#f5a623', '#31b545', '#ef4444', '#a855f7'];
    for (let i = 0; i < 85; i++) {
        particles.push({
            x: canvas.width / 2,
            y: canvas.height / 2,
            vx: (Math.random() - 0.5) * 14,
            vy: (Math.random() - 0.5) * 14 - 4,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: Math.random() * 6 + 4,
            life: 1
        });
    }
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let alive = false;
        particles.forEach(p => {
            p.life -= 0.018;
            if (p.life <= 0) return;
            alive = true;
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.26;
            const radius = Math.max(0.1, p.size * p.life);
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            ctx.fill();
        });
        if (alive) requestAnimationFrame(animate);
        else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    animate();
}

function formatTimeRemaining(isoEnd) {
    if (!isoEnd) return '';
    const diff = new Date(isoEnd).getTime() - Date.now();
    if (diff <= 0) return 'Завершено';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}г ${m}хв`;
}

// ============ NAVIGATION ============
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        switchTab(tab);
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.utility-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        haptic('selection');
    });
});

document.getElementById('btn-open-admin')?.addEventListener('click', () => {
    switchTab('studio');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === 'studio'));
    openStudioSubview('admin');
    haptic('selection');
});

document.getElementById('btn-open-quests')?.addEventListener('click', () => {
    switchTab('profile');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === 'profile'));
    haptic('selection');
});

document.getElementById('btn-open-leaderboard')?.addEventListener('click', () => {
    switchTab('leaderboard');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('btn-open-leaderboard').classList.add('active');
    haptic('selection');
});

document.getElementById('header-level-chip')?.addEventListener('click', () => {
    switchTab('profile');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === 'profile'));
});

function switchTab(tab) {
    document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(`tab-${tab}`);
    if (target) target.classList.add('active');

    if (tab === 'collection') loadCollection();
    if (tab === 'cases') loadCases();
    if (tab === 'market') loadMarket();
    if (tab === 'studio') {
        loadMySubmissions();
        loadAdminPanelData();
        loadCraftGrid();
    }
    if (tab === 'profile') {
        loadUser();
        loadTransactions();
    }
    if (tab === 'leaderboard') loadLeaderboard();
}

document.querySelectorAll('#collection-subtabs .sub-tab').forEach(btn => {
    btn.addEventListener('click', () => {
        const view = btn.dataset.subview;
        document.querySelectorAll('#collection-subtabs .sub-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('#tab-collection .subview').forEach(s => {
            s.classList.remove('active');
            s.classList.add('hidden');
        });
        const target = document.getElementById(`subview-${view}`);
        if (target) {
            target.classList.remove('hidden');
            target.classList.add('active');
        }
        haptic('selection');
    });
});

function openStudioSubview(view) {
    document.querySelectorAll('#studio-subtabs .sub-tab').forEach(b => {
        b.classList.toggle('active', b.dataset.studioview === view);
    });
    document.querySelectorAll('#tab-studio .studioview').forEach(s => {
        s.classList.remove('active');
        s.classList.add('hidden');
    });
    const target = document.getElementById(`studioview-${view}`);
    if (target) {
        target.classList.remove('hidden');
        target.classList.add('active');
    }
    if (view === 'admin') loadAdminPanelData();
    if (view === 'craft') loadCraftGrid();
}

document.querySelectorAll('#studio-subtabs .sub-tab').forEach(btn => {
    btn.addEventListener('click', () => {
        openStudioSubview(btn.dataset.studioview);
        haptic('selection');
    });
});

// ============ USER, QUESTS & ACHIEVEMENTS ============
async function loadUser() {
    try {
        currentUser = await apiRequest('/api/user', { method: 'POST' });
        updateHeaderAndProfileUI();
    } catch (e) {
        console.error('loadUser error:', e);
    }
}

function updateHeaderAndProfileUI() {
    if (!currentUser) return;
    document.getElementById('balance').textContent = Math.round(currentUser.balance);
    document.getElementById('header-level').textContent = currentUser.level || 1;

    const xpInLevel = (currentUser.xp || 0) % 200;
    const xpPct = Math.min(100, Math.round((xpInLevel / 200) * 100));
    document.getElementById('header-xp-fill').style.width = `${xpPct}%`;

    document.getElementById('profile-name').textContent = currentUser.first_name || currentUser.username || 'Колекціонер';
    document.getElementById('profile-level').textContent = currentUser.level || 1;
    document.getElementById('profile-xp').textContent = currentUser.xp || 0;
    document.getElementById('profile-xp-next').textContent = currentUser.xp_next_level || 200;
    document.getElementById('profile-xp-fill').style.width = `${xpPct}%`;

    document.getElementById('stat-nfts').textContent = currentUser.nft_count || 0;
    document.getElementById('stat-balance').textContent = Math.round(currentUser.balance);
    document.getElementById('stat-streak').textContent = `${currentUser.streak_days || 1}д`;

    if (currentUser.staking) updateStakingBannerUI(currentUser.staking);

    const pendingModCount = currentUser.pending_moderation_count || 0;
    const topAdminBadge = document.getElementById('admin-pending-badge');
    const studioAdminBadge = document.getElementById('studio-admin-count');
    if (topAdminBadge) {
        topAdminBadge.textContent = pendingModCount;
        topAdminBadge.classList.toggle('hidden', pendingModCount === 0);
    }
    if (studioAdminBadge) {
        studioAdminBadge.textContent = pendingModCount;
        studioAdminBadge.classList.toggle('hidden', pendingModCount === 0);
    }

    const bonusBtn = document.getElementById('daily-bonus-btn');
    if (bonusBtn) {
        bonusBtn.disabled = !currentUser.can_claim_daily;
        bonusBtn.textContent = currentUser.can_claim_daily
            ? `🎁 Щоденний чек-ін (День ${currentUser.streak_days || 1})`
            : '✅ Сьогоднішній бонус отримано';
    }

    const questsList = document.getElementById('quests-list');
    const hasClaimableQuest = (currentUser.quests || []).some(q => q.progress >= q.target && !q.claimed);
    const badgeDot = document.getElementById('quest-badge-dot');
    if (badgeDot) badgeDot.classList.toggle('hidden', !hasClaimableQuest && !currentUser.can_claim_daily);

    if (questsList && currentUser.quests) {
        questsList.innerHTML = currentUser.quests.map(q => {
            const done = q.progress >= q.target;
            let btnText = `${q.progress}/${q.target}`;
            if (q.claimed) btnText = '✅ Отримано';
            else if (done) btnText = 'Забрати';
            return `
                <div class="quest-card">
                    <div class="quest-info">
                        <div class="quest-title">${q.name}</div>
                        <div class="quest-reward">+${q.reward_nxr} NXR · +${q.reward_xp} XP</div>
                    </div>
                    <button class="btn-quest-claim" data-qid="${q.id}" ${(!done || q.claimed) ? 'disabled' : ''}>
                        ${btnText}
                    </button>
                </div>
            `;
        }).join('');

        questsList.querySelectorAll('.btn-quest-claim:not([disabled])').forEach(btn => {
            btn.addEventListener('click', () => claimQuestReward(btn.dataset.qid));
        });
    }

    const achGrid = document.getElementById('achievements-grid');
    if (achGrid && currentUser.achievements_catalog) {
        const unlocked = currentUser.achievements || [];
        achGrid.innerHTML = currentUser.achievements_catalog.map(a => {
            const isUnlocked = unlocked.includes(a.id);
            return `
                <div class="ach-card ${isUnlocked ? 'unlocked' : ''}">
                    <div class="ach-icon">${a.icon}</div>
                    <div>
                        <div class="ach-name">${a.name}</div>
                        <div class="ach-desc">${a.desc}</div>
                    </div>
                </div>
            `;
        }).join('');
    }
}

async function claimQuestReward(questId) {
    try {
        const data = await apiRequest('/api/quests/claim', {
            method: 'POST',
            body: JSON.stringify({ quest_id: questId })
        });
        sfx.coin();
        spawnConfetti();
        showToast(`🎯 Квест виконано! +${data.reward_nxr} NXR`, 'success');
        await loadUser();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

// ============ COLLECTION, STAKING & SETS ============
function updateStakingBannerUI(staking) {
    if (!staking) return;
    document.getElementById('staking-daily-rate').textContent = `+${staking.totalDailyRate || 0}`;
    document.getElementById('staking-mult-badge').textContent = `x${staking.multiplier || 1.0}`;
    document.getElementById('staking-count').textContent = staking.stakedCount || 0;
    document.getElementById('staking-pending').textContent = `${(staking.pendingYield || 0).toFixed(2)} NXR`;

    const claimBtn = document.getElementById('btn-claim-staking');
    if (claimBtn) claimBtn.disabled = (staking.pendingYield || 0) < 0.5;
}

document.getElementById('btn-claim-staking')?.addEventListener('click', async () => {
    try {
        const data = await apiRequest('/api/staking/claim', { method: 'POST' });
        sfx.coin();
        spawnConfetti();
        showToast(`⚡ Зібрано +${data.claimed} NXR зі стейкінгу!`, 'success');
        document.getElementById('balance').textContent = Math.round(data.new_balance);
        updateStakingBannerUI(data.staking);
        loadUser();
    } catch (e) {
        showToast(e.message, 'error');
    }
});

async function loadCollection() {
    const skeleton = document.getElementById('collection-skeleton');
    const grid = document.getElementById('collection-grid');
    const empty = document.getElementById('empty-collection');
    const sort = document.getElementById('collection-sort')?.value || 'newest';

    skeleton.classList.remove('hidden');
    grid.classList.add('hidden');
    empty.classList.add('hidden');

    try {
        const data = await apiRequest(`/api/collection?sort=${sort}`, { method: 'POST' });
        myNFTs = data.nfts || [];
        skeleton.classList.add('hidden');

        if (data.staking) updateStakingBannerUI(data.staking);
        if (data.sets) renderSetsList(data.sets);
        if (data.incoming_offers) renderIncomingOffers(data.incoming_offers);

        if (myNFTs.length === 0) {
            empty.classList.remove('hidden');
            return;
        }

        grid.classList.remove('hidden');
        grid.innerHTML = myNFTs.map(nft => renderNFTCard(nft, 'collection')).join('');

        grid.querySelectorAll('.nft-card').forEach(card => {
            card.addEventListener('click', () => {
                const nft = myNFTs.find(n => n.id === parseInt(card.dataset.id, 10));
                if (nft) showCollectionModal(nft);
                haptic('light');
            });
        });
    } catch (e) {
        skeleton.classList.add('hidden');
        showToast(e.message, 'error');
    }
}

document.getElementById('collection-sort')?.addEventListener('change', loadCollection);

function renderSetsList(sets) {
    const container = document.getElementById('sets-list');
    if (!container) return;
    container.innerHTML = sets.map(s => {
        const pct = Math.min(100, Math.round((s.owned_count / s.required_count) * 100));
        return `
            <div class="set-card ${s.completed ? 'completed' : ''}">
                <div class="set-top">
                    <div class="set-title">${s.icon} ${s.name}</div>
                    <span class="set-bonus-tag">+${Math.round(s.staking_multiplier_bonus * 100)}% дохід</span>
                </div>
                <div class="set-desc">${s.description}</div>
                <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:5px;">
                    <span>Прокачаних у серії: <strong>${s.owned_count}/${s.required_count}</strong></span>
                    <span>${s.completed ? '✅ Серію зібрано!' : `${pct}%`}</span>
                </div>
                <div class="set-progress-bar">
                    <div class="set-progress-fill" style="width:${pct}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

function renderIncomingOffers(offers) {
    const badge = document.getElementById('offers-count-badge');
    if (badge) {
        badge.textContent = offers.length;
        badge.classList.toggle('hidden', offers.length === 0);
    }

    const container = document.getElementById('incoming-offers-list');
    if (!container) return;
    if (offers.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><p>Активних цінових пропозицій немає</p></div>';
        return;
    }

    container.innerHTML = offers.map(o => `
        <div class="offer-item">
            <img class="offer-thumb" src="${o.nft_image}" alt="${o.nft_name}">
            <div class="offer-info">
                <div class="offer-title">${o.nft_name}</div>
                <div class="offer-sub">Покупець <strong>${o.buyer_name}</strong> пропонує <strong class="mono-num" style="color:#4ade80">${o.amount} NXR</strong></div>
            </div>
            <div class="offer-actions">
                <button class="btn-offer-acc" data-id="${o.id}">Прийняти</button>
                <button class="btn-offer-dec" data-id="${o.id}">✕</button>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.btn-offer-acc').forEach(btn => {
        btn.addEventListener('click', () => respondOffer(parseInt(btn.dataset.id, 10), 'accept'));
    });
    container.querySelectorAll('.btn-offer-dec').forEach(btn => {
        btn.addEventListener('click', () => respondOffer(parseInt(btn.dataset.id, 10), 'decline'));
    });
}

async function respondOffer(offerId, action) {
    try {
        const data = await apiRequest('/api/market/offer/respond', {
            method: 'POST',
            body: JSON.stringify({ offer_id: offerId, action })
        });
        if (action === 'accept') {
            sfx.coin();
            spawnConfetti();
        }
        showToast(data.message, 'success');
        loadCollection();
        loadUser();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

// ============ DROP BOXES & ROULETTE ============
async function loadCases() {
    const container = document.getElementById('cases-list');
    if (!container) return;
    try {
        const data = await apiRequest('/api/cases');
        const cases = data.cases || [];
        container.innerHTML = cases.map(c => {
            const previewsHtml = (c.pool || [])
                .map(p => `
                    <div class="case-preview-pair" title="${p.box_name} → ${p.revealed_name}">
                        <img class="case-preview-img" src="${p.box_image_url}" alt="${p.box_name}">
                        <span style="font-size:10px;color:var(--accent);">→</span>
                        <img class="case-preview-img" src="${p.revealed_image_url}" alt="${p.revealed_name}">
                    </div>
                `)
                .join('');

            return `
                <div class="case-card">
                    <div class="case-top">
                        <div class="case-icon-box">${c.icon}</div>
                        <div class="case-info">
                            <div class="case-name">${c.name}</div>
                            <div class="case-sub">${c.subtitle}</div>
                        </div>
                    </div>
                    <div class="case-previews">${previewsHtml}</div>
                    <button class="btn-open-case" data-caseid="${c.id}">
                        🎲 Відкрити за <span class="mono-num">${c.price} NXR</span>
                    </button>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.btn-open-case').forEach(btn => {
            btn.addEventListener('click', () => openMysteryBox(btn.dataset.caseid));
        });
    } catch (e) {
        showToast(e.message, 'error');
    }
}

async function openMysteryBox(caseId) {
    if (isSpinningRoulette) return;
    try {
        isSpinningRoulette = true;
        const data = await apiRequest('/api/cases/open', {
            method: 'POST',
            body: JSON.stringify({ case_id: caseId })
        });

        document.getElementById('balance').textContent = Math.round(data.new_balance);

        const stage = document.getElementById('roulette-stage');
        const track = document.getElementById('roulette-track');
        const statusText = document.getElementById('roulette-status-text');

        stage.classList.remove('hidden');
        stage.scrollIntoView({ behavior: 'smooth', block: 'center' });
        statusText.textContent = '🎲 Крутимо рулетку коробок...';

        track.style.transition = 'none';
        track.style.transform = 'translateX(0px)';

        track.innerHTML = data.roulette_strip.map(item => `
            <div class="roulette-slot">
                <img src="${item.image_url}" alt="${item.name}">
                <div class="roulette-slot-name">${item.name}</div>
            </div>
        `).join('');

        void track.offsetWidth;

        const slotWidth = 92;
        const viewportWidth = track.parentElement.clientWidth;
        const targetOffset = (data.winner_index * slotWidth) - (viewportWidth / 2) + 42;

        track.style.transition = 'transform 3.4s cubic-bezier(0.12, 0.82, 0.18, 1)';
        track.style.transform = `translateX(-${targetOffset}px)`;

        let tickCount = 0;
        const tickTimer = setInterval(() => {
            tickCount++;
            sfx.tick();
            if (tickCount > 20) clearInterval(tickTimer);
        }, 145);

        setTimeout(() => {
            clearInterval(tickTimer);
            isSpinningRoulette = false;
            sfx.win();
            spawnConfetti();
            haptic('success');
            statusText.textContent = `🎉 Ви вибили коробку: ${data.won_nft.name}! Тепер її можна прокачати!`;
            showCollectionModal(data.won_nft);
            loadUser();
        }, 3500);
    } catch (e) {
        isSpinningRoulette = false;
        showToast(e.message, 'error');
    }
}

// ============ MARKETPLACE ============
document.querySelectorAll('#market-mode-tabs .sub-tab').forEach(btn => {
    btn.addEventListener('click', () => {
        currentMarketMode = btn.dataset.mode;
        document.querySelectorAll('#market-mode-tabs .sub-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        loadMarket();
        haptic('selection');
    });
});

async function loadMarket() {
    const skeleton = document.getElementById('market-skeleton');
    const grid = document.getElementById('market-grid');
    const filter = document.getElementById('market-filter')?.value || 'all';
    const sort = document.getElementById('market-sort')?.value || 'newest';
    const search = document.getElementById('market-search')?.value || '';

    skeleton.classList.remove('hidden');
    grid.classList.add('hidden');

    try {
        const params = new URLSearchParams({
            mode: currentMarketMode,
            sort,
            ...(filter !== 'all' ? { rarity: filter } : {}),
            ...(search.trim() ? { search: search.trim() } : {})
        });
        const data = await apiRequest(`/api/market?${params}`);
        skeleton.classList.add('hidden');
        grid.classList.remove('hidden');

        if (!data.nfts || data.nfts.length === 0) {
            grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🛒</div><p>Лотів не знайдено</p></div>';
            return;
        }

        grid.innerHTML = data.nfts.map(nft => renderNFTCard(nft, 'market')).join('');

        grid.querySelectorAll('.nft-card').forEach(card => {
            card.addEventListener('click', () => {
                const nft = data.nfts.find(n => n.id === parseInt(card.dataset.id, 10));
                if (nft) showMarketModal(nft);
                haptic('light');
            });
        });
    } catch (e) {
        skeleton.classList.add('hidden');
        showToast(e.message, 'error');
    }
}

document.getElementById('market-filter')?.addEventListener('change', loadMarket);
document.getElementById('market-sort')?.addEventListener('change', loadMarket);
let searchTimeout;
document.getElementById('market-search')?.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadMarket, 300);
});

// ============ RENDER CARD WITH BACKDROP & MINI SYMBOLS ============
function renderNFTCard(nft, context) {
    let statusBadge = '';
    if (nft.is_staked) {
        statusBadge = `<span class="status-chip staked">⚡ STAKED</span>`;
    } else if (nft.on_sale && nft.sale_type === 'auction') {
        statusBadge = `<span class="status-chip auction">⏳ ${formatTimeRemaining(nft.auction_end)}</span>`;
    } else if (!nft.is_upgraded) {
        statusBadge = `<span class="status-chip box-ready">📦 КОРОБКА</span>`;
    } else {
        statusBadge = `<span class="status-chip upgraded-tag">${nft.symbol_icon || '✨'} NFT</span>`;
    }

    const serialLabel = nft.serial_number ? `#${nft.serial_number}` : `#${nft.id}`;
    const subtitle = nft.is_upgraded
        ? `${nft.backdrop || 'Royal'} · ${nft.symbol_icon || '✨'}`
        : `Прокачати → ${nft.revealed_name || 'Предмет'}`;

    const rightMeta = (context === 'market' || nft.on_sale)
        ? `<span class="nft-card-price">💎 ${nft.price}</span>`
        : `<span class="nft-card-yield">+${nft.daily_yield || 15}/д</span>`;

    const bgStyle = nft.backdrop_gradient
        ? `style="background: ${nft.backdrop_gradient};"`
        : '';

    const miniSymbolsHtml = nft.is_upgraded && nft.symbol_icon
        ? `
            <div class="card-mini-patterns">
                <span class="card-mini-sym" style="top:14%;left:14%;">${nft.symbol_icon}</span>
                <span class="card-mini-sym" style="top:16%;right:14%;">${nft.symbol_icon}</span>
                <span class="card-mini-sym" style="bottom:16%;left:16%;">${nft.symbol_icon}</span>
                <span class="card-mini-sym" style="bottom:14%;right:16%;">${nft.symbol_icon}</span>
            </div>
        `
        : '';

    return `
        <div class="nft-card ${nft.is_upgraded ? 'upgraded-card' : ''}" data-id="${nft.id}">
            <div class="nft-img-wrap" ${bgStyle}>
                ${miniSymbolsHtml}
                <img class="nft-card-image" src="${nft.image_url}" alt="${nft.name}" loading="lazy">
                <div class="card-top-badges">
                    <span class="serial-chip">${serialLabel}</span>
                    ${statusBadge}
                </div>
            </div>
            <div class="nft-card-info">
                <div class="nft-card-name">${nft.name}</div>
                <div class="nft-card-model">${subtitle}</div>
                <div class="nft-card-meta">
                    <span class="rarity-badge rarity-${nft.rarity}">${nft.rarity}</span>
                    ${rightMeta}
                </div>
            </div>
        </div>
    `;
}

// ============ TELEGRAM GIFT 3D ANIMATED STAGE & ATTRIBUTES ============
function buildPatternIconsHtml(iconChar = '👑') {
    // 12 concentric icons arranged in an inner and outer halo behind the 3D object
    const ringPositions = [
        { tx: -115, ty: -72, sc: 1.05, rot: -15, op: 0.38, delay: 0.04 },
        { tx: 0,    ty: -98, sc: 0.92, rot: 0,   op: 0.34, delay: 0.08 },
        { tx: 115,  ty: -72, sc: 1.05, rot: 15,  op: 0.38, delay: 0.12 },
        { tx: -135, ty: 8,   sc: 0.88, rot: -20, op: 0.30, delay: 0.16 },
        { tx: 135,  ty: 8,   sc: 0.88, rot: 20,  op: 0.30, delay: 0.20 },
        { tx: -110, ty: 82,  sc: 1.0,  rot: -10, op: 0.36, delay: 0.24 },
        { tx: 0,    ty: 102, sc: 0.90, rot: 0,   op: 0.32, delay: 0.28 },
        { tx: 110,  ty: 82,  sc: 1.0,  rot: 10,  op: 0.36, delay: 0.32 },
        // Inner ring
        { tx: -68,  ty: -44, sc: 0.76, rot: -8,  op: 0.24, delay: 0.10 },
        { tx: 68,   ty: -44, sc: 0.76, rot: 8,   op: 0.24, delay: 0.14 },
        { tx: -68,  ty: 48,  sc: 0.76, rot: -8,  op: 0.24, delay: 0.22 },
        { tx: 68,   ty: 48,  sc: 0.76, rot: 8,   op: 0.24, delay: 0.26 }
    ];

    return ringPositions.map(p => `
        <span class="tg-pattern-icon" style="
            --tx: ${p.tx}px;
            --ty: ${p.ty}px;
            --sc: ${p.sc};
            --rot: ${p.rot}deg;
            --target-op: ${p.op};
            animation-delay: ${p.delay}s;
        ">${iconChar}</span>
    `).join('');
}

function renderAnimatedGiftStage(nft) {
    const bgGradient = nft.backdrop_gradient || 'radial-gradient(circle at 50% 42%, #233142 0%, #101722 75%)';
    const iconChar = nft.is_upgraded ? (nft.symbol_icon || '👑') : '📦';
    const stagePillText = nft.is_upgraded
        ? `${nft.symbol_icon || '✨'} ${nft.backdrop || 'Royal Gold'} · ${nft.model || '3D Edition'}`
        : `📦 Запакована коробка → Всередині: ${nft.revealed_name || 'Предмет'}`;

    return `
        <div class="tg-gift-stage" id="tg-gift-stage" style="background: ${bgGradient};">
            <div class="tg-stage-aura"></div>
            <div class="tg-pattern-layer" id="tg-pattern-layer">
                ${buildPatternIconsHtml(iconChar)}
            </div>
            <div class="tg-stage-top-bar">
                <button class="btn-replay-anim" id="btn-replay-anim">✨ Повторити анімацію</button>
            </div>
            <div class="tg-stage-item-wrap entry-anim" id="tg-stage-item-wrap">
                <img class="tg-stage-img" id="tg-stage-img" src="${nft.image_url}" alt="${nft.name}">
                <div class="tg-stage-shine"></div>
            </div>
            <div class="tg-stage-flash" id="tg-stage-flash"></div>
            <div class="tg-stage-bottom-pill" id="tg-stage-bottom-pill">${stagePillText}</div>
        </div>
    `;
}

function attachStageInteractivity() {
    const stage = document.getElementById('tg-gift-stage');
    const itemWrap = document.getElementById('tg-stage-item-wrap');
    const patternLayer = document.getElementById('tg-pattern-layer');
    const replayBtn = document.getElementById('btn-replay-anim');

    if (!stage || !itemWrap) return;

    // Play entrance chime
    sfx.entry();

    // Switch from 3D flip entry to smooth floating levitation after 880ms
    setTimeout(() => {
        if (itemWrap.classList.contains('entry-anim')) {
            itemWrap.classList.remove('entry-anim');
            itemWrap.classList.add('floating-anim');
        }
    }, 880);

    // Replay entrance animation button
    replayBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        sfx.entry();
        haptic('light');
        itemWrap.classList.remove('entry-anim', 'floating-anim');
        void itemWrap.offsetWidth;
        itemWrap.classList.add('entry-anim');

        // Re-trigger pattern burst
        if (patternLayer) {
            const html = patternLayer.innerHTML;
            patternLayer.innerHTML = '';
            void patternLayer.offsetWidth;
            patternLayer.innerHTML = html;
        }

        setTimeout(() => {
            itemWrap.classList.remove('entry-anim');
            itemWrap.classList.add('floating-anim');
        }, 880);
    });

    // Interactive 3D tilt on touch/mouse move
    const handleMove = (clientX, clientY) => {
        const rect = stage.getBoundingClientRect();
        const x = (clientX - rect.left) / rect.width - 0.5;
        const y = (clientY - rect.top) / rect.height - 0.5;
        itemWrap.classList.remove('floating-anim');
        itemWrap.style.transform = `rotateY(${x * 28}deg) rotateX(${-y * 24}deg) scale(1.04)`;
        if (patternLayer) {
            patternLayer.style.transform = `translate(${-x * 16}px, ${-y * 16}px)`;
        }
    };

    const resetMove = () => {
        itemWrap.style.transform = '';
        if (patternLayer) patternLayer.style.transform = '';
        itemWrap.classList.add('floating-anim');
    };

    stage.addEventListener('mousemove', (e) => handleMove(e.clientX, e.clientY));
    stage.addEventListener('mouseleave', resetMove);
    stage.addEventListener('touchmove', (e) => {
        if (e.touches[0]) handleMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    stage.addEventListener('touchend', resetMove);
}

function renderTelegramAttributesTable(nft) {
    const serial = nft.serial_number ? `#${nft.serial_number}` : `#${nft.id}`;
    return `
        <div class="tg-attr-table" id="modal-attr-table">
            <div class="tg-attr-row">
                <span class="tg-attr-key">Статус</span>
                <span class="tg-attr-val" style="color:${nft.is_upgraded ? '#4ade80' : '#fbbf24'}">
                    ${nft.is_upgraded ? '✨ Прокачаний NFT' : '📦 Запакована коробка'}
                </span>
            </div>
            <div class="tg-attr-row">
                <span class="tg-attr-key">Модель (Model)</span>
                <span class="tg-attr-val">${nft.model || 'Standard'}</span>
            </div>
            <div class="tg-attr-row">
                <span class="tg-attr-key">Фон (Backdrop)</span>
                <span class="tg-attr-val">${nft.backdrop || 'Стандартний бокс'}</span>
            </div>
            <div class="tg-attr-row">
                <span class="tg-attr-key">Значок ззаду (Symbol)</span>
                <span class="tg-attr-val">${nft.symbol_icon || '📦'} ${nft.symbol || 'Не розпаковано'}</span>
            </div>
            <div class="tg-attr-row">
                <span class="tg-attr-key">Серійний номер</span>
                <span class="tg-attr-val mono-num">${serial}</span>
            </div>
            <div class="tg-attr-row">
                <span class="tg-attr-key">Дохід у стейкінгу</span>
                <span class="tg-attr-val mono-num" style="color:#4ade80">+${nft.daily_yield || 15} NXR / день</span>
            </div>
        </div>
    `;
}

// ============ MODALS & LIVE BOX-TO-ITEM UPGRADE ANIMATION ============
function showCollectionModal(nft) {
    const modal = document.getElementById('nft-modal');
    const body = document.getElementById('modal-body');

    const upgradeSectionHtml = !nft.is_upgraded ? `
        <div class="upgrade-cta-box" id="upgrade-cta-box">
            <div class="upgrade-cta-title">✨ Розпакувати та Прокачати Коробку в NFT</div>
            <div class="upgrade-cta-desc">
                При прокачці коробка відкриється — випаде сам предмет <strong>${nft.revealed_name || '3D Item'}</strong>, а рулетка обере унікальний <strong>Фон (Backdrop)</strong> та <strong>Значок ззаду (Symbol)</strong>!
            </div>
            <button class="btn-upgrade-box" id="btn-upgrade-box">
                ✨ Прокачати Подарунок за ${nft.upgrade_cost || 100} NXR
            </button>
        </div>
    ` : '';

    body.innerHTML = `
        ${renderAnimatedGiftStage(nft)}

        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <span class="rarity-badge rarity-${nft.rarity}" id="modal-rarity-badge">${nft.rarity}</span>
            <span class="mono-num" style="font-size:12px;color:var(--text-dim);">ID #${nft.id}</span>
        </div>
        <div class="modal-nft-name" id="modal-nft-title">${nft.name}</div>
        <div class="modal-nft-desc" id="modal-nft-desc">${nft.description || ''}</div>

        ${upgradeSectionHtml}

        ${renderTelegramAttributesTable(nft)}

        <!-- Staking Panel -->
        <div class="modal-panel">
            <div class="modal-panel-title">⚡ Стейкінг</div>
            <button class="modal-btn ${nft.is_staked ? 'danger' : 'success'}" id="modal-stake-btn" style="width:100%;">
                ${nft.is_staked ? '📤 Забрати зі стейкінгу' : `⚡ Відправити у стейкінг (+${nft.daily_yield || 15} NXR/день)`}
            </button>
        </div>

        <!-- Listing Panel -->
        <div class="modal-panel">
            <div class="modal-panel-title">🛒 Виставити на Маркет</div>
            <div class="modal-input-row" style="margin-bottom:8px;">
                <select id="modal-sale-type">
                    <option value="fixed" ${nft.sale_type !== 'auction' ? 'selected' : ''}>🏷️ Фіксована ціна</option>
                    <option value="auction" ${nft.sale_type === 'auction' ? 'selected' : ''}>⏳ Аукціон (12 годин)</option>
                </select>
                <input type="number" id="modal-sell-price" placeholder="Ціна NXR" value="${nft.price || 350}" min="0">
            </div>
            <div style="display:flex;gap:8px;">
                <button class="modal-btn" id="modal-sell-btn" style="flex:1;">
                    ${nft.on_sale ? 'Оновити лот' : 'Виставити на продаж'}
                </button>
                ${nft.on_sale ? `<button class="modal-btn danger" id="modal-unsell-btn">Зняти</button>` : ''}
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
    attachStageInteractivity();

    // Box -> Revealed Item Upgrade Handler with Live Stage Animation!
    document.getElementById('btn-upgrade-box')?.addEventListener('click', async () => {
        const upgBtn = document.getElementById('btn-upgrade-box');
        if (!upgBtn) return;
        upgBtn.disabled = true;
        upgBtn.textContent = '🎲 Розпаковуємо коробку, крутимо фон і значок...';

        try {
            const data = await apiRequest('/api/nft/upgrade', {
                method: 'POST',
                body: JSON.stringify({ nft_id: nft.id })
            });

            document.getElementById('balance').textContent = Math.round(data.new_balance);

            const stage = document.getElementById('tg-gift-stage');
            const itemWrap = document.getElementById('tg-stage-item-wrap');
            const patternLayer = document.getElementById('tg-pattern-layer');
            const stageImg = document.getElementById('tg-stage-img');
            const flash = document.getElementById('tg-stage-flash');
            const bottomPill = document.getElementById('tg-stage-bottom-pill');

            // 1. Start shaking the sealed box while cycling Backdrops & Symbols!
            itemWrap.classList.remove('entry-anim', 'floating-anim');
            itemWrap.classList.add('box-shaking');

            const backdrops = data.backdrops_reel || [];
            const symbols = data.symbols_reel || [];
            let step = 0;

            const rollInterval = setInterval(() => {
                step++;
                sfx.tick();
                haptic('selection');
                if (backdrops.length > 0 && stage) {
                    const b = backdrops[step % backdrops.length];
                    stage.style.background = b.gradient;
                }
                if (symbols.length > 0 && patternLayer && bottomPill) {
                    const s = symbols[step % symbols.length];
                    bottomPill.textContent = `🎲 Випадає: ${s.icon} ${s.name}...`;
                }
            }, 130);

            // 2. After 1.8s, trigger shockwave flash and reveal the Unboxed Item + Final Backdrop + Final Symbol Halo!
            setTimeout(() => {
                clearInterval(rollInterval);
                const upgradedNft = data.nft;

                if (flash) flash.classList.add('boom');
                sfx.win();
                spawnConfetti();
                haptic('success');

                if (stage) stage.style.background = upgradedNft.backdrop_gradient;
                if (stageImg) stageImg.src = upgradedNft.image_url;
                if (patternLayer) {
                    patternLayer.innerHTML = buildPatternIconsHtml(upgradedNft.symbol_icon);
                }
                if (bottomPill) {
                    bottomPill.textContent = `${upgradedNft.symbol_icon} ${upgradedNft.backdrop} · ${upgradedNft.model}`;
                }

                itemWrap.classList.remove('box-shaking');
                void itemWrap.offsetWidth;
                itemWrap.classList.add('entry-anim');

                setTimeout(() => {
                    itemWrap.classList.remove('entry-anim');
                    itemWrap.classList.add('floating-anim');
                }, 880);

                // Update modal text and attributes table live
                document.getElementById('modal-nft-title').textContent = upgradedNft.name;
                document.getElementById('modal-nft-desc').textContent = upgradedNft.description;
                const rBadge = document.getElementById('modal-rarity-badge');
                if (rBadge) {
                    rBadge.className = `rarity-badge rarity-${upgradedNft.rarity}`;
                    rBadge.textContent = upgradedNft.rarity;
                }
                const ctaBox = document.getElementById('upgrade-cta-box');
                if (ctaBox) ctaBox.remove();

                const oldTable = document.getElementById('modal-attr-table');
                if (oldTable) {
                    oldTable.outerHTML = renderTelegramAttributesTable(upgradedNft);
                }

                showToast(`🎉 Розпаковано: ${upgradedNft.name}!`, 'success');
                loadCollection();
                loadUser();
            }, 1850);

        } catch (e) {
            showToast(e.message, 'error');
            upgBtn.disabled = false;
            upgBtn.textContent = `✨ Прокачати Подарунок за ${nft.upgrade_cost || 100} NXR`;
        }
    });

    document.getElementById('modal-stake-btn')?.addEventListener('click', async () => {
        try {
            const data = await apiRequest('/api/staking/toggle', {
                method: 'POST',
                body: JSON.stringify({ nft_id: nft.id })
            });
            sfx.coin();
            showToast(data.message, 'success');
            modal.classList.add('hidden');
            loadCollection();
            loadUser();
        } catch (e) {
            showToast(e.message, 'error');
        }
    });

    document.getElementById('modal-sell-btn')?.addEventListener('click', async () => {
        const price = parseFloat(document.getElementById('modal-sell-price').value) || 0;
        const saleType = document.getElementById('modal-sale-type').value;
        try {
            const data = await apiRequest('/api/nft/sell', {
                method: 'POST',
                body: JSON.stringify({ nft_id: nft.id, price, sale_type: saleType })
            });
            showToast(data.message, 'success');
            modal.classList.add('hidden');
            loadCollection();
        } catch (e) {
            showToast(e.message, 'error');
        }
    });

    document.getElementById('modal-unsell-btn')?.addEventListener('click', async () => {
        try {
            await apiRequest('/api/nft/sell', {
                method: 'POST',
                body: JSON.stringify({ nft_id: nft.id, price: 0 })
            });
            showToast('Знято з продажу', 'info');
            modal.classList.add('hidden');
            loadCollection();
        } catch (e) {
            showToast(e.message, 'error');
        }
    });
}

function showMarketModal(nft) {
    const modal = document.getElementById('nft-modal');
    const body = document.getElementById('modal-body');
    const isAuction = nft.sale_type === 'auction';
    const minBid = nft.highest_bidder_id
        ? nft.highest_bid + (nft.min_bid_step || 25)
        : nft.price;
    const buyoutPrice = nft.buyout_price || nft.price * 2;

    body.innerHTML = `
        ${renderAnimatedGiftStage(nft)}

        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <span class="rarity-badge rarity-${nft.rarity}">${nft.rarity}</span>
            <span style="font-size:11px;color:var(--text-dim);">Продавець: <strong>${nft.owner_name || 'NEXORA'}</strong></span>
        </div>
        <div class="modal-nft-name">${nft.name}</div>
        <div class="modal-nft-desc">${nft.description || ''}</div>

        ${renderTelegramAttributesTable(nft)}

        ${isAuction ? `
            <div class="modal-panel">
                <div class="modal-panel-title">⏳ Активний Аукціон · Залишилось: ${formatTimeRemaining(nft.auction_end)}</div>
                <div style="font-size:13px;margin-bottom:8px;">
                    Поточна ставка: <strong class="mono-num" style="color:var(--accent)">💎 ${nft.highest_bid || nft.price} NXR</strong>
                </div>
                <div class="modal-input-row" style="margin-bottom:8px;">
                    <input type="number" id="modal-bid-input" value="${minBid}" min="${minBid}">
                    <button class="modal-btn gold" id="modal-bid-btn">Зробити ставку</button>
                </div>
                <button class="modal-btn success" id="modal-buy-btn" style="width:100%;">
                    ⚡ Миттєвий викуп за ${buyoutPrice} NXR
                </button>
            </div>
        ` : `
            <div class="modal-panel">
                <div class="modal-panel-title">🏷️ Фіксована ціна</div>
                <button class="modal-btn success" id="modal-buy-btn" style="width:100%;">
                    💎 Купити зараз за ${nft.price} NXR
                </button>
            </div>
        `}

        <div class="modal-panel">
            <div class="modal-panel-title">🤝 Запропонувати свою ціну (Make Offer)</div>
            <div class="modal-input-row">
                <input type="number" id="modal-offer-input" placeholder="Сума NXR" value="${Math.max(25, Math.round(nft.price * 0.85))}" min="20">
                <button class="modal-btn" id="modal-offer-btn">Надіслати оффер</button>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
    attachStageInteractivity();

    document.getElementById('modal-buy-btn')?.addEventListener('click', async () => {
        try {
            const data = await apiRequest('/api/market/buy', {
                method: 'POST',
                body: JSON.stringify({ nft_id: nft.id })
            });
            sfx.win();
            spawnConfetti();
            haptic('success');
            showToast(`🎉 Ви придбали "${data.nft_name}"!`, 'success');
            document.getElementById('balance').textContent = Math.round(data.new_balance);
            modal.classList.add('hidden');
            loadMarket();
            loadUser();
        } catch (e) {
            showToast(e.message, 'error');
        }
    });

    document.getElementById('modal-bid-btn')?.addEventListener('click', async () => {
        const amount = parseFloat(document.getElementById('modal-bid-input').value);
        try {
            const data = await apiRequest('/api/market/bid', {
                method: 'POST',
                body: JSON.stringify({ nft_id: nft.id, amount })
            });
            sfx.coin();
            showToast(data.message, 'success');
            document.getElementById('balance').textContent = Math.round(data.new_balance);
            modal.classList.add('hidden');
            loadMarket();
            loadUser();
        } catch (e) {
            showToast(e.message, 'error');
        }
    });

    document.getElementById('modal-offer-btn')?.addEventListener('click', async () => {
        const amount = parseFloat(document.getElementById('modal-offer-input').value);
        try {
            const data = await apiRequest('/api/market/offer', {
                method: 'POST',
                body: JSON.stringify({ nft_id: nft.id, amount })
            });
            showToast(data.message, 'success');
            modal.classList.add('hidden');
        } catch (e) {
            showToast(e.message, 'error');
        }
    });
}

document.querySelector('.modal-backdrop')?.addEventListener('click', () => {
    document.getElementById('nft-modal').classList.add('hidden');
});
document.querySelector('.modal-close')?.addEventListener('click', () => {
    document.getElementById('nft-modal').classList.add('hidden');
});

// ============ 2-STAGE PLAYER PROPOSAL FORM ============
const boxUpload = document.getElementById('file-upload-box');
const boxInput = document.getElementById('create-box-image');
const boxPreview = document.getElementById('box-file-preview');

const itemUpload = document.getElementById('file-upload-item');
const itemInput = document.getElementById('create-revealed-image');
const itemPreview = document.getElementById('item-file-preview');

boxUpload?.addEventListener('click', () => boxInput.click());
boxInput?.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        selectedBoxFile = e.target.files[0];
        document.getElementById('box-upload-label').textContent = `✅ ${selectedBoxFile.name}`;
        const reader = new FileReader();
        reader.onload = (ev) => {
            boxPreview.innerHTML = `<img src="${ev.target.result}" alt="Box Preview">`;
            boxPreview.classList.remove('hidden');
        };
        reader.readAsDataURL(selectedBoxFile);
    }
});

itemUpload?.addEventListener('click', () => itemInput.click());
itemInput?.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        selectedItemFile = e.target.files[0];
        document.getElementById('item-upload-label').textContent = `✅ ${selectedItemFile.name}`;
        const reader = new FileReader();
        reader.onload = (ev) => {
            itemPreview.innerHTML = `<img src="${ev.target.result}" alt="Item Preview">`;
            itemPreview.classList.remove('hidden');
        };
        reader.readAsDataURL(selectedItemFile);
    }
});

document.getElementById('create-submit')?.addEventListener('click', async () => {
    const name = document.getElementById('create-name').value.trim();
    const revealedName = document.getElementById('create-revealed-name').value.trim() || name;
    const model = document.getElementById('create-model').value.trim() || 'Collector 3D (1.2%)';
    const suggestedRarity = document.getElementById('create-rarity').value;
    const desc = document.getElementById('create-desc').value.trim();

    if (!name) return showToast('Введіть назву коробки!', 'error');
    if (!selectedBoxFile) return showToast('Завантажте фото коробки!', 'error');

    const btn = document.getElementById('create-submit');
    btn.disabled = true;
    btn.textContent = '⏳ Надсилаємо...';

    try {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('revealed_name', revealedName);
        formData.append('model', model);
        formData.append('suggested_rarity', suggestedRarity);
        formData.append('description', desc);
        formData.append('box_image', selectedBoxFile);
        if (selectedItemFile) {
            formData.append('revealed_image', selectedItemFile);
        }

        const data = await apiRequest('/api/nft/submit', {
            method: 'POST',
            body: formData
        });

        showToast(data.message, 'success');
        haptic('success');

        document.getElementById('create-name').value = '';
        document.getElementById('create-revealed-name').value = '';
        document.getElementById('create-desc').value = '';
        boxPreview.classList.add('hidden');
        itemPreview.classList.add('hidden');
        selectedBoxFile = null;
        selectedItemFile = null;
        document.getElementById('box-upload-label').textContent = '📦 Вибрати фото коробки';
        document.getElementById('item-upload-label').textContent = '📱 Вибрати фото предмета';

        loadMySubmissions();
        loadAdminPanelData();
        loadUser();
    } catch (e) {
        showToast(e.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '📤 Надіслати пропозицію на схвалення';
    }
});

async function loadMySubmissions() {
    const list = document.getElementById('my-submissions');
    if (!list) return;
    try {
        const data = await apiRequest('/api/my-submissions', { method: 'POST' });
        if (!data.submissions || data.submissions.length === 0) {
            list.innerHTML = `<div class="empty-state"><p>Ви ще не надсилали пропозицій</p></div>`;
            return;
        }

        const statusMap = {
            pending: { text: '⏳ На модерації', cls: 'status-pending' },
            approved: { text: '✅ Схвалено', cls: 'status-approved' },
            rejected: { text: '❌ Відхилено', cls: 'status-rejected' }
        };

        list.innerHTML = data.submissions.map(s => {
            const st = statusMap[s.status] || statusMap.pending;
            return `
                <div class="sub-item">
                    <div class="sub-left">
                        <img class="sub-thumb" src="${s.box_image_url || s.image_url}" alt="${s.name}">
                        <span style="color:var(--accent);font-size:12px;">→</span>
                        <img class="sub-thumb" src="${s.revealed_image_url || s.image_url}" alt="${s.revealed_name || s.name}">
                        <div>
                            <div class="sub-name">${s.name} → ${s.revealed_name || ''}</div>
                            <div style="font-size:11px;color:var(--text-dim);">${s.model || '3D'} · ${s.suggested_rarity?.toUpperCase() || 'EPIC'}</div>
                        </div>
                    </div>
                    <span class="sub-status ${st.cls}">${st.text}</span>
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error(e);
    }
}

// ============ OWNER / ADMIN PANEL ============
async function loadAdminPanelData() {
    try {
        if (giftPresets.length === 0) {
            const presetData = await apiRequest('/api/presets');
            giftPresets = presetData.presets || [];
            renderAdminPresets();
        }
        const subData = await apiRequest('/api/admin/submissions');
        renderAdminSubmissionsQueue(subData.submissions || []);
    } catch (e) {
        console.error('loadAdminPanelData error:', e);
    }
}

function renderAdminPresets() {
    const row = document.getElementById('admin-presets-row');
    if (!row || giftPresets.length === 0) return;

    row.innerHTML = giftPresets.map((p, idx) => `
        <div class="preset-item ${idx === 0 ? 'active' : ''}" data-presetid="${p.id}">
            <div class="preset-pair-imgs">
                <img src="${p.box_image_url}" alt="${p.box_name}">
                <span style="font-size:10px;color:var(--accent);">→</span>
                <img src="${p.revealed_image_url}" alt="${p.revealed_name}">
            </div>
            <div class="preset-item-title">${p.box_name}</div>
        </div>
    `).join('');

    if (!adminSelectedPreset && giftPresets[0]) {
        selectAdminPreset(giftPresets[0]);
    }

    row.querySelectorAll('.preset-item').forEach(item => {
        item.addEventListener('click', () => {
            const preset = giftPresets.find(p => p.id === item.dataset.presetid);
            if (!preset) return;
            row.querySelectorAll('.preset-item').forEach(el => el.classList.remove('active'));
            item.classList.add('active');
            selectAdminPreset(preset);
            haptic('selection');
        });
    });
}

function selectAdminPreset(preset) {
    adminSelectedPreset = preset;
    document.getElementById('admin-nft-name').value = preset.box_name;
    document.getElementById('admin-nft-revealed-name').value = preset.revealed_name;
    document.getElementById('admin-nft-rarity').value = preset.rarity;
    document.getElementById('admin-nft-model').value = preset.models[0];
    document.getElementById('admin-nft-collection').value = preset.collection_id;
    document.getElementById('admin-nft-desc').value = preset.description;
}

document.getElementById('admin-box-upload')?.addEventListener('click', () => {
    document.getElementById('admin-box-image').click();
});
document.getElementById('admin-box-image')?.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        adminBoxFile = e.target.files[0];
        document.getElementById('admin-box-label').textContent = `✅ ${adminBoxFile.name}`;
    }
});

document.getElementById('admin-item-upload')?.addEventListener('click', () => {
    document.getElementById('admin-item-image').click();
});
document.getElementById('admin-item-image')?.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        adminItemFile = e.target.files[0];
        document.getElementById('admin-item-label').textContent = `✅ ${adminItemFile.name}`;
    }
});

document.getElementById('btn-admin-create-nft')?.addEventListener('click', async () => {
    const boxName = document.getElementById('admin-nft-name').value.trim();
    const revealedName = document.getElementById('admin-nft-revealed-name').value.trim() || boxName;
    const initialStage = document.getElementById('admin-nft-stage').value;
    const rarity = document.getElementById('admin-nft-rarity').value;
    const destination = document.getElementById('admin-nft-dest').value;
    const price = document.getElementById('admin-nft-price').value || '350';
    const supply = document.getElementById('admin-nft-supply').value || '1';
    const model = document.getElementById('admin-nft-model').value;
    const collectionId = document.getElementById('admin-nft-collection').value;
    const desc = document.getElementById('admin-nft-desc').value;

    if (!boxName) return showToast('Вкажіть назву коробки', 'error');

    const btn = document.getElementById('btn-admin-create-nft');
    btn.disabled = true;
    btn.textContent = '⏳ Випускаємо...';

    try {
        const formData = new FormData();
        formData.append('name', boxName);
        formData.append('revealed_name', revealedName);
        formData.append('initial_stage', initialStage);
        formData.append('rarity', rarity);
        formData.append('destination', destination);
        formData.append('price', price);
        formData.append('supply', supply);
        formData.append('model', model);
        formData.append('collection_id', collectionId);
        formData.append('description', desc);

        if (adminSelectedPreset) {
            formData.append('preset_box_url', adminSelectedPreset.box_image_url);
            formData.append('preset_revealed_url', adminSelectedPreset.revealed_image_url);
        }
        if (adminBoxFile) formData.append('box_image', adminBoxFile);
        if (adminItemFile) formData.append('revealed_image', adminItemFile);

        const data = await apiRequest('/api/admin/nft/create', {
            method: 'POST',
            body: formData
        });

        sfx.win();
        spawnConfetti();
        showToast(data.message, 'success');
        adminBoxFile = null;
        adminItemFile = null;
        document.getElementById('admin-box-label').textContent = '📦 Фото коробки';
        document.getElementById('admin-item-label').textContent = '📱 Фото предмета';
        loadUser();
        loadCollection();
    } catch (e) {
        showToast(e.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '👑 Додати у гру';
    }
});

function renderAdminSubmissionsQueue(subs) {
    const queueBadge = document.getElementById('admin-queue-badge');
    if (queueBadge) queueBadge.textContent = `${subs.length} очікує`;

    const container = document.getElementById('admin-submissions-list');
    if (!container) return;

    if (subs.length === 0) {
        container.innerHTML = `<div class="empty-state" style="padding:14px;"><p>Черга модерації порожня ✅</p></div>`;
        return;
    }

    container.innerHTML = subs.map(s => `
        <div class="admin-sub-card" data-subid="${s.id}">
            <div class="admin-sub-top">
                <div class="admin-sub-imgs">
                    <img class="admin-sub-img" src="${s.box_image_url || s.image_url}" alt="Box" title="До прокачки (Коробка)">
                    <span style="color:var(--accent);font-size:12px;font-weight:700;">→</span>
                    <img class="admin-sub-img" src="${s.revealed_image_url || s.image_url}" alt="Item" title="Після прокачки (Предмет)">
                </div>
                <div class="admin-sub-info">
                    <div class="admin-sub-title">${s.name} → ${s.revealed_name || 'Предмет'}</div>
                    <div class="admin-sub-meta">Автор: <strong>${s.author_name || 'Гравець'}</strong> · Модель: ${s.model || '3D'}</div>
                    ${s.description ? `<div class="admin-sub-meta" style="color:var(--text);">${s.description}</div>` : ''}
                </div>
            </div>
            <div class="admin-sub-controls">
                <select id="mod-rarity-${s.id}">
                    <option value="common" ${s.suggested_rarity === 'common' ? 'selected' : ''}>⚪ Common</option>
                    <option value="rare" ${s.suggested_rarity === 'rare' ? 'selected' : ''}>🔵 Rare</option>
                    <option value="epic" ${(!s.suggested_rarity || s.suggested_rarity === 'epic') ? 'selected' : ''}>🟣 Epic</option>
                    <option value="legendary" ${s.suggested_rarity === 'legendary' ? 'selected' : ''}>🟡 Legendary</option>
                    <option value="mythic" ${s.suggested_rarity === 'mythic' ? 'selected' : ''}>🔴 Mythic</option>
                </select>
                <button class="btn-mod-approve" data-id="${s.id}">✅ Ухвалити коробку</button>
                <button class="btn-mod-reject" data-id="${s.id}">✕</button>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.btn-mod-approve').forEach(btn => {
        btn.addEventListener('click', async () => {
            const subId = parseInt(btn.dataset.id, 10);
            const rarity = document.getElementById(`mod-rarity-${subId}`)?.value || 'epic';
            try {
                const data = await apiRequest(`/api/admin/approve/${subId}`, {
                    method: 'POST',
                    body: JSON.stringify({ rarity })
                });
                sfx.coin();
                showToast(data.message, 'success');
                loadAdminPanelData();
                loadMySubmissions();
                loadUser();
                loadCollection();
            } catch (e) {
                showToast(e.message, 'error');
            }
        });
    });

    container.querySelectorAll('.btn-mod-reject').forEach(btn => {
        btn.addEventListener('click', async () => {
            const subId = parseInt(btn.dataset.id, 10);
            try {
                const data = await apiRequest(`/api/admin/reject/${subId}`, {
                    method: 'POST',
                    body: JSON.stringify({ reason: 'Відхилено адміністратором' })
                });
                showToast(data.message, 'info');
                loadAdminPanelData();
                loadMySubmissions();
                loadUser();
            } catch (e) {
                showToast(e.message, 'error');
            }
        });
    });
}

// ============ MERGE 3+ ============
async function loadCraftGrid() {
    const grid = document.getElementById('craft-grid');
    const btn = document.getElementById('craft-btn');
    if (!grid) return;

    craftSelected = [];
    btn.disabled = true;
    btn.textContent = `🔥 Злити вибрані (0/3)`;

    try {
        const data = await apiRequest('/api/collection', { method: 'POST' });
        const craftable = (data.nfts || []).filter(n => !n.on_sale && !n.is_staked);

        if (craftable.length < 3) {
            grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🔥</div><p>Потрібно мінімум 3 вільні предмети. Зараз доступно: ${craftable.length}</p></div>`;
            return;
        }

        grid.innerHTML = craftable.map(nft => renderNFTCard(nft, 'craft')).join('');

        grid.querySelectorAll('.nft-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = parseInt(card.dataset.id, 10);
                if (craftSelected.includes(id)) {
                    craftSelected = craftSelected.filter(x => x !== id);
                    card.classList.remove('selected');
                } else {
                    craftSelected.push(id);
                    card.classList.add('selected');
                }
                btn.disabled = craftSelected.length < 3;
                btn.textContent = `🔥 Злити вибрані (${craftSelected.length}/3)`;
                haptic('selection');
            });
        });
    } catch (e) {
        showToast(e.message, 'error');
    }
}

document.getElementById('craft-btn')?.addEventListener('click', async () => {
    if (craftSelected.length < 3) return;
    const btn = document.getElementById('craft-btn');
    btn.disabled = true;
    btn.textContent = '🔥 Зливаємо...';

    try {
        const data = await apiRequest('/api/craft', {
            method: 'POST',
            body: JSON.stringify({ nft_ids: craftSelected })
        });
        sfx.win();
        spawnConfetti();
        showToast(`🎉 Створено "${data.nft.name}"!`, 'success');
        showCollectionModal(data.nft);
        loadCraftGrid();
        loadUser();
    } catch (e) {
        showToast(e.message, 'error');
        btn.disabled = false;
    }
});

// ============ DAILY BONUS, TRANSACTIONS & LEADERBOARD ============
document.getElementById('daily-bonus-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('daily-bonus-btn');
    try {
        const data = await apiRequest('/api/daily-bonus', { method: 'POST' });
        sfx.coin();
        spawnConfetti();
        showToast(`🎁 +${data.bonus} NXR (Стрік: ${data.streak_days}д)!`, 'success');
        document.getElementById('balance').textContent = Math.round(data.new_balance);
        btn.disabled = true;
        loadUser();
        loadTransactions();
    } catch (e) {
        showToast(e.message, 'info');
        btn.disabled = true;
    }
});

async function loadTransactions() {
    const list = document.getElementById('tx-list');
    if (!list) return;
    try {
        const data = await apiRequest('/api/transactions', { method: 'POST' });
        if (!data.transactions || data.transactions.length === 0) {
            list.innerHTML = `<div class="empty-state"><p>Операцій ще немає</p></div>`;
            return;
        }
        list.innerHTML = data.transactions.map(tx => {
            const isPos = tx.amount >= 0;
            const sign = isPos ? '+' : '';
            const cls = isPos ? 'tx-positive' : 'tx-negative';
            const date = new Date(tx.created_at).toLocaleString('uk-UA', {
                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
            });
            return `
                <div class="tx-item">
                    <div>
                        <div class="tx-desc">${tx.description}</div>
                        <div class="tx-date">${date}</div>
                    </div>
                    ${tx.amount !== 0 ? `<div class="tx-amount ${cls}">${sign}${Math.round(tx.amount)} 💎</div>` : ''}
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error(e);
    }
}

async function loadLeaderboard() {
    const list = document.getElementById('leaderboard-list');
    if (!list) return;
    try {
        const data = await apiRequest('/api/leaderboard');
        if (!data.leaderboard || data.leaderboard.length === 0) {
            list.innerHTML = '<div class="empty-state"><div class="empty-icon">🏆</div><p>Рейтинг порожній</p></div>';
            return;
        }
        const medals = ['🥇', '🥈', '🥉'];
        list.innerHTML = data.leaderboard.map((u, i) => `
            <div class="lb-item">
                <div class="lb-rank">${medals[i] || `#${i + 1}`}</div>
                <div class="lb-info">
                    <div class="lb-name">${u.first_name || u.username} <span style="font-size:11px;color:var(--primary);">LVL ${u.level || 1}</span></div>
                    <div class="lb-details">📦 ${u.nft_count} предметів · 💎 ${u.balance} NXR · ⭐ ${u.xp || 0} XP</div>
                </div>
            </div>
        `).join('');
    } catch (e) {
        showToast(e.message, 'error');
    }
}

// ============ INIT ============
async function init() {
    await loadUser();
    await loadCollection();
}

init();
