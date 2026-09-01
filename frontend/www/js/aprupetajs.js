let allClients = [];
let clientStatusCache = {};
let currentClientPage = 0;
let completedActions = new Set();
const CLIENTS_PER_PAGE = 20;

const CATEGORY_LABELS = {
    'temp': 'Temperatūra',
    'higiena': 'Higiēna',
    'aktivitate': 'Aktivitāte',
    'edinasana': 'Ēdināšana',
    'sikdrumi': 'Šķidrumi',
    'fiziologija': 'Fizioloģija',
    'citi_pasakumi': 'Citi pasākumi',
    'paraksts': 'Paraksts'
};

const FIELD_LABELS = {
    'temperatura': 'Temperatūra',
    'mutes_dobuma_kopsana': 'Mutes dobuma kopšana',
    'vanna_dusha': 'Vanna, duša',
    'dalej_apmazgasana': 'Daļēja apmazgāšana',
    'velas_maina': 'Veļas maiņa',
    'nagu_kopsana': 'Nagu kopšana',
    'matu_kopsana': 'Matu kopšana',
    'bardas_skusana': 'Bārdas skūšana',
    'parvietosanas': 'Pārvietošanās ar palīglīdzekli',
    'stav_ar_palidzibu': 'Stāv ar palīdzību',
    'sez_ar_palidzibu': 'Sēž ar palīdzību',
    'brokasti': 'Brokastis',
    'pusdienas': 'Pusdienas',
    'launags': 'Launags',
    'vakariņas': 'Vakariņas',
    'urins_ml': 'Urīns (ml)',
    'uznemts_ml': 'Dzerts šķidrums (ml)',
    'vedera_izeja': 'Zarnu darbība',
    'pastaiga': 'Pastaiga',
    'ciemini': 'Ciemiņi',
    'autins_biksitu_skaits': 'Autiņbiksīšu skaits',
    'aprupetaja_paraksts': 'Paraksts'
};

const EXPECTED_ACTIONS = {
    'temp': ['temperatura'],
    'higiena': ['mutes_dobuma_kopsana', 'vanna_dusha', 'dalej_apmazgasana', 'velas_maina', 'nagu_kopsana', 'matu_kopsana', 'bardas_skusana'],
    'aktivitate': ['parvietosanas', 'stav_ar_palidzibu', 'sez_ar_palidzibu'],
    'edinasana': ['brokasti', 'pusdienas', 'launags', 'vakariņas'],
    'sikdrumi': ['urins_ml', 'uznemts_ml'],
    'fiziologija': ['vedera_izeja'],
    'citi_pasakumi': ['pastaiga', 'ciemini', 'autins_biksitu_skaits'],
    'paraksts': ['aprupetaja_paraksts']
};

function initAprupetajsPanel() {
    document.getElementById('btn-logout').addEventListener('click', () => { logout(); window.location.href = 'index.html'; });
    document.getElementById('btn-preload-data')?.addEventListener('click', preloadAllData);
    const clientSearch = document.getElementById('client-search');
    if (clientSearch) clientSearch.addEventListener('input', debounce(applyFilters, 200));
    const statusFilter = document.getElementById('client-status-filter');
    if (statusFilter) statusFilter.addEventListener('change', applyFilters);
    const sortSelect = document.getElementById('client-sort');
    if (sortSelect) sortSelect.addEventListener('change', applyFilters);
    
    // Time-based smart menu
    updateTimeBasedMenu();
    setInterval(updateTimeBasedMenu, 60000);
    
    window.addEventListener('sync-complete', async () => {
        clientStatusCache = {};
        await loadClientsForCaregiver();
    });
    window.addEventListener('refresh-dashboard', async () => {
        clientStatusCache = {};
        await loadClientsForCaregiver();
    });
    loadClientsForCaregiver();
}

function updateTimeBasedMenu() {
    const hour = new Date().getHours();
    let currentMeal = null;
    let mealLabel = '';
    
    if (hour >= 9 && hour < 11) {
        currentMeal = 'brokasti';
        mealLabel = 'Brokastis (9:00-11:00)';
    } else if (hour >= 11 && hour < 16) {
        currentMeal = 'pusdienas';
        mealLabel = 'Pusdienas (11:00-16:00)';
    } else if (hour >= 16 && hour < 18) {
        currentMeal = 'vakariņas';
        mealLabel = 'Vakariņas (16:00-18:00)';
    } else if (hour >= 18 && hour < 24) {
        currentMeal = 'launags';
        mealLabel = 'Launags (18:00-24:00)';
    }
    
    const mealHint = document.getElementById('current-meal-hint');
    if (mealHint && currentMeal) {
        mealHint.textContent = mealLabel;
        mealHint.classList.remove('hidden');
    } else if (mealHint) {
        mealHint.classList.add('hidden');
    }
}

function getCurrentMealBlock() {
    const hour = new Date().getHours();
    if (hour >= 9 && hour < 11) return 'brokasti';
    if (hour >= 11 && hour < 16) return 'pusdienas';
    if (hour >= 16 && hour < 18) return 'vakariņas';
    if (hour >= 18 && hour < 24) return 'launags';
    return 'brokasti';
}

function debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

async function loadClientsForCaregiver() {
    const grid = document.getElementById('client-grid');
    showLoadingState(grid, 'Ielādē klientus...');

    try {
        const klienti = await apiGet('/klienti');
        allClients = klienti;
        localStorage.setItem('cache_clients', JSON.stringify(klienti));
        renderClientGrid(allClients, {}, true);
        loadClientStatusesInBackground();
        await loadTodayStats();
        updateSyncStatus('synced');
    } catch (e) {
        const cached = await getCachedClients();
        if (cached && cached.length > 0) {
            allClients = cached;
            renderClientGrid(allClients, {}, true);
            await loadTodayStats();
            showToast('Dati no keša — sinhronizējiet, lai atjauninātu', 'warning');
            updateSyncStatus('pending');
        } else {
            showErrorState(grid, 'Neizdevās ielādēt klientus', loadClientsForCaregiver);
            updateSyncStatus('offline');
        }
    }
}

async function loadClientStatusesInBackground() {
    const today = new Date().toISOString().split('T')[0];
    const uncachedClients = allClients.filter(c => !clientStatusCache[c.id] || clientStatusCache[c.id].date !== today);
    
    if (uncachedClients.length === 0) {
        applyFilters();
        return;
    }

    const statuses = await Promise.all(uncachedClients.map(c => getClientStatus(c)));
    const clientMap = {};
    uncachedClients.forEach((c, i) => {
        clientMap[c.id] = { client: c, status: statuses[i] };
    });

    const grid = document.getElementById('client-grid');
    grid.querySelectorAll('.client-card').forEach(card => {
        const clientId = parseInt(card.dataset.clientId);
        if (clientMap[clientId]) {
            const status = clientMap[clientId].status;
            const statusEl = card.querySelector('.client-status');
            if (statusEl) {
                statusEl.className = `client-status status-${status.status}`;
                statusEl.innerHTML = `<span class="status-icon">${status.icon}</span><span class="status-text">${status.label}</span>`;
            }
            const btn = card.querySelector('.btn-primary');
            if (btn) {
                btn.textContent = status.status === 'pabeigta' ? 'ATVĒRT' : 'SĀKT APRŪPI';
            }
        }
    });
}

async function loadTodayStats() {
    const today = new Date().toISOString().split('T')[0];
    try {
        const allAtzimes = await apiGet(`/atzimes?no=${today}&līdz=${today}`);
        
        const activeClients = allClients;
        const totalClients = activeClients.length;
        
        const MANDATORY_FIELDS = [
            'higiena_mutes_dobuma_kopsana', 'higiena_dalej_apmazgasana', 'higiena_velas_maina', 'higiena_matu_kopsana',
            'edinasana_brokasti', 'edinasana_pusdienas', 'edinasana_launags', 'edinasana_vakariņas'
        ];
        
        const clientStats = {};
        activeClients.forEach(c => {
            clientStats[c.id] = {
                completed: 0,
                total: MANDATORY_FIELDS.length
            };
        });
        
        allAtzimes.forEach(a => {
            if (clientStats[a.klienta_id] && a.vertiba && a.vertiba !== 'N/A' && a.vertiba !== '') {
                const fieldKey = `${a.kategorija}_${a.lauka_nosaukums}`;
                if (MANDATORY_FIELDS.includes(fieldKey)) {
                    clientStats[a.klienta_id].completed++;
                }
            }
        });
        
        let completedClients = 0;
        let incompleteClients = 0;
        let notStartedClients = 0;
        
        Object.values(clientStats).forEach(stat => {
            if (stat.completed === 0) {
                notStartedClients++;
            } else if (stat.completed >= stat.total) {
                completedClients++;
            } else {
                incompleteClients++;
            }
        });
        
        const percentage = totalClients > 0 ? Math.round((completedClients / totalClients) * 100) : 0;

        document.getElementById('today-summary').innerHTML = `
            <div class="today-summary-card">
                <div class="summary-item"><div class="summary-value">${totalClients}</div><div class="summary-label">Kopā</div></div>
                <div class="summary-item"><div class="summary-value summary-success">${completedClients}</div><div class="summary-label">Pabeigti</div></div>
                <div class="summary-item"><div class="summary-value summary-danger">${incompleteClients}</div><div class="summary-label">Nepilnīgi</div></div>
                <div class="summary-item"><div class="summary-value summary-primary">${percentage}%</div><div class="summary-label">Pabeigtība</div></div>
            </div>
        `;
    } catch (e) {
        console.error('Failed to load today stats:', e);
    }
}

async function getClientStatus(client) {
    const today = new Date().toISOString().split('T')[0];
    if (clientStatusCache[client.id] && clientStatusCache[client.id].date === today) {
        return clientStatusCache[client.id];
    }
    try {
        const atzimes = await apiGet(`/atzimes?klients_id=${client.id}&no=${today}&līdz=${today}`);
        
        const MANDATORY_FIELDS = [
            'higiena_mutes_dobuma_kopsana', 'higiena_dalej_apmazgasana', 'higiena_velas_maina', 'higiena_matu_kopsana',
            'edinasana_brokasti', 'edinasana_pusdienas', 'edinasana_launags', 'edinasana_vakariņas'
        ];
        
        const doneFields = new Set();
        atzimes.forEach(a => {
            if (a.vertiba && a.vertiba !== 'N/A' && a.vertiba !== '') {
                const fieldKey = `${a.kategorija}_${a.lauka_nosaukums}`;
                if (MANDATORY_FIELDS.includes(fieldKey)) {
                    doneFields.add(fieldKey);
                }
            }
        });
        
        const completedCount = doneFields.size;
        const missingFields = MANDATORY_FIELDS.filter(f => !doneFields.has(f));
        
        let status, label, icon;
        if (completedCount === 0) {
            status = 'nav-veikta'; label = '🔴 Nav veikta'; icon = '✖️';
        } else if (missingFields.length === 0) {
            status = 'pabeigta'; label = '🟢 Pabeigta'; icon = '✔️';
        } else {
            const missingLabels = missingFields.slice(0, 3).map(f => {
                const parts = f.split('_');
                return FIELD_LABELS[parts[1]] || parts[1];
            }).join(', ');
            status = 'nepilnīgs'; label = `⚠️ Nepilnīgs (trūkst: ${missingLabels}${missingFields.length > 3 ? '...' : ''})`; icon = '⚠️';
        }
        
        const result = { status, label, icon };
        clientStatusCache[client.id] = { ...result, date: today };
        return result;
    } catch (e) {
        return { status: 'nav-veikta', label: '🔴 Nav veikta', icon: '✖️' };
    }
}

function getCategoryForField(field) {
    for (const [cat, fields] of Object.entries(EXPECTED_ACTIONS)) {
        if (fields.includes(field)) return cat;
    }
    return '';
}

async function applyFilters() {
    const query = document.getElementById('client-search').value.toLowerCase().trim();
    const statusFilter = document.getElementById('client-status-filter').value;
    const sortBy = document.getElementById('client-sort').value;

    let filtered = allClients;
    if (query) {
        filtered = filtered.filter(c => `${c.vards} ${c.uzvards}`.toLowerCase().includes(query));
    }

    const today = new Date().toISOString().split('T')[0];
    const statuses = filtered.map(c => {
        const cached = clientStatusCache[c.id];
        if (cached && cached.date === today) {
            return cached;
        }
        return { status: 'nav-veikta', label: '🔴 Nav veikta', icon: '✖️' };
    });
    
    const clientMap = {};
    filtered.forEach((c, i) => clientMap[c.id] = { client: c, status: statuses[i] });

    if (statusFilter) {
        filtered = filtered.filter(c => clientMap[c.id]?.status.status === statusFilter);
    }

    if (sortBy === 'vards') {
        filtered.sort((a, b) => `${a.vards} ${a.uzvards}`.localeCompare(`${b.vards} ${b.uzvards}`));
    } else if (sortBy === 'vecums') {
        filtered.sort((a, b) => {
            const ageA = new Date().getFullYear() - new Date(a.dzimšanas_datums).getFullYear();
            const ageB = new Date().getFullYear() - new Date(b.dzimšanas_datums).getFullYear();
            return ageB - ageA;
        });
    } else if (sortBy === 'dieta') {
        filtered.sort((a, b) => (a.dieta || '').localeCompare(b.dieta || ''));
    } else if (sortBy === 'status') {
        filtered.sort((a, b) => clientMap[b.id]?.status.status?.localeCompare(clientMap[a.id]?.status.status || ''));
    }

    renderClientGrid(filtered, clientMap, true);
    loadClientStatusesInBackground();
}

function renderClientGrid(klienti, clientMap, resetPage = false) {
    const grid = document.getElementById('client-grid');
    if (resetPage) {
        grid.innerHTML = '';
        currentClientPage = 0;
    }

    if (klienti.length === 0) {
        showEmptyState(grid, 'Nav aktīvu klientu');
        return;
    }

    const start = 0;
    const end = (currentClientPage + 1) * CLIENTS_PER_PAGE;
    const visible = klienti.slice(start, end);

    visible.forEach(k => {
        const status = clientMap[k.id]?.status || { status: 'nav-veikta', label: '🔴 Nav veikta', icon: '✖️' };
        const card = document.createElement('div');
        card.className = 'client-card';
        card.dataset.clientId = k.id;

        const age = new Date().getFullYear() - new Date(k.dzimšanas_datums).getFullYear();

        card.innerHTML = `
            <div class="client-info">
                <div class="client-name">${k.vards} ${k.uzvards}</div>
                <div class="client-meta">${age} gadi${k.dieta ? ' · ' + k.dieta : ''}</div>
                <div class="client-status status-${status.status}">
                    <span class="status-icon">${status.icon}</span>
                    <span class="status-text">${status.label}</span>
                </div>
            </div>
            <div class="client-actions">
                <button class="btn btn-secondary btn-small" onclick="showTodaySummary(${k.id})">Šodien</button>
                <button class="btn btn-primary btn-small" onclick="openClientDetail(allClients.find(c => c.id === ${k.id}))">
                    ${status.status === 'pabeigta' ? 'ATVĒRT' : 'SĀKT APRŪPI'}
                </button>
            </div>
        `;

        card.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON') {
                openClientDetail(k);
            }
        });

        grid.appendChild(card);
    });

    if (end < klienti.length) {
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.className = 'btn btn-secondary';
        loadMoreBtn.textContent = `Rādīt vairāk (${klienti.length - end} atlikušie)`;
        loadMoreBtn.style.cssText = 'width:100%;margin-top:12px;padding:12px;';
        loadMoreBtn.onclick = () => {
            currentClientPage++;
            renderClientGrid(klienti, clientMap, false);
        };
        grid.appendChild(loadMoreBtn);
    }
}

async function deleteRecord(recordId) {
    if (!confirm('Dzēst šo ierakstu?')) return;
    try {
        await apiDelete(`/atzimes/${recordId}`);
        showToast('Ieraksts dzēsts', 'success');
        const modal = document.getElementById('modal-summary');
        if (modal) hideModal('modal-summary');
        loadClientsForCaregiver();
    } catch (e) {
        showToast('Neizdevās dzēst ierakstu', 'error');
    }
}

async function showTodaySummary(clientId) {
    const today = new Date().toISOString().split('T')[0];
    const atzimes = await apiGet(`/atzimes?klients_id=${clientId}&no=${today}&līdz=${today}`);
    const client = allClients.find(c => c.id === clientId);
    
    const totalFluids = atzimes
        .filter(a => a.kategorija === 'sikdrumi' && a.lauka_nosaukums === 'uznemts_ml')
        .reduce((sum, a) => sum + (parseFloat(a.vertiba) || 0), 0);
    
    let html = `<h3>${client.vards} ${client.uzvards} — šodien</h3>`;
    html += `<p><strong>Kopā šķidrums: ${Math.round(totalFluids)} ml</strong></p>`;
    
    const fluidRecords = atzimes
        .filter(a => a.kategorija === 'sikdrumi' && a.lauka_nosaukums === 'uznemts_ml')
        .sort((a, b) => new Date(a.laika_zimogs) - new Date(b.laika_zimogs));
    
    if (fluidRecords.length > 0) {
        html += '<div class="fluid-chart"><canvas id="fluid-canvas" width="400" height="150"></canvas></div>';
    }
    
    if (atzimes.length === 0) {
        html += '<p>Nav šodienas ierakstu.</p>';
    } else {
        html += '<div class="summary-list">';
        atzimes.sort((a, b) => new Date(b.laika_zimogs) - new Date(a.laika_zimogs)).forEach(a => {
            const laiks = new Date(a.laika_zimogs).toLocaleTimeString('lv-LV', {hour: '2-digit', minute:'2-digit'});
            const category = CATEGORY_LABELS[a.kategorija] || a.kategorija;
            const field = FIELD_LABELS[a.lauka_nosaukums] || a.lauka_nosaukums;
            const value = a.vertiba === 'N/A' ? 'Nav datu' : (a.vertiba || '—');
            const edited = a.ir_labots ? ' <span class="edited-badge">LABOTS</span>' : '';
            html += `<div class="summary-item">
                <span class="summary-time">${laiks}</span>
                <span class="summary-category">${category}</span>
                <span class="summary-field">${field}</span>
                <span class="summary-value">${value}${edited}</span>
                <button class="btn btn-secondary btn-small" onclick="deleteRecord(${a.id})" title="Dzēst ierakstu">✕</button>
            </div>`;
        });
        html += '</div>';
    }
    
    showModal('modal-summary', html);
    
    if (fluidRecords.length > 0) {
        setTimeout(() => drawFluidChart(fluidRecords), 100);
    }
}

function drawFluidChart(records) {
    const canvas = document.getElementById('fluid-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;
    
    const values = records.map(r => parseFloat(r.vertiba) || 0);
    const max = Math.max(...values, 100);
    const barWidth = (width - padding * 2) / values.length - 10;
    
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, width, height);
    
    values.forEach((val, i) => {
        const x = padding + i * (barWidth + 10);
        const barHeight = ((height - padding * 2) * val) / max;
        const y = height - padding - barHeight;
        
        ctx.fillStyle = '#2196F3';
        ctx.fillRect(x, y, barWidth, barHeight);
        
        ctx.fillStyle = '#333';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(val)} ml`, x + barWidth / 2, y - 5);
        ctx.fillText(new Date(records[i].laika_zimogs).toLocaleTimeString('lv-LV', {hour: '2-digit', minute:'2-digit'}), x + barWidth / 2, height - padding + 15);
    });
    
    ctx.strokeStyle = '#ccc';
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
}

document.addEventListener('DOMContentLoaded', initAprupetajsPanel);
