/**
 * Eon Weaver — Relationship Network (full-page town graph)
 */
import { getState } from '../stores/appState.js';
import { navigate, appHref } from '../router.js';
import { apiGetTowns } from '../api/towns.js';
import { apiGetCharacters, normalizeCharacter } from '../api/characters.js';
import { apiGetSocialData } from '../api/social.js';
import { mountRelationshipGraph } from '../components/RelationshipGraph.js';

export default function RelationshipNetworkView(container, params) {
  const state = getState();
  const townId = params.id ? parseInt(params.id, 10) : state.currentTownId;
  let destroyGraph = null;

  if (!townId) {
    container.innerHTML = `<div class="view-empty"><h2>No Town Selected</h2><p>Select a town from the <a href="${appHref('dashboard')}">Dashboard</a> first.</p></div>`;
    return;
  }

  container.innerHTML = `
    <div class="view-relationship-network">
      <header class="view-header">
        <div class="view-header-left">
          <h1>Relationship Network</h1>
          <p class="view-subtitle" id="rn-town-label">Loading…</p>
        </div>
        <div class="view-header-right">
          <button type="button" class="btn-secondary btn-sm" id="rn-social-btn">🏘️ Town Social</button>
          <button type="button" class="btn-secondary btn-sm" id="rn-back-btn">Back to Town</button>
        </div>
      </header>
      <div class="rn-body" id="rn-body">
        <div class="stats-loading">Loading relationship network…</div>
      </div>
    </div>
  `;

  container.querySelector('#rn-back-btn')?.addEventListener('click', () => {
    navigate('town/' + townId);
  });
  container.querySelector('#rn-social-btn')?.addEventListener('click', async () => {
    const { openTownSocialPanel } = await import('../components/TownSocialPanel.js');
    openTownSocialPanel(townId);
  });

  loadNetwork(container, townId, (destroy) => {
    destroyGraph = destroy;
  });

  return () => {
    if (destroyGraph) {
      try { destroyGraph(); } catch (_) { /* ignore */ }
      destroyGraph = null;
    }
  };
}

async function loadNetwork(container, townId, onMounted) {
  const body = container.querySelector('#rn-body');
  const label = container.querySelector('#rn-town-label');
  try {
    const [townsRes, socialRes, charRes] = await Promise.all([
      apiGetTowns(),
      apiGetSocialData(townId),
      apiGetCharacters(townId),
    ]);
    const towns = Array.isArray(townsRes) ? townsRes : (townsRes.towns || []);
    const town = towns.find((t) => t.id == townId) || { name: 'Unknown' };
    if (label) label.textContent = town.name || 'Town';

    const relationships = socialRes.relationships || [];
    const characters = (charRes.characters || []).map(normalizeCharacter);

    if (!body) return;
    if (!relationships.length) {
      body.innerHTML = '<div class="social-empty"><div class="social-empty-icon">🤝</div>No NPC relationships tracked yet. Run a simulation or add links on character sheets.</div>';
      onMounted?.(null);
      return;
    }

    body.innerHTML = '<div class="rn-graph-host rel-graph-host" id="rn-graph-host"></div>';
    const host = body.querySelector('#rn-graph-host');
    const graph = mountRelationshipGraph(host, {
      relationships,
      characters,
      variant: 'page',
    });
    onMounted?.(graph?.destroy || null);
  } catch (err) {
    if (body) {
      body.innerHTML = `<div class="social-empty" style="color:var(--error)">Failed to load: ${err.message}</div>`;
    }
    onMounted?.(null);
  }
}
