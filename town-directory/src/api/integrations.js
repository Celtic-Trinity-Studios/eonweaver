import { apiFetch } from './client.js';

export function apiIntegrationStatus() {
  return apiFetch('integration_status');
}

export function apiIntegrationUpdate(keyName, value) {
  return apiFetch('integration_update', {
    method: 'POST',
    body: { key_name: keyName, value },
  });
}

export function apiIntegrationQueueDiscord(eventType, payload = {}) {
  return apiFetch('integration_queue_discord', {
    method: 'POST',
    body: { event_type: eventType, payload },
  });
}

export function apiIntegrationProcessJob(jobId) {
  return apiFetch('integration_process_job', {
    method: 'POST',
    body: { job_id: jobId },
  });
}

export function apiIntegrationTestDiscord() {
  return apiFetch('integration_test_discord', { method: 'POST', body: {} });
}

