# Ashenholm Feature List

This document tracks all the custom features, mechanics, and UI additions we've built into the Ashenholm application.

## 🌟 Core Simulation & AI
*   **Dual-Tier AI Routing:** Automatically routes simple tasks (like generating stats) to faster/cheaper models (e.g., `gemini-2.5-flash`), and complex narrative tasks (like story generation) to smarter models via OpenRouter.
*   **Roster-Aware Name Generation:** The AI cross-references the existing town roster to guarantee unique, varied D&D fantasy names, preventing duplicates.
*   **0-Month Simulation (Time Freeze):** Allows you to add new arrivals to the town without advancing the calendar or triggering monthly events.
*   **Two-Phase Character Generation:** Phase 1 creates a lightweight roster in one AI call; Phase 2 fleshes out each character individually for better quality and diversity.
*   **Server-Side Stat Generation:** Ability scores (4d6 drop lowest + racial mods), HP, AC, saves, initiative, speed, grapple, attacks, and CR are all calculated server-side to save AI tokens and ensure D&D 3.5e accuracy.
*   **AI Data Debugging:** Raw AI response JSON is saved per character and viewable on the Background tab (click "🤖 AI Character Data" to expand) for troubleshooting what the AI returned vs. what the system calculated.
*   **AI Level Up:** One-click AI-powered level up button on each character sheet, applying D&D 3.5e leveling rules with a modal summary.
*   **XP Logging System:** Tracks monthly XP gains with reasons, game dates, and source attribution (AI-generated or server-side fallback); viewable in character sheet XP history.
*   **SRD Creature Intake:** Import SRD monsters (e.g., dragons, dire animals) directly into town rosters as residents with full stat blocks, HP variance, and unique naming.
*   **Max Creature CR Filtering:** Configurable per-town CR ceiling that filters SRD creature intake — only monsters at or below the set CR limit can be added.

## 🏰 Town Management & Settings
*   **Target Demographics Grid:** A "Town Settings" UI that lets you define exact target percentages for 12 D&D races. The AI uses these targets to naturally balance incoming population arrivals.
*   **Level Constraint:** All newly generated characters are strictly clamped to Level 1 (0 XP) by default unless specifically overridden by the DM.
*   **Race & Class Filter Dropdowns:** Two dropdown selects on the town roster for filtering by race and class, with counts shown.
*   **Living/Graveyard Tabs:** Roster split into Living and Deceased tabs for clean separation.

## 📊 Simulation Results
*   **Tabbed Results Panel:** Simulation results organized into tabs: Summary, Arrivals, Births, Deaths, Social, Progression, Roles, Buildings.
*   **Separate Population Categories:** Arrivals, Deaths, and Births each get their own tab (births auto-detected from backstory text).

## ⚔️ Character Sheet
*   **Tabbed Character Sheet:** Full D&D 3.5e character sheet with tabs: Core Stats, Inventory & Feats, Spells, Social, Background.
*   **Spell Manager:** Full spell management with known/prepared/spellbook support. Search with filters for level, class, and school. Spell tooltips on hover showing school, casting time, range, duration, and description.
*   **Equipment System:** Auto-purchase starting gear from SRD equipment tables using class starting gold.
*   **HP Tracker:** Click HP to open damage/heal/full heal panel.
*   **Roll Log:** Dice rolling with attack/damage rolls from clicking weapons.
*   **PDF Export:** Export character sheet to PDF.
*   **Portrait Upload:** Upload character portraits.

## 🤝 Social Systems
*   **Character Relationships:** NPC-to-NPC relationships tracked (friend, rival, enemy, etc.).
*   **Character Memories:** NPCs remember events and interactions.
*   **Faction System:** Organic faction formation with leaders, goals, and inter-faction relations.
*   **Incidents & Crimes:** AI-generated criminal incidents with perpetrators, victims, motives, clues, and witnesses.
*   **PC Reputation:** Track how NPCs and factions perceive player characters.

## 📖 SRD Browser
*   **Full SRD Database:** 3.5e spells, feats, equipment, races, classes, and skills loaded from SRD data.
*   **Searchable Browser:** Filter and search through all SRD content.

## ⚙️ App Configuration
*   **Campaign Rules Injection:** App settings allow defining XP scaling, death thresholds, relationship speeds, and conflict frequency—fed directly into the AI's system prompt.
*   **In-Game Calendar Customization:** Fully tracked timeline (Day/Month/Year + Era Name) with custom month names and lengths. Auto-updating month text blocks when count changes.
*   **Campaign Description:** Provide world lore and setting details that the AI uses for character backstories.

## 🏗️ Infrastructure
*   **Dev/Live Split:** Separate dev (worldscribe.online/dev/) and live (worldscribe.online/) deployments with independent builds.
*   **Safe Column Migrations:** Database setup script automatically adds new columns to existing tables without data loss.
*   **FTP Deploy Scripts:** One-command deploy for both dev and live environments.

---
*(Last updated: 2026-03-29)*
