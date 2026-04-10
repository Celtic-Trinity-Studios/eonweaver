/**
 * Eon Weaver — SRD API Client + Data Loader
 * Fetches all SRD data from the database, filtered by edition.
 * Includes both raw API wrappers (used by SrdBrowserView)
 * and cached loaders + parsers (used by PartyView character creator).
 */
import { apiFetch } from './client.js';

/* ═══════════════════════════════════════════════════════════
   RAW API WRAPPERS (used by SrdBrowserView)
   ═══════════════════════════════════════════════════════════ */
export async function apiGetSrdRaces() { return apiFetch('srd_races'); }
export async function apiGetSrdClasses() { return apiFetch('srd_classes'); }
export async function apiGetSrdSkills() { return apiFetch('srd_skills'); }
export async function apiGetSrdFeats(search) {
    return search ? apiFetch(`srd_feats&search=${encodeURIComponent(search)}`) : apiFetch('srd_feats');
}
export async function apiGetSrdEquipment(search) {
    return search ? apiFetch(`srd_equipment&search=${encodeURIComponent(search)}`) : apiFetch('srd_equipment');
}
export async function apiGetSrdSpells(search) {
    return search ? apiFetch(`srd_spells&search=${encodeURIComponent(search)}`) : apiFetch('srd_spells');
}
export async function apiGetSrdSpellDetail(id) { return apiFetch(`srd_spell_detail&id=${id}`); }
export async function apiGetSrdMonsters(search) {
    return search ? apiFetch(`srd_monsters&search=${encodeURIComponent(search)}`) : apiFetch('srd_monsters');
}
export async function apiGetSrdMonsterDetail(id) { return apiFetch(`srd_monster_detail&id=${id}`); }
export async function apiGetSrdPowers(search) {
    return search ? apiFetch(`srd_powers&search=${encodeURIComponent(search)}`) : apiFetch('srd_powers');
}
export async function apiGetSrdPowerDetail(id) { return apiFetch(`srd_power_detail&id=${id}`); }
export async function apiGetSrdDomains() { return apiFetch('srd_domains'); }
export async function apiGetSrdItems(search) {
    return search ? apiFetch(`srd_items&search=${encodeURIComponent(search)}`) : apiFetch('srd_items');
}
export async function apiGetSrdItemDetail(id) { return apiFetch(`srd_item_detail&id=${id}`); }
export async function apiGetSrdClassProgression(className) {
    return apiFetch(`srd_class_progression&class_name=${encodeURIComponent(className)}`);
}

/* ═══════════════════════════════════════════════════════════
   EDITION STATE — tracks currently active edition
   ═══════════════════════════════════════════════════════════ */
let _currentEdition = null; // null = use server default from user settings

/** Get the current edition (may be null if not yet loaded) */
export function getCurrentEdition() { return _currentEdition; }

/** Set the active edition (called when settings load or change). Clears cache. */
export function setCurrentEdition(edition) {
    if (edition !== _currentEdition) {
        _currentEdition = edition;
        clearSrdCache(); // Different edition = different data
    }
}

/* ═══════════════════════════════════════════════════════════
   CACHED LOADERS (used by character creator)
   Cache is keyed by edition so switching editions loads fresh data
   ═══════════════════════════════════════════════════════════ */
const cache = {};

async function fetchCached(action) {
    const edition = _currentEdition || '3.5e';
    const cacheKey = `${action}__${edition}`;
    if (cache[cacheKey]) return cache[cacheKey];
    // Backend resolves edition from user settings, but we can also pass it explicitly
    const res = await apiFetch(action);
    cache[cacheKey] = res.data || [];
    // Update our edition from what the server actually used
    if (res.edition && !_currentEdition) _currentEdition = res.edition;
    return cache[cacheKey];
}

export async function loadSrdRaces() { return fetchCached('srd_races'); }
export async function loadSrdClasses() { return fetchCached('srd_classes'); }
export async function loadSrdFeats() { return fetchCached('srd_feats'); }
export async function loadSrdEquipment() { return fetchCached('srd_equipment'); }
export async function loadSrdSkills() { return fetchCached('srd_skills'); }

/* ═══════════════════════════════════════════════════════════
   MERGED LOADERS (SRD + Homebrew Custom Content)
   Used by Character Creator and any UI that needs the full
   set of available options including user custom content.
   ═══════════════════════════════════════════════════════════ */
let _customContentCache = null;
let _customContentLoading = null;

async function loadCustomContent() {
    if (_customContentCache) return _customContentCache;
    if (_customContentLoading) return _customContentLoading;
    _customContentLoading = (async () => {
        try {
            const { apiGetCustomContent } = await import('./content.js');
            const res = await apiGetCustomContent();
            _customContentCache = res.content || {};
        } catch (e) {
            _customContentCache = {};
        }
        _customContentLoading = null;
        return _customContentCache;
    })();
    return _customContentLoading;
}

/** Clear homebrew cache (call when user adds/edits/deletes custom content) */
export function clearCustomContentCache() {
    _customContentCache = null;
    _customContentLoading = null;
}

/**
 * Load SRD races merged with user's custom races.
 * Custom races are tagged with _isHomebrew: true.
 */
export async function loadMergedRaces() {
    const [srd, custom] = await Promise.all([loadSrdRaces(), loadCustomContent()]);
    const customRaces = (custom.custom_races || []).map(r => ({
        ...r,
        _isHomebrew: true,
    }));
    // Deduplicate by name (custom overrides SRD if same name)
    const byName = new Map();
    srd.forEach(r => byName.set(r.name.toLowerCase(), r));
    customRaces.forEach(r => byName.set(r.name.toLowerCase(), r));
    return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Load SRD classes merged with user's custom classes.
 * Custom classes are tagged with _isHomebrew: true.
 */
export async function loadMergedClasses() {
    const [srd, custom] = await Promise.all([loadSrdClasses(), loadCustomContent()]);
    const customClasses = (custom.custom_classes || []).map(c => ({
        ...c,
        _isHomebrew: true,
    }));
    const byName = new Map();
    srd.forEach(c => byName.set(c.name.toLowerCase(), c));
    customClasses.forEach(c => byName.set(c.name.toLowerCase(), c));
    return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Load SRD feats merged with user's custom feats.
 * Custom feats are tagged with _isHomebrew: true.
 */
export async function loadMergedFeats() {
    const [srd, custom] = await Promise.all([loadSrdFeats(), loadCustomContent()]);
    const customFeats = (custom.custom_feats || []).map(f => ({
        ...f,
        _isHomebrew: true,
    }));
    const byName = new Map();
    srd.forEach(f => byName.set(f.name.toLowerCase(), f));
    customFeats.forEach(f => byName.set(f.name.toLowerCase(), f));
    return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Load SRD equipment merged with user's custom equipment.
 * Custom equipment is tagged with _isHomebrew: true.
 */
export async function loadMergedEquipment() {
    const [srd, custom] = await Promise.all([loadSrdEquipment(), loadCustomContent()]);
    const customEquip = (custom.custom_equipment || []).map(e => ({
        ...e,
        _isHomebrew: true,
    }));
    const byName = new Map();
    srd.forEach(e => byName.set(e.name.toLowerCase(), e));
    customEquip.forEach(e => byName.set(e.name.toLowerCase(), e));
    return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}


/* ═══════════════════════════════════════════════════════════
   PARSERS (for DB format strings)
   ═══════════════════════════════════════════════════════════ */

/** Parse ability_mods string like "Con +2, Cha -2" into { con: 2, cha: -2 } */
export function parseAbilityMods(str) {
    const mods = {};
    if (!str || str === 'None' || str.startsWith('+1 feat')) return mods;
    for (const p of str.split(',').map(s => s.trim())) {
        const m = p.match(/^(Str|Dex|Con|Int|Wis|Cha)\s*([+-]\d+)$/i);
        if (m) {
            const key = m[1].toLowerCase() === 'int' ? 'int_' : m[1].toLowerCase();
            mods[key] = parseInt(m[2]);
        }
    }
    return mods;
}

/** Parse hit_die string like "d10" into number 10 */
export function parseHitDie(hd) {
    const m = (hd || '').match(/d(\d+)/); return m ? parseInt(m[1]) : 8;
}

/** Parse good_saves string like "Fort, Ref" into ['fort','ref'] */
export function parseGoodSaves(str) {
    if (!str || str === 'None') return [];
    return str.split(',').map(s => s.trim().toLowerCase());
}

/** Invalidate cache (for when custom content is added or edition changes) */
export function clearSrdCache() {
    Object.keys(cache).forEach(k => delete cache[k]);
}
