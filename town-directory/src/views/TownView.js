/**
 * TownView.js — Town Roster view
 * Reconstructed from production bundle (variable names minified)
 */
import { getState as Z, setState as ee } from '../stores/appState.js';
import { navigate as ge } from '../router.js';
import { apiFetch as P } from '../api/client.js';
import { simFetch as ze } from '../api/client.js';
import { apiGetTowns as dt, apiGetTownMeta as Pt, apiSaveTownMeta as Qe, apiDeleteTown as Sa, apiPurgePopulation as $a, apiGetHistory as _a, apiCreateTown as $n } from '../api/towns.js';
import { apiGetCharacters as Ee, apiSaveCharacter as St, apiLevelUpCharacter as An, apiDeleteCharacter as ka, apiMoveCharacter as La, apiGetXpLog as Mn, normalizeCharacter as Me } from '../api/characters.js';
import { apiRunSimulation as wt, apiApplySimulation as Ve, apiIntakeRoster as Cn, apiIntakeFlesh as ws, apiIntakeCreature as Ss, apiGetCampaignRules as Ft, apiAutoAssignSpellsTown as xn } from '../api/simulation.js';
import { apiGetBuildings as qn, apiSaveBuilding as or, apiDeleteBuilding as cr, apiSaveRoom as dr, apiDeleteRoom as pr, apiAssignCharacterBuilding as ur } from '../api/buildings.js';
import { openCharacterImportModal } from '../components/CharacterImport.js';
import { showModal as ha, closeModal as ft } from '../components/Modal.js';
import { showToast as ye } from '../components/Toast.js';
import { renderCharacterSheet as at } from '../components/CharacterSheet.js';
import { openTownSetupWizard } from '../components/TownSetupWizard.js';

// Bundle artifact namespace imports — Pe/yn were Vite's internal module refs in the original bundle
import * as Pe from '../components/Modal.js';
import * as yn from '../api/auth.js';

// Polyfill for Vite __vitePreload (ne) — just calls the factory function
const ne = (fn) => fn();

// This file was auto-reconstructed from the production bundle.
// The code is fully functional with minified local variable names.

const Bi={Human:"var(--race-human, #c9a84c)",Dwarf:"var(--race-dwarf, #a0522d)",Elf:"var(--race-elf, #4fc978)",Halfling:"var(--race-halfling, #e6a040)",Gnome:"var(--race-gnome, #c97fbf)","Half-Elf":"var(--race-half-elf, #5fb8a0)","Half-Orc":"var(--race-half-orc, #8b4513)",Tiefling:"var(--race-tiefling, #c0392b)",Orc:"var(--race-orc, #556b2f)",Goblin:"var(--race-goblin, #6b8e23)",Drow:"var(--race-drow, #8a2be2)"};function Fi(e,t){const s=Z(),a=t.id?parseInt(t.id):s.currentTownId;if(!a){e.innerHTML=`
      <div class="view-empty">
        <h2> No Town Selected</h2>
        <p>Select a town from the <a href="/dev/dashboard">Dashboard</a> or create a new one.</p>
      </div>
    `;return}e.innerHTML=`
    <div class="view-town">
      <header class="view-header">
        <div class="view-header-left">
          <select id="town-select-view" class="town-select"></select>
          <div class="search-box">
            <span class="search-icon">&#x1F50D;</span>
            <input id="town-search" type="text" placeholder="Search..." spellcheck="false">
          </div>
        </div>
        <div class="view-header-right">
          <button class="btn-secondary btn-sm" id="town-stats-btn">Stats</button>
          <button class="btn-secondary btn-sm" id="town-settings-btn">Settings</button>
          <button class="btn-secondary btn-sm" id="town-buildings-btn" style="border-color:rgba(184,115,51,0.3);color:var(--accent,#B87333)">🏘️ Buildings</button>
          <button class="btn-secondary btn-sm" id="town-social-btn" style="border-color:rgba(245,197,24,0.3);color:var(--accent,#f5c518)">🤝 Social</button>
          <button class="btn-secondary btn-sm" id="town-history-btn">History</button>
          <button class="btn-primary btn-sm" id="town-sim-btn">Simulate</button>
          <button class="btn-secondary btn-sm" id="town-import-btn">Import</button>
          <button class="btn-danger btn-sm" id="town-purge-btn" title="Delete population and/or buildings">☠️ Purge Town Data</button>
          <button class="btn-danger btn-sm" id="town-delete-btn">Delete Town</button>
        </div>
      </header>

      <div class="town-filters">
        <div id="race-filters" class="filter-group"></div>
      </div>

      <div class="split-layout">
        <aside class="list-panel">
          <div class="roster-tabs" id="roster-tabs"></div>
          <div class="list-header" id="list-header"></div>
          <div class="list-body" id="list-body"></div>
          <div class="list-footer" id="stats-bar"></div>
          <div class="setup-bar" id="setup-bar">
            <button class="btn-primary btn-sm" id="town-setup-btn" style="width:100%;padding:0.6rem;">🏗️ Town Setup</button>
          </div>
        </aside>
        <section class="detail-panel-inline" id="detail-area">
          <div class="detail-empty">Select a character</div>
        </section>
      </div>
    </div>
  `,Oi(e,a)}async function Oi(e,t){var s,a,n,l,i,r,p,o,c,d,u,v,m;try{const b=await dt(),y=Array.isArray(b)?b:b.towns||[],f=e.querySelector("#town-select-view");f&&(f.innerHTML=y.map(w=>`<option value="${w.id}" ${w.id===t?"selected":""}>${w.name}</option>`).join(""),f.addEventListener("change",w=>{ge(`town/${w.target.value}`)}));const[g,k]=await Promise.all([Ee(t),qn(t).catch(()=>({buildings:[]}))]),_=(g.characters||[]).map(Me),$=k.buildings||[],L=y.find(w=>w.id===t)||{id:t,name:"Unknown"};L.characters=_,L.buildings=$,ee({currentTownId:t,currentTown:L,towns:y}),Ze(e,_,$),et(e,_),Ra(e),ke(e,_),xe(e,_),(s=e.querySelector("#town-search"))==null||s.addEventListener("input",w=>{ee({searchQuery:w.target.value.trim()}),ke(e,_)}),(a=e.querySelector("#town-sim-btn"))==null||a.addEventListener("click",()=>{ge("simulation")}),(n=e.querySelector("#town-stats-btn"))==null||n.addEventListener("click",()=>{ge("townstats/"+t)}),(l=e.querySelector("#town-import-btn"))==null||l.addEventListener("click",()=>{openCharacterImportModal(e,t,_)}),(i=e.querySelector("#town-history-btn"))==null||i.addEventListener("click",()=>{Wi(t)}),(r=e.querySelector("#town-settings-btn"))==null||r.addEventListener("click",()=>{Ui(t)}),(p=e.querySelector("#town-buildings-btn"))==null||p.addEventListener("click",async()=>{const{openBuildingsPanel:w}=await import("../components/BuildingsPanel.js");w(t)}),(o=e.querySelector("#town-social-btn"))==null||o.addEventListener("click",async()=>{const{openTownSocialPanel:w}=await import("../components/TownSocialPanel.js");w(t)});
// Town Setup Wizard button
const setupBtn = e.querySelector("#town-setup-btn");
if (setupBtn) {
  setupBtn.addEventListener("click", () => {
    openTownSetupWizard(t, async () => {
      const F = ((await Ee(t)).characters || []).map(Me);
      Z().currentTown.characters = F;
      _.length = 0;
      _.push(...F);
      Ze(e, _, $);
      et(e, _);
      ke(e, _);
      xe(e, _);
    });
  });
}
(c=e.querySelector("#town-purge-btn"))==null||c.addEventListener("click",async()=>{
const {showModal:sm} = await ne(async()=>{const{showModal:r}=await Promise.resolve().then(()=>Pe);return{showModal:r}},void 0);
const w=L.name||"this town",A=_.length;
console.log('[Purge] Opening purge modal for town:', w, '| Population:', A, '| TownID:', t);
const {el:modalEl, close:closeModal} = sm({
title:"☠️ Purge Town Data",
width:"normal",
content:`
<div style="padding:1rem;">
<p>Select what data you want to permanently delete from <strong>${w}</strong>.</p>
<div class="form-group">
<label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;"><input type="checkbox" id="purge-pop-chk" checked> Purge Population (${A} characters)</label>
</div>
<div class="form-group" style="margin-top:0.5rem;">
<label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;"><input type="checkbox" id="purge-bld-chk"> Purge Buildings</label>
</div>
<div class="form-group" style="margin-top:1rem;">
<label>Type town name to confirm: <strong>${w}</strong></label>
<input type="text" id="purge-confirm-name" class="form-input" style="margin-top:0.5rem;" placeholder="Type the exact town name here">
</div>
<div id="purge-status" style="margin-top:0.5rem;"></div>
<div class="modal-actions" style="margin-top:1rem;">
<button class="btn-danger" id="purge-confirm-btn" disabled>Purge Selected Data</button>
<button class="btn-secondary" id="purge-cancel-btn">Cancel</button>
</div>
</div>
`
});
const confirmName = modalEl.querySelector('#purge-confirm-name');
const confirmBtn = modalEl.querySelector('#purge-confirm-btn');
const cancelBtn = modalEl.querySelector('#purge-cancel-btn');
const popChk = modalEl.querySelector('#purge-pop-chk');
const bldChk = modalEl.querySelector('#purge-bld-chk');
const purgeStatus = modalEl.querySelector('#purge-status');
confirmName.addEventListener('input', () => {
    const match = confirmName.value.trim().toLowerCase() === w.trim().toLowerCase();
    confirmBtn.disabled = !match;
});
cancelBtn.addEventListener('click', () => closeModal());
confirmBtn.addEventListener('click', async () => {
    const purgePop = popChk.checked;
    const purgeBld = bldChk.checked;
    if (!purgePop && !purgeBld) {
        purgeStatus.innerHTML = '<span style="color:var(--error)">⚠️ No data selected to purge.</span>';
        return;
    }
    confirmBtn.disabled = true;
    confirmBtn.textContent = '⏳ Purging...';
    purgeStatus.innerHTML = '<span style="color:var(--text-secondary)">🔄 Purging data...</span>';
    console.log('[Purge] Starting purge — pop:', purgePop, '| bld:', purgeBld, '| townId:', t);
    try {
        const h = await $a(t, purgePop, purgeBld);
        console.log('[Purge] API response:', h);
        let msg = [];
        if (purgePop) msg.push((h.purged || A) + " characters");
        if (purgeBld) msg.push("buildings");
        const successMsg = msg.join(" and ") + " purged from " + w + ".";
        purgeStatus.innerHTML = `<span style="color:var(--success)">✅ ${successMsg}</span>`;
        ye(successMsg, 'success');
        if (purgePop) {
            const F = ((await Ee(t)).characters||[]).map(Me);
            console.log('[Purge] Re-fetched characters after purge:', F.length);
            Z().currentTown.characters=F;
            _.length=0;
            _.push(...F);
            Ze(e,F,$);
            et(e,F);
            ke(e,F);
            xe(e,F);
            const D=e.querySelector("#detail-area");
            D&&(D.innerHTML='<div class="detail-empty">Select a character</div>');
        }
        if (purgeBld) {
            // Refresh buildings list after building purge
            try {
                const bldData = await qn(t);
                const newBld = bldData.buildings || [];
                $.length = 0;
                $.push(...newBld);
                if (Z().currentTown) Z().currentTown.buildings = newBld;
            } catch(be) { console.warn('[Purge] Building refresh error:', be); }
        }
        setTimeout(() => closeModal(), 1500);
    } catch(err) {
        console.error('[Purge] FAILED:', err);
        purgeStatus.innerHTML = `<span style="color:var(--error)">❌ Failed to purge: ${err.message}</span>`;
        ye('Purge failed: ' + err.message, 'error');
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Purge Selected Data';
    }
});
}),(d=e.querySelector("#town-delete-btn"))==null||d.addEventListener("click",async()=>{const w=L.name||"this town",A=prompt('This will permanently delete "'+w+`" and ALL its characters.

Type the town name to confirm:`);if(A&&A.trim().toLowerCase()===w.toLowerCase())try{await Sa(t),alert(w+" has been deleted."),ge("dashboard")}catch(M){alert("Failed to delete town: "+M.message)}else A!==null&&alert("Town name did not match. Deletion cancelled.")}),(u=e.querySelector("#list-body"))==null||u.addEventListener("click",w=>{const A=w.target.closest(".char-row");if(!A)return;const M=parseInt(A.dataset.id),h=_.find(q=>q.id===M||q.dbId===M);if(h){ee({selectedCharId:h.id});const q=e.querySelector("#detail-area");q&&at(q,h,{onListRefresh:()=>{ke(e,_),xe(e,_)},onDelete:async()=>{const D=((await Ee(Z().currentTownId)).characters||[]).map(Me);Z().currentTown.characters=D,ee({selectedCharId:null}),ke(e,D),xe(e,D),q.innerHTML='<div class="detail-empty">Select a character</div>'},containerRef:e})}}),(v=e.querySelector("#intake-generate-btn"))==null||v.addEventListener("click",async()=>{var q,F,D,J,Y;const w=Math.max(1,Math.min(50,parseInt((q=e.querySelector("#intake-count"))==null?void 0:q.value)||5)),A=e.querySelector("#intake-generate-btn"),M=e.querySelector("#intake-status"),h=10;A.disabled=!0,A.textContent="⏳ Generating...";try{let S="";try{const E=await Ft(),j=[];E.campaign_description&&j.push(E.campaign_description),E.rules_text&&j.push("House Rules: "+E.rules_text);const B=E.homebrew_settings||{},N=[],z={magic_level:{label:"MAGIC LEVEL",none:"None — mundane.",low:"Low — rare.",standard:"Standard.",high:"High — common.",wild:"Wild — unpredictable."},tech_level:{label:"TECHNOLOGY",primitive:"Primitive.",ancient:"Ancient.",medieval:"Medieval.",renaissance:"Renaissance.",magitech:"Magitech.",steampunk:"Steampunk."},tone:{label:"TONE",grimdark:"Grimdark.",dark_fantasy:"Dark Fantasy.",standard:"Standard.",lighthearted:"Lighthearted.",horror:"Horror.",intrigue:"Political Intrigue.",mythic_saga:"Mythic Saga."},divine:{label:"DIVINE",absent:"Absent.",distant:"Distant.",active:"Active.",meddling:"Meddling."},planar:{label:"PLANAR",sealed:"Sealed.",rare:"Rare.",active:"Active.",chaotic:"Chaotic."},economy:{label:"ECONOMY",barter:"Barter.",poor:"Impoverished.",standard:"Standard.",rich:"Prosperous.",guild:"Guild-Controlled."},law:{label:"LAW",lawless:"Lawless.",frontier:"Frontier.",standard:"Standard.",authoritarian:"Authoritarian.",theocracy:"Theocratic."},monster_intelligence:{label:"MONSTERS",bestial:"Bestial.",cunning:"Cunning.",sentient:"Sentient."},power_level:{label:"POWER",gritty:"Gritty.",heroic:"Heroic.",mythic:"Mythic."},ability_scores:{label:"ABILITY SCORES",standard_array:"Standard Array.",point_buy:"Point Buy.",roll_4d6:"4d6 drop lowest.",roll_3d6:"3d6 straight.",heroic:"Heroic Array."},leveling:{label:"LEVELING",xp:"XP-based.",milestone:"Milestone.",session:"Session-based.",slow:"Slow.",fast:"Fast."},multiclass:{label:"MULTICLASS",forbidden:"Forbidden.",restricted:"Restricted.",standard:"Standard.",free:"Free."},alignment:{label:"ALIGNMENT",strict:"Strict.",guideline:"Guideline.",dynamic:"Dynamic.",none:"None."},racial:{label:"RACIAL",standard:"Standard.",flexible:"Flexible.",custom_lineage:"Custom Lineage.",no_bonuses:"No Bonuses."},feats:{label:"FEATS",none:"None.",standard:"Standard.",bonus:"Bonus.",frequent:"Frequent.",free_start:"Free Starting."},mortality:{label:"MORTALITY",lethal:"Lethal.",impactful:"Impactful.",rare:"Rare."},death:{label:"DEATH",permanent:"Permanent.",costly:"Costly.",available:"Available.",impactful:"Impactful."},healing:{label:"HEALING",fast:"Fast.",standard:"Standard.",slow:"Slow.",gritty:"Gritty.",medicine:"Medicine Required."},resting:{label:"RESTING",standard:"Standard.",gritty:"Gritty.",epic:"Epic Heroism.",safe_haven:"Safe Haven."},encumbrance:{label:"ENCUMBRANCE",none:"None.",simple:"Simple.",variant:"Variant.",slot:"Slot-Based.",strict:"Strict."},disease:{label:"DISEASE",none:"None.",rare:"Rare.",realistic:"Realistic.",rampant:"Rampant."},natural_hazards:{label:"HAZARDS",mild:"Mild.",standard:"Standard.",harsh:"Harsh.",catastrophic:"Catastrophic."},npc_depth:{label:"NPC DEPTH",simple:"Simple.",standard:"Standard.",deep:"Deep.",literary:"Literary."},romance:{label:"ROMANCE",none:"None.",subtle:"Subtle.",present:"Present.",focus:"Focus."},factions:{label:"FACTIONS",none:"None.",simple:"Simple.",complex:"Complex.",dominant:"Dominant."},crafting:{label:"CRAFTING",none:"None.",simple:"Simple.",detailed:"Detailed.",central:"Central."},magic_items:{label:"MAGIC ITEMS",nonexistent:"Nonexistent.",very_rare:"Very Rare.",uncommon:"Uncommon.",available:"Available.",abundant:"Abundant."},undead:{label:"UNDEAD",nonexistent:"Nonexistent.",abomination:"Abomination.",standard:"Standard.",commonplace:"Commonplace.",dominant:"Dominant."}};for(const[G,x]of Object.entries(B))x&&((F=z[G])!=null&&F[x])&&N.push(`${z[G].label}: ${z[G][x]}`);N.length&&j.push(`HOMEBREW RULES:
`+N.join(`
`));try{const x=(await Pt(Z().currentTownId)).meta||{};if(x.gen_rules){const U=JSON.parse(x.gen_rules),K=[],ae={hp_rule:{label:"HP RULE",max:"Max HP.",average:"Average.",rolled:"Rolled.",max_first:"Max L1, roll after."},sources:{label:"SOURCES",phb_only:"PHB Only.",phb_xge:"PHB+XGE.",phb_xge_tce:"PHB+XGE+TCE.",all_official:"All Official.",homebrew:"All+Homebrew."},starting_equip:{label:"START EQUIP",class_default:"Class Default.",rolled_gold:"Rolled Gold.",minimal:"Minimal.",wealthy:"Wealthy."},class_dist:{label:"CLASS DIST",commoner:"Mostly Commoners.",balanced:"Balanced.",adventurer:"Adventurer-Heavy.",elite:"Elite."},name_style:{label:"NAME STYLE",high_fantasy:"High Fantasy.",cultural:"Cultural.",real_world:"Real-World.",whimsical:"Whimsical."},bg_complexity:{label:"BACKGROUND",simple:"Simple.",standard:"Standard.",detailed:"Detailed.",epic:"Epic."},age_dist:{label:"AGE DIST",young:"Young.",prime:"Prime.",full_range:"Full Range.",elder:"Elder-Heavy."}};U.intake_level&&parseInt(U.intake_level)>0?K.push(`INTAKE LEVEL: All new NPCs are level ${U.intake_level}.`):(U.intake_level==="0"||U.intake_level===0)&&K.push("INTAKE LEVEL: AI picks an appropriate level for each creature. For humanoids, randomize between levels 1-4. For monsters/creatures, use a level appropriate to the creature type."),U.max_level&&K.push(`MAX LEVEL: NPCs cannot exceed level ${U.max_level}.`);for(const[C,T]of Object.entries(U))C==="intake_level"||C==="max_level"||T&&((D=ae[C])!=null&&D[T])&&K.push(`${ae[C].label}: ${ae[C][T]}`);K.length&&j.push(`TOWN GENERATION RULES:
`+K.join(`
`))}}catch{}S=j.join(`

`)}catch{}const H=((Y=(J=e.querySelector("#intake-instructions"))==null?void 0:J.value)==null?void 0:Y.trim())||"",O=/\b(stirge|goblin|kobold|orc|skeleton|zombie|rat|wolf|spider|bat|snake|bear|ogre|troll|undead|beast|creature|monster|animal|vermin|aberration|ooze|elemental|fiend|fey|dragon|worg|hyena|dire|ghoul|wight|wraith|gnoll|lizardfolk|bugbear|hobgoblin|minotaur|harpy|imp|demon|devil|slime|ant|scorpion|centipede|crocodile|shark|owl|hawk|eagle|boar|lion|tiger|ape|horse|mule|donkey|cat|dog|badger|wolverine|weasel|raven|toad|lizard|squid|octopus|crab|wasp|beetle|moth|gryphon|griffon|basilisk|cockatrice|chimera|manticore|hydra|gargoyle|golem|treant|dryad|nymph|satyr|pegasus|unicorn|wyvern|drake|giant)\b/i,V=/^(human|elf|dwarf|halfling|gnome|half-elf|half-orc|tiefling|dragonborn|aasimar)$/i;let Q=H.match(O),se=[],we=0;try{const j=((await Pt(Z().currentTownId)).meta||{}).demographics||"";if(j){const B=j.split(",").map(N=>N.trim());for(const N of B){const z=N.match(/^(.+?)\s+(\d+)%?$/);if(z){const G=z[1].trim(),x=parseInt(z[2]);V.test(G)?we+=x:O.test(G)?se.push({name:G,pct:x}):se.push({name:G,pct:x})}}}}catch{}if(se.length>0&&we===0&&!Q){M.innerHTML='<span style="color:var(--text-secondary)">🐉 Creature demographics detected — pulling from SRD...</span>';try{let E=0,j=se.map(x=>({...x,exact:w*x.pct/100,count:Math.max(1,Math.floor(w*x.pct/100))})),B=j.reduce((x,U)=>x+U.count,0),N=w-B;if(N>0){j.sort((x,U)=>U.exact-Math.floor(U.exact)-(x.exact-Math.floor(x.exact)));for(let x=0;x<N&&x<j.length;x++)j[x].count++}else if(B>w)for(j.sort((x,U)=>x.pct-U.pct);B>w&&j.length>0;){const x=j.find(U=>U.count>1);if(x)x.count--,B--;else break}for(const x of j){M.innerHTML=`<span style="color:var(--text-secondary)">🔍 Looking up "${x.name}" in SRD... (${x.count} creatures)</span>`;try{const K=(await Ss(t,x.name,x.count,H)).characters||[];K.length>0&&(await Ve(t,{new_characters:K},null,0),E+=K.length)}catch(U){console.warn(`SRD lookup failed for "${x.name}":`,U.message)}}const G=((await Ee(t)).characters||[]).map(Me);Z().currentTown.characters=G,_.length=0,_.push(...G),Ze(e,G),et(e,G),ke(e,G),xe(e,G),E>0?(M.innerHTML=`<span style="color:var(--success)">✅ ${E} creatures added from SRD! No AI credits used.</span>`,setTimeout(()=>{M.innerHTML=""},8e3)):M.innerHTML='<span style="color:var(--error)">❌ No matching creatures found in SRD. Check demographic race names match SRD monster names.</span>';return}catch(E){M.innerHTML=`<span style="color:var(--error)">❌ SRD creature error: ${E.message}</span>`;return}}if(Q){const E=Q[1];M.innerHTML=`<span style="color:var(--text-secondary)">🔍 Looking up "${E}" in SRD database...</span>`;try{const j=await Ss(t,E,w,H),B=j.characters||[],N=j.monster_info;if(B.length===0){M.innerHTML=`<span style="color:var(--error)">❌ "${E}" not found in SRD. Try the exact SRD name (e.g. "Wolf" not "Wolves").</span>`;return}M.innerHTML=`<span style="color:var(--text-secondary)">💾 Adding ${B.length}x ${(N==null?void 0:N.name)||E} (${(N==null?void 0:N.type)||"?"}, CR ${(N==null?void 0:N.cr)||"?"})...</span>`,await Ve(t,{new_characters:B},null,0);const x=((await Ee(t)).characters||[]).map(Me);Z().currentTown.characters=x,_.length=0,_.push(...x),Ze(e,x),et(e,x),ke(e,x),xe(e,x),M.innerHTML=`<span style="color:var(--success)">✅ ${B.length}x ${(N==null?void 0:N.name)||E} added from SRD! (${(N==null?void 0:N.type)||"?"}, CR ${(N==null?void 0:N.cr)||"?"}, HD ${(N==null?void 0:N.hd)||"?"}) — No AI credits used.</span>`,setTimeout(()=>{M.innerHTML=""},8e3);return}catch(j){M.innerHTML=`<span style="color:var(--error)">❌ SRD creature error: ${j.message}</span>`;return}}M.innerHTML=`<span style="color:var(--text-secondary)">📋 Step 1/2: Creating character roster (${w} characters)...</span>`;const de=(await Cn(t,w,S,H)).roster||[];if(de.length===0){M.innerHTML='<span style="color:var(--error)">❌ AI returned empty roster</span>';return}M.innerHTML=`<span style="color:var(--success)">✅ Step 1/2: Roster created — ${de.length} characters planned</span>`,await new Promise(E=>setTimeout(E,800));let Le=0,pe=0,be=0;for(let E=0;E<de.length;E+=h){const j=de.slice(E,E+h),B=Math.floor(E/h)+1,N=Math.ceil(de.length/h);M.innerHTML=`<span style="color:var(--text-secondary)">🔧 Step 2/2: Fleshing out characters... (${Le}/${de.length}, batch ${B}/${N})</span>`;let z;try{z=await ws(t,j,S)}catch(K){if(be++,console.warn(`Flesh batch ${B} failed:`,K.message),be>=3)break;await new Promise(ae=>setTimeout(ae,2e3));try{z=await ws(t,j,S),be=0}catch{console.warn("Retry also failed, skipping batch");continue}}const G=z.characters||[];if(G.length===0){if(be++,be>=3)break;continue}be=0,Le+=G.length,M.innerHTML=`<span style="color:var(--text-secondary)">💾 Saving... (${Le}/${de.length})</span>`;const U=await Ve(t,{new_characters:G},null,0);console.log("Apply response:",U),pe+=G.length}const $e=((await Ee(t)).characters||[]).map(Me);Z().currentTown.characters=$e,_.length=0,_.push(...$e),Ze(e,$e),et(e,$e),ke(e,$e),xe(e,$e);const I=de.length-pe;I>0&&pe>0?M.innerHTML=`<span style="color:var(--warning, orange)">⚠️ ${pe} of ${de.length} characters added (${I} failed to flesh out — try again)</span>`:pe===0?M.innerHTML='<span style="color:var(--error)">❌ Failed to flesh out any characters</span>':(M.innerHTML=`<span style="color:var(--success)">✅ ${pe} character${pe!==1?"s":""} added!</span>`,setTimeout(()=>{M.innerHTML=""},5e3))}catch(S){M.innerHTML=`<span style="color:var(--error)">❌ ${S.message}</span>`}finally{A.disabled=!1,A.textContent="🎲 Generate"}}),(m=e.querySelector("#auto-assign-spells-btn"))==null||m.addEventListener("click",async()=>{var M;const w=e.querySelector("#auto-assign-spells-btn"),A=e.querySelector("#intake-status");w.disabled=!0,w.textContent="⏳ Assigning...",A.innerHTML='<span style="color:var(--text-secondary)">✨ Auto-assigning role-optimal spells to all casters...</span>';try{const h=await xn(Z().currentTownId,!0);if(console.log("Auto-assign spells response:",h),h.debug&&console.table(h.debug),h.ok){const q=(h.characters||[]).join(", "),F=(M=h.debug)==null?void 0:M[0],D=F?` | SRD:${F.totalSrdSpells} found:${JSON.stringify(F.spellsFoundPerLevel)} sel:${F.selectedCount} known:${F.knownInserted} prep:${F.prepInserted}${F.error?" ERR:"+F.error:""}`:"";A.innerHTML=`<span style="color:var(--success)">✅ Assigned spells to ${h.assigned} caster${h.assigned!==1?"s":""}${q?": "+q:""}${D}</span>`;const Y=((await Ee(Z().currentTownId)).characters||[]).map(Me);Z().currentTown.characters=Y,ke(e,Y)}else A.innerHTML=`<span style="color:var(--error)">❌ ${h.error||"Failed"}</span>`}catch(h){A.innerHTML=`<span style="color:var(--error)">❌ ${h.message}</span>`}finally{w.disabled=!1,w.textContent="✨ Auto-Assign Spells"}})}catch(b){console.error("Town load error:",b),e.querySelector(".split-layout").innerHTML=`<div class="view-empty"><h2>Error</h2><p>${b.message}</p></div>`}}function Ze(e,t,s){var o,c,d,u;const a=Z(),l=a.activeStatusFilter==="Deceased"?t.filter(v=>v.status==="Deceased"):t.filter(v=>v.status!=="Deceased"),i=[...new Set(l.map(v=>v.race).filter(Boolean))].sort(),r=[...new Set(l.map(v=>v.class).filter(Boolean))].sort();s=s||((o=a.currentTown)==null?void 0:o.buildings)||[];const p=e.querySelector("#race-filters");if(p){const v={};l.forEach(f=>{v[f.race]=(v[f.race]||0)+1});const m={};l.forEach(f=>{const g=f.class;m[g]=(m[g]||0)+1});const b={};let y=0;l.forEach(f=>{f.building_id?b[f.building_id]=(b[f.building_id]||0)+1:y++}),p.innerHTML=`
      <select id="filter-race" class="filter-dropdown">
        <option value="">All Races (${l.length})</option>
        ${i.map(f=>`<option value="${f}" ${a.activeRaceFilter===f?"selected":""}>${f} (${v[f]||0})</option>`).join("")}
      </select>
      <select id="filter-class" class="filter-dropdown">
        <option value="">All Classes (${l.length})</option>
        ${r.map(f=>`<option value="${f}" ${a.activeClassFilter===f?"selected":""}>${f} (${m[f]||0})</option>`).join("")}
      </select>
      ${s.length?`<select id="filter-building" class="filter-dropdown">
        <option value="">All Buildings (${l.length})</option>
        ${s.map(f=>`<option value="${f.id}" ${a.activeBuildingFilter===String(f.id)?"selected":""}>${f.name} (${b[f.id]||0})</option>`).join("")}
        <option value="_unassigned" ${a.activeBuildingFilter==="_unassigned"?"selected":""}>🚶 Unassigned (${y})</option>
      </select>`:""}
    `,(c=p.querySelector("#filter-race"))==null||c.addEventListener("change",f=>{ee({activeRaceFilter:f.target.value||null}),ke(e,t),xe(e,t)}),(d=p.querySelector("#filter-class"))==null||d.addEventListener("change",f=>{ee({activeClassFilter:f.target.value||null}),ke(e,t),xe(e,t)}),(u=p.querySelector("#filter-building"))==null||u.addEventListener("change",f=>{ee({activeBuildingFilter:f.target.value||null}),ke(e,t),xe(e,t)})}}function et(e,t){const s=e.querySelector("#roster-tabs");if(!s)return;const a=Z(),n=t.filter(r=>r.status!=="Deceased").length,l=t.filter(r=>r.status==="Deceased").length,i=a.activeStatusFilter==="Deceased";s.innerHTML='<button class="roster-tab'+(i?"":" active")+'" data-tab="living">Living <span class="roster-tab-count">'+n+'</span></button><button class="roster-tab'+(i?" active":"")+'" data-tab="graveyard">Graveyard <span class="roster-tab-count">'+l+"</span></button>",s.addEventListener("click",r=>{const p=r.target.closest(".roster-tab");if(!p)return;const o=p.dataset.tab;ee({activeStatusFilter:o==="graveyard"?"Deceased":null}),et(e,t),ke(e,t),xe(e,t)})}function Ra(e){const t=Z(),s=e.querySelector("#list-header");if(!s)return;const a=n=>t.sortCol===n?(t.sortDir==="asc"," "):"";s.innerHTML=`
    <div class="list-header-row">
      <span class="sort-col col-name" data-sort="name">Name${a("name")}</span>
      <span class="sort-col col-race" data-sort="race">Race${a("race")}</span>
      <span class="sort-col col-class" data-sort="class">Class${a("class")}</span>
      <span class="sort-col col-lvl" data-sort="level">Lvl${a("level")}</span>
      <span class="sort-col col-hp" data-sort="hp">HP${a("hp")}</span>
      <span class="sort-col col-ac" data-sort="ac">AC${a("ac")}</span>
      <span class="sort-col col-align" data-sort="alignment">Align${a("alignment")}</span>
    </div>
  `,s.addEventListener("click",n=>{var r;const l=n.target.closest(".sort-col");if(!(l!=null&&l.dataset.sort))return;const i=l.dataset.sort;t.sortCol===i?ee({sortDir:t.sortDir==="asc"?"desc":"asc"}):ee({sortCol:i,sortDir:"asc"}),Ra(e),ke(e,((r=Z().currentTown)==null?void 0:r.characters)||[])})}function Ha(e){const t=Z();let s=[...e];if(t.activeRaceFilter&&(s=s.filter(n=>n.race===t.activeRaceFilter)),t.activeClassFilter&&(s=s.filter(n=>n.class===t.activeClassFilter)),t.activeBuildingFilter&&(t.activeBuildingFilter==="_unassigned"?s=s.filter(n=>!n.building_id):s=s.filter(n=>String(n.building_id)===t.activeBuildingFilter)),t.activeStatusFilter==="Deceased"?s=s.filter(n=>n.status==="Deceased"):s=s.filter(n=>n.status!=="Deceased"),t.searchQuery){const n=t.searchQuery.toLowerCase();s=s.filter(l=>(l.name||"").toLowerCase().includes(n)||(l.race||"").toLowerCase().includes(n)||(l.class||"").toLowerCase().includes(n)||(l.role||"").toLowerCase().includes(n))}s.sort((n,l)=>{let i,r;return t.sortCol==="level"?(i=parseInt(n.level)||0,r=parseInt(l.level)||0):["hp","ac","xp","age"].includes(t.sortCol)?(i=parseInt(n[t.sortCol])||0,r=parseInt(l[t.sortCol])||0):(i=String(n[t.sortCol]||"").toLowerCase(),r=String(l[t.sortCol]||"").toLowerCase()),i<r?t.sortDir==="asc"?-1:1:i>r?t.sortDir==="asc"?1:-1:0});const a=s.findIndex(n=>(n.role||"").toLowerCase().includes("mayor"));if(a>0){const[n]=s.splice(a,1);s.unshift(n)}return s}function ke(e,t){const s=e.querySelector("#list-body");if(!s)return;const a=Z(),n=Ha(t);s.innerHTML=n.map(l=>{const i=Bi[l.race]||"var(--text-muted)",r=l.id==a.selectedCharId||l.dbId==a.selectedCharId?" active":"",p=l.status==="Deceased"?" deceased":"",o=String(l.ac||"").split(",")[0].trim()||"";return`
      <div class="char-row${r}${p}${(l.role||"").toLowerCase().includes("mayor")?" mayor-row":""}" data-id="${l.id}">
        <span class="col-name">${(l.role||"").toLowerCase().includes("mayor")?'<span class="mayor-badge">&#9813;</span> ':""}${l.name}</span>
        <span class="col-race" style="color:${i}">${l.race}</span>
        <span class="col-class">${(l.class||"").replace(/\s+\d+$/,"")}</span>
        <span class="col-lvl">${l.level||0}</span>
        <span class="col-hp">${l.hp||""}</span>
        <span class="col-ac">${o}</span>
        <span class="col-align">${l.alignment||""}</span>
      </div>
    `}).join("")}function xe(e,t){const s=e.querySelector("#stats-bar");if(!s)return;const a=Z(),n=Ha(t);a.activeStatusFilter==="Deceased"?s.textContent=n.length+" departed soul"+(n.length!==1?"s":""):s.textContent=n.length+" living resident"+(n.length!==1?"s":"")+"  |  "+t.length+" total"}async function ji(e,t,s){const{showModal:a}=await ne(async()=>{const{showModal:r}=await Promise.resolve().then(()=>Pe);return{showModal:r}},void 0);let n=null;const{el:l,close:i}=a({title:" Import Character from Statblock",width:"wide",content:`
            <div class="import-modal-body">
                <p class="import-instructions">Paste a D&amp;D statblock below. The parser handles formats like:<br>
                    <code>Name: Race Class; CR X; HP XX; AC XX; Init +X; ...</code></p>
                <textarea id="import-textarea" class="modal-textarea" rows="8"
                    placeholder="Paste statblock here...&#10;&#10;Example:&#10;Grimnar Stonefist: Dwarf Fighter 3; CR 3; hp 28; Init +1; Spd 20; AC 18; Atk +6 melee (1d8+3/x3); AL LG; SV Fort +5, Ref +2, Will +1; Str 16, Dex 12, Con 14, Int 10, Wis 12, Cha 8. Languages: Common, Dwarven. Skills/Feats: Climb +5, Intimidate +3; Power Attack, Cleave, Weapon Focus (warhammer). Gear: masterwork warhammer, breastplate, heavy steel shield."></textarea>
                <div id="import-error" class="modal-error" style="display:none;"></div>
                <div id="import-preview" class="import-preview" style="display:none;"></div>
                <div class="modal-actions">
                    <button id="import-parse-btn" class="btn-secondary"> Preview</button>
                    <button id="import-confirm-btn" class="btn-primary" disabled> Import Character</button>
                </div>
            </div>
        `});l.querySelector("#import-parse-btn").addEventListener("click",()=>{const r=l.querySelector("#import-textarea").value.trim();if(!r)return;const p=l.querySelector("#import-error");p.style.display="none";try{const o=Gi(r);n=o,zi(l,o)}catch(o){p.textContent="Parse error: "+o.message,p.style.display="block"}}),l.querySelector("#import-confirm-btn").addEventListener("click",async()=>{if(!n||!t)return;const r=l.querySelector("#import-confirm-btn");r.disabled=!0,r.textContent=" Importing...";try{await St(t,n);const o=((await Ee(t)).characters||[]).map(Me);Z().currentTown.characters=o,Ze(e,o),ke(e,o),xe(e,o);const c=o.find(d=>d.name===n.name);if(c){ee({selectedCharId:c.id});const d=e.querySelector("#detail-area");d&&at(d,c,{onListRefresh:()=>{ke(e,o),xe(e,o)},onDelete:()=>{},containerRef:e})}s.length=0,s.push(...o),i()}catch(p){r.disabled=!1,r.textContent=" Import Character";const o=l.querySelector("#import-error");o.textContent="Import failed: "+p.message,o.style.display="block"}})}function zi(e,t){const s=e.querySelector("#import-preview"),a=[["Name",t.name],["Race",t.race],["Class",t.class],["CR",t.cr],["HP",t.hp],["AC",t.ac],["Init",t.init],["Speed",t.spd],["Attack",t.atk],["Alignment",t.alignment],["Saves",t.saves],["Str/Dex/Con",`${t.str||""} / ${t.dex||""} / ${t.con||""}`],["Int/Wis/Cha",`${t.int_||""} / ${t.wis||""} / ${t.cha||""}`],["Languages",t.languages],["Skills",t.skills_feats],["Feats",t.feats],["Gear",t.gear]];s.innerHTML=`<h3 class="preview-name">${t.name||"Unknown"}</h3>`+a.filter(([,n])=>n).map(([n,l])=>`<div class="preview-row"><span class="preview-label">${n}:</span> <strong>${l}</strong></div>`).join(""),s.style.display="block",e.querySelector("#import-confirm-btn").disabled=!1}function Gi(e){const t={name:"",race:"",class:"",status:"Alive",cr:"",hp:"",ac:"",init:"",spd:"",grapple:"",atk:"",alignment:"",saves:"",str:"",dex:"",con:"",int_:"",wis:"",cha:"",hd:"",ecl:"",age:"",xp:"",gender:"",languages:"",skills_feats:"",feats:"",gear:"",role:"",title:"",spouse:"None",spouse_label:""},a=e.split(`
`).map(g=>g.replace(/^##\s*/,"").trim()).filter(Boolean).join(" ");let n=a;const l=["Languages?(?:\\s*spoken)?","Skills?\\/Feats?","Skills?\\s+and\\s+Feats?","Possessions?","Gear","Feats?","Special"],i=new RegExp(`\\.?\\s*(${l.join("|")})\\s*:\\s*`,"i"),r=n.search(i);let p="";r>-1&&(p=n.substring(r).replace(/^\.\s*/,""),n=n.substring(0,r).trim());const o=/(?:^|\.\s*)(Languages?\s*(?:spoken)?|Skills?\/Feats?|Skills?\s+and\s+Feats?|Possessions?|Gear|Feats?|Special)\s*:\s*/gi,c={};let d,u=null,v=0;const m=p;for(;(d=o.exec(m))!==null;)u!==null&&(c[u]=m.substring(v,d.index).replace(/\.\s*$/,"").trim()),u=d[1].toLowerCase(),v=d.index+d[0].length;u!==null&&(c[u]=m.substring(v).replace(/\.\s*$/,"").trim());for(const[g,k]of Object.entries(c))/language/i.test(g)?t.languages=k:/skill/i.test(g)?t.skills_feats=k:/^feats?$/i.test(g)?t.feats=k:/possession|gear/i.test(g)&&(t.gear=k);const b=n.split(";").map(g=>g.trim()).filter(Boolean);if(b.length<2)return t.name=n,t;const y=b[0].indexOf(":");if(y>-1&&!/\b(?:CR|hp|Init|Spd|AC|BAB|Atk|AL|SV|Str|Dex|Con|Int|Wis|Cha|HD|Fort|Ref|Will|Grapple)\b/i.test(b[0].substring(0,y))){t.name=b[0].substring(0,y).trim();const g=b[0].substring(y+1).trim(),k=g.match(/^(\S+)\s+(.+)$/);k?(t.race=k[1],t.class=k[2]):t.race=g}else if(t.name=b[0],b.length>1){const g=b[1];if(!/\b(?:CR|hp|Init|Spd|AC|BAB)\b/i.test(g)){const k=g.match(/^(\S+)\s+(.+)$/);k?(t.race=k[1],t.class=k[2]):t.race=g}}for(const g of b){const k=g.trim(),_=k.match(/^\s*(\w[\w\s/]*?)\s*[:]\s*(.+)$/);if(!_){const w=k.match(/^CR\s+(.+)/i);if(w){t.cr=w[1];continue}const A=k.match(/^hp\s+(\d+)/i);if(A){t.hp=A[1];continue}continue}const $=_[1].trim().toLowerCase(),L=_[2].trim();$==="cr"?t.cr=L:$==="ecl"?t.ecl=L:$==="age"?t.age=L:$==="xp"?t.xp=L:$==="hp"?t.hp=L:$==="hd"?t.hd=L:$==="init"?t.init=L:$==="spd"?t.spd=L:$==="ac"?t.ac=L:$==="bab"||($==="atk"?t.atk=L:$==="grapple"?t.grapple=L:$==="al"?t.alignment=L:$==="sv"?t.saves=L:$==="size"||($==="gender"?t.gender=L:/wife|husband/i.test($)&&(t.spouse=L,t.spouse_label=$.charAt(0).toUpperCase()+$.slice(1))))}const f=n.match(/Str\s+(\d+).*?Dex\s+(\d+).*?Con\s+(\d+).*?Int\s+(\d+).*?Wis\s+(\d+).*?Cha\s+(\d+)/i);return f&&(t.str=f[1],t.dex=f[2],t.con=f[3],t.int_=f[4],t.wis=f[5],t.cha=f[6]),(/\(DECEASED\)/i.test(a)||/deceased/i.test(t.status))&&(t.status="Deceased"),t}async function Wi(e){const{openHistoryModal:t}=await import("../components/HistoryModal.js");t(e)}const Na=[{race:"Human",pct:60},{race:"Dwarf",pct:10},{race:"Elf",pct:8},{race:"Halfling",pct:7},{race:"Gnome",pct:5},{race:"Half-Elf",pct:4},{race:"Half-Orc",pct:3},{race:"Other",pct:3}];async function Ui(e){const{showModal:t}=await ne(async()=>{const{showModal:n}=await Promise.resolve().then(()=>Pe);return{showModal:n}},void 0),{el:s,close:a}=t({title:" Town Settings",width:"wide",content:'<p class="muted">Loading settings...</p>'});try{const l=(await Pt(e)).meta||{};let i=[],r={};if(l.gen_rules)try{r=JSON.parse(l.gen_rules)}catch{}if(l.demographics)try{i=JSON.parse(l.demographics)}catch{i=l.demographics.split(",").map(o=>{const c=o.trim().match(/^(.+?)\s+(\d+)%?$/);return c?{race:c[1].trim(),pct:parseInt(c[2])}:null}).filter(Boolean)}i.length||(i=JSON.parse(JSON.stringify(Na))),qt(s,e,i,l.biome||"Grassland / Plains",l.difficulty_level||"struggling",l.settlement_type||"",r,a)}catch(n){s.innerHTML=`<p class="modal-error" style="display:block;">Failed to load settings: ${n.message}</p>`}}function qt(e,t,s,a,n,l,i,r){const p=()=>s.reduce((m,b)=>m+b.pct,0),o=[{value:"",label:"— Not Set (Standard Town) —"},{value:"village",label:"🏘️ Village / Hamlet"},{value:"walled_town",label:"🏰 Walled Town"},{value:"fortress",label:"⚔️ Fortress / Keep"},{value:"cave_system",label:"🕳️ Cave System"},{value:"underground_warren",label:"🐀 Underground Warren"},{value:"ruins",label:"🏚️ Ruins / Abandoned"},{value:"camp",label:"⛺ Camp / Encampment"},{value:"nomadic",label:"🐫 Nomadic / Caravan"},{value:"treetop",label:"🌳 Treetop Settlement"},{value:"floating",label:"⛵ Floating / Ship"},{value:"burrow",label:"🕳️ Burrow / Den"},{value:"nest",label:"🪹 Nest / Hive"},{value:"dungeon",label:"⬛ Dungeon"},{value:"temple",label:"🛕 Temple / Shrine Complex"},{value:"mine",label:"⛏️ Mine / Quarry"},{value:"tower",label:"🗼 Tower / Spire"},{value:"outpost",label:"🚩 Outpost / Watchtower"},{value:"port",label:"⚓ Port / Harbor"},{value:"planar",label:"🌀 Planar / Extraplanar"}],c=["","Temperate Forest","Tropical Jungle","Desert (Sandy)","Desert (Rocky)","Arctic Tundra","Subarctic Taiga","Grassland / Plains","Savanna","Coastal / Seaside","Swamp / Marsh","Mountain / Highland","Underground / Underdark","Volcanic","Island / Archipelago","River Valley","Steppe","Badlands"],d=[{value:"peaceful",label:"☀️ Peaceful (×1.0)",desc:"Safe, established village with no threats"},{value:"struggling",label:"⚔️ Struggling (×1.5)",desc:"Occasional monsters, bandits, or hardship"},{value:"frontier",label:"🏔️ Frontier (×2.0)",desc:"Dangerous border, wild lands, regular threats"},{value:"warzone",label:"🔥 Warzone (×3.0)",desc:"Active conflict, siege, monster pressure, plague"}];e.innerHTML=`
        <div class="town-settings-body">
            <h3 class="settings-section-title">🏗️ Settlement Type</h3>
            <p class="settings-desc">What kind of physical location is this? This tells the AI what structures, infrastructure, and inhabitants to expect. (Population size is determined automatically.)</p>
            <select class="form-select" id="settlement-type-select" style="max-width:320px;margin-bottom:1.25rem;">
              ${o.map(m=>`<option value="${m.value}"${m.value===l?" selected":""}>${m.label}</option>`).join("")}
            </select>

            <h3 class="settings-section-title">🌍 Town Biome / Terrain</h3>
            <p class="settings-desc">Select the environment this town is located in. The AI will only generate buildings, resources, and infrastructure appropriate for this biome.</p>
            <select class="form-select" id="biome-select" style="max-width:320px;margin-bottom:1.25rem;">
              ${c.map(m=>`<option value="${m}"${m===a?" selected":""}>${m||"— Not Set —"}</option>`).join("")}
            </select>

            <h3 class="settings-section-title">⚔️ Town Difficulty Level</h3>
            <p class="settings-desc">Controls the XP multiplier for this town. Higher difficulty = more XP from the same activities, reflecting a more dangerous environment.</p>
            <select class="form-select" id="difficulty-select" style="max-width:320px;margin-bottom:1.25rem;">
              ${d.map(m=>`<option value="${m.value}"${m.value===n?" selected":""}>${m.label} — ${m.desc}</option>`).join("")}
            </select>

            <h3 class="settings-section-title">🎲 Generation Rules</h3>
            <p class="settings-desc">Per-town rules for how new NPCs are generated in this location.</p>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem .75rem;margin-bottom:1.25rem;">
              <div class="form-group">
                <label for="ts-intake-level">🎚️ Default Intake Level</label>
                <input type="number" id="ts-intake-level" class="form-input" min="0" max="20" placeholder="— Default (0) —" value="${i.intake_level??""}" style="width:100%">
                <small class="settings-hint">0 = AI picks appropriate level</small>
              </div>
              <div class="form-group">
                <label for="ts-max-level">🏔️ Max NPC Level</label>
                <input type="number" id="ts-max-level" class="form-input" min="1" max="20" placeholder="— Default (20) —" value="${i.max_level||""}" style="width:100%">
              </div>
              <div class="form-group">
                <label for="ts-hp-rule">❤️ HP at Level Up</label>
                <select id="ts-hp-rule" class="form-select">
                  <option value="">— Default —</option>
                  <option value="max"${i.hp_rule==="max"?" selected":""}>Max HP every level</option>
                  <option value="average"${i.hp_rule==="average"?" selected":""}>Average (rounded up)</option>
                  <option value="rolled"${i.hp_rule==="rolled"?" selected":""}>Rolled (random)</option>
                  <option value="max_first"${i.hp_rule==="max_first"?" selected":""}>Max at L1, roll after</option>
                </select>
              </div>
              <div class="form-group">
                <label for="ts-sources">📚 Allowed Sources</label>
                <select id="ts-sources" class="form-select">
                  <option value="">— Default —</option>
                  <option value="phb_only"${i.sources==="phb_only"?" selected":""}>PHB Only</option>
                  <option value="phb_xge"${i.sources==="phb_xge"?" selected":""}>PHB + Xanathar's</option>
                  <option value="phb_xge_tce"${i.sources==="phb_xge_tce"?" selected":""}>PHB + XGE + Tasha's</option>
                  <option value="all_official"${i.sources==="all_official"?" selected":""}>All Official Books</option>
                  <option value="homebrew"${i.sources==="homebrew"?" selected":""}>All + Homebrew Allowed</option>
                </select>
              </div>
              <div class="form-group">
                <label for="ts-starting-equip">🪙 Starting Equipment</label>
                <select id="ts-starting-equip" class="form-select">
                  <option value="">— Default —</option>
                  <option value="class_default"${i.starting_equip==="class_default"?" selected":""}>Class Default</option>
                  <option value="rolled_gold"${i.starting_equip==="rolled_gold"?" selected":""}>Rolled Gold</option>
                  <option value="minimal"${i.starting_equip==="minimal"?" selected":""}>Minimal</option>
                  <option value="wealthy"${i.starting_equip==="wealthy"?" selected":""}>Wealthy</option>
                </select>
              </div>
              <div class="form-group">
                <label for="ts-class-dist">🧑‍🤝‍🧑 Class Distribution</label>
                <select id="ts-class-dist" class="form-select">
                  <option value="">— Default —</option>
                  <option value="commoner"${i.class_dist==="commoner"?" selected":""}>Mostly Commoners</option>
                  <option value="balanced"${i.class_dist==="balanced"?" selected":""}>Balanced Mix</option>
                  <option value="adventurer"${i.class_dist==="adventurer"?" selected":""}>Adventurer-Heavy</option>
                  <option value="elite"${i.class_dist==="elite"?" selected":""}>Elite</option>
                </select>
              </div>
              <div class="form-group">
                <label for="ts-name-style">🎭 NPC Name Style</label>
                <select id="ts-name-style" class="form-select">
                  <option value="">— Default —</option>
                  <option value="high_fantasy"${i.name_style==="high_fantasy"?" selected":""}>High Fantasy</option>
                  <option value="cultural"${i.name_style==="cultural"?" selected":""}>Cultural / Ethnic</option>
                  <option value="real_world"${i.name_style==="real_world"?" selected":""}>Real-World Inspired</option>
                  <option value="whimsical"${i.name_style==="whimsical"?" selected":""}>Whimsical</option>
                </select>
              </div>
              <div class="form-group">
                <label for="ts-bg-complexity">👤 Background Complexity</label>
                <select id="ts-bg-complexity" class="form-select">
                  <option value="">— Default —</option>
                  <option value="simple"${i.bg_complexity==="simple"?" selected":""}>Simple</option>
                  <option value="standard"${i.bg_complexity==="standard"?" selected":""}>Standard</option>
                  <option value="detailed"${i.bg_complexity==="detailed"?" selected":""}>Detailed</option>
                  <option value="epic"${i.bg_complexity==="epic"?" selected":""}>Epic Origins</option>
                </select>
              </div>
              <div class="form-group">
                <label for="ts-age-dist">📅 Age Distribution</label>
                <select id="ts-age-dist" class="form-select">
                  <option value="">— Default —</option>
                  <option value="young"${i.age_dist==="young"?" selected":""}>Young Adults Only</option>
                  <option value="prime"${i.age_dist==="prime"?" selected":""}>Prime Age</option>
                  <option value="full_range"${i.age_dist==="full_range"?" selected":""}>Full Range</option>
                  <option value="elder"${i.age_dist==="elder"?" selected":""}>Elder-Heavy</option>
                </select>
              </div>
            </div>

            <div style="margin-bottom:1.25rem;padding:0.75rem 1rem;background:rgba(224,85,85,0.08);border:1px solid rgba(224,85,85,0.25);border-radius:8px;">
              <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;font-weight:600;">
                <input type="checkbox" id="ts-closed-borders" ${i.closed_borders?"checked":""}>
                🚫 Closed Borders — No New Arrivals
              </label>
              <small class="settings-hint" style="margin-top:0.25rem;display:block;">When enabled, simulations will NOT generate new arrivals for this town. Births from existing couples are still allowed. Use this to lock down a town's population.</small>
            </div>

            <h3 class="settings-section-title">👥 Population Demographics</h3>
            <p class="settings-desc">Set target race percentages for this town. The AI will use these when generating new population during simulations.</p>

            <div class="demographics-grid" id="demo-grid">
                ${s.map((m,b)=>`
                    <div class="demo-row" data-index="${b}">
                        <input type="text" class="form-input demo-race" value="${m.race}" placeholder="Race name">
                        <div class="demo-pct-wrap">
                            <input type="range" class="demo-slider" min="0" max="100" value="${m.pct}" data-index="${b}">
                            <input type="number" class="form-input demo-pct" value="${m.pct}" min="0" max="100" data-index="${b}">
                            <span class="demo-pct-sign">%</span>
                        </div>
                        <button class="btn-danger btn-sm demo-remove" data-index="${b}" title="Remove">&#10006;</button>
                    </div>
                `).join("")}
            </div>

            <div class="demo-footer">
                <button class="btn-secondary btn-sm" id="demo-add-btn">+ Add Race</button>
                <span class="demo-total" id="demo-total">Total: <strong>${p()}%</strong></span>
            </div>

            <div class="modal-actions" style="margin-top:1rem;">
                <button class="btn-secondary" id="demo-reset-btn">Reset to Default</button>
                <button class="btn-primary" id="demo-save-btn">💾 Save Settings</button>
            </div>

            <div id="demo-status" style="margin-top:0.5rem;"></div>
        </div>
    `;const u=()=>{const m=p(),b=e.querySelector("#demo-total");b.innerHTML=`Total: <strong style="color:${m===100?"var(--success)":m>100?"var(--error)":"var(--warning)"}">${m}%</strong>`};e.querySelectorAll(".demo-slider").forEach(m=>{m.addEventListener("input",b=>{const y=parseInt(b.target.dataset.index);s[y].pct=parseInt(b.target.value),e.querySelector(`.demo-pct[data-index="${y}"]`).value=b.target.value,u()})}),e.querySelectorAll(".demo-pct").forEach(m=>{m.addEventListener("input",b=>{const y=parseInt(b.target.dataset.index),f=Math.max(0,Math.min(100,parseInt(b.target.value)||0));s[y].pct=f,e.querySelector(`.demo-slider[data-index="${y}"]`).value=f,u()})}),e.querySelectorAll(".demo-race").forEach((m,b)=>{m.addEventListener("input",y=>{s[b].race=y.target.value})});const v=()=>{var y;const m={},b=f=>{var g;return((g=e.querySelector(`#${f}`))==null?void 0:g.value)||""};return b("ts-intake-level")!==""&&(m.intake_level=b("ts-intake-level")),b("ts-max-level")&&(m.max_level=b("ts-max-level")),b("ts-hp-rule")&&(m.hp_rule=b("ts-hp-rule")),b("ts-sources")&&(m.sources=b("ts-sources")),b("ts-starting-equip")&&(m.starting_equip=b("ts-starting-equip")),b("ts-class-dist")&&(m.class_dist=b("ts-class-dist")),b("ts-name-style")&&(m.name_style=b("ts-name-style")),b("ts-bg-complexity")&&(m.bg_complexity=b("ts-bg-complexity")),b("ts-age-dist")&&(m.age_dist=b("ts-age-dist")),m.closed_borders=((y=e.querySelector("#ts-closed-borders"))==null?void 0:y.checked)||!1,m};e.querySelectorAll(".demo-remove").forEach(m=>{m.addEventListener("click",b=>{var f,g,k;const y=parseInt(b.target.dataset.index);s.splice(y,1),qt(e,t,s,((f=e.querySelector("#biome-select"))==null?void 0:f.value)||"",((g=e.querySelector("#difficulty-select"))==null?void 0:g.value)||"struggling",((k=e.querySelector("#settlement-type-select"))==null?void 0:k.value)||"",v())})}),e.querySelector("#demo-add-btn").addEventListener("click",()=>{var m,b,y;s.push({race:"",pct:0}),qt(e,t,s,((m=e.querySelector("#biome-select"))==null?void 0:m.value)||"",((b=e.querySelector("#difficulty-select"))==null?void 0:b.value)||"struggling",((y=e.querySelector("#settlement-type-select"))==null?void 0:y.value)||"",v())}),e.querySelector("#demo-reset-btn").addEventListener("click",()=>{var m,b,y;s.length=0,s.push(...JSON.parse(JSON.stringify(Na))),qt(e,t,s,((m=e.querySelector("#biome-select"))==null?void 0:m.value)||"",((b=e.querySelector("#difficulty-select"))==null?void 0:b.value)||"struggling",((y=e.querySelector("#settlement-type-select"))==null?void 0:y.value)||"",v())}),e.querySelector("#demo-save-btn").addEventListener("click",async()=>{var y,f,g;const m=e.querySelector("#demo-save-btn"),b=e.querySelector("#demo-status");m.disabled=!0,m.textContent=" Saving...";try{const k=s.filter(w=>w.race&&w.pct>0).map(w=>`${w.race} ${w.pct}%`).join(", ");await Qe(t,"demographics",k);const _=((y=e.querySelector("#biome-select"))==null?void 0:y.value)||"";await Qe(t,"biome",_);const $=((f=e.querySelector("#difficulty-select"))==null?void 0:f.value)||"struggling";await Qe(t,"difficulty_level",$);const L=((g=e.querySelector("#settlement-type-select"))==null?void 0:g.value)||"";await Qe(t,"settlement_type",L),await Qe(t,"gen_rules",JSON.stringify(v())),m.textContent="✅ Saved!",b.innerHTML='<span style="color:var(--success);">✅ Settings saved successfully!</span>',setTimeout(()=>{m.disabled=!1,m.textContent=" Save Settings"},2e3)}catch(k){m.disabled=!1,m.textContent=" Save Settings",b.innerHTML=`<span style="color:var(--error);"> ${k.message}</span>`}})}function Vi(e){e.innerHTML=`
    <div class="view-settings">
      <header class="view-header">
        <h1>⚙️ Settings</h1>
      </header>

      <div class="settings-grid">
        <section class="settings-section-card">
          <h3 class="settings-section">📜 Campaigns</h3>
          <div id="campaigns-panel">Loading campaigns...</div>
        </section>

        <section class="settings-section-card">
          <h3 class="settings-section">🎲 XP Growth System</h3>
          <small class="settings-hint" style="display:block;margin-bottom:0.75rem;">XP is now calculated automatically using the <strong>Growth Score</strong> model. The AI scores each character on 5 axes (activity, danger, role pressure, personal change, class relevance) and multiplies by your town's difficulty level.</small>

          <div style="background:var(--bg-tertiary,#1a1a2e);border:1px solid var(--border);border-radius:var(--radius-sm);padding:0.75rem 1rem;margin-bottom:0.75rem;">
            <div style="font-size:0.75rem;font-weight:700;color:var(--accent);margin-bottom:0.4rem;">📊 How It Works</div>
            <div style="font-size:0.7rem;color:var(--text-secondary);line-height:1.7;">
              <div>① AI assigns <strong>5 monthly tags</strong> per character (activity, danger, role pressure, personal change, class relevance)</div>
              <div>② Tag scores are summed → <strong>base XP</strong></div>
              <div>③ Base XP × <strong>town difficulty multiplier</strong> + event XP = <strong>monthly XP</strong></div>
              <div>④ Server applies <strong>level-based diminishing returns</strong> (L1-3: full, L4-6: 75%, L7-10: 50%, L11+: 25%)</div>
            </div>
          </div>

          <div style="background:var(--bg-tertiary,#1a1a2e);border:1px solid var(--border);border-radius:var(--radius-sm);padding:0.75rem 1rem;">
            <div style="font-size:0.75rem;font-weight:700;color:var(--accent);margin-bottom:0.4rem;">🏘️ Town Difficulty Levels</div>
            <div style="font-size:0.7rem;color:var(--text-secondary);line-height:1.7;">
              <div><strong>Peaceful</strong> (×1.0) — Safe, established settlement</div>
              <div><strong>Struggling</strong> (×1.5) — Occasional monsters/bandits</div>
              <div><strong>Frontier</strong> (×2.0) — Dangerous border, regular threats</div>
              <div><strong>Warzone</strong> (×3.0) — Active conflict, constant danger</div>
            </div>
            <div style="font-size:0.65rem;color:var(--text-muted);margin-top:0.5rem;">Set each town's difficulty in its <strong>Town Settings</strong> (⚙️ gear icon on the town page).</div>
          </div>
        </section>

        <section class="settings-section-card">
          <h3 class="settings-section">🌍 World Simulation</h3>

          <div class="form-group">
            <label for="s-rel-speed">Relationship Formation</label>
            <select id="s-rel-speed" class="form-select">
              <option value="very slow">Very Slow (rarely form)</option>
              <option value="slow">Slow</option>
              <option value="normal" selected>Normal</option>
              <option value="fast">Fast (quick bonds)</option>
            </select>
          </div>

          <div class="form-group">
            <label for="s-birth-rate">Birth Rate</label>
            <select id="s-birth-rate" class="form-select">
              <option value="rare">Rare (almost never)</option>
              <option value="low">Low</option>
              <option value="normal" selected>Normal</option>
              <option value="high">High (baby boom)</option>
            </select>
          </div>

          <div class="form-group">
            <label for="s-death-threshold">Population Death Threshold</label>
            <small class="settings-hint">Death rate increases once population exceeds this</small>
            <select id="s-death-threshold" class="form-select">
              <option value="25">25 residents</option>
              <option value="50" selected>50 residents</option>
              <option value="75">75 residents</option>
              <option value="100">100 residents</option>
              <option value="150">150 residents</option>
              <option value="unlimited">Unlimited (no cap)</option>
            </select>
          </div>

          <div class="form-group">
            <label for="s-child-growth">Child Growth Speed</label>
            <small class="settings-hint">How fast children mature</small>
            <select id="s-child-growth" class="form-select">
              <option value="realistic" selected>Realistic (18 years)</option>
              <option value="accelerated">Accelerated (rapid magical growth)</option>
              <option value="instant">Instant (born as young adults)</option>
            </select>
          </div>

          <div class="form-group">
            <label for="s-conflict">Conflict & Events</label>
            <select id="s-conflict" class="form-select">
              <option value="peaceful">Peaceful (very few threats)</option>
              <option value="occasional" selected>Occasional</option>
              <option value="frequent">Frequent (dangerous world)</option>
              <option value="brutal">Brutal (constant danger)</option>
            </select>
          </div>
        </section>

        <section class="settings-section-card">
          <h3 class="settings-section">📜 Campaign Setting</h3>
          <small class="settings-hint" style="display:block;margin-bottom:0.75rem;">This information is used by AI during all simulations and character generation to create thematic, world-appropriate content.</small>

          <div class="form-group">
            <label for="s-campaign-desc">Campaign Description</label>
            <small class="settings-hint">Describe your world, its tone, geography, factions, and any important lore the AI should know.</small>
            <textarea id="s-campaign-desc" class="form-input" rows="4"
              placeholder="e.g., A low-magic dark fantasy world set in a frozen northern kingdom. The land is plagued by undead..."></textarea>
          </div>

          <div class="form-group">
            <label for="s-house-rules">House Rules</label>
            <small class="settings-hint">Any house rules or constraints the AI should follow during simulations.</small>
            <textarea id="s-house-rules" class="form-input" rows="3"
              placeholder="e.g., No evil-aligned PCs. Magic items are extremely rare. All characters must have a trade skill."></textarea>
          </div>
        </section>

        <section class="settings-section-card">
          <h3 class="settings-section">🧪 Homebrew & World Rules</h3>
          <small class="settings-hint" style="display:block;margin-bottom:0.75rem;">Structured rules that directly influence how the AI generates content. These are combined with your house rules text above. Leave as "— Default —" to use standard D&D rules.</small>

          <div class="hb-panel-grid">
            <div class="hb-panel">
              <div class="hb-panel-title">🌍 World Nature</div>
                <div class="homebrew-grid">
                  <div class="form-group">
                    <label for="hb-magic-level">✨ Magic Level</label>
                    <select id="hb-magic-level" class="form-select">
                      <option value="">— Default —</option>
                      <option value="none">No Magic (mundane world)</option>
                      <option value="low">Low Magic (rare, feared/revered)</option>
                      <option value="standard">Standard (per D&D rules)</option>
                      <option value="high">High Magic (common, everyday use)</option>
                      <option value="wild">Wild Magic (unpredictable, surges)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-tech-level">🔧 Technology Level</label>
                    <select id="hb-tech-level" class="form-select">
                      <option value="">— Default (Medieval) —</option>
                      <option value="primitive">Primitive (stone age, tribal)</option>
                      <option value="ancient">Ancient (bronze age, early iron)</option>
                      <option value="medieval">Medieval (standard D&D)</option>
                      <option value="renaissance">Renaissance (early firearms, printing)</option>
                      <option value="magitech">Magitech (magic-powered technology)</option>
                      <option value="steampunk">Steampunk (steam & clockwork)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-tone">🎭 World Tone</label>
                    <select id="hb-tone" class="form-select">
                      <option value="">— Default —</option>
                      <option value="grimdark">Grimdark (bleak, hopeless, morally grey)</option>
                      <option value="dark_fantasy">Dark Fantasy (dark but with hope)</option>
                      <option value="standard">Standard Fantasy (heroic adventure)</option>
                      <option value="lighthearted">Lighthearted (comedy, whimsy)</option>
                      <option value="horror">Horror (dread, terror, madness)</option>
                      <option value="intrigue">Political Intrigue (schemes, betrayal)</option>
                      <option value="mythic_saga">Mythic Saga (epic legends, fate)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-divine">🙏 Divine Involvement</label>
                    <select id="hb-divine" class="form-select">
                      <option value="">— Default —</option>
                      <option value="absent">Absent (gods are silent or don't exist)</option>
                      <option value="distant">Distant (gods exist but rarely intervene)</option>
                      <option value="active">Active (gods grant power, send signs)</option>
                      <option value="meddling">Meddling (gods walk the earth, directly interfere)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-planar">🌀 Planar Activity</label>
                    <select id="hb-planar" class="form-select">
                      <option value="">— Default —</option>
                      <option value="sealed">Sealed (no planar travel or influence)</option>
                      <option value="rare">Rare (occasional anomalies, thin veil)</option>
                      <option value="active">Active (portals, extraplanar visitors)</option>
                      <option value="chaotic">Chaotic (planes bleed into material world)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-economy">💰 Economy</label>
                    <select id="hb-economy" class="form-select">
                      <option value="">— Default —</option>
                      <option value="barter">Barter System (no currency, trade goods)</option>
                      <option value="poor">Impoverished (scarce resources, poverty)</option>
                      <option value="standard">Standard (coins, merchants, trade)</option>
                      <option value="rich">Prosperous (wealthy, abundant trade)</option>
                      <option value="guild">Guild-Controlled (guilds control trade)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-law">⚖️ Law & Order</label>
                    <select id="hb-law" class="form-select">
                      <option value="">— Default —</option>
                      <option value="lawless">Lawless (no organized law, might = right)</option>
                      <option value="frontier">Frontier Justice (informal, community-driven)</option>
                      <option value="standard">Standard (guards, courts, laws)</option>
                      <option value="authoritarian">Authoritarian (strict laws, harsh punishment)</option>
                      <option value="theocracy">Theocratic (religious law dominates)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-monster-int">🧠 Monster Intelligence</label>
                    <select id="hb-monster-int" class="form-select">
                      <option value="">— Default —</option>
                      <option value="bestial">Bestial (animals, instinct-driven)</option>
                      <option value="cunning">Cunning (use tactics, set traps)</option>
                      <option value="sentient">Sentient (societies, politics, diplomacy)</option>
                    </select>
                  </div>
                </div>
            </div>

            <div class="hb-panel">
              <div class="hb-panel-title">🎲 Character Rules</div>
                <div class="homebrew-grid">
                  <div class="form-group">
                    <label for="hb-power-level">⚡ Power Level</label>
                    <select id="hb-power-level" class="form-select">
                      <option value="">— Default —</option>
                      <option value="gritty">Gritty (mortals, low-level, survival)</option>
                      <option value="heroic">Heroic (standard D&D adventurer)</option>
                      <option value="mythic">Mythic (demigods, epic-level)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-ability-scores">🎯 Ability Scores</label>
                    <select id="hb-ability-scores" class="form-select">
                      <option value="">— Default (4d6 drop lowest) —</option>
                      <option value="standard_array">Standard Array (15,14,13,12,10,8)</option>
                      <option value="point_buy">Point Buy (27 points)</option>
                      <option value="roll_4d6">Roll 4d6 Drop Lowest</option>
                      <option value="roll_3d6">Roll 3d6 Straight (old school)</option>
                      <option value="heroic">Heroic Array (higher stats)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-leveling">📊 Leveling System</label>
                    <select id="hb-leveling" class="form-select">
                      <option value="">— Default (XP-based) —</option>
                      <option value="xp">XP-Based (track experience points)</option>
                      <option value="milestone">Milestone (level at story beats)</option>
                      <option value="session">Session-Based (level every N sessions)</option>
                      <option value="slow">Slow Progression (takes much longer)</option>
                      <option value="fast">Fast Progression (rapid leveling)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-multiclass">🔀 Multiclassing</label>
                    <select id="hb-multiclass" class="form-select">
                      <option value="">— Default —</option>
                      <option value="forbidden">Forbidden (no multiclassing)</option>
                      <option value="restricted">Restricted (max 2 classes, prerequisites)</option>
                      <option value="standard">Standard (per D&D rules)</option>
                      <option value="free">Free (no prerequisites needed)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-alignment">⚔️ Alignment</label>
                    <select id="hb-alignment" class="form-select">
                      <option value="">— Default —</option>
                      <option value="strict">Strict (alignment has mechanical consequences)</option>
                      <option value="guideline">Guideline (descriptive, not prescriptive)</option>
                      <option value="dynamic">Dynamic (alignment shifts based on actions)</option>
                      <option value="none">No Alignment (removed entirely)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-racial">🧬 Racial Traits</label>
                    <select id="hb-racial" class="form-select">
                      <option value="">— Default —</option>
                      <option value="standard">Standard (fixed racial bonuses per race)</option>
                      <option value="flexible">Flexible (choose where bonuses go)</option>
                      <option value="custom_lineage">Custom Lineage (any race, any bonus)</option>
                      <option value="no_bonuses">No Racial Bonuses (all races equal)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-feats">🏅 Feat Rules</label>
                    <select id="hb-feats" class="form-select">
                      <option value="">— Default —</option>
                      <option value="none">No Feats (feats are not used)</option>
                      <option value="standard">Standard (feats replace ASI)</option>
                      <option value="bonus">Bonus Feats (feats + ASI, don't replace)</option>
                      <option value="frequent">Frequent Feats (feat every odd level)</option>
                      <option value="free_start">Free Starting Feat (everyone gets 1 at L1)</option>
                    </select>
                  </div>
                </div>
            </div>

            <div class="hb-panel">
              <div class="hb-panel-title">⚔️ Survival & Danger</div>
                <div class="homebrew-grid">
                  <div class="form-group">
                    <label for="hb-mortality">☠️ NPC Mortality</label>
                    <select id="hb-mortality" class="form-select">
                      <option value="">— Default —</option>
                      <option value="lethal">Lethal (deaths common, life is cheap)</option>
                      <option value="impactful">Impactful (deaths are meaningful)</option>
                      <option value="rare">Rare (plot armor, few die)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-death">💀 Death & Resurrection</label>
                    <select id="hb-death" class="form-select">
                      <option value="">— Default —</option>
                      <option value="permanent">Permanent (dead is dead)</option>
                      <option value="costly">Costly Resurrection (rare/expensive)</option>
                      <option value="available">Readily Available (clerics raise dead)</option>
                      <option value="impactful">Deaths Shape Personality (trauma, grief)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-healing">❤️‍🩹 Healing & Recovery</label>
                    <select id="hb-healing" class="form-select">
                      <option value="">— Default —</option>
                      <option value="fast">Fast Healing (recover quickly)</option>
                      <option value="standard">Standard (per D&D rest rules)</option>
                      <option value="slow">Slow Healing (no full recovery on long rest)</option>
                      <option value="gritty">Gritty Realism (short rest = 8hr, long rest = week)</option>
                      <option value="medicine">Medicine Required (healer or supplies needed)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-resting">🛌 Resting Rules</label>
                    <select id="hb-resting" class="form-select">
                      <option value="">— Default —</option>
                      <option value="standard">Standard (short rest 1hr, long rest 8hr)</option>
                      <option value="gritty">Gritty (short rest 8hr, long rest = 1 week)</option>
                      <option value="epic">Epic Heroism (short rest 5min, long rest 1hr)</option>
                      <option value="safe_haven">Safe Haven (long rest only in safe locations)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-encumbrance">🎒 Encumbrance</label>
                    <select id="hb-encumbrance" class="form-select">
                      <option value="">— Default —</option>
                      <option value="none">None (carry whatever you want)</option>
                      <option value="simple">Simple (STR × 15 lbs)</option>
                      <option value="variant">Variant (speed penalties at thresholds)</option>
                      <option value="slot">Slot-Based (inventory slots = STR score)</option>
                      <option value="strict">Strict & Tracked (every pound counts)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-disease">🦠 Disease & Plague</label>
                    <select id="hb-disease" class="form-select">
                      <option value="">— Default —</option>
                      <option value="none">None (disease doesn't exist)</option>
                      <option value="rare">Rare (occasional illness)</option>
                      <option value="realistic">Realistic (diseases spread, can be deadly)</option>
                      <option value="rampant">Rampant (plagues, epidemics are common)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-natural-hazards">🌪️ Natural Hazards</label>
                    <select id="hb-natural-hazards" class="form-select">
                      <option value="">— Default —</option>
                      <option value="mild">Mild (good weather, safe terrain)</option>
                      <option value="standard">Standard (seasonal weather, normal hazards)</option>
                      <option value="harsh">Harsh (extreme weather, dangerous terrain)</option>
                      <option value="catastrophic">Catastrophic (frequent disasters, hostile land)</option>
                    </select>
                  </div>
                </div>
            </div>

            <div class="hb-panel">
              <div class="hb-panel-title">🏘️ Social & Narrative</div>
                <div class="homebrew-grid">
                  <div class="form-group">
                    <label for="hb-npc-depth">🗣️ NPC Personality Depth</label>
                    <select id="hb-npc-depth" class="form-select">
                      <option value="">— Default —</option>
                      <option value="simple">Simple (basic roles, minimal personality)</option>
                      <option value="standard">Standard (distinct personalities, some quirks)</option>
                      <option value="deep">Deep (complex motivations, secrets, flaws)</option>
                      <option value="literary">Literary (rich inner lives, character arcs)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-romance">💕 Romance & Relationships</label>
                    <select id="hb-romance" class="form-select">
                      <option value="">— Default —</option>
                      <option value="none">None (no romantic content)</option>
                      <option value="subtle">Subtle (implied, fade-to-black)</option>
                      <option value="present">Present (acknowledged, part of life)</option>
                      <option value="focus">Focus (relationships drive drama)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-factions">🏛️ Factions & Politics</label>
                    <select id="hb-factions" class="form-select">
                      <option value="">— Default —</option>
                      <option value="none">None (no organized factions)</option>
                      <option value="simple">Simple (a few groups with basic goals)</option>
                      <option value="complex">Complex (rival factions, shifting alliances)</option>
                      <option value="dominant">Dominant (factions control everything)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-crafting">🔨 Crafting & Profession</label>
                    <select id="hb-crafting" class="form-select">
                      <option value="">— Default —</option>
                      <option value="none">None (no crafting system)</option>
                      <option value="simple">Simple (basic item creation)</option>
                      <option value="detailed">Detailed (materials, time, skill checks)</option>
                      <option value="central">Central (crafting drives the economy)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-magic-items">🗡️ Magic Item Availability</label>
                    <select id="hb-magic-items" class="form-select">
                      <option value="">— Default —</option>
                      <option value="nonexistent">Nonexistent (no magic items)</option>
                      <option value="very_rare">Very Rare (legendary, world-shaking)</option>
                      <option value="uncommon">Uncommon (exist but hard to find)</option>
                      <option value="available">Available (can be bought/found)</option>
                      <option value="abundant">Abundant (magic shops, common enchantments)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hb-undead">🧟 Undead & Necromancy</label>
                    <select id="hb-undead" class="form-select">
                      <option value="">— Default —</option>
                      <option value="nonexistent">Nonexistent (undead don't exist)</option>
                      <option value="abomination">Abomination (universally feared & hated)</option>
                      <option value="standard">Standard (exists, dangerous)</option>
                      <option value="commonplace">Commonplace (undead labor, accepted by some)</option>
                      <option value="dominant">Dominant (undead rule or overrun areas)</option>
                    </select>
                  </div>
                </div>
            </div>
          </div>
        </section>
      </div>

      <div class="settings-actions">
        <button class="btn-primary" id="settings-save-btn">💾 Save Settings</button>
        <span id="settings-status" class="settings-status"></span>
      </div>
    </div>
  `,Ji(e),kt(e),Qi(e),e.querySelector("#settings-save-btn").addEventListener("click",()=>Zi(e))}async function kt(e){var s,a;const t=e.querySelector("#campaigns-panel");if(t)try{const n=await Gs(),l=n.campaigns||[],i=n.tier||"free",r=n.max_campaigns||1,o=(s=Z().currentCampaign)==null?void 0:s.id,c={free:"Free",standard:"Standard",premium:"Premium",legendary:"Legendary"};t.innerHTML=`
      <div class="campaign-tier-info">
        <span class="tier-badge tier-${i}">${c[i]||i}</span>
        <span class="tier-limit">${l.length} / ${r>=999?"∞":r} campaigns</span>
      </div>
      <div class="campaign-list" id="campaign-list">
        ${l.map(d=>`
          <div class="campaign-card${d.id==o?" campaign-active":""}" data-campaign-id="${d.id}">
            <div class="campaign-card-header">
              <div class="campaign-card-title">
                <span class="campaign-card-name">${d.name}</span>
                ${d.id==o?'<span class="campaign-active-badge">Active</span>':""}
              </div>
              <div class="campaign-card-actions">
                ${d.id!=o?`<button class="btn-sm btn-secondary campaign-switch-btn" data-id="${d.id}" title="Switch to this campaign">▶ Switch</button>`:""}
                <button class="btn-sm btn-secondary campaign-edit-btn" data-id="${d.id}" title="Edit campaign">✏️</button>
                <button class="btn-sm btn-danger campaign-delete-btn" data-id="${d.id}" title="Delete campaign">🗑️</button>
              </div>
            </div>
            <div class="campaign-card-meta">
              <span class="campaign-edition-badge">${Yi(d.dnd_edition)}</span>
              <span class="campaign-town-count">${d.town_count||0} towns</span>
            </div>
            ${d.description?`<div class="campaign-card-desc">${d.description}</div>`:""}
          </div>
        `).join("")}
      </div>
      ${l.length<r||r>=999?`
        <button class="btn-primary btn-sm" id="campaign-create-btn" style="margin-top:0.75rem;">+ New Campaign</button>
      `:`
        <div class="muted" style="margin-top:0.5rem;">Upgrade your plan to create more campaigns.</div>
      `}
    `,t.querySelectorAll(".campaign-switch-btn").forEach(d=>{d.addEventListener("click",async()=>{const u=parseInt(d.dataset.id);try{const v=await Us(u);if(v.campaign){ee({currentCampaign:v.campaign}),He(v.campaign.dnd_edition),ct();const m=document.getElementById("sidebar-container");m&&rt(m),ye(`Switched to "${v.campaign.name}"`,"success"),kt(e)}}catch(v){ye(v.message,"error")}})}),t.querySelectorAll(".campaign-edit-btn").forEach(d=>{d.addEventListener("click",()=>Ki(e,l.find(u=>u.id==d.dataset.id)))}),t.querySelectorAll(".campaign-delete-btn").forEach(d=>{d.addEventListener("click",async()=>{var v;const u=l.find(m=>m.id==d.dataset.id);if(u&&confirm(`Delete campaign "${u.name}"? This will delete all its towns and characters permanently.`))try{await dn(u.id),ye(`Campaign "${u.name}" deleted.`,"success");const m=await(await ne(async()=>{const{apiGetCurrentUser:y}=await Promise.resolve().then(()=>yn);return{apiGetCurrentUser:y}},void 0)).apiGetCurrentUser();(v=m.user)!=null&&v.active_campaign&&(ee({currentCampaign:m.user.active_campaign}),He(m.user.active_campaign.dnd_edition));const b=document.getElementById("sidebar-container");b&&rt(b),kt(e)}catch(m){ye(m.message,"error")}})}),(a=t.querySelector("#campaign-create-btn"))==null||a.addEventListener("click",()=>Xi(e))}catch(n){t.innerHTML=`<div class="muted">Error loading campaigns: ${n.message}</div>`}}function Xi(e){const t=e.querySelector("#campaigns-panel"),s=t.querySelector(".campaign-form");if(s){s.remove();return}const a=document.createElement("div");a.className="campaign-form",a.innerHTML=`
    <h4>Create New Campaign</h4>
    <div class="form-group">
      <label>Campaign Name</label>
      <input type="text" id="new-camp-name" class="form-input" placeholder="My New Campaign" autofocus>
    </div>
    <div class="form-group">
      <label>D&D Edition</label>
      <select id="new-camp-edition" class="form-select">
        <option value="3.5e">D&D 3.5 Edition (SRD)</option>
        <option value="5e">D&D 5th Edition — 2014 (SRD)</option>
        <option value="5e2024">D&D 5th Edition — 2024 Revised (SRD)</option>
      </select>
    </div>
    <div class="form-group">
      <label>Description (optional)</label>
      <input type="text" id="new-camp-desc" class="form-input" placeholder="A brief description...">
    </div>
    <div style="margin-top:0.75rem;">
      <button class="btn-primary btn-sm" id="new-camp-submit">Create</button>
      <button class="btn-secondary btn-sm" id="new-camp-cancel" style="margin-left:0.5rem;">Cancel</button>
    </div>
  `,t.insertBefore(a,t.firstChild),a.querySelector("#new-camp-cancel").addEventListener("click",()=>a.remove()),a.querySelector("#new-camp-submit").addEventListener("click",async()=>{const n=a.querySelector("#new-camp-name").value.trim(),l=a.querySelector("#new-camp-edition").value,i=a.querySelector("#new-camp-desc").value.trim();if(!n){ye("Name is required.","error");return}try{const r=await Ws(n,l,i);ye(`Campaign "${n}" created & activated!`,"success"),ee({currentCampaign:r.campaign}),He(l),ct();const p=document.getElementById("sidebar-container");p&&rt(p),a.remove(),kt(e)}catch(r){ye(r.message,"error")}})}function Ki(e,t){if(!t)return;const s=e.querySelector("#campaigns-panel"),a=s.querySelector(".campaign-form");a&&a.remove();const n=document.createElement("div");n.className="campaign-form",n.innerHTML=`
    <h4>Edit Campaign: ${t.name}</h4>
    <div class="form-group">
      <label>Campaign Name</label>
      <input type="text" id="edit-camp-name" class="form-input" value="${t.name}">
    </div>
    <div class="form-group">
      <label>D&D Edition</label>
      <select id="edit-camp-edition" class="form-select">
        <option value="3.5e"${t.dnd_edition==="3.5e"?" selected":""}>D&D 3.5 Edition (SRD)</option>
        <option value="5e"${t.dnd_edition==="5e"?" selected":""}>D&D 5th Edition — 2014 (SRD)</option>
        <option value="5e2024"${t.dnd_edition==="5e2024"?" selected":""}>D&D 5th Edition — 2024 Revised (SRD)</option>
      </select>
    </div>
    <div class="form-group">
      <label>Description</label>
      <input type="text" id="edit-camp-desc" class="form-input" value="${t.description||""}">
    </div>
    <div style="margin-top:0.75rem;">
      <button class="btn-primary btn-sm" id="edit-camp-submit">Save Changes</button>
      <button class="btn-secondary btn-sm" id="edit-camp-cancel" style="margin-left:0.5rem;">Cancel</button>
    </div>
  `,s.insertBefore(n,s.firstChild),n.querySelector("#edit-camp-cancel").addEventListener("click",()=>n.remove()),n.querySelector("#edit-camp-submit").addEventListener("click",async()=>{var p;const l=n.querySelector("#edit-camp-name").value.trim(),i=n.querySelector("#edit-camp-edition").value,r=n.querySelector("#edit-camp-desc").value.trim();if(!l){ye("Name is required.","error");return}try{await cn(t.id,{name:l,dnd_edition:i,description:r}),ye("Campaign updated!","success");const o=Z();((p=o.currentCampaign)==null?void 0:p.id)===t.id&&(ee({currentCampaign:{...o.currentCampaign,name:l,dnd_edition:i,description:r}}),He(i),ct());const c=document.getElementById("sidebar-container");c&&rt(c),n.remove(),kt(e)}catch(o){ye(o.message,"error")}})}function Yi(e){return{"3.5e":"D&D 3.5e","5e":"D&D 5e (2014)","5e2024":"D&D 5e (2024)"}[e]||e||""}async function Ji(e){try{const t=await rn();if(!t.settings)return;const s=t.settings;s.relationship_speed&&(e.querySelector("#s-rel-speed").value=s.relationship_speed),s.birth_rate&&(e.querySelector("#s-birth-rate").value=s.birth_rate),s.death_threshold&&(e.querySelector("#s-death-threshold").value=s.death_threshold),s.child_growth&&(e.querySelector("#s-child-growth").value=s.child_growth),s.conflict_frequency&&(e.querySelector("#s-conflict").value=s.conflict_frequency)}catch(t){console.error("Failed to load settings:",t)}}async function Qi(e){try{const t=await Ft();t.campaign_description&&(e.querySelector("#s-campaign-desc").value=t.campaign_description),t.rules_text&&(e.querySelector("#s-house-rules").value=t.rules_text);const s=t.homebrew_settings||{},a=["magic-level","tech-level","tone","divine","planar","economy","law","monster-int","power-level","ability-scores","leveling","multiclass","alignment","racial","feats","mortality","death","healing","resting","encumbrance","disease","natural-hazards","npc-depth","romance","factions","crafting","magic-items","undead"],n=["magic_level","tech_level","tone","divine","planar","economy","law","monster_intelligence","power_level","ability_scores","leveling","multiclass","alignment","racial","feats","mortality","death","healing","resting","encumbrance","disease","natural_hazards","npc_depth","romance","factions","crafting","magic_items","undead"];a.forEach((l,i)=>{const r=e.querySelector(`#hb-${l}`);r&&s[n[i]]&&(r.value=s[n[i]])})}catch(t){console.error("Failed to load campaign rules:",t)}}async function Zi(e){try{await vt("relationship_speed",e.querySelector("#s-rel-speed").value),await vt("birth_rate",e.querySelector("#s-birth-rate").value),await vt("death_threshold",e.querySelector("#s-death-threshold").value),await vt("child_growth",e.querySelector("#s-child-growth").value),await vt("conflict_frequency",e.querySelector("#s-conflict").value);const t=e.querySelector("#s-campaign-desc").value.trim(),s=e.querySelector("#s-house-rules").value.trim(),a={},n=["magic-level","tech-level","tone","divine","planar","economy","law","monster-int","power-level","ability-scores","leveling","multiclass","alignment","racial","feats","mortality","death","healing","resting","encumbrance","disease","natural-hazards","npc-depth","romance","factions","crafting","magic-items","undead"],l=["magic_level","tech_level","tone","divine","planar","economy","law","monster_intelligence","power_level","ability_scores","leveling","multiclass","alignment","racial","feats","mortality","death","healing","resting","encumbrance","disease","natural_hazards","npc_depth","romance","factions","crafting","magic_items","undead"];n.forEach((i,r)=>{var o;const p=((o=e.querySelector(`#hb-${i}`))==null?void 0:o.value)||"";p&&(a[l[r]]=p)}),await En(s,t,a),ye("Settings saved!","success")}catch(t){ye("Save failed: "+t.message,"error")}}const el=[{key:"spells",icon:"✨",label:"Spells",count:699},{key:"monsters",icon:"🐉",label:"Monsters",count:681},{key:"feats",icon:"⚔️",label:"Feats",count:387},{key:"powers",icon:"🔮",label:"Powers",count:286},{key:"equipment",icon:"🛡️",label:"Equipment",count:282},{key:"items",icon:"💎",label:"Magic Items",count:1680},{key:"classes",icon:"🎭",label:"Classes",count:16},{key:"races",icon:"👤",label:"Races",count:7},{key:"skills",icon:"📋",label:"Skills",count:40},{key:"domains",icon:"⛪",label:"Domains",count:36}];let xs=null;function tl(e){e.innerHTML=`
    <div class="view-srd">
      <header class="view-header">
        <h1>📖 SRD Reference Browser</h1>
      </header>

      <div class="srd-tabs" id="srd-tabs">
        ${el.map(a=>`<button class="srd-tab${a.key==="spells"?" active":""}" data-tab="${a.key}">
          <span class="srd-tab-icon">${a.icon}</span>
          <span class="srd-tab-label">${a.label}</span>
        </button>`).join("")}
        <div class="srd-search-inline">
          <input type="text" id="srd-search" placeholder="Search..." class="form-input">
        </div>
      </div>

      <div class="srd-content" id="srd-content">
        <p class="muted">Loading...</p>
      </div>
    </div>
  `;let t="spells";e.querySelectorAll(".srd-tab").forEach(a=>{a.addEventListener("click",()=>{t=a.dataset.tab,e.querySelectorAll(".srd-tab").forEach(n=>n.classList.toggle("active",n===a)),e.querySelector("#srd-search").value="",zt(e,t,"")})}),e.querySelector("#srd-search").addEventListener("input",a=>{clearTimeout(xs),xs=setTimeout(()=>{zt(e,t,a.target.value.trim())},300)}),zt(e,"spells","")}async function zt(e,t,s){const a=e.querySelector("#srd-content");if(a){a.innerHTML='<div class="srd-loading"><div class="spinner"></div>Loading...</div>';try{switch(t){case"spells":await sl(a,s);break;case"monsters":await al(a,s);break;case"feats":await nl(a,s);break;case"powers":await il(a,s);break;case"equipment":await ll(a,s);break;case"items":await rl(a,s);break;case"classes":await ol(a,s);break;case"races":await cl(a,s);break;case"skills":await dl(a,s);break;case"domains":await pl(a,s);break}}catch(n){a.innerHTML=`<p class="error">Failed to load: ${n.message}</p>`}}}function R(e){return!e||e==="None"||e==="null"?"":e}function Ae(e){return!e||e==="None"?"":e.replace(/<div topic=['"][^'"]*['"][^>]*>/gi,"").replace(/<\/div>/gi,"").replace(/<p>/gi,"<p>").replace(/<h[2-8]>/gi,t=>t).trim()}function Be(e){return`<div class="srd-empty">
        <div class="srd-empty-icon">📭</div>
        <p>No ${e} found matching your search.</p>
    </div>`}async function sl(e,t){var i;const s=(await Bt(t)).data||[];if(!s.length){e.innerHTML=Be("spells");return}const a={};s.forEach(r=>{const p=r.school||"Unknown";a[p]||(a[p]={});const o=(r.level||"").match(/(\d+)/),d=`Level ${o?parseInt(o[1]):0}`;a[p][d]||(a[p][d]=[]),a[p][d].push(r)});const l=Object.keys(a).sort().map(r=>{const p=Object.keys(a[r]).sort((c,d)=>parseInt(c.replace("Level ",""))-parseInt(d.replace("Level ",""))),o=p.reduce((c,d)=>c+a[r][d].length,0);return`<div class="srd-group">
      <div class="srd-group-header"><span class="srd-group-arrow">▶</span>
        <span class="srd-group-name">${R(r)}</span>
        <span class="srd-group-count">${o}</span></div>
      <div class="srd-group-body" style="display:none;">
        ${p.map(c=>`<div class="srd-subgroup">
          <div class="srd-subgroup-header"><span class="srd-subgroup-arrow">▶</span>
            <span class="srd-subgroup-name">${R(c)}</span>
            <span class="srd-group-count">${a[r][c].length}</span></div>
          <div class="srd-subgroup-body" style="display:none;">
            ${a[r][c].map(d=>`<div class="srd-list-item" data-id="${d.id}">
              <span class="srd-list-name">${d.name}</span>
              <span class="srd-list-meta">${R(d.level||"")}</span>
            </div>`).join("")}
          </div>
        </div>`).join("")}
      </div>
    </div>`}).join("");e.innerHTML=`<div class="srd-split">
    <div class="srd-list" id="srd-list">
      <div class="srd-list-header">
        <span class="srd-list-count">${s.length} spells</span>
        <button class="btn-sm btn-secondary" id="srd-expand-all">Expand All</button>
      </div>${l}
    </div>
    <div class="srd-detail-panel" id="srd-detail">
      <div class="srd-detail-empty"><div class="srd-empty-icon">✨</div><p>Select a spell to view details</p></div>
    </div></div>`,e.querySelectorAll(".srd-group-header").forEach(r=>{r.addEventListener("click",()=>{const p=r.nextElementSibling,o=r.querySelector(".srd-group-arrow"),c=p.style.display!=="none";p.style.display=c?"none":"block",o.textContent=c?"▶":"▼"})}),e.querySelectorAll(".srd-subgroup-header").forEach(r=>{r.addEventListener("click",p=>{p.stopPropagation();const o=r.nextElementSibling,c=r.querySelector(".srd-subgroup-arrow"),d=o.style.display!=="none";o.style.display=d?"none":"block",c.textContent=d?"▶":"▼"})}),(i=e.querySelector("#srd-expand-all"))==null||i.addEventListener("click",()=>{const r=e.querySelectorAll(".srd-group-body, .srd-subgroup-body"),p=[...r].some(o=>o.style.display==="none");r.forEach(o=>o.style.display=p?"block":"none"),e.querySelectorAll(".srd-group-arrow, .srd-subgroup-arrow").forEach(o=>o.textContent=p?"▼":"▶"),e.querySelector("#srd-expand-all").textContent=p?"Collapse All":"Expand All"}),e.querySelector("#srd-list").addEventListener("click",async r=>{const p=r.target.closest(".srd-list-item");if(!p)return;e.querySelectorAll(".srd-list-item").forEach(d=>d.classList.remove("selected")),p.classList.add("selected");const o=e.querySelector("#srd-detail");o.innerHTML='<div class="srd-loading"><div class="spinner"></div></div>';const c=(await Qs(p.dataset.id)).data;if(!c){o.innerHTML='<p class="error">Not found</p>';return}o.innerHTML=`<div class="srd-detail-content">
      <h2>${c.name}</h2>
      <div class="srd-detail-tags">
        <span class="srd-badge">${R(c.school)}</span>
        ${c.subschool?`<span class="srd-badge srd-badge-sub">${c.subschool}</span>`:""}
        ${c.descriptor_text?`<span class="srd-badge srd-badge-desc">[${c.descriptor_text}]</span>`:""}
      </div>
      <div class="srd-stat-grid">
        <div class="srd-stat"><label>Level</label><span>${R(c.level)}</span></div>
        <div class="srd-stat"><label>Components</label><span>${R(c.components)}</span></div>
        <div class="srd-stat"><label>Casting Time</label><span>${R(c.casting_time)}</span></div>
        <div class="srd-stat"><label>Range</label><span>${R(c.spell_range)}</span></div>
        ${c.target?`<div class="srd-stat"><label>Target</label><span>${R(c.target)}</span></div>`:""}
        ${c.area?`<div class="srd-stat"><label>Area</label><span>${R(c.area)}</span></div>`:""}
        ${c.effect?`<div class="srd-stat"><label>Effect</label><span>${R(c.effect)}</span></div>`:""}
        <div class="srd-stat"><label>Duration</label><span>${R(c.duration)}</span></div>
        <div class="srd-stat"><label>Saving Throw</label><span>${R(c.saving_throw)}</span></div>
        <div class="srd-stat"><label>Spell Resistance</label><span>${R(c.spell_resistance)}</span></div>
      </div>
      ${c.description?`<div class="srd-description">${Ae(c.description)}</div>`:""}
      ${c.material_components?`<div class="srd-extra"><strong>Material Components:</strong> ${R(c.material_components)}</div>`:""}
      ${c.focus?`<div class="srd-extra"><strong>Focus:</strong> ${R(c.focus)}</div>`:""}
      ${c.xp_cost?`<div class="srd-extra"><strong>XP Cost:</strong> ${R(c.xp_cost)}</div>`:""}
    </div>`})}async function al(e,t){const s=(await Zs(t)).data||[];if(!s.length){e.innerHTML=Be("monsters");return}e.innerHTML=`
        <div class="srd-split">
            <div class="srd-list" id="srd-list">
                <div class="srd-list-header">
                    <span class="srd-list-count">${s.length} monsters</span>
                </div>
                ${s.map(a=>`
                    <div class="srd-list-item" data-id="${a.id}">
                        <span class="srd-list-name">${a.name}</span>
                        <span class="srd-list-meta">${R(a.type)} · CR ${R(a.challenge_rating)}</span>
                    </div>
                `).join("")}
            </div>
            <div class="srd-detail-panel" id="srd-detail">
                <div class="srd-detail-empty">
                    <div class="srd-empty-icon">🐉</div>
                    <p>Select a monster to view its stat block</p>
                </div>
            </div>
        </div>
    `,e.querySelector("#srd-list").addEventListener("click",async a=>{const n=a.target.closest(".srd-list-item");if(!n)return;e.querySelectorAll(".srd-list-item").forEach(r=>r.classList.remove("selected")),n.classList.add("selected");const l=e.querySelector("#srd-detail");l.innerHTML='<div class="srd-loading"><div class="spinner"></div></div>';const i=(await ea(n.dataset.id)).data;if(!i){l.innerHTML='<p class="error">Not found</p>';return}l.innerHTML=`
            <div class="srd-detail-content srd-statblock">
                <h2>${i.name}</h2>
                <div class="srd-detail-tags">
                    <span class="srd-badge">${R(i.size)} ${R(i.type)}</span>
                    ${i.descriptor_text?`<span class="srd-badge srd-badge-desc">${i.descriptor_text}</span>`:""}
                    <span class="srd-badge srd-badge-cr">CR ${R(i.challenge_rating)}</span>
                </div>
                <div class="srd-stat-grid">
                    <div class="srd-stat"><label>Hit Dice</label><span>${R(i.hit_dice)}</span></div>
                    <div class="srd-stat"><label>Initiative</label><span>${R(i.initiative)}</span></div>
                    <div class="srd-stat"><label>Speed</label><span>${R(i.speed)}</span></div>
                    <div class="srd-stat srd-stat-wide"><label>Armor Class</label><span>${R(i.armor_class)}</span></div>
                    <div class="srd-stat"><label>Base Attack</label><span>${R(i.base_attack)}</span></div>
                    <div class="srd-stat"><label>Grapple</label><span>${R(i.grapple)}</span></div>
                    <div class="srd-stat srd-stat-wide"><label>Attack</label><span>${R(i.attack)}</span></div>
                    <div class="srd-stat srd-stat-wide"><label>Full Attack</label><span>${R(i.full_attack)}</span></div>
                    <div class="srd-stat"><label>Space/Reach</label><span>${R(i.space)} / ${R(i.reach)}</span></div>
                    <div class="srd-stat srd-stat-wide"><label>Abilities</label><span>${R(i.abilities)}</span></div>
                    <div class="srd-stat srd-stat-wide"><label>Saves</label><span>${R(i.saves)}</span></div>
                </div>
                ${i.special_attacks?`<div class="srd-extra"><strong>Special Attacks:</strong> ${R(i.special_attacks)}</div>`:""}
                ${i.special_qualities?`<div class="srd-extra"><strong>Special Qualities:</strong> ${R(i.special_qualities)}</div>`:""}
                ${i.skills?`<div class="srd-extra"><strong>Skills:</strong> ${R(i.skills)}</div>`:""}
                ${i.feats?`<div class="srd-extra"><strong>Feats:</strong> ${R(i.feats)}</div>`:""}
                <div class="srd-stat-grid">
                    <div class="srd-stat"><label>Environment</label><span>${R(i.environment)}</span></div>
                    <div class="srd-stat"><label>Organization</label><span>${R(i.organization)}</span></div>
                    <div class="srd-stat"><label>Treasure</label><span>${R(i.treasure)}</span></div>
                    <div class="srd-stat"><label>Alignment</label><span>${R(i.alignment)}</span></div>
                    <div class="srd-stat"><label>Advancement</label><span>${R(i.advancement)}</span></div>
                    ${i.level_adjustment?`<div class="srd-stat"><label>Level Adj.</label><span>${R(i.level_adjustment)}</span></div>`:""}
                </div>
                ${i.special_abilities?`<div class="srd-description"><strong>Special Abilities:</strong><br>${Ae(i.special_abilities)}</div>`:""}
            </div>
        `})}async function nl(e,t){const s=(await Ys(t)).data||[];if(!s.length){e.innerHTML=Be("feats");return}const a={};s.forEach(i=>{const r=i.type||"General";a[r]||(a[r]=[]),a[r].push(i)});const n=Object.keys(a).sort();e.innerHTML=`
        <div class="srd-split">
            <div class="srd-list" id="srd-list">
                <div class="srd-list-header">
                    <span class="srd-list-count">${s.length} feats</span>
                </div>
                ${n.map(i=>`
                    <div class="srd-list-group">${i} (${a[i].length})</div>
                    ${a[i].map(r=>`
                        <div class="srd-list-item" data-id="${r.id}">
                            <span class="srd-list-name">${r.name}</span>
                            <span class="srd-list-meta">${r.prerequisites&&r.prerequisites!=="None"?"📌":""}</span>
                        </div>
                    `).join("")}
                `).join("")}
            </div>
            <div class="srd-detail-panel" id="srd-detail">
                <div class="srd-detail-empty">
                    <div class="srd-empty-icon">⚔️</div>
                    <p>Select a feat to view details</p>
                </div>
            </div>
        </div>
    `;const l={};s.forEach(i=>l[i.id]=i),e.querySelector("#srd-list").addEventListener("click",i=>{const r=i.target.closest(".srd-list-item");if(!r)return;e.querySelectorAll(".srd-list-item").forEach(m=>m.classList.remove("selected")),r.classList.add("selected");const p=e.querySelector("#srd-detail"),o=l[r.dataset.id];if(!o)return;const c=R(o.prerequisites)||"None",d=R(o.benefit)||"",u=R(o.special)||"",v=R(o.normal_text)||"";p.innerHTML=`
            <div class="srd-detail-content">
                <h2>${o.name}</h2>
                <div class="srd-detail-tags">
                    <span class="srd-badge">${o.type}</span>
                    ${o.multiple==="Yes"?'<span class="srd-badge srd-badge-sub">Multiple</span>':""}
                    ${o.stack==="Yes"?'<span class="srd-badge srd-badge-desc">Stacks</span>':""}
                </div>
                <div class="srd-feat-section">
                    <h4>Prerequisites</h4>
                    <p>${c}</p>
                </div>
                <div class="srd-feat-section">
                    <h4>Benefit</h4>
                    <div>${Ae(d)}</div>
                </div>
                ${v&&v!=="None"?`<div class="srd-feat-section"><h4>Normal</h4><div>${Ae(v)}</div></div>`:""}
                ${u&&u!=="None"?`<div class="srd-feat-section"><h4>Special</h4><div>${Ae(u)}</div></div>`:""}
            </div>
        `})}async function il(e,t){var i;const s=(await ta(t)).data||[];if(!s.length){e.innerHTML=Be("psionic powers");return}const a={};s.forEach(r=>{const p=r.discipline||"Unknown";a[p]||(a[p]={});const o=(r.level||"").match(/(\d+)/),d=`Level ${o?parseInt(o[1]):0}`;a[p][d]||(a[p][d]=[]),a[p][d].push(r)});const l=Object.keys(a).sort().map(r=>{const p=Object.keys(a[r]).sort((c,d)=>parseInt(c.replace("Level ",""))-parseInt(d.replace("Level ",""))),o=p.reduce((c,d)=>c+a[r][d].length,0);return`<div class="srd-group">
            <div class="srd-group-header"><span class="srd-group-arrow">▶</span>
                <span class="srd-group-name">${R(r)}</span>
                <span class="srd-group-count">${o}</span></div>
            <div class="srd-group-body" style="display:none;">
                ${p.map(c=>`<div class="srd-subgroup">
                    <div class="srd-subgroup-header"><span class="srd-subgroup-arrow">▶</span>
                        <span class="srd-subgroup-name">${R(c)}</span>
                        <span class="srd-group-count">${a[r][c].length}</span></div>
                    <div class="srd-subgroup-body" style="display:none;">
                        ${a[r][c].map(d=>`<div class="srd-list-item" data-id="${d.id}">
                            <span class="srd-list-name">${d.name}</span>
                            <span class="srd-list-meta">${R(d.power_points||"")} PP</span>
                        </div>`).join("")}
                    </div>
                </div>`).join("")}
            </div>
        </div>`}).join("");e.innerHTML=`<div class="srd-split">
        <div class="srd-list" id="srd-list">
            <div class="srd-list-header">
                <span class="srd-list-count">${s.length} powers</span>
                <button class="btn-sm btn-secondary" id="srd-expand-all">Expand All</button>
            </div>${l}
        </div>
        <div class="srd-detail-panel" id="srd-detail">
            <div class="srd-detail-empty"><div class="srd-empty-icon">🔮</div><p>Select a power to view details</p></div>
        </div></div>`,e.querySelectorAll(".srd-group-header").forEach(r=>{r.addEventListener("click",()=>{const p=r.nextElementSibling,o=r.querySelector(".srd-group-arrow"),c=p.style.display!=="none";p.style.display=c?"none":"block",o.textContent=c?"▶":"▼"})}),e.querySelectorAll(".srd-subgroup-header").forEach(r=>{r.addEventListener("click",p=>{p.stopPropagation();const o=r.nextElementSibling,c=r.querySelector(".srd-subgroup-arrow"),d=o.style.display!=="none";o.style.display=d?"none":"block",c.textContent=d?"▶":"▼"})}),(i=e.querySelector("#srd-expand-all"))==null||i.addEventListener("click",()=>{const r=e.querySelectorAll(".srd-group-body, .srd-subgroup-body"),p=[...r].some(o=>o.style.display==="none");r.forEach(o=>o.style.display=p?"block":"none"),e.querySelectorAll(".srd-group-arrow, .srd-subgroup-arrow").forEach(o=>o.textContent=p?"▼":"▶"),e.querySelector("#srd-expand-all").textContent=p?"Collapse All":"Expand All"}),e.querySelector("#srd-list").addEventListener("click",async r=>{const p=r.target.closest(".srd-list-item");if(!p)return;e.querySelectorAll(".srd-list-item").forEach(d=>d.classList.remove("selected")),p.classList.add("selected");const o=e.querySelector("#srd-detail");o.innerHTML='<div class="srd-loading"><div class="spinner"></div></div>';const c=(await sa(p.dataset.id)).data;if(!c){o.innerHTML='<p class="error">Not found</p>';return}o.innerHTML=`<div class="srd-detail-content">
            <h2>${c.name}</h2>
            <div class="srd-detail-tags">
                <span class="srd-badge">${R(c.discipline)}</span>
                ${c.subdiscipline?`<span class="srd-badge srd-badge-sub">${c.subdiscipline}</span>`:""}
                ${c.descriptor_text?`<span class="srd-badge srd-badge-desc">[${c.descriptor_text}]</span>`:""}
            </div>
            <div class="srd-stat-grid">
                <div class="srd-stat"><label>Level</label><span>${R(c.level)}</span></div>
                <div class="srd-stat"><label>Display</label><span>${R(c.display)}</span></div>
                <div class="srd-stat"><label>Manifesting Time</label><span>${R(c.manifesting_time)}</span></div>
                <div class="srd-stat"><label>Range</label><span>${R(c.power_range)}</span></div>
                ${c.target?`<div class="srd-stat"><label>Target</label><span>${R(c.target)}</span></div>`:""}
                <div class="srd-stat"><label>Duration</label><span>${R(c.duration)}</span></div>
                <div class="srd-stat"><label>Saving Throw</label><span>${R(c.saving_throw)}</span></div>
                <div class="srd-stat"><label>Power Points</label><span>${R(c.power_points)}</span></div>
                <div class="srd-stat"><label>Power Resistance</label><span>${R(c.power_resistance)}</span></div>
            </div>
            ${c.description?`<div class="srd-description">${Ae(c.description)}</div>`:""}
            ${c.augment?`<div class="srd-extra"><strong>Augment:</strong> ${Ae(c.augment)}</div>`:""}
        </div>`})}async function ll(e,t){const s=(await Js(t)).data||[];if(!s.length){e.innerHTML=Be("equipment");return}const a={};s.forEach(l=>{const i=l.category||"Other";a[i]||(a[i]=[]),a[i].push(l)});const n=Object.keys(a).sort();e.innerHTML=`
        <div class="srd-equip-layout">
            <div class="srd-equip-cats">
                <button class="srd-cat-btn active" data-cat="all">All (${s.length})</button>
                ${n.map(l=>`<button class="srd-cat-btn" data-cat="${l}">${l} (${a[l].length})</button>`).join("")}
            </div>
            <div class="srd-equip-table" id="srd-equip-table">
                ${Ts(s)}
            </div>
        </div>
    `,e.querySelectorAll(".srd-cat-btn").forEach(l=>{l.addEventListener("click",()=>{e.querySelectorAll(".srd-cat-btn").forEach(p=>p.classList.remove("active")),l.classList.add("active");const i=l.dataset.cat,r=i==="all"?s:a[i]||[];e.querySelector("#srd-equip-table").innerHTML=Ts(r)})})}function Ts(e){return`<table class="srd-table srd-table-hover">
        <thead><tr>
            <th>Name</th><th>Category</th><th>Cost</th><th>Weight</th><th>Damage (M)</th><th>Critical</th><th>Type</th>
        </tr></thead>
        <tbody>${e.map(t=>{const s=[];t.armor_bonus&&s.push(`AC Bonus: +${t.armor_bonus}`),t.max_dex&&s.push(`Max Dex: +${t.max_dex}`),t.acp&&s.push(`ACP: ${t.acp}`),t.spell_failure&&s.push(`Spell Failure: ${t.spell_failure}%`),t.range_increment&&s.push(`Range: ${t.range_increment}`),t.dmg_s&&s.push(`Dmg (S): ${t.dmg_s}`),t.properties&&s.push(t.properties);const a=s.length?s.join(" | "):"";return`<tr class="srd-equip-row" ${a?`data-tooltip="${a.replace(/"/g,"&quot;")}"`:""}>
                <td class="srd-equip-name">${t.name}${a?'<span class="srd-tooltip-icon">ℹ️</span>':""}</td>
                <td>${R(t.category)}</td>
                <td>${R(t.cost)}</td>
                <td>${R(t.weight)}</td>
                <td>${R(t.dmg_m)||R(t.damage)||"—"}</td>
                <td>${R(t.critical)||"—"}</td>
                <td>${R(t.type_text)||"—"}</td>
            </tr>`}).join("")}</tbody>
    </table>`}async function rl(e,t){const s=(await na(t)).data||[];if(!s.length){e.innerHTML=Be("magic items");return}e.innerHTML=`
        <div class="srd-split">
            <div class="srd-list" id="srd-list">
                <div class="srd-list-header">
                    <span class="srd-list-count">${s.length} items</span>
                </div>
                ${s.map(a=>`
                    <div class="srd-list-item" data-id="${a.id}">
                        <span class="srd-list-name">${a.name}</span>
                        <span class="srd-list-meta">${R(a.category)} · ${R(a.price)}</span>
                    </div>
                `).join("")}
            </div>
            <div class="srd-detail-panel" id="srd-detail">
                <div class="srd-detail-empty">
                    <div class="srd-empty-icon">💎</div>
                    <p>Select an item to view details</p>
                </div>
            </div>
        </div>
    `,e.querySelector("#srd-list").addEventListener("click",async a=>{const n=a.target.closest(".srd-list-item");if(!n)return;e.querySelectorAll(".srd-list-item").forEach(r=>r.classList.remove("selected")),n.classList.add("selected");const l=e.querySelector("#srd-detail");l.innerHTML='<div class="srd-loading"><div class="spinner"></div></div>';const i=(await ia(n.dataset.id)).data;if(!i){l.innerHTML='<p class="error">Not found</p>';return}l.innerHTML=`
            <div class="srd-detail-content">
                <h2>${i.name}</h2>
                <div class="srd-detail-tags">
                    <span class="srd-badge">${R(i.category)}</span>
                    ${i.subcategory?`<span class="srd-badge srd-badge-sub">${i.subcategory}</span>`:""}
                </div>
                <div class="srd-stat-grid">
                    ${i.aura?`<div class="srd-stat"><label>Aura</label><span>${R(i.aura)}</span></div>`:""}
                    ${i.caster_level?`<div class="srd-stat"><label>Caster Level</label><span>${R(i.caster_level)}</span></div>`:""}
                    <div class="srd-stat"><label>Price</label><span>${R(i.price)}</span></div>
                    ${i.cost?`<div class="srd-stat"><label>Cost</label><span>${R(i.cost)}</span></div>`:""}
                    ${i.weight?`<div class="srd-stat"><label>Weight</label><span>${R(i.weight)}</span></div>`:""}
                </div>
                ${i.prereq?`<div class="srd-extra"><strong>Prerequisites:</strong> ${R(i.prereq)}</div>`:""}
                ${i.full_text?`<div class="srd-description">${Ae(i.full_text)}</div>`:""}
            </div>
        `})}async function ol(e,t){const s=(await Xs()).data||[],a=(t||"").toLowerCase(),n=a?s.filter(i=>(i.name||"").toLowerCase().includes(a)||(i.class_features||"").toLowerCase().includes(a)):s;if(!n.length){e.innerHTML=Be("classes");return}e.innerHTML=`
      <div class="srd-split">
          <div class="srd-list" id="srd-list">
              <div class="srd-list-header">
                  <span class="srd-list-count">${n.length} classes</span>
              </div>
              ${n.map(i=>`
                  <div class="srd-list-item" data-name="${i.name}">
                      <span class="srd-list-name">${i.name}</span>
                      <span class="srd-list-meta">HD ${i.hit_die||"?"}</span>
                  </div>
              `).join("")}
          </div>
          <div class="srd-detail-panel" id="srd-detail">
              <div class="srd-detail-empty">
                  <div class="srd-empty-icon">🎭</div>
                  <p>Select a class to view details</p>
              </div>
          </div>
      </div>
  `;const l={};n.forEach(i=>l[i.name]=i),e.querySelector("#srd-list").addEventListener("click",async i=>{const r=i.target.closest(".srd-list-item");if(!r)return;e.querySelectorAll(".srd-list-item").forEach(d=>d.classList.remove("selected")),r.classList.add("selected");const p=e.querySelector("#srd-detail"),o=l[r.dataset.name];if(!o)return;p.innerHTML='<div class="srd-loading"><div class="spinner"></div>Loading progression...</div>';const c=(await as(o.name)).data||[];p.innerHTML=`
        <div class="srd-detail-content">
            <h2>${o.name}</h2>
            <div class="srd-stat-grid">
                <div class="srd-stat"><label>Hit Die</label><span>${o.hit_die}</span></div>
                <div class="srd-stat"><label>BAB Type</label><span>${o.bab_type}</span></div>
                <div class="srd-stat"><label>Skills/Level</label><span>${o.skills_per_level}</span></div>
                <div class="srd-stat"><label>Good Saves</label><span>${o.good_saves||"None"}</span></div>
            </div>
            <div class="srd-extra"><strong>Class Features:</strong> ${o.class_features||"—"}</div>
            ${c.length?`
                <h3 class="srd-section-title">📊 Level Progression</h3>
                <div class="srd-progression-wrap">
                    <table class="srd-table srd-table-sm">
                        <thead><tr><th>Lvl</th><th>BAB</th><th>Fort</th><th>Ref</th><th>Will</th><th>Special</th></tr></thead>
                        <tbody>${c.map(d=>`<tr>
                            <td>${d.level}</td><td>${R(d.base_attack_bonus)}</td><td>${R(d.fort_save)}</td><td>${R(d.ref_save)}</td><td>${R(d.will_save)}</td><td>${R(d.special)||"—"}</td>
                        </tr>`).join("")}</tbody>
                    </table>
                </div>
            `:'<p class="muted">No progression data available.</p>'}
        </div>
    `})}async function cl(e,t){const s=(await Vs()).data||[],a=(t||"").toLowerCase(),n=a?s.filter(l=>(l.name||"").toLowerCase().includes(a)):s;if(!n.length){e.innerHTML=Be("races");return}e.innerHTML=`<div class="srd-grid">${n.map(l=>`
        <div class="srd-card">
            <h3>${l.name}</h3>
            <div class="srd-detail"><strong>Size:</strong> ${l.size} | <strong>Speed:</strong> ${l.speed}ft</div>
            <div class="srd-detail"><strong>Ability Mods:</strong> ${l.ability_mods||"None"}</div>
            <div class="srd-detail"><strong>Traits:</strong> ${l.traits||"—"}</div>
            <div class="srd-detail"><strong>Languages:</strong> ${l.languages||"—"}</div>
        </div>
    `).join("")}</div>`}async function dl(e,t){const s=(await Ks()).data||[],a=(t||"").toLowerCase(),n=a?s.filter(l=>(l.name||"").toLowerCase().includes(a)):s;if(!n.length){e.innerHTML=Be("skills");return}e.innerHTML=`<div class="srd-split">
        <div class="srd-list" id="srd-list">
            <div class="srd-list-header">
                <span class="srd-list-count">${n.length} skills</span>
            </div>
            <div class="skills-table-wrap" style="max-height:none;border:none;">
                <table class="skills-table" id="srd-skills-table">
                    <thead><tr><th>Skill</th><th>Ab.</th><th>Trn</th><th>ACP</th></tr></thead>
                    <tbody>${n.map(l=>`<tr data-id="${l.id}" class="srd-skill-row">
                        <td class="skill-name">${l.name}${l.subtype?` (${l.subtype})`:""}</td>
                        <td class="skill-val">${l.ability||""}</td>
                        <td class="skill-val">${l.trained_only==="Yes"||l.trained_only==1?"✓":""}</td>
                        <td class="skill-val">${l.armor_check_penalty==="Yes"||l.armor_check_penalty==1?"✓":""}</td>
                    </tr>`).join("")}</tbody>
                </table>
            </div>
        </div>
        <div class="srd-detail-panel" id="srd-detail">
            <div class="srd-detail-empty"><div class="srd-empty-icon">📋</div><p>Select a skill to view details</p></div>
        </div>
    </div>`,e.querySelector("#srd-skills-table").addEventListener("click",l=>{const i=l.target.closest("tr[data-id]");if(!i)return;e.querySelectorAll(".srd-skill-row").forEach(c=>c.classList.remove("selected")),i.classList.add("selected");const r=parseInt(i.dataset.id),p=n.find(c=>c.id===r||c.id===String(r)),o=e.querySelector("#srd-detail");if(!p){o.innerHTML='<p class="error">Not found</p>';return}o.innerHTML=`<div class="srd-detail-content">
            <h2>${p.name}${p.subtype?` (${p.subtype})`:""}</h2>
            <div class="srd-detail-tags">
                <span class="srd-badge">${p.ability||"N/A"}</span>
                ${p.trained_only==1||p.trained_only==="Yes"?'<span class="srd-badge srd-badge-sub">Trained Only</span>':""}
                ${p.armor_check_penalty==1||p.armor_check_penalty==="Yes"?'<span class="srd-badge srd-badge-desc">Armor Check Penalty</span>':""}
                ${p.psionic==="Yes"?'<span class="srd-badge srd-badge-sub">Psionic</span>':""}
            </div>
            ${p.full_text?`<div class="srd-description" style="margin-top:0.75rem;">${Ae(p.full_text)}</div>`:p.description?`<div class="srd-description" style="margin-top:0.75rem;">${Ae(p.description)}</div>`:""}
            ${p.synergy?`<div class="srd-extra"><strong>Synergy:</strong> ${Ae(p.synergy)}</div>`:""}
        </div>`})}async function pl(e,t){const s=(await aa()).data||[],a=(t||"").toLowerCase(),n=a?s.filter(i=>(i.name||"").toLowerCase().includes(a)):s;if(!n.length){e.innerHTML=Be("domains");return}e.innerHTML=`
      <div class="srd-split">
          <div class="srd-list" id="srd-list">
              <div class="srd-list-header">
                  <span class="srd-list-count">${n.length} domains</span>
              </div>
              ${n.map(i=>`
                  <div class="srd-list-item" data-name="${i.name}">
                      <span class="srd-list-name">⛪ ${i.name}</span>
                  </div>
              `).join("")}
          </div>
          <div class="srd-detail-panel" id="srd-detail">
              <div class="srd-detail-empty">
                  <div class="srd-empty-icon">⛪</div>
                  <p>Select a domain to view details</p>
              </div>
          </div>
      </div>
  `;const l={};n.forEach(i=>l[i.name]=i),e.querySelector("#srd-list").addEventListener("click",i=>{const r=i.target.closest(".srd-list-item");if(!r)return;e.querySelectorAll(".srd-list-item").forEach(d=>d.classList.remove("selected")),r.classList.add("selected");const p=e.querySelector("#srd-detail"),o=l[r.dataset.name];if(!o)return;const c=[];for(let d=1;d<=9;d++){const u=o[`spell_${d}`];u&&c.push({level:d,name:u})}p.innerHTML=`
        <div class="srd-detail-content">
            <h2>⛪ ${o.name} Domain</h2>
            <div class="srd-feat-section">
                <h4>Granted Powers</h4>
                <div>${Ae(o.granted_powers)||"—"}</div>
            </div>
            <div class="srd-feat-section">
                <h4>Domain Spells</h4>
                <table class="srd-table srd-table-sm">
                    <thead><tr><th>Level</th><th>Spell</th></tr></thead>
                    <tbody>${c.map(d=>`<tr>
                        <td><strong>${d.level}</strong></td>
                        <td>${d.name}</td>
                    </tr>`).join("")}</tbody>
                </table>
            </div>
            ${o.full_text?`<div class="srd-description">${Ae(o.full_text)}</div>`:""}
        </div>
    `})}const As=["Hammer","Alturiak","Ches","Tarsakh","Mirtul","Kythorn","Flamerule","Eleasis","Eleint","Marpenoth","Uktar","Nightal"];function ul(e){let _mpy=12;e.innerHTML=`
    <div class="view-calendar">
      <header class="view-header"><h1>📅 Calendar</h1></header>
      <div class="calendar-display" id="cal-display">Loading...</div>

      <section class="settings-section-card" style="margin-bottom:1rem;">
        <h3>Current Date</h3>
        <div class="form-row" style="flex-wrap:wrap;gap:1rem;">
          <div class="form-group" style="flex:1;min-width:80px;"><label>Day</label><input type="number" id="cal-day" min="1" max="100" class="form-input"></div>
          <div class="form-group" style="flex:1;min-width:80px;"><label>Month</label><input type="number" id="cal-month" min="1" max="20" class="form-input"></div>
          <div class="form-group" style="flex:2;min-width:120px;"><label>Year</label><input type="number" id="cal-year" class="form-input"></div>
          <div class="form-group" style="flex:1;min-width:100px;"><label>Era Name</label><input type="text" id="cal-era" placeholder="DR" class="form-input"></div>
        </div>
      </section>

      <section class="settings-section-card">
        <div class="cal-months-header">
          <h3>📝 Months <span class="cal-month-count" id="cal-month-count">(12)</span></h3>
          <div class="cal-months-controls">
            <button class="btn-secondary btn-sm" id="cal-remove-month" title="Remove last month">−</button>
            <button class="btn-secondary btn-sm" id="cal-add-month" title="Add a month">+</button>
          </div>
        </div>
        <div class="cal-month-list" id="cal-month-list"></div>
      </section>

      <div class="settings-actions"><button class="btn-primary" id="cal-save">💾 Save Calendar</button></div>
    </div>`;function t(a,n,d){const l=e.querySelector("#cal-month-list");if(!l)return;for(;n.length<a;)n.push("Month "+(n.length+1));for(;d.length<a;)d.push(30);const i=[];for(let r=0;r<a;r++)i.push(`
              <div class="cal-month-row">
                <span class="cal-month-number">${r+1}</span>
                <input type="text" class="form-input cal-month-name" data-month-idx="${r}"
                       value="${(n[r]||"").replace(/"/g,"&quot;")}"
                       placeholder="Month ${r+1}">
                <input type="number" class="form-input cal-month-days" data-month-idx="${r}"
                       value="${d[r]||30}" min="1" max="100"
                       title="Days in this month" style="width:65px;text-align:center;">
                <span class="cal-days-label">days</span>
              </div>`);l.innerHTML=i.join("");_mpy=a;const ct=e.querySelector("#cal-month-count");if(ct)ct.textContent=`(${a})`;const mi=e.querySelector("#cal-month");if(mi)mi.max=a}function s(){const a=e.querySelectorAll(".cal-month-name");return Array.from(a).map(n=>n.value.trim()||`Month ${parseInt(n.dataset.monthIdx)+1}`)}function gd(){const a=e.querySelectorAll(".cal-month-days");return Array.from(a).map(n=>Math.max(1,parseInt(n.value)||30))}e.querySelector("#cal-add-month").addEventListener("click",()=>{if(_mpy>=20)return;const n=s(),d=gd();t(_mpy+1,n,d)});e.querySelector("#cal-remove-month").addEventListener("click",()=>{if(_mpy<=1)return;const n=s(),d=gd();n.pop();d.pop();t(_mpy-1,n,d)});ml(e,t),e.querySelector("#cal-save").addEventListener("click",()=>vl(e,s,gd,_mpy))}async function ml(e,t){try{const a=(await Et()).calendar;if(!a)return;e.querySelector("#cal-display").textContent=ot(a),e.querySelector("#cal-day").value=a.current_day||1,e.querySelector("#cal-month").value=a.current_month||1,e.querySelector("#cal-year").value=a.current_year||1490,e.querySelector("#cal-era").value=a.era_name||"DR";const n=a.months_per_year||12;const l=Array.isArray(a.month_names)?a.month_names:As.slice();let da;if(Array.isArray(a.days_per_month)){da=a.days_per_month}else{const dv=parseInt(a.days_per_month)||30;da=Array(n).fill(dv)}t(n,l,da),ee({calendar:a})}catch(s){console.error("Calendar load error:",s),t(12,As.slice(),Array(12).fill(30))}}async function vl(e,t,gd,mpy){try{const s=t(),md=gd(),a={current_day:parseInt(e.querySelector("#cal-day").value)||1,current_month:parseInt(e.querySelector("#cal-month").value)||1,current_year:parseInt(e.querySelector("#cal-year").value)||1490,era_name:e.querySelector("#cal-era").value||"DR",months_per_year:mpy,days_per_month:md,month_names:s};await on(a),ee({calendar:a}),e.querySelector("#cal-display").textContent=ot(a),ye("Calendar saved!","success")}catch(s){ye("Save failed: "+s.message,"error")}}function hl(e){const t=Z();if(!t.currentTownId){e.innerHTML=`
      <div class="view-simulation">
        <header class="view-header"><h1>⏩ AI Simulation</h1></header>
        <div class="dash-card" style="margin-top:1rem; text-align:center; padding:2rem;">
          <h2 style="color:var(--text-muted)">🏰 No Town Selected</h2>
          <p>Select a town from the <a href="/dev/dashboard">Dashboard</a> first.</p>
        </div>
      </div>`;return}e.innerHTML=`
    <div class="view-simulation">
      <header class="view-header">
        <h1>⏩ AI Simulation</h1>
        <button class="btn-secondary btn-sm" id="sim-back-btn">← Back to Town</button>
      </header>

      <div class="sim-town-info" id="sim-town-info">
        <span class="sim-town-name">Loading...</span>
      </div>

      <!-- Config Panel -->
      <div class="sim-config" id="sim-config">
        <div class="sim-config-row">
          <div class="sim-field">
            <label>⏱️ Months to Simulate</label>
            <div class="sim-months-group" id="sim-months-group">
              <span style="color:var(--text-muted);font-size:0.8rem;">Loading...</span>
            </div>
          </div>
          <div class="sim-field">
            <label>👥 Intake (Force Arrivals)</label>
            <div style="display:flex;align-items:center;gap:0.5rem;">
              <input type="number" id="sim-intake-count" class="form-input" min="0" max="50" value="0" style="width:70px;text-align:center;" title="Number of people to force move in (0 = natural only)">
              <span style="font-size:0.75rem;color:var(--text-muted)">0 = natural arrivals only</span>
            </div>
          </div>
        </div>



        <div class="sim-field">
          <label>📝 Additional Instructions</label>
          <textarea id="sim-instructions" class="form-input" rows="3"
            placeholder="Any specific instructions for this simulation...&#10;e.g., 'A traveling merchant caravan arrives' or 'Keep deaths low'"></textarea>
          <small class="settings-hint" style="margin-top:0.25rem;display:block;">📜 Campaign description & house rules are loaded automatically from <a href="/dev/settings" style="color:var(--accent)">⚙️ Settings</a>.</small>
        </div>

        <div class="sim-actions">
          <button class="btn-primary" id="sim-run-btn">🎲 Run Simulation</button>
          <button class="btn-secondary btn-sm" id="sim-debug-btn">🔧 Debug LLM</button>
          <span class="sim-status" id="sim-status"></span>
        </div>
      </div>

      <!-- Progress -->
      <div class="sim-progress" id="sim-progress" style="display:none;">
        <div class="sim-progress-bar">
          <div class="sim-progress-fill" id="sim-progress-fill"></div>
        </div>
        <p class="sim-progress-text" id="sim-progress-text">Generating simulation...</p>
      </div>

      <!-- Results -->
      <div class="sim-results" id="sim-results" style="display:none;"></div>

      <!-- Debug Log -->
      <div class="sim-debug-log" id="sim-debug-log">
        <h3>📋 Debug Log <button class="btn-sm btn-secondary" id="sim-clear-log" style="margin-left:0.5rem;">Clear</button></h3>
        <div class="sim-log-entries" id="sim-log-entries"></div>
      </div>
    </div>
  `;let s=1,a=null;function n(o,c="info"){const d=e.querySelector("#sim-log-entries");if(!d)return;const u=new Date().toLocaleTimeString(),v={info:"var(--text-secondary)",success:"var(--success)",error:"var(--error)",warn:"var(--warning)"};d.innerHTML+=`<div style="color:${v[c]||v.info};font-size:0.8rem;padding:0.15rem 0;border-bottom:1px solid var(--border);font-family:monospace;"><span style="color:var(--text-muted)">[${u}]</span> ${o}</div>`,d.scrollTop=d.scrollHeight}e.querySelector("#sim-back-btn").addEventListener("click",()=>{ge(`town/${t.currentTownId}`)});function l(o){const c=e.querySelector("#sim-months-group");c&&(c.innerHTML=Array.from({length:o},(d,u)=>{const v=u+1;return`<button class="sim-month-btn${v===1?" active":""}" data-months="${v}">${v}</button>`}).join(""),c.querySelectorAll(".sim-month-btn").forEach(d=>{d.addEventListener("click",()=>{c.querySelectorAll(".sim-month-btn").forEach(u=>u.classList.remove("active")),d.classList.add("active"),s=parseInt(d.dataset.months)})}),s=1)}(async()=>{try{const c=(await Et()).calendar||{};l(parseInt(c.months_per_year)||12)}catch{l(12)}})(),e.querySelector("#sim-clear-log").addEventListener("click",()=>{e.querySelector("#sim-log-entries").innerHTML=""}),e.querySelector("#sim-debug-btn").addEventListener("click",async()=>{n("Testing OpenRouter connectivity...");try{const o=await Ln();n(`API Key Source: ${o.api_key_source||"N/A"}`,"info"),n(`API Key Set: ${o.api_key_set?"YES":"NO"}`,o.api_key_set?"success":"error"),n(`API Key Preview: ${o.api_key_preview||"(empty)"}`,"info"),n(`Model: ${o.model||"N/A"}`,"info"),n(`PHP: ${o.php_version}`,"info"),o.openrouter_http_code!==void 0&&(n(`OpenRouter HTTP: ${o.openrouter_http_code}`,o.openrouter_reachable?"success":"error"),o.total_models&&n(`OpenRouter Models Available: ${o.total_models}`,"success"),o.error_response&&n(`Error Response: ${o.error_response}`,"error")),o.curl_error&&n(`cURL Error: ${o.curl_error}`,"error"),n("Debug complete.","success")}catch(o){n(`Debug failed: ${o.message}`,"error")}}),i(e),n("Simulation view loaded. Town ID: "+t.currentTownId),e.querySelector("#sim-run-btn").addEventListener("click",()=>{r(e)});async function i(o){var c;try{const d=await dt(),v=(Array.isArray(d)?d:d.towns||[]).find(b=>b.id===t.currentTownId);v&&(o.querySelector("#sim-town-info").innerHTML=`
                    <span class="sim-town-name">🏰 ${v.name}</span>
                    <span class="sim-town-pop">👥 ${v.character_count||"?"} residents</span>
                `);let m="";try{const b=await Ft(),y=[];b.campaign_description&&y.push(b.campaign_description),b.rules_text&&y.push("House Rules: "+b.rules_text);const f=b.homebrew_settings||{},g=[],k={magic_level:{n:"MAGIC LEVEL",none:"None — mundane world, no magic.",low:"Low — Magic is rare, feared, or revered.",standard:"Standard — Per D&D rules.",high:"High — Magic is common, used daily.",wild:"Wild — Unpredictable surges, chaotic anomalies."},tech_level:{n:"TECHNOLOGY",primitive:"Primitive — stone age, tribal.",ancient:"Ancient — bronze/iron age.",medieval:"Medieval — standard D&D.",renaissance:"Renaissance — early firearms, printing.",magitech:"Magitech — magic-driven technology.",steampunk:"Steampunk — steam & clockwork machines."},tone:{n:"WORLD TONE",grimdark:"Grimdark — bleak, hopeless, morally grey.",dark_fantasy:"Dark Fantasy — dark but with hope.",standard:"Standard Fantasy — heroic adventure.",lighthearted:"Lighthearted — comedy, whimsy.",horror:"Horror — dread, terror, madness lurks everywhere.",intrigue:"Political Intrigue — schemes, betrayal, secrets.",mythic_saga:"Mythic Saga — epic legends, fate-driven."},divine:{n:"DIVINE INVOLVEMENT",absent:"Absent — gods are silent or nonexistent.",distant:"Distant — gods exist but rarely intervene.",active:"Active — gods grant power, send visions.",meddling:"Meddling — gods walk the earth, interfere directly."},planar:{n:"PLANAR ACTIVITY",sealed:"Sealed — no planar travel or influence.",rare:"Rare — occasional anomalies.",active:"Active — portals, extraplanar visitors.",chaotic:"Chaotic — planes bleed into the material world."},economy:{n:"ECONOMY",barter:"Barter — no currency, trade goods only.",poor:"Impoverished — scarcity, poverty.",standard:"Standard — coins, merchants, trade.",rich:"Prosperous — wealthy, abundant trade.",guild:"Guild-Controlled — guilds dominate trade."},law:{n:"LAW & ORDER",lawless:"Lawless — no organized law, might = right.",frontier:"Frontier Justice — informal, community-driven.",standard:"Standard — guards, courts, laws.",authoritarian:"Authoritarian — strict laws, harsh punishment.",theocracy:"Theocratic — religious law dominates."},monster_intelligence:{n:"MONSTER INTELLIGENCE",bestial:"Bestial — instinct-driven.",cunning:"Cunning — use tactics, set traps.",sentient:"Sentient — societies, politics, diplomacy."},power_level:{n:"POWER LEVEL",gritty:"Gritty — mortals, 1st-level, survival focus.",heroic:"Heroic — standard D&D adventurer scale.",mythic:"Mythic — demigods, epic-level."},ability_scores:{n:"ABILITY SCORES",standard_array:"Standard Array (15,14,13,12,10,8).",point_buy:"Point Buy (27 pts).",roll_4d6:"4d6 drop lowest.",roll_3d6:"3d6 straight (old school).",heroic:"Heroic Array (higher stats)."},leveling:{n:"LEVELING",xp:"XP-based.",milestone:"Milestone — level at story beats.",session:"Session-based.",slow:"Slow progression.",fast:"Fast progression."},multiclass:{n:"MULTICLASSING",forbidden:"Forbidden — no multiclassing allowed.",restricted:"Restricted — max 2 classes, prerequisites.",standard:"Standard — per D&D rules.",free:"Free — no prerequisites."},alignment:{n:"ALIGNMENT",strict:"Strict — mechanical consequences for alignment.",guideline:"Guideline — descriptive only.",dynamic:"Dynamic — shifts based on actions.",none:"No Alignment — removed entirely."},racial:{n:"RACIAL TRAITS",standard:"Standard — fixed racial bonuses.",flexible:"Flexible — choose where bonuses go.",custom_lineage:"Custom Lineage — any race, any bonus.",no_bonuses:"No Racial Bonuses."},feats:{n:"FEATS",none:"No Feats.",standard:"Standard — feats replace ASI.",bonus:"Bonus — feats + ASI both.",frequent:"Frequent — feat every odd level.",free_start:"Free Starting Feat at L1."},mortality:{n:"NPC MORTALITY",lethal:"Lethal — deaths are common.",impactful:"Impactful — deaths are meaningful.",rare:"Rare — plot armor protects most."},death:{n:"DEATH & RESURRECTION",permanent:"Permanent — dead is dead.",costly:"Costly — possible but rare/expensive.",available:"Available — clerics can raise dead.",impactful:"Deaths shape survivors' personalities."},healing:{n:"HEALING",fast:"Fast — recover quickly.",standard:"Standard.",slow:"Slow — no full recovery on long rest.",gritty:"Gritty Realism — short rest 8hr, long rest 1wk.",medicine:"Medicine Required — healer/supplies needed."},resting:{n:"RESTING",standard:"Standard (1hr short, 8hr long).",gritty:"Gritty (8hr short, 1wk long).",epic:"Epic Heroism (5min short, 1hr long).",safe_haven:"Safe Haven — long rest only in safe locations."},encumbrance:{n:"ENCUMBRANCE",none:"None — carry anything.",simple:"Simple (STR×15 lbs).",variant:"Variant — speed penalties.",slot:"Slot-Based (STR = slots).",strict:"Strict — every pound tracked."},disease:{n:"DISEASE",none:"None — disease doesn't exist.",rare:"Rare — occasional illness.",realistic:"Realistic — diseases spread, can kill.",rampant:"Rampant — plagues are common."},natural_hazards:{n:"NATURAL HAZARDS",mild:"Mild — good weather, safe terrain.",standard:"Standard — seasonal, normal.",harsh:"Harsh — extreme weather, dangerous.",catastrophic:"Catastrophic — frequent disasters."},npc_depth:{n:"NPC DEPTH",simple:"Simple — basic roles.",standard:"Standard — distinct personalities.",deep:"Deep — complex motivations, secrets.",literary:"Literary — rich inner lives, character arcs."},romance:{n:"ROMANCE",none:"None — no romantic content.",subtle:"Subtle — implied, fade-to-black.",present:"Present — acknowledged, part of life.",focus:"Focus — relationships drive drama."},factions:{n:"FACTIONS",none:"None — no organized factions.",simple:"Simple — a few groups.",complex:"Complex — rival factions, shifting alliances.",dominant:"Dominant — factions control everything."},crafting:{n:"CRAFTING",none:"None.",simple:"Simple — basic item creation.",detailed:"Detailed — materials, time, skill checks.",central:"Central — crafting drives the economy."},magic_items:{n:"MAGIC ITEMS",nonexistent:"Nonexistent — no magic items.",very_rare:"Very Rare — legendary, world-shaking.",uncommon:"Uncommon — exist but hard to find.",available:"Available — can be bought.",abundant:"Abundant — magic shops everywhere."},undead:{n:"UNDEAD",nonexistent:"Nonexistent.",abomination:"Abomination — universally feared.",standard:"Standard — exists, dangerous.",commonplace:"Commonplace — undead labor, accepted by some.",dominant:"Dominant — undead rule or overrun areas."}};for(const[_,$]of Object.entries(f))$&&((c=k[_])!=null&&c[$])&&g.push(`${k[_].n}: ${k[_][$]}`);g.length&&y.push(`HOMEBREW WORLD RULES:
`+g.join(`
`)),m=y.join(`

`)}catch{}o._campaignRules=m}catch(d){console.error("Failed to load sim data:",d)}}async function r(o){var $;const c=t.currentTownId,d=o.querySelector("#sim-instructions").value.trim(),u=o._campaignRules||"",v=o.querySelector("#sim-run-btn"),m=o.querySelector("#sim-status"),b=o.querySelector("#sim-progress"),y=o.querySelector("#sim-results");o.querySelector("#sim-config");let f=d,g=Math.max(0,Math.min(50,parseInt(($=o.querySelector("#sim-intake-count"))==null?void 0:$.value)||0));n(`--- Starting simulation: ${s} month(s), town ID ${c} ---`),n(`Instructions: ${f||"(none)"}`),n(`Rules length: ${u.length} chars`),n(`Forced intake: ${g>0?g+" new arrivals":"none (natural only)"}`),v.disabled=!0,v.textContent="⏳ Running...",m.textContent="",y.style.display="none",b.style.display="block";const k=o.querySelector("#sim-progress-fill"),_=o.querySelector("#sim-progress-text");k.style.width="5%";try{if(s<=1){_.textContent=s===0?"AI is generating new characters (intake mode)...":"AI is simulating 1 month of town life...";let L=10;const w=setInterval(()=>{L<85&&(L+=Math.random()*3,k.style.width=`${L}%`)},1e3);n("Calling apiRunSimulation (single)...","info");const A=await wt(c,s,u,f,g);if(clearInterval(w),k.style.width="100%",_.textContent="Simulation complete!",n("✅ Simulation completed successfully!","success"),A.simulation){const M=A.simulation.changes||{};n(`New chars: ${(M.new_characters||[]).length}, Deaths: ${(M.deaths||[]).length}, XP: ${(M.xp_gains||[]).length}`,"info")}setTimeout(()=>{b.style.display="none"},1e3),a=A,p(o,A)}else{n(`Running ${s} months month-by-month...`,"info");const L={summary:"",events:[],changes:{new_characters:[],deaths:[],new_relationships:[],xp_gains:[],stat_changes:[],role_changes:[],building_changes:[],levelup_details:[]},new_history_entry:{heading:"",content:""}},w=[],A=1,M=s;for(let h=0;h<M;h++){const q=h*A+1,F=Math.min((h+1)*A,s),D=F-q+1,J=Math.round((h+1)/M*90)+5;k.style.width=`${J}%`,_.textContent=`Simulating months ${q}-${F} of ${s}... (batch ${h+1}/${M})`,n(`Batch ${h+1}/${M}: months ${q}-${F} (${D} months)...`,"info");const Y=h===0?g:0,S=h===0?f:"";try{const O=(await wt(c,D,u,S,Y)).simulation||{},V=O.changes||{};O.summary&&w.push(`**Months ${q}-${F}:** ${O.summary}`),(O.events||[]).forEach(Q=>{if(typeof Q=="string")L.events.push({month:q,description:Q});else{const se=(Q.month||1)+q-1;L.events.push({...Q,month:se})}}),["new_characters","deaths","new_relationships","xp_gains","stat_changes","role_changes","building_changes"].forEach(Q=>{Array.isArray(V[Q])&&L.changes[Q].push(...V[Q])}),O.new_history_entry&&O.new_history_entry.content&&(L.new_history_entry.content+=`

**Months ${q}-${F}:**
${O.new_history_entry.content}`);try{const Q=await Ve(c,V,O.new_history_entry||null,D);n(`  Applied batch ${h+1} changes`,"success");const se=Q.applied||{};se.levelup_details&&se.levelup_details.length&&(L.changes.levelup_details.push(...se.levelup_details),n(`  ⬆️ ${se.levelup_details.length} level-up(s) this batch`,"info"))}catch(Q){n(`  Warning: Could not apply batch ${h+1}: ${Q.message}`,"warn")}n(`  Batch ${h+1}: ${(V.new_characters||[]).length} arrivals, ${(V.deaths||[]).length} deaths, ${(V.building_changes||[]).length} builds`,"info")}catch(H){n(`  ❌ Batch ${h+1} (months ${q}-${F}) failed: ${H.message}`,"error")}}L.summary=w.join(`

`),L.new_history_entry.heading=`Months 1-${s}: Simulation`,L.new_history_entry.content||(L.new_history_entry.content=L.summary),k.style.width="100%",_.textContent=`All ${s} months complete!`,n(`✅ All ${s} months completed! (${M} API calls)`,"success"),setTimeout(()=>{b.style.display="none"},1e3),a={ok:!0,simulation:L,town_id:c,months:s,already_applied:!0},p(o,a)}}catch(L){b.style.display="none",n(`❌ ERROR: ${L.message}`,"error"),m.innerHTML=`<span style="color:var(--error);word-break:break-all;">❌ ${L.message}</span>`}finally{v.disabled=!1,v.textContent="🎲 Run Simulation"}}function p(o,c){var J,Y;const d=c.simulation||{},u=d.changes||{},v=o.querySelector("#sim-results"),m=S=>{const H=((S.field||"")+(S.reason||"")+(S.description||"")).toLowerCase();return H.includes("aged")||H.includes("age ")||H.includes("birthday")||S.field&&S.field.toLowerCase()==="age"},b=(u.stat_changes||[]).filter(S=>!m(S)),y=(d.events||[]).filter(S=>{const H=typeof S=="string"?S:S.description||"";return!/\baged\b|\bbirthday\b|\bturns?\s+\d+\b/i.test(H)}),f=u.new_characters||[],g=u.deaths||[],k=u.new_relationships||[],_=u.xp_gains||[],$=u.role_changes||[],L=u.building_changes||[],w=[],A=[];if(d.summary&&A.push(`<p class="sim-summary-text">${d.summary}</p>`),y.length&&A.push(`<div class="sim-events-list">
        ${y.map(S=>typeof S=="string"?`<div class="sim-event-card"><span class="sim-event-dot"></span>${S}</div>`:`<div class="sim-event-card"><span class="sim-event-month">Month ${S.month}</span>${S.description}</div>`).join("")}
      </div>`),A.length&&w.push(["summary","📖","Summary",y.length,A.join("")]),f.length){const S=f.filter(O=>(O.reason||"").toLowerCase().includes("born")||(O.reason||"").toLowerCase().includes("birth")),H=f.filter(O=>!S.includes(O));H.length&&w.push(["arrivals","👥","Arrivals",H.length,`<div class="sim-change-list">${H.map(O=>`
            <div class="sim-change-item sim-change-add">
              <strong>${O.name}</strong> — ${O.race} ${O.class}
              ${O.reason?`<span class="sim-reason">${O.reason}</span>`:""}
            </div>`).join("")}</div>`]),S.length&&w.push(["births","🍼","Births",S.length,`<div class="sim-change-list">${S.map(O=>`
            <div class="sim-change-item sim-change-add">
              <strong>${O.name}</strong> — ${O.race} ${O.class}
              ${O.reason?`<span class="sim-reason">${O.reason}</span>`:""}
            </div>`).join("")}</div>`])}g.length&&w.push(["deaths","💀","Deaths",g.length,`<div class="sim-change-list">${g.map(S=>`
          <div class="sim-change-item sim-change-death">
            <strong>${S.name}</strong>
            ${S.reason?`<span class="sim-reason">${S.reason}</span>`:""}
          </div>`).join("")}</div>`]),k.length&&w.push(["social","💕","Social",k.length,`<div class="sim-change-list">${k.map(S=>`
          <div class="sim-change-item sim-change-social">
            <strong>${S.char1}</strong> <span class="sim-rel-arrow">↔</span> <strong>${S.char2}</strong>
            <span class="sim-rel-type">${S.type}</span>
            ${S.reason?`<span class="sim-reason">${S.reason}</span>`:""}
          </div>`).join("")}</div>`]);const M=[];if(_.length&&M.push(`<h4 class="sim-sub-heading">✨ XP Gains <span class="sim-badge">${_.length}</span></h4>
        <div class="sim-change-list">${_.map(S=>`
          <div class="sim-change-item sim-change-xp">
            <strong>${S.name}</strong> <span class="sim-xp-val">+${S.xp_gained} XP</span>
            ${S.reason?`<span class="sim-reason">${S.reason}</span>`:""}
          </div>`).join("")}</div>`),b.length&&M.push(`<h4 class="sim-sub-heading">📊 Stat Changes <span class="sim-badge">${b.length}</span></h4>
        <div class="sim-change-list">${b.map(S=>`
          <div class="sim-change-item">
            <strong>${S.name}</strong> <span class="sim-stat-field">${S.field}:</span>
            <span class="sim-stat-old">${S.old_value}</span> → <span class="sim-stat-new">${S.new_value}</span>
            ${S.reason?`<span class="sim-reason">${S.reason}</span>`:""}
          </div>`).join("")}</div>`),M.length&&w.push(["progression","📈","Progression",_.length+b.length,M.join("")]),$.length&&w.push(["roles","🎭","Roles",$.length,`<div class="sim-change-list">${$.map(S=>`
          <div class="sim-change-item sim-change-role">
            <strong>${S.name}</strong>
            <span class="sim-role-old">${S.old_role}</span> → <span class="sim-role-new">${S.new_role}</span>
            ${S.reason?`<span class="sim-reason">${S.reason}</span>`:""}
          </div>`).join("")}</div>`]),L.length){const S={start:"🔨",progress:"🏗️",complete:"✅",damage:"⚠️",destroy:"💥"};w.push(["buildings","🏛️","Buildings",L.length,`<div class="sim-change-list">${L.map(H=>{const O=S[H.action]||"🏠";let V="";return H.action==="start"?V=`Construction begins (${H.build_time||"?"} months)`:H.action==="progress"?V="Work continues this month":H.action==="complete"?V="Construction complete!":H.action==="damage"?V="Building damaged":H.action==="destroy"&&(V="Building destroyed"),`
            <div class="sim-change-item sim-change-building">
              <span class="sim-building-icon">${O}</span>
              <strong>${H.name}</strong>
              <span class="sim-building-action">${V}</span>
              ${H.description?`<span class="sim-reason">${H.description}</span>`:""}
            </div>`}).join("")}</div>`])}const h=u.levelup_details||[];h.length&&w.push(["levelups","⬆️","Level Ups",h.length,`<div class="sim-change-list">${h.map(S=>{var H,O;return`
          <div class="sim-change-item sim-change-xp">
            <strong>${S.name}</strong>
            <span class="sim-stat-field">${S.class||""}:</span>
            <span class="sim-stat-old">Lv ${S.old_level}</span> → <span class="sim-stat-new">Lv ${S.new_level}</span>
            <span class="sim-reason">XP: ${((O=(H=S.xp)==null?void 0:H.toLocaleString)==null?void 0:O.call(H))||S.xp||"?"}</span>
          </div>`}).join("")}</div>`]);const q=w.map((S,H)=>`<button class="sim-res-tab${H===0?" active":""}" data-sim-tab="${S[0]}">
        ${S[1]} ${S[2]} ${S[3]>0?`<span class="sim-tab-badge">${S[3]}</span>`:""}
      </button>`).join(""),F=w.map((S,H)=>`<div class="sim-res-panel${H===0?" active":""}" data-sim-panel="${S[0]}">${S[4]}</div>`).join(""),D=c.already_applied===!0;v.innerHTML=`
      <h2 class="sim-results-title">🎲 Simulation Results${c.months>1?` (${c.months} months)`:""}</h2>
      <div class="sim-res-tabs">${q}</div>
      <div class="sim-res-panels">${F}</div>
      <div class="sim-apply-actions">
        ${D?`<button class="btn-primary" id="sim-apply-btn" disabled style="background:var(--success);cursor:default;">✅ All ${c.months} Months Applied</button>
             <button class="btn-secondary btn-sm" id="sim-goto-town-btn">🏰 Go to Town View</button>`:`<button class="btn-primary" id="sim-apply-btn">✅ Apply All Changes</button>
             <button class="btn-danger" id="sim-reject-btn">❌ Reject & Discard</button>`}
      </div>
    `,v.style.display="block",v.querySelectorAll(".sim-res-tab").forEach(S=>{S.addEventListener("click",()=>{var H;v.querySelectorAll(".sim-res-tab").forEach(O=>O.classList.remove("active")),v.querySelectorAll(".sim-res-panel").forEach(O=>O.classList.remove("active")),S.classList.add("active"),(H=v.querySelector(`.sim-res-panel[data-sim-panel="${S.dataset.simTab}"]`))==null||H.classList.add("active")})}),v.scrollIntoView({behavior:"smooth"}),(J=v.querySelector("#sim-goto-town-btn"))==null||J.addEventListener("click",()=>{ge("town/"+t.currentTownId)}),D?(async()=>{try{const H=((await Ee(t.currentTownId)).characters||[]).map(Me);t.currentTown&&(t.currentTown.characters=H),ee({selectedCharId:null})}catch{}})():(v.querySelector("#sim-apply-btn").addEventListener("click",async()=>{var H;const S=v.querySelector("#sim-apply-btn");S.disabled=!0,S.textContent="⏳ Applying...",n("Applying simulation changes...","info");try{const O=await Ve(t.currentTownId,u,d.new_history_entry||null,s);O.debug_info&&console.log("Apply debug_info:",O.debug_info);const V=O.applied||{},Q=[];V.new_characters&&Q.push(`${V.new_characters} characters added`),V.deaths&&Q.push(`${V.deaths} deaths`),V.relationships&&Q.push(`${V.relationships} relationships`),V.xp&&Q.push(`${V.xp} XP updates`),V.stats&&Q.push(`${V.stats} stat changes`),V.roles&&Q.push(`${V.roles} role changes`),V.buildings&&Q.push(`${V.buildings} building changes`),V.auto_levelups&&Q.push(`${V.auto_levelups} auto level-ups`),V.history&&Q.push("history updated");if(V.deaths_failed&&V.deaths_failed.length){V.deaths_failed.forEach(df=>n(`  ⚠️ Death not applied: ${df}`,"warn"));const aiDeaths=(u.deaths||[]).length;n(`  ⚠️ ${V.deaths}/${aiDeaths} deaths actually matched characters in the DB`,"warn")}const se=V.levelup_details||[];if(se.length){se.forEach(pe=>n(`  ⬆️ ${pe.name} (${pe.class||"?"}): Lv ${pe.old_level} → ${pe.new_level}`,"success"));const de=v.querySelector(".sim-res-tabs"),Le=v.querySelector(".sim-res-panels");if(de&&Le){const pe=document.createElement("button");pe.className="sim-res-tab",pe.dataset.simTab="levelups",pe.innerHTML=`⬆️ Level Ups <span class="sim-tab-badge">${se.length}</span>`,de.appendChild(pe);const be=document.createElement("div");be.className="sim-res-panel",be.dataset.simPanel="levelups",be.innerHTML=`<div class="sim-change-list">${se.map(Se=>{var $e,I;return`
                <div class="sim-change-item sim-change-xp">
                  <strong>${Se.name}</strong>
                  <span class="sim-stat-field">${Se.class||""}:</span>
                  <span class="sim-stat-old">Lv ${Se.old_level}</span> → <span class="sim-stat-new">Lv ${Se.new_level}</span>
                  <span class="sim-reason">XP: ${((I=($e=Se.xp)==null?void 0:$e.toLocaleString)==null?void 0:I.call($e))||Se.xp||"?"}</span>
                </div>`}).join("")}</div>`,Le.appendChild(be),pe.addEventListener("click",()=>{v.querySelectorAll(".sim-res-tab").forEach(Se=>Se.classList.remove("active")),v.querySelectorAll(".sim-res-panel").forEach(Se=>Se.classList.remove("active")),pe.classList.add("active"),be.classList.add("active")})}}const we=Q.length?Q.join(", "):"No changes applied";n(`✅ Applied: ${we}`,"success"),S.textContent="✅ Applied!",S.style.background="var(--success)";try{const Le=((await Ee(t.currentTownId)).characters||[]).map(Me);t.currentTown&&(t.currentTown.characters=Le),ee({selectedCharId:null}),n(`Refreshed town data: ${Le.length} total characters now`,"success")}catch(de){n(`Warning: Could not refresh town data: ${de.message}`,"warn")}const fe=o.querySelector("#sim-status");fe.innerHTML=`<span style="color:var(--success)">✅ ${we}</span><br>
            <button class="btn-secondary btn-sm" id="sim-goto-town" style="margin-top:0.5rem;">🏰 Go to Town View</button>`,(H=o.querySelector("#sim-goto-town"))==null||H.addEventListener("click",()=>{ge("town/"+t.currentTownId)})}catch(O){n(`❌ Apply failed: ${O.message}`,"error"),S.disabled=!1,S.textContent="✅ Apply All Changes",o.querySelector("#sim-status").textContent=`❌ ${O.message}`,o.querySelector("#sim-status").style.color="var(--error)"}}),(Y=v.querySelector("#sim-reject-btn"))==null||Y.addEventListener("click",()=>{v.style.display="none",a=null,o.querySelector("#sim-status").textContent="🗑️ Results discarded.",o.querySelector("#sim-status").style.color="var(--text-muted)"}))}}const Ms=6;function gl(e){e.innerHTML=`
    <div class="view-simulation">
      <header class="view-header">
        <h1>🌍 World Simulate</h1>
        <div class="view-header-right">
          <button class="btn-secondary btn-sm" id="ws-back-btn">← Dashboard</button>
        </div>
      </header>

      <div class="dash-card" style="margin-bottom:1rem;padding:1rem;">
        <p style="color:var(--text-secondary);margin:0;">
          Run a simulation across <strong>every town</strong> in your campaign.
          Each town will be simulated sequentially, and characters may move between towns.
        </p>
      </div>

      <!-- Config -->
      <div class="sim-config" id="ws-config">
        <div class="sim-config-row">
          <div class="sim-field">
            <label>⏱️ Months to Simulate (per town)</label>
            <div class="sim-months-group" id="ws-months-group"></div>
          </div>
          <div class="sim-field">
            <label>👥 Intake (Force Arrivals per town)</label>
            <div style="display:flex;align-items:center;gap:0.5rem;">
              <input type="number" id="ws-intake-count" class="form-input" min="0" max="50" value="0" style="width:70px;text-align:center;" title="Number of people to force into EACH town (0 = natural only)">
              <span style="font-size:0.75rem;color:var(--text-muted)">0 = natural only</span>
            </div>
          </div>
        </div>
        <div class="sim-field">
          <label>📝 World-wide Instructions</label>
          <textarea id="ws-instructions" class="form-input" rows="3"
            placeholder="Instructions that apply to ALL towns...&#10;e.g., 'A harsh winter hits the land' or 'Trade routes are disrupted'"></textarea>
          <small class="settings-hint" style="margin-top:0.25rem;display:block;">📜 Campaign rules are loaded automatically from <a href="#/settings" style="color:var(--accent)">⚙️ Settings</a>.</small>
        </div>
        <div class="sim-actions">
          <button class="btn-primary" id="ws-run-btn">🌍 Run World Simulation</button>
          <span class="sim-status" id="ws-status"></span>
        </div>
      </div>

      <!-- Town List -->
      <div id="ws-town-list" style="margin-top:1rem;"></div>

      <!-- Progress -->
      <div class="sim-progress" id="ws-progress" style="display:none;">
        <div class="sim-progress-bar">
          <div class="sim-progress-fill" id="ws-progress-fill"></div>
        </div>
        <p class="sim-progress-text" id="ws-progress-text">Preparing world simulation...</p>
      </div>

      <!-- Results -->
      <div id="ws-results" style="display:none;"></div>
    </div>
  `;let t=1;e.querySelector("#ws-back-btn").addEventListener("click",()=>ge("dashboard")),s(e);async function s(l){var i;try{const[r,p,o]=await Promise.all([dt(),Et().catch(()=>null),Ft().catch(()=>({}))]),c=Array.isArray(r)?r:r.towns||[],d=l.querySelector("#ws-months-group"),u=p==null?void 0:p.calendar,v=(u==null?void 0:u.months)||[];let m="";for(let g=1;g<=12;g++){const k=v[g-1]?` title="${v[g-1].name||v[g-1]}"`:"";m+=`<button class="sim-month-btn${g===1?" active":""}" data-months="${g}"${k}>${g}</button>`}d.innerHTML=m,d.querySelectorAll(".sim-month-btn").forEach(g=>{g.addEventListener("click",()=>{d.querySelectorAll(".sim-month-btn").forEach(k=>k.classList.remove("active")),g.classList.add("active"),t=parseInt(g.dataset.months)||1})});const b=l.querySelector("#ws-town-list");if(c.length===0){b.innerHTML=`<div class="dash-card" style="text-align:center;padding:2rem;">
          <h3 style="color:var(--text-muted)">No Towns</h3>
          <p>Create towns from the <a href="/dev/dashboard">Dashboard</a> first.</p>
        </div>`;return}const y=c.map(g=>Ee(g.id).catch(()=>({characters:[]}))),f=await Promise.all(y);b.innerHTML=`
        <div class="dash-card" style="padding:1rem;">
          <h3 style="margin-bottom:0.75rem;">🏰 Towns to Simulate</h3>
          <div style="margin-bottom:0.5rem;">
            <label style="cursor:pointer;font-size:0.8rem;">
              <input type="checkbox" id="ws-select-all" checked> Select All
            </label>
          </div>
          <div class="ws-town-grid">
            ${c.map((g,k)=>{var L;const $=(((L=f[k])==null?void 0:L.characters)||[]).filter(w=>(w.status||"Alive")!=="Deceased").length;return`
                <div class="ws-town-card" data-town-id="${g.id}">
                  <label class="ws-town-check">
                    <input type="checkbox" class="ws-town-cb" data-town-id="${g.id}" checked>
                    <div class="ws-town-info">
                      <span class="ws-town-name">${g.name}</span>
                      <span class="ws-town-pop">${$} residents</span>
                    </div>
                  </label>
                  <div class="ws-town-status" id="ws-status-${g.id}"></div>
                  <textarea class="form-input ws-town-instructions" data-town-id="${g.id}" rows="2"
                    placeholder="Instructions for ${g.name} only..."
                    style="margin-top:0.4rem;font-size:0.75rem;resize:vertical;min-height:2.4rem;"></textarea>
                </div>
              `}).join("")}
          </div>
        </div>
      `,(i=l.querySelector("#ws-select-all"))==null||i.addEventListener("change",g=>{l.querySelectorAll(".ws-town-cb").forEach(k=>{k.checked=g.target.checked})}),l.querySelector("#ws-run-btn").addEventListener("click",()=>{a(l,c,o,f,p)})}catch(r){l.querySelector("#ws-town-list").innerHTML=`<div class="dash-card" style="padding:1rem;color:var(--error);">Error loading data: ${r.message}</div>`}}async function a(l,i,r,p,o){var N,z,G,x,U,K,ae;const c=new Set;l.querySelectorAll(".ws-town-cb:checked").forEach(C=>{c.add(parseInt(C.dataset.townId))});const d=i.filter(C=>c.has(C.id));if(d.length===0){alert("Select at least one town to simulate.");return}const u=((z=(N=l.querySelector("#ws-instructions"))==null?void 0:N.value)==null?void 0:z.trim())||"",v=Math.max(0,Math.min(50,parseInt((G=l.querySelector("#ws-intake-count"))==null?void 0:G.value)||0)),m={};l.querySelectorAll(".ws-town-instructions").forEach(C=>{const T=parseInt(C.dataset.townId),W=C.value.trim();W&&(m[T]=W)}),i.map(C=>C.name.toLowerCase());function b(C){let T=[];if(u){const W=u.toLowerCase(),ie=i.filter(re=>W.includes(re.name.toLowerCase()));(ie.length===0||ie.some(re=>re.id===C.id))&&T.push(u)}return m[C.id]&&T.push(m[C.id]),T.join(`

`)}const y=l.querySelector("#ws-run-btn"),f=l.querySelector("#ws-progress"),g=l.querySelector("#ws-progress-fill"),k=l.querySelector("#ws-progress-text"),_=l.querySelector("#ws-results");y.disabled=!0,y.textContent="⏳ Simulating...",f.style.display="",_.style.display="none",_.innerHTML="";let $=document.createElement("div");$.className="sim-log-overlay",$.innerHTML=`
      <div class="sim-log-modal">
        <div class="sim-log-header">
          <h3>🌍 World Simulation Log</h3>
          <button class="sim-log-close" id="sim-log-close-btn" style="display:none;" title="Close">✕</button>
        </div>
        <div class="sim-log-body" id="sim-log-body"></div>
        <div class="sim-log-footer">
          <div class="sim-log-progress"><div class="sim-log-progress-fill" id="sim-log-fill" style="width:0%"></div></div>
          <span class="sim-log-percent" id="sim-log-pct">0%</span>
        </div>
      </div>
    `,document.body.appendChild($);const L=document.getElementById("sim-log-body"),w=document.getElementById("sim-log-fill"),A=document.getElementById("sim-log-pct"),M=document.getElementById("sim-log-close-btn");function h(C,T,W=""){const ie=document.createElement("div");ie.className="sim-log-entry"+(W?` ${W}`:""),ie.innerHTML=`<span class="sim-log-icon">${C}</span><span class="sim-log-text">${T}</span>`,L.appendChild(ie),L.scrollTop=L.scrollHeight}function q(C){w.style.width=`${C}%`,A.textContent=`${Math.round(C)}%`}h("🚀",`Starting simulation: <strong>${d.length} town${d.length>1?"s":""}</strong> × <strong>${t} month${t>1?"s":""}</strong>`);const F=t*d.length+t;let D=0;const J=[],Y=[],S=[],H=[],O=[];let V=0;const Q=[],se={};d.forEach(C=>{se[C.id]={arrivals:0,births:0,deaths:0}});const we={};d.forEach(C=>{we[C.id]=[]});const fe={},de=o==null?void 0:o.calendar,Le=(de==null?void 0:de.month_names)||[],pe=((de==null?void 0:de.current_month)||1)-1;if(v>0)for(const C of d){const T=l.querySelector(`#ws-status-${C.id}`);try{k.textContent=`Intake: Adding ${v} characters to ${C.name}...`,T&&(T.innerHTML='<span style="color:var(--warning);">⏳ Intake...</span>'),h("👥",`Adding <strong>${v}</strong> characters to <strong>${C.name}</strong>...`);const W=await wt(C.id,0,r,b(C),v);if(W.simulation){const ie=W.simulation.changes||{};await Ve(C.id,ie,null,0);const re=(ie.new_characters||[]).map(le=>({...le,town:C.name,townId:C.id,month:0}));S.push(...re),se[C.id].arrivals+=re.length,T&&(T.innerHTML=`<span style="color:var(--success);">✅ +${re.length} intake</span>`),h("✅",`<strong>${C.name}</strong>: +${re.length} new residents`,"sim-log-success")}}catch(W){fe[C.id]=(fe[C.id]||"")+` Intake: ${W.message}`,T&&(T.innerHTML='<span style="color:var(--error);">❌ Intake failed</span>'),h("❌",`<strong>${C.name}</strong> intake failed: ${W.message}`,"sim-log-error")}await new Promise(W=>setTimeout(W,1500))}const be={};if(t>1)for(const C of d){const T=l.querySelector(`#ws-status-${C.id}`);try{k.textContent=`Planning ${C.name} (${t} months)...`,T&&(T.innerHTML='<span style="color:var(--warning);">📋 Planning...</span>'),h("📋",`Planning <strong>${C.name}</strong> (${t} months)...`);const W=await kn(C.id,t,r,b(C));W.plan&&(be[C.id]=W.plan,console.log(`[WorldSim] Plan for ${C.name}:`,JSON.stringify(W.plan).slice(0,800)),T&&(T.innerHTML='<span style="color:var(--success);">📋 Planned</span>'))}catch(W){console.warn(`[WorldSim] Planning failed for ${C.name}:`,W.message)}await new Promise(W=>setTimeout(W,1e3))}for(let C=1;C<=t;C++){for(const T of d){const W=l.querySelector(`#ws-status-${T.id}`);let ie=b(T);const re=be[T.id];if(re){const le=(re.plan||[]).find(he=>he.month===C),ue=(re.arrival_details||[]).filter(he=>he.month===C),_e=(re.death_details||[]).filter(he=>he.month===C);let oe=`[SIMULATION PLAN for month ${C}/${t}]
`;re.summary&&(oe+=`Overview: ${re.summary}
`),le&&(oe+=`This month's plan: ${le.events||"Normal activity"}
`,le.arrivals>0&&(oe+=`PLANNED ARRIVALS this month: ${le.arrivals} new character(s). You MUST generate ${le.arrivals} new_characters.
`),le.deaths>0&&(oe+=`PLANNED DEATHS this month: ${le.deaths}. You MUST add death(s) to the changes.
`),le.births>0&&(oe+=`PLANNED BIRTHS this month: ${le.births}.
`)),ue.length>0&&(oe+=`Arrival details: ${ue.map(he=>he.description).join("; ")}
`),_e.length>0&&(oe+=`Death details: ${_e.map(he=>`${he.name}: ${he.reason}`).join("; ")}
`),oe+=`[END PLAN]

`,ie=oe+ie}try{k.textContent=`Month ${C}/${t} — Simulating ${T.name}...`,g.style.width=`${D/F*100}%`,q(D/F*100),W&&(W.innerHTML=`<span style="color:var(--warning);">⏳ Month ${C}...</span>`),h("⏳",`Month <strong>${C}/${t}</strong> — Simulating <strong>${T.name}</strong>...`);const le=await wt(T.id,1,r,ie,0);if(le.simulation){console.log(`[WorldSim] ${T.name} Month ${C}:`,JSON.stringify(le.simulation).slice(0,500));const ue=le.simulation,_e=ue.changes||{},oe=_e.new_characters||ue.new_characters||[],he=_e.deaths||ue.deaths||[],Ie=_e.births||ue.births||[],ut=_e.events||ue.events||[];await Ve(T.id,_e,ue.new_history_entry||null,1).then(ve=>{var At,hs,gs;(At=ve==null?void 0:ve.applied)!=null&&At.auto_levelups&&(V+=ve.applied.auto_levelups,se[T.id].levelups=(se[T.id].levelups||0)+ve.applied.auto_levelups),(gs=(hs=ve==null?void 0:ve.applied)==null?void 0:hs.levelup_details)!=null&&gs.length&&Q.push(...ve.applied.levelup_details.map(Za=>({...Za,town:T.name,townId:T.id,month:C})));if(ve?.applied?.deaths_failed?.length){ve.applied.deaths_failed.forEach(df=>{h("⚠️",`<strong>${T.name}</strong>: Death not applied — ${df}`,"sim-log-error")})}});const Ce=Ie.map(ve=>({...ve,town:T.name,townId:T.id,month:C})),ms=he.map(ve=>({...ve,town:T.name,townId:T.id,month:C})),vs=oe.map(ve=>({...ve,town:T.name,townId:T.id,month:C})),Qa=ut.map(ve=>({...ve,town:T.name,townId:T.id,month:C}));if(J.push(...Ce),Y.push(...ms),S.push(...vs),H.push(...Qa),se[T.id].arrivals+=vs.length,se[T.id].births+=Ce.length,se[T.id].deaths+=ms.length,we[T.id].push(((x=le.simulation.new_history_entry)==null?void 0:x.content)||""),W){const ve=se[T.id],At=ve.levelups?` ⬆${ve.levelups}`:"";W.innerHTML=`<span style="color:var(--success);">✅ ${C}/${t}</span>
                <span style="font-size:0.7rem;color:var(--text-muted);margin-left:0.5rem;">
                  +${ve.arrivals} 👤  ${ve.births} 👶  ${ve.deaths} 💀${At}
                </span>`}}else W&&(W.innerHTML=`<span style="color:var(--error);">⚠️ Month ${C} no data</span>`),h("⚠️",`<strong>${T.name}</strong> month ${C}: No simulation data returned`)}catch(le){if((U=le.message)!=null&&U.includes("503")){W&&(W.innerHTML=`<span style="color:var(--warning);">🔄 Retrying M${C}...</span>`),await new Promise(ue=>setTimeout(ue,5e3));try{const ue=await wt(T.id,1,r,ie,0);if(ue.simulation){const _e=ue.simulation.changes||{};await Ve(T.id,_e,ue.simulation.new_history_entry||null,1);const oe=(_e.births||[]).map(Ce=>({...Ce,town:T.name,townId:T.id,month:C})),he=(_e.deaths||[]).map(Ce=>({...Ce,town:T.name,townId:T.id,month:C})),Ie=(_e.new_characters||[]).map(Ce=>({...Ce,town:T.name,townId:T.id,month:C})),ut=(_e.events||[]).map(Ce=>({...Ce,town:T.name,townId:T.id,month:C}));if(J.push(...oe),Y.push(...he),S.push(...Ie),H.push(...ut),se[T.id].arrivals+=Ie.length,se[T.id].births+=oe.length,se[T.id].deaths+=he.length,we[T.id].push(((K=ue.simulation.new_history_entry)==null?void 0:K.content)||""),W){const Ce=se[T.id];W.innerHTML=`<span style="color:var(--success);">✅ ${C}/${t}</span> <span style="font-size:0.7rem;color:var(--text-muted);margin-left:0.5rem;">+${Ce.arrivals} 👤  ${Ce.births} 👶  ${Ce.deaths} 💀</span>`}}}catch(ue){fe[T.id]=(fe[T.id]||"")+` Month ${C}: ${ue.message}`,W&&(W.innerHTML=`<span style="color:var(--error);">❌ M${C}: ${ue.message.slice(0,30)}</span>`)}}else fe[T.id]=(fe[T.id]||"")+` Month ${C}: ${le.message}`,W&&(W.innerHTML=`<span style="color:var(--error);">❌ M${C}: ${le.message.slice(0,30)}</span>`),h("❌",`<strong>${T.name}</strong> M${C}: ${le.message.slice(0,80)}`,"sim-log-error")}await new Promise(le=>setTimeout(le,1500)),D++}if(k.textContent=`Month ${C}/${t} — Checking movement...`,d.length>=2)try{const T=await Promise.all(d.map(W=>Ee(W.id).catch(()=>({characters:[]}))));for(let W=0;W<d.length;W++){const ie=d[W],re=(((ae=T[W])==null?void 0:ae.characters)||[]).filter(oe=>(oe.status||"Alive")==="Alive"),le=["mayor","chieftain","chief","lord","lady","captain of the guard","town leader"],ue=re.filter(oe=>parseInt(oe.months_in_town||0)>=Ms).filter(oe=>{const he=(oe.role||"").toLowerCase().trim();return!le.some(Ie=>he.includes(Ie))});if(ue.length===0)continue;const _e=ue.filter(()=>Math.random()<.2).slice(0,2);for(const oe of _e){const he=d.filter(ut=>ut.id!==ie.id),Ie=he[Math.floor(Math.random()*he.length)];try{await La(oe.id,ie.id,Ie.id),O.push({name:oe.name,class:oe.class,level:oe.level,fromTown:ie.name,fromTownId:ie.id,toTown:Ie.name,toTownId:Ie.id,monthsLived:parseInt(oe.months_in_town||0),month:C}),h("🚶",`<strong>${oe.name}</strong> moved from ${ie.name} → ${Ie.name}`)}catch{}}}}catch{}D++}const Se=d.map(C=>{const T=se[C.id],W=(we[C.id]||[]).map((re,le)=>({month:le+1,content:re||""})).filter(re=>re.content),ie=fe[C.id];return{town:C.name,townId:C.id,ok:!ie,births:T.births,deaths:T.deaths,arrivals:T.arrivals,events:H.filter(re=>re.townId===C.id).length,narrativeEntries:W,error:ie||""}});g.style.width="100%",k.textContent=`✅ World simulation complete! (${d.length} towns × ${t} months)`,y.disabled=!1,y.textContent="🌍 Run World Simulation",q(100);const $e=S.length,I=J.length,E=Y.length,j=H.length,B=O.length;h("🏁",`<strong>Simulation complete!</strong> Arrivals: ${$e} | Births: ${I} | Deaths: ${E} | Events: ${j} | Moves: ${B}`,"sim-log-success"),Object.keys(fe).length>0&&h("⚠️",`${Object.keys(fe).length} town(s) had errors — check results below.`),M.style.display="",M.addEventListener("click",()=>{$.remove()}),$.addEventListener("click",C=>{C.target===$&&$.remove()}),n(_,Se,t,J,Y,S,H,O,Le,pe,V,Q)}function n(l,i,r,p,o,c,d,u,v=[],m=0,b=0,y=[]){l.style.display="";const f=i.filter(h=>h.ok),g=i.filter(h=>!h.ok),k=p.length,_=o.length,$=c.length,L=d.length;l.innerHTML=`
      <div class="dash-card" style="padding:1.5rem;margin-top:1rem;">
        <h2 style="color:var(--accent);margin-bottom:1rem;">🌍 World Simulation Summary — ${r} Month${r>1?"s":""}</h2>

        <div class="stats-cards" style="margin-bottom:1rem;">
          <div class="stat-card"><div class="stat-card-value">${f.length}</div><div class="stat-card-label">Towns</div></div>
          <div class="stat-card"><div class="stat-card-value">${$}</div><div class="stat-card-label">Arrivals</div></div>
          <div class="stat-card"><div class="stat-card-value">${k}</div><div class="stat-card-label">Births</div></div>
          <div class="stat-card stat-card-muted"><div class="stat-card-value">${_}</div><div class="stat-card-label">Deaths</div></div>
          <div class="stat-card"><div class="stat-card-value">${L}</div><div class="stat-card-label">Events</div></div>
          <div class="stat-card"><div class="stat-card-value">${u.length}</div><div class="stat-card-label">Moves</div></div>
          ${b>0?`<div class="stat-card" style="border-color:var(--success);"><div class="stat-card-value" style="color:var(--success);">${b}</div><div class="stat-card-label">⬆️ Level Ups</div></div>`:""}
        </div>

        ${g.length?`
          <div style="margin-bottom:1rem;padding:0.75rem;background:rgba(224,85,85,0.1);border-radius:8px;">
            <strong style="color:var(--error);">⚠️ ${g.length} town(s) failed:</strong>
            ${g.map(h=>`<div style="margin-top:0.25rem;font-size:0.8rem;">${h.town}: ${h.error}</div>`).join("")}
          </div>
        `:""}

        <!-- Tabs -->
        <div class="detail-tabs" id="ws-result-tabs">
          <button class="detail-tab active" data-tab="narratives">📖 Narratives</button>
          <button class="detail-tab" data-tab="arrivals">👤 Arrivals (${$})</button>
          <button class="detail-tab" data-tab="births">👶 Births (${k})</button>
          <button class="detail-tab" data-tab="deaths">💀 Deaths (${_})</button>
          <button class="detail-tab" data-tab="events">📜 Events (${L})</button>
          ${y.length?`<button class="detail-tab" data-tab="levelups">⬆️ Level Ups (${y.length})</button>`:""}
          <button class="detail-tab" data-tab="movement">🚶 Movement (${u.length})</button>
        </div>

        <!-- Tab Content: Narratives -->
        <div class="detail-tab-content active" id="ws-tab-narratives">
          <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem;">
            <label style="font-size:0.75rem;color:var(--text-muted);font-weight:600;">MONTH</label>
            <select class="form-input" id="ws-narrative-month-filter" style="width:auto;min-width:120px;">
              <option value="all">All Months</option>
              ${Array.from({length:r},(h,q)=>{const F=(m+q)%(v.length||12),D=v[F]||`Month ${q+1}`,J=typeof D=="object"?D.name:D;return`<option value="${q+1}">${J}</option>`}).join("")}
            </select>
          </div>
          <div id="ws-narrative-list"></div>
        </div>

        <!-- Tab Content: Arrivals -->
        <div class="detail-tab-content" id="ws-tab-arrivals">
          ${c.length?`
            <table class="srd-table srd-table-sm" style="margin-top:0.5rem;">
              <thead><tr><th>Name</th><th>Race</th><th>Class</th><th>Town</th></tr></thead>
              <tbody>
                ${c.map(h=>`<tr>
                  <td style="font-weight:600;">${h.name||"Unknown"}</td>
                  <td>${h.race||"—"}</td>
                  <td>${h.class||"—"}</td>
                  <td style="color:var(--accent);">${h.town}</td>
                </tr>`).join("")}
              </tbody>
            </table>
          `:'<p class="muted" style="padding:1rem;">No arrivals this period.</p>'}
        </div>

        <!-- Tab Content: Births -->
        <div class="detail-tab-content" id="ws-tab-births">
          ${p.length?`
            <table class="srd-table srd-table-sm" style="margin-top:0.5rem;">
              <thead><tr><th>Name</th><th>Parents</th><th>Town</th></tr></thead>
              <tbody>
                ${p.map(h=>`<tr>
                  <td style="font-weight:600;">${h.child_name||h.name||"Unknown"}</td>
                  <td>${h.parents||h.parent_names||"—"}</td>
                  <td style="color:var(--accent);">${h.town}</td>
                </tr>`).join("")}
              </tbody>
            </table>
          `:'<p class="muted" style="padding:1rem;">No births this period.</p>'}
        </div>

        <!-- Tab Content: Deaths -->
        <div class="detail-tab-content" id="ws-tab-deaths">
          ${o.length?`
            <table class="srd-table srd-table-sm" style="margin-top:0.5rem;">
              <thead><tr><th>Name</th><th>Cause</th><th>Town</th></tr></thead>
              <tbody>
                ${o.map(h=>`<tr>
                  <td style="font-weight:600;">${h.name||"Unknown"}</td>
                  <td>${h.cause||h.reason||"—"}</td>
                  <td style="color:var(--accent);">${h.town}</td>
                </tr>`).join("")}
              </tbody>
            </table>
          `:'<p class="muted" style="padding:1rem;">No deaths this period.</p>'}
        </div>

        <!-- Tab Content: Events -->
        <div class="detail-tab-content" id="ws-tab-events">
          ${d.length?d.map(h=>`
            <div class="ws-narrative-card">
              <div class="ws-narrative-header">
                <span style="font-weight:600;color:var(--text-primary);">${h.title||h.type||"Event"}</span>
                <span class="ws-narrative-stats">${h.town}</span>
              </div>
              ${h.description?`<div class="ws-narrative-body">${h.description}</div>`:""}
            </div>
          `).join(""):'<p class="muted" style="padding:1rem;">No events this period.</p>'}
        </div>

        <!-- Tab Content: Level Ups -->
        ${y.length?`
        <div class="detail-tab-content" id="ws-tab-levelups">
          <table class="srd-table srd-table-sm" style="margin-top:0.5rem;">
            <thead><tr><th>Name</th><th>Class</th><th>Level</th><th>XP</th><th>Town</th></tr></thead>
            <tbody>
              ${y.map(h=>{var q;return`<tr>
                <td style="font-weight:600;">${h.name}</td>
                <td>${h.class||"—"}</td>
                <td><span style="color:var(--text-muted);">${h.old_level}</span> → <span style="color:var(--success);font-weight:700;">${h.new_level}</span></td>
                <td style="color:var(--text-secondary);">${((q=h.xp)==null?void 0:q.toLocaleString())||"—"}</td>
                <td style="color:var(--accent);">${h.town}</td>
              </tr>`}).join("")}
            </tbody>
          </table>
        </div>
        `:""}

        <!-- Tab Content: Movement -->
        <div class="detail-tab-content" id="ws-tab-movement">
          ${u.length?`
            <table class="srd-table srd-table-sm" style="margin-top:0.5rem;">
              <thead><tr><th>Name</th><th>Class</th><th>From</th><th>To</th><th>Months Lived</th></tr></thead>
              <tbody>
                ${u.map(h=>`<tr>
                  <td style="font-weight:600;">${h.name}</td>
                  <td>${h.class} ${h.level}</td>
                  <td>${h.fromTown}</td>
                  <td style="color:var(--accent);">→ ${h.toTown}</td>
                  <td style="text-align:center;">${h.monthsLived}</td>
                </tr>`).join("")}
              </tbody>
            </table>
          `:`<p class="muted" style="padding:1rem;">No character movement this period. Characters must live in a town for at least ${Ms} months before they may relocate.</p>`}
        </div>
      </div>
    `,l.querySelectorAll(".detail-tab").forEach(h=>{h.addEventListener("click",()=>{var q;l.querySelectorAll(".detail-tab").forEach(F=>F.classList.remove("active")),l.querySelectorAll(".detail-tab-content").forEach(F=>F.classList.remove("active")),h.classList.add("active"),(q=l.querySelector(`#ws-tab-${h.dataset.tab}`))==null||q.classList.add("active")})});const w=l.querySelector("#ws-narrative-list"),A=l.querySelector("#ws-narrative-month-filter");function M(){const h=A.value;if(!f.length){w.innerHTML='<p class="muted" style="padding:1rem;">No results.</p>';return}let q="";for(const F of f){const D=h==="all"?F.narrativeEntries:F.narrativeEntries.filter(J=>String(J.month)===h);if(D.length!==0)for(const J of D){const Y=(m+J.month-1)%(v.length||12),S=v[Y]||`Month ${J.month}`,H=typeof S=="object"?S.name:S;q+=`
            <div class="ws-narrative-card">
              <div class="ws-narrative-header">
                <span class="ws-narrative-town" style="cursor:pointer;" data-town-id="${F.townId}">${F.town}</span>
                <span class="ws-narrative-stats">${H}</span>
              </div>
              <div class="ws-narrative-body">${J.content}</div>
            </div>
          `}}w.innerHTML=q||'<p class="muted" style="padding:1rem;">No narratives for this month.</p>',w.querySelectorAll("[data-town-id]").forEach(F=>{F.addEventListener("click",()=>{const D=parseInt(F.dataset.townId);ee({currentTownId:D}),ge("town/"+D)})})}M(),A.addEventListener("change",M),l.querySelectorAll("[data-town-id]").forEach(h=>{h.addEventListener("click",()=>{const q=parseInt(h.dataset.townId);ee({currentTownId:q}),ge("town/"+q)})})}}const fl="/api.php",qs={completed:{icon:"✅",label:"Completed",color:"var(--success)"},under_construction:{icon:"🏗️",label:"Building...",color:"var(--warning)"},planned:{icon:"📋",label:"Planned",color:"var(--text-muted)"},damaged:{icon:"⚠️",label:"Damaged",color:"#e05555"},destroyed:{icon:"💥",label:"Destroyed",color:"#888"}};async function bl(e){const t=localStorage.getItem("ws_token")||"";return(await(await fetch(`${fl}?action=get_buildings&town_id=${e}`,{headers:{Authorization:`Bearer ${t}`}})).json()).buildings||[]}function yl(e,t){const s=Z(),a=t.id?parseInt(t.id):s.currentTownId;if(!a){e.innerHTML='<div class="view-empty"><h2>No Town Selected</h2><p>Select a town from the <a href="#/dashboard">Dashboard</a> first.</p></div>';return}e.innerHTML=`
    <div class="view-town-stats">
      <header class="view-header">
        <h1>Town Statistics</h1>
        <div class="view-header-right">
          <button class="btn-secondary btn-sm" id="stats-back-btn">Back to Town</button>
        </div>
      </header>
      <div class="stats-loading">Loading town data...</div>
    </div>`,e.querySelector("#stats-back-btn").addEventListener("click",()=>{ge("town/"+a)}),wl(e,a)}async function wl(e,t){try{const[s,a,n,l]=await Promise.all([dt(),Ee(t),_a(t).catch(()=>({entries:[]})),bl(t)]),r=(Array.isArray(s)?s:s.towns||[]).find(o=>o.id===t)||{name:"Unknown"},p=(a.characters||[]).map(Me);Sl(e,r,p,l)}catch(s){const a=e.querySelector(".stats-loading");a&&(a.innerHTML='<span style="color:var(--error)">Failed to load: '+s.message+"</span>")}}function Sl(e,t,s,a){const n=s.filter(h=>h.status==="Alive"),l=s.filter(h=>h.status!=="Alive"),i=n.filter(h=>h.gender==="M"),r=n.filter(h=>h.gender==="F"),p={};n.forEach(h=>{p[h.race||"Unknown"]=(p[h.race||"Unknown"]||0)+1});const o=Object.entries(p).sort((h,q)=>q[1]-h[1]),c={};n.forEach(h=>{c[h.class||"Unknown"]=(c[h.class||"Unknown"]||0)+1});const d=Object.entries(c).sort((h,q)=>q[1]-h[1]),u={"Children (0-15)":0,"Young (16-25)":0,"Adult (26-45)":0,"Middle-Aged (46-65)":0,"Elder (66+)":0};n.forEach(h=>{const q=h.age||0;q<=15?u["Children (0-15)"]++:q<=25?u["Young (16-25)"]++:q<=45?u["Adult (26-45)"]++:q<=65?u["Middle-Aged (46-65)"]++:u["Elder (66+)"]++});const v={};n.forEach(h=>{v[h.role||"Unassigned"]=(v[h.role||"Unassigned"]||0)+1});const m=Object.entries(v).sort((h,q)=>q[1]-h[1]);let b=0;n.forEach(h=>{b+=parseInt(h.level)||0});const y=n.length?(b/n.length).toFixed(1):"0",f=n.filter(h=>h.spouse&&h.spouse!=="None"),g=a.filter(h=>h.status==="completed"),k=a.filter(h=>h.status==="under_construction"),_=a.filter(h=>!["completed","under_construction"].includes(h.status));function $(h,q,F,D){const J=F?(q/F*100).toFixed(1):0;return'<div class="stats-bar-row"><span class="stats-bar-label">'+h+'</span><div class="stats-bar-track"><div class="stats-bar-fill '+(D||"")+'" style="width:'+J+'%"></div></div><span class="stats-bar-value">'+q+" ("+J+"%)</span></div>"}function L(h){const q=qs[h.status]||qs.planned;let F="";if(h.status==="under_construction"){const D=h.build_time>0?Math.round(h.build_progress/h.build_time*100):0;F=`<div class="building-progress-wrap">
                <div class="building-progress-bar"><div class="building-progress-fill" style="width:${D}%"></div></div>
                <span class="building-progress-text">${h.build_progress}/${h.build_time} months (${D}%)</span>
            </div>`}return`<div class="stats-building-card building-status-${h.status}">
            <div class="stats-building-header">
                <span class="stats-building-name">${q.icon} ${h.name}</span>
                <span class="stats-building-status" style="color:${q.color}">${q.label}</span>
            </div>
            ${h.description?`<div class="building-desc">${h.description}</div>`:""}
            ${F}
        </div>`}const w=e.querySelector(".view-town-stats"),A=w.querySelector(".stats-loading");A&&A.remove();const M=document.createElement("div");M.className="stats-content",M.innerHTML='<div class="stats-banner"><h2>'+t.name+'</h2></div><div class="stats-cards"><div class="stat-card"><div class="stat-card-value">'+n.length+'</div><div class="stat-card-label">Living Residents</div></div><div class="stat-card stat-card-muted"><div class="stat-card-value">'+l.length+'</div><div class="stat-card-label">Deceased</div></div><div class="stat-card"><div class="stat-card-value">'+i.length+" / "+r.length+'</div><div class="stat-card-label">Male / Female</div></div><div class="stat-card"><div class="stat-card-value">'+y+'</div><div class="stat-card-label">Avg Level</div></div><div class="stat-card"><div class="stat-card-value">'+f.length+'</div><div class="stat-card-label">Married</div></div><div class="stat-card"><div class="stat-card-value">'+g.length+'</div><div class="stat-card-label">Buildings</div></div>'+(k.length?'<div class="stat-card stat-card-warn"><div class="stat-card-value">'+k.length+'</div><div class="stat-card-label">Under Construction</div></div>':"")+'</div><div class="stats-grid"><div class="stats-panel"><h3>Race Distribution</h3><div class="stats-bar-list">'+o.map(([h,q])=>$(h,q,n.length,"")).join("")+'</div></div><div class="stats-panel"><h3>Class Distribution</h3><div class="stats-bar-list">'+d.map(([h,q])=>$(h,q,n.length,"stats-bar-fill-class")).join("")+'</div></div><div class="stats-panel"><h3>Age Demographics</h3><div class="stats-bar-list">'+Object.entries(u).map(([h,q])=>$(h,q,n.length,"stats-bar-fill-age")).join("")+'</div></div><div class="stats-panel"><h3>Roles</h3><div class="stats-bar-list stats-bar-scrollable">'+m.map(([h,q])=>$(h,q,n.length,"stats-bar-fill-role")).join("")+'</div></div></div><div class="stats-buildings-section"><h3>🏛️ Buildings & Infrastructure ('+a.length+")</h3>"+(a.length?(k.length?'<h4 class="building-group-title">🏗️ Under Construction</h4><div class="stats-buildings-grid">'+k.map(L).join("")+"</div>":"")+(g.length?'<h4 class="building-group-title">✅ Completed</h4><div class="stats-buildings-grid">'+g.map(L).join("")+"</div>":"")+(_.length?'<h4 class="building-group-title">⚠️ Other</h4><div class="stats-buildings-grid">'+_.map(L).join("")+"</div>":""):`<div class="stats-empty">No buildings yet. Run simulations to develop the town's infrastructure over time.</div>`)+"</div>",w.appendChild(M)}function Ba(){return P("get_party")}function Fa(e){return P("add_party_member",{method:"POST",body:{character_id:e}})}function $l(e){return P("remove_party_member",{method:"POST",body:{character_id:e}})}function _l(){return P("get_encounters")}function kl(e,t=""){return P("create_encounter",{method:"POST",body:{name:e,description:t}})}function Oa(e){return P(`get_encounter&id=${e}`)}function Ll(e){return P("delete_encounter",{method:"POST",body:{encounter_id:e}})}function Mt(e,t){return P("update_encounter",{method:"POST",body:{encounter_id:e,...t}})}function Cl(e,t){return P("create_encounter_group",{method:"POST",body:{encounter_id:e,name:t}})}function El(e,t){return P("rename_encounter_group",{method:"POST",body:{group_id:e,name:t}})}function xl(e){return P("delete_encounter_group",{method:"POST",body:{group_id:e}})}function Is(e,t,s="enemy",a=null){return P("add_participant",{method:"POST",body:{encounter_id:e,character_id:t,side:s,group_id:a}})}function Tl(e){return P("remove_participant",{method:"POST",body:{participant_id:e}})}function nt(e,t){return P("update_participant",{method:"POST",body:{participant_id:e,...t}})}function Al(e){return Math.floor(Math.random()*e)+1}function Ml(e,t){const s=[];for(let a=0;a<e;a++)s.push(Al(t));return s}function Kt(e){const t=e.trim().toLowerCase(),s=t.match(/^(\d+)d(\d+)(?:k(\d+))?(?:\s*([+-])\s*(\d+))?$/);if(!s){const v=parseInt(t);if(!isNaN(v))return{rolls:[v],kept:[v],modifier:0,total:v,expression:t};throw new Error(`Invalid dice expression: "${e}"`)}const a=parseInt(s[1]),n=parseInt(s[2]),l=s[3]?parseInt(s[3]):a,i=s[4]||"+",r=s[5]?parseInt(s[5]):0,p=i==="-"?-r:r,o=Ml(a,n),d=[...o].sort((v,m)=>m-v).slice(0,l),u=d.reduce((v,m)=>v+m,0)+p;return{rolls:o,kept:d,modifier:p,total:u,expression:t}}function me(e){return e>=0?`+${e}`:`${e}`}const Lt={blinded:{name:"Blinded",category:"condition",effects:{ac:-2,attackRolls:-2,loseDexToAC:!0,movementHalved:!0},description:"Cannot see. -2 AC, loses Dex bonus to AC. -2 on most Str/Dex skill checks."},dazzled:{name:"Dazzled",category:"condition",effects:{attackRolls:-1,spotChecks:-1,searchChecks:-1},description:"-1 penalty on attack rolls, Search/Spot checks."},deafened:{name:"Deafened",category:"condition",effects:{initiative:-4,spellFailure:20},description:"-4 initiative. 20% arcane spell failure for verbal components."},entangled:{name:"Entangled",category:"condition",effects:{attackRolls:-2,dex:-4,movementHalved:!0},description:"-2 attack rolls, -4 Dex. Movement halved."},exhausted:{name:"Exhausted",category:"condition",effects:{str:-6,dex:-6,movementHalved:!0},description:"-6 to Str and Dex. Move at half speed. Cannot run or charge."},fatigued:{name:"Fatigued",category:"condition",effects:{str:-2,dex:-2},description:"-2 to Str and Dex. Cannot run or charge."},frightened:{name:"Frightened",category:"condition",effects:{attackRolls:-2,savingThrows:-2,skillChecks:-2,abilityChecks:-2,flees:!0},description:"-2 on attacks, saves, skills, ability checks. Must flee from source."},flatFooted:{name:"Flat-Footed",category:"condition",effects:{loseDexToAC:!0},description:"Loses Dex bonus to AC. Cannot make AoO."},grappled:{name:"Grappled",category:"condition",effects:{loseDexToAC:!0,attackRolls:-4},description:"Loses Dex to AC vs non-grapplers. -4 attacks vs non-grapplers."},invisible:{name:"Invisible",category:"buff",effects:{attackRolls:2},description:"+2 on attack rolls. Opponents flat-footed to you."},panicked:{name:"Panicked",category:"condition",effects:{attackRolls:-2,savingThrows:-2,flees:!0,dropsItems:!0},description:"-2 on saves. Must flee. Drops what is held."},paralyzed:{name:"Paralyzed",category:"condition",effects:{str:-999,dex:-999,helpless:!0},description:"Helpless. Cannot move or act. Effective Str and Dex of 0."},prone:{name:"Prone",category:"condition",effects:{meleeAttackRolls:-4,acVsMelee:-4,acVsRanged:4},description:"-4 melee attacks. -4 AC vs melee. +4 AC vs ranged."},shaken:{name:"Shaken",category:"condition",effects:{attackRolls:-2,savingThrows:-2,skillChecks:-2,abilityChecks:-2},description:"-2 on attacks, saves, skills, ability checks."},sickened:{name:"Sickened",category:"condition",effects:{attackRolls:-2,weaponDamage:-2,savingThrows:-2,skillChecks:-2,abilityChecks:-2},description:"-2 on attacks, damage, saves, skills, ability checks."},stunned:{name:"Stunned",category:"condition",effects:{loseDexToAC:!0,ac:-2,dropsItems:!0},description:"Drops held items. Cannot act. -2 AC. Loses Dex to AC."},nauseated:{name:"Nauseated",category:"condition",effects:{canOnlyMove:!0},description:"Unable to attack, cast spells, or concentrate. Can only take a single move action."},confused:{name:"Confused",category:"condition",effects:{},description:"Acts randomly. Roll d% each round to determine behavior."},fascinated:{name:"Fascinated",category:"condition",effects:{spotChecks:-4,listenChecks:-4},description:"-4 on skill checks made reactively. Stands/sits quietly, taking no actions."},cowering:{name:"Cowering",category:"condition",effects:{loseDexToAC:!0,ac:-2},description:"Frozen in fear. Loses Dex to AC, -2 AC."},dazed:{name:"Dazed",category:"condition",effects:{},description:"Unable to act. No AC penalty."},energyDrained:{name:"Energy Drained",category:"condition",effects:{},description:"Negative levels. -1 per level on attacks, saves, skills, abilities, CL, effective level."},petrified:{name:"Petrified",category:"condition",effects:{helpless:!0},description:"Turned to stone. Effectively unconscious."}};function ql(){return Object.keys(Lt)}function Il(e,t){const s=t.id?parseInt(t.id):null;s?Rl(e,s):Dl(e)}function Dl(e){e.innerHTML=`
    <div class="encounter-view">
      <div class="view-header">
        <h1>⚔️ Encounters</h1>
        <div class="view-header-actions">
          <button class="btn-primary" id="enc-create-btn">+ New Encounter</button>
        </div>
      </div>
      <div id="enc-list" class="enc-list"><div class="loading-spinner">Loading encounters...</div></div>
    </div>
    `,ja(e),Pl(e)}async function ja(e){try{const t=await _l(),s=e.querySelector("#enc-list"),a=t.encounters||[];if(!a.length){s.innerHTML='<div class="empty-state"><p>No encounters yet. Create one to get started!</p></div>';return}s.innerHTML=a.map(n=>`
            <div class="enc-card" data-id="${n.id}">
                <div class="enc-card-header">
                    <span class="enc-card-status enc-status-${n.status}">${Ol(n.status)}</span>
                    <span class="enc-card-name">${n.name}</span>
                    <span class="enc-card-count">${n.participant_count||0} 👤</span>
                </div>
                ${n.description?`<div class="enc-card-desc">${n.description}</div>`:""}
                <div class="enc-card-footer">
                    <span class="text-muted">${jl(n.updated_at)}</span>
                    <div class="enc-card-actions">
                        <button class="btn-secondary btn-sm enc-open-btn" data-id="${n.id}">Open</button>
                        <button class="btn-danger btn-sm enc-delete-btn" data-id="${n.id}" title="Delete">🗑️</button>
                    </div>
                </div>
            </div>
        `).join("")}catch(t){e.querySelector("#enc-list").innerHTML=`<div class="error-state">Error: ${t.message}</div>`}}function Pl(e){e.querySelector("#enc-create-btn").addEventListener("click",async()=>{const t=prompt("Encounter name:");if(!t)return;const s=prompt("Description (optional):","")||"";try{const a=await kl(t,s);ge(`encounters/${a.id}`)}catch(a){alert("Error: "+a.message)}}),e.querySelector("#enc-list").addEventListener("click",async t=>{const s=t.target.closest(".enc-open-btn");if(s){ge(`encounters/${s.dataset.id}`);return}const a=t.target.closest(".enc-delete-btn");if(a){if(!confirm("Delete this encounter?"))return;try{await Ll(parseInt(a.dataset.id)),ja(e)}catch(l){alert("Error: "+l.message)}return}const n=t.target.closest(".enc-card");n&&!t.target.closest("button")&&ge(`encounters/${n.dataset.id}`)})}let X=null,za=[];function Rl(e,t){e.innerHTML=`
    <div class="encounter-view encounter-detail">
      <div class="view-header">
        <button class="btn-secondary btn-sm" id="enc-back-btn">← Back</button>
        <h1 id="enc-detail-title">Loading...</h1>
        <div class="view-header-actions">
          <button class="btn-secondary btn-sm" id="enc-mode-setup" title="Setup Mode">⚙️ Setup</button>
          <button class="btn-primary btn-sm" id="enc-mode-combat" title="Start Combat">▶️ Combat</button>
        </div>
      </div>

      <!-- Setup Mode -->
      <div id="enc-setup" class="enc-setup-panel">
        <div class="enc-setup-grid">
          <!-- Left: Town Character Picker -->
          <div class="enc-picker">
            <h3>📦 Add from Town</h3>
            <div class="enc-picker-controls">
              <select id="enc-pick-town" class="form-input">
                <option value="">Select a town...</option>
              </select>
              <button class="btn-secondary btn-sm" id="enc-add-party-all" title="Quick-add all party members">🛡️ Add Party</button>
            </div>
            <input type="text" id="enc-pick-search" class="form-input" placeholder="Filter characters..." style="margin-bottom:0.5rem">
            <div class="enc-pick-side-default" style="margin-bottom:0.5rem;font-size:0.75rem">
              Default side:
              <select id="enc-default-side" class="form-input" style="width:auto;display:inline-block;font-size:0.75rem;padding:0.1rem 0.3rem">
                <option value="enemy">Enemy</option>
                <option value="party">Party</option>
                <option value="ally">Ally</option>
                <option value="neutral">Neutral</option>
              </select>
            </div>
            <div id="enc-pick-list" class="enc-pick-list"></div>
          </div>

          <!-- Right: Roster -->
          <div class="enc-roster">
            <div class="enc-roster-header">
              <h3>⚔️ Encounter Roster</h3>
              <button class="btn-secondary btn-sm" id="enc-add-group-btn">+ Group</button>
            </div>
            <div id="enc-roster-list" class="enc-roster-list"></div>
          </div>
        </div>
      </div>

      <!-- Combat Mode -->
      <div id="enc-combat" class="enc-combat-panel" style="display:none;">
        <div class="enc-combat-grid">
          <!-- Initiative column -->
          <div class="enc-initiative-col">
            <div class="enc-initiative-header">
              <h3>📋 Initiative</h3>
              <button class="btn-secondary btn-sm" id="enc-roll-init-btn">🎲 Roll All</button>
            </div>
            <div class="enc-round-info">
              <span>Round: <strong id="enc-round-num">0</strong></span>
              <button class="btn-primary btn-sm" id="enc-next-turn-btn">Next ▶</button>
            </div>
            <div id="enc-init-list" class="enc-init-list"></div>
          </div>

          <!-- Combat zone -->
          <div class="enc-combat-zone">
            <div class="enc-combat-zone-header">
              <h3>⚔️ Combat</h3>
              <button class="btn-secondary btn-sm" id="enc-end-combat-btn">⏹ End Combat</button>
            </div>
            <div id="enc-combat-area" class="enc-combat-area"></div>
          </div>
        </div>

        <!-- Combat Log -->
        <div class="enc-log-panel">
          <div class="enc-log-header">
            <h3>📜 Combat Log</h3>
            <button class="btn-secondary btn-xs" id="enc-clear-log-btn">Clear</button>
          </div>
          <div id="enc-combat-log" class="enc-combat-log"></div>
        </div>
      </div>
    </div>
    `,Hl(e,t),Nl(e,t)}async function Hl(e,t){try{X=(await Oa(t)).encounter,e.querySelector("#enc-detail-title").textContent=`⚔️ ${X.name}`;const n=(await P("towns")).towns||[],l=e.querySelector("#enc-pick-town");l.innerHTML='<option value="">Select a town...</option>'+n.map(i=>`<option value="${i.id}">🏰 ${i.name} (${i.character_count})</option>`).join(""),X.status==="active"?Wa(e):Jt(e),Ga(e)}catch(s){e.querySelector("#enc-detail-title").textContent=`Error: ${s.message}`}}async function Yt(e){var n;const t=parseInt(e.querySelector("#enc-pick-town").value)||0,s=(((n=e.querySelector("#enc-pick-search"))==null?void 0:n.value)||"").trim().toLowerCase(),a=e.querySelector("#enc-pick-list");if(!t){a.innerHTML='<div class="srd-detail-empty" style="padding:0.75rem"><p style="font-size:0.8rem">Select a town to browse its characters</p></div>';return}a.innerHTML='<div class="srd-loading" style="padding:0.5rem"><div class="spinner"></div>Loading...</div>';try{let i=((await P(`characters&town_id=${t}`)).characters||[]).filter(d=>d.status==="Alive");s&&(i=i.filter(d=>(d.name||"").toLowerCase().includes(s)||(d.race||"").toLowerCase().includes(s)||(d.class||"").toLowerCase().includes(s)));const r=new Set(((X==null?void 0:X.participants)||[]).map(d=>parseInt(d.character_id))),p=i.filter(d=>!r.has(parseInt(d.id))),o=i.filter(d=>r.has(parseInt(d.id)));if(!i.length){a.innerHTML='<div class="srd-detail-empty" style="padding:0.5rem"><p style="font-size:0.8rem">No characters match your search.</p></div>';return}let c="";p.length&&(c+=p.map(d=>`
                <div class="enc-pick-item" data-char-id="${d.id}">
                    <div class="enc-pick-info">
                        <span class="enc-pick-name">${d.name}</span>
                        <span class="enc-pick-detail">${d.race||""} ${d.class||""}</span>
                    </div>
                    <div class="enc-pick-stats">
                        <span>♥${d.hp||"?"}</span>
                        <span>🛡${d.ac||"?"}</span>
                    </div>
                    <button class="btn-primary btn-xs enc-add-char-btn" data-char-id="${d.id}">+</button>
                </div>
            `).join("")),o.length&&(c+='<div class="enc-pick-divider">Already in encounter</div>',c+=o.map(d=>`
                <div class="enc-pick-item enc-pick-added">
                    <div class="enc-pick-info">
                        <span class="enc-pick-name">${d.name}</span>
                        <span class="enc-pick-detail">${d.race||""} ${d.class||""}</span>
                    </div>
                    <span class="party-in-badge">Added ✓</span>
                </div>
            `).join("")),a.innerHTML=c}catch(l){a.innerHTML=`<div class="error-state" style="font-size:0.8rem">Error: ${l.message}</div>`}}function Ga(e){const t=e.querySelector("#enc-roster-list");if(!X)return;const s=X.groups||[],a=X.participants||[],n=a.filter(i=>!i.group_id);let l="";s.forEach(i=>{const r=a.filter(p=>parseInt(p.group_id)===parseInt(i.id));l+=`
        <div class="enc-group" data-group-id="${i.id}">
            <div class="enc-group-header">
                <span class="enc-group-name" data-group-id="${i.id}" title="Click to rename">${i.name}</span>
                <span class="enc-group-count">${r.length}</span>
                <button class="btn-danger btn-xs enc-delete-group-btn" data-group-id="${i.id}" title="Delete group">✕</button>
            </div>
            <div class="enc-group-members">
                ${r.map(p=>Ds(p)).join("")}
                ${r.length?"":'<div class="empty-state" style="padding:0.3rem;font-size:0.75rem">Empty</div>'}
            </div>
        </div>`}),(n.length||!s.length)&&(l+=`
        <div class="enc-group enc-group-ungrouped">
            <div class="enc-group-header">
                <span class="enc-group-name">Ungrouped</span>
                <span class="enc-group-count">${n.length}</span>
            </div>
            <div class="enc-group-members">
                ${n.map(i=>Ds(i)).join("")}
                ${n.length?"":'<div class="empty-state" style="padding:0.3rem;font-size:0.75rem">Select a town and add characters</div>'}
            </div>
        </div>`),t.innerHTML=l,t.querySelectorAll(".enc-remove-part-btn").forEach(i=>{i.addEventListener("click",async()=>{await Tl(parseInt(i.dataset.partId)),await qe(e)})}),t.querySelectorAll(".enc-part-side-select").forEach(i=>{i.addEventListener("change",async()=>{await nt(parseInt(i.dataset.partId),{side:i.value}),await qe(e)})}),t.querySelectorAll(".enc-group-name[data-group-id]").forEach(i=>{i.addEventListener("click",async()=>{const r=prompt("Rename group:",i.textContent);r&&(await El(parseInt(i.dataset.groupId),r),await qe(e))})}),t.querySelectorAll(".enc-delete-group-btn").forEach(i=>{i.addEventListener("click",async()=>{confirm("Delete this group? Participants will become ungrouped.")&&(await xl(parseInt(i.dataset.groupId)),await qe(e))})}),t.querySelectorAll(".enc-part-group-select").forEach(i=>{i.addEventListener("change",async()=>{const r=i.value?parseInt(i.value):null;await nt(parseInt(i.dataset.partId),{group_id:r}),await qe(e)})})}function Ds(e){const t={party:"#4a9eff",ally:"#50c878",enemy:"#ff5555",neutral:"#aaa"},s={party:"🛡️",ally:"🤝",enemy:"👹",neutral:"👤"},a=(X==null?void 0:X.groups)||[],n=e.conditions?typeof e.conditions=="string"?JSON.parse(e.conditions):e.conditions:[];return`
    <div class="enc-participant" data-part-id="${e.id}" style="border-left: 3px solid ${t[e.side]||"#aaa"}">
        <div class="enc-part-main">
            <span class="enc-part-icon">${s[e.side]||"👤"}</span>
            <div class="enc-part-info">
                <span class="enc-part-name">${e.name}</span>
                <span class="enc-part-detail">${e.race||""} ${e.class||""} · ${e.town_name||""}</span>
            </div>
            <div class="enc-part-stats">
                <span class="enc-part-hp" title="HP">♥ ${e.current_hp}/${e.max_hp}</span>
                <span title="AC">🛡 ${e.base_ac||"?"}</span>
            </div>
            <button class="btn-danger btn-xs enc-remove-part-btn" data-part-id="${e.id}" title="Remove">✕</button>
        </div>
        <div class="enc-part-controls">
            <select class="form-input enc-part-side-select" data-part-id="${e.id}" style="width:auto;font-size:0.7rem;padding:0.1rem;">
                <option value="party" ${e.side==="party"?"selected":""}>Party</option>
                <option value="ally" ${e.side==="ally"?"selected":""}>Ally</option>
                <option value="enemy" ${e.side==="enemy"?"selected":""}>Enemy</option>
                <option value="neutral" ${e.side==="neutral"?"selected":""}>Neutral</option>
            </select>
            <select class="form-input enc-part-group-select" data-part-id="${e.id}" style="width:auto;font-size:0.7rem;padding:0.1rem;">
                <option value="">No Group</option>
                ${a.map(l=>`<option value="${l.id}" ${parseInt(e.group_id)===parseInt(l.id)?"selected":""}>${l.name}</option>`).join("")}
            </select>
            ${n.length?`<span class="enc-part-conditions">${n.map(l=>{var i;return((i=Lt[l])==null?void 0:i.name)||l}).join(", ")}</span>`:""}
        </div>
    </div>`}async function qe(e){const t=X==null?void 0:X.id;if(!t)return;X=(await Oa(t)).encounter,Ga(e),Yt(e),X.status==="active"&&(Qt(e),Zt(e))}function Nl(e,t){e.querySelector("#enc-back-btn").addEventListener("click",()=>ge("encounters")),e.querySelector("#enc-pick-town").addEventListener("change",()=>Yt(e));let s=null;e.querySelector("#enc-pick-search").addEventListener("input",()=>{clearTimeout(s),s=setTimeout(()=>Yt(e),300)}),e.querySelector("#enc-pick-list").addEventListener("click",async a=>{const n=a.target.closest(".enc-add-char-btn");if(!n)return;const l=parseInt(n.dataset.charId),i=e.querySelector("#enc-default-side").value||"enemy";try{await Is(t,l,i),await qe(e)}catch(r){alert("Error: "+r.message)}}),e.querySelector("#enc-add-party-all").addEventListener("click",async()=>{try{const n=(await Ba()).party||[];if(!n.length){alert("No party members. Add characters to your party first (🛡️ Party page).");return}const l=new Set(((X==null?void 0:X.participants)||[]).map(r=>parseInt(r.character_id)));let i=0;for(const r of n)l.has(parseInt(r.character_id))||(await Is(t,parseInt(r.character_id),"party"),i++);i===0&&alert("All party members are already in this encounter."),await qe(e)}catch(a){alert("Error: "+a.message)}}),e.querySelector("#enc-add-group-btn").addEventListener("click",async()=>{const a=prompt("Group/location name:","New Location");if(a)try{await Cl(t,a),await qe(e)}catch(n){alert("Error: "+n.message)}}),e.querySelector("#enc-mode-setup").addEventListener("click",async()=>{await Mt(t,{status:"setup"}),X.status="setup",Jt(e)}),e.querySelector("#enc-mode-combat").addEventListener("click",async()=>{if(!((X==null?void 0:X.participants)||[]).length){alert("Add some participants first!");return}await Mt(t,{status:"active",current_round:1,current_turn:0}),X.status="active",X.current_round=1,X.current_turn=0,Wa(e),Qt(e),Zt(e)}),e.querySelector("#enc-roll-init-btn").addEventListener("click",async()=>{const a=(X==null?void 0:X.participants)||[];for(const n of a){const l=Kt("1d20"),i=parseInt(n.initiative_mod)||0,r=l.total+i;await nt(parseInt(n.id),{initiative:r}),Ue(e,`${n.name} rolls initiative: ${l.total} + ${me(i)} = ${r}`)}await qe(e)}),e.querySelector("#enc-next-turn-btn").addEventListener("click",async()=>{if(!X)return;const a=(X.participants||[]).filter(r=>parseInt(r.is_active)!==0);if(!a.length)return;let n=(parseInt(X.current_turn)||0)+1,l=parseInt(X.current_round)||1;n>=a.length&&(n=0,l++),await Mt(X.id,{current_turn:n,current_round:l}),X.current_turn=n,X.current_round=l;const i=a[n];i&&Ue(e,`--- ${i.name}'s turn (Round ${l}) ---`,"turn"),e.querySelector("#enc-round-num").textContent=l,Qt(e),Zt(e)}),e.querySelector("#enc-end-combat-btn").addEventListener("click",async()=>{confirm("End combat and return to setup?")&&(await Mt(t,{status:"completed"}),X.status="completed",Ue(e,"=== COMBAT ENDED ===","system"),Jt(e))}),e.querySelector("#enc-clear-log-btn").addEventListener("click",()=>{za=[],e.querySelector("#enc-combat-log").innerHTML=""})}function Jt(e){e.querySelector("#enc-setup").style.display="",e.querySelector("#enc-combat").style.display="none",e.querySelector("#enc-mode-setup").classList.add("active"),e.querySelector("#enc-mode-combat").classList.remove("active")}function Wa(e){e.querySelector("#enc-setup").style.display="none",e.querySelector("#enc-combat").style.display="",e.querySelector("#enc-mode-setup").classList.remove("active"),e.querySelector("#enc-mode-combat").classList.add("active"),X&&(e.querySelector("#enc-round-num").textContent=X.current_round||0)}function Qt(e){const t=e.querySelector("#enc-init-list");if(!X)return;const s=(X.participants||[]).sort((i,r)=>(parseInt(r.initiative)||0)-(parseInt(i.initiative)||0)),a=parseInt(X.current_turn)||0,n=s.filter(i=>parseInt(i.is_active)!==0),l={party:"#4a9eff",ally:"#50c878",enemy:"#ff5555",neutral:"#aaa"};t.innerHTML=s.map(i=>{var c;const r=((c=n[a])==null?void 0:c.id)===i.id,p=parseInt(i.current_hp)<=0,o=parseInt(i.is_active)===0;return`
        <div class="enc-init-item ${r?"enc-init-active":""} ${p?"enc-init-dead":""} ${o?"enc-init-inactive":""}"
             data-part-id="${i.id}" style="border-left: 3px solid ${l[i.side]||"#aaa"}">
            <span class="enc-init-turn">${r?"▶":""}</span>
            <span class="enc-init-roll">${i.initiative||"—"}</span>
            <div class="enc-init-info">
                <span class="enc-init-name">${i.name}</span>
                <span class="enc-init-hp ${p?"hp-dead":parseInt(i.current_hp)<parseInt(i.max_hp)/2?"hp-low":""}"
                >♥ ${i.current_hp}/${i.max_hp}</span>
            </div>
        </div>`}).join("")}function Zt(e){const t=e.querySelector("#enc-combat-area");if(!X)return;const s=X.participants||[],a={party:[],ally:[],enemy:[],neutral:[]};s.forEach(i=>{(a[i.side]||a.neutral).push(i)});const n={party:"🛡️ Party",ally:"🤝 Allies",enemy:"👹 Enemies",neutral:"👤 Neutral"},l={party:"#4a9eff",ally:"#50c878",enemy:"#ff5555",neutral:"#888"};t.innerHTML=Object.entries(a).filter(([,i])=>i.length>0).map(([i,r])=>`
            <div class="enc-combat-side">
                <h4 style="color:${l[i]}">${n[i]}</h4>
                <div class="enc-combat-members">
                    ${r.map(p=>Bl(p)).join("")}
                </div>
            </div>
        `).join(""),Fl(e)}function Bl(e){const t=parseInt(e.current_hp)<=0,s=Math.max(0,Math.min(100,parseInt(e.current_hp)/Math.max(1,parseInt(e.max_hp))*100)),a=s>50?"#50c878":s>25?"#f0ad4e":"#ff5555",n=e.conditions?typeof e.conditions=="string"?JSON.parse(e.conditions):e.conditions:[],l=ls(e.gear||"",e);return`
    <div class="enc-combat-card ${t?"enc-combat-dead":""}" data-part-id="${e.id}">
        <div class="enc-ccard-header">
            <strong>${e.name}</strong>
            <span class="enc-ccard-class">${e.race||""} ${e.class||""}</span>
        </div>
        <div class="enc-ccard-hp">
            <div class="enc-hp-bar">
                <div class="enc-hp-fill" style="width:${s}%;background:${a}"></div>
            </div>
            <span class="enc-hp-text">♥ ${e.current_hp}/${e.max_hp}${parseInt(e.temp_hp)>0?` (+${e.temp_hp})`:""}</span>
            <div class="enc-hp-buttons">
                <button class="btn-danger btn-xs enc-dmg-btn" data-part-id="${e.id}">-HP</button>
                <button class="btn-success btn-xs enc-heal-btn" data-part-id="${e.id}">+HP</button>
            </div>
        </div>
        <div class="enc-ccard-stats">
            <span>🛡 ${e.base_ac||"?"}</span>
            <span>${me(Xt(parseInt(e.str)||10))} STR</span>
            <span>${me(Xt(parseInt(e.dex)||10))} DEX</span>
        </div>
        ${l.length?`
        <div class="enc-ccard-weapons">
            ${l.slice(0,3).map(i=>`
                <button class="btn-secondary btn-xs enc-attack-btn" data-part-id="${e.id}" data-weapon="${i.name}"
                    title="${i.dmg} ${i.crit}">⚔ ${i.name}</button>
            `).join("")}
        </div>`:""}
        ${n.length?`<div class="enc-ccard-conditions">${n.map(i=>{var r;return`<span class="enc-condition-tag">${((r=Lt[i])==null?void 0:r.name)||i}</span>`}).join("")}</div>`:""}
        <div class="enc-ccard-actions">
            <button class="btn-secondary btn-xs enc-condition-btn" data-part-id="${e.id}">🏷️</button>
            <button class="btn-secondary btn-xs enc-note-btn" data-part-id="${e.id}">📝</button>
        </div>
    </div>`}function Fl(e){e.querySelectorAll(".enc-dmg-btn").forEach(t=>{t.addEventListener("click",async()=>{const s=parseInt(t.dataset.partId),a=X.participants.find(r=>parseInt(r.id)===s);if(!a)return;const n=prompt(`Damage to ${a.name}:`,"");if(!n)return;const l=parseInt(n)||0,i=Math.max(-10,parseInt(a.current_hp)-l);await nt(s,{current_hp:i,is_active:i>-10?1:0}),Ue(e,`${a.name} takes ${l} damage (${a.current_hp} → ${i} HP)${i<=0?" 💀 DOWN!":""}`,i<=0?"danger":"info"),await qe(e)})}),e.querySelectorAll(".enc-heal-btn").forEach(t=>{t.addEventListener("click",async()=>{const s=parseInt(t.dataset.partId),a=X.participants.find(r=>parseInt(r.id)===s);if(!a)return;const n=prompt(`Heal ${a.name}:`,"");if(!n)return;const l=parseInt(n)||0,i=Math.min(parseInt(a.max_hp),parseInt(a.current_hp)+l);await nt(s,{current_hp:i,is_active:1}),Ue(e,`${a.name} heals ${l} HP (${a.current_hp} → ${i} HP)`,"success"),await qe(e)})}),e.querySelectorAll(".enc-attack-btn").forEach(t=>{t.addEventListener("click",async()=>{const s=parseInt(t.dataset.partId),a=t.dataset.weapon,n=X.participants.find(f=>parseInt(f.id)===s);if(!n)return;const i=ls(n.gear||"",n).find(f=>f.name===a);if(!i)return;const r=parseInt(n.atk)||0,p=Kt("1d20"),o=p.total+r+i.atkMod+i.enhancement,c=Kt(i.dmg),d=i.ranged?0:i.strMod,u=Math.max(1,c.total+d+i.enhancement),v=i.crit.split("/")[0].split("-"),m=v.length>1?parseInt(v[0]):20,b=p.total>=m;let y=`${n.name} attacks with ${i.name}: 🎲${p.total} + ${r+i.atkMod+i.enhancement} = ${o}`;p.total===20?y+=" (NAT 20!)":b?y+=" (CRIT THREAT!)":p.total===1&&(y+=" (FUMBLE!)"),y+=` | Damage: ${u} (${i.dmg}: ${c.rolls.join("+")}${d?` +${d}str`:""})`,Ue(e,y,b?"crit":"attack")})}),e.querySelectorAll(".enc-condition-btn").forEach(t=>{t.addEventListener("click",async()=>{var o,c;const s=parseInt(t.dataset.partId),a=X.participants.find(d=>parseInt(d.id)===s);if(!a)return;const n=a.conditions?typeof a.conditions=="string"?JSON.parse(a.conditions):[...a.conditions]:[],l=ql(),i=prompt(`Conditions for ${a.name}:
Current: ${n.join(", ")||"none"}

Available: ${l.join(", ")}

Enter condition to toggle:`,"");if(!i)return;const r=i.toLowerCase().replace(/[- ]/g,""),p=n.indexOf(r);p>=0?(n.splice(p,1),Ue(e,`${a.name}: removed ${((o=Lt[r])==null?void 0:o.name)||r}`,"info")):(n.push(r),Ue(e,`${a.name}: applied ${((c=Lt[r])==null?void 0:c.name)||r}`,"warn")),await nt(s,{conditions:n}),await qe(e)})})}function Ue(e,t,s="info"){const a=e.querySelector("#enc-combat-log");if(!a)return;const n=new Date().toLocaleTimeString(),l={info:"var(--text-secondary)",success:"#50c878",danger:"#ff5555",warn:"#f0ad4e",attack:"#4a9eff",crit:"#ff44ff",turn:"#f5c518",system:"#aaa"};za.push({time:n,message:t,type:s}),a.innerHTML+=`<div class="enc-log-entry" style="color:${l[s]||l.info}">
        <span class="enc-log-time">[${n}]</span> ${t}
    </div>`,a.scrollTop=a.scrollHeight}function Ol(e){return{setup:"⚙️",active:"⚔️",completed:"✅"}[e]||"❓"}function jl(e){if(!e)return"";try{return new Date(e).toLocaleDateString()}catch{return e}}const zl=["Lawful Good","Neutral Good","Chaotic Good","Lawful Neutral","True Neutral","Chaotic Neutral","Lawful Evil","Neutral Evil","Chaotic Evil"],it=["str","dex","con","int_","wis","cha"],os={str:"STR",dex:"DEX",con:"CON",int_:"INT",wis:"WIS",cha:"CHA"},Ps={7:-4,8:0,9:1,10:2,11:3,12:4,13:5,14:6,15:8,16:10,17:13,18:16},Gl=[15,14,13,12,10,8],Wl=["Adept","Aristocrat","Commoner","Expert","Warrior"];let Je=[],je=[],Ua=[],Ul=[],Ot=[],te=null;function cs(){return{tab:"class",name:"",gender:"",race:"",class_:"",level:1,alignment:"True Neutral",abilityMethod:"pointbuy",abilities:{str:10,dex:10,con:10,int_:10,wis:10,cha:10},skillRanks:{},selectedFeats:[],gear:"",languages:"",history:"",showPcClasses:!0,showNpcClasses:!0,showPrestigeClasses:!0,showAllSkills:!0,showAllFeats:!0}}function Ge(e){return Je.find(t=>t.name===e)||Je[0]||{}}function Ne(e){return je.find(t=>t.name===e)||je[0]||{}}function Tt(e){return pa(e==null?void 0:e.ability_mods)}function ds(e){return ua(e==null?void 0:e.hit_die)}function ps(e){return ma(e==null?void 0:e.good_saves)}function Rs(e){return((e==null?void 0:e.class_skills)||"").split(",").map(t=>t.trim()).filter(Boolean)}function Ht(e){return Wl.includes(e)}function Fe(e){const t=Ge(te.race),s=Tt(t);return te.abilities[e]+(s[e]||0)}function Hs(){const e=Ne(te.class_),t=ce(Fe("int_")),s=(parseInt(e==null?void 0:e.skills_per_level)||2)+t,a=Math.max(1,s),n=Ge(te.race),l=(n==null?void 0:n.name)==="Human"?4:0;return a*te.level+l}function Ns(){return Object.values(te.skillRanks).reduce((e,t)=>e+t,0)}async function Vl(){var e,t,s;[Je,je,Ua,Ul,Ot]=await Promise.all([la(),ra(),oa(),ca(),da()]),te=cs(),te.race=((e=Je[0])==null?void 0:e.name)||"Human",te.class_=((t=je.find(a=>!Ht(a.name)))==null?void 0:t.name)||((s=je[0])==null?void 0:s.name)||"Fighter"}function Va(){var e,t,s;te=cs(),te.race=((e=Je[0])==null?void 0:e.name)||"Human",te.class_=((t=je.find(a=>!Ht(a.name)))==null?void 0:t.name)||((s=je[0])==null?void 0:s.name)||"Fighter"}function Xa(e){var s,a;te||(te=cs(),te.race=((s=Je[0])==null?void 0:s.name)||"Human",te.class_=((a=je[0])==null?void 0:a.name)||"Fighter");const t=te;Ne(t.class_),Ge(t.race),e.innerHTML=`
    <div class="cc-root">
        <div class="cc-header">
            <div class="cc-header-info">
                <input type="text" id="cc-name" class="cc-name-input" value="${t.name}" placeholder="Character Name...">
                <span class="cc-header-detail">${t.race} ${t.class_} ${t.level}</span>
            </div>
            <div class="cc-header-right">
                <select id="cc-race" class="cc-header-select">${Je.map(n=>`<option value="${n.name}" ${t.race===n.name?"selected":""}>${n.name}</option>`).join("")}</select>
                <select id="cc-alignment" class="cc-header-select">${zl.map(n=>`<option value="${n}" ${t.alignment===n?"selected":""}>${n}</option>`).join("")}</select>
            </div>
        </div>
        <div class="cc-tabs" id="cc-tabs">
            ${["class","abilities","skills","feats","features","review"].map(n=>`<button class="cc-tab ${t.tab===n?"active":""}" data-tab="${n}">${{class:"⚔️ Class",abilities:"📊 Abilities",skills:"📜 Skills",feats:"🏅 Feats",features:"✨ Features",review:"✅ Review"}[n]}</button>`).join("")}
        </div>
        <div class="cc-body" id="cc-body"></div>
    </div>`,Kl(e),Xl(e)}function Xl(e){var t,s,a,n;(t=e.querySelector("#cc-name"))==null||t.addEventListener("input",l=>{te.name=l.target.value.trim(),Ka(e)}),(s=e.querySelector("#cc-race"))==null||s.addEventListener("change",l=>{te.race=l.target.value,es(e)}),(a=e.querySelector("#cc-alignment"))==null||a.addEventListener("change",l=>{te.alignment=l.target.value}),(n=e.querySelector("#cc-tabs"))==null||n.addEventListener("click",l=>{const i=l.target.closest(".cc-tab");i&&(te.tab=i.dataset.tab,es(e))})}function es(e){Xa(e)}function Ka(e){const t=e.querySelector(".cc-header-detail");t&&(t.textContent=`${te.race} ${te.class_} ${te.level}`)}function Kl(e){const t=e.querySelector("#cc-body");if(t)switch(te.tab){case"class":ts(t,e);break;case"abilities":yt(t);break;case"skills":It(t);break;case"feats":Dt(t);break;case"features":Yl(t);break;case"review":Jl(t);break}}function ts(e,t){var r,p,o,c;const s=te,a=Ne(s.class_),n=Ge(s.race),l=Tt(n);let i=je.filter(d=>!(Ht(d.name)&&!s.showNpcClasses||!Ht(d.name)&&!s.showPcClasses));e.innerHTML=`
    <div class="cc-class-layout">
        <div class="cc-class-left">
            <div class="cc-filter-row">
                <label class="cc-checkbox"><input type="checkbox" id="cc-filter-pc" ${s.showPcClasses?"checked":""}> PC Classes</label>
                <label class="cc-checkbox"><input type="checkbox" id="cc-filter-npc" ${s.showNpcClasses?"checked":""}> NPC Classes</label>
            </div>
            <div class="cc-class-list" id="cc-class-list">
                ${i.map(d=>`
                    <div class="cc-class-item ${s.class_===d.name?"selected":""}" data-class="${d.name}">
                        <span class="cc-class-item-name">${d.name}</span>
                        <span class="cc-class-item-hd">${d.hit_die}</span>
                    </div>
                `).join("")}
            </div>
        </div>
        <div class="cc-class-right">
            <div class="cc-class-info">
                <div class="cc-info-row">
                    <span class="cc-info-label">Class Selected:</span>
                    <span class="cc-info-value">${a.name} (${a.hit_die})</span>
                </div>
                <div class="cc-info-row">
                    <span class="cc-info-label">Level:</span>
                    <input type="number" id="cc-level" class="cc-level-input" value="${s.level}" min="1" max="20">
                </div>
                <div class="cc-info-row">
                    <span class="cc-info-label">Gender:</span>
                    <select id="cc-gender" class="cc-info-select">
                        <option value="" ${s.gender?"":"selected"}>Any</option>
                        <option value="Male" ${s.gender==="Male"?"selected":""}>Male</option>
                        <option value="Female" ${s.gender==="Female"?"selected":""}>Female</option>
                    </select>
                </div>
                <div class="cc-info-row">
                    <span class="cc-info-label">BAB Type:</span>
                    <span class="cc-info-value">${a.bab_type||"—"}</span>
                </div>
                <div class="cc-info-row">
                    <span class="cc-info-label">Good Saves:</span>
                    <span class="cc-info-value">${a.good_saves||"None"}</span>
                </div>
                <div class="cc-info-row">
                    <span class="cc-info-label">Skills/Level:</span>
                    <span class="cc-info-value">${a.skills_per_level||2} + INT mod</span>
                </div>
            </div>
            <div class="cc-race-traits">
                <h4>📋 ${n.name} Traits</h4>
                <div class="cc-traits-grid">
                    <span>Size: <strong>${n.size||"Medium"}</strong></span>
                    <span>Speed: <strong>${parseInt(n.speed)||30} ft</strong></span>
                    ${Object.entries(l).length?`<span>Ability Mods: <strong>${Object.entries(l).map(([d,u])=>`${me(u)} ${os[d]}`).join(", ")}</strong></span>`:"<span>No ability adjustments</span>"}
                    <span>Languages: <strong>${(n.languages||"Common").split(",").map(d=>d.trim()).join(", ")}</strong></span>
                </div>
            </div>
            <div class="cc-class-desc">
                <h4>📖 ${a.name}</h4>
                <p>${a.class_features||"No description available."}</p>
            </div>
        </div>
    </div>`,e.querySelector("#cc-class-list").addEventListener("click",d=>{const u=d.target.closest(".cc-class-item");u&&(s.class_=u.dataset.class,es(t))}),(r=e.querySelector("#cc-level"))==null||r.addEventListener("input",d=>{s.level=Math.max(1,Math.min(20,parseInt(d.target.value)||1)),Ka(t)}),(p=e.querySelector("#cc-gender"))==null||p.addEventListener("change",d=>{s.gender=d.target.value}),(o=e.querySelector("#cc-filter-pc"))==null||o.addEventListener("change",d=>{s.showPcClasses=d.target.checked,ts(e,t)}),(c=e.querySelector("#cc-filter-npc"))==null||c.addEventListener("change",d=>{s.showNpcClasses=d.target.checked,ts(e,t)})}function yt(e,t){const s=te,a=Ge(s.race),n=Ne(s.class_),l=Tt(a),i=ds(n),r=ps(n),p=s.level,o=25;let c=0;it.forEach(w=>{c+=Ps[s.abilities[w]]||0});const d=o-c,u=Fe("con"),v=Fe("dex"),m=ce(u),b=ce(v),y=i+m,f=Math.max(1,y+(p-1)*Math.max(1,Math.floor(i/2+1)+m)),g=pt(s.class_,p),k=10+b+((a.size||"Medium")==="Small"?1:0),_=Te(p,r.includes("fort"))+ce(Fe("con")),$=Te(p,r.includes("ref"))+ce(Fe("dex")),L=Te(p,r.includes("will"))+ce(Fe("wis"));e.innerHTML=`
    <div class="cc-abilities-layout">
        <div class="cc-method-toggle">
            <button class="cc-method-btn ${s.abilityMethod==="pointbuy"?"active":""}" data-method="pointbuy">Point Buy (25)</button>
            <button class="cc-method-btn ${s.abilityMethod==="standard"?"active":""}" data-method="standard">Standard Array</button>
            <button class="cc-method-btn ${s.abilityMethod==="manual"?"active":""}" data-method="manual">Manual Entry</button>
        </div>
        ${s.abilityMethod==="pointbuy"?`<div class="cc-points-bar">Points: <strong class="${d<0?"text-danger":d===0?"text-success":""}">${d}</strong> / ${o}</div>`:""}

        <div class="cc-ability-grid">
            ${it.map(w=>{const A=s.abilities[w],M=l[w]||0,h=A+M,q=ce(h),F=Ps[A]||0;return`<div class="cc-ability-card">
                    <div class="cc-ab-label">${os[w]}</div>
                    <div class="cc-ab-controls">
                        ${s.abilityMethod!=="manual"?`<button class="cc-ab-btn cc-ab-minus" data-ab="${w}" ${A<=7?"disabled":""}>−</button>`:""}
                        <input type="number" class="cc-ab-input" data-ab="${w}" value="${A}" min="3" max="18" ${s.abilityMethod==="pointbuy"?"readonly":""}>
                        ${s.abilityMethod!=="manual"?`<button class="cc-ab-btn cc-ab-plus" data-ab="${w}" ${A>=18?"disabled":""}>+</button>`:""}
                    </div>
                    ${M?`<div class="cc-ab-race">${me(M)} racial</div>`:'<div class="cc-ab-race">&nbsp;</div>'}
                    <div class="cc-ab-final"><span class="cc-ab-total">${h}</span><span class="cc-ab-mod">${me(q)}</span></div>
                    ${s.abilityMethod==="pointbuy"?`<div class="cc-ab-cost">Cost: ${F}</div>`:""}
                </div>`}).join("")}
        </div>

        <div class="cc-stats-row">
            <div class="cc-stat-box cc-stat-hp"><div class="cc-stat-label">HP</div><div class="cc-stat-val">${f}</div><div class="cc-stat-detail">${n.hit_die}+${me(m)}/lvl</div></div>
            <div class="cc-stat-box"><div class="cc-stat-label">AC</div><div class="cc-stat-val">${k}</div></div>
            <div class="cc-stat-box"><div class="cc-stat-label">BAB</div><div class="cc-stat-val">+${g}</div></div>
            <div class="cc-stat-box"><div class="cc-stat-label">Fort</div><div class="cc-stat-val">${me(_)}</div></div>
            <div class="cc-stat-box"><div class="cc-stat-label">Ref</div><div class="cc-stat-val">${me($)}</div></div>
            <div class="cc-stat-box"><div class="cc-stat-label">Will</div><div class="cc-stat-val">${me(L)}</div></div>
            <div class="cc-stat-box"><div class="cc-stat-label">Init</div><div class="cc-stat-val">${me(b)}</div></div>
        </div>
    </div>`,e.querySelectorAll(".cc-method-btn").forEach(w=>w.addEventListener("click",()=>{s.abilityMethod=w.dataset.method,w.dataset.method==="standard"&&it.forEach((A,M)=>{s.abilities[A]=Gl[M]}),yt(e)})),e.querySelectorAll(".cc-ab-minus").forEach(w=>w.addEventListener("click",()=>{const A=w.dataset.ab;s.abilities[A]>7&&(s.abilities[A]--,yt(e))})),e.querySelectorAll(".cc-ab-plus").forEach(w=>w.addEventListener("click",()=>{const A=w.dataset.ab;s.abilities[A]<18&&(s.abilities[A]++,yt(e))})),s.abilityMethod==="manual"&&e.querySelectorAll(".cc-ab-input").forEach(w=>w.addEventListener("change",()=>{s.abilities[w.dataset.ab]=Math.max(3,Math.min(18,parseInt(w.value)||10)),yt(e)}))}function It(e,t){var d;const s=te,a=Ne(s.class_),n=Rs(a),l=Hs(),i=Ns(),r=l-i,p=bt(s.level,!0),o=bt(s.level,!1);let c=[...Ot];s.showAllSkills||(c=c.filter(u=>n.includes(u.name))),e.innerHTML=`
    <div class="cc-skills-layout">
        <div class="cc-skills-header">
            <div class="cc-skills-points">
                Skill Points: <strong class="${r<0?"text-danger":r===0?"text-success":""}">${r}</strong> / ${l}
                <span class="cc-skills-hint">(Class max: ${p}, Cross-class max: ${o})</span>
            </div>
            <div class="cc-filter-row">
                <label class="cc-checkbox">
                    <input type="checkbox" id="cc-skills-filter" ${s.showAllSkills?"checked":""}>
                    Show All Skills
                </label>
                <span class="cc-filter-hint">${s.showAllSkills?"":"Showing class skills only"}</span>
            </div>
        </div>
        <div class="cc-skills-table">
            <div class="cc-skill-header-row">
                <span class="cc-skill-h-name">Skill</span>
                <span class="cc-skill-h-ab">Ability</span>
                <span class="cc-skill-h-class">Class?</span>
                <span class="cc-skill-h-ranks">Ranks</span>
                <span class="cc-skill-h-mod">Total</span>
            </div>
            ${c.map(u=>{const v=n.includes(u.name),m=s.skillRanks[u.name]||0,b=v?p:o,y=u.ability.toLowerCase()==="int"?"int_":u.ability.toLowerCase(),f=ce(Fe(y)),g=m+f;return`<div class="cc-skill-row ${v?"cc-skill-class":"cc-skill-cross"} ${m>0?"cc-skill-active":""}">
                    <span class="cc-skill-name" title="${u.trained_only?"Trained only":""}">
                        ${u.name}${u.trained_only?" *":""}
                    </span>
                    <span class="cc-skill-ab">${u.ability}</span>
                    <span class="cc-skill-isclass">${v?"✓":""}</span>
                    <span class="cc-skill-ranks">
                        <button class="cc-sk-btn cc-sk-minus" data-skill="${u.name}" ${m<=0?"disabled":""}>−</button>
                        <span class="cc-sk-val">${m}</span>
                        <button class="cc-sk-btn cc-sk-plus" data-skill="${u.name}" ${m>=b||r<=0?"disabled":""}>+</button>
                    </span>
                    <span class="cc-skill-total ${g>=0?"":"text-danger"}">${me(g)}</span>
                </div>`}).join("")}
        </div>
        <div class="cc-skills-footer">* = Trained only skill</div>
    </div>`,(d=e.querySelector("#cc-skills-filter"))==null||d.addEventListener("change",u=>{s.showAllSkills=u.target.checked,It(e)}),e.querySelectorAll(".cc-sk-minus").forEach(u=>u.addEventListener("click",()=>{const v=u.dataset.skill;(s.skillRanks[v]||0)>0&&(s.skillRanks[v]=(s.skillRanks[v]||0)-1,It(e))})),e.querySelectorAll(".cc-sk-plus").forEach(u=>u.addEventListener("click",()=>{const v=u.dataset.skill,m=Ne(s.class_),y=Rs(m).includes(v)?bt(s.level,!0):bt(s.level,!1),f=s.skillRanks[v]||0;f<y&&Ns()<Hs()&&(s.skillRanks[v]=f+1,It(e))}))}function Bs(e){const t=(e.prerequisites||"").trim();if(!t||t==="None")return!0;const s=t.match(/(Str|Dex|Con|Int|Wis|Cha)\s+(\d+)/gi);if(s)for(const l of s){const[i,r,p]=l.match(/(Str|Dex|Con|Int|Wis|Cha)\s+(\d+)/i),o=r.toLowerCase()==="int"?"int_":r.toLowerCase();if(Fe(o)<parseInt(p))return!1}const a=t.match(/BAB\s*\+?(\d+)/i);if(a&&pt(te.class_,te.level)<parseInt(a[1]))return!1;const n=t.split(",").map(l=>l.trim()).filter(l=>!l.match(/^(Str|Dex|Con|Int|Wis|Cha|BAB|None)/i)&&l.length>2);for(const l of n){const i=l.replace(/\s*\d+.*$/,"").trim();if(i&&!te.selectedFeats.includes(i)&&!te.selectedFeats.some(r=>r.toLowerCase()===i.toLowerCase())&&!i.match(/^(Fighter|Ranger|Rogue|Cleric|Wizard|Sorcerer|Bard|Druid|Monk|Paladin|Barbarian|Turn|Rebuke)/i))return!1}return!0}function Dt(e,t){var o;const s=te,a=Ge(s.race);Ne(s.class_);const n=s.class_==="Fighter",l=a.name==="Human",i=1+Math.floor(s.level/3)+(l?1:0)+(n?1+Math.floor(s.level/2):0),r=i-s.selectedFeats.length;let p=[...Ua];s.showAllFeats||(p=p.filter(c=>Bs(c))),e.innerHTML=`
    <div class="cc-feats-layout">
        <div class="cc-feats-header">
            <div class="cc-feats-slots">
                Feat Slots: <strong class="${r<0?"text-danger":r===0?"text-success":""}">${r}</strong> / ${i}
                ${n?'<span class="cc-feats-hint">(Includes Fighter bonus feats)</span>':""}
            </div>
            <div class="cc-filter-row">
                <label class="cc-checkbox">
                    <input type="checkbox" id="cc-feats-filter" ${s.showAllFeats?"checked":""}>
                    Show All Feats
                </label>
                <span class="cc-filter-hint">${s.showAllFeats?"":"Showing qualified feats only"}</span>
            </div>
        </div>
        <div class="cc-feats-selected">
            <h4>Selected Feats (${s.selectedFeats.length})</h4>
            ${s.selectedFeats.length?`<div class="cc-feat-tags">${s.selectedFeats.map(c=>`<span class="cc-feat-tag">${c} <button class="cc-feat-remove" data-feat="${c}">✕</button></span>`).join("")}</div>`:'<p class="text-muted" style="font-size:0.8rem">No feats selected yet.</p>'}
        </div>
        <div class="cc-feats-table">
            <div class="cc-feat-header-row">
                <span class="cc-feat-h-name">Feat</span>
                <span class="cc-feat-h-type">Type</span>
                <span class="cc-feat-h-prereq">Prerequisites</span>
                <span class="cc-feat-h-add"></span>
            </div>
            ${p.map(c=>{const d=Bs(c),u=s.selectedFeats.includes(c.name);return`<div class="cc-feat-row ${d?"":"cc-feat-unqualified"} ${u?"cc-feat-selected":""}">
                    <span class="cc-feat-name">${c.name}</span>
                    <span class="cc-feat-type">${c.type||"General"}</span>
                    <span class="cc-feat-prereq">${c.prerequisites||"None"}</span>
                    <span class="cc-feat-action">
                        ${u?'<span class="cc-feat-check">✓</span>':`<button class="cc-feat-add-btn" data-feat="${c.name}" ${!d||r<=0?"disabled":""}>+</button>`}
                    </span>
                </div>`}).join("")}
        </div>
    </div>`,(o=e.querySelector("#cc-feats-filter"))==null||o.addEventListener("change",c=>{s.showAllFeats=c.target.checked,Dt(e)}),e.querySelectorAll(".cc-feat-add-btn").forEach(c=>c.addEventListener("click",()=>{s.selectedFeats.includes(c.dataset.feat)||(s.selectedFeats.push(c.dataset.feat),Dt(e))})),e.querySelectorAll(".cc-feat-remove").forEach(c=>c.addEventListener("click",()=>{s.selectedFeats=s.selectedFeats.filter(d=>d!==c.dataset.feat),Dt(e)}))}function Yl(e){const t=Ne(te.class_),s=Ge(te.race);e.innerHTML=`
    <div class="cc-features-layout">
        <div class="cc-features-section">
            <h3>⚔️ ${t.name} Class Features</h3>
            <p>${t.class_features||"No class features described."}</p>
            <div class="cc-features-info">
                <div class="cc-fi-row"><span>Hit Die:</span> <strong>${t.hit_die}</strong></div>
                <div class="cc-fi-row"><span>BAB:</span> <strong>${t.bab_type}</strong></div>
                <div class="cc-fi-row"><span>Good Saves:</span> <strong>${t.good_saves||"None"}</strong></div>
                <div class="cc-fi-row"><span>Skill Points:</span> <strong>${t.skills_per_level} + INT per level</strong></div>
                <div class="cc-fi-row"><span>Class Skills:</span> <strong>${t.class_skills||"—"}</strong></div>
            </div>
        </div>
        <div class="cc-features-section">
            <h3>🧬 ${s.name} Racial Features</h3>
            <p>${s.traits||"No racial traits described."}</p>
            <div class="cc-features-info">
                <div class="cc-fi-row"><span>Size:</span> <strong>${s.size||"Medium"}</strong></div>
                <div class="cc-fi-row"><span>Speed:</span> <strong>${parseInt(s.speed)||30} ft</strong></div>
                <div class="cc-fi-row"><span>Ability Mods:</span> <strong>${s.ability_mods||"None"}</strong></div>
                <div class="cc-fi-row"><span>Languages:</span> <strong>${s.languages||"Common"}</strong></div>
            </div>
        </div>
    </div>`}function Jl(e,t){var _,$,L;const s=te,a=Ge(s.race),n=Ne(s.class_),l=Tt(a),i=ds(n),r=ps(n),p=s.level,o={};it.forEach(w=>{o[w]=s.abilities[w]+(l[w]||0)});const c=ce(o.con),d=ce(o.dex),u=i+c,v=Math.max(1,u+(p-1)*Math.max(1,Math.floor(i/2+1)+c)),m=pt(s.class_,p),b=10+d+((a.size||"Medium")==="Small"?1:0),y=Te(p,r.includes("fort"))+ce(o.con),f=Te(p,r.includes("ref"))+ce(o.dex),g=Te(p,r.includes("will"))+ce(o.wis),k=Object.entries(s.skillRanks).filter(([,w])=>w>0).map(([w,A])=>{const M=Ot.find(q=>q.name===w),h=M?M.ability.toLowerCase()==="int"?"int_":M.ability.toLowerCase():"str";return`${w} +${A+ce(Fe(h))}`}).join(", ")||"None";e.innerHTML=`
    <div class="cc-review-layout">
        <div class="cc-review-card">
            <div class="cc-review-header">
                <h2>${s.name||"Unnamed Character"}</h2>
                <div class="cc-review-subtitle">${s.gender?s.gender+" ":""}${s.race} ${s.class_} ${p} · ${s.alignment}</div>
            </div>
            <div class="cc-stats-row" style="margin:1rem 0">
                <div class="cc-stat-box cc-stat-hp"><div class="cc-stat-label">HP</div><div class="cc-stat-val">${v}</div></div>
                <div class="cc-stat-box"><div class="cc-stat-label">AC</div><div class="cc-stat-val">${b}</div></div>
                ${it.map(w=>`<div class="cc-stat-box"><div class="cc-stat-label">${os[w]}</div><div class="cc-stat-val">${o[w]}</div><div class="cc-stat-detail">${me(ce(o[w]))}</div></div>`).join("")}
            </div>
            <div class="cc-review-stats">
                <span>BAB: <strong>+${m}</strong></span>
                <span>Init: <strong>${me(d)}</strong></span>
                <span>Speed: <strong>${parseInt(a.speed)||30} ft</strong></span>
                <span>Fort: <strong>${me(y)}</strong></span>
                <span>Ref: <strong>${me(f)}</strong></span>
                <span>Will: <strong>${me(g)}</strong></span>
            </div>
            ${s.selectedFeats.length?`<div class="cc-review-section"><strong>Feats:</strong> ${s.selectedFeats.join(", ")}</div>`:""}
            ${k!=="None"?`<div class="cc-review-section"><strong>Skills:</strong> ${k}</div>`:""}
            <div class="cc-review-section">
                <label><strong>Equipment & Gear:</strong></label>
                <textarea id="cc-gear" class="form-input" rows="2" placeholder="List gear...">${s.gear}</textarea>
            </div>
            <div class="cc-review-section">
                <label><strong>Languages:</strong></label>
                <input type="text" id="cc-languages" class="form-input" value="${s.languages||(a.languages||"Common").split(",").map(w=>w.trim()).join(", ")}">
            </div>
            <div class="cc-review-section">
                <label><strong>Background / History:</strong></label>
                <textarea id="cc-history" class="form-input" rows="3" placeholder="Brief background...">${s.history}</textarea>
            </div>
            <div class="cc-review-town">🏕️ Saving to: <strong>Party Camp</strong></div>
        </div>
        <div class="cc-review-actions">
            <button class="btn-primary btn-lg" id="cc-create-btn" ${s.name?"":"disabled"}>🎲 Create & Add to Party</button>
        </div>
    </div>`,(_=e.querySelector("#cc-gear"))==null||_.addEventListener("input",w=>{s.gear=w.target.value.trim()}),($=e.querySelector("#cc-languages"))==null||$.addEventListener("input",w=>{s.languages=w.target.value.trim()}),(L=e.querySelector("#cc-history"))==null||L.addEventListener("input",w=>{s.history=w.target.value.trim()})}function Ql(){const e=te,t=Ge(e.race),s=Ne(e.class_),a=Tt(t),n=ds(s),l=ps(s),i=e.level,r={};it.forEach(D=>{r[D]=e.abilities[D]+(a[D]||0)});const p=ce(r.str),o=ce(r.con),c=ce(r.dex),d=n+o,u=Math.max(1,d+(i-1)*Math.max(1,Math.floor(n/2+1)+o)),v=pt(e.class_,i),m=(t.size||"Medium")==="Small",b=m?1:0,y=10+c+b,f=Te(i,l.includes("fort"))+ce(r.con),g=Te(i,l.includes("ref"))+ce(r.dex),k=Te(i,l.includes("will"))+ce(r.wis),$=Object.entries(e.skillRanks).filter(([,D])=>D>0).map(([D,J])=>{const Y=Ot.find(O=>O.name===D),S=Y?Y.ability.toLowerCase()==="int"?"int_":Y.ability.toLowerCase():"str",H=J+ce(r[S]||10);return`${D} ${me(H)}`}).join(", ")||"",L=v+p+(m?-4:0),w={Human:[15,35],Elf:[110,200],Dwarf:[40,100],Gnome:[40,100],Halfling:[20,50],"Half-Elf":[20,60],"Half-Orc":[14,30]},[A,M]=w[e.race]||[18,40],h=Math.floor(Math.random()*(M-A+1))+A,F=["Commoner","Expert","Warrior","Adept","Aristocrat"].includes(e.class_)?i<=1?"1/2":String(i-1):String(i);return{name:e.name,race:e.race,class:`${e.class_} ${i}`,status:"Alive",gender:e.gender,alignment:e.alignment,age:h,hp:u,hd:`${i}${s.hit_die}`,ac:`${y}, touch ${10+c+b}, flat-footed ${y-c}`,init:`${me(c)}`,spd:`${parseInt(t.speed)||30} ft`,grapple:`${me(L)}`,atk:`Melee: ${me(v+p)} (weapon)`,saves:`Fort ${me(f)}, Ref ${me(g)}, Will ${me(k)}`,str:r.str,dex:r.dex,con:r.con,int_:r.int_,wis:r.wis,cha:r.cha,languages:e.languages||(t.languages||"Common").split(",").map(D=>D.trim()).join(", "),skills_feats:$,feats:e.selectedFeats.join(", "),gear:e.gear,history:e.history,role:"Player Character",xp:0,cr:F}}let Ye=[],Fs=[],Re=null,Ya=0,Zl="Party Camp";function er(e){e.innerHTML=`
    <div class="view-party">
      <header class="view-header"><h1>🛡️ Adventuring Party</h1></header>
      <div class="party-tabs" id="party-tabs">
        <button class="party-tab active" data-tab="roster">🛡️ Party Roster</button>
        <button class="party-tab" data-tab="recruit">🏰 Recruit from Town</button>
        <button class="party-tab" data-tab="create">✨ Create Character</button>
      </div>
      <div class="party-content">
        <div class="party-list-panel" id="party-list-panel">
          <div id="party-tab-roster">
            <div class="party-list-header"><span id="party-count">0 members</span></div>
            <div class="party-member-list" id="party-member-list">
              <div class="srd-loading"><div class="spinner"></div>Loading party...</div>
            </div>
          </div>
          <div id="party-tab-recruit" style="display:none">
            <div class="party-recruit-controls">
              <select id="recruit-town-select" class="form-input"><option value="">Select a town...</option></select>
              <input type="text" id="recruit-search" class="form-input" placeholder="Filter characters..." style="margin-top:0.4rem">
            </div>
            <div class="party-recruit-list" id="recruit-char-list">
              <div class="srd-detail-empty"><p>Select a town to browse characters</p></div>
            </div>
          </div>
        </div>
        <div class="party-detail-panel" id="party-detail-panel">
          <div class="srd-detail-empty"><div class="srd-empty-icon">🛡️</div><p>Select a party member to view their character sheet</p></div>
        </div>
      </div>
    </div>`,tr(e)}async function tr(e){await Vl();try{const t=await P("get_party_base");t.party_base&&(Ya=t.party_base.id,Zl=t.party_base.name)}catch(t){console.warn("Could not load party base:",t.message)}lt(e),sr(e),nr(e)}async function lt(e){try{Ye=(await Ba()).party||[],us(e)}catch(t){e.querySelector("#party-member-list").innerHTML=`<p class="error">Error: ${t.message}</p>`}}async function sr(e){try{Fs=(await P("towns")).towns||[];const s=e.querySelector("#recruit-town-select");s.innerHTML='<option value="">Select a town...</option>'+Fs.map(a=>`<option value="${a.id}">🏰 ${a.name}</option>`).join("")}catch(t){console.error("Failed to load towns:",t)}}function us(e){const t=e.querySelector("#party-member-list");if(e.querySelector("#party-count").textContent=`${Ye.length} members`,!Ye.length){t.innerHTML='<div class="srd-detail-empty" style="padding:1.5rem"><div class="srd-empty-icon">🛡️</div><p>No party members yet.</p><p style="font-size:0.75rem;color:var(--text-muted)">Use "Recruit from Town" or "Create Character" to add members.</p></div>';return}t.innerHTML=Ye.map(s=>`<div class="party-list-item ${Re&&parseInt(Re.character_id)===parseInt(s.character_id)?"selected":""}" data-char-id="${s.character_id}">
            <div class="party-item-main"><div class="party-item-info"><span class="party-item-name">${s.name}</span><span class="party-item-meta">${s.race||""} ${s.class||""}</span></div>
            <div class="party-item-badges"><span class="party-badge party-badge-hp">♥ ${s.hp||"?"}</span><span class="party-badge party-badge-ac">🛡 ${s.ac||"?"}</span></div></div>
            <div class="party-item-from">📍 ${s.town_name}</div></div>`).join("")}function Ct(e,t){var l;const s=e.querySelector("#party-detail-panel");if(!t){s.innerHTML='<div class="srd-detail-empty"><div class="srd-empty-icon">🛡️</div><p>Select a party member to view their character sheet</p></div>';return}const a={...t,id:t.character_id||t.id};s.innerHTML=`
      <div class="party-remove-bar">
        <span class="party-from-town">📍 From ${t.town_name||"Party Camp"}</span>
        <button class="btn-danger btn-xs party-remove-btn" data-char-id="${t.character_id}">Remove from Party</button>
      </div>
      <div id="party-charsheet-area" style="flex:1;min-height:0;overflow:hidden;"></div>`;const n=s.querySelector("#party-charsheet-area");at(n,a,{onListRefresh:()=>lt(e),onDelete:async()=>{Re=null,await lt(e),Ct(e,null)},containerRef:e}),(l=s.querySelector(".party-remove-btn"))==null||l.addEventListener("click",async()=>{if(confirm(`Remove ${t.name} from the party?`))try{await $l(parseInt(t.character_id)),Re=null,await lt(e),Ct(e,null)}catch(i){alert("Error: "+i.message)}})}async function Gt(e,t,s=""){const a=e.querySelector("#recruit-char-list");if(!t){a.innerHTML='<div class="srd-detail-empty"><p>Select a town to browse characters</p></div>';return}a.innerHTML='<div class="srd-loading"><div class="spinner"></div>Loading...</div>';try{let l=(await P(`characters&town_id=${t}`)).characters||[];if(s&&(l=l.filter(i=>i.name.toLowerCase().includes(s.toLowerCase()))),!l.length){a.innerHTML='<div class="srd-detail-empty"><p>No characters found.</p></div>';return}a.innerHTML=l.map(i=>{const r=Ye.some(p=>parseInt(p.character_id)===parseInt(i.id));return`<div class="party-recruit-item ${r?"already-in-party":""}" data-char-id="${i.id}">
                <div class="party-recruit-info"><span class="party-recruit-name">${i.name}</span><span class="party-recruit-meta">${i.race||""} ${i.class||""} · ♥${i.hp||"?"} 🛡${i.ac||"?"}</span></div>
                ${r?'<span class="party-in-badge">In Party ✓</span>':`<button class="btn-primary btn-xs party-recruit-btn" data-char-id="${i.id}">+ Add</button>`}</div>`}).join("")}catch(n){a.innerHTML=`<p class="error">Error: ${n.message}</p>`}}function ar(e){const t=e.querySelector("#party-detail-panel");e.querySelector("#party-list-panel").style.display="none",t.style.flex="1",Xa(t),t.addEventListener("click",async s=>{if(s.target.id!=="cc-create-btn")return;const a=Ql();if(!a.name){alert("Please enter a character name.");return}try{const n=await P("save_character",{method:"POST",body:{town_id:Ya,character:a}});if(!n.ok)throw new Error(n.error||"Failed to save");await Fa(n.id),Va(),await lt(e),Ja(e,"roster"),Re=Ye.find(l=>parseInt(l.character_id)===n.id)||null,us(e),Ct(e,Re),Re||(t.innerHTML=`<div class="srd-detail-empty"><div class="srd-empty-icon">🎉</div><p><strong>${a.name}</strong> created and added to your party!</p></div>`)}catch(n){alert("Error creating character: "+n.message)}})}function Ja(e,t){var n;e.querySelectorAll(".party-tab").forEach(l=>l.classList.remove("active")),(n=e.querySelector(`[data-tab="${t}"]`))==null||n.classList.add("active"),e.querySelector("#party-tab-roster").style.display=t==="roster"?"":"none",e.querySelector("#party-tab-recruit").style.display=t==="recruit"?"":"none";const s=e.querySelector("#party-list-panel"),a=e.querySelector("#party-detail-panel");t==="create"?(s.style.display="none",a.style.flex="1"):(s.style.display="",a.style.flex="")}function nr(e){e.querySelectorAll(".party-tab").forEach(s=>s.addEventListener("click",()=>{const a=s.dataset.tab;Ja(e,a),a==="create"?(Va(),ar(e)):a==="roster"?Ct(e,Re):e.querySelector("#party-detail-panel").innerHTML='<div class="srd-detail-empty"><div class="srd-empty-icon">🏰</div><p>Select a town and add characters to your party</p></div>'})),e.querySelector("#party-member-list").addEventListener("click",s=>{const a=s.target.closest(".party-list-item");a&&(Re=Ye.find(n=>parseInt(n.character_id)===parseInt(a.dataset.charId))||null,us(e),Ct(e,Re))}),e.querySelector("#recruit-town-select").addEventListener("change",s=>Gt(e,parseInt(s.target.value)||0));let t=null;e.querySelector("#recruit-search").addEventListener("input",s=>{clearTimeout(t),t=setTimeout(()=>Gt(e,parseInt(e.querySelector("#recruit-town-select").value)||0,s.target.value.trim()),300)}),e.querySelector("#recruit-char-list").addEventListener("click",async s=>{const a=s.target.closest(".party-recruit-btn");if(a)try{await Fa(parseInt(a.dataset.charId)),await lt(e);const n=parseInt(e.querySelector("#recruit-town-select").value)||0;Gt(e,n,e.querySelector("#recruit-search").value.trim())}catch(n){alert("Error: "+n.message)}})}function ir(e){const t=[{id:"getting-started",icon:"🚀",title:"Getting Started",content:`
        <h4>Welcome to Eon Weaver!</h4>
        <p>Eon Weaver is an AI-powered living world simulator for D&D. Create towns, populate them with fully-statted NPCs, simulate months of events, and watch your world come alive between sessions.</p>
        
        <div class="help-steps">
          <div class="help-step">
            <span class="help-step-num">1</span>
            <div>
              <strong>Create a Campaign</strong>
              <p>On first login you'll create a campaign — give it a name and pick your D&D edition (3.5e, 5e 2014, or 5e 2024). You can switch between campaigns later from the sidebar.</p>
            </div>
          </div>
          <div class="help-step">
            <span class="help-step-num">2</span>
            <div>
              <strong>Create a Town</strong>
              <p>Go to the <strong>Dashboard</strong> and click <strong>"+ New Town"</strong>. Give it a name and optional subtitle.</p>
            </div>
          </div>
          <div class="help-step">
            <span class="help-step-num">3</span>
            <div>
              <strong>Configure Town Settings</strong>
              <p>Open your town, click <strong>⚙️ Settings</strong> to set the biome, demographics (race percentages), intake level, and generation rules <em>before</em> populating.</p>
            </div>
          </div>
          <div class="help-step">
            <span class="help-step-num">4</span>
            <div>
              <strong>Populate It</strong>
              <p>Use the <strong>AI Intake</strong> bar at the bottom of the roster. Enter a count (e.g. 20) and click Generate. Characters arrive fully statted with abilities, gear, feats, and backstories.</p>
            </div>
          </div>
          <div class="help-step">
            <span class="help-step-num">5</span>
            <div>
              <strong>Simulate Time</strong>
              <p>Go to <strong>🌍 World Simulate</strong>, select towns and months, then watch the AI generate events, relationships, births, deaths, construction, and drama. A live log modal shows progress as it runs.</p>
            </div>
          </div>
        </div>

        <div class="help-tip">
          💡 <strong>Tip:</strong> Set up your Campaign Description & House Rules in <strong>⚙️ Settings</strong> first — the AI uses these for every generation and simulation.
        </div>
      `},{id:"dashboard",icon:"🏠",title:"Dashboard",content:`
        <p>The Dashboard is your home base. It shows all your towns at a glance with population counts and quick actions.</p>
        
        <div class="help-feature">
          <strong>🏰 Town Cards</strong>
          <p>Each town displays its name, subtitle, and living population count. Click the card to open the town roster.</p>
        </div>
        <div class="help-feature">
          <strong>➕ New Town</strong>
          <p>Click "New Town" to create a new settlement. You can have as many towns as you want in a campaign.</p>
        </div>
        <div class="help-feature">
          <strong>⏩ Quick Simulate</strong>
          <p>Run a 1-month simulation directly from a town card without navigating away. Great for quick time advances.</p>
        </div>
        <div class="help-feature">
          <strong>📊 Stats</strong>
          <p>Jump directly to the Town Statistics page for any town to see race/class breakdowns, building status, and more.</p>
        </div>
      `},{id:"town-roster",icon:"🏰",title:"Town Roster",content:`
        <p>The Town Roster is where you manage all characters in a town. Split-panel layout: character list on the left, character sheet on the right.</p>
        
        <div class="help-feature">
          <strong>📋 Character List</strong>
          <p>Click column headers (NAME, RACE, CLASS, LVL, HP, AC, ALIGN) to sort. Use the search box and filter chips to find characters by race, class, or status.</p>
        </div>
        <div class="help-feature">
          <strong>🔍 Filters</strong>
          <p>Filter chips appear below the search bar showing race and class breakdowns. Click a chip to filter, click again to clear. Combine search text with chip filters.</p>
        </div>
        <div class="help-feature">
          <strong>👤 Character Detail</strong>
          <p>Click any character to open their full sheet on the right — stats, combat, feats, equipment, spells, social connections, XP log, and background.</p>
        </div>
        <div class="help-feature">
          <strong>⚰️ Living / Graveyard Tabs</strong>
          <p>Toggle between living characters and deceased. Dead characters are preserved in the graveyard with their cause of death for historical reference.</p>
        </div>
        <div class="help-feature">
          <strong>📖 History</strong>
          <p>Click "History" to open the Town History modal — a timeline of everything that has happened. Click any month to see its detail view with stat breakdowns (arrivals, births, deaths, events) and tabbed content.</p>
        </div>
        <div class="help-feature">
          <strong>⚙️ Town Settings</strong>
          <p>Configure biome, demographics, generation rules, and more. See the <strong>Town Settings</strong> topic for full details.</p>
        </div>
        <div class="help-feature">
          <strong>📊 Town Statistics</strong>
          <p>Click "Stats" to see detailed breakdowns — race distribution pie chart, class breakdown, age distribution, role assignments, and all buildings with construction status.</p>
        </div>
      `},{id:"town-settings",icon:"⚙️",title:"Town Settings",content:`
        <p>Each town has its own settings that influence AI character generation and simulation behavior. Access via the <strong>⚙️</strong> button in the town roster header.</p>
        
        <h4>Environment</h4>
        <div class="help-feature">
          <strong>🌍 Biome / Terrain</strong>
          <p>Select the environment type (forest, desert, arctic, coastal, mountain cave, urban, etc.). The AI only generates buildings and resources appropriate for this terrain. A desert town won't get fishing docks.</p>
        </div>

        <h4>Demographics</h4>
        <div class="help-feature">
          <strong>📊 Race Distribution</strong>
          <p>Set target percentages for each race (e.g., Goblinoid 75%, Human 15%, Halfling 10%). The AI is <strong>strictly required</strong> to follow these ratios when generating new characters. Percentages should total 100%.</p>
        </div>

        <h4>Generation Rules</h4>
        <div class="help-feature">
          <strong>🎚️ Default Intake Level</strong>
          <p>Set the starting level for new characters:</p>
          <ul class="help-list">
            <li><strong>0</strong> — AI picks an appropriate level (random 1-4 for humanoids, creature-appropriate for monsters)</li>
            <li><strong>1-20</strong> — All new characters arrive at exactly this level</li>
          </ul>
        </div>
        <div class="help-feature">
          <strong>🏔️ Max NPC Level</strong>
          <p>Cap the maximum level any NPC can reach (1-20). Prevents overpowered NPCs in low-level campaigns.</p>
        </div>
        <div class="help-feature">
          <strong>❤️ HP at Level Up</strong>
          <p>Choose how HP is calculated when NPCs level up: <strong>Roll</strong> (random), <strong>Average</strong> (standard), or <strong>Max</strong> (maximum hit die).</p>
        </div>
        <div class="help-feature">
          <strong>📚 Allowed Sources</strong>
          <p>Restrict character options to SRD-only or allow expanded content.</p>
        </div>
        <div class="help-feature">
          <strong>🎒 Starting Equipment</strong>
          <p>Set how much gear new characters arrive with: None, Basic, Standard, or Wealthy.</p>
        </div>
        <div class="help-feature">
          <strong>⚔️ Class Distribution</strong>
          <p>Control the mix of classes: Mostly Commoners, Balanced, or Adventurer-Heavy.</p>
        </div>
        <div class="help-feature">
          <strong>📝 Name Style</strong>
          <p>Influence naming conventions: High Fantasy, Cultural, Real-World, or Whimsical.</p>
        </div>
        <div class="help-feature">
          <strong>📜 Background Complexity</strong>
          <p>How detailed backstories should be: Simple, Standard, Detailed, or Epic.</p>
        </div>
        <div class="help-feature">
          <strong>👤 Age Distribution</strong>
          <p>Population age mix: Young, Prime, Full Range, or Elder-Heavy.</p>
        </div>
      `},{id:"ai-intake",icon:"👥",title:"AI Intake",content:`
        <p>The AI Intake bar at the bottom of the Town Roster generates new D&D-legal characters using AI. Characters arrive fully statted with abilities, HP, AC, feats, skills, spells, equipment, and backstory.</p>
        
        <div class="help-feature">
          <strong>🔢 Count</strong>
          <p>Set how many characters to generate (1-100). Large numbers are automatically batched into groups of 10.</p>
        </div>
        <div class="help-feature">
          <strong>📝 Instructions</strong>
          <p>Type custom instructions to guide generation. Examples:</p>
          <ul class="help-list">
            <li><code>all dwarves</code> — everyone will be a dwarf</li>
            <li><code>merchants and traders only</code> — specific professions</li>
            <li><code>a family of 4 with 2 parents and 2 children</code> — family groups</li>
            <li><code>all evil-aligned, rogues and assassins</code> — alignment + class</li>
            <li><code>noble elves with high CHA</code> — race + stat preferences</li>
            <li><code>a patrol of 5 guards, all fighters level 3</code> — specific class/level</li>
          </ul>
        </div>
        <div class="help-feature">
          <strong>🎲 Generate</strong>
          <p>Click Generate and the AI produces characters that respect your town's demographic targets, biome, and generation rules.</p>
        </div>
        <div class="help-tip">
          💡 <strong>Tip:</strong> Leave instructions blank for a natural, diverse population. The AI follows your town's demographics, biome, and name style automatically.
        </div>
      `},{id:"world-simulate",icon:"🌍",title:"World Simulate",content:`
        <p>The World Simulate page lets you advance time across <strong>all towns simultaneously</strong>. This is the primary way to move your world forward between sessions.</p>
        
        <div class="help-feature">
          <strong>🏰 Town Selection</strong>
          <p>All your towns appear as cards with checkboxes. Select which towns to include in the simulation. Each card shows the town name, population, and has a text area for town-specific instructions.</p>
        </div>
        <div class="help-feature">
          <strong>📝 Per-Town Instructions</strong>
          <p>Each town card has an instruction textarea. Use it for town-specific events: <code>"A mysterious plague spreads"</code> or <code>"A caravan of merchants arrives from the north"</code>.</p>
        </div>
        <div class="help-feature">
          <strong>⏱️ Duration</strong>
          <p>Choose 1-12 months to simulate. Multi-month simulations use AI planning to create story arcs that unfold over time.</p>
        </div>
        <div class="help-feature">
          <strong>👥 Forced Intake</strong>
          <p>Optionally add new residents at the start of the simulation before events begin.</p>
        </div>
        <div class="help-feature">
          <strong>📊 Live Simulation Log</strong>
          <p>When you click "Run World Simulation", a floating modal appears showing real-time progress with icons for each phase: intake, planning, monthly simulation, character movement, and completion. A progress bar tracks overall completion.</p>
        </div>
        <div class="help-feature">
          <strong>🚶 Inter-Town Movement</strong>
          <p>Characters can move between towns during simulation. About 20% of eligible residents (who've lived in town long enough) may relocate, with up to 2 moves per town per month. Town leaders (Mayors, Chieftains, etc.) never move.</p>
        </div>
        <div class="help-feature">
          <strong>📋 Tabbed Results</strong>
          <p>After simulation, results are organized in tabs:</p>
          <ul class="help-list">
            <li><strong>Narratives</strong> — Story prose for each town/month</li>
            <li><strong>Arrivals</strong> — New characters generated</li>
            <li><strong>Births</strong> — Children born during simulation</li>
            <li><strong>Deaths</strong> — Characters who died (with cause)</li>
            <li><strong>Events</strong> — Notable happenings</li>
            <li><strong>Movement</strong> — Characters who moved between towns</li>
          </ul>
        </div>
        <div class="help-tip">
          💡 <strong>Tip:</strong> Results are applied automatically after each month. The narrative and results are saved to the town's history for reference later.
        </div>
      `},{id:"town-history",icon:"📜",title:"Town History",content:`
        <p>The Town History modal (📖 button in the roster) shows a complete record of everything that has happened in your town. It works like a mini simulation summary for each month.</p>
        
        <div class="help-feature">
          <strong>📊 Overall Stats</strong>
          <p>At the top, stat boxes show total entries, living population, deceased count, and total characters ever created.</p>
        </div>
        <div class="help-feature">
          <strong>📜 Timeline Tab</strong>
          <p>A scrollable list of all months as clickable cards. Each card shows the month name, title, and mini-badges for arrivals, births, deaths, and events detected in that month's narrative.</p>
        </div>
        <div class="help-feature">
          <strong>🔎 Month Detail View</strong>
          <p>Click any month card to drill into its detail view with:</p>
          <ul class="help-list">
            <li>Per-month stat boxes (arrivals, births, deaths, events)</li>
            <li>Tabbed content: Narrative text, Arrivals table, Births table, Deaths table</li>
            <li>Character details matched against the actual character database</li>
            <li>"← Back to Timeline" button to return</li>
          </ul>
        </div>
        <div class="help-feature">
          <strong>🧑 Living / 💀 Deceased Tabs</strong>
          <p>Quick-access tables showing all currently alive characters and all deceased characters with their cause of death.</p>
        </div>
        <div class="help-feature">
          <strong>📅 Year Filter</strong>
          <p>Filter the timeline by year to quickly navigate to a specific period.</p>
        </div>
      `},{id:"character-sheet",icon:"📄",title:"Character Sheets",content:`
        <p>Click any character in the roster to see their detailed character sheet. The sheet is divided into tabs covering all aspects of the character.</p>
        
        <div class="help-feature">
          <strong>🎯 Core Stats</strong>
          <p>Ability scores (STR, DEX, CON, INT, WIS, CHA) with modifiers, HP with adjustable current HP, AC, saves, BAB, initiative, and speed. Click saves or skills to roll dice.</p>
        </div>
        <div class="help-feature">
          <strong>⚔️ Inventory & Feats</strong>
          <p>Equipment paperdoll with equip/unequip slots (Head, Body, Hands, Ring, Feet, Shield), backpack, coin purse (PP/GP/EP/SP/CP), and complete feats list. Equipping armor automatically updates AC.</p>
        </div>
        <div class="help-feature">
          <strong>✨ Spells</strong>
          <p>For spellcasting classes — spell slots per level, known/prepared spells list with descriptions. Shows spell save DC and caster level.</p>
        </div>
        <div class="help-feature">
          <strong>💕 Social</strong>
          <p>Relationships (friends, rivals, enemies, romantic partners, family, mentors, allies) with disposition scores. Memories of significant events. Add relationships and memories manually.</p>
        </div>
        <div class="help-feature">
          <strong>📈 XP Log</strong>
          <p>Monthly log of XP gains with reasons and game dates. Shows how a character has progressed over time through simulation.</p>
        </div>
        <div class="help-feature">
          <strong>📝 Background</strong>
          <p>Personal history, backstory, personality traits, and portrait. Upload custom portraits by clicking the portrait area.</p>
        </div>
        <div class="help-feature">
          <strong>Action Buttons</strong>
          <ul class="help-list">
            <li><strong>✏️ Edit</strong> — Modify any field (stats, name, race, class, etc.)</li>
            <li><strong>⬆️ Level Up</strong> — AI-assisted leveling wizard (see Level Up topic)</li>
            <li><strong>📄 PDF Export</strong> — Download a formatted character sheet PDF</li>
            <li><strong>🗑️ Delete</strong> — Permanently remove the character</li>
          </ul>
        </div>
      `},{id:"level-up",icon:"⬆️",title:"Level Up",content:`
        <p>The Level Up wizard handles all the complex calculations of D&D leveling. Access it from the ⬆️ button on any character sheet.</p>
        
        <div class="help-feature">
          <strong>🤖 AI-Assisted Leveling</strong>
          <p>The AI analyzes the character's class, race, existing feats, and backstory to make appropriate leveling choices including:</p>
          <ul class="help-list">
            <li>HP roll (based on your town's HP rule: Roll, Average, or Max)</li>
            <li>Skill point allocation</li>
            <li>Feat selection (at appropriate levels)</li>
            <li>New class features</li>
            <li>Spell selection for casters</li>
            <li>Ability score increases (at 4th, 8th, 12th, 16th, 20th level)</li>
          </ul>
        </div>
        <div class="help-feature">
          <strong>🏔️ Max Level Cap</strong>
          <p>Characters cannot level beyond the Max NPC Level set in Town Settings (default: 20).</p>
        </div>
        <div class="help-feature">
          <strong>📊 Auto Level-Up in Simulation</strong>
          <p>During simulation, characters who earn enough XP are automatically leveled up by the AI. The XP Log tracks all gains and reasons.</p>
        </div>
      `},{id:"social-system",icon:"💕",title:"Social System",content:`
        <p>Eon Weaver tracks a web of NPC-NPC relationships that evolve organically through simulation.</p>
        
        <div class="help-feature">
          <strong>Relationship Types</strong>
          <ul class="help-list">
            <li><strong>Romantic</strong> — Couples, lovers, betrothed</li>
            <li><strong>Parent</strong> — Parent-child family bonds</li>
            <li><strong>Friend</strong> — Close friends, drinking buddies</li>
            <li><strong>Rival</strong> — Professional competitors, jealous neighbours</li>
            <li><strong>Enemy</strong> — Hatred, blood feuds, bitter grudges</li>
            <li><strong>Mentor</strong> — Master/apprentice, teacher/student</li>
            <li><strong>Ally</strong> — Political or professional allies</li>
          </ul>
        </div>
        <div class="help-feature">
          <strong>📊 Disposition</strong>
          <p>Each relationship has a score (-10 to +10) indicating intensity. Positive = warm, negative = hostile. The AI evolves these over time.</p>
        </div>
        <div class="help-feature">
          <strong>🧠 Memories</strong>
          <p>Characters accumulate memories of events — both positive and negative. The AI references these in future simulations to create continuity and callbacks.</p>
        </div>
        <div class="help-feature">
          <strong>🏛️ Factions</strong>
          <p>NPCs can form factions based on shared interests, professions, or grievances. Factions have leaders, goals, and inter-faction diplomacy.</p>
        </div>
        <div class="help-tip">
          💡 <strong>Tip:</strong> Manually add a key relationship before simulating (e.g. making two characters enemies), and the AI will build on that tension in future simulations!
        </div>
      `},{id:"buildings",icon:"🏗️",title:"Buildings",content:`
        <p>Towns start as <strong>empty land with no structures</strong>. Buildings are constructed organically over time through simulation.</p>
        
        <div class="help-feature">
          <strong>🔨 Construction System</strong>
          <p>During simulations, the AI proposes building construction based on the town's needs, population, and resources. Each building has a realistic timeline:</p>
          <ul class="help-list">
            <li><strong>Small</strong> (shed, well, fence) — 1 month</li>
            <li><strong>Medium</strong> (house, shop, smithy) — 2-3 months</li>
            <li><strong>Large</strong> (temple, barracks, mill) — 4-6 months</li>
          </ul>
        </div>
        <div class="help-feature">
          <strong>📊 Progress Tracking</strong>
          <p>Buildings in progress show progress bars (e.g. "2/4 months — 50%"). They carry over between simulations and complete in future months.</p>
        </div>
        <div class="help-feature">
          <strong>🌍 Biome Awareness</strong>
          <p>The AI only proposes buildings appropriate for the town's biome. A desert town won't get fishing docks, and a coastal settlement won't get a mine.</p>
        </div>
        <div class="help-feature">
          <strong>⚠️ Damage & Destruction</strong>
          <p>Conflicts, raids, or natural disasters during simulation can damage or destroy existing buildings. Damaged buildings may need repair.</p>
        </div>
        <div class="help-tip">
          💡 <strong>Tip:</strong> Run multiple months of simulation to watch your settlement grow from empty ground into a thriving town with smithies, taverns, temples, and more!
        </div>
      `},{id:"encounters",icon:"⚔️",title:"Encounters",content:`
        <p>Plan and run combat encounters for your party. The encounter system helps you balance fights and track initiative.</p>
        
        <div class="help-feature">
          <strong>📋 Encounter List</strong>
          <p>Create encounters by name. Encounters save with their monster groups so you can prep ahead of time.</p>
        </div>
        <div class="help-feature">
          <strong>🐉 Add Monsters</strong>
          <p>Add SRD monsters to encounters. Search by name or CR. Adjust quantities and customize stats as needed.</p>
        </div>
        <div class="help-feature">
          <strong>⚖️ CR Calculator</strong>
          <p>See the total CR and difficulty rating for your party's average level.</p>
        </div>
        <div class="help-feature">
          <strong>🎯 Initiative Tracker</strong>
          <p>Roll initiative, track turn order, manage HP/damage, and apply conditions during combat. Click the ▶️ button to start the encounter.</p>
        </div>
      `},{id:"party",icon:"🛡️",title:"Party",content:`
        <p>The Party page lets you designate NPCs as player characters and track party composition across your campaign.</p>
        
        <div class="help-feature">
          <strong>➕ Add to Party</strong>
          <p>Select characters from any town to add to the active adventuring party. Characters can be in the party and still live in their town.</p>
        </div>
        <div class="help-feature">
          <strong>📊 Party Overview</strong>
          <p>See party stats, average level, and class composition at a glance. Click any party member to open their full character sheet.</p>
        </div>
        <div class="help-feature">
          <strong>🏠 Cross-Town</strong>
          <p>Party members can come from different towns. They'll still participate in their home town's simulations.</p>
        </div>
      `},{id:"srd-browser",icon:"📖",title:"SRD Browser",content:`
        <p>Browse the complete D&D System Reference Document. The SRD browser tabs adapt based on your campaign's selected edition.</p>
        
        <div class="help-feature">
          <strong>📊 Classes</strong>
          <p>Browse all base classes with full progression tables, class features, hit dice, skills, and descriptions.</p>
        </div>
        <div class="help-feature">
          <strong>🏅 Feats</strong>
          <p>Search and filter the feat list. See prerequisites, types (General, Fighter, Metamagic, etc.), and full descriptions.</p>
        </div>
        <div class="help-feature">
          <strong>✨ Spells</strong>
          <p>Complete spell database filterable by class, level, and school. Click any spell for its full stat block.</p>
        </div>
        <div class="help-feature">
          <strong>🎒 Equipment</strong>
          <p>Weapons, armor, adventuring gear — with stats, costs, weights, and properties.</p>
        </div>
        <div class="help-feature">
          <strong>🧠 Skills</strong>
          <p>Split-panel view with skill list and detailed descriptions including check DCs and special uses.</p>
        </div>
      `},{id:"calendar",icon:"📅",title:"Calendar",content:`
        <p>Track in-game time with a fully customizable calendar system.</p>
        
        <div class="help-feature">
          <strong>📆 Custom Calendar</strong>
          <p>Configure the number of months per year, days per month, year number, era name, and set custom month names to match your campaign world (e.g. Forgotten Realms calendar).</p>
        </div>
        <div class="help-feature">
          <strong>⏩ Auto-Advance</strong>
          <p>The calendar automatically advances when you run simulations. The current date is always shown in the sidebar.</p>
        </div>
        <div class="help-feature">
          <strong>📊 History Integration</strong>
          <p>History entries use calendar month names in their headings, so you can see exactly when events happened in your world's timeline.</p>
        </div>
      `},{id:"campaigns",icon:"📜",title:"Campaigns",content:`
        <p>Campaigns are top-level containers for your entire world. Each campaign has its own set of towns, characters, calendar, and rules.</p>
        
        <div class="help-feature">
          <strong>🔄 Switching Campaigns</strong>
          <p>Click the campaign name in the sidebar to open the campaign switcher dropdown. Click any campaign to instantly switch to it — all views update to show that campaign's data.</p>
        </div>
        <div class="help-feature">
          <strong>➕ Creating Campaigns</strong>
          <p>Create new campaigns from <strong>⚙️ Settings</strong>. Each campaign gets its own D&D edition, calendar, house rules, and simulation settings.</p>
        </div>
        <div class="help-feature">
          <strong>🎲 Edition Support</strong>
          <p>Eon Weaver supports multiple D&D editions:</p>
          <ul class="help-list">
            <li><strong>D&D 3.5e</strong> — Full SRD with classes, feats, spells, skills, equipment</li>
            <li><strong>D&D 5e 2014</strong> — 5th Edition SRD content</li>
            <li><strong>D&D 5e 2024</strong> — Revised 5th Edition SRD</li>
          </ul>
        </div>
      `},{id:"settings",icon:"⚙️",title:"Campaign Settings",content:`
        <p>Configure campaign-wide settings that apply to all towns and simulations.</p>
        
        <div class="help-feature">
          <strong>🌍 Campaign Description & House Rules</strong>
          <p>Describe your world setting and define house rules. These are automatically fed to the AI during <em>all</em> simulations and character generation. Great for setting tone, lore, and special world rules.</p>
        </div>
        <div class="help-feature">
          <strong>⚡ Simulation Settings</strong>
          <p>Fine-tune simulation behavior:</p>
          <ul class="help-list">
            <li><strong>XP Speed</strong> — How fast characters gain experience</li>
            <li><strong>Relationship Speed</strong> — How quickly NPCs form bonds</li>
            <li><strong>Birth Rate</strong> — How often children are born</li>
            <li><strong>Death Threshold</strong> — Population cap before death rate increases</li>
            <li><strong>Child Growth</strong> — How fast children mature</li>
            <li><strong>Conflict Frequency</strong> — How much drama, violence, and strife occurs</li>
          </ul>
        </div>
        <div class="help-feature">
          <strong>📜 Campaign Management</strong>
          <p>Create, rename, and delete campaigns. Switch between campaigns from the sidebar dropdown.</p>
        </div>
        <div class="help-tip">
          💡 <strong>Tip:</strong> Set Conflict Frequency to "Frequent" for a grittier, more dangerous world. Set it to "Rare" for a peaceful farming village vibe.
        </div>
      `},{id:"pdf-export",icon:"📄",title:"PDF Export",content:`
        <p>Export any character as a formatted PDF character sheet, ready for printing or sharing with your players.</p>
        
        <div class="help-feature">
          <strong>📄 How to Export</strong>
          <p>Open a character sheet, then click the <strong>📄 PDF</strong> button in the action bar. The PDF is generated client-side and downloaded immediately.</p>
        </div>
        <div class="help-feature">
          <strong>📊 What's Included</strong>
          <p>The PDF contains all character data: ability scores, combat stats, feats, skills, spells, equipment, backstory, and portrait (if uploaded).</p>
        </div>
      `},{id:"tips",icon:"⌨️",title:"Tips & Tricks",content:`
        <div class="help-feature">
          <strong>🔄 Hard Refresh</strong>
          <p>If the site isn't showing recent updates, press <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd> to force-refresh cached assets.</p>
        </div>
        <div class="help-feature">
          <strong>🏗️ Fresh Towns Start Empty</strong>
          <p>New towns have no buildings — settlers arrive first, then construction begins through simulation. This creates a natural town development arc.</p>
        </div>
        <div class="help-feature">
          <strong>⚔️ Equip Gear = Roster Update</strong>
          <p>Equipping or unequipping items on a character's sheet instantly updates their AC in the town roster.</p>
        </div>
        <div class="help-feature">
          <strong>🎲 Click to Roll</strong>
          <p>In character sheets, click saves, skills, or attack entries to roll dice. Results appear in the Roll Log at the bottom of the sheet.</p>
        </div>
        <div class="help-feature">
          <strong>💾 Auto-Save</strong>
          <p>Character edits save when you click "Save" in the edit modal. Simulation changes are applied automatically per-month during World Simulate.</p>
        </div>
        <div class="help-feature">
          <strong>🌍 Town Setup Checklist</strong>
          <p>For the best experience with a new town:</p>
          <ul class="help-list">
            <li>Set the <strong>biome/terrain</strong> in Town Settings before generating characters</li>
            <li>Set <strong>demographic targets</strong> for the race mix you want</li>
            <li>Configure <strong>intake level</strong> (0 = AI decides, or set a specific level)</li>
            <li>Write <strong>Campaign Description & House Rules</strong> in Settings for lore-consistent generation</li>
            <li>Generate initial settlers, then <strong>simulate several months</strong> to build up the town organically</li>
          </ul>
        </div>
        <div class="help-feature">
          <strong>🐛 Bug Reports</strong>
          <p>Found a bug? Click the <strong>🐛 Report Bug</strong> button in the sidebar footer. Reports are sent directly to the development team via Discord.</p>
        </div>
        <div class="help-feature">
          <strong>📱 Mobile</strong>
          <p>Eon Weaver works on mobile devices, but the full experience (split-panel roster, character sheets) is designed for desktop browsers.</p>
        </div>
      `}];let s=t[0].id;e.innerHTML=`
    <div class="view-help">
      <div class="help-header">
        <h1 class="help-title">📚 Eon Weaver Guide</h1>
        <p class="help-subtitle">Select a topic to learn more</p>
      </div>
      
      <div class="help-tabbed-layout">
        <div class="help-tab-list" id="help-tab-list">
          ${t.map(a=>`
            <button class="help-tab-btn${a.id===s?" active":""}" data-tab="${a.id}">
              <span class="help-tab-icon">${a.icon}</span>
              <span class="help-tab-label">${a.title}</span>
            </button>
          `).join("")}
        </div>
        <div class="help-tab-content" id="help-tab-content">
          <div class="help-content-header">
            <span class="help-content-icon">${t[0].icon}</span>
            <h2 class="help-content-title">${t[0].title}</h2>
          </div>
          <div class="help-content-body">
            ${t[0].content}
          </div>
        </div>
      </div>
    </div>
  `,e.querySelectorAll(".help-tab-btn").forEach(a=>{a.addEventListener("click",()=>{const n=a.dataset.tab,l=t.find(r=>r.id===n);if(!l)return;e.querySelectorAll(".help-tab-btn").forEach(r=>r.classList.remove("active")),a.classList.add("active");const i=e.querySelector("#help-tab-content");i.innerHTML=`
        <div class="help-content-header">
          <span class="help-content-icon">${l.icon}</span>
          <h2 class="help-content-title">${l.title}</h2>
        </div>
        <div class="help-content-body">
          ${l.content}
        </div>
      `})})}

export default Fi;
export { Fi as renderTownView };
