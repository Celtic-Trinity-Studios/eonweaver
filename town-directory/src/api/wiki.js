import { apiFetch } from './client.js';

export function apiWikiList({ q = '', category = '' } = {}) {
  const params = {};
  if (q) params.q = q;
  if (category) params.category = category;
  return apiFetch('wiki_list', { params });
}

export function apiWikiGet({ articleId = 0, slug = '' } = {}) {
  const params = {};
  if (articleId) params.article_id = articleId;
  if (slug) params.slug = slug;
  return apiFetch('wiki_get', { params });
}

export function apiWikiSave(article) {
  return apiFetch('wiki_save', {
    method: 'POST',
    body: { article },
  });
}

export function apiWikiDelete(articleId) {
  return apiFetch('wiki_delete', {
    method: 'POST',
    body: { article_id: articleId },
  });
}

export function apiWikiGraph({ category = '' } = {}) {
  const params = {};
  if (category) params.category = category;
  return apiFetch('wiki_graph', { params });
}

export function apiWikiAutolinkRefresh() {
  return apiFetch('wiki_autolink_refresh', { method: 'POST', body: {} });
}

export function apiWikiPendingList() {
  return apiFetch('wiki_pending_list');
}

export function apiWikiPendingResolve(pendingId, resolution) {
  return apiFetch('wiki_pending_resolve', {
    method: 'POST',
    body: { pending_id: pendingId, resolution },
  });
}

export function apiWikiIngest({ title = '', body, generatorType = 'lore', category = null, sourceRef = null } = {}) {
  return apiFetch('wiki_ingest', {
    method: 'POST',
    body: {
      title,
      body,
      generator_type: generatorType,
      category,
      source_ref: sourceRef,
    },
  });
}

export function apiWikiEntityPage({ entityType, entityId, title = '' }) {
  return apiFetch('wiki_entity_page', {
    method: 'POST',
    body: {
      entity_type: entityType,
      entity_id: entityId,
      title,
    },
  });
}
