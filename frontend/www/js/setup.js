function initSetup() {
    document.getElementById('btn-finish-setup').addEventListener('click', async () => {
        const vards = document.getElementById('setup-admin-vards').value;
        const uzvards = document.getElementById('setup-admin-uzvards').value;
        const parole = document.getElementById('setup-admin-parole').value;
        const parole2 = document.getElementById('setup-admin-parole2').value;
        const pin = document.getElementById('setup-admin-pin').value;
        const pin2 = document.getElementById('setup-admin-pin2').value;
        const errorEl = document.getElementById('setup-error');
        
        if (!vards || !uzvards || !parole || !pin) { errorEl.textContent = 'Aizpildiet visus laukus'; errorEl.classList.remove('hidden'); return; }
        if (parole !== parole2) { errorEl.textContent = 'Paroles nesakrīt'; errorEl.classList.remove('hidden'); return; }
        if (pin !== pin2) { errorEl.textContent = 'PIN nesakrīt'; errorEl.classList.remove('hidden'); return; }
        if (!/^\d{6}$/.test(pin)) { errorEl.textContent = 'PIN jābūt 6 cipariem'; errorEl.classList.remove('hidden'); return; }
        
        try {
            const res = await fetch(`${API_BASE}/setup/admin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vards, uzvards, parole, pin })
            });
            const data = await res.json();
            if (data.status === 'ok') { window.location.href = 'index.html'; }
            else { throw new Error(data.message); }
        } catch (e) { errorEl.textContent = e.message; errorEl.classList.remove('hidden'); }
    });
}

document.addEventListener('DOMContentLoaded', initSetup);
