/**
 * Towns API module
 */
import { apiFetch } from './client.js';

export function apiGetTowns() {
    return apiFetch('towns');
}

export function apiCreateTown(name, subtitle) {
    return apiFetch('create_town', { method: 'POST', body: { name, subtitle } });
}

export function apiUpdateTown(townId, name, subtitle) {
    return apiFetch('update_town', { method: 'POST', body: { town_id: townId, name, subtitle } });
}

export function apiDeleteTown(townId) {
    return apiFetch('delete_town', { method: 'POST', body: { town_id: townId } });
}

export function apiPurgePopulation(townId, purgePop = true, purgeBld = false) {
    return apiFetch('purge_population', { method: 'POST', body: { town_id: townId, purge_population: purgePop, purge_buildings: purgeBld } });
}

export function apiGetHistory(townId) {
    return apiFetch('history', { params: { town_id: townId } });
}

export function apiSaveHistory(townId, entries) {
    return apiFetch('save_history', { method: 'POST', body: { town_id: townId, entries } });
}

export function apiGetTownMeta(townId) {
    return apiFetch('town_meta', { params: { town_id: townId } });
}

export function apiSaveTownMeta(townId, key, value) {
    return apiFetch('save_meta', { method: 'POST', body: { town_id: townId, key, value } });
}
