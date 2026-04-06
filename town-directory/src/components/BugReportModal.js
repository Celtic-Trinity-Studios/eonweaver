/**
 * Eon Weaver — Bug Report Modal
 * Lets users submit bug reports directly to the Discord #bug-reports channel.
 */
import { showModal } from './Modal.js';
import { showToast } from './Toast.js';
import { apiSubmitBugReport } from '../api/discord.js';

export function openBugReportModal() {
    const { el, close } = showModal({
        title: '🐛 Report a Bug',
        width: 'normal',
        content: `
      <form id="bug-report-form" class="bug-report-form">
        <div class="form-group">
          <label for="bug-title">Title <span class="required">*</span></label>
          <input type="text" id="bug-title" class="form-input" placeholder="Brief summary of the issue" required maxlength="200" autofocus>
        </div>

        <div class="form-group">
          <label for="bug-severity">Severity</label>
          <div class="severity-picker" id="severity-picker">
            <button type="button" class="severity-btn" data-severity="low" title="Low — cosmetic or minor">
              <span class="severity-dot severity-low"></span> Low
            </button>
            <button type="button" class="severity-btn active" data-severity="medium" title="Medium — feature not working correctly">
              <span class="severity-dot severity-medium"></span> Medium
            </button>
            <button type="button" class="severity-btn" data-severity="high" title="High — major feature broken">
              <span class="severity-dot severity-high"></span> High
            </button>
            <button type="button" class="severity-btn" data-severity="critical" title="Critical — data loss or app crash">
              <span class="severity-dot severity-critical"></span> Critical
            </button>
          </div>
        </div>

        <div class="form-group">
          <label for="bug-description">What happened?</label>
          <textarea id="bug-description" class="form-textarea" rows="3"
            placeholder="Describe what went wrong..."></textarea>
        </div>

        <div class="form-group">
          <label for="bug-steps">Steps to reproduce <span class="muted">(optional)</span></label>
          <textarea id="bug-steps" class="form-textarea" rows="3"
            placeholder="1. Go to...&#10;2. Click on...&#10;3. See error..."></textarea>
        </div>

        <div class="form-group">
          <label for="bug-page">Page/Feature <span class="muted">(optional)</span></label>
          <input type="text" id="bug-page" class="form-input" placeholder="e.g. Town Roster, Simulation, Character Sheet">
        </div>

        <div class="bug-report-actions">
          <button type="button" class="btn-secondary" id="bug-cancel-btn">Cancel</button>
          <button type="submit" class="btn-primary" id="bug-submit-btn">
            <span class="btn-text">📨 Send Report</span>
          </button>
        </div>

        <p class="bug-report-note">
          Reports are sent directly to our Discord server. Thank you for helping improve Eon Weaver!
        </p>
      </form>
    `,
    });

    let selectedSeverity = 'medium';

    // Severity picker buttons
    el.querySelectorAll('.severity-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            el.querySelectorAll('.severity-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedSeverity = btn.dataset.severity;
        });
    });

    // Cancel
    el.querySelector('#bug-cancel-btn')?.addEventListener('click', close);

    // Submit
    el.querySelector('#bug-report-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = el.querySelector('#bug-title').value.trim();
        const description = el.querySelector('#bug-description').value.trim();
        const steps = el.querySelector('#bug-steps').value.trim();
        const page = el.querySelector('#bug-page').value.trim();

        if (!title) {
            showToast('Please enter a title for the bug report.', 'warning');
            return;
        }

        const submitBtn = el.querySelector('#bug-submit-btn');
        submitBtn.disabled = true;
        submitBtn.querySelector('.btn-text').textContent = '⏳ Sending...';

        // Auto-detect browser info
        const browser = `${navigator.userAgent.slice(0, 200)}`;

        try {
            await apiSubmitBugReport(title, description, steps, selectedSeverity, page, browser);
            close();
            showToast('Bug report sent to Discord! Thank you. 🎉', 'success');
        } catch (err) {
            showToast('Failed to send bug report: ' + err.message, 'error');
            submitBtn.disabled = false;
            submitBtn.querySelector('.btn-text').textContent = '📨 Send Report';
        }
    });
}
