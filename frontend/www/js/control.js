let currentPeriod = 'today';
let currentClientFilter = 'all';
let allClients = [];
let allAtzimes = [];
let allWorkers = {};

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

function initControlPanel() {
    document.getElementById('btn-control-logout').addEventListener('click', () => { logout(); window.location.href = 'index.html'; });
    document.getElementById('btn-preload-data')?.addEventListener('click', preloadAllData);
    
    setInterval(() => {
        if (document.getElementById('screen-control')?.classList.contains('active')) {
            loadControlDashboard();
        }
    }, 30000);
    
    loadControlDashboard();
}

function setControlPeriod(period) {
    currentPeriod = period;
    document.querySelectorAll('.date-selector .btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    if (period !== 'today') {
        document.getElementById('control-custom-date').value = '';
    }
    
    loadControlDashboard();
}

function setClientFilter(filter) {
    currentClientFilter = filter;
    document.querySelectorAll('.quick-filters .btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    renderClientList();
}

function getDateRange(period) {
    const today = new Date();
    const dateStr = (d) => d.toISOString().split('T')[0];
    
    if (period === 'today') {
        return { from: dateStr(today), to: dateStr(today) };
    } else if (period === 'yesterday') {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { from: dateStr(yesterday), to: dateStr(yesterday) };
    } else if (period === 'week') {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return { from: dateStr(weekStart), to: dateStr(today) };
    } else if (period === 'month') {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return { from: dateStr(monthStart), to: dateStr(today) };
    }
    return { from: dateStr(today), to: dateStr(today) };
}

async function loadControlDashboard() {
    try {
        const [clients, users] = await Promise.all([
            apiGet('/klienti'),
            apiGet('/users')
        ]);
        
        allClients = clients;
        allWorkers = {};
        users.forEach(u => { allWorkers[u.id] = u; });
        
        const dateRange = getDateRange(currentPeriod);
        const customDate = document.getElementById('control-custom-date').value;
        if (customDate) {
            dateRange.from = customDate;
            dateRange.to = customDate;
        }
        
        const atzimes = await apiGet(`/atzimes?no=${dateRange.from}&līdz=${dateRange.to}`);
        allAtzimes = atzimes;
        
        await loadControlStats(atzimes);
        renderClientList(atzimes);
        
    } catch (e) {
        console.error('Failed to load dashboard:', e);
    }
}

async function loadControlStats(atzimes) {
    const activeClients = allClients.length;
    const activeCaregivers = Object.values(allWorkers).filter(w => w.loma === 'aprupetajs' && w.is_active).length;
    
    const clientStats = {};
    allClients.forEach(c => {
        clientStats[c.id] = {
            client: c,
            completedFields: new Set(),
            totalFields: 8,
            missing: []
        };
    });
    
    const MANDATORY_FIELDS = [
        'higiena_mutes_dobuma_kopsana', 'higiena_dalej_apmazgasana', 'higiena_velas_maina', 'higiena_matu_kopsana',
        'edinasana_brokasti', 'edinasana_pusdienas', 'edinasana_launags', 'edinasana_vakariņas'
    ];
    
    atzimes.forEach(a => {
        if (!clientStats[a.klienta_id]) return;
        
        const value = a.vertiba;
        if (value && value !== 'N/A' && value !== '') {
            const fieldKey = `${a.kategorija}_${a.lauka_nosaukums}`;
            if (MANDATORY_FIELDS.includes(fieldKey)) {
                clientStats[a.klienta_id].completedFields.add(fieldKey);
            }
        }
    });
    
    let totalCompleted = 0;
    let totalIncomplete = 0;
    let totalNotStarted = 0;
    let totalProblems = 0;
    
    Object.values(clientStats).forEach(stat => {
        const done = stat.completedFields.size;
        const expected = stat.totalFields;
        const missing = expected - done;
        
        if (done === 0) {
            stat.status = 'not-started';
            stat.missing = ['Nav veikta neviens ieraksts'];
            totalProblems++;
            totalNotStarted++;
        } else if (missing > 0) {
            stat.status = 'incomplete';
            stat.missing = getMissingFields(atzimes.filter(a => a.klienta_id === stat.client.id));
            totalProblems++;
            totalIncomplete++;
        } else {
            stat.status = 'completed';
            stat.missing = [];
            totalCompleted++;
        }
    });
    
    document.getElementById('stat-total-clients').textContent = activeClients;
    document.getElementById('stat-completed').textContent = totalCompleted;
    document.getElementById('stat-not-started').textContent = totalNotStarted;
    document.getElementById('stat-incomplete').textContent = totalIncomplete;
    document.getElementById('stat-active-caregivers').textContent = activeCaregivers;
}

function getMissingFields(clientAtzimes) {
    const MANDATORY_FIELDS = [
        { key: 'higiena_mutes_dobuma_kopsana', label: 'Mutes dobuma kopšana' },
        { key: 'higiena_dalej_apmazgasana', label: 'Daļēja apmazgāšana' },
        { key: 'higiena_velas_maina', label: 'Veļas maiņa' },
        { key: 'higiena_matu_kopsana', label: 'Matu kopšana' },
        { key: 'edinasana_brokasti', label: 'Brokastis' },
        { key: 'edinasana_pusdienas', label: 'Pusdienas' },
        { key: 'edinasana_launags', label: 'Launags' },
        { key: 'edinasana_vakariņas', label: 'Vakariņas' }
    ];
    
    const doneFields = new Set();
    clientAtzimes.forEach(a => {
        if (a.vertiba && a.vertiba !== 'N/A' && a.vertiba !== '') {
            doneFields.add(`${a.kategorija}_${a.lauka_nosaukums}`);
        }
    });
    
    return MANDATORY_FIELDS
        .filter(f => !doneFields.has(f.key))
        .map(f => f.label);
}

function renderClientList(atzimes) {
    if (!atzimes) {
        const dateRange = getDateRange(currentPeriod);
        const customDate = document.getElementById('control-custom-date').value;
        if (customDate) {
            dateRange.from = customDate;
            dateRange.to = customDate;
        }
        atzimes = allAtzimes.filter(a => {
            if (!a.datums) return false;
            return a.datums >= dateRange.from && a.datums <= dateRange.to;
        });
    }
    
    const container = document.getElementById('client-list');
    container.innerHTML = '';
    
    const clientStats = {};
    allClients.forEach(c => {
        clientStats[c.id] = {
            client: c,
            completedFields: new Set(),
            totalFields: Object.values(EXPECTED_ACTIONS).flat().length,
            lastAction: null,
            lastActionTime: null,
            lastWorker: null,
            missing: []
        };
    });
    
    atzimes.forEach(a => {
        if (!clientStats[a.klienta_id]) return;
        
        const value = a.vertiba;
        if (value && value !== 'N/A' && value !== '') {
            clientStats[a.klienta_id].completedFields.add(`${a.kategorija}_${a.lauka_nosaukums}`);
        }
        
        if (!clientStats[a.klienta_id].lastActionTime || new Date(a.laika_zimogs) > new Date(clientStats[a.klienta_id].lastActionTime)) {
            clientStats[a.klienta_id].lastAction = a;
            clientStats[a.klienta_id].lastActionTime = a.laika_zimogs;
            clientStats[a.klienta_id].lastWorker = allWorkers[a.darbinieka_id];
        }
    });
    
    Object.values(clientStats).forEach(stat => {
        const done = stat.completedFields.size;
        const expected = stat.totalFields;
        
        if (done === 0) {
            stat.status = 'not-started';
            stat.missing = ['Nav veikta neviens ieraksts'];
        } else {
            stat.missing = getMissingFields(atzimes.filter(a => a.klienta_id === stat.client.id));
            if (stat.missing.length > 0) {
                stat.status = 'incomplete';
            } else {
                stat.status = 'completed';
            }
        }
        
        stat.completion = Math.min(100, Math.round((done / expected) * 100));
    });
    
    let filtered = Object.values(clientStats);
    if (currentClientFilter === 'problems') {
        filtered = filtered.filter(s => s.status !== 'completed');
    } else if (currentClientFilter === 'not-started') {
        filtered = filtered.filter(s => s.status === 'not-started');
    } else if (currentClientFilter === 'incomplete') {
        filtered = filtered.filter(s => s.status === 'incomplete');
    } else if (currentClientFilter === 'completed') {
        filtered = filtered.filter(s => s.status === 'completed');
    }
    
    filtered.forEach(stat => {
        const card = document.createElement('div');
        card.className = `client-card status-${stat.status}`;
        card.onclick = () => showClientDetail(stat.client.id, atzimes);
        
        const expected = Object.values(EXPECTED_ACTIONS).flat().length;
        const completion = stat.completion;
        
        const lastActionText = stat.lastAction 
            ? `${FIELD_LABELS[stat.lastAction.lauka_nosaukums] || stat.lastAction.lauka_nosaukums} — ${stat.lastAction.vertiba}`
            : 'Nav darbību';
        
        const lastTimeText = stat.lastActionTime
            ? new Date(stat.lastActionTime).toLocaleTimeString('lv-LV', {hour: '2-digit', minute:'2-digit'})
            : '—';
        
        const lastWorkerText = stat.lastWorker 
            ? `${stat.lastWorker.vards} ${stat.lastWorker.uzvards}`
            : '—';
        
        const missingText = stat.missing.length > 0 
            ? stat.missing.slice(0, 3).join(', ') + (stat.missing.length > 3 ? '...' : '')
            : '—';
        
        const statusLabels = {
            'completed': '✓ Pabeigta',
            'incomplete': '◐ Nepilnīga',
            'not-started': '○ Nav sākta'
        };
        
        card.innerHTML = `
            <div class="client-card-header">
                <div class="client-name">${stat.client.vards} ${stat.client.uzvards}</div>
                <div class="client-status status-${stat.status}">${statusLabels[stat.status] || stat.status}</div>
            </div>
            <div class="client-card-body">
                <div class="client-detail-item">
                    <span class="detail-label">Aprūpētājs:</span>
                    <span class="detail-value">${lastWorkerText}</span>
                </div>
                <div class="client-detail-item">
                    <span class="detail-label">Kas nav izdarīts:</span>
                    <span class="detail-value">${missingText}</span>
                </div>
                <div class="client-detail-item">
                    <span class="detail-label">Laiks:</span>
                    <span class="detail-value">${lastTimeText}</span>
                </div>
            </div>
        `;
        
        container.appendChild(card);
    });
}

function showClientDetail(clientId, atzimes) {
    const client = allClients.find(c => c.id === clientId);
    if (!client) return;
    
    const clientAtzimes = atzimes.filter(a => a.klienta_id === clientId);
    
    document.getElementById('detail-client-name').textContent = `${client.vards} ${client.uzvards}`;
    document.getElementById('client-detail').classList.remove('hidden');
    document.getElementById('client-detail-empty').classList.add('hidden');
    
    const categories = {};
    Object.keys(CATEGORY_LABELS).forEach(cat => {
        categories[cat] = {
            label: CATEGORY_LABELS[cat],
            fields: {},
            status: 'not-started'
        };
    });
    
    clientAtzimes.forEach(a => {
        if (!categories[a.kategorija]) return;
        categories[a.kategorija].fields[a.lauka_nosaukums] = a;
    });
    
    Object.values(categories).forEach(cat => {
        const fields = EXPECTED_ACTIONS[Object.keys(CATEGORY_LABELS).find(key => CATEGORY_LABELS[key] === cat.label)] || [];
        const done = fields.filter(f => cat.fields[f] && cat.fields[f].vertiba && cat.fields[f].vertiba !== 'N/A').length;
        
        if (done === 0 && fields.length > 0) {
            cat.status = 'not-started';
        } else if (done < fields.length) {
            cat.status = 'incomplete';
        } else {
            cat.status = 'completed';
        }
    });
    
    const MANDATORY_FIELDS = [
        'mutes_dobuma_kopsana', 'dalej_apmazgasana', 'velas_maina', 'matu_kopsana',
        'brokasti', 'pusdienas', 'launags', 'vakariņas'
    ];
    
    const content = document.getElementById('detail-content');
    content.innerHTML = '';
    
    const mandatoryDone = MANDATORY_FIELDS.filter(field => {
        for (const cat of Object.values(categories)) {
            if (cat.fields[field] && cat.fields[field].vertiba && cat.fields[field].vertiba !== 'N/A') {
                return true;
            }
        }
        return false;
    }).length;
    
    const summaryCard = document.createElement('div');
    summaryCard.className = 'detail-card status-summary';
    summaryCard.innerHTML = `
        <div class="detail-card-header">
            <span class="detail-category">Obligātie ieraksti</span>
            <span class="detail-status status-${mandatoryDone === 8 ? 'completed' : mandatoryDone > 0 ? 'incomplete' : 'not-started'}">${mandatoryDone}/8</span>
        </div>
        <div class="detail-card-body">
            <div class="detail-progress">${mandatoryDone}/8</div>
            <div class="detail-missing">
                ${MANDATORY_FIELDS.filter(field => {
                    for (const cat of Object.values(categories)) {
                        if (!cat.fields[field] || !cat.fields[field].vertiba || cat.fields[field].vertiba === 'N/A') {
                            return true;
                        }
                    }
                    return false;
                }).map(field => FIELD_LABELS[field] || field).join(', ')}
            </div>
        </div>
    `;
    content.appendChild(summaryCard);
    
    Object.entries(categories).forEach(([key, cat]) => {
        if (!EXPECTED_ACTIONS[key]) return;
        if (key === 'paraksts') return;
        
        const card = document.createElement('div');
        card.className = `detail-card status-${cat.status}`;
        
        const fields = EXPECTED_ACTIONS[key];
        const done = fields.filter(f => cat.fields[f] && cat.fields[f].vertiba && cat.fields[f].vertiba !== 'N/A').length;
        
        card.innerHTML = `
            <div class="detail-card-header">
                <span class="detail-category">${cat.label}</span>
                <span class="detail-status status-${cat.status}">${cat.status === 'completed' ? '✓ Pabeigts' : cat.status === 'incomplete' ? '◐ Nepilnīgs' : '○ Nav sākts'}</span>
            </div>
            <div class="detail-card-body">
                <div class="detail-progress">${done}/${fields.length}</div>
                ${cat.status === 'incomplete' ? `
                <div class="detail-missing">
                    ${fields.filter(f => !cat.fields[f] || !cat.fields[f].vertiba || cat.fields[f].vertiba === 'N/A').map(f => FIELD_LABELS[f] || f).join(', ')}
                </div>
                ` : ''}
            </div>
        `;
        
        content.appendChild(card);
    });
}

document.addEventListener('DOMContentLoaded', initControlPanel);
