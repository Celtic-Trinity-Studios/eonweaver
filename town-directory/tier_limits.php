<?php
/**
 * Subscription tier quotas — campaigns, towns, per-account content library.
 *
 * Monthly figures in tier_economics.php are wallet grants, not a hard stop on AI.
 * Towns, campaigns, and roster size are not capped by tier.
 *
 * When changing commercial defaults, update Price_Analysis.md and keep this file in sync.
 *
 * Human-facing “what’s included” lines: ew_tier_included_feature_bullets() → API tier_catalog[].includes
 */
if (!function_exists('ew_subscription_tier_ids')) {
    function ew_subscription_tier_ids(): array
    {
        return ['free', 'apprentice', 'adventurer', 'guild_master', 'world_builder'];
    }

    function ew_normalize_subscription_tier(string $tier): string
    {
        $t = strtolower(trim($tier));
        return in_array($t, ew_subscription_tier_ids(), true) ? $t : 'free';
    }

    /**
     * @return array<string, array{label: string, price_usd_month: float, max_campaigns: int, max_towns_per_campaign: int, content_max_file_bytes: int, content_max_files: int, content_max_storage_bytes: int}>
     */
    function ew_tier_default_limits_by_id(): array
    {
        return [
            'free' => [
                'label' => 'Free',
                'price_usd_month' => 0.0,
                'max_campaigns' => 999,
                'max_towns_per_campaign' => 999,
                'content_max_file_bytes' => 2 * 1024 * 1024,
                'content_max_files' => 10,
                'content_max_storage_bytes' => 20 * 1024 * 1024,
            ],
            'apprentice' => [
                'label' => 'Apprentice',
                'price_usd_month' => 5.0,
                'max_campaigns' => 999,
                'max_towns_per_campaign' => 999,
                'content_max_file_bytes' => 3 * 1024 * 1024,
                'content_max_files' => 25,
                'content_max_storage_bytes' => 50 * 1024 * 1024,
            ],
            'adventurer' => [
                'label' => 'Adventurer',
                'price_usd_month' => 10.0,
                'max_campaigns' => 999,
                'max_towns_per_campaign' => 999,
                'content_max_file_bytes' => 5 * 1024 * 1024,
                'content_max_files' => 50,
                'content_max_storage_bytes' => 100 * 1024 * 1024,
            ],
            'guild_master' => [
                'label' => 'Guild Master',
                'price_usd_month' => 20.0,
                'max_campaigns' => 999,
                'max_towns_per_campaign' => 999,
                'content_max_file_bytes' => 10 * 1024 * 1024,
                'content_max_files' => 200,
                'content_max_storage_bytes' => 500 * 1024 * 1024,
            ],
            'world_builder' => [
                'label' => 'World Builder',
                'price_usd_month' => 40.0,
                'max_campaigns' => 999,
                'max_towns_per_campaign' => 999,
                'content_max_file_bytes' => 20 * 1024 * 1024,
                'content_max_files' => 9999,
                'content_max_storage_bytes' => 2048 * 1024 * 1024,
            ],
        ];
    }

    /** @return array{label: string, price_usd_month: float, max_campaigns: int, max_towns_per_campaign: int, content_max_file_bytes: int, content_max_files: int, content_max_storage_bytes: int} */
    function ew_tier_limits_for_user_tier(string $tier): array
    {
        $t = ew_normalize_subscription_tier($tier);
        $all = ew_tier_default_limits_by_id();
        return $all[$t] ?? $all['free'];
    }

    function ew_tier_max_campaigns(string $tier): int
    {
        return (int) ew_tier_limits_for_user_tier($tier)['max_campaigns'];
    }

    function ew_tier_max_towns_per_campaign(string $tier): int
    {
        return (int) ew_tier_limits_for_user_tier($tier)['max_towns_per_campaign'];
    }

    /**
     * Short product bullets for checkout / Settings (no HTML).
     * @return list<string>
     */
    function ew_tier_included_feature_bullets(string $tierId): array
    {
        $tierId = ew_normalize_subscription_tier($tierId);
        $lim = ew_tier_limits_for_user_tier($tierId);
        $libMb = (int) round($lim['content_max_storage_bytes'] / (1024 * 1024));
        $libGb = $lim['content_max_storage_bytes'] >= 1024 * 1024 * 1024
            ? round($lim['content_max_storage_bytes'] / (1024 * 1024 * 1024), 1) . ' GB'
            : $libMb . ' MB';

        $quota = sprintf(
            'Library storage: %s. Towns, campaigns, roster size, and file count are not capped. A file can be as large as the storage you have left.',
            $libGb
        );

        $aiWalletLine =
            $tierId === 'free'
                ? 'AI calls spend your Eon Credits and stop only when the wallet is empty. Credits saved on a paid plan still spend after you move to Free. Free adds a small starter grant after email verification and does not add a monthly grant.'
                : 'AI calls spend your Eon Credits and stop only when the wallet is empty. This plan adds a monthly credit grant on each renewal (upgrades add the difference). Unused credits stay in the wallet if you later change plans.';

        return [
            $quota,
            'SRD rules browser (edition follows the active campaign).',
            'Towns: roster, relationships, buildings, town history, in-game calendar, campaign rules & lore.',
            'Wiki, Scribe, homebrew, world map, trade routes, calendar tooling, and exports where enabled in your build.',
            $aiWalletLine,
            'AI town and multi-town world simulation use the same wallet as other AI calls.',
        ];
    }

    /**
     * Public tier matrix for API clients (Settings, future checkout page).
     *
     * @return list<array{id: string, label: string, price_usd_month: float, max_campaigns: int, max_towns_per_campaign: int, content_max_file_bytes: int, content_max_files: int, content_max_storage_bytes: int, includes: list<string>}>
     */
    function ew_tier_public_catalog(): array
    {
        $all = ew_tier_default_limits_by_id();
        $out = [];
        foreach (ew_subscription_tier_ids() as $id) {
            $row = $all[$id];
            $out[] = [
                'id' => $id,
                'label' => $row['label'],
                'price_usd_month' => $row['price_usd_month'],
                'max_campaigns' => $row['max_campaigns'],
                'max_towns_per_campaign' => $row['max_towns_per_campaign'],
                'content_max_file_bytes' => $row['content_max_file_bytes'],
                'content_max_files' => $row['content_max_files'],
                'content_max_storage_bytes' => $row['content_max_storage_bytes'],
                'includes' => ew_tier_included_feature_bullets($id),
            ];
        }
        return $out;
    }
}
