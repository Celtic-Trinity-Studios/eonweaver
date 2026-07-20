/**
 * Lightweight markdown + [[wikilink]] renderer for the lore codex.
 * Not a full CommonMark parser — enough for DM-facing preview.
 */

function esc(v) {
  return String(v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function inlineFormat(text, onWikilink) {
  let s = esc(text);
  // [[Title|label]] or [[Title]]
  s = s.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, title, label) => {
    const t = title.trim();
    const lab = (label || title).trim();
    if (typeof onWikilink === 'function') {
      return onWikilink(t, lab);
    }
    return `<a href="#" class="lore-wikilink" data-lore-title="${esc(t)}">${esc(lab)}</a>`;
  });
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  return s;
}

/**
 * @param {string} md
 * @param {{ onWikilink?: (title: string, label: string) => string }} [opts]
 */
export function renderLoreMarkdown(md, opts = {}) {
  const raw = String(md || '').replace(/\r\n/g, '\n');
  if (!raw.trim()) {
    return '<p class="muted">Empty page.</p>';
  }
  const lines = raw.split('\n');
  const html = [];
  let inUl = false;
  let inOl = false;
  let inCode = false;
  let codeBuf = [];

  const closeLists = () => {
    if (inUl) {
      html.push('</ul>');
      inUl = false;
    }
    if (inOl) {
      html.push('</ol>');
      inOl = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('```')) {
      if (inCode) {
        html.push(`<pre class="lore-code"><code>${esc(codeBuf.join('\n'))}</code></pre>`);
        codeBuf = [];
        inCode = false;
      } else {
        closeLists();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      if (!inUl) {
        closeLists();
        html.push('<ul>');
        inUl = true;
      }
      html.push(`<li>${inlineFormat(line.replace(/^\s*[-*]\s+/, ''), opts.onWikilink)}</li>`);
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      if (!inOl) {
        closeLists();
        html.push('<ol>');
        inOl = true;
      }
      html.push(`<li>${inlineFormat(line.replace(/^\s*\d+\.\s+/, ''), opts.onWikilink)}</li>`);
      continue;
    }

    closeLists();

    if (/^###\s+/.test(line)) {
      html.push(`<h3>${inlineFormat(line.replace(/^###\s+/, ''), opts.onWikilink)}</h3>`);
    } else if (/^##\s+/.test(line)) {
      html.push(`<h2>${inlineFormat(line.replace(/^##\s+/, ''), opts.onWikilink)}</h2>`);
    } else if (/^#\s+/.test(line)) {
      html.push(`<h1>${inlineFormat(line.replace(/^#\s+/, ''), opts.onWikilink)}</h1>`);
    } else if (/^---+\s*$/.test(line)) {
      html.push('<hr>');
    } else if (line.trim() === '') {
      html.push('');
    } else {
      html.push(`<p>${inlineFormat(line, opts.onWikilink)}</p>`);
    }
  }
  closeLists();
  if (inCode) {
    html.push(`<pre class="lore-code"><code>${esc(codeBuf.join('\n'))}</code></pre>`);
  }
  return html.filter((x, i, arr) => !(x === '' && arr[i - 1] === '')).join('\n');
}

export function escHtml(v) {
  return esc(v);
}
