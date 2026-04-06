/**
 * Characters API module
 */
import { apiFetch, simFetch } from './client.js';

export function apiGetCharacters(townId) {
    return apiFetch('characters', { params: { town_id: townId } });
}

export function apiSaveCharacter(townId, character) {
    return apiFetch('save_character', { method: 'POST', body: { town_id: townId, character } });
}

export function apiLevelUpCharacter(townId, characterId) {
    return simFetch('level_up', { town_id: townId, character_id: characterId });
}

export function apiDeleteCharacter(townId, characterId) {
    return apiFetch('delete_character', { method: 'POST', body: { town_id: townId, character_id: characterId } });
}

export function apiMoveCharacter(characterId, fromTownId, toTownId) {
    return apiFetch('move_character', { method: 'POST', body: { character_id: characterId, from_town_id: fromTownId, to_town_id: toTownId } });
}

export function apiGetXpLog(characterId) {
    return apiFetch('get_xp_log', { params: { character_id: characterId } });
}

/**
 * Normalize a raw character row from the API into a consistent shape.
 */
export function normalizeCharacter(r) {
    return {
        id: r.id,
        dbId: r.id,
        name: r.name || '',
        race: r.race || '',
        class: r.class || '',
        level: r.level ? parseInt(r.level) : 0,
        status: r.status || 'Alive',
        title: r.title || '',
        gender: r.gender || '',
        spouse: r.spouse || 'None',
        spouseLabel: r.spouse_label || '',
        age: r.age ? String(r.age) : '',
        xp: r.xp ? String(r.xp) : '',
        cr: r.cr || '',
        ecl: r.ecl || '',
        hp: r.hp ? String(r.hp) : '',
        hd: r.hd || '',
        ac: r.ac || '',
        init: r.init || '',
        spd: r.spd || '',
        grapple: r.grapple || '',
        atk: r.atk || '',
        alignment: r.alignment || '',
        saves: r.saves || '',
        str: r.str ? String(r.str) : '',
        dex: r.dex ? String(r.dex) : '',
        con: r.con ? String(r.con) : '',
        int_: r.int_ ? String(r.int_) : '',
        wis: r.wis ? String(r.wis) : '',
        cha: r.cha ? String(r.cha) : '',
        languages: r.languages || '',
        skills_feats: r.skills_feats || '',
        feats: r.feats || '',
        gear: r.gear || '',
        role: r.role || '',
        history: r.history || '',
        portrait_url: r.portrait_url || '',
        portrait_prompt: r.portrait_prompt || '',
        ai_data: r.ai_data || '',
        months_in_town: r.months_in_town ? parseInt(r.months_in_town) : 0,
        building_id: r.building_id || null,
    };
}
