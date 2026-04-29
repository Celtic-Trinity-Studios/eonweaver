import{s as f,a as C,b as q,c as A,d as R,e as w,f as B,g as L}from"./index-DC0rDkAm.js";const g={tavern:"🍺",inn:"🛏️",shop:"🏪",temple:"⛪",shrine:"🕯️",guild:"⚒️",barracks:"🏰",residence:"🏠",mansion:"🏛️",farm:"🌾",stable:"🐴",warehouse:"📦",market:"🧺",smithy:"⚔️",library:"📚",tower:"🗼",prison:"⛓️",cemetery:"⚰️",dock:"⚓",gate:"🚪",wall:"🧱",other:"🏗️"},P=["common","bedroom","kitchen","storage","workshop","cellar","attic","office","chapel","armory","stable","courtyard","dungeon","throne","other"],D={completed:"#66bb6a",under_construction:"#ffab40",planned:"#90a4ae",damaged:"#ff9800",destroyed:"#ff5252"};async function N(a){let s=[],e=[];const{el:l,close:p}=f({title:"🏘️ Town Buildings & Rooms",width:"wide",content:'<div class="cs-loading" style="padding:2rem;text-align:center;">Loading buildings...</div>'});try{const[r,c]=await Promise.all([C(a),q(a)]);s=r.buildings||[],e=(c.characters||[]).filter(t=>t.status!=="Deceased")}catch(r){console.error("[BuildingsPanel] Load failed:",r),l&&(l.innerHTML=`<div class="bld-empty">❌ Failed to load: ${r.message}</div>`);return}!l||!l.parentNode||E(l,s,a,e)}function E(a,s,e,l){var c;const p=new Set;s.forEach(t=>(t.residents||[]).forEach(i=>p.add(i.id)));const r=l.filter(t=>!p.has(t.id));s.filter(t=>t.status==="completed"),s.filter(t=>t.status!=="completed"),a.innerHTML=`
    <div class="bld-panel">
      <div class="bld-summary-bar">
        <span class="bld-stat">🏗️ <strong>${s.length}</strong> building${s.length!==1?"s":""}</span>
        <span class="bld-stat">👥 <strong>${l.length-r.length}</strong> assigned</span>
        <span class="bld-stat bld-stat-warn">🚶 <strong>${r.length}</strong> unassigned</span>
      </div>

      <div class="bld-grid" id="bld-grid">
        ${s.length?s.map(t=>O(t)).join(""):'<div class="bld-empty"><div class="bld-empty-icon">🏗️</div>No buildings yet — add one below</div>'}
      </div>

      ${r.length?`
        <div class="bld-unassigned-section">
          <div class="bld-section-title">🚶 Unassigned Characters <span class="bld-count">${r.length}</span></div>
          <div class="bld-unassigned-list">
            ${r.map(t=>`<span class="bld-char-badge" data-char-id="${t.id}" title="${t.race||""} ${t.class||""} ${t.level||""}">${t.name}</span>`).join("")}
          </div>
        </div>
      `:""}

      <div class="bld-add-bar">
        <button class="social-add-btn bld-add-btn" id="bld-add-building-btn">+ Add Building</button>
      </div>
    </div>
  `,(c=a.querySelector("#bld-add-building-btn"))==null||c.addEventListener("click",()=>{S(e,l,null,()=>v(a,e,l))}),a.querySelectorAll(".bld-card").forEach(t=>{var u,m,d,b;const i=parseInt(t.dataset.buildingId),o=s.find(n=>parseInt(n.id)===i);o&&((u=t.querySelector(".bld-edit-btn"))==null||u.addEventListener("click",n=>{n.stopPropagation(),S(e,l,o,()=>v(a,e,l))}),(m=t.querySelector(".bld-delete-btn"))==null||m.addEventListener("click",async n=>{if(n.stopPropagation(),!!confirm(`Delete "${o.name}"? Characters will be unassigned.`))try{await A(e,i),v(a,e,l)}catch(h){alert(h.message)}}),(d=t.querySelector(".bld-add-room-btn"))==null||d.addEventListener("click",n=>{n.stopPropagation(),_(i,null,()=>v(a,e,l))}),(b=t.querySelector(".bld-assign-btn"))==null||b.addEventListener("click",n=>{n.stopPropagation(),j(e,i,o.name,l,s,()=>v(a,e,l))}),t.querySelectorAll(".bld-room-edit").forEach(n=>{n.addEventListener("click",h=>{h.stopPropagation();const $=parseInt(n.dataset.roomId),y=(o.rooms||[]).find(k=>parseInt(k.id)===$);y&&_(i,y,()=>v(a,e,l))})}),t.querySelectorAll(".bld-room-del").forEach(n=>{n.addEventListener("click",async h=>{h.stopPropagation();const $=parseInt(n.dataset.roomId);if(confirm("Delete this room?"))try{await R(i,$),v(a,e,l)}catch(y){alert(y.message)}})}),t.querySelectorAll(".bld-resident-remove").forEach(n=>{n.addEventListener("click",async h=>{h.stopPropagation();const $=parseInt(n.dataset.charId);try{await w(e,$,null),v(a,e,l)}catch(y){alert(y.message)}})}))})}function O(a,s){const e=g[a.building_type]||g.other,l=D[a.status]||"#888",p=(a.status||"completed").replace(/_/g," "),r=a.rooms||[],c=a.residents||[];return`
    <div class="bld-card" data-building-id="${a.id}" data-status="${a.status||"completed"}">
      <div class="bld-card-header">
        <span class="bld-card-icon">${e}</span>
        <div class="bld-card-info">
          <div class="bld-card-name">${a.name}</div>
          <div class="bld-card-type">${(a.building_type||"other").replace(/_/g," ")}${a.owner_name?" — 👤 "+a.owner_name:""}</div>
        </div>
        <span class="bld-status-badge" style="background:${l}22;color:${l};border:1px solid ${l}44">${p}</span>
        <div class="bld-card-actions">
          <button class="bld-action-btn bld-edit-btn" title="Edit">✏️</button>
          <button class="bld-action-btn bld-delete-btn" title="Delete">🗑️</button>
        </div>
      </div>
      ${a.description?`<div class="bld-card-desc">${a.description}</div>`:""}

      ${a.status==="under_construction"?`
        <div class="bld-progress-wrap">
          <div class="bld-progress-bar">
            <div class="bld-progress-fill" style="width:${Math.min(100,(a.build_progress||0)/Math.max(1,a.build_time||1)*100)}%"></div>
          </div>
          <span class="bld-progress-label">${a.build_progress||0}/${a.build_time||1} months</span>
        </div>
      `:""}

      ${r.length?`
        <div class="bld-rooms-section">
          <div class="bld-rooms-title">Rooms <span class="bld-count">${r.length}</span></div>
          <div class="bld-rooms-list">
            ${r.map(t=>`
              <div class="bld-room-chip" data-room-id="${t.id}">
                <span class="bld-room-name bld-room-edit" data-room-id="${t.id}">${T(t.room_type)} ${t.name}</span>
                <button class="bld-room-del" data-room-id="${t.id}" title="Delete room">×</button>
              </div>
            `).join("")}
          </div>
        </div>
      `:""}

      <div class="bld-residents-section">
        <div class="bld-residents-title">Residents <span class="bld-count">${c.length}</span></div>
        <div class="bld-residents-list">
          ${c.map(t=>`
            <span class="bld-resident-badge">
              ${t.name} <span class="bld-resident-detail">${t.class||""} ${t.level||""}</span>
              <button class="bld-resident-remove" data-char-id="${t.id}" title="Unassign">×</button>
            </span>
          `).join("")}
          ${c.length===0?'<span class="bld-no-residents">No residents</span>':""}
        </div>
      </div>

      <div class="bld-card-footer">
        <button class="social-add-btn bld-add-room-btn" style="font-size:.62rem;padding:1px 6px;">+ Room</button>
        <button class="social-add-btn bld-assign-btn" style="font-size:.62rem;padding:1px 6px;">+ Assign Character</button>
      </div>
    </div>
  `}function T(a){return{common:"🪑",bedroom:"🛏️",kitchen:"🍳",storage:"📦",workshop:"🔧",cellar:"🪜",attic:"🏚️",office:"📋",chapel:"🕯️",armory:"⚔️",stable:"🐴",courtyard:"🌳",dungeon:"⛓️",throne:"👑",other:"🚪"}[a]||"🚪"}async function v(a,s,e){try{const[l,p]=await Promise.all([C(s),q(s)]),r=(p.characters||[]).filter(c=>c.status!=="Deceased");E(a,l.buildings||[],s,r)}catch(l){console.error("Failed to refresh buildings:",l)}}function S(a,s,e,l){var m;const p=!!e,r=p?"✏️ Edit Building":"🏗️ Add Building",c=Object.keys(g).map(d=>`<option value="${d}" ${((e==null?void 0:e.building_type)||"other")===d?"selected":""}>${d.charAt(0).toUpperCase()+d.slice(1)}</option>`).join(""),t=["completed","under_construction","planned","damaged","destroyed"].map(d=>`<option value="${d}" ${((e==null?void 0:e.status)||"completed")===d?"selected":""}>${d.replace(/_/g," ")}</option>`).join(""),i=s.map(d=>`<option value="${d.id}" ${parseInt(e==null?void 0:e.owner_id)===d.id?"selected":""}>${d.name}</option>`).join(""),{el:o,close:u}=f({title:r,width:"narrow",content:`<div class="modal-form">
      <label>Building Name</label>
      <input type="text" id="bld-name" class="form-input" placeholder="e.g. The Rusty Tankard" value="${(e==null?void 0:e.name)||""}">
      <label>Type</label>
      <select id="bld-type" class="form-select">${c}</select>
      <label>Status</label>
      <select id="bld-status" class="form-select">${t}</select>
      <label>Description</label>
      <textarea id="bld-desc" class="form-input" rows="2" placeholder="What is this building?">${(e==null?void 0:e.description)||""}</textarea>
      <label>Owner (optional)</label>
      <select id="bld-owner" class="form-select">
        <option value="">— None —</option>
        ${i}
      </select>
      <button class="btn-primary" id="bld-save-btn" style="margin-top:.75rem;width:100%">${p?"Save Changes":"Create Building"}</button>
    </div>`});(m=o.querySelector("#bld-save-btn"))==null||m.addEventListener("click",async()=>{const d=o.querySelector("#bld-name").value.trim();if(!d)return alert("Name required");const b=o.querySelector("#bld-save-btn");b.disabled=!0,b.textContent="Saving...";try{await B(a,{id:(e==null?void 0:e.id)||0,name:d,building_type:o.querySelector("#bld-type").value,status:o.querySelector("#bld-status").value,description:o.querySelector("#bld-desc").value,owner_id:o.querySelector("#bld-owner").value||null,sort_order:(e==null?void 0:e.sort_order)||0,build_progress:(e==null?void 0:e.build_progress)||0,build_time:(e==null?void 0:e.build_time)||1}),u(),l()}catch(n){alert(n.message),b.disabled=!1,b.textContent=p?"Save Changes":"Create Building"}})}function _(a,s,e){var i;const l=!!s,p=l?"✏️ Edit Room":"🚪 Add Room",r=P.map(o=>`<option value="${o}" ${((s==null?void 0:s.room_type)||"common")===o?"selected":""}>${o.charAt(0).toUpperCase()+o.slice(1)}</option>`).join(""),{el:c,close:t}=f({title:p,width:"narrow",content:`<div class="modal-form">
      <label>Room Name</label>
      <input type="text" id="room-name" class="form-input" placeholder="e.g. Main Hall" value="${(s==null?void 0:s.name)||""}">
      <label>Type</label>
      <select id="room-type" class="form-select">${r}</select>
      <label>Description</label>
      <textarea id="room-desc" class="form-input" rows="2" placeholder="What's in this room?">${(s==null?void 0:s.description)||""}</textarea>
      <button class="btn-primary" id="room-save-btn" style="margin-top:.75rem;width:100%">${l?"Save Changes":"Add Room"}</button>
    </div>`});(i=c.querySelector("#room-save-btn"))==null||i.addEventListener("click",async()=>{const o=c.querySelector("#room-name").value.trim();if(!o)return alert("Name required");const u=c.querySelector("#room-save-btn");u.disabled=!0,u.textContent="Saving...";try{await L(a,{id:(s==null?void 0:s.id)||0,name:o,room_type:c.querySelector("#room-type").value,description:c.querySelector("#room-desc").value,sort_order:(s==null?void 0:s.sort_order)||0}),t(),e()}catch(m){alert(m.message),u.disabled=!1,u.textContent=l?"Save Changes":"Add Room"}})}function j(a,s,e,l,p,r){var m;const c=new Set,t=p.find(d=>parseInt(d.id)===s);t&&(t.residents||[]).forEach(d=>c.add(parseInt(d.id)));const i=l.filter(d=>!c.has(d.id));if(!i.length){alert("All characters are already assigned to this building or deceased.");return}const{el:o,close:u}=f({title:`👤 Assign to ${e}`,width:"narrow",content:`<div class="modal-form">
      <label>Character</label>
      <select id="assign-char" class="form-select">
        ${i.map(d=>`<option value="${d.id}">${d.name} (${d.class||"?"} ${d.level||""})</option>`).join("")}
      </select>
      <button class="btn-primary" id="assign-save-btn" style="margin-top:.75rem;width:100%">Assign Character</button>
    </div>`});(m=o.querySelector("#assign-save-btn"))==null||m.addEventListener("click",async()=>{const d=parseInt(o.querySelector("#assign-char").value),b=o.querySelector("#assign-save-btn");b.disabled=!0,b.textContent="Assigning...";try{await w(a,d,s),u(),r()}catch(n){alert(n.message),b.disabled=!1,b.textContent="Assign Character"}})}export{N as openBuildingsPanel};
