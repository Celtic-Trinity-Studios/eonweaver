/**
 * SVG sparklines for admin metrics (Overview / Metrics tabs).
 */

export function createAdminSparkline() {
    const compactNum = (n) => {
        n = Number(n) || 0;
        const abs = Math.abs(n);
        if (abs >= 1e9) return (n / 1e9).toFixed(abs >= 1e10 ? 0 : 1).replace(/\.0$/, '') + 'B';
        if (abs >= 1e6) return (n / 1e6).toFixed(abs >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
        if (abs >= 1e3) return (n / 1e3).toFixed(abs >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'K';
        return String(Math.round(n));
    };

    const niceNum = (range, round) => {
        if (range <= 0) return 1;
        const exp = Math.floor(Math.log10(range));
        const f = range / Math.pow(10, exp);
        let nf;
        if (round) nf = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10;
        else nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
        return nf * Math.pow(10, exp);
    };

    const niceTicks = (min, max, count = 5) => {
        if (max <= min) max = min + 1;
        const range = niceNum(max - min, false);
        const step = niceNum(range / (count - 1), true);
        const niceMin = Math.floor(min / step) * step;
        const niceMax = Math.ceil(max / step) * step;
        const ticks = [];
        for (let v = niceMin; v <= niceMax + step * 0.5; v += step) ticks.push(v);
        return { ticks, niceMin, niceMax };
    };

    const formatDateShort = (iso) => {
        const d = new Date(iso + 'T00:00:00');
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    const formatUsdAxis = (v) => {
        const n = Number(v) || 0;
        if (n === 0) return '$0';
        if (Math.abs(n) < 0.000001) return `$${n.toExponential(1)}`;
        if (Math.abs(n) < 0.01) return `$${n.toFixed(6).replace(/\.?0+$/, '')}`;
        if (Math.abs(n) < 1) return `$${n.toFixed(4).replace(/\.0+$/, '')}`;
        return `$${n.toFixed(2).replace(/\.0+$/, '')}`;
    };

    /** @param {'tokens'|'usd'} yMode */
    const sparkline = (data, color, yMode = 'tokens') => {
        if (!data || !data.length) return '<div class="metric-empty">No data yet.</div>';
        const w = 640;
        const h = 180;
        const pad = { top: 14, right: 14, bottom: 30, left: 56 };
        const plotW = w - pad.left - pad.right;
        const plotH = h - pad.top - pad.bottom;

        const values = data.map((d) => Number(d.value) || 0);
        const posMax = values.reduce((a, b) => Math.max(a, b), 0);
        const dataMax = yMode === 'usd' ? (posMax > 0 ? posMax : 1e-9) : Math.max(1, ...values);
        const fmtY = yMode === 'usd' ? formatUsdAxis : compactNum;
        const fmtMeta = yMode === 'usd' ? formatUsdAxis : (x) => Number(x).toLocaleString();

        const { ticks, niceMin, niceMax } = niceTicks(0, dataMax, 5);
        const span = niceMax - niceMin || 1;
        const yScale = (v) => pad.top + plotH - ((v - niceMin) / span) * plotH;
        const xScale = (i) => pad.left + (i / Math.max(1, data.length - 1)) * plotW;

        const points = data.map((d, i) => `${xScale(i).toFixed(1)},${yScale(d.value).toFixed(1)}`).join(' ');
        const baselineY = (pad.top + plotH).toFixed(1);
        const areaPoints = `${points} ${xScale(data.length - 1).toFixed(1)},${baselineY} ${xScale(0).toFixed(1)},${baselineY}`;

        const gridLines = ticks
            .map((t) => {
                const y = yScale(t).toFixed(1);
                return `
                    <line x1="${pad.left}" x2="${pad.left + plotW}" y1="${y}" y2="${y}" class="metric-gridline"/>
                    <text x="${pad.left - 6}" y="${y}" class="metric-axis-label metric-axis-y">${fmtY(t)}</text>
                `;
            })
            .join('');

        const targetLabels = data.length <= 7 ? data.length : 6;
        const stepX = Math.max(1, Math.round((data.length - 1) / (targetLabels - 1)));
        const labelIdxs = new Set();
        for (let i = 0; i < data.length; i += stepX) labelIdxs.add(i);
        labelIdxs.add(data.length - 1);
        const xLabels = [...labelIdxs]
            .sort((a, b) => a - b)
            .map((i) => {
                const x = xScale(i).toFixed(1);
                return `<text x="${x}" y="${(pad.top + plotH + 18).toFixed(1)}" class="metric-axis-label metric-axis-x">${formatDateShort(data[i].day)}</text>`;
            })
            .join('');

        const peakIdx = values.length ? values.reduce((bestIdx, v, i, arr) => (v > arr[bestIdx] ? i : bestIdx), 0) : 0;
        const lastIdx = data.length - 1;
        const dot = (i) =>
            `<circle cx="${xScale(i).toFixed(1)}" cy="${yScale(values[i]).toFixed(1)}" r="3.5" fill="${color}" stroke="rgba(0,0,0,.4)" stroke-width="1"/>`;
        const peakLabel = `<text x="${xScale(peakIdx).toFixed(1)}" y="${(yScale(values[peakIdx]) - 7).toFixed(1)}" class="metric-axis-label metric-point-label" text-anchor="middle">${fmtY(values[peakIdx])}</text>`;

        const lastVal = values[lastIdx];
        const total = values.reduce((a, b) => a + b, 0);

        return `
              <svg class="metric-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" role="img">
                ${gridLines}
                <polyline points="${areaPoints}" fill="${color}" fill-opacity="0.14" stroke="none"/>
                <polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
                ${dot(peakIdx)}
                ${lastIdx !== peakIdx ? dot(lastIdx) : ''}
                ${peakLabel}
                ${xLabels}
              </svg>
              <div class="metric-spark-meta">
                <span>peak ${fmtMeta(dataMax)}</span>
                <span>today ${fmtMeta(lastVal)}</span>
                <span>total ${fmtMeta(total)}</span>
              </div>
            `;
    };

    return sparkline;
}

export const ADMIN_METRICS_REFRESH_MS = 20000;
