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
        hydrateBlenderCutouts(grid);

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
        hydrateBlenderCutouts(grid);

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

// ============ HIGH-POLY BEVELED THREE.JS 3D STUDIO ENGINE & CHOREOGRAPHED 3D ANIMATIONS ============
let activeThreeController = null;
let cachedEnvMap = null;

function disposeActiveThreeStage() {
    if (activeThreeController) {
        activeThreeController.dispose();
        activeThreeController = null;
    }
}

function detectGiftArchetype(nft) {
    const text = `${nft.name || ''} ${nft.base_box_name || ''} ${nft.revealed_name || ''} ${nft.image_url || ''}`.toLowerCase();
    if (text.includes('phone') || text.includes('смартфон') || text.includes('телефон')) return 'phone';
    if (text.includes('supercar') || text.includes('hypercar') || text.includes('авто')) return 'supercar';
    if (text.includes('gpu') || text.includes('rtx') || text.includes('відеокарт')) return 'gpu';
    if (text.includes('sneaker') || text.includes('air') || text.includes('крос')) return 'sneaker';
    if (text.includes('gamepad') || text.includes('propad') || text.includes('геймпад')) return 'gamepad';
    return 'custom';
}

// Create a procedural Blender-like Studio Softbox HDRI Environment Map so metallic Gold, Titanium & Glass look ultra-realistic
function getStudioEnvironmentMap(THREE, renderer) {
    if (cachedEnvMap) return cachedEnvMap;
    try {
        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        pmremGenerator.compileCubemapShader();

        const envScene = new THREE.Scene();
        envScene.background = new THREE.Color(0x111823);

        // Top Warm Studio Softbox
        const topBox = new THREE.Mesh(
            new THREE.PlaneGeometry(18, 18),
            new THREE.MeshBasicMaterial({ color: 0xfff6e5, side: THREE.DoubleSide })
        );
        topBox.position.set(0, 9, 0);
        topBox.rotation.x = Math.PI / 2;
        envScene.add(topBox);

        // Left Cyan Rim Softbox
        const leftBox = new THREE.Mesh(
            new THREE.PlaneGeometry(12, 14),
            new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide })
        );
        leftBox.position.set(-9, 3, 4);
        leftBox.rotation.y = Math.PI / 2.5;
        envScene.add(leftBox);

        // Right Golden Key Softbox
        const rightBox = new THREE.Mesh(
            new THREE.PlaneGeometry(14, 14),
            new THREE.MeshBasicMaterial({ color: 0xfbbf24, side: THREE.DoubleSide })
        );
        rightBox.position.set(9, 4, 5);
        rightBox.rotation.y = -Math.PI / 2.5;
        envScene.add(rightBox);

        // Front Fill Strip
        const frontStrip = new THREE.Mesh(
            new THREE.PlaneGeometry(16, 4),
            new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
        );
        frontStrip.position.set(0, 2, 10);
        envScene.add(frontStrip);

        cachedEnvMap = pmremGenerator.fromScene(envScene, 0.04).texture;
        pmremGenerator.dispose();
        return cachedEnvMap;
    } catch {
        return null;
    }
}

// Helper: Smooth Rounded & Beveled 3D Box Geometry (like Blender Bevel + Subsurf modifier, centered at origin)
function createRoundedBoxGeo(THREE, w, h, d, radius = 0.16, bevel = 0.035) {
    const shape = new THREE.Shape();
    const hw = Math.max(0.05, w / 2 - bevel);
    const hh = Math.max(0.05, h / 2 - bevel);
    const r = Math.min(radius, hw * 0.85, hh * 0.85);

    shape.moveTo(-hw + r, -hh);
    shape.lineTo(hw - r, -hh);
    shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
    shape.lineTo(hw, hh - r);
    shape.quadraticCurveTo(hw, hh, hw - r, hh);
    shape.lineTo(-hw + r, hh);
    shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
    shape.lineTo(-hw, -hh + r);
    shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);

    const extrudeDepth = Math.max(0.02, d - bevel * 2);
    const geo = new THREE.ExtrudeGeometry(shape, {
        depth: extrudeDepth,
        bevelEnabled: true,
        bevelSegments: 5,
        steps: 1,
        bevelSize: bevel,
        bevelThickness: bevel,
        curveSegments: 12
    });
    geo.center();
    return geo;
}

function buildHighPoly3DGift(THREE, nft, texLoader) {
    const root = new THREE.Group();
    const archetype = detectGiftArchetype(nft);
    const isUpgraded = Boolean(nft.is_upgraded);
    const animatedParts = [];

    // High-end Blender-style PBR Materials (with Clearcoat & Environment Map Reflections)
    const gold24kMat = new THREE.MeshPhysicalMaterial({
        color: 0xffbf3c,
        metalness: 0.92,
        roughness: 0.14,
        clearcoat: 0.65,
        clearcoatRoughness: 0.1,
        reflectivity: 1.0
    });
    const roseGoldMat = new THREE.MeshPhysicalMaterial({
        color: 0xf0a68c,
        metalness: 0.9,
        roughness: 0.15,
        clearcoat: 0.85,
        clearcoatRoughness: 0.08
    });
    const brushedTitaniumMat = new THREE.MeshPhysicalMaterial({
        color: 0x263040,
        metalness: 0.82,
        roughness: 0.24,
        clearcoat: 0.4,
        clearcoatRoughness: 0.2
    });
    const obsidianMat = new THREE.MeshPhysicalMaterial({
        color: 0x121822,
        metalness: 0.45,
        roughness: 0.32,
        clearcoat: 0.7,
        clearcoatRoughness: 0.15
    });
    const sapphireGlassMat = new THREE.MeshPhysicalMaterial({
        color: 0x0b1528,
        metalness: 0.15,
        roughness: 0.05,
        clearcoat: 1.0,
        clearcoatRoughness: 0.03,
        reflectivity: 1.0
    });
    const glowingGoldCoreMat = new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xf59e0b,
        emissiveIntensity: 1.1,
        roughness: 0.2
    });

    // Load the high-res Blender artwork texture for displays/emblems/reliefs
    let artTexture = null;
    if (nft.image_url) {
        try {
            artTexture = texLoader.load(nft.image_url);
        } catch {}
    }
    const glossyArtMat = new THREE.MeshPhysicalMaterial({
        map: artTexture || null,
        color: artTexture ? 0xffffff : 0x38bdf8,
        metalness: 0.18,
        roughness: 0.14,
        clearcoat: 1.0,
        clearcoatRoughness: 0.06
    });

    // ==================== STAGE 1: 3D SEALED COLLECTOR BOXES (WITH 3D OPENING LID) ====================
    if (!isUpgraded) {
        if (archetype === 'supercar') {
            // Sculpted Octagonal Carbon & 24K Gold Collector Vault Box
            const baseGeo = new THREE.CylinderGeometry(1.42, 1.36, 0.82, 8);
            const baseMesh = new THREE.Mesh(baseGeo, obsidianMat);
            baseMesh.position.y = -0.22;
            root.add(baseMesh);

            // Lower Gold Octagonal Foot Ring
            const footRing = new THREE.Mesh(new THREE.CylinderGeometry(1.42, 1.44, 0.08, 8), gold24kMat);
            footRing.position.y = -0.60;
            root.add(footRing);

            // Inner glowing treasure core (visible when lid opens during upgrade!)
            const innerCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 2), glowingGoldCoreMat);
            innerCore.position.y = -0.05;
            root.add(innerCore);

            // Hinged 3D Top Lid
            const lidGroup = new THREE.Group();
            const lidGeo = new THREE.CylinderGeometry(1.34, 1.46, 0.38, 8);
            const lidMesh = new THREE.Mesh(lidGeo, brushedTitaniumMat);
            lidMesh.position.y = 0.36;
            lidGroup.add(lidMesh);

            const goldSeam = new THREE.Mesh(new THREE.CylinderGeometry(1.49, 1.49, 0.08, 8), gold24kMat);
            goldSeam.position.y = 0.19;
            lidGroup.add(goldSeam);

            // 3D Raised Gold Crest Frame + Blender Art Relief on Top & Front
            const topCrestFrame = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.96, 0.08, 8), gold24kMat);
            topCrestFrame.position.y = 0.56;
            lidGroup.add(topCrestFrame);

            const topArtMedallion = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.09, 24), glossyArtMat);
            topArtMedallion.position.y = 0.57;
            lidGroup.add(topArtMedallion);

            // Front 3D Emblem Badge
            const frontBadgeFrame = new THREE.Mesh(createRoundedBoxGeo(THREE, 0.95, 0.52, 0.08, 0.1, 0.02), gold24kMat);
            frontBadgeFrame.position.set(0, -0.1, 1.32);
            root.add(frontBadgeFrame);

            const frontBadgeArt = new THREE.Mesh(createRoundedBoxGeo(THREE, 0.85, 0.42, 0.09, 0.08, 0.015), glossyArtMat);
            frontBadgeArt.position.set(0, -0.1, 1.33);
            root.add(frontBadgeArt);

            // 4 Sculpted 3D Gold Latches
            for (let i = 0; i < 4; i++) {
                const ang = (i * Math.PI) / 2 + Math.PI / 4;
                const latch = new THREE.Mesh(createRoundedBoxGeo(THREE, 0.24, 0.38, 0.14, 0.05, 0.02), gold24kMat);
                latch.position.set(Math.sin(ang) * 1.38, 0.12, Math.cos(ang) * 1.38);
                latch.rotation.y = ang;
                root.add(latch);
            }

            root.userData.lidGroup = lidGroup;
            root.add(lidGroup);
        } else {
            // Smooth Beveled Luxury 3D Collector Box (Phone / GPU / Sneaker / Gamepad)
            const isTallPhone = archetype === 'phone';
            const w = isTallPhone ? 1.72 : 2.18;
            const h = isTallPhone ? 2.28 : 1.38;
            const d = isTallPhone ? 0.92 : 1.48;

            // Main Beveled Box Base
            const baseBody = new THREE.Mesh(
                createRoundedBoxGeo(THREE, w, h, d, 0.18, 0.04),
                obsidianMat
            );
            root.add(baseBody);

            // 24K Gold Recessed Seam Band around the Box
            const goldBand = new THREE.Mesh(
                createRoundedBoxGeo(THREE, w + 0.05, h + 0.05, 0.10, 0.18, 0.02),
                gold24kMat
            );
            goldBand.position.z = d * 0.18;
            root.add(goldBand);

            // Inner glowing core when box opens
            const innerCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 2), glowingGoldCoreMat);
            root.add(innerCore);

            // Hinged 3D Front/Top Cover Lid with Raised Gold Bezel & Blender Art Relief
            const lidGroup = new THREE.Group();
            const lidCover = new THREE.Mesh(
                createRoundedBoxGeo(THREE, w + 0.04, h + 0.04, d * 0.36, 0.18, 0.04),
                brushedTitaniumMat
            );
            lidCover.position.z = d * 0.36;
            lidGroup.add(lidCover);

            // Raised 24K Gold Relief Frame on Front of Lid
            const reliefFrame = new THREE.Mesh(
                createRoundedBoxGeo(THREE, w * 0.86, h * 0.86, 0.08, 0.14, 0.025),
                gold24kMat
            );
            reliefFrame.position.z = d * 0.55;
            lidGroup.add(reliefFrame);

            // Front Glossy Blender Render Plate
            const frontArtPlate = new THREE.Mesh(
                createRoundedBoxGeo(THREE, w * 0.80, h * 0.80, 0.06, 0.12, 0.015),
                glossyArtMat
            );
            frontArtPlate.position.z = d * 0.58;
            lidGroup.add(frontArtPlate);

            // Back Engraved Gold Medallion (-Z face so rotating 180° in 3D looks awesome!)
            const backFrame = new THREE.Mesh(
                createRoundedBoxGeo(THREE, w * 0.78, h * 0.78, 0.06, 0.14, 0.02),
                gold24kMat
            );
            backFrame.position.z = -d * 0.51;
            root.add(backFrame);

            const backArtPlate = new THREE.Mesh(
                createRoundedBoxGeo(THREE, w * 0.72, h * 0.72, 0.06, 0.12, 0.015),
                glossyArtMat
            );
            backArtPlate.position.z = -d * 0.53;
            root.add(backArtPlate);

            // Holographic Security Seal on Right Side Rail
            const holoSeal = new THREE.Mesh(
                createRoundedBoxGeo(THREE, 0.06, 0.62, 0.36, 0.04, 0.01),
                new THREE.MeshPhysicalMaterial({
                    color: 0x38bdf8,
                    emissive: 0x0284c7,
                    emissiveIntensity: 0.55,
                    metalness: 0.9,
                    roughness: 0.08,
                    clearcoat: 1.0
                })
            );
            holoSeal.position.set(w / 2 + 0.03, 0, d * 0.15);
            root.add(holoSeal);

            root.userData.lidGroup = lidGroup;
            root.add(lidGroup);
        }

        return { root, animatedParts };
    }

    // ==================== STAGE 2: UPGRADED HIGH-POLY 3D COLLECTIBLE ITEMS ====================
    if (archetype === 'phone') {
        // 1. NexPhone 16 Titanium Gold — High-Poly Beveled 3D Flagship Smartphone
        const phoneGroup = new THREE.Group();

        // Outer 24K Gold Rounded Unibody Frame
        const goldRails = new THREE.Mesh(
            createRoundedBoxGeo(THREE, 1.54, 2.96, 0.22, 0.26, 0.045),
            gold24kMat
        );
        phoneGroup.add(goldRails);

        // Inner Brushed Titanium Core
        const titaniumCore = new THREE.Mesh(
            createRoundedBoxGeo(THREE, 1.48, 2.90, 0.23, 0.24, 0.03),
            brushedTitaniumMat
        );
        phoneGroup.add(titaniumCore);

        // Front Edge-to-Edge OLED Display (+Z) with High-Res Art & Clearcoat Glass
        const frontScreen = new THREE.Mesh(
            createRoundedBoxGeo(THREE, 1.38, 2.78, 0.04, 0.20, 0.01),
            glossyArtMat
        );
        frontScreen.position.z = 0.105;
        phoneGroup.add(frontScreen);

        // 3D Dynamic Island Capsule on Front Screen
        const dynamicIsland = new THREE.Mesh(
            createRoundedBoxGeo(THREE, 0.44, 0.12, 0.03, 0.05, 0.008),
            obsidianMat
        );
        dynamicIsland.position.set(0, 1.18, 0.125);
        phoneGroup.add(dynamicIsland);

        const selfieLens = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 16), sapphireGlassMat);
        selfieLens.rotation.x = Math.PI / 2;
        selfieLens.position.set(0.13, 1.18, 0.13);
        phoneGroup.add(selfieLens);

        // Side Physical 24K Gold Buttons (Power, Action, Volume Up/Down)
        const powerBtn = new THREE.Mesh(createRoundedBoxGeo(THREE, 0.05, 0.38, 0.07, 0.02, 0.01), gold24kMat);
        powerBtn.position.set(0.78, 0.42, 0);
        phoneGroup.add(powerBtn);

        const volUp = new THREE.Mesh(createRoundedBoxGeo(THREE, 0.05, 0.26, 0.07, 0.02, 0.01), gold24kMat);
        volUp.position.set(-0.78, 0.58, 0);
        phoneGroup.add(volUp);

        const volDown = new THREE.Mesh(createRoundedBoxGeo(THREE, 0.05, 0.26, 0.07, 0.02, 0.01), gold24kMat);
        volDown.position.set(-0.78, 0.22, 0);
        phoneGroup.add(volDown);

        // Back Frosted Obsidian Glass & Raised 3D Triple-Camera Plateau (-Z)
        const backGlass = new THREE.Mesh(
            createRoundedBoxGeo(THREE, 1.38, 2.78, 0.04, 0.20, 0.01),
            sapphireGlassMat
        );
        backGlass.position.z = -0.105;
        phoneGroup.add(backGlass);

        // Beveled 24K Gold & Titanium Camera Island on Back
        const camPlateauGold = new THREE.Mesh(
            createRoundedBoxGeo(THREE, 0.78, 0.82, 0.07, 0.18, 0.02),
            gold24kMat
        );
        camPlateauGold.position.set(-0.24, 0.88, -0.13);
        phoneGroup.add(camPlateauGold);

        const camPlateauGlass = new THREE.Mesh(
            createRoundedBoxGeo(THREE, 0.72, 0.76, 0.08, 0.16, 0.02),
            obsidianMat
        );
        camPlateauGlass.position.set(-0.24, 0.88, -0.14);
        phoneGroup.add(camPlateauGlass);

        // 3 Protruding Multi-Element Sapphire Camera Barrels
        const lensOffsets = [
            [-0.42, 1.06],
            [-0.42, 0.70],
            [-0.08, 0.88]
        ];
        lensOffsets.forEach(([lx, ly]) => {
            const barrelGold = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.165, 0.09, 28), gold24kMat);
            barrelGold.rotation.x = Math.PI / 2;
            barrelGold.position.set(lx, ly, -0.185);
            phoneGroup.add(barrelGold);

            const innerDark = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.095, 24), obsidianMat);
            innerDark.rotation.x = Math.PI / 2;
            innerDark.position.set(lx, ly, -0.19);
            phoneGroup.add(innerDark);

            const sapphireDome = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 16), sapphireGlassMat);
            sapphireDome.scale.set(1, 1, 0.45);
            sapphireDome.position.set(lx, ly, -0.22);
            phoneGroup.add(sapphireDome);
        });

        // LED TrueTone Flash & LiDAR Scanner on Camera Island
        const flashMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.055, 0.055, 0.08, 20),
            new THREE.MeshBasicMaterial({ color: 0xfffbeb })
        );
        flashMesh.rotation.x = Math.PI / 2;
        flashMesh.position.set(-0.08, 1.12, -0.16);
        phoneGroup.add(flashMesh);

        const lidarMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.08, 20), gold24kMat);
        lidarMesh.rotation.x = Math.PI / 2;
        lidarMesh.position.set(-0.08, 0.64, -0.16);
        phoneGroup.add(lidarMesh);

        // Sculpted 24K Gold Medallion Crest on Back Center
        const backCrest = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.04, 32), gold24kMat);
        backCrest.rotation.x = Math.PI / 2;
        backCrest.position.set(0, -0.12, -0.125);
        phoneGroup.add(backCrest);

        root.add(phoneGroup);
    } else if (archetype === 'supercar') {
        // 2. HyperCar Rose-Gold Carbon — Sculpted Aerodynamic 3D Sports Car
        const carGroup = new THREE.Group();

        // Smooth Curved Side-Profile Extruded Supercar Monocoque
        const carProfile = new THREE.Shape();
        carProfile.moveTo(-1.45, -0.18);
        carProfile.lineTo(1.42, -0.18);
        carProfile.quadraticCurveTo(1.52, -0.02, 1.32, 0.08); // Front nose splitter curve
        carProfile.quadraticCurveTo(0.85, 0.16, 0.55, 0.18); // Front hood
        carProfile.quadraticCurveTo(0.22, 0.46, -0.18, 0.44); // Teardrop windshield & roof
        carProfile.quadraticCurveTo(-0.75, 0.40, -1.18, 0.18); // Fastback engine deck
        carProfile.lineTo(-1.45, 0.14);
        carProfile.quadraticCurveTo(-1.52, -0.02, -1.45, -0.18);

        const bodyGeo = new THREE.ExtrudeGeometry(carProfile, {
            depth: 1.18,
            bevelEnabled: true,
            bevelSegments: 6,
            steps: 2,
            bevelSize: 0.09,
            bevelThickness: 0.09,
            curveSegments: 20
        });
        bodyGeo.center();
        const mainBody = new THREE.Mesh(bodyGeo, roseGoldMat);
        // Rotate so car faces +Z / diagonal showcase
        mainBody.rotation.y = Math.PI / 2;
        carGroup.add(mainBody);

        // Sculpted Wide Front & Rear Aerodynamic Fender Haunches
        const frontHaunch = new THREE.Mesh(
            createRoundedBoxGeo(THREE, 1.56, 0.34, 0.85, 0.14, 0.05),
            roseGoldMat
        );
        frontHaunch.position.set(0, -0.12, 0.82);
        carGroup.add(frontHaunch);

        const rearHaunch = new THREE.Mesh(
            createRoundedBoxGeo(THREE, 1.62, 0.38, 0.92, 0.15, 0.05),
            roseGoldMat
        );
        rearHaunch.position.set(0, -0.10, -0.78);
        carGroup.add(rearHaunch);

        // Smoked Sapphire Glass Cockpit Canopy
        const canopy = new THREE.Mesh(
            createRoundedBoxGeo(THREE, 1.06, 0.34, 1.28, 0.16, 0.05),
            sapphireGlassMat
        );
        canopy.position.set(0, 0.18, -0.04);
        carGroup.add(canopy);

        // 24K Gold Roof Air Scoop & Front Splitter
        const roofScoop = new THREE.Mesh(createRoundedBoxGeo(THREE, 0.24, 0.12, 0.62, 0.04, 0.02), gold24kMat);
        roofScoop.position.set(0, 0.36, -0.22);
        carGroup.add(roofScoop);

        const frontSplitter = new THREE.Mesh(createRoundedBoxGeo(THREE, 1.52, 0.06, 0.36, 0.04, 0.015), gold24kMat);
        frontSplitter.position.set(0, -0.26, 1.34);
        carGroup.add(frontSplitter);

        // Swan-Neck Carbon & Gold GT Rear Wing
        const rearWing = new THREE.Mesh(createRoundedBoxGeo(THREE, 1.58, 0.06, 0.34, 0.04, 0.015), obsidianMat);
        rearWing.position.set(0, 0.34, -1.32);
        rearWing.rotation.x = 0.12;
        carGroup.add(rearWing);

        [-0.44, 0.44].forEach(wx => {
            const pylon = new THREE.Mesh(createRoundedBoxGeo(THREE, 0.06, 0.28, 0.18, 0.02, 0.01), gold24kMat);
            pylon.position.set(wx, 0.18, -1.25);
            carGroup.add(pylon);
        });

        // 4 Deep-Dish 24K Gold 3D Alloy Wheels with Tire Treads
        const wheelCoords = [
            [-0.78, -0.20, 0.86],
            [0.78, -0.20, 0.86],
            [-0.80, -0.18, -0.84],
            [0.80, -0.18, -0.84]
        ];
        wheelCoords.forEach(([wx, wy, wz]) => {
            const wGroup = new THREE.Group();
            wGroup.position.set(wx, wy, wz);

            const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.26, 28), obsidianMat);
            tire.rotation.z = Math.PI / 2;
            wGroup.add(tire);

            const goldRim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.28, 20), gold24kMat);
            goldRim.rotation.z = Math.PI / 2;
            wGroup.add(goldRim);

            const centerHub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.30, 16), obsidianMat);
            centerHub.rotation.z = Math.PI / 2;
            wGroup.add(centerHub);

            carGroup.add(wGroup);
            animatedParts.push(wGroup);
        });

        // Glowing LED Matrix Headlights (+Z) & Full-Width Rear Neon Lightblade (-Z)
        const headlightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x38bdf8, emissiveIntensity: 1.2 });
        [-0.50, 0.50].forEach(hx => {
            const hl = new THREE.Mesh(createRoundedBoxGeo(THREE, 0.32, 0.07, 0.10, 0.02, 0.01), headlightMat);
            hl.position.set(hx, -0.06, 1.44);
            carGroup.add(hl);
        });

        const taillightMat = new THREE.MeshStandardMaterial({ color: 0xff2a4b, emissive: 0xef4444, emissiveIntensity: 1.3 });
        const rearLightbar = new THREE.Mesh(createRoundedBoxGeo(THREE, 1.36, 0.07, 0.08, 0.02, 0.01), taillightMat);
        rearLightbar.position.set(0, 0.02, -1.46);
        carGroup.add(rearLightbar);

        root.add(carGroup);
    } else if (archetype === 'gpu') {
        // 3. RTX 9090 Liquid Gold — High-Poly Beveled 3D Graphics Card with 3 Spinning Fans
        const gpuGroup = new THREE.Group();

        // Main Beveled Gunmetal & Fin-Stack Heatsink Body
        const shroudBody = new THREE.Mesh(
            createRoundedBoxGeo(THREE, 2.86, 1.28, 0.44, 0.14, 0.035),
            brushedTitaniumMat
        );
        gpuGroup.add(shroudBody);

        // 24K Gold Die-Cast Hourglass Armor Frame on Front (+Z)
        const goldArmorTop = new THREE.Mesh(
            createRoundedBoxGeo(THREE, 2.92, 0.22, 0.48, 0.06, 0.02),
            gold24kMat
        );
        goldArmorTop.position.y = 0.55;
        gpuGroup.add(goldArmorTop);

        const goldArmorBot = new THREE.Mesh(
            createRoundedBoxGeo(THREE, 2.92, 0.22, 0.48, 0.06, 0.02),
            gold24kMat
        );
        goldArmorBot.position.y = -0.55;
        gpuGroup.add(goldArmorBot);

        // Exposed Gold Copper Heatpipes along Top Edge
        [-0.08, 0.08].forEach(hz => {
            const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.5, 16), gold24kMat);
            pipe.rotation.z = Math.PI / 2;
            pipe.position.set(0, 0.67, hz);
            gpuGroup.add(pipe);
        });

        // Brushed 24K Gold Backplate (-Z) with High-Res Emblem Cutout
        const goldBackplate = new THREE.Mesh(
            createRoundedBoxGeo(THREE, 2.84, 1.22, 0.05, 0.10, 0.015),
            gold24kMat
        );
        goldBackplate.position.z = -0.23;
        gpuGroup.add(goldBackplate);

        const backArtBadge = new THREE.Mesh(
            createRoundedBoxGeo(THREE, 1.12, 0.92, 0.05, 0.08, 0.01),
            glossyArtMat
        );
        backArtBadge.position.set(0.55, 0, -0.25);
        gpuGroup.add(backArtBadge);

        // 3 Recessed Turbine Wells + RGB Neon Halos + Spinning 3D Axial Fans
        const fanX = [-0.92, 0, 0.92];
        const haloColors = [0xf59e0b, 0x38bdf8, 0xa855f7];

        fanX.forEach((fx, idx) => {
            const well = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 28), obsidianMat);
            well.rotation.x = Math.PI / 2;
            well.position.set(fx, 0, 0.20);
            gpuGroup.add(well);

            const rgbHalo = new THREE.Mesh(
                new THREE.TorusGeometry(0.41, 0.032, 16, 36),
                new THREE.MeshStandardMaterial({
                    color: haloColors[idx],
                    emissive: haloColors[idx],
                    emissiveIntensity: 1.1
                })
            );
            rgbHalo.position.set(fx, 0, 0.235);
            gpuGroup.add(rgbHalo);

            const fanRotor = new THREE.Group();
            fanRotor.position.set(fx, 0, 0.23);

            const goldHub = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.07, 24), gold24kMat);
            goldHub.rotation.x = Math.PI / 2;
            fanRotor.add(goldHub);

            for (let b = 0; b < 9; b++) {
                const blade = new THREE.Mesh(
                    createRoundedBoxGeo(THREE, 0.10, 0.34, 0.025, 0.02, 0.005),
                    obsidianMat
                );
                const ang = (b * Math.PI * 2) / 9;
                blade.position.set(Math.cos(ang) * 0.21, Math.sin(ang) * 0.21, 0);
                blade.rotation.z = ang + 0.42;
                blade.rotation.y = 0.38;
                fanRotor.add(blade);
            }

            gpuGroup.add(fanRotor);
            animatedParts.push(fanRotor);
        });

        // Gold PCIe 5.0 Edge Connector at Bottom
        const pcie = new THREE.Mesh(createRoundedBoxGeo(THREE, 1.18, 0.15, 0.06, 0.02, 0.01), gold24kMat);
        pcie.position.set(-0.35, -0.71, 0);
        gpuGroup.add(pcie);

        root.add(gpuGroup);
    } else if (archetype === 'sneaker') {
        // 4. Air Gold & Ice Sole — Sculpted High-Top 3D Collector Sneaker
        const shoeGroup = new THREE.Group();
        const leatherMat = new THREE.MeshPhysicalMaterial({
            color: 0xf8fafc,
            roughness: 0.28,
            metalness: 0.08,
            clearcoat: 0.35
        });
        const cyanIceSoleMat = new THREE.MeshPhysicalMaterial({
            color: 0x06b6d4,
            emissive: 0x0891b2,
            emissiveIntensity: 0.75,
            roughness: 0.12,
            clearcoat: 1.0
        });

        // Sculpted High-Top Sneaker Side Silhouette Extruded in 3D
        const shoeShape = new THREE.Shape();
        shoeShape.moveTo(-1.12, -0.45);
        shoeShape.lineTo(1.12, -0.45); // Flat sole base
        shoeShape.quadraticCurveTo(1.25, -0.22, 1.02, -0.08); // Rounded toe box
        shoeShape.quadraticCurveTo(0.55, 0.02, 0.18, 0.32); // Instep / laces slope
        shoeShape.lineTo(-0.12, 0.78); // High-top tongue top
        shoeShape.quadraticCurveTo(-0.55, 0.82, -0.95, 0.66); // High-top ankle collar
        shoeShape.quadraticCurveTo(-1.18, 0.25, -1.12, -0.45); // Heel counter curve

        const shoeBodyGeo = new THREE.ExtrudeGeometry(shoeShape, {
            depth: 0.78,
            bevelEnabled: true,
            bevelSegments: 6,
            steps: 2,
            bevelSize: 0.09,
            bevelThickness: 0.09,
            curveSegments: 20
        });
        shoeBodyGeo.center();
        const shoeUpper = new THREE.Mesh(shoeBodyGeo, leatherMat);
        shoeGroup.add(shoeUpper);

        // Translucent Glowing Cyan Ice Outsole
        const iceSole = new THREE.Mesh(
            createRoundedBoxGeo(THREE, 2.38, 0.24, 1.02, 0.10, 0.03),
            cyanIceSoleMat
        );
        iceSole.position.set(0.02, -0.66, 0);
        shoeGroup.add(iceSole);

        // White Sculpted Midsole
        const midsole = new THREE.Mesh(
            createRoundedBoxGeo(THREE, 2.32, 0.20, 0.98, 0.08, 0.025),
            leatherMat
        );
        midsole.position.set(0.02, -0.48, 0);
        shoeGroup.add(midsole);

        // 24K Gold Toe Box Armor, Heel Counter & Ankle Collar Strap
        const goldToe = new THREE.Mesh(
            createRoundedBoxGeo(THREE, 0.72, 0.28, 0.98, 0.10, 0.03),
            gold24kMat
        );
        goldToe.position.set(0.82, -0.26, 0);
        shoeGroup.add(goldToe);

        const goldStrap = new THREE.Mesh(
            createRoundedBoxGeo(THREE, 0.88, 0.20, 1.00, 0.08, 0.025),
            gold24kMat
        );
        goldStrap.position.set(-0.52, 0.38, 0);
        goldStrap.rotation.z = 0.12;
        shoeGroup.add(goldStrap);

        // 24K Gold Side Emblems on Both Sides (+Z and -Z)
        [-0.49, 0.49].forEach(sz => {
            const swoosh = new THREE.Mesh(
                createRoundedBoxGeo(THREE, 1.15, 0.20, 0.05, 0.04, 0.01),
                gold24kMat
            );
            swoosh.position.set(-0.08, -0.02, sz);
            swoosh.rotation.z = -0.22;
            shoeGroup.add(swoosh);
        });

        // 4 Sculpted 3D Gold Laces across Instep
        for (let i = 0; i < 4; i++) {
            const lace = new THREE.Mesh(
                createRoundedBoxGeo(THREE, 0.10, 0.08, 0.86, 0.02, 0.01),
                gold24kMat
            );
            lace.position.set(0.32 - i * 0.16, 0.02 + i * 0.14, 0);
            lace.rotation.z = -0.5;
            shoeGroup.add(lace);
        }

        root.add(shoeGroup);
    } else if (archetype === 'gamepad') {
        // 5. ProPad Smoked Gold — High-Poly Sculpted 3D Ergonomic Controller
        const padGroup = new THREE.Group();

        // Central Beveled Controller Bridge
        const bridge = new THREE.Mesh(
            createRoundedBoxGeo(THREE, 1.82, 0.96, 0.42, 0.18, 0.04),
            brushedTitaniumMat
        );
        padGroup.add(bridge);

        // Left & Right Ergonomic Sculpted Grips with Spherical Pommels
        [-0.88, 0.88].forEach((gx, idx) => {
            const sign = idx === 0 ? 1 : -1;
            const gripGroup = new THREE.Group();
            gripGroup.position.set(gx, -0.26, 0.04);
            gripGroup.rotation.z = sign * 0.28;

            const gripCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.25, 1.32, 24), obsidianMat);
            gripGroup.add(gripCyl);

            const topCap = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 16), brushedTitaniumMat);
            topCap.position.y = 0.64;
            gripGroup.add(topCap);

            const botCap = new THREE.Mesh(new THREE.SphereGeometry(0.25, 24, 16), gold24kMat);
            botCap.position.y = -0.64;
            gripGroup.add(botCap);

            padGroup.add(gripGroup);
        });

        // Center Recessed Touchpad with High-Res Art & Gold Trim
        const touchGold = new THREE.Mesh(
            createRoundedBoxGeo(THREE, 0.88, 0.48, 0.06, 0.08, 0.015),
            gold24kMat
        );
        touchGold.position.set(0, 0.24, 0.20);
        padGroup.add(touchGold);

        const touchScreen = new THREE.Mesh(
            createRoundedBoxGeo(THREE, 0.80, 0.40, 0.06, 0.06, 0.01),
            glossyArtMat
        );
        touchScreen.position.set(0, 0.24, 0.22);
        padGroup.add(touchScreen);

        // 2 Protruding 24K Gold 3D Analog Thumbsticks on Ball-Joint Domes
        [-0.44, 0.44].forEach(sx => {
            const dome = new THREE.Mesh(new THREE.SphereGeometry(0.18, 20, 16), obsidianMat);
            dome.position.set(sx, -0.18, 0.18);
            padGroup.add(dome);

            const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.22, 20), gold24kMat);
            shaft.rotation.x = Math.PI / 2;
            shaft.position.set(sx, -0.18, 0.28);
            padGroup.add(shaft);

            const stickCap = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.17, 0.08, 28), gold24kMat);
            stickCap.rotation.x = Math.PI / 2;
            stickCap.position.set(sx, -0.18, 0.40);
            padGroup.add(stickCap);
        });

        // Sculpted 24K Gold D-Pad on Left
        const dpadH = new THREE.Mesh(createRoundedBoxGeo(THREE, 0.38, 0.13, 0.08, 0.03, 0.01), gold24kMat);
        dpadH.position.set(-0.68, 0.16, 0.22);
        padGroup.add(dpadH);

        const dpadV = new THREE.Mesh(createRoundedBoxGeo(THREE, 0.13, 0.38, 0.08, 0.03, 0.01), gold24kMat);
        dpadV.position.set(-0.68, 0.16, 0.22);
        padGroup.add(dpadV);

        // 4 Glossy Gold Action Buttons on Right
        [[0, 0.16], [0, -0.16], [-0.16, 0], [0.16, 0]].forEach(([bx, by]) => {
            const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.08, 20), gold24kMat);
            btn.rotation.x = Math.PI / 2;
            btn.position.set(0.68 + bx, 0.16 + by, 0.22);
            padGroup.add(btn);
        });

        // Sculpted L1/R1 & L2/R2 Gold Triggers on Top/Back
        [-0.62, 0.62].forEach(tx => {
            const shoulder = new THREE.Mesh(
                createRoundedBoxGeo(THREE, 0.44, 0.15, 0.32, 0.05, 0.015),
                gold24kMat
            );
            shoulder.position.set(tx, 0.48, -0.04);
            padGroup.add(shoulder);
        });

        root.add(padGroup);
    } else {
        // Custom Player/Admin Gift -> High-Poly Beveled 24K Gold & Crystal 3D Collector Trophy Block
        const trophyGroup = new THREE.Group();

        const goldFrame = new THREE.Mesh(
            createRoundedBoxGeo(THREE, 1.94, 2.24, 0.34, 0.22, 0.045),
            gold24kMat
        );
        trophyGroup.add(goldFrame);

        const innerSlab = new THREE.Mesh(
            createRoundedBoxGeo(THREE, 1.78, 2.08, 0.38, 0.18, 0.03),
            brushedTitaniumMat
        );
        trophyGroup.add(innerSlab);

        const frontArt = new THREE.Mesh(
            createRoundedBoxGeo(THREE, 1.66, 1.96, 0.05, 0.15, 0.015),
            glossyArtMat
        );
        frontArt.position.z = 0.19;
        trophyGroup.add(frontArt);

        const backArt = new THREE.Mesh(
            createRoundedBoxGeo(THREE, 1.66, 1.96, 0.05, 0.15, 0.015),
            glossyArtMat
        );
        backArt.position.z = -0.19;
        trophyGroup.add(backArt);

        root.add(trophyGroup);
    }

    return { root, animatedParts };
}

function hydrateBlenderCutouts(container) {
    // Card images use high-res studio renders cleanly
}

// ============ RENDER CARD WITH BACKDROP, MINI SYMBOLS & 3D ANIMATION BUTTON ============
function renderNFTCard(nft, context) {
    let statusBadge = '';
    if (nft.is_staked) {
        statusBadge = `<span class="status-chip staked">⚡ STAKED</span>`;
    } else if (nft.on_sale && nft.sale_type === 'auction') {
        statusBadge = `<span class="status-chip auction">⏳ ${formatTimeRemaining(nft.auction_end)}</span>`;
    } else if (!nft.is_upgraded) {
        statusBadge = `<span class="status-chip box-ready">📦 3D БОКС</span>`;
    } else {
        statusBadge = `<span class="status-chip upgraded-tag">${nft.symbol_icon || '✨'} 3D NFT</span>`;
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
                <button class="card-spin-btn" type="button" onclick="event.stopPropagation(); spinCardPreview(this);" title="3D Анімація">
                    ✨ 3D
                </button>
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

window.spinCardPreview = function(btnEl) {
    const wrap = btnEl.closest('.nft-img-wrap');
    const img = wrap ? wrap.querySelector('.nft-card-image') : null;
    if (!img) return;
    sfx.entry();
    haptic('selection');
    img.classList.remove('card-spin-360');
    void img.offsetWidth;
    img.classList.add('card-spin-360');
};

function buildPatternIconsHtml(iconChar = '👑') {
    const ringPositions = [
        { tx: -115, ty: -72, sc: 1.05, rot: -15, op: 0.38, delay: 0.04 },
        { tx: 0,    ty: -98, sc: 0.92, rot: 0,   op: 0.34, delay: 0.08 },
        { tx: 115,  ty: -72, sc: 1.05, rot: 15,  op: 0.38, delay: 0.12 },
        { tx: -135, ty: 8,   sc: 0.88, rot: -20, op: 0.30, delay: 0.16 },
        { tx: 135,  ty: 8,   sc: 0.88, rot: 20,  op: 0.30, delay: 0.20 },
        { tx: -110, ty: 82,  sc: 1.0,  rot: -10, op: 0.36, delay: 0.24 },
        { tx: 0,    ty: 102, sc: 0.90, rot: 0,   op: 0.32, delay: 0.28 },
        { tx: 110,  ty: 82,  sc: 1.0,  rot: 10,  op: 0.36, delay: 0.32 },
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
        ? `🧊 3D Предмет · Натисни для 3D-анімації · ${nft.symbol_icon || '✨'} ${nft.backdrop || 'Royal Gold'}`
        : `📦 3D Бокс (Натисни для 3D-анімації) → Всередині: ${nft.revealed_name || '3D Предмет'}`;

    return `
        <div class="tg-gift-stage" id="tg-gift-stage" style="background: ${bgGradient};">
            <div class="tg-stage-aura"></div>
            <div class="tg-stage-spotlight"></div>
            <div class="tg-pattern-layer" id="tg-pattern-layer">
                ${buildPatternIconsHtml(iconChar)}
            </div>
            <div class="tg-stage-top-bar">
                <button class="btn-replay-anim" id="btn-replay-anim">✨ 3D Анімація</button>
            </div>
            <div class="tg-floor-shadow"></div>
            <div class="tg-glint-ring" id="tg-glint-ring"></div>
            <canvas class="tg-webgl-canvas" id="tg-webgl-canvas"></canvas>
            <div class="tg-stage-flash" id="tg-stage-flash"></div>
            <div class="tg-stage-bottom-pill" id="tg-stage-bottom-pill">${stagePillText}</div>
        </div>
    `;
}

// Keyframed Choreographed 3D Stage (NO manual dragging — pure automatic & tap-triggered 3D animations!)
function attachStageInteractivity(currentNft) {
    disposeActiveThreeStage();

    const stage = document.getElementById('tg-gift-stage');
    const canvas = document.getElementById('tg-webgl-canvas');
    const glintRing = document.getElementById('tg-glint-ring');
    const patternLayer = document.getElementById('tg-pattern-layer');
    const replayBtn = document.getElementById('btn-replay-anim');

    if (!stage || !canvas || !window.THREE) return;
    const THREE = window.THREE;

    sfx.entry();

    const width = stage.clientWidth || 360;
    const height = stage.clientHeight || 295;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    camera.position.set(0, 0.18, 5.25);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;

    // Apply Blender-like Studio Softbox HDRI Environment Reflections
    const envMap = getStudioEnvironmentMap(THREE, renderer);
    if (envMap) {
        scene.environment = envMap;
    }

    // Multi-Point Studio 3D Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff5e0, 1.85);
    keyLight.position.set(4.5, 6.5, 5.5);
    scene.add(keyLight);

    const cyanRimLight = new THREE.DirectionalLight(0x38bdf8, 1.35);
    cyanRimLight.position.set(-5.5, 3.0, -4.0);
    scene.add(cyanRimLight);

    const goldBounceLight = new THREE.PointLight(0xf59e0b, 1.2, 14);
    goldBounceLight.position.set(3.0, -3.5, 3.5);
    scene.add(goldBounceLight);

    const texLoader = new THREE.TextureLoader();
    const modelHolder = new THREE.Group();
    scene.add(modelHolder);

    let currentBuilt = buildHighPoly3DGift(THREE, currentNft, texLoader);
    modelHolder.add(currentBuilt.root);

    // Floating 3D Sparkles around the 3D Gift
    const pCount = 38;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
        const radius = 1.65 + Math.random() * 1.1;
        const angle = Math.random() * Math.PI * 2;
        pPos[i * 3] = Math.cos(angle) * radius;
        pPos[i * 3 + 1] = (Math.random() - 0.5) * 2.3;
        pPos[i * 3 + 2] = Math.sin(angle) * radius;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
        color: 0xfbbf24,
        size: 0.085,
        transparent: true,
        opacity: 0.8
    });
    const sparklePoints = new THREE.Points(pGeo, pMat);
    scene.add(sparklePoints);

    // Choreographed 3D Animation State Machine (NO manual drag!)
    let animFrameId = null;
    let isDisposed = false;
    let clock = 0;

    // Modes: 'entry' | 'idle' | 'tap_spin360' | 'tap_flip_bounce' | 'tap_inspect_back' | 'unboxing'
    let animMode = 'entry';
    let animTimer = 0;
    let tapSequenceIdx = 0;

    const heroYaw = -0.38;   // Signature 3/4 Blender studio presentation angle
    const heroPitch = 0.15;

    function easeOutBack(x) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    }

    function easeInOutCubic(x) {
        return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    }

    function triggerChoreographed3DAnimation() {
        if (animMode === 'unboxing') return;
        sfx.entry();
        haptic('light');

        const modes = ['tap_spin360', 'tap_flip_bounce', 'tap_inspect_back'];
        animMode = modes[tapSequenceIdx % modes.length];
        tapSequenceIdx++;
        animTimer = 0;

        if (glintRing) {
            glintRing.classList.remove('pulse');
            void glintRing.offsetWidth;
            glintRing.classList.add('pulse');
        }
    }

    // Clicking anywhere on the stage or button plays the choreographed 3D animation!
    stage.addEventListener('click', () => {
        triggerChoreographed3DAnimation();
    });

    replayBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        triggerChoreographed3DAnimation();
        if (patternLayer) {
            const html = patternLayer.innerHTML;
            patternLayer.innerHTML = '';
            void patternLayer.offsetWidth;
            patternLayer.innerHTML = html;
        }
    });

    function renderLoop() {
        if (isDisposed) return;
        animFrameId = requestAnimationFrame(renderLoop);

        const dt = 0.016;
        clock += dt;
        animTimer += dt;

        if (animMode === 'entry') {
            // 1.35s 3D Entry Animation: Springs in from depth while rotating 360° in 3D to the hero 3/4 pose!
            const dur = 1.35;
            const p = Math.min(1, animTimer / dur);
            const easeScale = Math.max(0.1, easeOutBack(p));
            const easeRot = easeInOutCubic(p);

            modelHolder.scale.setScalar(easeScale);
            modelHolder.rotation.y = heroYaw - (1 - easeRot) * Math.PI * 2;
            modelHolder.rotation.x = heroPitch + (1 - easeRot) * 0.42;
            modelHolder.rotation.z = (1 - easeRot) * -0.18;
            modelHolder.position.y = (1 - easeRot) * -0.35;

            if (p >= 1) {
                animMode = 'idle';
                animTimer = 0;
            }
        } else if (animMode === 'tap_spin360') {
            // Choreographed Tap 1: Full 360° 3D Turntable Showcase Rotation + Scale Pop
            const dur = 1.25;
            const p = Math.min(1, animTimer / dur);
            const e = easeInOutCubic(p);
            const pop = 1 + Math.sin(p * Math.PI) * 0.16;

            modelHolder.scale.setScalar(pop);
            modelHolder.rotation.y = heroYaw + e * Math.PI * 2;
            modelHolder.rotation.x = heroPitch + Math.sin(p * Math.PI * 2) * 0.22;
            modelHolder.rotation.z = Math.sin(p * Math.PI * 2) * -0.10;
            modelHolder.position.y = Math.sin(p * Math.PI) * 0.18;

            if (p >= 1) {
                animMode = 'idle';
                animTimer = 0;
            }
        } else if (animMode === 'tap_flip_bounce') {
            // Choreographed Tap 2: Zero-G 3D Diagonal Flip & Elastic Bounce
            const dur = 1.25;
            const p = Math.min(1, animTimer / dur);
            const e = easeInOutCubic(p);

            modelHolder.scale.setScalar(1 + Math.sin(p * Math.PI) * 0.14);
            modelHolder.rotation.y = heroYaw - e * Math.PI * 2;
            modelHolder.rotation.x = heroPitch + Math.sin(p * Math.PI) * 0.52;
            modelHolder.rotation.z = Math.sin(p * Math.PI * 2) * 0.24;
            modelHolder.position.y = Math.sin(p * Math.PI) * 0.26;

            if (p >= 1) {
                animMode = 'idle';
                animTimer = 0;
            }
        } else if (animMode === 'tap_inspect_back') {
            // Choreographed Tap 3: Macro 3D Inspection (Turns 180° to showcase 3D Back Details, then returns!)
            const dur = 1.55;
            const p = Math.min(1, animTimer / dur);
            const backWave = Math.sin(p * Math.PI);

            modelHolder.scale.setScalar(1 + backWave * 0.18);
            modelHolder.rotation.y = heroYaw + backWave * Math.PI;
            modelHolder.rotation.x = heroPitch + Math.sin(p * Math.PI * 2) * 0.16;
            modelHolder.rotation.z = 0;
            modelHolder.position.y = backWave * 0.10;

            if (p >= 1) {
                animMode = 'idle';
                animTimer = 0;
            }
        } else if (animMode === 'unboxing') {
            // 3D Box Unboxing Animation: Fast 3D spin + 3D Lid physically hinges/lifts open!
            modelHolder.rotation.y += 0.18;
            modelHolder.rotation.x = 0.24 + Math.sin(clock * 18) * 0.06;
            modelHolder.position.y = Math.sin(clock * 14) * 0.07;
            modelHolder.scale.setScalar(1.06 + Math.sin(clock * 16) * 0.04);

            if (currentBuilt.root.userData.lidGroup) {
                const lid = currentBuilt.root.userData.lidGroup;
                lid.position.y = Math.min(0.85, lid.position.y + 0.015);
                lid.position.z = Math.min(0.65, lid.position.z + 0.012);
                lid.rotation.x = Math.max(-0.85, lid.rotation.x - 0.016);
            }
        } else {
            // Smooth Idle 3D Showcase Breathing (shows 3D depth & studio reflections continuously)
            modelHolder.scale.setScalar(1.0);
            modelHolder.rotation.y = heroYaw + Math.sin(clock * 1.15) * 0.36;
            modelHolder.rotation.x = heroPitch + Math.cos(clock * 0.85) * 0.11;
            modelHolder.rotation.z = Math.sin(clock * 0.9) * 0.04;
            modelHolder.position.y = Math.sin(clock * 1.7) * 0.08;
        }

        // Spin 3D GPU turbine fans or car wheels
        currentBuilt.animatedParts.forEach(part => {
            part.rotation.z -= 0.18;
        });

        // Orbit studio key light subtly for living metallic reflections
        keyLight.position.x = 4.5 + Math.sin(clock * 1.5) * 1.8;
        sparklePoints.rotation.y = clock * 0.25;
        sparklePoints.position.y = Math.sin(clock * 1.4) * 0.06;

        renderer.render(scene, camera);
    }

    renderLoop();

    activeThreeController = {
        startUnboxingAnimation() {
            animMode = 'unboxing';
            animTimer = 0;
        },
        revealUpgradedModel(upgradedNft) {
            modelHolder.remove(currentBuilt.root);
            currentBuilt = buildHighPoly3DGift(THREE, upgradedNft, texLoader);
            modelHolder.add(currentBuilt.root);
            animMode = 'entry';
            animTimer = 0;
        },
        dispose() {
            isDisposed = true;
            if (animFrameId) cancelAnimationFrame(animFrameId);
            try {
                renderer.dispose();
            } catch {}
        }
    };
}

function renderTelegramAttributesTable(nft) {
    const serial = nft.serial_number ? `#${nft.serial_number}` : `#${nft.id}`;
    return `
        <div class="tg-attr-table" id="modal-attr-table">
            <div class="tg-attr-row">
                <span class="tg-attr-key">3D Статус</span>
                <span class="tg-attr-val" style="color:${nft.is_upgraded ? '#4ade80' : '#fbbf24'}">
                    ${nft.is_upgraded ? '✨ Прокачаний 3D Предмет' : '📦 Запакований 3D Бокс'}
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

// ============ MODALS & LIVE 3D BOX-TO-ITEM UPGRADE ANIMATION ============
function showCollectionModal(nft) {
    const modal = document.getElementById('nft-modal');
    const body = document.getElementById('modal-body');

    const upgradeSectionHtml = !nft.is_upgraded ? `
        <div class="upgrade-cta-box" id="upgrade-cta-box">
            <div class="upgrade-cta-title">✨ Розпакувати 3D-Коробку в 3D-Предмет</div>
            <div class="upgrade-cta-desc">
                При прокачці кришка 3D-коробки відкриється — випаде об'ємний 3D-предмет <strong>${nft.revealed_name || '3D Предмет'}</strong> із 3D-анімацією, рідкісним <strong>Фоном</strong> та <strong>Значком ззаду</strong>!
            </div>
            <button class="btn-upgrade-box" id="btn-upgrade-box">
                ✨ Прокачати в 3D-NFT за ${nft.upgrade_cost || 100} NXR
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
    attachStageInteractivity(nft);

    // 3D Box -> Revealed 3D Item Upgrade Handler!
    document.getElementById('btn-upgrade-box')?.addEventListener('click', async () => {
        const upgBtn = document.getElementById('btn-upgrade-box');
        if (!upgBtn) return;
        upgBtn.disabled = true;
        upgBtn.textContent = '🎲 Відкриваємо 3D-коробку, крутимо фон і значок...';

        try {
            const data = await apiRequest('/api/nft/upgrade', {
                method: 'POST',
                body: JSON.stringify({ nft_id: nft.id })
            });

            document.getElementById('balance').textContent = Math.round(data.new_balance);

            const stage = document.getElementById('tg-gift-stage');
            const patternLayer = document.getElementById('tg-pattern-layer');
            const flash = document.getElementById('tg-stage-flash');
            const bottomPill = document.getElementById('tg-stage-bottom-pill');

            if (activeThreeController) {
                activeThreeController.startUnboxingAnimation();
            }

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

            // After 1.85s, burst open into the High-Poly 3D Item!
            setTimeout(() => {
                clearInterval(rollInterval);
                const upgradedNft = data.nft;

                if (flash) flash.classList.add('boom');
                sfx.win();
                spawnConfetti();
                haptic('success');

                if (stage) stage.style.background = upgradedNft.backdrop_gradient;
                if (activeThreeController) {
                    activeThreeController.revealUpgradedModel(upgradedNft);
                }
                if (patternLayer) {
                    patternLayer.innerHTML = buildPatternIconsHtml(upgradedNft.symbol_icon);
                }
                if (bottomPill) {
                    bottomPill.textContent = `🧊 3D Предмет · Натисни для 3D-анімації · ${upgradedNft.symbol_icon} ${upgradedNft.backdrop}`;
                }

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

                showToast(`🎉 Розпаковано в 3D: ${upgradedNft.name}!`, 'success');
                loadCollection();
                loadUser();
            }, 1850);

        } catch (e) {
            showToast(e.message, 'error');
            upgBtn.disabled = false;
            upgBtn.textContent = `✨ Прокачати в 3D-NFT за ${nft.upgrade_cost || 100} NXR`;
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
            disposeActiveThreeStage();
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
            disposeActiveThreeStage();
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
            disposeActiveThreeStage();
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
    attachStageInteractivity(nft);

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
            disposeActiveThreeStage();
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
            disposeActiveThreeStage();
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
            disposeActiveThreeStage();
            modal.classList.add('hidden');
        } catch (e) {
            showToast(e.message, 'error');
        }
    });
}

document.querySelector('.modal-backdrop')?.addEventListener('click', () => {
    disposeActiveThreeStage();
    document.getElementById('nft-modal').classList.add('hidden');
});
document.querySelector('.modal-close')?.addEventListener('click', () => {
    disposeActiveThreeStage();
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
        hydrateBlenderCutouts(grid);

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
