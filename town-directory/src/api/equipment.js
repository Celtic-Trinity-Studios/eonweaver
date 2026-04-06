/**
 * Eon Weaver — Equipment API
 * CRUD operations for character equipment items.
 */
import { apiFetch } from './client.js';

/**
 * Get all equipment items for a character.
 */
export async function apiGetEquipment(characterId) {
    const res = await apiFetch(`get_equipment`, { params: { character_id: characterId } });
    return res.equipment || [];
}

/**
 * Save (create or update) an equipment item.
 */
export async function apiSaveEquipment(characterId, item) {
    return apiFetch('save_equipment', {
        method: 'POST',
        body: { character_id: characterId, item },
    });
}

/**
 * Delete an equipment item.
 */
export async function apiDeleteEquipment(characterId, itemId) {
    return apiFetch('delete_equipment', {
        method: 'POST',
        body: { character_id: characterId, item_id: itemId },
    });
}

/**
 * Equip an item to a specific slot.
 * Automatically unequips whatever was in that slot before.
 */
export async function apiEquipItem(characterId, itemId, slot) {
    return apiFetch('equip_item', {
        method: 'POST',
        body: { character_id: characterId, item_id: itemId, slot },
    });
}

/**
 * Unequip an item (move to backpack).
 */
export async function apiUnequipItem(characterId, itemId) {
    return apiFetch('unequip_item', {
        method: 'POST',
        body: { character_id: characterId, item_id: itemId },
    });
}
