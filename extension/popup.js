const api = globalThis.browser ?? globalThis.chrome;

const $ = (id) => document.getElementById(id);

function send(message) {
    return new Promise((resolve) => {
        api.runtime.sendMessage(message, resolve);
    });
}

function setStatus(type, message) {
    const el = $('status');
    el.className = `status ${type || ''}`;
    el.textContent = message;
}

async function loadState() {
    const state = await api.storage.local.get([
        'githubUsername', 'githubAvatarUrl', 'repoOwner', 'repoName', 'repoId',
        'thmUsername', 'lastData', 'lastUpdate', 'lastError', 'authPending',
        'authUserCode', 'authVerificationUri'
    ]);

    if (state.githubUsername) {
        $('setupCard').classList.add('hidden');
        $('profileCard').classList.remove('hidden');
        $('welcomeCard').classList.remove('hidden');
        $('githubUser').textContent = state.githubUsername;
        if (state.githubAvatarUrl) $('avatar').src = state.githubAvatarUrl;
        $('thmUsername').value = state.thmUsername || '';
        updateLast(state);
        await loadRepositories(state.repoId);
        if (state.lastError) setStatus('error', `Last error: ${state.lastError}`);
    } else {
        $('setupCard').classList.remove('hidden');
        $('profileCard').classList.add('hidden');
        $('welcomeCard').classList.remove('hidden');
    }
}

async function loadRepositories(selectedId) {
    const select = $('repoSelect');
    select.innerHTML = '<option value="">Loading repositories…</option>';
    const response = await send({ action: 'listRepositories' });
    if (!response?.success) {
        select.innerHTML = '<option value="">Unable to load repositories</option>';
        setStatus('error', response?.error || 'Could not load repositories.');
        return;
    }

    const repos = response.repositories || [];
    select.innerHTML = '';
    if (!repos.length) {
        select.innerHTML = '<option value="">No THM Badge repositories found</option>';
        setStatus('error', 'No repository is currently accessible to THM Badge. Install the app on your badge repository, then refresh.');
        return;
    }

    for (const repo of repos) {
        const option = document.createElement('option');
        option.value = String(repo.id);
        option.textContent = `${repo.fullName}${repo.private ? ' 🔒' : ''}`;
        option.dataset.owner = repo.owner;
        option.dataset.name = repo.name;
        select.appendChild(option);
    }

    if (selectedId) select.value = String(selectedId);
}

async function connectGitHub() {
    const btn = $('connectBtn');
    btn.disabled = true;
    btn.textContent = 'Opening GitHub…';
    setStatus('', '');

    const response = await send({ action: 'authenticateGitHub' });
    btn.disabled = false;
    btn.textContent = 'Continue with GitHub';

    if (!response?.success) {
        $('authHint').classList.remove('hidden');
        $('authHint').textContent = response?.error || 'GitHub authorization failed.';
        return;
    }

    await loadState();
}

async function saveAndUpdate() {
    const option = $('repoSelect').selectedOptions[0];
    const thmUsername = $('thmUsername').value.trim();
    if (!option?.dataset.owner || !option?.dataset.name) {
        setStatus('error', 'Choose a GitHub repository first.');
        return;
    }
    if (!thmUsername) {
        setStatus('error', 'Enter your TryHackMe username.');
        return;
    }

    $('saveBtn').disabled = true;
    $('saveBtn').textContent = 'Generating…';
    await api.storage.local.set({
        repoOwner: option.dataset.owner,
        repoName: option.dataset.name,
        repoId: option.value,
        thmUsername
    });

    const response = await send({ action: 'manualUpdate' });
    $('saveBtn').disabled = false;
    $('saveBtn').textContent = 'Save & Generate Badge';

    if (response?.success) {
        setStatus('success', '✓ Badge data updated successfully.');
        const state = await api.storage.local.get(['lastUpdate', 'lastData']);
        updateLast(state);
    } else {
        setStatus('error', `Update failed: ${response?.error || 'Unknown error'}`);
    }
}

async function updateNow() {
    $('updateBtn').disabled = true;
    setStatus('', 'Updating TryHackMe stats…');
    const response = await send({ action: 'manualUpdate' });
    $('updateBtn').disabled = false;
    if (response?.success) {
        setStatus('success', '✓ Badge updated successfully.');
        const state = await api.storage.local.get(['lastUpdate', 'lastData']);
        updateLast(state);
    } else {
        setStatus('error', response?.error || 'Update failed.');
    }
}

async function disconnect() {
    await send({ action: 'logout' });
    window.location.reload();
}

function updateLast(state) {
    if (!state.lastUpdate) {
        $('lastUpdate').textContent = 'No successful update yet.';
        return;
    }
    const level = state.lastData?.data?.level ?? 'N/A';
    $('lastUpdate').textContent = `Last updated: ${new Date(state.lastUpdate).toLocaleString()} · Level ${level}`;
}

function setupLinks() {
    const installUrl = `https://github.com/apps/${encodeURIComponent(THM_BADGE_CONFIG.githubAppSlug)}/installations/new`;
    $('installAppLink').href = installUrl;
    $('installAppLink').addEventListener('click', (event) => {
        event.preventDefault();
        api.tabs.create({ url: installUrl });
    });
    $('refreshReposBtn').addEventListener('click', async () => {
        const btn = $('refreshReposBtn');
        btn.disabled = true;
        btn.textContent = 'Refreshing…';
        await loadRepositories();
        btn.disabled = false;
        btn.textContent = 'Refresh repositories';
    });
    $('helpLink').addEventListener('click', (event) => {
        event.preventDefault();
        api.tabs.create({ url: 'https://github.com/' });
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    setupLinks();
    $('connectBtn').addEventListener('click', connectGitHub);
    $('saveBtn').addEventListener('click', saveAndUpdate);
    $('updateBtn').addEventListener('click', updateNow);
    $('logoutBtn').addEventListener('click', disconnect);
    await loadState();
});
