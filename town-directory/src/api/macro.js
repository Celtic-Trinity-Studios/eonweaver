import { apiFetch } from './client.js';

export function apiMacroFrameworkOverview() {
  return apiFetch('macro_framework_overview');
}

export function apiMacroSimulateMonth(months = 1, note = '') {
  return apiFetch('macro_simulate_month', {
    method: 'POST',
    body: { months, note },
  });
}

export function apiMacroTownMetrics() {
  return apiFetch('macro_town_metrics');
}

export function apiMacroTradeRoutes() {
  return apiFetch('macro_trade_routes');
}

export function apiMacroWeatherLog(limit = 60) {
  return apiFetch('macro_weather_log', { params: { limit } });
}

export function apiMacroDemographics({ townId = 0, limit = 48 } = {}) {
  const params = { limit };
  if (townId) params.town_id = townId;
  return apiFetch('macro_demographics', { params });
}

