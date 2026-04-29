import{apiGetSocialData as f,apiSaveFaction as S,apiSaveIncident as w,apiSaveReputation as _,apiSaveFactionRelation as x,apiSaveFactionMember as C}from"./social-BXKEC03o.js";import{s as d,b as q}from"./index-DC0rDkAm.js";const b={guild:"⚒️",religious:"⛪",military:"⚔️",criminal:"🗡️",political:"🏛️",social:"🤝",merchant:"💰",academic:"📚",arcane:"🔮",other:"📌"},h={theft:"💰",murder:"💀",sabotage:"🔥",mystery:"🔍",conspiracy:"🕸️",assault:"👊",fraud:"📝",general:"⚡"},$={alliance:"🤝",rivalry:"⚡",war:"⚔️",trade:"💰",vassal:"👑",neutral:"➖",hostile:"💢"};async function A(a){let o=null,l=[];const{el:t,close:c}=d({title:"🏘️ Town Social Overview",width:"wide",content:'<div class="cs-loading" style="padding:2rem;text-align:center;">Loading social data...</div>'}),i=(e,s,n)=>Promise.race([e,new Promise((r,u)=>setTimeout(()=>u(new Error(`${n} timed out after ${s/1e3}s`)),s))]);try{const[e,s]=await Promise.all([i(f(a),15e3,"Social data fetch"),i(q(a),15e3,"Character list fetch")]);o=e,l=s.characters||[]}catch(e){console.error("[TownSocialPanel] Load failed:",e),t&&(t.innerHTML=`<div class="social-empty">❌ Failed to load: ${e.message}</div>`);return}!t||!t.parentNode||g(t,o,a,l)}function g(a,o,l,t){var n,r,u;const c=o.factions||[],i=o.incidents||[],e=o.reputation||[],s=o.relationships||[];a.innerHTML=`
    <div class="town-social-panel">
      <!-- Factions -->
      <div class="town-social-section" id="tsp-factions">
        <div class="town-social-section-title">
          <span class="section-icon">⚒️</span> Factions
          <span class="section-count">${c.length}</span>
        </div>
        <div id="tsp-faction-list" class="social-faction-list">
          ${c.length?c.map(p=>R(p)).join(""):'<div class="social-empty"><div class="social-empty-icon">⚒️</div>No factions yet</div>'}
        </div>
        <div class="social-add-bar">
          <button class="social-add-btn" id="tsp-add-faction-btn">+ Create Faction</button>
        </div>
      </div>

      <!-- Incidents -->
      <div class="town-social-section" id="tsp-incidents">
        <div class="town-social-section-title">
          <span class="section-icon">🔍</span> Incidents & Mysteries
          <span class="section-count">${i.length}</span>
        </div>
        <div id="tsp-incident-list" class="social-incident-list">
          ${i.length?i.map(N).join(""):'<div class="social-empty"><div class="social-empty-icon">🔍</div>No incidents yet</div>'}
        </div>
        <div class="social-add-bar">
          <button class="social-add-btn" id="tsp-add-incident-btn">+ Report Incident</button>
        </div>
      </div>

      <!-- Reputation -->
      <div class="town-social-section" id="tsp-reputation">
        <div class="town-social-section-title">
          <span class="section-icon">⭐</span> PC Reputation
          <span class="section-count">${e.length}</span>
        </div>
        <div id="tsp-rep-list" class="social-rep-list">
          ${e.length?e.map(I).join(""):'<div class="social-empty"><div class="social-empty-icon">⭐</div>No reputation tracked yet</div>'}
        </div>
        <div class="social-add-bar">
          <button class="social-add-btn" id="tsp-add-rep-btn">+ Track PC Reputation</button>
        </div>
      </div>

      <!-- Relationship Network Summary -->
      <div class="town-social-section" id="tsp-relationships">
        <div class="town-social-section-title">
          <span class="section-icon">🤝</span> Relationship Network
          <span class="section-count">${s.length}</span>
        </div>
        <div id="tsp-rel-summary" class="social-rel-list">
          ${F(s)}
        </div>
      </div>
    </div>
  `,(n=a.querySelector("#tsp-add-faction-btn"))==null||n.addEventListener("click",()=>{M(l,t,()=>m(a,l,t))}),(r=a.querySelector("#tsp-add-incident-btn"))==null||r.addEventListener("click",()=>{j(l,t,()=>m(a,l,t))}),(u=a.querySelector("#tsp-add-rep-btn"))==null||u.addEventListener("click",()=>{L(l,t,()=>m(a,l,t))}),a.querySelectorAll(".faction-add-rel-btn").forEach(p=>{p.addEventListener("click",v=>{const y=parseInt(v.target.dataset.factionId);P(y,c,l,()=>m(a,l,t))})}),a.querySelectorAll(".faction-add-member-btn").forEach(p=>{p.addEventListener("click",v=>{const y=parseInt(v.target.dataset.factionId);T(y,t,()=>m(a,l,t))})})}async function m(a,o,l){try{const t=await f(o);g(a,t,o,l)}catch(t){console.error("Failed to refresh:",t)}}function R(a,o){const l=b[a.faction_type]||"📌",t=a.members||[],c=a.relations||[],i=t.find(e=>e.role==="leader");return`
    <div class="social-faction-card" data-faction-id="${a.id}">
      <div class="faction-header">
        <span class="faction-icon">${l}</span>
        <span class="faction-name">${a.name}</span>
        <span class="faction-influence">⚡ ${a.influence}/10</span>
      </div>
      <div class="faction-desc">${a.description||"No description"}${a.public_goal?" — Goal: "+a.public_goal:""}</div>
      ${i?`<div class="faction-desc" style="color:var(--accent)">👑 Leader: ${i.character_name}</div>`:""}
      <div class="faction-members-row">
        ${t.map(e=>`<span class="faction-member-badge${e.role==="leader"?" leader":""}" title="${e.role}">${e.character_name}</span>`).join("")}
        <button class="social-add-btn faction-add-member-btn" data-faction-id="${a.id}" style="font-size:0.62rem;padding:1px 6px;">+ Member</button>
      </div>
      ${c.length?`
        <div style="margin-top:0.5rem;border-top:1px solid rgba(255,255,255,0.06);padding-top:0.4rem;">
          <div style="font-size:0.7rem;color:var(--text-secondary);margin-bottom:0.25rem;">Diplomatic Relations:</div>
          ${c.map(e=>{const s=$[e.relation_type]||"➖",n=parseInt(e.disposition)||0;return`<div style="font-size:0.7rem;display:flex;gap:0.4rem;align-items:center;">
              <span>${s}</span>
              <span style="color:var(--text-primary)">${e.target_name}</span>
              <span style="color:var(--text-secondary)">${e.relation_type} (${n>0?"+":""}${n})</span>
            </div>`}).join("")}
        </div>
      `:""}
      <div class="social-add-bar" style="margin-top:0.4rem;">
        <button class="social-add-btn faction-add-rel-btn" data-faction-id="${a.id}" style="font-size:0.62rem;padding:1px 6px;">+ Diplomacy</button>
      </div>
    </div>
  `}function N(a){const o=h[a.incident_type]||"⚡",l=(a.status||"active").toLowerCase(),t=a.participants||[],c=a.clues||[],i=t.find(n=>n.role==="perpetrator"),e=t.find(n=>n.role==="victim"),s=t.filter(n=>n.role==="witness");return`
    <div class="social-incident-card" data-status="${l}" data-incident-id="${a.id}">
      <div class="incident-header">
        <span class="incident-type-badge ${a.incident_type}">${o} ${a.incident_type}</span>
        <span class="incident-summary">${a.summary}</span>
        <span class="incident-status-badge ${l}">${a.status}</span>
      </div>
      <div class="incident-severity">Severity: ${"⬤".repeat(Math.min(a.severity,5))}${"○".repeat(5-Math.min(a.severity,5))}</div>
      ${i?`<div style="font-size:0.72rem;color:var(--text-secondary);">🗡️ Perpetrator: <span style="color:#ff5252">${i.character_name}</span></div>`:""}
      ${e?`<div style="font-size:0.72rem;color:var(--text-secondary);">🎯 Victim: <span style="color:#ffab40">${e.character_name}</span></div>`:""}
      ${s.length?`<div style="font-size:0.72rem;color:var(--text-secondary);">👁️ Witnesses: ${s.map(n=>n.character_name).join(", ")}</div>`:""}
      ${c.length?`
        <div class="incident-clues">
          ${c.map(n=>`
            <div class="clue-item${n.found_by_pc?" found":""}${n.is_red_herring?" red-herring":""}">
              <span class="clue-icon">🔎</span>
              <span>${n.clue_text}${n.is_red_herring?" (red herring)":""}</span>
            </div>
          `).join("")}
        </div>
      `:""}
    </div>
  `}function I(a){const o=parseInt(a.score)||0,l=Math.abs(o)*10,t=o>=5?"#66bb6a":o>=0?"#f5c518":o>=-5?"#ff9800":"#ff5252";return`
    <div class="social-rep-row">
      <span class="rep-pc-name">${a.pc_name}</span>
      <div class="rep-bar">
        <div class="rep-bar-fill" style="width:${l}%;background:${t}"></div>
      </div>
      <span class="rep-reason">${a.source?a.source+": ":""}${o>0?"+":""}${o} — ${a.reason||"No reason"}</span>
    </div>
  `}function F(a){if(!a.length)return'<div class="social-empty"><div class="social-empty-icon">🤝</div>No NPC relationships tracked</div>';const o={};a.forEach(i=>{const e=i.rel_type||"acquaintance";o[e]=(o[e]||0)+1});const l={friend:"🤝",rival:"⚡",enemy:"⚔️",romantic:"❤️",mentor:"📚",student:"📖",ally:"🤜",acquaintance:"👋",family:"👨‍👩‍👧"};let t='<div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.75rem;">';for(const[i,e]of Object.entries(o))t+=`<span class="faction-member-badge" style="font-size:0.72rem;">${l[i]||"👋"} ${i}: ${e}</span>`;t+="</div>";const c=[...a].sort((i,e)=>Math.abs(e.disposition||0)-Math.abs(i.disposition||0));return t+=c.slice(0,10).map(i=>{const e=l[i.rel_type]||"👋",s=parseInt(i.disposition)||0;let n="neutral";return s>=7?n="close":s>=3?n="friendly":s<=-7?n="hostile":s<=-3&&(n="unfriendly"),`<div class="social-rel-card" data-type="${i.rel_type}" style="animation-delay:0ms">
      <div class="rel-icon">${e}</div>
      <div class="rel-info">
        <div class="rel-names">${i.char1_name} ↔ ${i.char2_name}</div>
        <div class="rel-type">${i.rel_type}${i.reason?" — "+i.reason:""}</div>
      </div>
      <div class="rel-disposition ${n}" title="Disposition: ${s}/10">${s>0?"+":""}${s}</div>
    </div>`}).join(""),a.length>10&&(t+=`<div style="text-align:center;font-size:0.72rem;color:var(--text-secondary);padding:0.5rem;">...and ${a.length-10} more</div>`),t}function M(a,o,l){var i;const{el:t,close:c}=d({title:"⚒️ Create Faction",width:"narrow",content:`<div class="modal-form">
      <label>Faction Name</label>
      <input type="text" id="fac-name" class="form-input" placeholder="e.g. The Iron Fellowship">
      <label>Type</label>
      <select id="fac-type" class="form-select">
        ${Object.keys(b).map(e=>`<option value="${e}">${e.charAt(0).toUpperCase()+e.slice(1)}</option>`).join("")}
      </select>
      <label>Description</label>
      <textarea id="fac-desc" class="form-input" rows="2" placeholder="What is this faction about?"></textarea>
      <label>Public Goal</label>
      <input type="text" id="fac-goal" class="form-input" placeholder="What does the public think they want?">
      <label>Influence (1-10)</label>
      <input type="number" id="fac-inf" class="form-input" value="3" min="1" max="10">
      <label>Leader (optional)</label>
      <select id="fac-leader" class="form-select">
        <option value="">— None —</option>
        ${o.map(e=>`<option value="${e.id}">${e.name}</option>`).join("")}
      </select>
      <button class="btn-primary" id="fac-save-btn" style="margin-top:0.75rem;width:100%">Create Faction</button>
    </div>`});(i=t.querySelector("#fac-save-btn"))==null||i.addEventListener("click",async()=>{const e=t.querySelector("#fac-name").value.trim();if(!e)return alert("Name required");const s=t.querySelector("#fac-save-btn");s.disabled=!0,s.textContent="Creating...";try{await S({town_id:a,name:e,faction_type:t.querySelector("#fac-type").value,description:t.querySelector("#fac-desc").value,public_goal:t.querySelector("#fac-goal").value,influence:parseInt(t.querySelector("#fac-inf").value)||3,leader_id:t.querySelector("#fac-leader").value||null}),c(),l()}catch(n){alert(n.message),s.disabled=!1,s.textContent="Create Faction"}})}function j(a,o,l){var i;const{el:t,close:c}=d({title:"🔍 Report Incident",width:"narrow",content:`<div class="modal-form">
      <label>Type</label>
      <select id="inc-type" class="form-select">
        ${Object.entries(h).map(([e,s])=>`<option value="${e}">${s} ${e.charAt(0).toUpperCase()+e.slice(1)}</option>`).join("")}
      </select>
      <label>Summary</label>
      <textarea id="inc-summary" class="form-input" rows="2" placeholder="What happened?"></textarea>
      <label>Severity (1-10)</label>
      <input type="number" id="inc-severity" class="form-input" value="3" min="1" max="10">
      <label>Motive (optional)</label>
      <input type="text" id="inc-motive" class="form-input" placeholder="Why did it happen?">
      <label>Perpetrator (optional)</label>
      <select id="inc-perp" class="form-select">
        <option value="">— Unknown —</option>
        ${o.map(e=>`<option value="${e.id}">${e.name}</option>`).join("")}
      </select>
      <label>Victim (optional)</label>
      <select id="inc-victim" class="form-select">
        <option value="">— None —</option>
        ${o.map(e=>`<option value="${e.id}">${e.name}</option>`).join("")}
      </select>
      <button class="btn-primary" id="inc-save-btn" style="margin-top:0.75rem;width:100%">Report Incident</button>
    </div>`});(i=t.querySelector("#inc-save-btn"))==null||i.addEventListener("click",async()=>{const e=t.querySelector("#inc-summary").value.trim();if(!e)return alert("Summary required");const s=t.querySelector("#inc-save-btn");s.disabled=!0,s.textContent="Saving...";try{await w({town_id:a,incident_type:t.querySelector("#inc-type").value,summary:e,severity:parseInt(t.querySelector("#inc-severity").value)||3,motive:t.querySelector("#inc-motive").value,status:"active"}),c(),l()}catch(n){alert(n.message),s.disabled=!1,s.textContent="Report Incident"}})}function L(a,o,l){var i;const{el:t,close:c}=d({title:"⭐ Track PC Reputation",width:"narrow",content:`<div class="modal-form">
      <label>PC Name</label>
      <input type="text" id="rep-pc" class="form-input" placeholder="Player character name">
      <label>Source (who/what judges them)</label>
      <select id="rep-source-type" class="form-select">
        <option value="npc">NPC</option>
        <option value="faction">Faction</option>
        <option value="town">Town</option>
      </select>
      <label>Score (-10 to 10)</label>
      <input type="number" id="rep-score" class="form-input" value="0" min="-10" max="10">
      <label>Reason</label>
      <input type="text" id="rep-reason" class="form-input" placeholder="Why do they feel this way?">
      <button class="btn-primary" id="rep-save-btn" style="margin-top:0.75rem;width:100%">Save Reputation</button>
    </div>`});(i=t.querySelector("#rep-save-btn"))==null||i.addEventListener("click",async()=>{const e=t.querySelector("#rep-pc").value.trim();if(!e)return alert("PC name required");const s=t.querySelector("#rep-save-btn");s.disabled=!0,s.textContent="Saving...";try{await _({town_id:a,pc_name:e,source_type:t.querySelector("#rep-source-type").value,score:parseInt(t.querySelector("#rep-score").value)||0,reason:t.querySelector("#rep-reason").value}),c(),l()}catch(n){alert(n.message),s.disabled=!1,s.textContent="Save Reputation"}})}function P(a,o,l,t){var s;const c=o.filter(n=>n.id!==a);if(!c.length)return alert("No other factions exist to create a relation with.");const{el:i,close:e}=d({title:"🏛️ Add Diplomatic Relation",width:"narrow",content:`<div class="modal-form">
      <label>Target Faction</label>
      <select id="frel-target" class="form-select">
        ${c.map(n=>`<option value="${n.id}">${n.name}</option>`).join("")}
      </select>
      <label>Relation Type</label>
      <select id="frel-type" class="form-select">
        ${Object.entries($).map(([n,r])=>`<option value="${n}">${r} ${n.charAt(0).toUpperCase()+n.slice(1)}</option>`).join("")}
      </select>
      <label>Disposition (-10 to 10)</label>
      <input type="number" id="frel-disp" class="form-input" value="0" min="-10" max="10">
      <button class="btn-primary" id="frel-save-btn" style="margin-top:0.75rem;width:100%">Save Relation</button>
    </div>`});(s=i.querySelector("#frel-save-btn"))==null||s.addEventListener("click",async()=>{const n=i.querySelector("#frel-save-btn");n.disabled=!0,n.textContent="Saving...";try{await x({faction_id:a,target_faction_id:parseInt(i.querySelector("#frel-target").value),relation_type:i.querySelector("#frel-type").value,disposition:parseInt(i.querySelector("#frel-disp").value)||0}),e(),t()}catch(r){alert(r.message),n.disabled=!1,n.textContent="Save Relation"}})}function T(a,o,l){var i;const{el:t,close:c}=d({title:"👤 Add Faction Member",width:"narrow",content:`<div class="modal-form">
      <label>Character</label>
      <select id="fmem-char" class="form-select">
        ${o.map(e=>`<option value="${e.id}">${e.name}</option>`).join("")}
      </select>
      <label>Role</label>
      <select id="fmem-role" class="form-select">
        <option value="member">Member</option>
        <option value="leader">Leader</option>
        <option value="officer">Officer</option>
        <option value="recruit">Recruit</option>
        <option value="spy">Spy</option>
        <option value="informant">Informant</option>
      </select>
      <label>Loyalty (1-10)</label>
      <input type="number" id="fmem-loyalty" class="form-input" value="5" min="1" max="10">
      <button class="btn-primary" id="fmem-save-btn" style="margin-top:0.75rem;width:100%">Add Member</button>
    </div>`});(i=t.querySelector("#fmem-save-btn"))==null||i.addEventListener("click",async()=>{const e=t.querySelector("#fmem-save-btn");e.disabled=!0,e.textContent="Adding...";try{await C({faction_id:a,character_id:parseInt(t.querySelector("#fmem-char").value),role:t.querySelector("#fmem-role").value,loyalty:parseInt(t.querySelector("#fmem-loyalty").value)||5}),c(),l()}catch(s){alert(s.message),e.disabled=!1,e.textContent="Add Member"}})}export{A as openTownSocialPanel};
