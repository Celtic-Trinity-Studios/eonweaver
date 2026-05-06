/**
 * D&D 3.5e Monster Advancer Engine
 * Pure math client-side engine for:
 * - HD advancement (recalculating HP, BAB, saves, skills, feats, size)
 * - Template application (Fiendish, Celestial, Half-Dragon, Lich, etc.)
 */

export function advanceMonster(baseStats, targetHD) {
    // Advanced math will be integrated here based on creature type and rules.
    const currentHD = baseStats.hd || 1;
    if (targetHD <= currentHD) return baseStats;
    
    // Placeholder for actual stat adjustment math based on SRD rules.
    const advanced = { ...baseStats };
    advanced.hd = targetHD;
    advanced.hp = Math.floor((baseStats.hp / currentHD) * targetHD); 
    // Further complex calculations for size changes, feats, and BAB.
    return advanced;
}

export function applyTemplate(baseStats, templateName) {
    const templated = { ...baseStats };
    
    switch(templateName.toLowerCase()) {
        case 'fiendish':
            templated.name = `Fiendish ${baseStats.name}`;
            templated.alignment = 'Evil';
            // Add smite good, darkvision, resistances
            break;
        case 'celestial':
            templated.name = `Celestial ${baseStats.name}`;
            templated.alignment = 'Good';
            // Add smite evil, darkvision, resistances
            break;
        case 'lich':
            templated.name = `${baseStats.name} (Lich)`;
            templated.type = 'Undead';
            // Recalculate hit dice to d12, add immunities, paralyzing touch
            break;
        case 'half-dragon':
            templated.name = `Half-Dragon ${baseStats.name}`;
            // Adjust stats, add breath weapon, natural armor
            break;
        // ... more templates
    }
    
    return templated;
}
