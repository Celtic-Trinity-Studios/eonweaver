/**
 * Eon Weaver — PDF Character Sheet Export
 * Generates a D&D 3.5e character sheet PDF matching the official WotC layout.
 * Two-page PDF: Page 1 = Stats/Combat/Skills, Page 2 = Equipment/Feats/Spells
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { parseClass, calcBAB, calcBaseSave, abilityMod } from './rules35e.js';
import { getClassData, calcClassSaves, getClassFeatures, bonusSpells, getSpellsPerDay } from './classData35e.js';
import { calculateEncumbrance } from './encumbrance35e.js';

/* ── Layout Constants ──────────────────────────────────── */
const PW = 612; // Letter width
const PH = 792; // Letter height
const M = 30;   // Margin
const LW = 0.6; // Line width

const C = {
    black: rgb(0, 0, 0),
    white: rgb(1, 1, 1),
    gray: rgb(0.5, 0.5, 0.5),
    darkGray: rgb(0.35, 0.35, 0.35),
    lightGray: rgb(0.85, 0.85, 0.85),
    headerBg: rgb(0.1, 0.1, 0.1),
    fieldBg: rgb(0.95, 0.95, 0.97),
};

/**
 * Export a character to a PDF and trigger download.
 */
export async function exportCharacterPDF(character, options = {}) {
    const c = character;
    const doc = await PDFDocument.create();
    const f = await doc.embedFont(StandardFonts.Helvetica);
    const fb = await doc.embedFont(StandardFonts.HelveticaBold);
    const fi = await doc.embedFont(StandardFonts.HelveticaOblique);

    // Parse data
    const abilities = [
        { name: 'STR', full: 'STRENGTH', val: parseInt(c.str) || 10 },
        { name: 'DEX', full: 'DEXTERITY', val: parseInt(c.dex) || 10 },
        { name: 'CON', full: 'CONSTITUTION', val: parseInt(c.con) || 10 },
        { name: 'INT', full: 'INTELLIGENCE', val: parseInt(c.int_) || 10 },
        { name: 'WIS', full: 'WISDOM', val: parseInt(c.wis) || 10 },
        { name: 'CHA', full: 'CHARISMA', val: parseInt(c.cha) || 10 },
    ];

    const savesStr = c.saves || '';
    const fortMatch = savesStr.match(/Fort\s*([+-]?\d+)/i);
    const refMatch = savesStr.match(/Ref\s*([+-]?\d+)/i);
    const willMatch = savesStr.match(/Will\s*([+-]?\d+)/i);
    const saves = {
        fort: fortMatch ? fortMatch[1] : '+0',
        ref: refMatch ? refMatch[1] : '+0',
        will: willMatch ? willMatch[1] : '+0',
    };

    const acStr = c.ac || '10';
    const acTotal = (acStr.match(/^(\d+)/) || [, '10'])[1];
    const acTouch = (acStr.match(/touch\s*:?\s*(\d+)/i) || [, ''])[1];
    const acFlat = (acStr.match(/flat[- ]?footed\s*:?\s*(\d+)/i) || [, ''])[1];

    // Extract just the BAB number, not the full attack string
    const { className: parsedClass } = parseClass(c.class || '');
    const parsedLevel = parseInt(c.level) || 1;
    const computedBAB = calcBAB(parsedClass, parsedLevel);
    const babStr = fmtMod(computedBAB);
    const grapple = c.grapple || '';

    const feats = (c.feats || '').split(',').map(s => s.trim()).filter(Boolean);
    const gear = (c.gear || '').split(',').map(s => s.trim()).filter(Boolean);
    const skills = parseSkills(c.skills_feats || '', abilities);
    const traits = [...(c.racial_traits || '').split(','), ...(c.class_abilities || '').split(',')].map(s => s.trim()).filter(Boolean);
    const languages = (c.languages || 'Common').split(',').map(s => s.trim()).filter(Boolean);

    // ═══════════════════════════════════════════════════════
    // PAGE 1 — Stats, Combat, Skills
    // ═══════════════════════════════════════════════════════
    const p1 = doc.addPage([PW, PH]);
    let y = PH - M;

    // ── Character Name / Player row
    drawFieldLine(p1, f, fb, M, y, PW * 0.55 - M, c.name || '', 'CHARACTER NAME');
    drawFieldLine(p1, f, fb, PW * 0.55, y, PW - M - PW * 0.55, '', 'PLAYER');
    y -= 28;

    // ── Class/Level, Race, Alignment, Deity row
    const r2w = (PW - M * 2) / 4;
    drawFieldLine(p1, f, fb, M, y, r2w, c.class || '', 'CLASS AND LEVEL');
    drawFieldLine(p1, f, fb, M + r2w, y, r2w, c.race || '', 'RACE');
    drawFieldLine(p1, f, fb, M + r2w * 2, y, r2w, c.alignment || '', 'ALIGNMENT');
    drawFieldLine(p1, f, fb, M + r2w * 3, y, r2w, '', 'DEITY');
    y -= 28;

    // ── Size, Age, Gender, Height, Weight row
    const r3w = (PW - M * 2) / 5;
    drawFieldLine(p1, f, fb, M, y, r3w, '', 'SIZE');
    drawFieldLine(p1, f, fb, M + r3w, y, r3w, c.age || '', 'AGE');
    drawFieldLine(p1, f, fb, M + r3w * 2, y, r3w, c.gender || '', 'GENDER');
    drawFieldLine(p1, f, fb, M + r3w * 3, y, r3w, '', 'HEIGHT');
    drawFieldLine(p1, f, fb, M + r3w * 4, y, r3w, '', 'WEIGHT');
    y -= 18;

    // ── Three-Column Layout ──────────────────────────────
    const col1x = M;
    const col1w = 120;
    const col2x = col1x + col1w + 5;
    const col2w = 185;
    const col3x = col2x + col2w + 5;
    const col3w = PW - M - col3x;
    let y1 = y, y2 = y, y3 = y;

    // ── Column 1: Ability Scores ─────────────────────────
    drawBlackHeader(p1, fb, col1x, y1, col1w, 'ABILITY SCORES');
    y1 -= 18;

    // Column headers
    const abLabelW = 42;
    const abBoxW = 22;
    txt(p1, 'ABILITY', col1x, y1, f, 4.5, C.gray);
    txt(p1, 'SCORE', col1x + abLabelW + 2, y1, f, 4.5, C.gray);
    txt(p1, 'MOD', col1x + abLabelW + abBoxW + 6, y1, f, 4.5, C.gray);
    y1 -= 5;

    for (const ab of abilities) {
        const mod = abilityMod(ab.val);
        const modStr = mod >= 0 ? `+${mod}` : `${mod}`;

        // Black label box
        drawBlackBox(p1, fb, col1x, y1, abLabelW, 18, ab.name, 9);
        txt(p1, ab.full, col1x + 2, y1 - 16, f, 3.5, C.white);

        // Score box
        drawFieldBox(p1, fb, col1x + abLabelW + 2, y1, abBoxW, 18, String(ab.val), 11);

        // Modifier box
        drawFieldBox(p1, fb, col1x + abLabelW + abBoxW + 6, y1, abBoxW, 18, modStr, 11);

        y1 -= 22;
    }

    // ── Column 2: Combat ─────────────────────────────────

    // HP
    drawBlackHeader(p1, fb, col2x, y2, 40, 'HP');
    txt(p1, 'HIT POINTS', col2x + 42, y2 - 3, f, 5, C.gray);
    y2 -= 18;
    drawFieldBox(p1, fb, col2x, y2, 40, 20, c.hp || '0', 16);
    drawFieldBox(p1, f, col2x + 44, y2, 80, 20, c.hd || '', 8);
    txt(p1, 'TOTAL', col2x + 8, y2 - 24, f, 4, C.darkGray);
    txt(p1, 'HIT DICE', col2x + 64, y2 - 24, f, 4, C.darkGray);
    y2 -= 32;

    // Speed
    drawBlackHeader(p1, fb, col2x + 140, y2 + 30, 90, 'SPEED');
    drawFieldBox(p1, fb, col2x + 140, y2 + 12, 90, 20, c.spd || '30 ft', 10);

    // AC
    drawBlackHeader(p1, fb, col2x, y2, 30, 'AC');
    txt(p1, 'ARMOR CLASS', col2x + 32, y2 - 3, f, 5, C.gray);
    y2 -= 18;
    drawFieldBox(p1, fb, col2x, y2, 30, 22, acTotal, 14);

    // AC breakdown
    const acbx = col2x + 36;
    txt(p1, '= 10 +', acbx, y2 - 12, f, 7, C.black);
    const acParts = ['ARMOR', 'SHIELD', 'DEX', 'SIZE', 'NATURAL', 'MISC'];
    const acVals = [
        (acStr.match(/armor\s*[+:]?\s*(\d+)/i) || [, ''])[1],
        (acStr.match(/shield\s*[+:]?\s*(\d+)/i) || [, ''])[1],
        String(abilityMod(parseInt(c.dex) || 10)),
        '',
        (acStr.match(/natural\s*[+:]?\s*(\d+)/i) || [, ''])[1],
        ''
    ];
    let acx = acbx + 32;
    for (let i = 0; i < acParts.length; i++) {
        drawFieldBox(p1, f, acx, y2, 20, 14, acVals[i], 7);
        txt(p1, acParts[i], acx + 1, y2 - 18, f, 3, C.darkGray);
        if (i < acParts.length - 1) { txt(p1, '+', acx + 22, y2 - 8, f, 7, C.black); }
        acx += 28;
    }
    y2 -= 26;

    // Touch & Flat-footed
    txt(p1, 'TOUCH', col2x + 2, y2 - 3, fb, 6, C.black);
    drawFieldBox(p1, fb, col2x + 35, y2, 25, 14, acTouch || '', 9);
    txt(p1, 'FLAT-FOOTED', col2x + 72, y2 - 3, fb, 6, C.black);
    drawFieldBox(p1, fb, col2x + 120, y2, 25, 14, acFlat || '', 9);
    y2 -= 24;

    // Initiative
    drawBlackHeader(p1, fb, col2x, y2, col2w, 'INITIATIVE');
    y2 -= 18;
    const dexMod = abilityMod(parseInt(c.dex) || 10);
    const initStr = c.init || fmtMod(dexMod);
    drawFieldBox(p1, fb, col2x, y2, 30, 16, initStr, 10);
    txt(p1, 'TOTAL', col2x + 6, y2 - 20, f, 4, C.darkGray);
    txt(p1, '=', col2x + 34, y2 - 8, f, 8, C.black);
    drawFieldBox(p1, f, col2x + 42, y2, 25, 16, fmtMod(dexMod), 8);
    txt(p1, 'DEX MOD', col2x + 43, y2 - 20, f, 4, C.darkGray);
    txt(p1, '+', col2x + 70, y2 - 8, f, 8, C.black);
    drawFieldBox(p1, f, col2x + 78, y2, 25, 16, '', 8);
    txt(p1, 'MISC', col2x + 84, y2 - 20, f, 4, C.darkGray);
    y2 -= 28;

    // Saving Throws
    drawBlackHeader(p1, fb, col2x, y2, col2w, 'SAVING THROWS');
    y2 -= 16;
    const svLabels = ['TOTAL', 'BASE', 'ABILITY', 'MAGIC', 'MISC', 'TEMP'];
    let svlx = col2x + 75;
    for (const l of svLabels) {
        txt(p1, l, svlx + 2, y2, f, 3.5, C.darkGray);
        svlx += 26;
    }
    y2 -= 4;

    for (const [name, sub, val] of [['FORTITUDE', 'CON', saves.fort], ['REFLEX', 'DEX', saves.ref], ['WILL', 'WIS', saves.will]]) {
        drawBlackBox(p1, fb, col2x, y2, 70, 16, name, 7);
        txt(p1, `(${sub})`, col2x + 4, y2 - 14, f, 4, C.white);
        let svx = col2x + 75;
        const abMod = fmtMod(abilityMod(parseInt(c[sub.toLowerCase() === 'con' ? 'con' : sub.toLowerCase() === 'dex' ? 'dex' : 'wis']) || 10));
        const svVals = [val, '', abMod, '', '', ''];
        for (const sv of svVals) {
            drawFieldBox(p1, f, svx, y2, 22, 16, sv, 8);
            svx += 26;
        }
        y2 -= 20;
    }
    y2 -= 6;

    // BAB & Grapple
    drawBlackHeader(p1, fb, col2x, y2, col2w, 'BASE ATTACK BONUS');
    y2 -= 18;
    drawFieldBox(p1, fb, col2x, y2, 60, 16, babStr, 10);
    txt(p1, 'SPELL RESISTANCE', col2x + 100, y2 - 3, fb, 6, C.black);
    drawFieldBox(p1, f, col2x + 180, y2, 30, 16, c.sr || '', 9);
    y2 -= 22;

    drawBlackHeader(p1, fb, col2x, y2, 60, 'GRAPPLE');
    drawFieldBox(p1, fb, col2x + 65, y2, 30, 14, grapple, 9);
    y2 -= 22;

    // Attacks
    drawBlackHeader(p1, fb, col2x, y2, col2w, 'ATTACK');
    y2 -= 16;

    // Parse attacks
    const atkStr = c.atk || '';
    const atkLines = atkStr.split(/[;\n]/).map(s => s.trim()).filter(Boolean);
    for (const atk of atkLines.slice(0, 3)) {
        // Extract type: Melee/Ranged/Touch
        const typeMatch = atk.match(/^(Melee|Ranged|Touch|Ranged Touch)\s*:?\s*/i);
        let typeCode = '';
        let atkName = atk;
        if (typeMatch) {
            const t = typeMatch[1].toLowerCase();
            typeCode = t === 'melee' ? 'M' : t === 'ranged' ? 'R' : t === 'touch' ? 'T' : 'RT';
            atkName = atk.substring(typeMatch[0].length);
        }
        const nameMatch = atkName.match(/^([^+\-\d(]+)/);
        const bonusMatch = atkName.match(/([+-]\d+)/);
        const dmgMatch = atkName.match(/(\d+d\d+[^,]*)/);
        const critMatch = atkName.match(/(\d+-\d+\/x\d+|x\d+|\d+-\d+)/);

        // Type box | Name | Bonus | Damage | Critical
        const typeW = 16;
        const nameW = (col2w - typeW - 4) * 0.35;
        const bonusW = (col2w - typeW - 4) * 0.2;
        const dmgW = (col2w - typeW - 4) * 0.25;
        const critW = (col2w - typeW - 4) * 0.2;
        let ax = col2x;
        drawBlackBox(p1, fb, ax, y2, typeW, 14, typeCode, 8);
        ax += typeW + 2;
        drawFieldBox(p1, f, ax, y2, nameW, 14, nameMatch ? nameMatch[1].trim() : '', 6);
        txt(p1, 'WEAPON', ax + 2, y2 - 18, f, 3, C.darkGray);
        ax += nameW + 1;
        drawFieldBox(p1, f, ax, y2, bonusW, 14, bonusMatch ? bonusMatch[1] : '', 8);
        txt(p1, 'ATK BONUS', ax + 2, y2 - 18, f, 3, C.darkGray);
        ax += bonusW + 1;
        drawFieldBox(p1, f, ax, y2, dmgW, 14, dmgMatch ? dmgMatch[1] : '', 6.5);
        txt(p1, 'DAMAGE', ax + 2, y2 - 18, f, 3, C.darkGray);
        ax += dmgW + 1;
        drawFieldBox(p1, f, ax, y2, critW, 14, critMatch ? critMatch[1] : '', 6.5);
        txt(p1, 'CRITICAL', ax + 2, y2 - 18, f, 3, C.darkGray);
        y2 -= 24;
    }

    // ── Column 3: Skills ─────────────────────────────────
    drawBlackHeader(p1, fb, col3x, y3, col3w, 'SKILLS');
    y3 -= 14;

    // Skill header — position from left of column
    // Columns: ✓ | Name | Key | Mod | AbMod | Rnk | Misc
    const skCk = 7;
    const skNm = col3w - 90;
    const skKy = 18;
    const skMd = 16;
    const skAm = 16;
    const skRn = 16;
    const skMi = 16;
    txt(p1, '✓', col3x + 1, y3, f, 3.5, C.darkGray);
    txt(p1, 'SKILL NAME', col3x + skCk + 2, y3, f, 3, C.darkGray);
    txt(p1, 'KEY', col3x + skCk + skNm, y3, f, 3, C.darkGray);
    txt(p1, 'MOD', col3x + skCk + skNm + skKy, y3, f, 3, C.darkGray);
    txt(p1, 'AB', col3x + skCk + skNm + skKy + skMd, y3, f, 3, C.darkGray);
    txt(p1, 'RNK', col3x + skCk + skNm + skKy + skMd + skAm, y3, f, 3, C.darkGray);
    txt(p1, 'MSC', col3x + skCk + skNm + skKy + skMd + skAm + skRn, y3, f, 3, C.darkGray);
    y3 -= 5;

    for (const sk of skills) {
        if (y3 < M + 14) break;
        // Trained checkbox
        const cx = col3x;
        p1.drawRectangle({ x: cx, y: y3 - 7, width: 5, height: 5, borderColor: C.black, borderWidth: 0.3, color: C.white });
        if (sk.ranks > 0) { txt(p1, 'X', cx + 0.5, y3 - 6, fb, 4, C.black); }

        let sx = col3x + skCk;
        txt(p1, sk.name.substring(0, 19), sx + 2, y3 - 6, f, 4, C.black);
        sx += skNm;
        txt(p1, sk.ability, sx + 2, y3 - 6, f, 3.5, C.gray);
        sx += skKy;
        // Skill Modifier (total)
        drawFieldBox(p1, f, sx, y3, skMd, 8, fmtMod(sk.total), 5);
        sx += skMd;
        // Ability Modifier
        const abMod = abilities.find(a => a.name === sk.ability);
        drawFieldBox(p1, f, sx, y3, skAm, 8, abMod ? fmtMod(abilityMod(abMod.val)) : '', 5);
        sx += skAm;
        // Ranks
        drawFieldBox(p1, f, sx, y3, skRn, 8, sk.ranks > 0 ? String(sk.ranks) : '', 5);
        sx += skRn;
        // Misc
        const misc = sk.total - (abMod ? abilityMod(abMod.val) : 0) - sk.ranks;
        drawFieldBox(p1, f, sx, y3, skMi, 8, misc !== 0 ? fmtMod(misc) : '', 5);
        y3 -= 10;
    }

    // Footer
    txt(p1, `Generated by Eon Weaver  -  ${new Date().toLocaleDateString()}`, M, M - 12, f, 6, C.gray);

    // ═══════════════════════════════════════════════════════
    // PAGE 2 — Equipment, Feats, Spells
    // ═══════════════════════════════════════════════════════
    const p2 = doc.addPage([PW, PH]);
    let p2y = PH - M;

    // Three column layout on page 2
    const p2c1x = M;
    const p2c1w = (PW - M * 2) * 0.4;
    const p2c2x = p2c1x + p2c1w + 8;
    const p2c2w = (PW - M * 2) * 0.3;
    const p2c3x = p2c2x + p2c2w + 8;
    const p2c3w = PW - M - p2c3x;

    let p2y1 = p2y, p2y2 = p2y, p2y3 = p2y;

    // ── Column 1: Equipment ──────────────────────────────
    drawBlackHeader(p2, fb, p2c1x, p2y1, p2c1w, 'OTHER POSSESSIONS');
    p2y1 -= 14;

    // Table header
    txt(p2, 'ITEM', p2c1x + 4, p2y1, fb, 5, C.gray);
    txt(p2, 'WT.', p2c1x + p2c1w - 20, p2y1, fb, 5, C.gray);
    p2y1 -= 5;

    for (const item of gear.slice(0, 30)) {
        if (p2y1 < M + 100) break;
        p2.drawLine({ start: { x: p2c1x, y: p2y1 }, end: { x: p2c1x + p2c1w, y: p2y1 }, thickness: 0.3, color: C.lightGray });
        txt(p2, item.substring(0, 35), p2c1x + 4, p2y1 - 9, f, 6, C.black);
        p2y1 -= 12;
    }
    // Fill remaining lines
    while (p2y1 > M + 120) {
        p2.drawLine({ start: { x: p2c1x, y: p2y1 }, end: { x: p2c1x + p2c1w, y: p2y1 }, thickness: 0.3, color: C.lightGray });
        p2y1 -= 12;
    }

    // Money
    p2y1 -= 5;
    drawBlackHeader(p2, fb, p2c1x, p2y1, p2c1w, 'MONEY');
    p2y1 -= 16;
    const coins = ['CP', 'SP', 'GP', 'PP'];
    const purse = c.purse || {};
    for (const coin of coins) {
        txt(p2, `${coin}:`, p2c1x + 4, p2y1 - 3, fb, 7, C.black);
        drawFieldBox(p2, f, p2c1x + 24, p2y1, 40, 14, String(purse[coin.toLowerCase()] || 0), 8);
        p2y1 -= 18;
    }

    // Encumbrance
    if (c.str) {
        p2y1 -= 5;
        const enc = calculateEncumbrance({ strScore: parseInt(c.str) || 10 });
        const lw = p2c1w / 3;
        drawFieldBox(p2, f, p2c1x, p2y1, lw, 16, String(enc.capacity.light), 7);
        txt(p2, 'LIGHT LOAD', p2c1x + 4, p2y1 - 18, f, 4, C.gray);
        drawFieldBox(p2, f, p2c1x + lw + 2, p2y1, lw, 16, String(enc.capacity.medium), 7);
        txt(p2, 'MEDIUM LOAD', p2c1x + lw + 6, p2y1 - 18, f, 4, C.gray);
        drawFieldBox(p2, f, p2c1x + lw * 2 + 4, p2y1, lw, 16, String(enc.capacity.heavy), 7);
        txt(p2, 'HEAVY LOAD', p2c1x + lw * 2 + 8, p2y1 - 18, f, 4, C.gray);
    }

    // ── Column 2: Feats + Special Abilities + Languages ──
    drawBlackHeader(p2, fb, p2c2x, p2y2, p2c2w, 'FEATS');
    p2y2 -= 14;

    for (const feat of feats.slice(0, 20)) {
        if (p2y2 < PH * 0.5) break;
        txt(p2, feat.substring(0, 30), p2c2x + 4, p2y2 - 7, f, 6, C.black);
        p2.drawLine({ start: { x: p2c2x, y: p2y2 - 10 }, end: { x: p2c2x + p2c2w, y: p2y2 - 10 }, thickness: 0.3, color: C.lightGray });
        p2y2 -= 13;
    }

    p2y2 -= 8;
    drawBlackHeader(p2, fb, p2c2x, p2y2, p2c2w, 'SPECIAL ABILITIES');
    p2y2 -= 14;

    for (const trait of traits.slice(0, 15)) {
        if (p2y2 < PH * 0.25) break;
        txt(p2, trait.substring(0, 30), p2c2x + 4, p2y2 - 7, f, 6, C.black);
        p2.drawLine({ start: { x: p2c2x, y: p2y2 - 10 }, end: { x: p2c2x + p2c2w, y: p2y2 - 10 }, thickness: 0.3, color: C.lightGray });
        p2y2 -= 13;
    }

    p2y2 -= 8;
    drawBlackHeader(p2, fb, p2c2x, p2y2, p2c2w, 'LANGUAGES');
    p2y2 -= 16;
    txt(p2, languages.join(', '), p2c2x + 4, p2y2 - 3, f, 7, C.black);

    // ── Column 3: Spells ─────────────────────────────────
    drawBlackHeader(p2, fb, p2c3x, p2y3, p2c3w, 'SPELLS');
    p2y3 -= 16;

    // Spell slots table
    const { className } = parseClass(c.class || '');
    const level = parseInt(c.level) || 1;
    const spd = getSpellsPerDay(className, level);

    if (spd && Object.keys(spd).length > 0) {
        txt(p2, 'SPELLS', p2c3x + 2, p2y3, fb, 5, C.gray);
        txt(p2, 'LEVEL', p2c3x + 30, p2y3, fb, 5, C.gray);
        txt(p2, 'PER DAY', p2c3x + 55, p2y3, fb, 5, C.gray);
        txt(p2, 'BONUS', p2c3x + 85, p2y3, fb, 5, C.gray);
        p2y3 -= 6;

        const castStat = { wizard: 'int_', sorcerer: 'cha', cleric: 'wis', druid: 'wis', bard: 'cha', paladin: 'wis', ranger: 'wis', adept: 'wis' };
        const statKey = castStat[className.toLowerCase()] || 'int_';
        const castMod = abilityMod(parseInt(c[statKey]) || 10);

        for (let lvl = 0; lvl <= 9; lvl++) {
            const perDay = spd[lvl];
            if (perDay === undefined) continue;
            const bonus = lvl === 0 ? '' : String(bonusSpells(castMod, lvl));

            drawFieldBox(p2, f, p2c3x, p2y3, 24, 12, '', 6);
            txt(p2, `${lvl}`, p2c3x + 34, p2y3 - 8, fb, 7, C.black);
            drawFieldBox(p2, f, p2c3x + 55, p2y3, 24, 12, String(perDay), 7);
            drawFieldBox(p2, f, p2c3x + 85, p2y3, 24, 12, bonus, 7);
            p2y3 -= 16;
        }
    } else {
        txt(p2, 'No spellcasting ability', p2c3x + 4, p2y3 - 5, fi, 7, C.gray);
        p2y3 -= 15;
    }

    // Known spells list
    if (options.spellsKnown && options.spellsKnown.length > 0) {
        p2y3 -= 8;
        drawBlackHeader(p2, fb, p2c3x, p2y3, p2c3w, 'SPELLS KNOWN');
        p2y3 -= 14;
        for (const sp of options.spellsKnown.slice(0, 25)) {
            if (p2y3 < M + 20) break;
            txt(p2, `${sp.name} (${sp.level})`, p2c3x + 4, p2y3 - 7, f, 5.5, C.black);
            p2y3 -= 10;
        }
    }

    // Footer
    txt(p2, `Generated by Eon Weaver  -  ${new Date().toLocaleDateString()}`, M, M - 12, f, 6, C.gray);

    // ── Generate and download ─────────────────────────
    const pdfBytes = await doc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${(c.name || 'character').replace(/\s+/g, '_')}_3.5e_sheet.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/* ── Drawing Helpers ───────────────────────────────────── */

function txt(page, text, x, y, font, size, color) {
    if (!text) return;
    try {
        page.drawText(String(text), { x, y, size, font, color });
    } catch {
        page.drawText(String(text).replace(/[^\x20-\x7E]/g, '?'), { x, y, size, font, color });
    }
}

/** Black header bar with white text (like "ABILITY SCORES", "SAVING THROWS") */
function drawBlackHeader(page, font, x, y, w, label) {
    const h = 14;
    page.drawRectangle({ x, y: y - h + 2, width: w, height: h, color: C.headerBg });
    const textY = y - h + 2 + (h - 7) / 2;  // vertically center 7pt text in 14pt box
    txt(page, label, x + 4, textY, font, 7, C.white);
}

/** Black filled box with white text (like "STR", "FORTITUDE") */
function drawBlackBox(page, font, x, y, w, h, label, fontSize) {
    page.drawRectangle({ x, y: y - h, width: w, height: h, color: C.headerBg });
    // Vertically center the label text
    const textY = y - h + (h - fontSize) / 2 + 1;
    // Auto-shrink if text is too wide
    let fs = fontSize;
    while (fs > 4 && font.widthOfTextAtSize(label, fs) > w - 6) { fs -= 0.5; }
    txt(page, label, x + 3, textY, font, fs, C.white);
}

/** Light bordered field box with auto-shrink and vertical centering */
function drawFieldBox(page, font, x, y, w, h, value, fontSize) {
    page.drawRectangle({ x, y: y - h, width: w, height: h, color: C.fieldBg, borderColor: C.black, borderWidth: 0.5 });
    if (value) {
        const str = String(value);
        // Auto-shrink font if text is too wide for the box (leave 4px padding)
        let fs = fontSize;
        while (fs > 4 && font.widthOfTextAtSize(str, fs) > w - 4) { fs -= 0.5; }
        const tw = font.widthOfTextAtSize(str, fs);
        // Vertically center: box bottom is y-h, text baseline offset ~30% of font size
        const textY = y - h + (h - fs * 0.7) / 2;
        txt(page, str, x + (w - tw) / 2, textY, font, fs, C.black);
    }
}

/** Field line with value on top and label underneath (like "CHARACTER NAME") */
function drawFieldLine(page, labelFont, valueFont, x, y, w, value, label) {
    page.drawLine({ start: { x, y: y - 14 }, end: { x: x + w, y: y - 14 }, thickness: 0.6, color: C.black });
    if (value) {
        let fs = 9;
        const str = String(value);
        while (fs > 5 && valueFont.widthOfTextAtSize(str, fs) > w - 4) { fs -= 0.5; }
        txt(page, str, x + 2, y - 11, valueFont, fs, C.black);
    }
    txt(page, label, x + 2, y - 22, labelFont, 5, C.gray);
}

function fmtMod(mod) {
    return mod >= 0 ? `+${mod}` : `${mod}`;
}

/** Parse skills from the skills_feats string into structured objects */
function parseSkills(skillsStr, abilities) {
    const SKILL_ABILITIES = {
        'Appraise': 'INT', 'Balance': 'DEX', 'Bluff': 'CHA', 'Climb': 'STR',
        'Concentration': 'CON', 'Craft': 'INT', 'Decipher Script': 'INT',
        'Diplomacy': 'CHA', 'Disable Device': 'INT', 'Disguise': 'CHA',
        'Escape Artist': 'DEX', 'Forgery': 'INT', 'Gather Information': 'CHA',
        'Handle Animal': 'CHA', 'Heal': 'WIS', 'Hide': 'DEX', 'Intimidate': 'CHA',
        'Jump': 'STR', 'Knowledge (Arcana)': 'INT', 'Knowledge (Architecture)': 'INT',
        'Knowledge (Dungeoneering)': 'INT', 'Knowledge (Geography)': 'INT',
        'Knowledge (History)': 'INT', 'Knowledge (Local)': 'INT',
        'Knowledge (Nature)': 'INT', 'Knowledge (Nobility)': 'INT',
        'Knowledge (Religion)': 'INT', 'Knowledge (The Planes)': 'INT',
        'Listen': 'WIS', 'Move Silently': 'DEX', 'Open Lock': 'DEX',
        'Perform': 'CHA', 'Profession': 'WIS', 'Ride': 'DEX', 'Search': 'INT',
        'Sense Motive': 'WIS', 'Sleight of Hand': 'DEX', 'Spellcraft': 'INT',
        'Spot': 'WIS', 'Survival': 'WIS', 'Swim': 'STR', 'Tumble': 'DEX',
        'Use Magic Device': 'CHA', 'Use Rope': 'DEX',
    };

    const result = [];
    const entries = skillsStr.split(',').map(s => s.trim()).filter(Boolean);

    // Build full skill list
    for (const [name, ab] of Object.entries(SKILL_ABILITIES)) {
        const entry = entries.find(e => e.toLowerCase().startsWith(name.toLowerCase()));
        let ranks = 0, total = 0;
        if (entry) {
            const rankMatch = entry.match(/(\d+)\s*ranks?/i) || entry.match(/\+?(\d+)$/);
            if (rankMatch) ranks = parseInt(rankMatch[1]) || 0;
            total = ranks;
        }
        const abData = abilities.find(a => a.name === ab);
        const abMod = abData ? abilityMod(abData.val) : 0;
        total = ranks + abMod;

        result.push({ name, ability: ab, ranks, total });
    }

    // Sort: trained first, then alphabetical
    result.sort((a, b) => {
        if (a.ranks > 0 && b.ranks === 0) return -1;
        if (a.ranks === 0 && b.ranks > 0) return 1;
        return a.name.localeCompare(b.name);
    });

    return result;
}
