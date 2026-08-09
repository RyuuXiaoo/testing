
const API = '';
const TOKEN_KEY = 'ryuuxiao_token';

const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const fmtDate = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('id-ID', { day:'2-digit', month:'2-digit', year:'numeric' });
};
const fmtDateTime = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('id-ID', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
};
const token = () => localStorage.getItem(TOKEN_KEY);
const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  const t = token();
  if (t) headers.set('Authorization', `Bearer ${t}`);
  const res = await fetch(`${API}${path}`, { ...options, headers });
  let data = null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) data = await res.json();
  else data = await res.text();
  if (!res.ok) {
    const message = (data && data.message) || (typeof data === 'string' ? data : 'Request gagal');
    throw new Error(message);
  }
  return data;
}

function toast(message, type='notice') {
  const box = $('#toast');
  if (!box) return alert(message);
  box.className = type === 'error' ? 'error' : 'notice';
  box.textContent = message;
  box.hidden = false;
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => { box.hidden = true; }, 3500);
}

function authGate() {
  if (!token()) {
    location.href = '/';
    return false;
  }
  return true;
}

async function loadMe() {
  return await apiFetch('/api/auth/me');
}

function renderHeader(user) {
  const name = $('#displayName');
  const role = $('#displayRole');
  const avatar = $('#avatar');
  if (name) name.textContent = user.username || user.email || 'User';
  if (role) {
    role.textContent = user.role || 'free';
    role.className = `pill ${(user.role || 'free').toLowerCase()}`;
  }
  if (avatar && user.avatarUrl) avatar.src = user.avatarUrl;
}

async function loginPage() {
  if (token()) {
    location.href = '/profile';
    return;
  }
  const loginForm = $('#loginForm');
  const registerLink = $('#goRegister');
  const openForgot = $('#openForgot');
  const modal = $('#forgotModal');
  const closeForgot = $('#closeForgot');
  const forgotRequest = $('#forgotRequestForm');
  const forgotVerify = $('#forgotVerifyForm');

  registerLink?.addEventListener('click', (e) => { e.preventDefault(); location.href = '/register'; });
  openForgot?.addEventListener('click', () => modal.classList.add('active'));
  closeForgot?.addEventListener('click', () => modal.classList.remove('active'));
  modal?.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });

  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const identifier = $('#identifier').value.trim();
    const password = $('#password').value;
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password })
      });
      setToken(res.token);
      toast('Login berhasil');
      location.href = '/profile';
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  forgotRequest?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const identifier = $('#forgotIdentifier').value.trim();
      const res = await apiFetch('/api/auth/forgot/request', {
        method: 'POST',
        body: JSON.stringify({ identifier })
      });
      $('#forgotStep1').hidden = true;
      $('#forgotStep2').hidden = false;
      $('#forgotIdentifier2').value = identifier;
      toast(res.message || 'Kode dikirim ke WhatsApp');
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  forgotVerify?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const payload = {
        identifier: $('#forgotIdentifier2').value.trim(),
        code: $('#forgotCode').value.trim(),
        newPassword: $('#forgotNewPassword').value
      };
      const res = await apiFetch('/api/auth/forgot/verify', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      toast(res.message || 'Password diperbarui');
      modal.classList.remove('active');
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}

async function registerPage() {
  if (token()) {
    location.href = '/profile';
    return;
  }
  $('#backLogin')?.addEventListener('click', () => location.href = '/');
  $('#registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const payload = {
        username: $('#username').value.trim(),
        email: $('#email').value.trim(),
        phone: $('#phone').value.trim(),
        avatarUrl: $('#avatarUrl').value.trim(),
        password: $('#password').value,
        confirmPassword: $('#confirmPassword').value
      };
      const res = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setToken(res.token);
      toast(res.message || 'Akun dibuat');
      location.href = '/profile';
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}

async function profilePage() {
  if (!authGate()) return;
  $('#logoutBtn')?.addEventListener('click', () => { clearToken(); location.href = '/'; });
  const data = await loadMe();
  const user = data.user;
  renderHeader(user);
  $('#avatar').src = user.avatarUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.username || user.email || 'User');
  $('#email').textContent = user.email || '-';
  $('#phone').textContent = user.phone || '-';
  $('#usernameField').textContent = user.username || '-';
  $('#roleField').textContent = user.role || 'free';
  $('#roleField').className = `pill ${(user.role || 'free').toLowerCase()}`;
  $('#premiumUntil').textContent = fmtDate(user.premiumUntil);
  $('#dailyLimit').textContent = user.dailyLimit ?? '-';
  $('#apiKey').textContent = user.apiKey || '-';
  $('#createdAt').textContent = fmtDateTime(user.createdAt);
  $('#blacklisted').textContent = user.blacklisted ? 'Ya' : 'Tidak';

  $('#changeUsernameForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const newUsername = $('#newUsername').value.trim();
      const res = await apiFetch('/api/auth/change-username', {
        method: 'POST',
        body: JSON.stringify({ newUsername })
      });
      toast(res.message || 'Username diubah');
      location.reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  $('#changePasswordForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const currentPassword = $('#currentPassword').value;
      const newPassword = $('#newPassword').value;
      const res = await apiFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword })
      });
      toast(res.message || 'Password diubah');
      e.target.reset();
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  $('#requestNewKey')?.addEventListener('click', async () => {
    try {
      const res = await apiFetch('/api/auth/api-key/regenerate', { method: 'POST' });
      $('#apiKey').textContent = res.apiKey;
      toast('API key baru dibuat');
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}

function adminUserRow(u) {
  return `
    <tr data-id="${u._id}">
      <td>${u.username || '-'}</td>
      <td>${u.email || '-'}</td>
      <td>${u.phone || '-'}</td>
      <td><span class="pill ${(u.role || 'free').toLowerCase()}">${u.role || 'free'}</span></td>
      <td><input class="input" data-field="dailyLimit" type="number" min="0" value="${u.dailyLimit ?? 0}" style="padding:10px 12px"></td>
      <td><input class="input" data-field="premiumUntil" type="date" value="${u.premiumUntil ? new Date(u.premiumUntil).toISOString().slice(0,10) : ''}" style="padding:10px 12px"></td>
      <td><input class="input" data-field="apiKey" value="${u.apiKey || ''}" style="padding:10px 12px"></td>
      <td>
        <select class="select" data-field="role" style="padding:10px 12px">
          <option value="free" ${u.role === 'free' ? 'selected' : ''}>free</option>
          <option value="premium" ${u.role === 'premium' ? 'selected' : ''}>premium</option>
          <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>admin</option>
        </select>
      </td>
      <td>
        <label style="display:flex;align-items:center;gap:8px">
          <input type="checkbox" data-field="blacklisted" ${u.blacklisted ? 'checked' : ''}>
          <span>${u.blacklisted ? 'Yes' : 'No'}</span>
        </label>
      </td>
      <td>
        <button class="btn btn-primary" data-action="save">Simpan</button>
        <button class="btn btn-danger" data-action="reset">Reset PW</button>
      </td>
    </tr>
  `;
}

async function adminPage() {
  if (!authGate()) return;
  const data = await loadMe();
  if (data.user.role !== 'admin') {
    toast('Akses admin ditolak', 'error');
    location.href = '/profile';
    return;
  }
  renderHeader(data.user);
  $('#logoutBtn')?.addEventListener('click', () => { clearToken(); location.href = '/'; });

  async function loadUsers() {
    const res = await apiFetch('/api/admin/users');
    $('#userCount').textContent = res.users.length;
    const tbody = $('#userBody');
    tbody.innerHTML = res.users.map(adminUserRow).join('');
    $$('#userBody tr').forEach((tr) => {
      tr.querySelector('[data-action="save"]').addEventListener('click', async () => {
        const id = tr.dataset.id;
        const role = tr.querySelector('[data-field="role"]').value;
        const dailyLimit = Number(tr.querySelector('[data-field="dailyLimit"]').value || 0);
        const premiumUntil = tr.querySelector('[data-field="premiumUntil"]').value;
        const apiKey = tr.querySelector('[data-field="apiKey"]').value.trim();
        const blacklisted = tr.querySelector('[data-field="blacklisted"]').checked;
        try {
          await apiFetch(`/api/admin/users/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ role, dailyLimit, premiumUntil, apiKey, blacklisted })
          });
          toast('Data user disimpan');
          await loadUsers();
        } catch (err) {
          toast(err.message, 'error');
        }
      });
      tr.querySelector('[data-action="reset"]').addEventListener('click', async () => {
        const newPassword = prompt('Password baru untuk user ini:');
        if (!newPassword) return;
        try {
          await apiFetch(`/api/admin/users/${tr.dataset.id}/reset-password`, {
            method: 'POST',
            body: JSON.stringify({ newPassword })
          });
          toast('Password user diperbarui');
        } catch (err) {
          toast(err.message, 'error');
        }
      });
    });
  }

  async function loadBlacklist() {
    const res = await apiFetch('/api/admin/blacklist-ip');
    $('#blacklistCount').textContent = res.items.length;
    const list = $('#blacklistList');
    list.innerHTML = res.items.map(item => `
      <div class="stat">
        <div class="row" style="justify-content:space-between">
          <div>
            <div class="v" style="font-size:16px">${item.ip}</div>
            <div class="k">${item.reason || 'manual block'} · ${fmtDateTime(item.createdAt)}</div>
          </div>
          <button class="btn btn-danger" data-ip="${item.ip}">Hapus</button>
        </div>
      </div>
    `).join('');
    $$('#blacklistList [data-ip]').forEach(btn => btn.addEventListener('click', async () => {
      try {
        await apiFetch(`/api/admin/blacklist-ip/${encodeURIComponent(btn.dataset.ip)}`, { method: 'DELETE' });
        toast('IP dibuka kembali');
        await loadBlacklist();
      } catch (err) {
        toast(err.message, 'error');
      }
    }));
  }

  $('#addIpForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/blacklist-ip', {
        method: 'POST',
        body: JSON.stringify({
          ip: $('#ipToBlock').value.trim(),
          reason: $('#blockReason').value.trim()
        })
      });
      $('#ipToBlock').value = '';
      $('#blockReason').value = '';
      await loadBlacklist();
      toast('IP masuk blacklist');
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  await loadUsers();
  await loadBlacklist();
}

document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  if (page === 'login') loginPage();
  if (page === 'register') registerPage();
  if (page === 'profile') profilePage();
  if (page === 'admin') adminPage();
});
