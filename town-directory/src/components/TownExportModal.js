/**
 * Town campaign docket export — PDF (readable) + Markdown (AI-ready).
 */
import { showModal } from './Modal.js';
import { showToast } from './Toast.js';
import { apiTownCampaignExport } from '../api/export.js';
import { formatTownExportMarkdown, townExportFilenameStem } from '../engine/townExportMarkdown.js';
import { exportTownCampaignPdf } from '../engine/townExportPdf.js';

function downloadText(text, filename, mime = 'text/markdown;charset=utf-8') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function countSummary(payload) {
  const town = payload.town || {};
  const social = town.social || {};
  return {
    characters: (town.characters || []).length,
    history: (town.history || []).length,
    buildings: (town.buildings || []).length,
    factions: (social.factions || []).length,
    incidents: (social.incidents || []).length,
    scribe: (payload.scribe_library || []).length,
    wiki: (payload.wiki || []).length,
  };
}

/**
 * Open the export modal for a town and build the docket.
 * @param {number|string} townId
 * @param {string} [townName]
 */
export async function openTownExportModal(townId, townName = '') {
  const { el, close } = showModal({
    title: `📤 Export Town Docket${townName ? `: ${townName}` : ''}`,
    width: 'wide',
    content: `
      <p class="muted" style="margin-top:0;">
        Packages this town’s history, places, factions, incidents, characters, scribe notes, and campaign wiki
        into documents you can read at the table or paste into an AI for session planning.
      </p>
      <div id="export-status" class="muted" style="margin:0.75rem 0;">Loading town data…</div>
      <div id="export-summary" style="display:none;margin:0.5rem 0;padding:0.75rem;background:rgba(0,0,0,0.15);border-radius:8px;font-size:0.9rem;"></div>
      <div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:1rem;">
        <button class="btn-primary" id="export-pdf-btn" disabled>📄 Download PDF</button>
        <button class="btn-secondary" id="export-md-btn" disabled>📝 Download Markdown</button>
        <button class="btn-secondary" id="export-copy-btn" disabled>📋 Copy Markdown</button>
      </div>
      <details style="margin-top:1rem;">
        <summary class="muted" style="cursor:pointer;">Preview Markdown</summary>
        <pre id="export-preview" style="max-height:18rem;overflow:auto;background:rgba(0,0,0,0.2);padding:0.75rem;border-radius:8px;white-space:pre-wrap;font-size:0.78rem;"></pre>
      </details>
    `,
  });

  const statusEl = el.querySelector('#export-status');
  const summaryEl = el.querySelector('#export-summary');
  const previewEl = el.querySelector('#export-preview');
  const pdfBtn = el.querySelector('#export-pdf-btn');
  const mdBtn = el.querySelector('#export-md-btn');
  const copyBtn = el.querySelector('#export-copy-btn');

  let payload = null;
  let markdown = '';

  try {
    payload = await apiTownCampaignExport(townId);
    markdown = formatTownExportMarkdown(payload);
    const c = countSummary(payload);
    statusEl.textContent = 'Ready to download.';
    statusEl.style.color = 'var(--success, #5aad6e)';
    summaryEl.style.display = 'block';
    summaryEl.innerHTML = `
      <strong>${payload.town?.name || townName || 'Town'}</strong>
      — ${c.characters} characters · ${c.history} history entries · ${c.buildings} buildings ·
      ${c.factions} factions · ${c.incidents} incidents · ${c.scribe} scribe · ${c.wiki} wiki
    `;
    previewEl.textContent = markdown;
    pdfBtn.disabled = false;
    mdBtn.disabled = false;
    copyBtn.disabled = false;
  } catch (err) {
    statusEl.textContent = `Failed to build export: ${err.message}`;
    statusEl.style.color = 'var(--error, #e05555)';
    showToast(err.message, 'error');
    return { close };
  }

  const stem = () => townExportFilenameStem(payload);

  pdfBtn.addEventListener('click', async () => {
    pdfBtn.disabled = true;
    pdfBtn.textContent = '⏳ Building PDF…';
    try {
      await exportTownCampaignPdf(payload);
      showToast('PDF downloaded.', 'success');
    } catch (err) {
      showToast(`PDF failed: ${err.message}`, 'error');
    } finally {
      pdfBtn.disabled = false;
      pdfBtn.textContent = '📄 Download PDF';
    }
  });

  mdBtn.addEventListener('click', () => {
    downloadText(markdown, `${stem()}.md`);
    showToast('Markdown downloaded.', 'success');
  });

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      showToast('Markdown copied to clipboard.', 'success');
    } catch (err) {
      showToast(`Copy failed: ${err.message}`, 'error');
    }
  });

  return { close, payload, markdown };
}
