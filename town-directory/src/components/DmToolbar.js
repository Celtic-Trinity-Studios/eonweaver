/**
 * Eon Weaver — Global DM Toolbar
 * Floating toolbar accessible from any page with:
 *   - Dice Roller
 *   - AI Loot & Treasure Generator
 *   - AI Magic Shop Generator
 */
import { roll, formatMod } from '../engine/dice.js';
import { simFetch } from '../api/client.js';
import { showToast } from './Toast.js';
import { getState } from '../stores/appState.js';

let toolbarMounted = false;
let activeTool = null; // 'dice' | 'loot' | 'shop' | null
let diceHistory = [];

export function mountDmToolbar() {
    if (toolbarMounted) return;
    toolbarMounted = true;

    const wrapper = document.createElement('div');
    wrapper.id = 'dm-toolbar-root';
    wrapper.innerHTML = `
    <div class="dm-toolbar">
        <button class="dm-tb-fab" id="dm-tb-toggle" title="DM Tools">🎲</button>
        <div class="dm-tb-buttons" id="dm-tb-buttons" style="display:none;">
            <button class="dm-tb-btn" data-tool="dice" title="Dice Roller">🎲</button>
            <button class="dm-tb-btn" data-tool="loot" title="Loot Generator">💰</button>
            <button class="dm-tb-btn" data-tool="shop" title="Magic Shop">🏪</button>
        </div>
    </div>

    <!-- Dice Roller Panel -->
    <div class="dm-panel" id="dm-panel-dice" style="display:none;">
        <div class="dm-panel-header">
            <h3>🎲 Dice Roller</h3>
            <button class="dm-panel-close" data-close="dice">✕</button>
        </div>
        <div class="dm-panel-body">
            <div class="enc-dice-input-row">
                <input type="text" id="dm-dice-expr" class="form-input" placeholder="2d6+3, 1d20, 4d6k3..." value="1d20">
                <button class="btn-primary btn-sm" id="dm-dice-roll-btn">🎲 Roll</button>
            </div>
            <div class="enc-dice-presets">
                <button class="btn-secondary btn-xs dm-dice-preset" data-expr="1d20">d20</button>
                <button class="btn-secondary btn-xs dm-dice-preset" data-expr="1d12">d12</button>
                <button class="btn-secondary btn-xs dm-dice-preset" data-expr="1d10">d10</button>
                <button class="btn-secondary btn-xs dm-dice-preset" data-expr="1d8">d8</button>
                <button class="btn-secondary btn-xs dm-dice-preset" data-expr="1d6">d6</button>
                <button class="btn-secondary btn-xs dm-dice-preset" data-expr="1d4">d4</button>
                <button class="btn-secondary btn-xs dm-dice-preset" data-expr="1d100">d100</button>
                <button class="btn-secondary btn-xs dm-dice-preset" data-expr="2d6">2d6</button>
                <button class="btn-secondary btn-xs dm-dice-preset" data-expr="4d6k3">4d6k3</button>
                <button class="btn-secondary btn-xs dm-dice-preset" data-expr="1d20+5">d20+5</button>
            </div>
            <div id="dm-dice-history" class="enc-dice-history"></div>
        </div>
    </div>

    <!-- Loot Generator Panel -->
    <div class="dm-panel" id="dm-panel-loot" style="display:none;">
        <div class="dm-panel-header">
            <h3>💰 AI Loot & Treasure</h3>
            <button class="dm-panel-close" data-close="loot">✕</button>
        </div>
        <div class="dm-panel-body">
            <div class="enc-ai-form">
                <div class="enc-ai-form-row">
                    <label>Party Level</label>
                    <input type="number" id="dm-loot-level" class="form-input" value="3" min="1" max="20">
                </div>
                <div class="enc-ai-form-row">
                    <label>Encounter CR</label>
                    <input type="text" id="dm-loot-cr" class="form-input" placeholder="e.g. 5" value="">
                </div>
                <div class="enc-ai-form-row">
                    <label>Loot Type</label>
                    <select id="dm-loot-type" class="form-input">
                        <option value="standard">Standard Treasure</option>
                        <option value="hoard">Dragon Hoard</option>
                        <option value="individual">Individual Monster</option>
                        <option value="quest_reward">Quest Reward</option>
                    </select>
                </div>
                <div class="enc-ai-form-row">
                    <label>Monster</label>
                    <input type="text" id="dm-loot-monster" class="form-input" placeholder="e.g. Dragon, Bandits...">
                </div>
                <div class="enc-ai-form-row">
                    <label>Notes</label>
                    <input type="text" id="dm-loot-notes" class="form-input" placeholder="e.g. No magic items...">
                </div>
                <button class="btn-primary" id="dm-loot-btn">💰 Generate Loot</button>
            </div>
            <div id="dm-loot-result" class="enc-ai-result"></div>
        </div>
    </div>

    <!-- Magic Shop Panel -->
    <div class="dm-panel" id="dm-panel-shop" style="display:none;">
        <div class="dm-panel-header">
            <h3>🏪 AI Magic Shop</h3>
            <button class="dm-panel-close" data-close="shop">✕</button>
        </div>
        <div class="dm-panel-body">
            <div class="enc-ai-form">
                <div class="enc-ai-form-row">
                    <label>Shop Type</label>
                    <select id="dm-shop-type" class="form-input">
                        <option value="general">General Magic Emporium</option>
                        <option value="weapons_armor">Weapons & Armor</option>
                        <option value="potions_scrolls">Potions & Scrolls</option>
                        <option value="wondrous">Wondrous Items</option>
                        <option value="divine">Divine / Temple</option>
                    </select>
                </div>
                <div class="enc-ai-form-row">
                    <label>Party Level</label>
                    <input type="number" id="dm-shop-level" class="form-input" value="3" min="1" max="20">
                </div>
                <div class="enc-ai-form-row">
                    <label>Notes</label>
                    <input type="text" id="dm-shop-notes" class="form-input" placeholder="e.g. Budget 5000gp...">
                </div>
                <button class="btn-primary" id="dm-shop-btn">🏪 Generate Shop</button>
            </div>
            <div id="dm-shop-result" class="enc-ai-result"></div>
        </div>
    </div>
    `;
    document.body.appendChild(wrapper);
    bindToolbarEvents(wrapper);
}

function bindToolbarEvents(root) {
    // Toggle toolbar buttons
    root.querySelector('#dm-tb-toggle').addEventListener('click', () => {
        const btns = root.querySelector('#dm-tb-buttons');
        const isVisible = btns.style.display !== 'none';
        btns.style.display = isVisible ? 'none' : 'flex';
    });

    // Tool button clicks
    root.querySelectorAll('.dm-tb-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tool = btn.dataset.tool;
            if (activeTool === tool) {
                closeTool(root, tool);
            } else {
                if (activeTool) closeTool(root, activeTool);
                openTool(root, tool);
            }
        });
    });

    // Close buttons
    root.querySelectorAll('.dm-panel-close').forEach(btn => {
        btn.addEventListener('click', () => closeTool(root, btn.dataset.close));
    });

    // ── Dice Roller ──
    function doRoll(expr) {
        try {
            const result = roll(expr);
            diceHistory.unshift({ expr, result, time: new Date().toLocaleTimeString() });
            if (diceHistory.length > 20) diceHistory.pop();
            renderDiceHistory(root);
        } catch (e) {
            showToast(`Invalid dice: ${e.message}`, 'error');
        }
    }

    root.querySelector('#dm-dice-roll-btn').addEventListener('click', () => {
        const expr = root.querySelector('#dm-dice-expr')?.value?.trim();
        if (expr) doRoll(expr);
    });
    root.querySelector('#dm-dice-expr').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const expr = e.target.value.trim();
            if (expr) doRoll(expr);
        }
    });
    root.querySelectorAll('.dm-dice-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            const expr = btn.dataset.expr;
            root.querySelector('#dm-dice-expr').value = expr;
            doRoll(expr);
        });
    });

    // ── AI Loot Generator ──
    root.querySelector('#dm-loot-btn').addEventListener('click', async () => {
        const btn = root.querySelector('#dm-loot-btn');
        const resultEl = root.querySelector('#dm-loot-result');
        btn.disabled = true; btn.textContent = '⏳ Generating...';
        resultEl.innerHTML = '<div class="enc-ai-loading"><div class="spinner"></div> AI is generating treasure...</div>';
        try {
            const res = await simFetch('generate_loot', {
                party_level: parseInt(root.querySelector('#dm-loot-level')?.value) || 3,
                encounter_cr: root.querySelector('#dm-loot-cr')?.value || '',
                loot_type: root.querySelector('#dm-loot-type')?.value || 'standard',
                monster_type: root.querySelector('#dm-loot-monster')?.value || '',
                notes: root.querySelector('#dm-loot-notes')?.value || '',
            });
            resultEl.innerHTML = renderLootResult(res.loot);
        } catch (e) {
            resultEl.innerHTML = `<div class="enc-ai-error">❌ ${e.message}</div>`;
        }
        btn.disabled = false; btn.textContent = '💰 Generate Loot';
    });

    // ── AI Magic Shop Generator ──
    root.querySelector('#dm-shop-btn').addEventListener('click', async () => {
        const btn = root.querySelector('#dm-shop-btn');
        const resultEl = root.querySelector('#dm-shop-result');
        btn.disabled = true; btn.textContent = '⏳ Generating...';
        resultEl.innerHTML = '<div class="enc-ai-loading"><div class="spinner"></div> AI is stocking the shop...</div>';
        try {
            // Try to get current town ID from app state
            const state = getState();
            const townId = state.currentTown?.id || 0;
            const res = await simFetch('generate_magic_shop', {
                town_id: townId,
                shop_type: root.querySelector('#dm-shop-type')?.value || 'general',
                party_level: parseInt(root.querySelector('#dm-shop-level')?.value) || 3,
                notes: root.querySelector('#dm-shop-notes')?.value || '',
            });
            resultEl.innerHTML = renderShopResult(res.shop);
        } catch (e) {
            resultEl.innerHTML = `<div class="enc-ai-error">❌ ${e.message}</div>`;
        }
        btn.disabled = false; btn.textContent = '🏪 Generate Shop';
    });
}

function openTool(root, tool) {
    activeTool = tool;
    root.querySelector(`#dm-panel-${tool}`).style.display = '';
    root.querySelector(`.dm-tb-btn[data-tool="${tool}"]`)?.classList.add('active');
}

function closeTool(root, tool) {
    activeTool = null;
    root.querySelector(`#dm-panel-${tool}`).style.display = 'none';
    root.querySelector(`.dm-tb-btn[data-tool="${tool}"]`)?.classList.remove('active');
}

function renderDiceHistory(root) {
    const el = root.querySelector('#dm-dice-history');
    if (!el) return;
    el.innerHTML = diceHistory.map((d, i) => `
        <div class="enc-dice-entry ${i === 0 ? 'enc-dice-latest' : ''}">
            <span class="enc-dice-total">${d.result.total}</span>
            <span class="enc-dice-detail">${d.expr} → [${d.result.rolls.join(', ')}]${d.result.modifier ? ` ${formatMod(d.result.modifier)}` : ''}</span>
            <span class="enc-dice-time">${d.time}</span>
        </div>
    `).join('');
}

function renderLootResult(loot) {
    const coins = loot.coins || {};
    const coinStr = ['cp','sp','gp','pp'].filter(c => coins[c] > 0).map(c => `${coins[c].toLocaleString()} ${c}`).join(', ') || 'None';
    return `
        <div class="enc-ai-result-card">
            ${loot.flavor_text ? `<p class="enc-ai-desc">${loot.flavor_text}</p>` : ''}
            <div class="enc-ai-loot-section"><strong>🪙 Coins:</strong> ${coinStr}</div>
            ${(loot.gems || []).length ? `<div class="enc-ai-loot-section"><strong>💎 Gems:</strong>${loot.gems.map(g => `<div class="enc-ai-loot-item"><span>${g.name}</span><span class="enc-ai-gp">${g.value_gp} gp</span>${g.description ? `<span class="enc-ai-item-desc">${g.description}</span>` : ''}</div>`).join('')}</div>` : ''}
            ${(loot.art_objects || []).length ? `<div class="enc-ai-loot-section"><strong>🎨 Art Objects:</strong>${loot.art_objects.map(a => `<div class="enc-ai-loot-item"><span>${a.name}</span><span class="enc-ai-gp">${a.value_gp} gp</span>${a.description ? `<span class="enc-ai-item-desc">${a.description}</span>` : ''}</div>`).join('')}</div>` : ''}
            ${(loot.mundane_items || []).length ? `<div class="enc-ai-loot-section"><strong>🛠️ Mundane:</strong>${loot.mundane_items.map(i => `<div class="enc-ai-loot-item"><span>${i.name}</span><span class="enc-ai-gp">${i.value_gp} gp</span></div>`).join('')}</div>` : ''}
            ${(loot.magic_items || []).length ? `<div class="enc-ai-loot-section enc-ai-magic"><strong>✨ Magic Items:</strong>${loot.magic_items.map(i => `<div class="enc-ai-loot-item enc-ai-magic-item"><span class="enc-ai-magic-name">${i.name}</span><span class="enc-ai-gp">${(i.value_gp || 0).toLocaleString()} gp</span>${i.description ? `<span class="enc-ai-item-desc">${i.description}</span>` : ''}${i.aura ? `<span class="enc-ai-aura">${i.aura}</span>` : ''}</div>`).join('')}</div>` : ''}
            <div class="enc-ai-meta-row"><strong>Total Value:</strong> <span class="enc-ai-gp-total">${(loot.total_value_gp || 0).toLocaleString()} gp</span></div>
        </div>
    `;
}

function renderShopResult(shop) {
    const keeper = shop.shopkeeper || {};
    return `
        <div class="enc-ai-result-card">
            <h4>${shop.shop_name || 'Magic Shop'}</h4>
            ${shop.flavor_text ? `<p class="enc-ai-desc">${shop.flavor_text}</p>` : ''}
            <div class="enc-ai-shopkeeper">
                <strong>Shopkeeper:</strong> ${keeper.name || '?'} (${keeper.race || '?'})
                ${keeper.description ? ` — ${keeper.description}` : ''}
            </div>
            ${shop.specialty ? `<div class="enc-ai-specialty">⭐ ${shop.specialty}</div>` : ''}
            <div class="enc-ai-shop-items">
                <table class="enc-ai-shop-table">
                    <thead><tr><th>Item</th><th>Type</th><th>Price</th><th>Stock</th></tr></thead>
                    <tbody>
                        ${(shop.items || []).map(i => `
                            <tr class="enc-ai-shop-row" title="${i.description || ''}">
                                <td class="enc-ai-shop-name">${i.name}</td>
                                <td class="enc-ai-shop-type">${i.type || ''}</td>
                                <td class="enc-ai-gp">${(i.price_gp || 0).toLocaleString()} gp</td>
                                <td>${i.stock || 1}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ${(shop.services || []).length ? `<div class="enc-ai-loot-section"><strong>🔧 Services:</strong>${shop.services.map(s => `<div class="enc-ai-loot-item"><span>${s.name}</span><span class="enc-ai-gp">${s.price_gp} gp</span>${s.description ? `<span class="enc-ai-item-desc">${s.description}</span>` : ''}</div>`).join('')}</div>` : ''}
            <div class="enc-ai-meta-row"><strong>Total Inventory:</strong> <span class="enc-ai-gp-total">${(shop.total_inventory_value_gp || 0).toLocaleString()} gp</span></div>
        </div>
    `;
}
