import { apiFetch } from './client.js';

export function apiWikiList() {
  return apiFetch('wiki_list');
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

export function apiWikiGraph() {
  return apiFetch('wiki_graph');
}

export function apiWikiAutolinkRefresh() {
  return apiFetch('wiki_autolink_refresh', { method: 'POST', body: {} });
}

