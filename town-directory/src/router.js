/**
 * Eon Weaver — History-Based Router (No Hash)
 * Uses clean URLs throughout:
 *   /dev/dashboard
 *   /dev/settings
 *   /dev/sunday/yart (campaign-name/town-name)
 */
import { getState, subscribe } from './stores/appState.js';
import { pingVisit } from './utils/visitMetrics.js';

const routes = {};
let currentCleanup = null;
let routerInitialized = false;

const slugify = str => (str || '').toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/** Detect base path from Vite's import.meta */
function getBasePath() {
    const base = (import.meta.env?.BASE_URL || '/').replace(/\/$/, '');
    return base; // e.g. '/dev' or ''
}

/**
 * Build an absolute path for `<a href>` that respects `BASE_URL`
 * (production `/` vs staging `/dev/`). Pass route without leading slash, e.g. `dashboard`, `town/42`.
 */
export function appHref(routePath) {
    const base = getBasePath();
    const clean = String(routePath || '').replace(/^\/+/, '');
    if (!clean) return base || '/';
    const joined = base ? `${base}/${clean}` : `/${clean}`;
    return joined.replace(/\/+/g, '/');
}

/**
 * Register a route handler.
 */
export function registerRoute(path, handler) {
    routes[path] = handler;
}

/** Clear route table so the next login can register player vs admin routes (SPA logout/login). */
export function resetRegisteredRoutes() {
    Object.keys(routes).forEach((k) => delete routes[k]);
}

/**
 * Navigate to a route programmatically.
 */
export function navigate(path) {
    const base = getBasePath();
    const cleanPath = path.replace(/^#\/?/, ''); // Handle legacy #/ calls if any exist
    
    const targetURL = `${base}/${cleanPath}`.replace(/\/+/g, '/');
    
    window.history.pushState({}, '', targetURL);
    handleRoute();
}

/**
 * Get current route info.
 */
export function getCurrentRoute() {
    return parseURL(window.location.pathname);
}

/**
 * Parse URL pathname into { path, params }.
 */
function parseURL(pathname) {
    const base = getBasePath();
    // Remove base from start
    let relative = pathname.replace(new RegExp('^' + base.replace(/\//g, '\\/')), '');
    relative = relative.replace(/^\//, '').replace(/\/$/, '');
    
    const parts = relative.split('/').filter(Boolean);
    const path = parts[0] || 'dashboard';
    const params = {};

    // Special handling for clean campaign/town strings: /dev/slug/slug (2 parts)
    // If it's 2 parts and the first part isn't a known route, treat as campaign/town
    if (parts.length === 2 && !routes[parts[0]]) {
        // This is a "clean" URL. We'll return it as a special state to be resolved
        return { path: 'clean_town', params: { campaignSlug: parts[0], townSlug: parts[1] } };
    }

    // Technical routes: /dev/town/42
    if (path === 'town' && parts[1]) {
        params.id = parts[1];
    } else if (parts[1]) {
        params.id = parts[1];
    }

    return { path, params };
}

/**
 * Handle a route change — unmount current view, mount new one.
 */
function handleRoute() {
    const container = document.getElementById('app-content');
    if (!container) return;

    const { path, params } = parseURL(window.location.pathname);
    
    // If it's a clean URL, we need to resolve it to a real town ID
    if (path === 'clean_town') {
        resolveAndNavigateClean(params);
        return; // handleRoute will be called again via navigate once resolved
    }

    const handler = routes[path];

    if (currentCleanup && typeof currentCleanup === 'function') {
        currentCleanup();
    }
    currentCleanup = null;

    if (!handler) {
        container.innerHTML = `<div class="view-empty"><h2>Page not found</h2><p>Path "${path}" does not exist.</p></div>`;
        return;
    }

    container.innerHTML = '';
    currentCleanup = handler(container, params) || null;

    // Update sidebar active state
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.route === path);
    });

    // Expand the nav group that contains the active item (grouped sidebar)
    document.querySelectorAll('.sidebar-nav-group').forEach((group) => {
        const hasActive = group.querySelector('.nav-item.active');
        if (!hasActive) return;
        group.classList.remove('is-collapsed');
        const toggle = group.querySelector('.nav-group-toggle');
        if (toggle) toggle.setAttribute('aria-expanded', 'true');
    });

    // Anonymous pageview ping (server-side metrics, deduped per session)
    pingVisit(path);
}

/**
 * Listen for data load to resolve a clean URL (slugs) to a numeric town ID.
 */
function resolveAndNavigateClean({ campaignSlug, townSlug }) {
    window.__pendingCleanRoute = { campaignSlug, townSlug };
    
    // Set a "loading" or empty state while we wait for sync
    const container = document.getElementById('app-content');
    if (container) container.innerHTML = '<div class="view-empty"><h2>Loading Town...</h2></div>';

    const check = () => {
        const state = getState();
        if (!state.towns?.length || !state.currentCampaign) return;

        const { campaignSlug, townSlug } = window.__pendingCleanRoute;
        
        if (slugify(state.currentCampaign.name) === campaignSlug) {
            const town = state.towns.find(t => slugify(t.name) === townSlug);
            if (town) {
                // Resolved! Unsubscribe and navigate to the technical route (which handleRoute will then rewrite)
                unsubscribeCheck();
                delete window.__pendingCleanRoute;
                // Use replaceState so resolving doesn't add to history
                window.history.replaceState({}, '', `${getBasePath()}/town/${town.id}`);
                handleRoute();
            }
        }
    };

    const unsubscribeCheck = subscribe(check);
    check();
}

/**
 * Cosmetically rewrite technical town routes /town/42 to clean slugs /dev/campaign/town
 */
function checkAndRewriteURL(state) {
    if (!state.currentTown || !state.currentCampaign) return;

    const campaignSlug = slugify(state.currentCampaign.name);
    const townSlug = slugify(state.currentTown.name);
    const base = getBasePath();
    const desiredPath = `${base}/${campaignSlug}/${townSlug}`.replace(/\/+/g, '/');

    const { path } = parseURL(window.location.pathname);
    
    // If we are currently viewing the town technical route, rewrite to pretty
    if (path === 'town') {
        if (window.location.pathname !== desiredPath) {
            window.history.replaceState(
                { route: 'town', townId: state.currentTown.id },
                '',
                desiredPath
            );
        }
    }
}

/**
 * Initialize the router — listen for back/forward buttons and handle clean URLs.
 */
export function initRouter() {
    if (!routerInitialized) {
        routerInitialized = true;
        window.addEventListener('popstate', handleRoute);

        // Subscribe to state changes for cosmetic URL rewriting
        subscribe(checkAndRewriteURL);
    }

    // Handle initial route
    const base = getBasePath();
    const pathname = window.location.pathname;
    
    // Redirect /dev or /dev/ to /dev/dashboard
    if (pathname === base || pathname === base + '/') {
        window.history.replaceState({}, '', base + '/dashboard');
    }
    
    handleRoute();
}
