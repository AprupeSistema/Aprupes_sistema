let dbReady = null;
let cacheInitialized = false;

async function initSQLite() {
    if (dbReady) return dbReady;
    
    dbReady = initializeCache();
    return dbReady;
}

async function initializeCache() {
    try {
        await loadCache();
        await fetchAllServerData();
        cacheInitialized = true;
        return { ok: true, unsynced: getPendingCount() };
    } catch (e) {
        console.error('Cache init failed, using local cache only:', e);
        cacheInitialized = true;
        return { ok: true, unsynced: getPendingCount() };
    }
}

function ensureDb() {
    if (!cacheInitialized) {
        return initializeCache();
    }
    return Promise.resolve({ ok: true, unsynced: getPendingCount() });
}

async function saveMark(atzime) {
    const id = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (navigator.onLine) {
        try {
            const res = await fetch('/api/localdb/save-mark', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                body: JSON.stringify(atzime)
            });
            if (res.ok) {
                const data = await res.json();
                return data.id;
            }
            throw new Error('Save failed');
        } catch (e) {
            console.warn('Online save failed, falling back to pending:', e);
        }
    }
    
    await addPendingMark(atzime);
    updateSyncStatus('pending');
    return id;
}

async function getPendingSync() {
    await ensureDb();
    return cacheData.pending.map(item => item.data);
}

async function markSynced(id) {
    await ensureDb();
    const index = cacheData.pending.findIndex(item => 
        item.data.id === id || item.id === id
    );
    if (index >= 0) {
        cacheData.pending.splice(index, 1);
        await savePending();
    }
    updateSyncStatus(cacheData.pending.length > 0 ? 'pending' : 'synced');
}

async function getUnsyncedCount() {
    await ensureDb();
    return getPendingCount();
}
