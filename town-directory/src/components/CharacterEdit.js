/**
 * Eon Weaver — Character Edit Modal
 * Opens a modal for editing character fields, including portrait upload.
 */
import { showModal } from './Modal.js';
import { apiSaveCharacter, apiGetCharacters, normalizeCharacter } from '../api/characters.js';
import { getState, setState } from '../stores/appState.js';
import { showToast } from './Toast.js';

const FIELDS = [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'race', label: 'Race', type: 'text' },
    { key: 'class', label: 'Class', type: 'text' },
    { key: 'status', label: 'Status', type: 'select', options: ['Alive', 'Deceased', 'Missing', 'Imprisoned'] },
    { key: 'title', label: 'Title / Role', type: 'text' },
    { key: 'gender', label: 'Gender', type: 'text' },
    { key: 'age', label: 'Age', type: 'number' },
    { key: 'alignment', label: 'Alignment', type: 'text' },
    { key: 'hp', label: 'HP', type: 'number' },
    { key: 'ac', label: 'AC', type: 'text' },
    { key: 'init', label: 'Initiative', type: 'text' },
    { key: 'spd', label: 'Speed', type: 'text' },
    { key: 'str', label: 'STR', type: 'number' },
    { key: 'dex', label: 'DEX', type: 'number' },
    { key: 'con', label: 'CON', type: 'number' },
    { key: 'int_', label: 'INT', type: 'number' },
    { key: 'wis', label: 'WIS', type: 'number' },
    { key: 'cha', label: 'CHA', type: 'number' },
    { key: 'saves', label: 'Saves', type: 'text' },
    { key: 'atk', label: 'Attack', type: 'textarea' },
    { key: 'feats', label: 'Feats', type: 'textarea' },
    { key: 'skills_feats', label: 'Skills', type: 'textarea' },
    { key: 'languages', label: 'Languages', type: 'text' },
    { key: 'gear', label: 'Gear', type: 'textarea' },
    { key: 'role', label: 'Town Role', type: 'text' },
    { key: 'spouse', label: 'Spouse', type: 'text' },
    { key: 'history', label: 'History', type: 'textarea' },
];

export function openCharacterEditModal(character) {
    const fieldsHtml = FIELDS.map(f => {
        const val = character[f.key] || '';
        if (f.type === 'textarea') {
            return `<div class="form-group"><label>${f.label}</label><textarea id="ce-${f.key}" class="form-input" rows="2">${val}</textarea></div>`;
        }
        if (f.type === 'select') {
            return `<div class="form-group"><label>${f.label}</label><select id="ce-${f.key}" class="form-select">${(f.options || []).map(o => `<option ${o === val ? 'selected' : ''}>${o}</option>`).join('')}</select></div>`;
        }
        return `<div class="form-group"><label>${f.label}</label><input type="${f.type}" id="ce-${f.key}" value="${val}" class="form-input"></div>`;
    }).join('');

    // Portrait section
    const portraitHtml = `
      <div class="form-group" style="margin-top:1rem;">
        <label style="font-size:0.85rem;font-weight:600;">Portrait</label>
        <div class="edit-portrait-section">
          <div class="edit-portrait-preview-wrap">
            ${character.portrait_url
            ? `<img id="ce-portrait-preview" class="edit-portrait-preview" src="${character.portrait_url}" alt="portrait" onerror="this.style.display='none'">`
            : `<div class="edit-portrait-empty" id="ce-portrait-preview">🧙 No portrait</div>`}
          </div>
          <div class="edit-portrait-controls">
            <label class="portrait-upload-btn" style="display:inline-block;width:auto;padding:4px 14px">
              📁 ${character.portrait_url ? 'Replace' : 'Upload'} Portrait
              <input type="file" id="ce-portrait-file" accept="image/*" style="display:none">
            </label>
            <div id="ce-portrait-status" style="font-size:0.65rem;color:var(--text-muted);margin-top:4px"></div>
            <input type="hidden" id="ce-portrait_url" value="${character.portrait_url || ''}">
          </div>
        </div>
      </div>
    `;

    const html = `
    <form id="char-edit-form" class="auth-form">
      ${fieldsHtml}
      ${portraitHtml}
      <button type="submit" class="btn-primary">💾 Save Character</button>
    </form>
  `;

    const { el, close } = showModal({ title: `Edit: ${character.name}`, content: html, width: 'wide' });

    // Wire up portrait upload — client-side canvas resize + base64
    const fileInput = el.querySelector('#ce-portrait-file');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const status = el.querySelector('#ce-portrait-status');
            if (status) status.textContent = 'Processing...';
            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = new Image();
                img.onload = () => {
                    const MAX_W = 200, MAX_H = 270;
                    let w = img.width, h = img.height;
                    if (w > MAX_W || h > MAX_H) {
                        const scale = Math.min(MAX_W / w, MAX_H / h);
                        w = Math.round(w * scale);
                        h = Math.round(h * scale);
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
                    const urlInput = el.querySelector('#ce-portrait_url');
                    if (urlInput) urlInput.value = dataUrl;
                    const prev = el.querySelector('#ce-portrait-preview');
                    if (prev) prev.outerHTML = `<img id="ce-portrait-preview" class="edit-portrait-preview" src="${dataUrl}" alt="portrait">`;
                    if (status) status.textContent = '✅ Ready — click Save Character';
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    el.querySelector('#char-edit-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const updated = { id: character.id };
        FIELDS.forEach(f => {
            const input = el.querySelector(`#ce-${f.key}`);
            if (input) updated[f.key] = input.value;
        });
        // Include portrait_url
        const portraitInput = el.querySelector('#ce-portrait_url');
        if (portraitInput) updated.portrait_url = portraitInput.value;

        try {
            const townId = getState().currentTownId;
            await apiSaveCharacter(townId, updated);
            showToast('Character saved!', 'success');
            close();
        } catch (err) {
            showToast('Save failed: ' + err.message, 'error');
        }
    });
}
