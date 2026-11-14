/**
 * Find a square grid on a battle map.
 * Scores are per-column or per-row edge strength. The period is the 5-foot square.
 */

export function periodFromScores(scores) {
  const n = scores.length;
  if (n < 24) return null;
  const minP = Math.max(6, Math.floor(n / 140));
  const maxP = Math.floor(n / 5);
  let mean = 0;
  for (let i = 0; i < n; i++) mean += scores[i];
  mean /= n;
  let energy = 0;
  for (let i = 0; i < n; i++) {
    const d = scores[i] - mean;
    energy += d * d;
  }
  energy /= n;
  if (energy < 1e-8) return null;

  const table = new Array(maxP + 1).fill(0);
  let bestScore = 0;
  for (let p = minP; p <= maxP; p++) {
    if (n / p < 4) break;
    let acc = 0;
    let count = 0;
    for (let i = 0; i + p < n; i++) {
      acc += (scores[i] - mean) * (scores[i + p] - mean);
      count++;
    }
    let acc2 = 0;
    let count2 = 0;
    for (let i = 0; i + p * 2 < n; i++) {
      acc2 += (scores[i] - mean) * (scores[i + p * 2] - mean);
      count2++;
    }
    const corr = count ? (acc / count) / energy : 0;
    const corr2 = count2 ? (acc2 / count2) / energy : 0;
    const score = corr * 0.7 + Math.max(0, corr2) * 0.3;
    table[p] = score;
    if (score > bestScore) bestScore = score;
  }
  if (bestScore < 0.12) return null;
  let period = 0;
  for (let p = minP; p <= maxP; p++) {
    if (table[p] >= bestScore * 0.84) {
      period = p;
      break;
    }
  }
  if (!period) return null;
  return { period, score: table[period] };
}

export function phaseOf(scores, period) {
  let bestO = 0;
  let best = -1;
  for (let o = 0; o < period; o++) {
    let sum = 0;
    let count = 0;
    for (let i = o; i < scores.length; i += period) {
      sum += scores[i];
      count++;
    }
    const avg = count ? sum / count : 0;
    if (avg > best) {
      best = avg;
      bestO = o;
    }
  }
  return bestO;
}

function lumAt(data, width, x, y) {
  const i = (y * width + x) * 4;
  return data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
}

export function lineScores(data, width, height) {
  const col = new Float32Array(width);
  const row = new Float32Array(height);
  for (let y = 0; y < height; y++) {
    for (let x = 1; x < width; x++) {
      const d = Math.abs(lumAt(data, width, x, y) - lumAt(data, width, x - 1, y));
      if (d > 22 && d < 150) col[x] += 1;
    }
  }
  for (let x = 0; x < width; x++) col[x] /= height;
  for (let y = 1; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const d = Math.abs(lumAt(data, width, x, y) - lumAt(data, width, x, y - 1));
      if (d > 22 && d < 150) row[y] += 1;
    }
  }
  for (let y = 0; y < height; y++) row[y] /= width;
  return { col, row };
}

/**
 * data is RGBA of a downscaled copy. scale is samplePixels / naturalPixels.
 * Returns cell size and origin in natural image pixels, or null.
 */
export function gridFromImageData(data, width, height, scale) {
  const { col, row } = lineScores(data, width, height);
  const vx = periodFromScores(col);
  const hy = periodFromScores(row);
  if (!vx && !hy) return null;
  let sampleCell;
  let score;
  if (vx && hy) {
    const diff = Math.abs(vx.period - hy.period) / ((vx.period + hy.period) / 2);
    if (diff > 0.22) {
      if (vx.score >= hy.score) {
        sampleCell = vx.period;
        score = vx.score;
      } else {
        sampleCell = hy.period;
        score = hy.score;
      }
    } else {
      sampleCell = Math.round((vx.period + hy.period) / 2);
      score = (vx.score + hy.score) / 2;
    }
  } else {
    sampleCell = (vx || hy).period;
    score = (vx || hy).score;
  }
  const originX = phaseOf(col, sampleCell);
  const originY = phaseOf(row, sampleCell);
  const cell = sampleCell / scale;
  if (!Number.isFinite(cell) || cell < 4) return null;
  return {
    cell,
    originX: originX / scale,
    originY: originY / scale,
    score,
  };
}
