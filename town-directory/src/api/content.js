/**
 * Custom Content API module
 * CRUD for homebrew SRD content (races, classes, feats, spells, equipment)
 * and per-account file management.
 */
import { apiFetch } from './client.js';

// ── Homebrew Content ────────────────────────────────
export function apiGetCustomContent() {
    return apiFetch('get_custom_content');
}

export function apiSaveCustomRace(race) {
    return apiFetch('save_custom_race', { method: 'POST', body: { race } });
}

export function apiSaveCustomClass(cls) {
    return apiFetch('save_custom_class', { method: 'POST', body: { class: cls } });
}

export function apiSaveCustomFeat(feat) {
    return apiFetch('save_custom_feat', { method: 'POST', body: { feat } });
}

export function apiSaveCustomSpell(spell) {
    return apiFetch('save_custom_spell', { method: 'POST', body: { spell } });
}

export function apiSaveCustomEquipment(equipment) {
    return apiFetch('save_custom_equipment', { method: 'POST', body: { equipment } });
}

export function apiDeleteCustomContent(contentType, contentId) {
    return apiFetch('delete_custom_content', {
        method: 'POST',
        body: { content_type: contentType, content_id: contentId }
    });
}

// ── User Files (Content Library) ────────────────────
export function apiGetUserFiles() {
    return apiFetch('get_user_files');
}

export function apiDeleteUserFile(fileId) {
    return apiFetch('delete_user_file', { method: 'POST', body: { file_id: fileId } });
}

/**
 * Upload a file to the content library.
 * Uses FormData since we're uploading binary files.
 */
export async function apiUploadContent(file, fileType = 'document', description = '', campaignScoped = true) {
    const _base = (import.meta.env?.BASE_URL || '/').replace(/\/$/, '');
    const url = `${_base}/upload_content.php`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_type', fileType);
    formData.append('description', description);
    formData.append('campaign_scoped', campaignScoped ? '1' : '0');

    const res = await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        body: formData,
    });
    const data = await res.json();
    if (!res.ok || data.error) {
        throw new Error(data.error || `Upload error ${res.status}`);
    }
    return data;
}
