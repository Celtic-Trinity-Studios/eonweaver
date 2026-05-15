import {
  apiIntegrationProcessJob,
  apiIntegrationQueueDiscord,
  apiIntegrationStatus,
  apiIntegrationTestDiscord,
  apiIntegrationUpdate,
} from '../api/integrations.js';
import { showToast } from '../components/Toast.js';

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatWhen(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function IntegrationsView(container) {
  let webhookConfigured = false;

  container.innerHTML = `
    <div class="view-integrations">
      <header class="view-header">
        <h1>🤖 Integrations</h1>
        <p class="view-subtitle">Connect Discord webhooks and queue integration jobs per campaign. Secrets are stored server-side and never echoed back in full.</p>
      </header>

      <section class="integrations-card">
        <h2 class="integrations-card-title">Discord webhook</h2>
        <p class="integrations-hint muted">Post simulation or macro events to a Discord channel. Create a webhook in your server channel → Integrations → Webhooks.</p>
        <div class="integrations-form-row">
          <div class="form-group integrations-webhook-field">
            <label for="discord-webhook-url">Webhook URL</label>
            <input id="discord-webhook-url" class="form-input" type="url" autocomplete="off" spellcheck="false"
              placeholder="https://discord.com/api/webhooks/…">
            <small id="discord-webhook-hint" class="settings-hint"></small>
          </div>
          <label class="settings-checkbox-label integrations-enabled-toggle">
            <input type="checkbox" id="discord-enabled" />
            <span>Enabled</span>
          </label>
        </div>
        <div class="integrations-actions">
          <button type="button" class="btn-primary" id="discord-save">Save</button>
          <button type="button" class="btn-secondary" id="discord-test-btn" disabled>Test connection</button>
        </div>
        <p id="integrations-status" class="integrations-status" aria-live="polite"></p>
      </section>

      <section class="integrations-card">
        <h2 class="integrations-card-title">Discord job queue</h2>
        <p class="integrations-hint muted">Framework queue for future bot automation. Process queued jobs manually for now.</p>
        <div class="integrations-form-row">
          <div class="form-group">
            <label for="discord-event-type">Event type</label>
            <input id="discord-event-type" class="form-input" value="macro_tick_complete">
          </div>
          <div class="form-group integrations-payload-field">
            <label for="discord-payload-json">Payload JSON</label>
            <input id="discord-payload-json" class="form-input" value='{"source":"ui-test"}'>
          </div>
          <button type="button" class="btn-secondary" id="discord-queue-btn">Queue job</button>
        </div>
        <div id="integrations-jobs-wrap" class="integrations-jobs-wrap">
          <p class="muted">Loading jobs…</p>
        </div>
      </section>

      <section class="integrations-card">
        <h2 class="integrations-card-title">Other integrations</h2>
        <p class="integrations-hint muted">VTT export targets and player portal links are configured on their respective pages. Supported keys: <code>discord_bot</code>, <code>vtt_export_targets</code>, <code>player_portal_links</code>.</p>
        <dl id="integrations-settings-summary" class="integrations-settings-summary">Loading…</dl>
      </section>
    </div>`;

  const webhookInput = container.querySelector('#discord-webhook-url');
  const webhookHint = container.querySelector('#discord-webhook-hint');
  const enabledToggle = container.querySelector('#discord-enabled');
  const testBtn = container.querySelector('#discord-test-btn');
  const statusEl = container.querySelector('#integrations-status');
  const jobsWrap = container.querySelector('#integrations-jobs-wrap');
  const settingsSummary = container.querySelector('#integrations-settings-summary');

  function setStatus(msg, kind = 'muted') {
    if (!statusEl) return;
    statusEl.textContent = msg || '';
    statusEl.className = `integrations-status integrations-status--${kind}`;
  }

  function updateTestButton() {
    if (!testBtn) return;
    const hasNewUrl = !!webhookInput?.value.trim();
    testBtn.disabled = !(webhookConfigured || hasNewUrl) || !enabledToggle?.checked;
  }

  function renderJobs(jobs) {
    if (!jobs?.length) {
      jobsWrap.innerHTML = '<p class="muted">No jobs queued yet.</p>';
      return;
    }
    const rows = jobs
      .map(
        (j) => `
      <tr>
        <td>#${escHtml(j.id)}</td>
        <td><code>${escHtml(j.job_type || '')}</code></td>
        <td><span class="integrations-job-status integrations-job-status--${escHtml(j.status || 'unknown')}">${escHtml(j.status || '')}</span></td>
        <td>${escHtml(formatWhen(j.created_at))}</td>
        <td>${
          j.status === 'queued'
            ? `<button type="button" class="btn-secondary btn-sm int-process-job" data-job-id="${escHtml(j.id)}">Process</button>`
            : '—'
        }</td>
      </tr>`
      )
      .join('');
    jobsWrap.innerHTML = `
      <div class="integrations-table-wrap">
        <table class="integrations-jobs-table">
          <thead>
            <tr><th>ID</th><th>Type</th><th>Status</th><th>Created</th><th></th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
    jobsWrap.querySelectorAll('.int-process-job').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const jobId = parseInt(btn.dataset.jobId || '0', 10);
        if (!jobId) return;
        try {
          await apiIntegrationProcessJob(jobId);
          showToast(`Job #${jobId} completed.`, 'success');
          await refresh();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  }

  function renderSettingsSummary(settings, supported) {
    const keys = supported?.length ? supported : Object.keys(settings || {});
    if (!keys.length) {
      settingsSummary.innerHTML = '<p class="muted">No integration keys.</p>';
      return;
    }
    settingsSummary.innerHTML = keys
      .map((key) => {
        const row = settings?.[key];
        const updated = row?.updated_at ? formatWhen(row.updated_at) : 'Not configured';
        const val = row?.value;
        let detail = 'Not configured';
        if (key === 'discord_bot' && val) {
          const on = val.enabled ? 'On' : 'Off';
          const hook = val.webhook_configured
            ? `Webhook ${escHtml(val.webhook_hint || 'saved')}`
            : 'No webhook';
          detail = `${on} · ${hook}`;
        } else if (val && typeof val === 'object') {
          detail = `${Object.keys(val).length} field(s) saved`;
        } else if (val) {
          detail = 'Configured';
        }
        return `<div><dt>${escHtml(key)}</dt><dd>${detail} <span class="muted">(${escHtml(updated)})</span></dd></div>`;
      })
      .join('');
  }

  async function refresh() {
    const res = await apiIntegrationStatus();
    const discord = res?.settings?.discord_bot?.value || {};
    webhookConfigured = !!discord.webhook_configured;
    webhookInput.value = '';
    webhookInput.placeholder = webhookConfigured
      ? 'Webhook saved — paste a new URL to replace'
      : 'https://discord.com/api/webhooks/…';
    webhookHint.textContent = webhookConfigured
      ? `Saved webhook ${discord.webhook_hint || ''}. Leave URL blank to keep it.`
      : 'Full URL is only sent when you save; it is not shown again.';
    enabledToggle.checked = !!discord.enabled;
    updateTestButton();
    renderJobs(res?.jobs || []);
    renderSettingsSummary(res?.settings || {}, res?.supported);
    setStatus('');
  }

  webhookInput?.addEventListener('input', updateTestButton);
  enabledToggle?.addEventListener('change', updateTestButton);

  container.querySelector('#discord-save')?.addEventListener('click', async () => {
    const url = webhookInput.value.trim();
    const enabled = !!enabledToggle.checked;
    if (enabled && !url && !webhookConfigured) {
      showToast('Enter a webhook URL or disable the integration.', 'error');
      return;
    }
    setStatus('Saving…', 'loading');
    try {
      const payload = { enabled };
      if (url) {
        payload.webhook_url = url;
      } else if (webhookConfigured) {
        payload.keep_webhook = true;
      }
      await apiIntegrationUpdate('discord_bot', payload);
      showToast('Discord integration saved.', 'success');
      setStatus('Saved.', 'success');
      await refresh();
    } catch (err) {
      setStatus(err.message, 'error');
      showToast(err.message, 'error');
    }
  });

  testBtn?.addEventListener('click', async () => {
    setStatus('Sending test message…', 'loading');
    testBtn.disabled = true;
    try {
      const res = await apiIntegrationTestDiscord();
      setStatus(res?.message || 'Test sent.', 'success');
      showToast(res?.message || 'Test message sent.', 'success');
    } catch (err) {
      setStatus(err.message, 'error');
      showToast(err.message, 'error');
    } finally {
      updateTestButton();
    }
  });

  container.querySelector('#discord-queue-btn')?.addEventListener('click', async () => {
    try {
      const eventType = container.querySelector('#discord-event-type').value.trim() || 'manual_ping';
      let payload = {};
      const raw = container.querySelector('#discord-payload-json').value.trim();
      if (raw) payload = JSON.parse(raw);
      const res = await apiIntegrationQueueDiscord(eventType, payload);
      showToast(`Discord job queued (#${res.job_id}).`, 'success');
      await refresh();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  refresh().catch((err) => {
    setStatus(err.message, 'error');
    jobsWrap.innerHTML = `<p class="subscription-error">${escHtml(err.message)}</p>`;
    settingsSummary.innerHTML = '<p class="muted">Unavailable</p>';
  });
}
