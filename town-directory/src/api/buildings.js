/**
 * Eon Weaver — Buildings & Rooms API module
 */
import { apiFetch } from './client.js';

export function apiGetBuildings(townId) {
    return apiFetch('get_buildings', { params: { town_id: townId } });
}

export function apiSaveBuilding(townId, building) {
    return apiFetch('save_building', { method: 'POST', body: { town_id: townId, building } });
}

export function apiDeleteBuilding(townId, buildingId) {
    return apiFetch('delete_building', { method: 'POST', body: { town_id: townId, building_id: buildingId } });
}

export function apiGetRooms(buildingId) {
    return apiFetch('get_rooms', { params: { building_id: buildingId } });
}

export function apiSaveRoom(buildingId, room) {
    return apiFetch('save_room', { method: 'POST', body: { building_id: buildingId, room } });
}

export function apiDeleteRoom(buildingId, roomId) {
    return apiFetch('delete_room', { method: 'POST', body: { building_id: buildingId, room_id: roomId } });
}

export function apiAssignCharacterBuilding(townId, characterId, buildingId) {
    return apiFetch('assign_character_building', {
        method: 'POST',
        body: { town_id: townId, character_id: characterId, building_id: buildingId }
    });
}
