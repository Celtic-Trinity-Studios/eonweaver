import { initRouter, registerRoute, navigate } from './router.js';
import { renderSidebar } from './components/Sidebar.js';
import { getState, setState, resetState, subscribe } from './stores/appState.js';
import { apiGetCurrentUser, apiLogin, apiRegister, apiLogout } from './api/auth.js';
import { apiGetCalendar, calendarToString } from './api/settings.js';
import { setCurrentEdition } from './api/srd.js';
import { apiCreateCampaign } from './api/campaigns.js';
import { mountDmToolbar } from './components/DmToolbar.js';

// Views
import DashboardView from './views/DashboardView.js';
import TownView from './views/TownView.js';
import SettingsView from './views/SettingsView.js';
import SrdBrowserView from './views/SrdBrowserView.js';
import CalendarView from './views/CalendarView.js';
import SimulationView from './views/SimulationView.js';
import WorldSimulateView from './views/WorldSimulateView.js';
import TownStatsView from './views/TownStatsView.js';
import EncounterView from './views/EncounterView.js';
import PartyView from './views/PartyView.js';
import HelpView from './views/HelpView.js';
import HomebrewView from './views/HomebrewView.js';
import ContentLibraryView from './views/ContentLibraryView.js';
import AdminDashboardView from './views/AdminDashboardView.js';

// Styles
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/views.css';
import './styles/charsheet.css';
import './styles/social.css';
import './styles/buildings.css';
import './styles/phase1.css';
import './styles/theme.css';
import './styles/admin.css';
import './styles/homebrew.css';

let routesRegistered = false;

/* ── App Bootstrap ──────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
    // Intercept all internal link clicks to use the router
    interceptInternalLinks();

    try {
        const res = await apiGetCurrentUser();
        if (res.user) {
            setState({ user: res.user });
            if (res.user.active_campaign) {
                setState({ currentCampaign: res.user.active_campaign });
                setCurrentEdition(res.user.active_campaign.dnd_edition);
            }
            // Admin gets a different UI
            if (res.user.role === 'admin') {
                showAdminApp();
            } else {
                showApp();
            }
        } else {
            showAuth();
        }
    } catch {
        showAuth();
    }
});

/**
 * Capture all clicks on <a> tags that point to internal routes
 * and handle them via navigate() instead of full page reload.
 */
function interceptInternalLinks() {
    const base = (import.meta.env?.BASE_URL || '/').replace(/\/$/, '');
    
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;
        
        const href = link.getAttribute('href');
        if (!href) return;
        
        // Handle #/ format for legacy templates
        if (href.startsWith('#/')) {
            e.preventDefault();
            navigate(href.replace(/^#\/?/, ''));
            return;
        }

        // Handle absolute paths starting with base
        if (href.startsWith(base + '/') || href === base) {
            e.preventDefault();
            const relPath = href.replace(new RegExp('^' + base.replace(/\//g, '\\/')), '').replace(/^\//, '');
            navigate(relPath || 'dashboard');
            return;
        }
        
        // Ignore external links
        if (href.includes('://')) return;
        
        // Relative paths (try to resolve)
        if (!href.startsWith('/') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
            // Very basic relative resolution
            e.preventDefault();
            navigate(href);
        }
    });
}

function showAuth() {
    document.getElementById('auth-screen').style.display = '';
    document.getElementById('main-app').style.display = 'none';
    bindAuthEvents();
}

function showApp() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('main-app').style.display = '';

    const state = getState();

    // Render sidebar (it adapts to no-campaign state)
    renderSidebar(document.getElementById('sidebar-container'));
    mountDmToolbar();

    // Bind logout
    document.getElementById('sidebar-logout-btn')?.addEventListener('click', async () => {
        await apiLogout();
        resetState();
        showAuth();
    });

    // If no campaign exists, show the onboarding screen
    if (!state.currentCampaign) {
        showNoCampaignScreen();
        return;
    }

    // Load calendar
    apiGetCalendar().then(res => {
        if (res.calendar) {
            setState({ calendar: res.calendar });
            const el = document.getElementById('sidebar-calendar-text');
            if (el) el.textContent = calendarToString(res.calendar);
        }
    }).catch(() => { });

    // Register routes (only once)
    if (!routesRegistered) {
        registerRoute('dashboard', DashboardView);
        registerRoute('town', TownView);
        registerRoute('settings', SettingsView);
        registerRoute('srd', SrdBrowserView);
        registerRoute('calendar', CalendarView);
        registerRoute('simulation', SimulationView);
        registerRoute('world-simulate', WorldSimulateView);
        registerRoute('townstats', TownStatsView);
        registerRoute('encounters', EncounterView);
        registerRoute('party', PartyView);
        registerRoute('homebrew', HomebrewView);
        registerRoute('content-library', ContentLibraryView);
        registerRoute('help', HelpView);
        routesRegistered = true;
    }

    // Start router
    initRouter();
}

/* ── Admin App ─────────────────────────────────────────── */
function showAdminApp() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('main-app').style.display = '';

    const state = getState();
    const sidebarEl = document.getElementById('sidebar-container');

    // Render admin sidebar with all section nav items
    sidebarEl.innerHTML = `
    <div class="sidebar admin-mode">
      <div class="sidebar-brand">
        <h1 class="sidebar-title">Eon Weaver</h1>
        <p class="sidebar-subtitle">Administration</p>
      </div>
      <nav class="sidebar-nav">
        <button class="nav-item active" data-admin-tab="overview">
          <span class="nav-icon">📊</span>
          <span class="nav-label">Overview</span>
        </button>
        <button class="nav-item" data-admin-tab="members">
          <span class="nav-icon">👥</span>
          <span class="nav-label">Accounts</span>
        </button>
        <button class="nav-item" data-admin-tab="campaigns">
          <span class="nav-icon">📜</span>
          <span class="nav-label">Campaigns</span>
        </button>
        <button class="nav-item" data-admin-tab="towns">
          <span class="nav-icon">🏰</span>
          <span class="nav-label">Towns</span>
        </button>
        <button class="nav-item" data-admin-tab="usage">
          <span class="nav-icon">📈</span>
          <span class="nav-label">Token Usage</span>
        </button>
        <button class="nav-item" data-admin-tab="settings">
          <span class="nav-icon">⚙️</span>
          <span class="nav-label">Site Settings</span>
        </button>
      </nav>
      <div class="sidebar-footer">
        <div class="sidebar-user" id="sidebar-user-info">🛡️ ${state.user?.username || 'Admin'}</div>
        <button class="sidebar-logout" id="sidebar-logout-btn" title="Sign Out">🚪 Sign Out</button>
      </div>
    </div>
    `;

    // Logout
    sidebarEl.querySelector('#sidebar-logout-btn')?.addEventListener('click', async () => {
        await apiLogout();
        resetState();
        showAuth();
    });

    // Admin sidebar nav → triggers tab switching inside AdminDashboardView
    sidebarEl.querySelectorAll('[data-admin-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
            sidebarEl.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            // Click the corresponding tab inside the view
            const tabBtn = document.querySelector(`.admin-tab[data-tab="${btn.dataset.adminTab}"]`);
            if (tabBtn) tabBtn.click();
        });
    });

    // Register admin routes
    if (!routesRegistered) {
        registerRoute('admin', AdminDashboardView);
        routesRegistered = true;
    }

    // Force navigate to admin dashboard
    navigate('admin');
    initRouter();
}

/* ── No-Campaign Onboarding ─────────────────────────────── */
function showNoCampaignScreen() {
    const content = document.getElementById('app-content');
    if (!content) return;

    content.innerHTML = `
    <div class="onboarding-screen">
      <div class="onboarding-card">
        <div class="onboarding-icon">📜</div>
        <h1 class="onboarding-title">Welcome to Eon Weaver</h1>
        <p class="onboarding-subtitle">Create your first campaign to get started. Your campaign is the container for all your towns, characters, encounters, and world data.</p>

        <div class="onboarding-form">
          <div class="form-group">
            <label for="onboard-name">Campaign Name</label>
            <input type="text" id="onboard-name" class="form-input" placeholder="e.g. Curse of the Crimson Throne" autofocus>
          </div>

          <div class="form-group">
            <label for="onboard-edition">D&D Edition</label>
            <select id="onboard-edition" class="form-select">
              <option value="3.5e">D&D 3.5 Edition (SRD)</option>
              <option value="5e">D&D 5th Edition — 2014 (SRD)</option>
              <option value="5e2024">D&D 5th Edition — 2024 Revised (SRD)</option>
            </select>
          </div>

          <div class="form-group">
            <label for="onboard-desc">Description <span class="muted">(optional)</span></label>
            <input type="text" id="onboard-desc" class="form-input" placeholder="A brief description of your campaign...">
          </div>

          <button class="btn-primary onboarding-submit" id="onboard-create-btn">
            🚀 Create Campaign & Begin
          </button>
          <div id="onboard-error" class="auth-error" style="display:none;"></div>
        </div>
      </div>
    </div>
    `;

    content.querySelector('#onboard-create-btn')?.addEventListener('click', async () => {
        const name = content.querySelector('#onboard-name').value.trim();
        const edition = content.querySelector('#onboard-edition').value;
        const desc = content.querySelector('#onboard-desc').value.trim();
        const errEl = content.querySelector('#onboard-error');

        if (!name) {
            errEl.textContent = 'Please enter a campaign name.';
            errEl.style.display = '';
            return;
        }

        const btn = content.querySelector('#onboard-create-btn');
        btn.disabled = true;
        btn.textContent = 'Creating...';
        errEl.style.display = 'none';

        try {
            const res = await apiCreateCampaign(name, edition, desc);
            setState({ currentCampaign: res.campaign });
            setCurrentEdition(edition);
            // Reload user to get updated data
            const meRes = await apiGetCurrentUser();
            if (meRes.user) setState({ user: meRes.user });
            // Now show the full app
            showApp();
        } catch (err) {
            errEl.textContent = err.message;
            errEl.style.display = '';
            btn.disabled = false;
            btn.textContent = '🚀 Create Campaign & Begin';
        }
    });

    // Allow Enter key to submit
    content.querySelector('#onboard-name')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') content.querySelector('#onboard-create-btn')?.click();
    });
}

/* ── Auth Events ────────────────────────────────────────── */
function bindAuthEvents() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    const errorEl = document.getElementById('auth-error');

    showRegLink?.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.style.display = 'none';
        registerForm.style.display = '';
        errorEl.style.display = 'none';
    });

    showLoginLink?.addEventListener('click', (e) => {
        e.preventDefault();
        registerForm.style.display = 'none';
        loginForm.style.display = '';
        errorEl.style.display = 'none';
    });

    // Password show/hide toggles
    document.querySelectorAll('.pw-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = document.getElementById(btn.dataset.target);
            if (!input) return;
            const isHidden = input.type === 'password';
            input.type = isHidden ? 'text' : 'password';
            btn.textContent = isHidden ? '🙈' : '👁️';
            btn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
        });
    });

    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const login = document.getElementById('login-username').value;
            const pw = document.getElementById('login-password').value;
            const res = await apiLogin(login, pw);
            setState({ user: res.user });
            // Re-fetch user to get campaign data
            const meRes = await apiGetCurrentUser();
            if (meRes.user) {
                setState({ user: meRes.user });
                if (meRes.user.active_campaign) {
                    setState({ currentCampaign: meRes.user.active_campaign });
                    setCurrentEdition(meRes.user.active_campaign.dnd_edition);
                }
            }
            // Admin gets different UI
            if (meRes.user?.role === 'admin') {
                showAdminApp();
            } else {
                showApp();
            }
        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.style.display = '';
        }
    });

    registerForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const username = document.getElementById('reg-username').value;
            const email = document.getElementById('reg-email').value;
            const pw = document.getElementById('reg-password').value;
            const betaKey = document.getElementById('reg-beta-key').value;
            const res = await apiRegister(username, email, pw, betaKey);
            setState({ user: res.user });
            // New user has no campaign — showApp will handle onboarding
            const meRes = await apiGetCurrentUser();
            if (meRes.user) {
                setState({ user: meRes.user });
                if (meRes.user.active_campaign) {
                    setState({ currentCampaign: meRes.user.active_campaign });
                    setCurrentEdition(meRes.user.active_campaign.dnd_edition);
                }
            }
            showApp();
        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.style.display = '';
        }
    });
}
