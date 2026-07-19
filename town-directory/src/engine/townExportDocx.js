/**
 * Town campaign docket → editable Word (.docx) download.
 */
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
} from 'docx';
import { formatTownExportMarkdown, townExportFilenameStem } from './townExportMarkdown.js';

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function para(text, opts = {}) {
  const {
    heading = undefined,
    bold = false,
    italics = false,
    bullet = false,
    size = 22, // half-points (11pt)
    spacing = { after: 120 },
  } = opts;
  return new Paragraph({
    heading,
    bullet: bullet ? { level: 0 } : undefined,
    spacing,
    children: [
      new TextRun({
        text: text || '',
        bold: bold || !!heading,
        italics,
        size: heading ? undefined : size,
      }),
    ],
  });
}

/**
 * Convert docket Markdown into Word paragraphs.
 * @param {string} md
 * @returns {Paragraph[]}
 */
export function markdownToDocxParagraphs(md) {
  const children = [];
  const lines = String(md || '').replace(/\r\n/g, '\n').split('\n');

  for (const raw of lines) {
    const line = raw.replace(/\*\*/g, '').replace(/`/g, '');
    if (!line.trim()) {
      children.push(new Paragraph({ children: [], spacing: { after: 80 } }));
      continue;
    }
    if (line.startsWith('# ')) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.TITLE,
          spacing: { before: 120, after: 200 },
          children: [new TextRun({ text: line.slice(2), bold: true })],
        })
      );
    } else if (line.startsWith('## ')) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 },
          children: [new TextRun({ text: line.slice(3), bold: true })],
        })
      );
    } else if (line.startsWith('### ')) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
          children: [new TextRun({ text: line.slice(4), bold: true })],
        })
      );
    } else if (line.startsWith('#### ')) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 160, after: 80 },
          children: [new TextRun({ text: line.slice(5), bold: true })],
        })
      );
    } else if (line.startsWith('> ')) {
      children.push(para(line.slice(2), { italics: true, size: 20 }));
    } else if (line.startsWith('  - ')) {
      children.push(para(line.replace(/^\s*-\s*/, ''), { bullet: true, size: 20 }));
    } else if (line.startsWith('- ')) {
      children.push(para(line.slice(2), { bullet: true }));
    } else if (line.startsWith('---')) {
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 120 },
          border: {
            bottom: { color: '8B7355', space: 1, style: 'single', size: 6 },
          },
          children: [],
        })
      );
    } else if (line.startsWith('_') && line.endsWith('_') && line.length > 2) {
      children.push(para(line.slice(1, -1), { italics: true, size: 20 }));
    } else {
      children.push(para(line));
    }
  }

  if (!children.length) {
    children.push(para('(Empty export.)', { italics: true }));
  }
  return children;
}

/**
 * Build and download a Word document from an export payload.
 * @param {object} payload
 */
export async function exportTownCampaignDocx(payload) {
  const md = formatTownExportMarkdown(payload);
  const townName = payload?.town?.name || 'Town';
  const children = markdownToDocxParagraphs(md);

  const doc = new Document({
    creator: 'Eon Weaver',
    title: `Town Docket: ${townName}`,
    description: 'Campaign planning docket exported from Eon Weaver',
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              bottom: 720,
              left: 720,
              right: 720,
            },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${townExportFilenameStem(payload)}.docx`);
  return { blob };
}
