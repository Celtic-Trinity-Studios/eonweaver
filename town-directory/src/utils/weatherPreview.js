/** Render yearly weather grid into a container (Settings / legacy previews). */
export function renderWeatherPreviewInto(containerEl, weather) {
  if (!containerEl || !weather?.months) return;

  const weatherIcons = {
    clear: '☀️', sunny: '☀️', fair: '🌤️', cloudy: '☁️', overcast: '☁️',
    rain: '🌧️', heavy_rain: '🌧️', light_rain: '🌦️', drizzle: '🌦️',
    storm: '⛈️', thunderstorm: '⛈️', snow: '❄️', heavy_snow: '🌨️',
    blizzard: '🌨️', fog: '🌫️', mist: '🌫️', wind: '💨', hot: '🔥',
    cold: '🥶', mild: '🌤️', warm: '🌞', freezing: '🥶',
  };

  function getWeatherIcon(pattern) {
    if (!pattern) return '🌤️';
    const lower = pattern.toLowerCase();
    for (const [key, icon] of Object.entries(weatherIcons)) {
      if (lower.includes(key)) return icon;
    }
    return '🌤️';
  }

  containerEl.innerHTML = `
    <h4 style="margin:0.75rem 0 0.5rem;color:var(--text-secondary);">📅 Year ${weather.year || '—'} Weather</h4>
    <div class="setup-weather-grid">
      ${weather.months.map(m => `
        <div class="setup-weather-card">
          <div class="setup-weather-month">${getWeatherIcon(m.weather_pattern)} ${m.name || 'Month ' + m.month}</div>
          <div class="setup-weather-temp">${m.avg_temp || '—'}</div>
          <div class="setup-weather-pattern">${m.weather_pattern || '—'}</div>
          ${m.notable_events?.length ? `<div class="setup-weather-events">${m.notable_events.map(e => `<span class="setup-weather-event">• ${e}</span>`).join('')}</div>` : ''}
        </div>
      `).join('')}
    </div>
  `;
}
