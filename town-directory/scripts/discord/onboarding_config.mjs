/** Edition + moderation roles for Discord onboarding (matches app campaign editions). */

/** Canonical welcome / edition-button channel (Discord slug). */
export const ONBOARDING_CHANNEL_NAME = 'start-here';

/** Legacy names merged into #start-here by setup. */
export const ONBOARDING_CHANNEL_ALIASES = ['start-here', 'onboarding', 'read-first'];

export const EDITION_ROLES = [
    {
        key: '35e',
        env: 'DISCORD_ROLE_EDITION_35E',
        name: 'Edition · 3.5e',
        color: 0x8b6914,
        emoji: '📖',
        buttonLabel: '3.5e',
        customId: 'ew_role_edition_35e',
    },
    {
        key: '5e',
        env: 'DISCORD_ROLE_EDITION_5E',
        name: 'Edition · 5e (2014)',
        color: 0x5865f2,
        emoji: '📜',
        buttonLabel: '5e 2014',
        customId: 'ew_role_edition_5e',
    },
    {
        key: '5e2024',
        env: 'DISCORD_ROLE_EDITION_5E2024',
        name: 'Edition · 5e (2024)',
        color: 0x57f287,
        emoji: '✨',
        buttonLabel: '5e 2024',
        customId: 'ew_role_edition_5e2024',
    },
];

export const SUSPICIOUS_ROLE = {
    env: 'DISCORD_ROLE_SUSPICIOUS',
    name: 'Suspicious',
    color: 0xed4245,
};

export function editionRoleId(key) {
    const row = EDITION_ROLES.find((e) => e.key === key);
    if (!row) return '';
    return (process.env[row.env] || '').trim();
}

export function allEditionRoleIds() {
    return EDITION_ROLES.map((e) => editionRoleId(e.key)).filter(Boolean);
}

export function suspiciousRoleId() {
    return (process.env[SUSPICIOUS_ROLE.env] || '').trim();
}
