import { initRouter, registerRoute, navigate, resetRegisteredRoutes, getCurrentRoute, appHref } from './router.js';
import { renderSidebar, renderPlayerSidebar } from './components/Sidebar.js';
import { getState, setState, resetState, subscribe } from './stores/appState.js';
import { apiGetCurrentUser, apiLogin, apiRegister, apiLogout, apiResendVerification } from './api/auth.js';
import { apiShareRead } from './api/groundwork.js';
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
import WorldMapView from './views/WorldMapView.js';
import CampaignMapsView from './views/CampaignMapsView.js';
import TownStatsView from './views/TownStatsView.js';
import RelationshipNetworkView from './views/RelationshipNetworkView.js';
import EncounterView from './views/EncounterView.js';
import EncounterTableView from './views/EncounterTableView.js';
import PartyView from './views/PartyView.js';
import HelpView from './views/HelpView.js';
import HomebrewView from './views/HomebrewView.js';
import ContentLibraryView from './views/ContentLibraryView.js';
import ScribeView from './views/ScribeView.js';
import AdminDashboardView from './views/AdminDashboardView.js';
import MacroSimulationView from './views/MacroSimulationView.js';
import PlayerPortalView from './views/PlayerPortalView.js';
import MyTablesView from './views/MyTablesView.js';
import JoinTableView from './views/JoinTableView.js';
import VttExportView from './views/VttExportView.js';
import IntegrationsView from './views/IntegrationsView.js';
import WikiView from './views/WikiView.js';
import CampaignHubView from './views/CampaignHubView.js';
import BattlemapsView from './views/BattlemapsView.js';
import PlayerCreateView from './views/PlayerCreateView.js';
import SubscriptionView from './views/SubscriptionView.js';

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
import './styles/scribe.css';
import './styles/lore.css';
import './styles/mobile-framework.css';

let routesRegistered = false;
let authEventsBound = false;
let landingEventsBound = false;
let shellMode = null;
const JOIN_KEY = 'ew_pending_join_token';

function shareTokenFromPath() {
    const base = (import.meta.env?.BASE_URL || '/').replace(/\/$/, '');
    let relative = window.location.pathname.replace(new RegExp('^' + base.replace(/\//g, '\\/')), '');
    relative = relative.replace(/^\/+|\/+$/g, '');
    const match = relative.match(/^share\/([a-f0-9]{32})$/i);
    return match ? match[1] : '';
}

function escShare(s) {
    return String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

function ShareReadView(container, params) {
    const token = params?.id || shareTokenFromPath();
    container.innerHTML = '<div class="dash-card">Loading shared page…</div>';
    apiShareRead(token).then((res) => {
        container.innerHTML = `<article class="dash-card"><h1>${escShare(res.title)}</h1><pre style="white-space:pre-wrap;font-family:inherit;">${escShare(res.body)}</pre></article>`;
    }).catch((err) => {
        container.textContent = err.message;
    });
}

function showSharedOnLanding(token) {
    const auth = document.getElementById('auth-screen');
    const landing = document.getElementById('landing-screen');
    const host = (auth && auth.style.display !== 'none') ? auth : (landing || document.body);
    const card = document.createElement('article');
    card.className = 'dash-card';
    card.style.margin = '1rem auto';
    card.style.maxWidth = '42rem';
    card.textContent = 'Loading shared page…';
    host.prepend(card);
    apiShareRead(token).then((res) => {
        card.innerHTML = `<h1>${escShare(res.title)}</h1><pre style="white-space:pre-wrap;font-family:inherit;">${escShare(res.body)}</pre>`;
    }).catch((err) => {
        card.textContent = err.message;
    });
}

function joinTokenFromPath() {
    const base = (import.meta.env?.BASE_URL || '/').replace(/\/$/, '');
    let relative = window.location.pathname.replace(new RegExp('^' + base.replace(/\//g, '\\/')), '');
    relative = relative.replace(/^\/+|\/+$/g, '');
    const match = relative.match(/^join\/([a-f0-9]{32,128})$/i);
    return match ? match[1] : '';
}

function rememberJoinToken() {
    const fromPath = joinTokenFromPath();
    if (fromPath) sessionStorage.setItem(JOIN_KEY, fromPath);
    return fromPath || sessionStorage.getItem(JOIN_KEY) || '';
}

function syncAuthJoinNote() {
    const note = document.getElementById('auth-join-note');
    if (!note) return;
    const token = sessionStorage.getItem(JOIN_KEY);
    if (token) {
        note.style.display = '';
        note.textContent = 'You have a table invite. Sign in or create an account to take your seat. If the DM sent it to an email address, use that address.';
    } else {
        note.style.display = 'none';
        note.textContent = '';
    }
}

async function signOut() {
    await apiLogout();
    const toolbar = document.getElementById('dm-toolbar-root');
    if (toolbar) toolbar.style.display = 'none';
    resetRegisteredRoutes();
    routesRegistered = false;
    shellMode = null;
    resetState();
    showLanding();
}

/* ── App Bootstrap ──────────────────────────────────────── */
import { pingVisit } from './utils/visitMetrics.js';

    document.addEventListener('DOMContentLoaded', async () => {
    document.addEventListener('ew-refresh-shell', () => showApp());
    rememberJoinToken();

    // Intercept all internal link clicks to use the router
    interceptInternalLinks();

    // Anonymous initial pageview (landing/auth/etc) — captures visitors who never log in.
    pingVisit(window.location.pathname.split('/').filter(Boolean).pop() || 'landing');

    const qs = new URLSearchParams(window.location.search);
    let verifyMsg = null;
    if (qs.get('verified') === '1') {
        verifyMsg = { ok: true };
    } else if (qs.get('verify_error') === 'expired') {
        verifyMsg = { ok: false, text: 'That confirmation link expired. Use “Resend confirmation email” below.' };
    } else if (qs.get('verify_error') === 'invalid') {
        verifyMsg = { ok: false, text: 'Invalid confirmation link.' };
    }
    if (verifyMsg) {
        history.replaceState({}, '', window.location.pathname + window.location.hash);
    }

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
        } else if (rememberJoinToken()) {
            showAuth('login');
        } else {
            showLanding();
        }
    } catch {
        if (rememberJoinToken()) showAuth('login');
        else showLanding();
    }

    const shared = shareTokenFromPath();
    if (shared && !getState().user) {
        showSharedOnLanding(shared);
    }

    if (verifyMsg && !getState().user) {
        showAuth('login');
        const errEl = document.getElementById('auth-error');
        if (errEl) {
            errEl.style.display = '';
            errEl.style.color = verifyMsg.ok ? '#22c55e' : '';
            errEl.textContent = verifyMsg.ok ? 'Email confirmed. Sign in below.' : verifyMsg.text;
        }
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

        // Plain fragment links (#, #section) are for in-page JS (auth toggles, etc.)
        if (href.startsWith('#') && !href.startsWith('#/')) {
            return;
        }
        
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

function showLanding() {
    const landing = document.getElementById('landing-screen');
    const auth = document.getElementById('auth-screen');
    const app = document.getElementById('main-app');
    if (landing) landing.style.display = '';
    if (auth) auth.style.display = 'none';
    if (app) app.style.display = 'none';
    bindLandingEvents();
}

function showAuth(mode = 'login') {
    const landing = document.getElementById('landing-screen');
    const auth = document.getElementById('auth-screen');
    const app = document.getElementById('main-app');
    if (landing) landing.style.display = 'none';
    if (auth) auth.style.display = '';
    if (app) app.style.display = 'none';
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const errorEl = document.getElementById('auth-error');
    if (mode === 'register') {
        if (loginForm) loginForm.style.display = 'none';
        if (registerForm) registerForm.style.display = '';
    } else {
        if (registerForm) registerForm.style.display = 'none';
        if (loginForm) loginForm.style.display = '';
    }
    if (errorEl) errorEl.style.display = 'none';
    syncAuthJoinNote();
    bindAuthEvents();
}

function showApp() {
    const landing = document.getElementById('landing-screen');
    const auth = document.getElementById('auth-screen');
    const app = document.getElementById('main-app');
    if (landing) landing.style.display = 'none';
    if (auth) auth.style.display = 'none';
    if (app) app.style.display = '';

    const state = getState();
    const joined = state.user?.joined_tables || [];
    const pending = state.user?.pending_table_invites || [];
    const inviteToken = joinTokenFromPath() || sessionStorage.getItem(JOIN_KEY) || '';
    if (!state.currentCampaign && (joined.length || pending.length || inviteToken)) {
        showPlayerShell();
        return;
    }
    showDmShell();
}

function showPlayerShell() {
    const toolbar = document.getElementById('dm-toolbar-root');
    if (toolbar) toolbar.style.display = 'none';
    if (shellMode !== 'player') {
        resetRegisteredRoutes();
        routesRegistered = false;
        shellMode = 'player';
    }
    const sidebar = document.getElementById('sidebar-container');
    renderPlayerSidebar(sidebar);
    sidebar.querySelector('#sidebar-logout-btn')?.addEventListener('click', () => signOut());
    sidebar.querySelector('#player-start-campaign')?.addEventListener('click', () => showNoCampaignScreen());

    if (!routesRegistered) {
        registerRoute('my-tables', MyTablesView);
        registerRoute('join', JoinTableView);
        registerRoute('create-character', PlayerCreateView);
        registerRoute('share', ShareReadView);
        registerRoute('help', HelpView);
        routesRegistered = true;
    }

    const path = getCurrentRoute().path;
    const urlToken = joinTokenFromPath();
    const stored = sessionStorage.getItem(JOIN_KEY) || '';
    const onSeatRoute = path === 'my-tables' || path === 'help' || path === 'join' || path === 'create-character' || path === 'share';
    if (path === 'join' && !urlToken && stored) {
        window.history.replaceState({}, '', appHref('join/' + stored));
    } else if (!onSeatRoute) {
        window.history.replaceState({}, '', appHref(stored ? ('join/' + stored) : 'my-tables'));
    }
    initRouter();
}

function showDmShell() {
    const toolbar = document.getElementById('dm-toolbar-root');
    if (toolbar) toolbar.style.display = '';

    const state = getState();

    // Render sidebar (it adapts to no-campaign state)
    renderSidebar(document.getElementById('sidebar-container'));
    mountDmToolbar();

    document.getElementById('sidebar-logout-btn')?.addEventListener('click', () => signOut());

    // If no campaign exists, show the onboarding screen
    if (!state.currentCampaign) {
        showNoCampaignScreen();
        return;
    }

    if (shellMode !== 'dm') {
        resetRegisteredRoutes();
        routesRegistered = false;
        shellMode = 'dm';
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
        registerRoute('world-map', WorldMapView);
        registerRoute('campaign-maps', CampaignMapsView);
        registerRoute('townstats', TownStatsView);
        registerRoute('relationships', RelationshipNetworkView);
        registerRoute('encounters', EncounterView);
        registerRoute('encounter-table', EncounterTableView);
        registerRoute('party', PartyView);
        registerRoute('homebrew', HomebrewView);
        registerRoute('content-library', ContentLibraryView);
        registerRoute('scribe', ScribeView);
        registerRoute('macro-sim', MacroSimulationView);
        registerRoute('player-portal', PlayerPortalView);
        registerRoute('my-tables', MyTablesView);
        registerRoute('join', JoinTableView);
        registerRoute('vtt-export', VttExportView);
        registerRoute('integrations', IntegrationsView);
        registerRoute('wiki', WikiView);
        registerRoute('sessions', CampaignHubView);
        registerRoute('battlemaps', BattlemapsView);
        registerRoute('create-character', PlayerCreateView);
        registerRoute('share', ShareReadView);
        registerRoute('help', HelpView);
        registerRoute('subscription', SubscriptionView);
        routesRegistered = true;
    }

    // Start router
    initRouter();
}

/* ── Admin App ─────────────────────────────────────────── */
function showAdminApp() {
    const landing = document.getElementById('landing-screen');
    const auth = document.getElementById('auth-screen');
    const app = document.getElementById('main-app');
    if (landing) landing.style.display = 'none';
    if (auth) auth.style.display = 'none';
    if (app) app.style.display = '';

    const state = getState();
    const sidebarEl = document.getElementById('sidebar-container');

    // Render admin sidebar with all section nav items
    sidebarEl.innerHTML = `
    <div class="sidebar admin-mode">
      <div class="sidebar-brand">
        <div class="sidebar-title">Eon Weaver</div>
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
        <button class="nav-item" data-admin-tab="npc-pool">
          <span class="nav-icon">🧬</span>
          <span class="nav-label">NPC reuse (DB)</span>
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
        await signOut();
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
        <p class="onboarding-subtitle">Create your first campaign to get started. Your campaign is the container for all your towns, characters, encounters, and world data. If a DM invited you, open their link and sign in — you do not need a campaign of your own to take a seat.</p>

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
            window.history.replaceState({}, '', appHref('dashboard'));
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
    if (authEventsBound) return;
    authEventsBound = true;

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    const backLogin = document.getElementById('back-to-landing-login');
    const backRegister = document.getElementById('back-to-landing-register');
    const errorEl = document.getElementById('auth-error');
    const resendBtn = document.getElementById('resend-verify-btn');
    let resendCooldownTimer = null;

    const startResendCooldown = (seconds = 30) => {
        if (!resendBtn) return;
        if (resendCooldownTimer) {
            clearInterval(resendCooldownTimer);
            resendCooldownTimer = null;
        }
        let remaining = Math.max(1, Number(seconds) || 30);
        resendBtn.setAttribute('aria-disabled', 'true');
        resendBtn.style.pointerEvents = 'none';
        resendBtn.style.opacity = '0.65';
        resendBtn.textContent = `Resend in ${remaining}s`;
        resendCooldownTimer = setInterval(() => {
            remaining -= 1;
            if (remaining <= 0) {
                clearInterval(resendCooldownTimer);
                resendCooldownTimer = null;
                resendBtn.removeAttribute('aria-disabled');
                resendBtn.style.pointerEvents = '';
                resendBtn.style.opacity = '';
                resendBtn.textContent = 'Resend confirmation email';
                return;
            }
            resendBtn.textContent = `Resend in ${remaining}s`;
        }, 1000);
    };

    showRegLink?.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.style.display = 'none';
        registerForm.style.display = '';
        errorEl.style.color = '';
        errorEl.style.display = 'none';
    });

    showLoginLink?.addEventListener('click', (e) => {
        e.preventDefault();
        registerForm.style.display = 'none';
        loginForm.style.display = '';
        errorEl.style.color = '';
        errorEl.style.display = 'none';
    });

    backLogin?.addEventListener('click', (e) => {
        e.preventDefault();
        showLanding();
    });
    backRegister?.addEventListener('click', (e) => {
        e.preventDefault();
        showLanding();
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
            const data = await apiRegister(username, email, pw);
            if (data.needs_verification) {
                const loginInput = document.getElementById('login-username');
                if (loginInput && email) loginInput.value = email;
                registerForm.style.display = 'none';
                loginForm.style.display = '';
                errorEl.style.display = '';
                errorEl.style.color = '#22c55e';
                errorEl.textContent =
                    'Check your email for a confirmation link. You must verify before signing in.';
                registerForm.reset();
                return;
            }
            setState({ user: data.user });
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
            errorEl.style.color = '';
            errorEl.textContent = err.message;
            errorEl.style.display = '';
        }
    });

    resendBtn?.addEventListener('click', async () => {
        if (resendBtn.getAttribute('aria-disabled') === 'true') return;
        const email = document.getElementById('login-username').value.trim();
        if (!email || !email.includes('@')) {
            errorEl.textContent = 'Enter your email address in the field above first.';
            errorEl.style.display = '';
            return;
        }
        try {
            await apiResendVerification(email);
            errorEl.style.color = '#22c55e';
            errorEl.textContent = 'If an unverified account exists for that email, a new confirmation message has been sent.';
            errorEl.style.display = '';
            startResendCooldown(30);
        } catch (err) {
            errorEl.style.color = '';
            errorEl.textContent = err.message;
            errorEl.style.display = '';
        }
    });
}

function bindLandingEvents() {
    if (landingEventsBound) return;
    landingEventsBound = true;
    document.getElementById('landing-signin-btn')?.addEventListener('click', () => showAuth('login'));
    document.getElementById('landing-register-btn')?.addEventListener('click', () => showAuth('register'));
}
