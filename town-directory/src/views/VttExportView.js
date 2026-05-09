import { apiVttExportPayload } from '../api/vtt.js';
import { showToast } from '../components/Toast.js';

export default function VttExportView(container) {
  container.innerHTML = `
    <div class="view-simulation">
      <header class="view-header">
        <h1>🔶 VTT Export Framework</h1>
        <p class="view-subtitle">Generate JSON payloads compatible with future VTT adapters.</p>
      </header>
      <div class="dash-card" style="padding:1rem;">
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:flex-end;margin-bottom:0.5rem;">
          <div class="sim-field" style="max-width:200px;">
            <label>Adapter Preset</label>
            <select id="vtt-adapter" class="form-input">
              <option value="native">Native (Eon Weaver)</option>
              <option value="foundry_vtt">Foundry VTT (framework)</option>
              <option value="roll20">Roll20 (framework)</option>
            </select>
          </div>
        </div>
        <button class="btn-primary" id="vtt-generate">Generate export JSON</button>
        <button class="btn-secondary" id="vtt-copy" disabled>Copy JSON</button>
        <pre id="vtt-output" style="margin-top:0.75rem;max-height:30rem;overflow:auto;background:rgba(0,0,0,0.2);padding:0.75rem;border-radius:8px;"></pre>
      </div>
    </div>
  `;

  const generateBtn = container.querySelector('#vtt-generate');
  const copyBtn = container.querySelector('#vtt-copy');
  const out = container.querySelector('#vtt-output');
  let lastPayload = '';

  generateBtn.addEventListener('click', async () => {
    try {
      generateBtn.disabled = true;
      generateBtn.textContent = '⏳ Building…';
      const adapter = container.querySelector('#vtt-adapter').value;
      const payload = await apiVttExportPayload(adapter);
      lastPayload = JSON.stringify(payload, null, 2);
      out.textContent = lastPayload;
      copyBtn.disabled = false;
      showToast(`VTT framework payload generated (${adapter}).`, 'success');
    } catch (err) {
      out.textContent = err.message;
      showToast(err.message, 'error');
    } finally {
      generateBtn.disabled = false;
      generateBtn.textContent = 'Generate export JSON';
    }
  });

  copyBtn.addEventListener('click', async () => {
    if (!lastPayload) return;
    try {
      await navigator.clipboard.writeText(lastPayload);
      showToast('VTT JSON copied.', 'success');
    } catch (err) {
      showToast(`Copy failed: ${err.message}`, 'error');
    }
  });
}

