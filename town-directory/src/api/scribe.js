/**
 * Eon Weaver — Scribe API Client
 * Interfaces with scribe_actions.php for AI Scribe Phase 3 features.
 */
import { simFetch } from './client.js';

export function apiScribeGenerate(townId, generatorType, params) {
    return simFetch('scribe_generate', { town_id: townId, generator_type: generatorType, ...params });
}

export function apiScribeSave(townId, contentId, generatorType, generatedData) {
    return simFetch('scribe_save', { town_id: townId, content_id: contentId, generator_type: generatorType, generated_data: generatedData });
}

export function apiScribeGetHistory(townId) {
    return simFetch('scribe_get_history', { town_id: townId });
}
