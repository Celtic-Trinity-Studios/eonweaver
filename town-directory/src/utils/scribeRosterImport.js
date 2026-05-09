/**
 * Parse AI Scribe dungeon output into overview, keyed areas, and NPC / encounter stubs.
 * Keyed areas become separate town_buildings (dungeon type); creatures resolve via intake_creature + SRD.
 */

const MAX_ROOMS = 40;
const MAX_NPCS = 36;

/** Skip tokens that look like measurements, not creatures */
const ENCOUNTER_STOP_LAST = new Set([
    'foot', 'feet', 'ft', 'inch', 'inches', 'gp', 'sp', 'cp', 'xp', 'pp',
    'hd', 'dc', 'yard', 'yards', 'mile', 'miles', 'day', 'days', 'hour', 'hours',
    'minute', 'minutes', 'round', 'rounds', 'lb', 'lbs', 'ton', 'tons',
    'force', 'damage', 'saving', 'checks', 'check', 'attack', 'attacks', 'strike', 'strikes',
    'door', 'doors', 'wall', 'walls', 'room', 'rooms', 'hall', 'corridor', 'trap', 'traps',
    'magic', 'energy', 'power', 'light', 'dark', 'shadow'
]);

/** Tokens that match huge unrelated SRD lists via substring (prose "force door", etc.) */
const LOOSE_LOOKUP_DENY = new Set([
    'force', 'fire', 'cold', 'acid', 'sonic', 'light', 'dark', 'holy', 'evil', 'good', 'law', 'chaos',
    'mass', 'energy', 'power', 'magic', 'true', 'grand', 'great', 'lesser', 'greater', 'elder',
    'young', 'adult', 'ancient', 'deep', 'black', 'white', 'red', 'blue', 'green', 'gold',
    'iron', 'stone', 'wood', 'ice', 'shadow', 'storm', 'blood', 'death', 'life', 'soul',
    'spirit', 'ghost', 'door', 'room', 'wall', 'floor', 'trap', 'skill', 'save', 'check'
]);

/**
 * @param {string} raw
 * @returns {{ overview: string, rooms: { title: string, body: string }[], npcs: { name: string, blurb: string }[] }}
 */
export function parseDungeonForRoster(raw) {
    const text = (raw || '').replace(/\r\n/g, '\n').trim();
    if (!text) return { overview: '', rooms: [], npcs: [] };

    let { overview, rooms } = splitMarkdownRooms(text);
    if (!rooms.length) rooms = splitFallbackRooms(text);
    if (!rooms.length) {
        const h = splitHashSharpRooms(text);
        if (h.rooms.length) {
            overview = h.overview || overview;
            rooms = h.rooms;
        }
    }

    const npcNamed = extractDungeonNpcs(text, rooms);
    const npcEnc = extractDungeonEncounters(text, rooms);
    const npcs = mergeDedupeRosterEntries(npcEnc, npcNamed);
    return { overview, rooms: rooms.slice(0, MAX_ROOMS), npcs: npcs.slice(0, MAX_NPCS) };
}

function mergeDedupeRosterEntries(primary, secondary) {
    const seen = new Set();
    const out = [];
    for (const list of [primary, secondary]) {
        for (const n of list) {
            const k = (n.name || '').toLowerCase().replace(/\s+/g, ' ').trim();
            if (k.length < 2 || seen.has(k)) continue;
            seen.add(k);
            out.push(n);
        }
    }
    return out;
}

/**
 * Dungeons often use "# Area" headings instead of "##". Second and later # sections become rooms;
 * body text before the first # (if any) plus the first section's body becomes overview.
 */
function splitHashSharpRooms(text) {
    const lines = text.split('\n');
    const hashIdx = [];
    for (let i = 0; i < lines.length; i++) {
        if (/^#\s+/.test(lines[i])) hashIdx.push(i);
    }
    if (hashIdx.length < 2) return { overview: '', rooms: [] };

    const preamble = lines.slice(0, hashIdx[0]).join('\n').trim();
    const sections = [];
    for (let h = 0; h < hashIdx.length; h++) {
        const start = hashIdx[h];
        const end = h + 1 < hashIdx.length ? hashIdx[h + 1] : lines.length;
        sections.push(lines.slice(start, end).join('\n'));
    }

    const firstSec = sections[0];
    const firstTitle = (firstSec.split('\n')[0] || '').replace(/^#\s+/, '').trim();
    const firstBody = firstSec.split('\n').slice(1).join('\n').trim();
    const overview = [preamble, firstBody ? `${firstTitle}\n${firstBody}` : firstTitle]
        .filter(Boolean)
        .join('\n\n')
        .trim();

    const rooms = [];
    for (let s = 1; s < sections.length; s++) {
        const sec = sections[s];
        const fl = sec.split('\n')[0] || '';
        if (!/^#\s+/.test(fl)) continue;
        const title = fl.replace(/^#\s+/, '').trim().replace(/\s*#+\s*$/, '').slice(0, 150);
        const body = sec.split('\n').slice(1).join('\n').trim();
        if (title) rooms.push({ title, body });
    }
    return { overview, rooms };
}

/**
 * Pull quantity + creature phrases ("4 goblin archers", "2 Gray Ooze") for SRD intake.
 */
export function extractDungeonEncounters(fullText, rooms) {
    const blob = [fullText, ...(rooms || []).map(r => r.body || '')].join('\n');
    const out = [];
    const seen = new Set();

    const add = (name, blurb = '') => {
        let n = name.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
        if (n.length < 3) return;
        const parts = n.split(/\s+/);
        const last = parts[parts.length - 1].toLowerCase();
        const first = parts[0].toLowerCase();
        if (ENCOUNTER_STOP_LAST.has(last) || ENCOUNTER_STOP_LAST.has(first)) return;
        const k = n.toLowerCase();
        if (seen.has(k)) return;
        seen.add(k);
        out.push({ name: n, blurb: blurb.slice(0, 2000) });
    };

    const reNum = /\b(\d+)\s+(?:x\s*)?([A-Za-z][A-Za-z\s.'’\-]{2,48}?)(?=\s*[,.;:!—]|$|\(|…)/g;
    let m;
    while ((m = reNum.exec(blob)) !== null) {
        add(m[2].trim(), `Encounter line (${m[1]} listed)`);
    }

    return out;
}

function splitMarkdownRooms(text) {
    const lines = text.split('\n');
    const chunks = [];
    let buf = [];
    for (const line of lines) {
        if (/^##\s+/.test(line)) {
            if (buf.length) chunks.push(buf.join('\n'));
            buf = [line];
        } else {
            buf.push(line);
        }
    }
    if (buf.length) chunks.push(buf.join('\n'));

    if (!chunks.length) return { overview: text, rooms: [] };

    const firstLine = (chunks[0] || '').split('\n')[0] || '';
    let overview = '';
    let roomChunks = chunks;
    if (!/^##\s+/.test(firstLine)) {
        overview = chunks[0].trim();
        roomChunks = chunks.slice(1);
    }

    const rooms = [];
    const skipNpcHeader = /^(NPCs?|Key\s+NPCs?|Inhabitants?|Denizens?|Dramatis\s+Personae)\s*$/i;

    for (const ch of roomChunks) {
        const fl = ch.split('\n')[0] || '';
        if (!/^##\s+/.test(fl)) continue;
        const title = fl.replace(/^##\s+/, '').trim().replace(/\s*#+\s*$/, '').slice(0, 150);
        const body = ch.split('\n').slice(1).join('\n').trim();
        if (!title) continue;
        if (skipNpcHeader.test(title)) continue;
        rooms.push({ title, body });
    }

    return { overview: overview.trim(), rooms };
}

/** If model used ### only or unusual headings */
function splitFallbackRooms(text) {
    const lines = text.split('\n');
    const chunks = [];
    let buf = [];
    for (const line of lines) {
        if (/^###\s+/.test(line)) {
            if (buf.length) chunks.push(buf.join('\n'));
            buf = [line];
        } else {
            buf.push(line);
        }
    }
    if (buf.length) chunks.push(buf.join('\n'));

    const rooms = [];
    const firstLine = (chunks[0] || '').split('\n')[0] || '';
    let startIdx = 0;
    if (!/^###\s+/.test(firstLine)) startIdx = 1;

    for (let i = startIdx; i < chunks.length; i++) {
        const ch = chunks[i];
        const fl = ch.split('\n')[0] || '';
        if (!/^###\s+/.test(fl)) continue;
        const title = fl.replace(/^###\s+/, '').trim().slice(0, 150);
        const body = ch.split('\n').slice(1).join('\n').trim();
        if (title) rooms.push({ title, body });
    }
    return rooms;
}

/**
 * @param {string} fullText
 * @param {{ title: string, body: string }[]} rooms
 */
export function extractDungeonNpcs(fullText, rooms) {
    const out = [];
    const seen = new Set();

    const add = (name, blurb = '') => {
        let n = name.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
        if (n.length < 2) return;
        const lower = n.toLowerCase();
        if (seen.has(lower)) return;
        seen.add(lower);
        out.push({ name: n, blurb: blurb.slice(0, 2000) });
    };

    let npcSlice = fullText;
    const npcHeader = fullText.match(
        /^##\s*(NPCs?|Key\s+NPCs?|Inhabitants?|Denizens?|Dramatis\s+Personae|Notable\s+Figures|Encounters?)\b[^\n]*/im
    );
    if (npcHeader) {
        const start = fullText.indexOf(npcHeader[0]);
        let slice = fullText.slice(start);
        const next = slice.slice(1).search(/^##\s+/m);
        npcSlice = next === -1 ? slice : slice.slice(0, next + 1);
    }

    for (const line of npcSlice.split('\n')) {
        const m1 = line.match(/^\s*[-•*]\s*\*\*([^*]{2,80})\*\*\s*(?:[-–—:]|\s-\s)\s*(.*)$/);
        if (m1) {
            add(m1[1].trim(), m1[2].trim());
            continue;
        }
        const m2 = line.match(/^\s*[-•*]\s+([A-Z][^\n:*]{1,70}?)\s*:\s+(.*)$/);
        if (m2 && m2[1].length < 65 && !/^\d+$/.test(m2[1])) add(m2[1].trim(), m2[2].trim());
    }

    for (const line of npcSlice.split('\n')) {
        const m3 = line.match(/^\s*\d+[.)]\s*\*\*([^*]{2,80})\*\*\s*(?:[-–—:]|\s-\s)\s*(.*)$/);
        if (m3) add(m3[1].trim(), m3[2].trim());
    }

    for (const r of rooms) {
        for (const line of (r.body || '').split('\n')) {
            const m4 = line.match(/\*\*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\*\*\s*[-–—,:]\s*(.{10,400})/);
            if (m4) add(m4[1].trim(), m4[2].trim());
            const m5 = line.match(/\*\*([A-Z][a-z]{2,15})\*\*\s*[-–—,:]\s*(.{10,400})/);
            if (m5 && !seen.has(m5[1].toLowerCase())) add(m5[1].trim(), m5[2].trim());
        }
    }

    return out.slice(0, MAX_NPCS);
}

/** Basic plural → singular hints for SRD name LIKE queries */
function singularizeCreatureToken(t) {
    const w = (t || '').trim().toLowerCase();
    if (w.length < 3) return t.trim();
    const irregular = {
        wolves: 'wolf',
        zombies: 'zombie',
        oozes: 'ooze',
        gnolls: 'gnoll',
        bugbears: 'bugbear',
        hobgoblins: 'hobgoblin',
        wereboars: 'wereboar',
        wererats: 'wererat',
        weretigers: 'weretiger',
        humans: 'human',
        duergar: 'duergar',
        peoples: 'person'
    };
    if (irregular[w]) return irregular[w];
    if (w.length > 4 && w.endsWith('ies')) return t.slice(0, -3) + 'y';
    if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return t.slice(0, -1);
    return t.trim();
}

/** Ordered tokens for SRD monster lookup (intake_creature) — try earlier strings first. */
export function intakeLookupTokens(npc) {
    const raw = (npc.name || '').replace(/\*\*/g, '').trim();
    const blurb = npc.blurb || '';
    const out = [];
    const paren = raw.match(/\(([^)]+)\)/);
    if (paren) out.push(paren[1].trim());
    const blurbMatch = blurb.match(
        /\b(goblins?|hobgoblins?|bugbears?|black\s+puddings?|gelatinous\s+cubes?|gray\s+oozes?|orcs?|kobolds?|ogres?|trolls?|dragons?|wyverns?|manticores?|minotaurs?|skeletons?|zombies?|ghouls?|ghasts?|wights?|wraiths?|specters?|spectres?|shadows?|vampires?|liches?|werewolves?|dire\s+wolves?|monstrous\s+spiders?|giant\s+spiders?|giants?|beholders?|basilisks?|mummies?|lizardfolk|troglodytes?|ettins?|centaurs?|unicorns?|unicorn)\b/i
    );
    if (blurbMatch) out.push(blurbMatch[0].trim());
    const noTitle = raw.replace(/^(Captain|Chief|Lord|Lady|Sir|King|Queen|Elder|High\s+[A-Za-z]+)\s+/i, '').trim();
    if (noTitle) out.push(noTitle);
    const words = raw.split(/\s+/).filter(Boolean);
    if (words.length >= 2) out.push(words[words.length - 1]);
    if (words.length >= 2) out.push(singularizeCreatureToken(words[words.length - 1]));
    if (raw) out.push(raw);
    if (raw) out.push(singularizeCreatureToken(raw));
    const seen = new Set();
    return out.filter(token => {
        const t = (token || '').trim();
        const k = t.toLowerCase();
        if (t.length < 2 || seen.has(k)) return false;
        const singleWord = !/\s/.test(k);
        if (singleWord && LOOSE_LOOKUP_DENY.has(k)) return false;
        seen.add(k);
        return true;
    });
}

/**
 * Map intake_creature payload to save_character shape (saves string, history, building link).
 */
export function normalizeCreatureCharForSave(c, extra = {}) {
    const fort = c.fort;
    const ref = c.ref;
    const will = c.will;
    const savesParts = [];
    if (fort != null && fort !== '') savesParts.push(`Fort ${Number(fort) >= 0 ? '+' : ''}${fort}`);
    if (ref != null && ref !== '') savesParts.push(`Ref ${Number(ref) >= 0 ? '+' : ''}${ref}`);
    if (will != null && will !== '') savesParts.push(`Will ${Number(will) >= 0 ? '+' : ''}${will}`);
    const saves = savesParts.join(', ') || c.saves || '';
    const hist = [
        extra.historyLead,
        c.reason || '',
        extra.blurb ? `Scene: ${extra.blurb}` : ''
    ].filter(Boolean).join('\n').slice(0, 8000);

    return {
        id: 0,
        name: c.name,
        race: c.race || '',
        class: c.class || '',
        level: c.level != null ? c.level : 1,
        status: c.status || 'Alive',
        title: '',
        gender: c.gender || '',
        spouse: 'None',
        spouse_label: '',
        age: c.age ?? '',
        xp: c.xp ?? 0,
        cr: c.cr ?? '',
        ecl: '',
        hp: c.hp ?? '',
        hd: c.hd ?? '',
        ac: c.ac != null ? String(c.ac) : '',
        init: c.init ?? '',
        spd: c.speed || c.spd || '',
        grapple: c.grapple ?? '',
        atk: c.atk || '',
        alignment: c.alignment || '',
        saves,
        str: c.str,
        dex: c.dex,
        con: c.con,
        int_: c.int_,
        wis: c.wis,
        cha: c.cha,
        languages: c.languages ?? '',
        skills_feats: c.skills_feats || '',
        feats: c.feats || '',
        domains: '',
        gear: c.gear || '',
        role: extra.role || c.role || 'NPC',
        history: hist,
        portrait_url: '',
        portrait_prompt: '',
        building_id: extra.building_id ?? null
    };
}
