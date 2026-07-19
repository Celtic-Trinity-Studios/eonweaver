/**
 * Multi-page PDF docket from town export Markdown (readable for table / binder use).
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { formatTownExportMarkdown, townExportFilenameStem } from './townExportMarkdown.js';

const PW = 612;
const PH = 792;
const M = 48;
const CONTENT_W = PW - M * 2;
const LINE_H = 13;
const FOOTER_Y = 28;

function wrapText(font, text, size, maxWidth) {
  const raw = String(text || '').replace(/\r\n/g, '\n');
  const paras = raw.split('\n');
  const lines = [];
  for (const para of paras) {
    if (!para) {
      lines.push('');
      continue;
    }
    const words = para.split(/\s+/);
    let current = '';
    for (const word of words) {
      const trial = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(trial, size) <= maxWidth) {
        current = trial;
      } else {
        if (current) lines.push(current);
        // Hard-break overlong tokens
        if (font.widthOfTextAtSize(word, size) > maxWidth) {
          let chunk = '';
          for (const ch of word) {
            const t2 = chunk + ch;
            if (font.widthOfTextAtSize(t2, size) > maxWidth) {
              if (chunk) lines.push(chunk);
              chunk = ch;
            } else {
              chunk = t2;
            }
          }
          current = chunk;
        } else {
          current = word;
        }
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

function downloadBlob(bytes, filename) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Build and download a PDF from an export payload.
 * @param {object} payload
 */
export async function exportTownCampaignPdf(payload) {
  const md = formatTownExportMarkdown(payload);
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.TimesRoman);
  const bold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const italic = await doc.embedFont(StandardFonts.TimesRomanItalic);

  const ink = rgb(0.12, 0.1, 0.08);
  const muted = rgb(0.4, 0.38, 0.35);
  const rule = rgb(0.55, 0.45, 0.3);

  let page = doc.addPage([PW, PH]);
  let y = PH - M;
  let pageNum = 1;

  const townName = payload?.town?.name || 'Town';

  function paintFooter(p, num) {
    p.drawLine({
      start: { x: M, y: FOOTER_Y + 10 },
      end: { x: PW - M, y: FOOTER_Y + 10 },
      thickness: 0.4,
      color: rule,
    });
    p.drawText(`Eon Weaver — ${townName}`, {
      x: M,
      y: FOOTER_Y,
      size: 8,
      font: italic,
      color: muted,
    });
    const label = String(num);
    const w = font.widthOfTextAtSize(label, 8);
    p.drawText(label, {
      x: PW - M - w,
      y: FOOTER_Y,
      size: 8,
      font,
      color: muted,
    });
  }

  function newPage() {
    paintFooter(page, pageNum);
    page = doc.addPage([PW, PH]);
    pageNum += 1;
    y = PH - M;
  }

  function ensureSpace(needed) {
    if (y - needed < FOOTER_Y + 18) newPage();
  }

  function drawLines(textLines, { size = 10, face = font, color = ink, gap = LINE_H } = {}) {
    for (const ln of textLines) {
      ensureSpace(gap);
      if (ln) {
        page.drawText(ln, { x: M, y, size, font: face, color, maxWidth: CONTENT_W });
      }
      y -= gap;
    }
  }

  const mdLines = md.split('\n');
  for (const raw of mdLines) {
    const line = raw.replace(/\*\*/g, '').replace(/`/g, '');
    if (line.startsWith('# ')) {
      ensureSpace(36);
      y -= 6;
      drawLines(wrapText(bold, line.slice(2), 18, CONTENT_W), { size: 18, face: bold, gap: 22 });
      page.drawLine({
        start: { x: M, y: y + 8 },
        end: { x: PW - M, y: y + 8 },
        thickness: 1,
        color: rule,
      });
      y -= 6;
    } else if (line.startsWith('## ')) {
      ensureSpace(28);
      y -= 8;
      drawLines(wrapText(bold, line.slice(3), 13, CONTENT_W), { size: 13, face: bold, gap: 16 });
    } else if (line.startsWith('### ')) {
      ensureSpace(22);
      y -= 4;
      drawLines(wrapText(bold, line.slice(4), 11, CONTENT_W), { size: 11, face: bold, gap: 14 });
    } else if (line.startsWith('#### ')) {
      ensureSpace(18);
      drawLines(wrapText(bold, line.slice(5), 10.5, CONTENT_W), { size: 10.5, face: bold, gap: 13 });
    } else if (line.startsWith('> ')) {
      drawLines(wrapText(italic, line.slice(2), 9, CONTENT_W), { size: 9, face: italic, color: muted, gap: 11 });
    } else if (line.startsWith('- ') || line.startsWith('  - ')) {
      const indent = line.startsWith('  - ') ? 14 : 0;
      const body = line.replace(/^\s*-\s*/, '• ');
      const wrapped = wrapText(font, body, 10, CONTENT_W - indent);
      for (let i = 0; i < wrapped.length; i++) {
        ensureSpace(LINE_H);
        page.drawText(wrapped[i], {
          x: M + indent + (i > 0 ? 10 : 0),
          y,
          size: 10,
          font,
          color: ink,
        });
        y -= LINE_H;
      }
    } else if (line.startsWith('---')) {
      ensureSpace(16);
      page.drawLine({
        start: { x: M, y },
        end: { x: PW - M, y },
        thickness: 0.5,
        color: rule,
      });
      y -= 14;
    } else if (line.startsWith('_') && line.endsWith('_')) {
      drawLines(wrapText(italic, line.slice(1, -1), 9.5, CONTENT_W), {
        size: 9.5,
        face: italic,
        color: muted,
        gap: 12,
      });
    } else if (!line.trim()) {
      y -= 6;
    } else {
      drawLines(wrapText(font, line, 10, CONTENT_W), { size: 10, face: font, gap: LINE_H });
    }
  }

  paintFooter(page, pageNum);

  const bytes = await doc.save();
  downloadBlob(bytes, `${townExportFilenameStem(payload)}.pdf`);
  return { pages: pageNum, bytes };
}
