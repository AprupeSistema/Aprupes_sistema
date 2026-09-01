const CACHE_TTL = 2 * 60 * 60 * 1000;
const DB_NAME = 'BASCache';
const DB_VERSION = 1;
const STORES = {
    METADATA: 'metadata',
    PENDING: 'pending',
    CLIENTS: 'clients',
    ATZIMES: 'atzimes'
};

let cacheData = {
    clients: null,
    darbinieki: null,
    pending: [],
    cacheStartTime: 0,
    loaded: false
};

function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => resolve(req.result);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORES.METADATA)) {
                db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
            }
            if (!db.objectStoreNames.contains(STORES.PENDING)) {
                db.createObjectStore(STORES.PENDING, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORES.CLIENTS)) {
                db.createObjectStore(STORES.CLIENTS, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORES.ATZIMES)) {
                db.createObjectStore(STORES.ATZIMES, { keyPath: 'clientId' });
            }
        };
    });
}

async function loadCache() {
    try {
        const db = await openDB();
        const tx = db.transaction([STORES.METADATA, STORES.PENDING, STORES.CLIENTS, STORES.ATZIMES], 'readonly');
        
        const metaStore = tx.objectStore(STORES.METADATA);
        const pendingStore = tx.objectStore(STORES.PENDING);
        const clientsStore = tx.objectStore(STORES.CLIENTS);
        
        cacheData.pending = await new Promise((resolve) => {
            const req = pendingStore.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
        });
        
        cacheData.cacheStartTime = await new Promise((resolve) => {
            const req = metaStore.get('cache_start_time');
            req.onsuccess = () => resolve(req.result ? req.result.value : 0);
            req.onerror = () => resolve(0);
        });
        
        cacheData.clients = await new Promise((resolve) => {
            const req = clientsStore.getAll();
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });
        
        cacheData.loaded = true;
        db.close();
        checkCacheExpiry();
    } catch (e) {
        console.error('Failed to load cache from IndexedDB:', e);
        cacheData.loaded = true;
    }
}

function checkCacheExpiry() {
    const now = Date.now();
    const cacheAge = now - cacheData.cacheStartTime;
    
    if (cacheData.cacheStartTime > 0 && cacheAge >= CACHE_TTL) {
        clearExpiredCache();
        cacheData.clients = null;
        cacheData.darbinieki = null;
        cacheData.pending = [];
        updateSyncStatus('expired');
        showToast('Keša dati ir novecojuši. Pārlādējiet datus no servera.', 'warning');
        return true;
    }
    return false;
}

async function clearExpiredCache() {
    try {
        const db = await openDB();
        const tx = db.transaction([STORES.METADATA, STORES.CLIENTS, STORES.ATZIMES], 'readwrite');
        await new Promise((resolve) => {
            tx.objectStore(STORES.METADATA).delete('cache_start_time').onsuccess = () => resolve();
        });
        await new Promise((resolve) => {
            tx.objectStore(STORES.CLIENTS).clear().onsuccess = () => resolve();
        });
        await new Promise((resolve) => {
            tx.objectStore(STORES.ATZIMES).clear().onsuccess = () => resolve();
        });
        tx.oncomplete = () => db.close();
        cacheData.cacheStartTime = 0;
    } catch (e) {
        console.error('Failed to clear expired cache:', e);
    }
}

function markCacheStart() {
    cacheData.cacheStartTime = Date.now();
    openDB().then(db => {
        const tx = db.transaction(STORES.METADATA, 'readwrite');
        tx.objectStore(STORES.METADATA).put({ key: 'cache_start_time', value: cacheData.cacheStartTime });
        tx.oncomplete = () => db.close();
    }).catch(e => console.error('Failed to save cache start:', e));
    updateCacheCountdown();
    setInterval(updateCacheCountdown, 60000);
}

function updateCacheCountdown() {
    const countdownEl = document.getElementById('cache-countdown');
    if (!countdownEl) return;
    
    const now = Date.now();
    const elapsed = now - cacheData.cacheStartTime;
    const remaining = CACHE_TTL - elapsed;
    
    if (remaining <= 0) {
        countdownEl.textContent = 'Keša dati novecojuši';
        countdownEl.className = 'cache-countdown expired';
    } else {
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        countdownEl.textContent = `Offline: ${hours}h ${minutes}m atlikums`;
        countdownEl.className = 'cache-countdown active';
    }
}

async function savePending() {
    try {
        const db = await openDB();
        const tx = db.transaction(STORES.PENDING, 'readwrite');
        const store = tx.objectStore(STORES.PENDING);
        await new Promise((resolve) => {
            store.clear().onsuccess = () => resolve();
        });
        for (const item of cacheData.pending) {
            await new Promise((resolve) => {
                store.put(item).onsuccess = () => resolve();
            });
        }
        tx.oncomplete = () => db.close();
    } catch (e) {
        console.error('Failed to save pending to IndexedDB:', e);
    }
}

async function fetchAllServerData() {
    const [clients, darbinieki] = await Promise.all([
        apiGet('/klienti').catch(() => []),
        apiGet('/users').catch(() => [])
    ]);
    
    cacheData.clients = clients;
    cacheData.darbinieki = darbinieki;
    
    try {
        const db = await openDB();
        const tx = db.transaction(STORES.CLIENTS, 'readwrite');
        const store = tx.objectStore(STORES.CLIENTS);
        await new Promise((resolve) => {
            store.clear().onsuccess = () => resolve();
        });
        for (const c of clients) {
            await new Promise((resolve) => {
                store.put(c).onsuccess = () => resolve();
            });
        }
        tx.oncomplete = () => db.close();
    } catch (e) {
        console.error('Failed to cache clients in IndexedDB:', e);
    }
    
    return { clients, darbinieki };
}

async function preloadAllData() {
    if (!cacheData.clients || cacheData.clients.length === 0) {
        await fetchAllServerData();
    }
    
    const btn = document.getElementById('btn-preload-data');
    if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ Ielādē...';
    }
    
    let loaded = 0;
    let total = cacheData.clients.length;
    
    for (const client of cacheData.clients) {
        try {
            const atzimes = await apiGet(`/atzimes?klients_id=${client.id}`);
            await cacheClientAtzimes(client.id, atzimes);
            loaded++;
            if (btn) {
                btn.textContent = `⏳ ${loaded}/${total}`;
            }
        } catch (e) {
            console.warn('Failed to preload data for client', client.id, e);
        }
    }
    
    markCacheStart();
    
    if (btn) {
        btn.disabled = false;
        btn.textContent = '✓ Kešots';
    }
    
    showToast(`Dati ielādēti: ${cacheData.clients.length} klienti, ${loaded} ieraksti kešoti`, 'success');
    updateSyncStatus('synced');
}

async function cacheClientAtzimes(klienta_id, atzimes) {
    try {
        const db = await openDB();
        const tx = db.transaction(STORES.ATZIMES, 'readwrite');
        const store = tx.objectStore(STORES.ATZIMES);
        await new Promise((resolve) => {
            store.put({
                clientId: klienta_id,
                atzimes: atzimes,
                cached_at: Date.now(),
                client_id: klienta_id
            }).onsuccess = () => resolve();
        });
        tx.oncomplete = () => db.close();
        cacheData.cacheStartTime = cacheData.cacheStartTime || Date.now();
        openDB().then(db => {
            const tx = db.transaction(STORES.METADATA, 'readwrite');
            tx.objectStore(STORES.METADATA).put({ key: 'cache_start_time', value: cacheData.cacheStartTime });
            tx.oncomplete = () => db.close();
        });
    } catch (e) {
        console.error('Failed to cache atzimes in IndexedDB:', e);
    }
}

async function getCachedAtzimes(klienta_id) {
    if (checkCacheExpiry()) return [];
    
    try {
        const db = await openDB();
        const tx = db.transaction(STORES.ATZIMES, 'readonly');
        const store = tx.objectStore(STORES.ATZIMES);
        const data = await new Promise((resolve) => {
            const req = store.get(klienta_id);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        });
        db.close();
        return data ? (data.atzimes || []) : [];
    } catch (e) {
        console.error('Failed to read cached atzimes from IndexedDB:', e);
        return [];
    }
}

async function getCachedClients() {
    if (checkCacheExpiry()) return null;
    if (!cacheData.loaded) {
        await loadCache();
    }
    return cacheData.clients;
}

async function addPendingMark(mark) {
    const pendingMark = {
        id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        data: mark,
        attempts: 0,
        created_at: Date.now()
    };
    cacheData.pending.push(pendingMark);
    await savePending();
    updateSyncStatus('pending');
}

async function syncPending() {
    if (!navigator.onLine || !authToken || cacheData.pending.length === 0) {
        return { synced: 0, failed: 0, skipped: true };
    }
    
    const serverOk = await checkServerHealth();
    if (!serverOk) {
        return { synced: 0, failed: 0, skipped: true };
    }
    
    updateSyncStatus('syncing');
    
    let synced = 0;
    let failed = 0;
    const failedItems = [];
    
    const pendingMarks = cacheData.pending.map(item => item.data);
    
    try {
        const res = await fetch(`${API_BASE}/localdb/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
            body: JSON.stringify({ pendingMarks: pendingMarks })
        });
        
        if (res.ok) {
            const data = await res.json();
            synced = data.synced || pendingMarks.length;
        } else {
            for (const item of cacheData.pending) {
                item.attempts++;
                if (item.attempts < 5) {
                    failedItems.push(item);
                }
                failed++;
            }
        }
    } catch (e) {
        for (const item of cacheData.pending) {
            item.attempts++;
            if (item.attempts < 5) {
                failedItems.push(item);
            }
            failed++;
        }
    }
    
    cacheData.pending = failedItems;
    await savePending();
    
    openDB().then(db => {
        const tx = db.transaction(STORES.METADATA, 'readwrite');
        tx.objectStore(STORES.METADATA).put({ key: 'last_sync', value: Date.now().toString() });
        tx.oncomplete = () => db.close();
    });
    markCacheStart();
    
    if (synced > 0) {
        updateSyncStatus('synced');
    } else if (failed > 0) {
        updateSyncStatus('error');
    }
    
    if (synced > 0 || failed > 0) {
        window.dispatchEvent(new CustomEvent('cache-sync-complete', { detail: { synced, failed } }));
    }
    
    return { synced, failed, skipped: false };
}

function getPendingCount() {
    return cacheData.pending.length;
}

let syncTimer = null;

function startSyncLoop() {
    if (syncTimer) return;
    
    syncTimer = setInterval(async () => {
        if (!navigator.onLine) {
            updateSyncStatus('offline');
            return;
        }
        await syncPending();
    }, 30000);
    
    window.addEventListener('online', () => {
        updateSyncStatus('syncing');
        syncPending();
    });
    window.addEventListener('offline', () => {
        updateSyncStatus('offline');
    });
}

loadCache();