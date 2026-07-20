/**
 * Per-edition lore categories: news, discussion, requests (role-gated).
 * Role IDs come from onboarding env (DISCORD_ROLE_EDITION_*).
 */

export const EDITION_LORE_EDITIONS = [
    {
        key: '35e',
        roleEnv: 'DISCORD_ROLE_EDITION_35E',
        categoryName: '📖 Lore · 3.5e',
        categoryEnv: 'DISCORD_CATEGORY_LORE_35E',
        channels: [
            { name: 'lore-35e-news', topic: '3.5e news and patch notes' },
            { name: '35e-discussion', topic: '3.5e rules, builds, and table talk' },
            { name: 'lore-35e-requests', topic: '3.5e lore requests for Eon Weaver' },
        ],
    },
    {
        key: '5e',
        roleEnv: 'DISCORD_ROLE_EDITION_5E',
        categoryName: '📜 Lore · 5e (2014)',
        categoryEnv: 'DISCORD_CATEGORY_LORE_5E',
        channels: [
            { name: 'lore-5e-news', topic: '5e (2014) news and patch notes' },
            { name: '5e-discussion', topic: '5e 2014 rules, builds, and table talk' },
            { name: 'lore-5e-requests', topic: '5e 2014 lore requests for Eon Weaver' },
        ],
    },
    {
        key: '5e2024',
        roleEnv: 'DISCORD_ROLE_EDITION_5E2024',
        categoryName: '✨ Lore · 5e (2024)',
        categoryEnv: 'DISCORD_CATEGORY_LORE_5E2024',
        channels: [
            { name: 'lore-5e2024-news', topic: '5e (2024) news and patch notes' },
            { name: '5e2024-discussion', topic: '5e 2024 rules, builds, and table talk' },
            { name: 'lore-5e2024-requests', topic: '5e 2024 lore requests for Eon Weaver' },
        ],
    },
];

/** Legacy category slug → edition key (merge channels into the right edition). */
export const LEGACY_CATEGORY_NAMES = {
    '📜 lore · 5e+': '5e',
    'lore · 5e+': '5e',
    '📖 lore · 3.5e': '35e',
    'lore · 3.5e': '35e',
};
