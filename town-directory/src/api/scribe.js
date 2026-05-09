/**
 * Eon Weaver — Scribe API Client
 * Interfaces with scribe_actions.php for AI Scribe Phase 3 features.
 */
import { simFetch } from './client.js';

export function apiScribeGenerate(townId, generatorType, params) {
    return simFetch('scribe_generate', { town_id: townId, generator_type: generatorType, ...params });
}

export function apiScribeSave(townId, contentId, generatorType, generatedData, opts = {}) {
    const body = {
        town_id: townId,
        content_id: contentId,
        generator_type: generatorType,
        generated_data: generatedData,
    };
    if (opts.title) body.title = opts.title;
    return simFetch('scribe_save', body);
}

export function apiScribeGetHistory(townId = 0) {
    return simFetch('scribe_get_history', { town_id: townId });
}

export function apiScribeLibraryGet(id) {
    return simFetch('scribe_library_get', { id });
}

export function apiScribeDelete(id) {
    return simFetch('scribe_delete', { id });
}
