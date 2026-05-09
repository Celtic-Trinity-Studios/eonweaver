/**
 * Single source of truth for settlement / biome / difficulty options
 * (Town Settings modal + Town Setup Wizard must stay aligned).
 */

export const SHARED_SETTLEMENT_TYPE_OPTIONS = [
  { value: '', label: '— Not Set (Standard Town) —' },
  { value: 'village', label: '🏘️ Village / Hamlet' },
  { value: 'walled_town', label: '🏰 Walled Town' },
  { value: 'fortress', label: '⚔️ Fortress / Keep' },
  { value: 'cave_system', label: '🕳️ Cave System' },
  { value: 'underground_warren', label: '🐀 Underground Warren' },
  { value: 'ruins', label: '🏚️ Ruins / Abandoned' },
  { value: 'camp', label: '⛺ Camp / Encampment' },
  { value: 'nomadic', label: '🐫 Nomadic / Caravan' },
  { value: 'treetop', label: '🌳 Treetop Settlement' },
  { value: 'floating', label: '⛵ Floating / Ship' },
  { value: 'burrow', label: '🕳️ Burrow / Den' },
  { value: 'nest', label: '🪹 Nest / Hive' },
  { value: 'dungeon', label: '⬛ Dungeon' },
  { value: 'temple', label: '🛕 Temple / Shrine Complex' },
  { value: 'mine', label: '⛏️ Mine / Quarry' },
  { value: 'tower', label: '🗼 Tower / Spire' },
  { value: 'outpost', label: '🚩 Outpost / Watchtower' },
  { value: 'port', label: '⚓ Port / Harbor' },
  { value: 'planar', label: '🌀 Planar / Extraplanar' },
];

/** First option is empty = not set */
export const SHARED_BIOME_VALUES = [
  '',
  'Temperate Forest',
  'Tropical Jungle',
  'Desert (Sandy)',
  'Desert (Rocky)',
  'Arctic Tundra',
  'Subarctic Taiga',
  'Grassland / Plains',
  'Savanna',
  'Coastal / Seaside',
  'Swamp / Marsh',
  'Mountain / Highland',
  'Underground / Underdark',
  'Volcanic',
  'Island / Archipelago',
  'River Valley',
  'Steppe',
  'Badlands',
];

export const SHARED_DIFFICULTY_OPTIONS = [
  { value: 'peaceful', label: '☀️ Peaceful (×1.0)', desc: 'Safe, established village with no threats' },
  { value: 'struggling', label: '⚔️ Struggling (×1.5)', desc: 'Occasional monsters, bandits, or hardship' },
  { value: 'frontier', label: '🏔️ Frontier (×2.0)', desc: 'Dangerous border, wild lands, regular threats' },
  { value: 'warzone', label: '🔥 Warzone (×3.0)', desc: 'Active conflict, siege, monster pressure, plague' },
];

/** Default race targets — same as Town Settings modal (`town_meta.demographics`). */
export const DEFAULT_DEMOGRAPHICS = [
  { race: 'Human', pct: 60 },
  { race: 'Dwarf', pct: 10 },
  { race: 'Elf', pct: 8 },
  { race: 'Halfling', pct: 7 },
  { race: 'Gnome', pct: 5 },
  { race: 'Half-Elf', pct: 4 },
  { race: 'Half-Orc', pct: 3 },
  { race: 'Other', pct: 3 },
];

/**
 * Parse `town_meta.demographics` into rows (JSON array, or comma-separated "Race N%" strings).
 */
export function parseDemographicsRows(meta) {
  const raw = meta?.demographics;
  if (!raw || String(raw).trim() === '') {
    return JSON.parse(JSON.stringify(DEFAULT_DEMOGRAPHICS));
  }
  try {
    const j = JSON.parse(raw);
    if (Array.isArray(j)) {
      const parsed = j
        .map((row) => ({
          race: String(row.race ?? '').trim(),
          pct: Math.max(0, Math.min(100, parseInt(row.pct, 10) || 0)),
        }))
        .filter((row) => row.race || row.pct > 0);
      if (parsed.length) return parsed;
      return JSON.parse(JSON.stringify(DEFAULT_DEMOGRAPHICS));
    }
  } catch {
    /* fall through */
  }
  const rows = String(raw)
    .split(',')
    .map((o) => o.trim())
    .map((o) => {
      const c = o.match(/^(.+?)\s+(\d+)%?$/);
      return c ? { race: c[1].trim(), pct: parseInt(c[2], 10) } : null;
    })
    .filter(Boolean);
  if (rows.length) return rows;
  return JSON.parse(JSON.stringify(DEFAULT_DEMOGRAPHICS));
}
