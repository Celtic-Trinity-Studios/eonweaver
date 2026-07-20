/**
 * Eon Weaver — Global App State
 * Simple observable store for app-wide state.
 */

const state = {
    user: null,
    currentCampaign: null,
    campaigns: [],
    currentTownId: null,
    currentTown: null,
    towns: [],
    calendar: null,
    selectedCharId: null,
    activeTab: 'combat',
    searchQuery: '',
    activeRaceFilter: null,
    activeClassFilter: null,
    activeBuildingFilter: null,
    activeStatusFilter: null,
    sortCol: 'name',
    sortDir: 'asc',
};

const listeners = new Set();

/**
 * Get a snapshot of the current state.
 */
export function getState() {
    return state;
}

/**
 * Update state and notify all listeners.
 */
export function setState(partial) {
    Object.assign(state, partial);
    for (const fn of listeners) {
        try { fn(state); } catch (e) { console.error('State listener error:', e); }
    }
}

/** True when the signed-in account is flagged debug (Admin → Members → Debug). */
export function userCanDebug() {
    const u = state.user;
    if (!u) return false;
    return u.is_debug === true || u.is_debug === 1 || u.is_debug === '1';
}

/**
 * Subscribe to state changes. Returns an unsubscribe function.
 */
export function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

/**
 * Reset state to defaults (e.g., on logout).
 */
export function resetState() {
    setState({
        user: null,
        currentCampaign: null,
        campaigns: [],
        currentTownId: null,
        currentTown: null,
        towns: [],
        calendar: null,
        selectedCharId: null,
        activeTab: 'combat',
        searchQuery: '',
        activeRaceFilter: null,
        activeClassFilter: null,
        activeBuildingFilter: null,
        activeStatusFilter: null,
        sortCol: 'name',
        sortDir: 'asc',
    });
}
