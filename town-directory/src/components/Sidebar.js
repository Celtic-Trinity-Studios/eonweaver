/**
 * Eon Weaver — Sidebar Navigation Component
 * Includes campaign selector and grouped navigation with hover hints.
 */
import { navigate } from '../router.js';
import { getState, setState, subscribe } from '../stores/appState.js';
import { calendarToString, apiGetUsage } from '../api/settings.js';
import { rawTokensToTc, formatWalletTc, formatMonthlyTcUsed } from '../constants/credits.js';
import { apiSwitchCampaign, apiGetCampaigns } from '../api/campaigns.js';
import { setCurrentEdition, clearSrdCache } from '../api/srd.js';
import { openBugReportModal } from './BugReportModal.js';

/** Escape text for use inside an HTML double-quoted attribute. */
function escapeAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

/**
 * Grouped nav: DM workflow order — overview, settlement, world time, prep, table, reference, account.
 * `hint` is shown as the native tooltip on hover.
 */
const NAV_GROUPS = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      { route: 'dashboard', icon: '🏠', label: 'Dashboard', hint: 'Your campaign home: town cards, quick simulate, and stats links.' },
    ],
  },
  {
    id: 'settlement',
    label: 'Settlement',
    items: [
      { route: 'town', icon: '🏰', label: 'Town Roster', hint: 'Living roster, character sheets, AI intake, town settings, and history.' },
    ],
  },
  {
    id: 'world',
    label: 'World & time',
    items: [
      { route: 'world-simulate', icon: '🌍', label: 'World Simulate', hint: 'Advance in-game months: events, relationships, births, deaths, construction.' },
      { route: 'macro-sim', icon: '🟣', label: 'Macro Dynamics', hint: 'Campaign-scale seasons, food supply, granary pressure, and stability context.' },
      { route: 'world-map', icon: '🗺️', label: 'World Map', hint: 'Campaign map, town pins, scale, and travel distances for simulation.' },
      { route: 'calendar', icon: '📅', label: 'Calendar', hint: 'Custom in-world calendar; the sidebar date updates when you simulate time.' },
    ],
  },
  {
    id: 'prep',
    label: 'Prep & lore',
    items: [
      { route: 'wiki', icon: '🔵', label: 'Wiki & Lore', hint: 'Campaign wiki pages for places, factions, and lore (markdown).' },
      { route: 'scribe', icon: '✍️', label: 'AI Scribe', hint: 'Arcane Workshop: AI-generated lore, quests, dungeons, items, and traps.' },
      { route: 'content-library', icon: '📁', label: 'Content Library', hint: 'Upload maps, handouts, PDFs, and other assets for your table.' },
    ],
  },
  {
    id: 'table',
    label: 'Table & players',
    items: [
      { route: 'player-portal', icon: '🔶', label: 'Player Portal', hint: 'Player-facing portal and sharing for your campaign.' },
      { route: 'party', icon: '🛡️', label: 'Party', hint: 'Mark PCs and view a cross-town party roster and overview.' },
      { route: 'encounters', icon: '⚔️', label: 'Encounters', hint: 'Build encounters from SRD monsters, CR totals, and initiative tracking.' },
      { route: 'vtt-export', icon: '📦', label: 'VTT Export', hint: 'Export towns and characters toward virtual tabletop tools.' },
    ],
  },
  {
    id: 'connect',
    label: 'Connect',
    items: [
      { route: 'integrations', icon: '🤖', label: 'Integrations', hint: 'Discord webhooks and other external connections.' },
    ],
  },
  {
    id: 'rules',
    label: 'Rules & homebrew',
    items: [
      { route: 'srd', icon: '📖', label: 'SRD Browser', hint: 'System Reference Document for your campaign edition (classes, spells, gear).' },
      { route: 'homebrew', icon: '🧪', label: 'Homebrew', hint: 'Campaign-specific custom races, classes, feats, spells, gear, and monsters.' },
    ],
  },
  {
    id: 'account',
    label: 'Help & account',
    items: [
      { route: 'help', icon: '❓', label: 'Help & Guide', hint: 'Full documentation: towns, simulation, settings, and tips.' },
      { route: 'subscription', icon: '💎', label: 'Plans', hint: 'Subscription tier and Eon Credits (AI usage) for your account.' },
      { route: 'settings', icon: '⚙️', label: 'Settings', hint: 'Campaign description, house rules, simulation knobs, and campaign switcher.' },
    ],
  },
];

function navGroupsHtml(activeRoute) {
  return NAV_GROUPS.map((group) => {
    const hasActive = group.items.some((i) => i.route === activeRoute);
    const collapsedClass = hasActive ? '' : ' is-collapsed';
    const expanded = hasActive ? 'true' : 'false';
    return `
      <div class="sidebar-nav-group${collapsedClass}" data-nav-group="${escapeAttr(group.id)}">
        <button type="button" class="nav-group-toggle" aria-expanded="${expanded}" aria-controls="nav-group-${group.id}" data-tip="Show or hide this category">
          <span class="nav-group-chevron" aria-hidden="true">▾</span>
          <span class="nav-group-label">${escapeAttr(group.label)}</span>
        </button>
        <div class="nav-group-items" id="nav-group-${group.id}" role="group">
          ${group.items.map((item) => `
            <button type="button" class="nav-item nav-item--nested${activeRoute === item.route ? ' active' : ''}" data-route="${escapeAttr(item.route)}" data-tip="${escapeAttr(item.hint)}">
              <span class="nav-icon">${item.icon}</span>
              <span class="nav-label">${escapeAttr(item.label)}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function bindNavGroupToggles(container) {
  container.querySelectorAll('.nav-group-toggle').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const group = btn.closest('.sidebar-nav-group');
      if (!group) return;
      group.classList.toggle('is-collapsed');
      const nowCollapsed = group.classList.contains('is-collapsed');
      btn.setAttribute('aria-expanded', nowCollapsed ? 'false' : 'true');
    });
  });
}

/**
 * Render the sidebar into the given container element.
 */
export function renderSidebar(container) {
  const state = getState();
  const calStr = state.calendar ? calendarToString(state.calendar) : 'Loading...';
  const campaign = state.currentCampaign;
  const hasCampaign = !!campaign;
  const campaignName = campaign ? campaign.name : 'No Campaign';
  const editionLabel = campaign ? getEditionLabel(campaign.dnd_edition) : '';
  const activeRoute = getCurrentActive();

  container.innerHTML = `
    <div class="sidebar">
      <div class="sidebar-brand">
        <div class="sidebar-title">Eon Weaver</div>
        <p class="sidebar-subtitle">Campaign Manager</p>
        <div class="sidebar-usage" id="sidebar-usage"></div>
      </div>

      ${hasCampaign ? `
      <div class="sidebar-campaign" id="sidebar-campaign">
        <div class="campaign-selector" id="campaign-selector" data-tip="Click to switch campaigns">
          <span class="campaign-icon">📜</span>
          <div class="campaign-info">
            <span class="campaign-name" id="sidebar-campaign-name">${campaignName}</span>
            <span class="campaign-edition" id="sidebar-campaign-edition">${editionLabel}</span>
          </div>
          <span class="campaign-chevron">▾</span>
        </div>
        <div class="campaign-dropdown" id="campaign-dropdown" style="display:none;">
          <div class="campaign-dropdown-list" id="campaign-dropdown-list">Loading...</div>
          <div class="campaign-dropdown-actions">
            <button class="btn-sm btn-primary" id="campaign-manage-btn" data-tip="Open Settings to create, rename, or delete campaigns">⚙ Manage Campaigns</button>
          </div>
        </div>
      </div>

      <div class="sidebar-calendar" data-tip="In-world date; advances when you run World Simulate">
        <span class="calendar-icon">📅</span>
        <span class="calendar-text" id="sidebar-calendar-text">${calStr}</span>
      </div>

      <nav class="sidebar-nav" aria-label="Main navigation">
        ${navGroupsHtml(activeRoute)}
      </nav>
      ` : ''}

      ${state.user && state.user.subscription_tier === 'free' ? `
      <div id="sidebar-free-ad-slot" class="sidebar-free-ad-slot" aria-label="Advertisement"></div>
      ` : ''}

      <div class="sidebar-footer">
        <div class="sidebar-user" id="sidebar-user-info">
          ${state.user ? `👤 ${state.user.username}` : ''}
        </div>
        <button type="button" class="sidebar-bug-report" id="sidebar-bug-report-btn" data-tip="Send a bug report to the team (opens a short form)">🐛 Report Bug</button>
        <button type="button" class="sidebar-logout" id="sidebar-logout-btn" data-tip="Sign out of Eon Weaver">🚪 Sign Out</button>
      </div>
    </div>
  `;

  // Load usage meter into sidebar
  loadSidebarUsage();
  mountSidebarFreeAds(container);

  // Bind navigation clicks
  container.querySelectorAll('.nav-item[data-route]').forEach((btn) => {
    btn.addEventListener('click', () => navigate(btn.dataset.route));
  });
  bindNavGroupToggles(container);

  // Bug report button
  container.querySelector('#sidebar-bug-report-btn')?.addEventListener('click', () => {
    openBugReportModal();
  });

  // Campaign selector toggle
  const selector = container.querySelector('#campaign-selector');
  const dropdown = container.querySelector('#campaign-dropdown');
  selector?.addEventListener('click', async () => {
    const isOpen = dropdown.style.display !== 'none';
    if (isOpen) {
      dropdown.style.display = 'none';
    } else {
      dropdown.style.display = '';
      await loadCampaignDropdown(container);
    }
  });

  // Manage campaigns button
  container.querySelector('#campaign-manage-btn')?.addEventListener('click', () => {
    dropdown.style.display = 'none';
    navigate('settings');
  });
}

async function loadCampaignDropdown(container) {
  const listEl = container.querySelector('#campaign-dropdown-list');
  if (!listEl) return;
  try {
    const res = await apiGetCampaigns();
    const campaigns = res.campaigns || [];
    const state = getState();
    const activeCampaignId = state.currentCampaign?.id;

    if (campaigns.length === 0) {
      listEl.innerHTML = '<div class="muted" style="padding:0.5rem">No campaigns</div>';
      return;
    }

    listEl.innerHTML = campaigns.map(c => `
      <div class="campaign-dropdown-item${c.id == activeCampaignId ? ' active' : ''}" data-campaign-id="${c.id}">
        <span class="campaign-item-name">${c.name}</span>
        <span class="campaign-item-edition">${getEditionLabel(c.dnd_edition)}</span>
      </div>
    `).join('');

    // Click to switch
    listEl.querySelectorAll('.campaign-dropdown-item').forEach(item => {
      item.addEventListener('click', async () => {
        const cid = parseInt(item.dataset.campaignId);
        if (cid === activeCampaignId) return;
        try {
          const res = await apiSwitchCampaign(cid);
          if (res.campaign) {
            setState({ currentCampaign: res.campaign });
            setCurrentEdition(res.campaign.dnd_edition);
            clearSrdCache();
            // Re-render sidebar and reload current view
            renderSidebar(container.closest('#sidebar-container') || container);
            navigate('dashboard'); // Go to dashboard after switch
          }
        } catch (err) {
          alert('Failed to switch campaign: ' + err.message);
        }
      });
    });
  } catch (err) {
    listEl.innerHTML = '<div class="muted" style="padding:0.5rem">Error loading campaigns</div>';
  }
}

function getEditionLabel(edition) {
  const labels = { '3.5e': '3.5e', '5e': '5e 2014', '5e2024': '5e 2024' };
  return labels[edition] || edition || '';
}

function getCurrentActive() {
  const base = (import.meta.env?.BASE_URL || '/').replace(/\/$/, '');
  const pathname = window.location.pathname;
  let relative = pathname.replace(new RegExp('^' + base.replace(/\//g, '\\/')), '');
  relative = relative.replace(/^\//, '').replace(/\/$/, '');
  return relative.split('/')[0] || 'dashboard';
}

/**
 * Update just the calendar text in the sidebar.
 */
export function updateSidebarCalendar(calendar) {
  const el = document.getElementById('sidebar-calendar-text');
  if (el) el.textContent = calendarToString(calendar);
}

/**
 * Update the user display in the sidebar.
 */
export function updateSidebarUser(user) {
  const el = document.getElementById('sidebar-user-info');
  if (el) el.textContent = user ? `👤 ${user.username}` : '';
}

// Auto-update sidebar calendar whenever state.calendar changes
let _lastCalStr = '';
subscribe((state) => {
  if (state.calendar) {
    const newStr = calendarToString(state.calendar);
    if (newStr !== _lastCalStr) {
      _lastCalStr = newStr;
      const el = document.getElementById('sidebar-calendar-text');
      if (el) el.textContent = newStr;
    }
  }
});

/**
 * Load and display Eon Credits wallet in sidebar brand area.
 * Free tier: sidebar ad slot (AdSense or placeholder).
 */
let adsenseScriptLoaded = false;

function mountSidebarFreeAds(container) {
  const state = getState();
  const u = state.user;
  const slot = container.querySelector('#sidebar-free-ad-slot');
  if (!slot || !u || u.subscription_tier !== 'free') return;

  const client = u.adsense_client_id || '';
  const adSlot = u.adsense_slot_sidebar || '';

  if (client && adSlot) {
    if (!adsenseScriptLoaded) {
      adsenseScriptLoaded = true;
      const s = document.createElement('script');
      s.async = true;
      s.crossOrigin = 'anonymous';
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
      document.head.appendChild(s);
    }
    slot.innerHTML = `<ins class="adsbygoogle" style="display:block;min-height:90px" data-ad-client="${client.replace(/"/g, '&quot;')}" data-ad-slot="${String(adSlot).replace(/"/g, '&quot;')}" data-ad-format="horizontal" data-full-width-responsive="true"></ins>`;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      /* ignore */
    }
  } else {
    slot.innerHTML =
      '<div class="sidebar-ad-placeholder">Free tier · Ad revenue helps fund AI usage. Set ADSENSE_* in server config to enable Google ads here.</div>';
  }
}

async function loadSidebarUsage() {
  const el = document.getElementById('sidebar-usage');
  if (!el) return;
  try {
    const res = await apiGetUsage();
    if (!res.ok) return;
    const { tier_label, credit_balance, tokens_used_this_month } = res;
    /** DB stores raw LLM tokens; UI shows Token Credits (same scale as cost modal). */
    const balanceTc = rawTokensToTc(credit_balance);
    const usedTc = rawTokensToTc(tokens_used_this_month || 0);
    const balanceColor = balanceTc <= 0 ? '#ef4444' : balanceTc < 5 ? '#f59e0b' : '#22c55e';
    el.innerHTML = `
      <div class="sidebar-usage-row">
        <span class="sidebar-tier-badge tier-${res.tier}" data-tip="Your subscription tier">${tier_label}</span>
      </div>
      <div class="sidebar-credits-display" data-tip="Eon Credits (EC) — used for AI-heavy actions like simulation and Scribe">
        <span class="sidebar-credits-icon">🪙</span>
        <span class="sidebar-credits-value" style="color:${balanceColor}">${formatWalletTc(balanceTc)}</span>
        <span class="sidebar-credits-label">Eon Credits</span>
      </div>
      <div class="sidebar-usage-label" data-tip="Token-equivalent usage this calendar month">${formatMonthlyTcUsed(usedTc)} EC used this month</div>
    `;
  } catch (e) { /* silent */ }
}
