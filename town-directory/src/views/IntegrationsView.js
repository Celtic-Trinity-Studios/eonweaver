import {
  apiIntegrationProcessJob,
  apiIntegrationQueueDiscord,
  apiIntegrationStatus,
  apiIntegrationUpdate,
} from '../api/integrations.js';
import { showToast } from '../components/Toast.js';

export default function IntegrationsView(container) {
  container.innerHTML = `
    <div class="view-simulation">
      <header class="view-header">
        <h1>🔶 Integrations Framework</h1>
        <p class="view-subtitle">Discord bot + ecosystem integration settings scaffold.</p>
      </header>
      <div class="dash-card" style="padding:1rem;margin-bottom:1rem;">
        <h3 style="margin:0 0 0.5rem;">Discord Bot Placeholder</h3>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
          <input id="discord-webhook-url" class="form-input" placeholder="Discord webhook URL (optional)" style="min-width:320px;flex:1;">
          <button class="btn-primary" id="discord-save">Save</button>
        </div>
        <p class="muted" style="margin:0.5rem 0 0;">Framework stores structured integration settings. Active bot runtime comes later.</p>
      </div>
      <div class="dash-card" style="padding:1rem;margin-bottom:1rem;">
        <h3 style="margin:0 0 0.5rem;">Discord Job Queue (Framework)</h3>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:flex-end;">
          <div class="sim-field" style="min-width:220px;">
            <label>Event Type</label>
            <input id="discord-event-type" class="form-input" value="macro_tick_complete">
          </div>
          <div class="sim-field" style="min-width:260px;flex:1;">
            <label>Payload JSON</label>
            <input id="discord-payload-json" class="form-input" value='{"source":"ui-test"}'>
          </div>
          <button class="btn-secondary" id="discord-queue-btn">Queue Discord Job</button>
        </div>
      </div>
      <div class="dash-card" style="padding:1rem;">
        <h3 style="margin:0 0 0.5rem;">Stored Integration Settings</h3>
        <pre id="integration-json" style="max-height:20rem;overflow:auto;background:rgba(0,0,0,0.2);padding:0.75rem;border-radius:8px;">Loading…</pre>
      </div>
    </div>
  `;

  const output = container.querySelector('#integration-json');
  const webhookInput = container.querySelector('#discord-webhook-url');

  async function refresh() {
    const res = await apiIntegrationStatus();
    output.textContent = JSON.stringify(res, null, 2);
    const savedUrl = res?.settings?.discord_bot?.value?.webhook_url || '';
    webhookInput.value = savedUrl;

    const jobs = res?.jobs || [];
    output.parentElement.querySelectorAll('.int-process-job').forEach((el) => el.remove());
    if (jobs.length) {
      const actions = document.createElement('div');
      actions.style.marginTop = '0.6rem';
      actions.style.display = 'flex';
      actions.style.flexWrap = 'wrap';
      actions.style.gap = '0.4rem';
      actions.innerHTML = jobs
        .filter((j) => j.status === 'queued')
        .slice(0, 8)
        .map((j) => `<button class="btn-secondary btn-sm int-process-job" data-job-id="${j.id}">Process job #${j.id}</button>`)
        .join('');
      output.parentElement.appendChild(actions);
      actions.querySelectorAll('.int-process-job').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const jobId = parseInt(btn.dataset.jobId || '0', 10);
          if (!jobId) return;
          try {
            await apiIntegrationProcessJob(jobId);
            showToast(`Integration job #${jobId} marked completed.`, 'success');
            await refresh();
          } catch (err) {
            showToast(err.message, 'error');
          }
        });
      });
    }
  }

  container.querySelector('#discord-save').addEventListener('click', async () => {
    try {
      await apiIntegrationUpdate('discord_bot', {
        webhook_url: webhookInput.value.trim(),
        enabled: !!webhookInput.value.trim(),
      });
      showToast('Discord integration setting saved.', 'success');
      await refresh();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  container.querySelector('#discord-queue-btn').addEventListener('click', async () => {
    try {
      const eventType = container.querySelector('#discord-event-type').value.trim() || 'manual_ping';
      let payload = {};
      const raw = container.querySelector('#discord-payload-json').value.trim();
      if (raw) {
        payload = JSON.parse(raw);
      }
      const res = await apiIntegrationQueueDiscord(eventType, payload);
      showToast(`Discord job queued (#${res.job_id}).`, 'success');
      await refresh();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  refresh().catch((err) => {
    output.textContent = err.message;
  });
}

