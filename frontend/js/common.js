/* HealthGuard AI - shared frontend utilities */

const API_BASE = '/api';

const Auth = {
  getToken() { return localStorage.getItem('hg_token'); },
  getUser() {
    try { return JSON.parse(localStorage.getItem('hg_user') || 'null'); }
    catch { return null; }
  },
  setSession(token, user) {
    localStorage.setItem('hg_token', token);
    localStorage.setItem('hg_user', JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem('hg_token');
    localStorage.removeItem('hg_user');
  },
  isLoggedIn() { return !!this.getToken(); },
  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = 'login.html';
    }
  },
  logout() {
    this.clearSession();
    window.location.href = 'login.html';
  },
};

/**
 * Thin fetch wrapper: adds JSON headers + Bearer token, throws an Error
 * with the server's `error` message on non-2xx responses.
 */
async function apiRequest(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && Auth.getToken()) {
    headers.Authorization = `Bearer ${Auth.getToken()}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    throw new Error('Could not reach the server. Is the backend running?');
  }

  let data = {};
  try { data = await response.json(); } catch { /* empty body */ }

  if (response.status === 401 && auth) {
    Auth.clearSession();
    window.location.href = 'login.html';
    return;
  }

  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

function showAlert(el, message, type = 'error') {
  if (!el) return;
  el.textContent = message;
  el.className = `alert show alert-${type}`;
}

function hideAlert(el) {
  if (!el) return;
  el.className = 'alert';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function riskPillHtml(level) {
  return `<span class="risk-pill ${level}">${level} Risk</span>`;
}

/** Populate the shared sidebar/nav with the logged-in user's name + active link. */
function initNavUser(activePage) {
  const user = Auth.getUser();
  document.querySelectorAll('[data-user-name]').forEach((el) => {
    if (user) el.textContent = user.name;
  });
  document.querySelectorAll('[data-nav-link]').forEach((el) => {
    if (el.getAttribute('data-nav-link') === activePage) el.classList.add('active');
  });
  document.querySelectorAll('[data-logout]').forEach((el) => {
    el.addEventListener('click', (e) => { e.preventDefault(); Auth.logout(); });
  });
}
