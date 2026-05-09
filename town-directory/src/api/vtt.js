import { apiFetch } from './client.js';

export function apiVttExportPayload(adapter = 'native') {
  return apiFetch('vtt_export_payload', { params: { adapter } });
}

