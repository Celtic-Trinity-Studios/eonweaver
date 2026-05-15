    function stopMetricsLiveRefresh() {
        if (metricsLiveTimer) {
            clearInterval(metricsLiveTimer);
            metricsLiveTimer = null;
        }
    }

    function setMetricsLiveBadge() {
        const el = contentEl.querySelector('#metrics-live-badge');
        if (!el) return;
        const t = new Date();
        el.textContent = `Live · updated ${t.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}`;
        el.classList.remove('metrics-live-badge--error');
    }

    function markMetricsLiveError() {
        const el = contentEl.querySelector('#metrics-live-badge');
        if (!el) return;
        el.textContent = 'Refresh failed — retrying…';
        el.classList.add('metrics-live-badge--error');
    }

    function metricsLiveToolbarHtml(period, { compact = false } = {}) {
        const windowBtns = compact
            ? ''
            : `<span class="metrics-label">Window:</span>
            ${[7, 30, 90].map(p => `<button type="button" class="metrics-window-btn ${p === period ? 'active' : ''}" data-period="${p}">${p} days</button>`).join('')}`;
        return `
          <div class="metrics-toolbar metrics-toolbar-live">
            ${windowBtns}
            <span id="metrics-live-badge" class="metrics-live-badge" title="Charts refresh every ${ADMIN_METRICS_REFRESH_MS / 1000}s while this tab is open">Live · loading…</span>
          </div>`;
    }

    function wireMetricsWindowButtons() {
        contentEl.querySelectorAll('.metrics-window-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const p = parseInt(btn.dataset.period, 10) || 30;
                if (activeTab === 'overview') renderOverview(p);
                else renderMetrics(p);
            });
        });
    }

    function startMetricsLiveRefresh(period, mode) {
        stopMetricsLiveRefresh();
        metricsLivePeriod = period;
        metricsLiveTimer = setInterval(async () => {
            if (activeTab !== mode) return;
            try {
                if (mode === 'overview') await refreshOverviewLive(period);
                else await refreshMetricsLive(period);
            } catch (err) {
                console.warn('[admin] live metrics refresh failed', err);
                markMetricsLiveError();
            }
        }, ADMIN_METRICS_REFRESH_MS);
    }

    function primaryChartsHtml(m) {
        return `
            <div class="metric-card metric-card-wide" data-metric-chart="visitors">
              <div class="metric-title">Daily unique visitors</div>
              <div class="metric-chart-body">${sparkline(m.daily_visitors, '#60a5fa')}</div>
            </div>
            <div class="metric-card metric-card-wide" data-metric-chart="signups">
              <div class="metric-title">Daily signups</div>
              <div class="metric-chart-body">${sparkline(m.daily_signups, '#34d399')}</div>
            </div>
            <div class="metric-card metric-card-wide" data-metric-chart="tokens">
              <div class="metric-title">Daily AI tokens burned</div>
              <div class="metric-chart-body">${sparkline(m.daily_tokens, '#f59e0b', 'tokens')}</div>
            </div>`;
    }

    function patchMetricChart(key, html) {
        const card = contentEl.querySelector(`[data-metric-chart="${key}"] .metric-chart-body`);
        if (card) card.innerHTML = html;
    }

    async function refreshMetricsLive(period) {
        const m = await apiAdminMetrics(period);
        patchMetricChart('visitors', sparkline(m.daily_visitors, '#60a5fa'));
        patchMetricChart('signups', sparkline(m.daily_signups, '#34d399'));
        patchMetricChart('tokens', sparkline(m.daily_tokens, '#f59e0b', 'tokens'));
        const costCard = contentEl.querySelector('[data-metric-chart="cost_usd"] .metric-chart-body');
        if (costCard) costCard.innerHTML = sparkline(m.daily_cost_usd || [], '#22c55e', 'usd');
        setMetricsLiveBadge();
    }

    async function refreshOverviewLive(period) {
        const [overview, metrics] = await Promise.all([
            apiAdminOverview(),
            apiAdminMetrics(period),
        ]);
        const map = {
            total_users: overview.total_users,
            total_campaigns: overview.total_campaigns,
            total_towns: overview.total_towns,
            total_characters: overview.total_characters,
            monthly_tokens: formatTokens(overview.monthly_tokens),
            monthly_calls: overview.monthly_calls,
            active_users: `${overview.active_users} (${overview.month})`,
            monthly_cost: formatMonthlyCostCard(overview.monthly_cost_usd, overview.monthly_tokens),
        };
        Object.entries(map).forEach(([key, val]) => {
            const el = contentEl.querySelector(`[data-stat="${key}"] .stat-value`);
            if (el) el.textContent = val;
        });
        patchMetricChart('visitors', sparkline(metrics.daily_visitors, '#60a5fa'));
        patchMetricChart('signups', sparkline(metrics.daily_signups, '#34d399'));
        patchMetricChart('tokens', sparkline(metrics.daily_tokens, '#f59e0b', 'tokens'));
        setMetricsLiveBadge();
    }
