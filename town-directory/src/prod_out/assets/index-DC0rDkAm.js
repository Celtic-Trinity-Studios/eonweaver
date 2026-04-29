const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/pdfExport-Dw8rbSyY.js","assets/classData35e-ZsD8k0RV.js","assets/LevelUpWizard-k3yjN73z.js","assets/featData35e-CXgV1EMm.js","assets/metamagic35e-BoHZwHsE.js","assets/TownSocialPanel-Bnsu79Cv.js","assets/social-BXKEC03o.js"])))=>i.map(i=>d[i]);
(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))a(n);new MutationObserver(n=>{for(const l of n)if(l.type==="childList")for(const i of l.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&a(i)}).observe(document,{childList:!0,subtree:!0});function s(n){const l={};return n.integrity&&(l.integrity=n.integrity),n.referrerPolicy&&(l.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?l.credentials="include":n.crossOrigin==="anonymous"?l.credentials="omit":l.credentials="same-origin",l}function a(n){if(n.ep)return;n.ep=!0;const l=s(n);fetch(n.href,l)}})();const ya={user:null,currentCampaign:null,campaigns:[],currentTownId:null,currentTown:null,towns:[],calendar:null,selectedCharId:null,activeTab:"combat",searchQuery:"",activeRaceFilter:null,activeClassFilter:null,activeBuildingFilter:null,activeStatusFilter:null,sortCol:"name",sortDir:"asc"},wa=new Set;function ne(){return ya}function me(e){Object.assign(ya,e);for(const t of wa)try{t(ya)}catch(s){console.error("State listener error:",s)}}function na(e){return wa.add(e),()=>wa.delete(e)}function Ha(){me({user:null,currentCampaign:null,campaigns:[],currentTownId:null,currentTown:null,towns:[],calendar:null,selectedCharId:null,activeTab:"combat",searchQuery:"",activeRaceFilter:null,activeClassFilter:null,activeBuildingFilter:null,activeStatusFilter:null,sortCol:"name",sortDir:"asc"})}const $a=Object.freeze(Object.defineProperty({__proto__:null,getState:ne,resetState:Ha,setState:me,subscribe:na},Symbol.toStringTag,{value:"Module"})),Ra={};let kt=null;const Vt=e=>(e||"").toString().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");function Ht(){return"/".replace(/\/$/,"")}function qe(e,t){Ra[e]=t}function ke(e){const t=Ht(),s=e.replace(/^#\/?/,""),a=`${t}/${s}`.replace(/\/+/g,"/");window.history.pushState({},"",a),Kt()}function Ds(e){const t=Ht();let s=e.replace(new RegExp("^"+t.replace(/\//g,"\\/")),"");s=s.replace(/^\//,"").replace(/\/$/,"");const a=s.split("/").filter(Boolean),n=a[0]||"dashboard",l={};return a.length===2&&!Ra[a[0]]?{path:"clean_town",params:{campaignSlug:a[0],townSlug:a[1]}}:((n==="town"&&a[1]||a[1])&&(l.id=a[1]),{path:n,params:l})}function Kt(){const e=document.getElementById("app-content");if(!e)return;const{path:t,params:s}=Ds(window.location.pathname);if(t==="clean_town"){si(s);return}const a=Ra[t];if(kt&&typeof kt=="function"&&kt(),kt=null,!a){e.innerHTML=`<div class="view-empty"><h2>Page not found</h2><p>Path "${t}" does not exist.</p></div>`;return}e.innerHTML="",kt=a(e,s)||null,document.querySelectorAll(".nav-item").forEach(n=>{n.classList.toggle("active",n.dataset.route===t)})}function si({campaignSlug:e,townSlug:t}){window.__pendingCleanRoute={campaignSlug:e,townSlug:t};const s=document.getElementById("app-content");s&&(s.innerHTML='<div class="view-empty"><h2>Loading Town...</h2></div>');const a=()=>{var d;const l=ne();if(!((d=l.towns)!=null&&d.length)||!l.currentCampaign)return;const{campaignSlug:i,townSlug:r}=window.__pendingCleanRoute;if(Vt(l.currentCampaign.name)===i){const c=l.towns.find(o=>Vt(o.name)===r);c&&(n(),delete window.__pendingCleanRoute,window.history.replaceState({},"",`${Ht()}/town/${c.id}`),Kt())}},n=na(a);a()}function ni(e){if(!e.currentTown||!e.currentCampaign)return;const t=Vt(e.currentCampaign.name),s=Vt(e.currentTown.name),n=`${Ht()}/${t}/${s}`.replace(/\/+/g,"/"),{path:l}=Ds(window.location.pathname);l==="town"&&window.location.pathname!==n&&window.history.replaceState({route:"town",townId:e.currentTown.id},"",n)}function Is(){window.addEventListener("popstate",Kt),na(ni);const e=Ht(),t=window.location.pathname;(t===e||t===e+"/")&&window.history.replaceState({},"",e+"/dashboard"),Kt()}const Ps="/".replace(/\/$/,""),ii=`${Ps}/api.php`;async function N(e,t={}){const s=t.method||"GET",a=t.params||{},n=t.body||null;let l=`${ii}?action=${e}`;for(const[o,p]of Object.entries(a))l+=`&${encodeURIComponent(o)}=${encodeURIComponent(p)}`;const i={method:s,credentials:"same-origin"};n&&(i.headers={"Content-Type":"application/json"},i.body=JSON.stringify(n));const r=await fetch(l,i),d=await r.text();let c;try{c=JSON.parse(d)}catch{throw new Error(`Server error (${r.status}): ${d.substring(0,200)||"empty response"}`)}if(!r.ok||c.error)throw new Error(c.error||`API error ${r.status}`);return c}const li=`${Ps}/simulate.php`;async function We(e,t={}){const s=`${li}?action=${e}`,a=await fetch(s,{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify(t)}),n=await a.text();let l;try{l=JSON.parse(n)}catch{const r=n.slice(0,300)||"(empty response)";throw new Error(`Sim parse error (HTTP ${a.status}, ${a.headers.get("content-type")||"no content-type"}): ${r}`)}if(!a.ok||l.error)throw new Error(l.error||`Sim error ${a.status}: ${n.slice(0,200)}`);return l}function ri(){return N("get_settings")}function oi(e,t){return N("save_settings",{method:"POST",body:{key:e,value:t}})}function Na(){return N("get_usage")}function tt(){return N("get_calendar")}function Hs(e){return N("save_calendar",{method:"POST",body:{calendar:e}})}function Ke(e){if(!e)return"Unknown Date";const s=(Array.isArray(e.month_names)?e.month_names:[])[e.current_month-1]||`Month ${e.current_month}`,a=e.current_day||1,n=e.era_name||"";return`${a} ${s}, ${e.current_year}${n?" "+n:""}`}const ci=Object.freeze(Object.defineProperty({__proto__:null,apiGetCalendar:tt,apiGetSettings:ri,apiGetUsage:Na,apiSaveCalendar:Hs,apiSaveSetting:oi,calendarToString:Ke},Symbol.toStringTag,{value:"Module"}));function Rs(){return N("campaigns")}function Ns(e,t="3.5e",s=""){return N("create_campaign",{method:"POST",body:{name:e,dnd_edition:t,description:s}})}function di(e,t){return N("update_campaign",{method:"POST",body:{campaign_id:e,...t}})}function pi(e){return N("delete_campaign",{method:"POST",body:{campaign_id:e}})}function Bs(e){return N("switch_campaign",{method:"POST",body:{campaign_id:e}})}const ui="modulepreload",mi=function(e){return"/"+e},Ja={},re=function(t,s,a){let n=Promise.resolve();if(s&&s.length>0){let i=function(c){return Promise.all(c.map(o=>Promise.resolve(o).then(p=>({status:"fulfilled",value:p}),p=>({status:"rejected",reason:p}))))};document.getElementsByTagName("link");const r=document.querySelector("meta[property=csp-nonce]"),d=(r==null?void 0:r.nonce)||(r==null?void 0:r.getAttribute("nonce"));n=i(s.map(c=>{if(c=mi(c),c in Ja)return;Ja[c]=!0;const o=c.endsWith(".css"),p=o?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${c}"]${p}`))return;const g=document.createElement("link");if(g.rel=o?"stylesheet":ui,o||(g.as="script"),g.crossOrigin="",g.href=c,d&&g.setAttribute("nonce",d),document.head.appendChild(g),o)return new Promise((v,b)=>{g.addEventListener("load",v),g.addEventListener("error",()=>b(new Error(`Unable to preload CSS for ${c}`)))})}))}function l(i){const r=new Event("vite:preloadError",{cancelable:!0});if(r.payload=i,window.dispatchEvent(r),!r.defaultPrevented)throw i}return n.then(i=>{for(const r of i||[])r.status==="rejected"&&l(r.reason);return t().catch(l)})};async function Fs(){return N("srd_races")}async function Os(){return N("srd_classes")}async function js(){return N("srd_skills")}async function Gs(e){return N(e?`srd_feats&search=${encodeURIComponent(e)}`:"srd_feats")}async function zs(e){return N(e?`srd_equipment&search=${encodeURIComponent(e)}`:"srd_equipment")}async function ia(e){return N(e?`srd_spells&search=${encodeURIComponent(e)}`:"srd_spells")}async function Ws(e){return N(`srd_spell_detail&id=${e}`)}async function Us(e){return N(e?`srd_monsters&search=${encodeURIComponent(e)}`:"srd_monsters")}async function Xs(e){return N(`srd_monster_detail&id=${e}`)}async function Vs(e){return N(e?`srd_powers&search=${encodeURIComponent(e)}`:"srd_powers")}async function Ks(e){return N(`srd_power_detail&id=${e}`)}async function Ys(){return N("srd_domains")}async function Js(e){return N(e?`srd_items&search=${encodeURIComponent(e)}`:"srd_items")}async function Qs(e){return N(`srd_item_detail&id=${e}`)}async function Ba(e){return N(`srd_class_progression&class_name=${encodeURIComponent(e)}`)}let gt=null;function vi(){return gt}function ze(e){e!==gt&&(gt=e,$t())}const ht={};async function Rt(e){const s=`${e}__${gt||"3.5e"}`;if(ht[s])return ht[s];const a=await N(e);return ht[s]=a.data||[],a.edition&&!gt&&(gt=a.edition),ht[s]}async function Zs(){return Rt("srd_races")}async function en(){return Rt("srd_classes")}async function tn(){return Rt("srd_feats")}async function an(){return Rt("srd_equipment")}async function hi(){return Rt("srd_skills")}let ut=null,mt=null;async function la(){return ut||mt||(mt=(async()=>{try{const{apiGetCustomContent:e}=await re(async()=>{const{apiGetCustomContent:s}=await Promise.resolve().then(()=>$o);return{apiGetCustomContent:s}},void 0);ut=(await e()).content||{}}catch{ut={}}return mt=null,ut})(),mt)}function Fa(){ut=null,mt=null}async function gi(){const[e,t]=await Promise.all([Zs(),la()]),s=(t.custom_races||[]).map(n=>({...n,_isHomebrew:!0})),a=new Map;return e.forEach(n=>a.set(n.name.toLowerCase(),n)),s.forEach(n=>a.set(n.name.toLowerCase(),n)),[...a.values()].sort((n,l)=>n.name.localeCompare(l.name))}async function bi(){const[e,t]=await Promise.all([en(),la()]),s=(t.custom_classes||[]).map(n=>({...n,_isHomebrew:!0})),a=new Map;return e.forEach(n=>a.set(n.name.toLowerCase(),n)),s.forEach(n=>a.set(n.name.toLowerCase(),n)),[...a.values()].sort((n,l)=>n.name.localeCompare(l.name))}async function fi(){const[e,t]=await Promise.all([tn(),la()]),s=(t.custom_feats||[]).map(n=>({...n,_isHomebrew:!0})),a=new Map;return e.forEach(n=>a.set(n.name.toLowerCase(),n)),s.forEach(n=>a.set(n.name.toLowerCase(),n)),[...a.values()].sort((n,l)=>n.name.localeCompare(l.name))}async function yi(){const[e,t]=await Promise.all([an(),la()]),s=(t.custom_equipment||[]).map(n=>({...n,_isHomebrew:!0})),a=new Map;return e.forEach(n=>a.set(n.name.toLowerCase(),n)),s.forEach(n=>a.set(n.name.toLowerCase(),n)),[...a.values()].sort((n,l)=>n.name.localeCompare(l.name))}function wi(e){const t={};if(!e||e==="None"||e.startsWith("+1 feat"))return t;for(const s of e.split(",").map(a=>a.trim())){const a=s.match(/^(Str|Dex|Con|Int|Wis|Cha)\s*([+-]\d+)$/i);if(a){const n=a[1].toLowerCase()==="int"?"int_":a[1].toLowerCase();t[n]=parseInt(a[2])}}return t}function $i(e){const t=(e||"").match(/d(\d+)/);return t?parseInt(t[1]):8}function Si(e){return!e||e==="None"?[]:e.split(",").map(t=>t.trim().toLowerCase())}function $t(){Object.keys(ht).forEach(e=>delete ht[e])}const sn=Object.freeze(Object.defineProperty({__proto__:null,apiGetSrdClassProgression:Ba,apiGetSrdClasses:Os,apiGetSrdDomains:Ys,apiGetSrdEquipment:zs,apiGetSrdFeats:Gs,apiGetSrdItemDetail:Qs,apiGetSrdItems:Js,apiGetSrdMonsterDetail:Xs,apiGetSrdMonsters:Us,apiGetSrdPowerDetail:Ks,apiGetSrdPowers:Vs,apiGetSrdRaces:Fs,apiGetSrdSkills:js,apiGetSrdSpellDetail:Ws,apiGetSrdSpells:ia,clearCustomContentCache:Fa,clearSrdCache:$t,getCurrentEdition:vi,loadMergedClasses:bi,loadMergedEquipment:yi,loadMergedFeats:fi,loadMergedRaces:gi,loadSrdClasses:en,loadSrdEquipment:an,loadSrdFeats:tn,loadSrdRaces:Zs,loadSrdSkills:hi,parseAbilityMods:wi,parseGoodSaves:Si,parseHitDie:$i,setCurrentEdition:ze},Symbol.toStringTag,{value:"Module"}));let Je=null;function ra({title:e,content:t,width:s="normal",onClose:a}){xt();const n=document.createElement("div");n.className="modal",n.style.display="flex",n.innerHTML=`
    <div class="modal-content ${s==="wide"?"modal-wide":""}">
      <h2 class="modal-title">${e}</h2>
      <button class="modal-close" id="modal-close-btn">&times;</button>
      <div class="modal-body">${t}</div>
    </div>
  `,document.body.appendChild(n),Je=n,n.querySelector("#modal-close-btn").addEventListener("click",()=>xt()),n.addEventListener("click",r=>{r.target===n&&xt()});const l=r=>{r.key==="Escape"&&xt()};document.addEventListener("keydown",l);const i=()=>{document.removeEventListener("keydown",l),n.parentNode&&n.parentNode.removeChild(n),Je===n&&(Je=null),a&&a()};return{el:n.querySelector(".modal-body"),close:i}}function xt(){Je&&Je.parentNode&&Je.parentNode.removeChild(Je),Je=null}const Ie=Object.freeze(Object.defineProperty({__proto__:null,closeModal:xt,showModal:ra},Symbol.toStringTag,{value:"Module"})),_i=4e3;let Lt=null;function ki(){return Lt||(Lt=document.createElement("div"),Lt.className="toast-container",document.body.appendChild(Lt)),Lt}function ue(e,t="info",s=_i){const a=ki(),n={success:"✅",error:"❌",warning:"⚠️",info:"ℹ️"},l=document.createElement("div");return l.className=`toast toast-${t}`,l.innerHTML=`
    <span class="toast-icon">${n[t]||"ℹ️"}</span>
    <span class="toast-message">${e}</span>
    <button class="toast-close">&times;</button>
  `,l.querySelector(".toast-close").addEventListener("click",()=>Qa(l)),a.appendChild(l),requestAnimationFrame(()=>l.classList.add("toast-visible")),s>0&&setTimeout(()=>Qa(l),s),l}function Qa(e){e.classList.remove("toast-visible"),e.classList.add("toast-exit"),setTimeout(()=>{e.parentNode&&e.parentNode.removeChild(e)},300)}const it=Object.freeze(Object.defineProperty({__proto__:null,showToast:ue},Symbol.toStringTag,{value:"Module"}));function Li(e,t,s,a,n,l){return N("submit_bug_report",{method:"POST",body:{title:e,description:t,steps:s,severity:a,page:n,browser:l}})}function Ci(){var a,n;const{el:e,close:t}=ra({title:"🐛 Report a Bug",width:"normal",content:`
      <form id="bug-report-form" class="bug-report-form">
        <div class="form-group">
          <label for="bug-title">Title <span class="required">*</span></label>
          <input type="text" id="bug-title" class="form-input" placeholder="Brief summary of the issue" required maxlength="200" autofocus>
        </div>

        <div class="form-group">
          <label for="bug-severity">Severity</label>
          <div class="severity-picker" id="severity-picker">
            <button type="button" class="severity-btn" data-severity="low" title="Low — cosmetic or minor">
              <span class="severity-dot severity-low"></span> Low
            </button>
            <button type="button" class="severity-btn active" data-severity="medium" title="Medium — feature not working correctly">
              <span class="severity-dot severity-medium"></span> Medium
            </button>
            <button type="button" class="severity-btn" data-severity="high" title="High — major feature broken">
              <span class="severity-dot severity-high"></span> High
            </button>
            <button type="button" class="severity-btn" data-severity="critical" title="Critical — data loss or app crash">
              <span class="severity-dot severity-critical"></span> Critical
            </button>
          </div>
        </div>

        <div class="form-group">
          <label for="bug-description">What happened?</label>
          <textarea id="bug-description" class="form-textarea" rows="3"
            placeholder="Describe what went wrong..."></textarea>
        </div>

        <div class="form-group">
          <label for="bug-steps">Steps to reproduce <span class="muted">(optional)</span></label>
          <textarea id="bug-steps" class="form-textarea" rows="3"
            placeholder="1. Go to...&#10;2. Click on...&#10;3. See error..."></textarea>
        </div>

        <div class="form-group">
          <label for="bug-page">Page/Feature <span class="muted">(optional)</span></label>
          <input type="text" id="bug-page" class="form-input" placeholder="e.g. Town Roster, Simulation, Character Sheet">
        </div>

        <div class="bug-report-actions">
          <button type="button" class="btn-secondary" id="bug-cancel-btn">Cancel</button>
          <button type="submit" class="btn-primary" id="bug-submit-btn">
            <span class="btn-text">📨 Send Report</span>
          </button>
        </div>

        <p class="bug-report-note">
          Reports are sent directly to our Discord server. Thank you for helping improve Eon Weaver!
        </p>
      </form>
    `});let s="medium";e.querySelectorAll(".severity-btn").forEach(l=>{l.addEventListener("click",()=>{e.querySelectorAll(".severity-btn").forEach(i=>i.classList.remove("active")),l.classList.add("active"),s=l.dataset.severity})}),(a=e.querySelector("#bug-cancel-btn"))==null||a.addEventListener("click",t),(n=e.querySelector("#bug-report-form"))==null||n.addEventListener("submit",async l=>{l.preventDefault();const i=e.querySelector("#bug-title").value.trim(),r=e.querySelector("#bug-description").value.trim(),d=e.querySelector("#bug-steps").value.trim(),c=e.querySelector("#bug-page").value.trim();if(!i){ue("Please enter a title for the bug report.","warning");return}const o=e.querySelector("#bug-submit-btn");o.disabled=!0,o.querySelector(".btn-text").textContent="⏳ Sending...";const p=`${navigator.userAgent.slice(0,200)}`;try{await Li(i,r,d,s,c,p),t(),ue("Bug report sent to Discord! Thank you. 🎉","success")}catch(g){ue("Failed to send bug report: "+g.message,"error"),o.disabled=!1,o.querySelector(".btn-text").textContent="📨 Send Report"}})}const Ei=[{route:"dashboard",icon:"🏠",label:"Dashboard"},{route:"town",icon:"🏰",label:"Town Roster"},{route:"world-simulate",icon:"🌍",label:"World Simulate"},{route:"party",icon:"🛡️",label:"Party"},{route:"encounters",icon:"⚔️",label:"Encounters"},{route:"srd",icon:"📖",label:"SRD Browser"},{route:"homebrew",icon:"🧪",label:"Homebrew"},{route:"content-library",icon:"📁",label:"Content Library"},{route:"calendar",icon:"📅",label:"Calendar"},{route:"help",icon:"❓",label:"Help & Guide"},{route:"settings",icon:"⚙️",label:"Settings"}];function yt(e){var c,o;const t=ne(),s=t.calendar?Ke(t.calendar):"Loading...",a=t.currentCampaign,n=!!a,l=a?a.name:"No Campaign",i=a?nn(a.dnd_edition):"";e.innerHTML=`
    <div class="sidebar">
      <div class="sidebar-brand">
        <h1 class="sidebar-title">Eon Weaver</h1>
        <p class="sidebar-subtitle">Campaign Manager</p>
        <div class="sidebar-usage" id="sidebar-usage"></div>
      </div>

      ${n?`
      <div class="sidebar-campaign" id="sidebar-campaign">
        <div class="campaign-selector" id="campaign-selector" title="Click to switch campaigns">
          <span class="campaign-icon">📜</span>
          <div class="campaign-info">
            <span class="campaign-name" id="sidebar-campaign-name">${l}</span>
            <span class="campaign-edition" id="sidebar-campaign-edition">${i}</span>
          </div>
          <span class="campaign-chevron">▾</span>
        </div>
        <div class="campaign-dropdown" id="campaign-dropdown" style="display:none;">
          <div class="campaign-dropdown-list" id="campaign-dropdown-list">Loading...</div>
          <div class="campaign-dropdown-actions">
            <button class="btn-sm btn-primary" id="campaign-manage-btn">⚙ Manage Campaigns</button>
          </div>
        </div>
      </div>

      <div class="sidebar-calendar">
        <span class="calendar-icon">📅</span>
        <span class="calendar-text" id="sidebar-calendar-text">${s}</span>
      </div>

      <nav class="sidebar-nav">
        ${Ei.map(p=>`
          <button class="nav-item${xi()===p.route?" active":""}" data-route="${p.route}">
            <span class="nav-icon">${p.icon}</span>
            <span class="nav-label">${p.label}</span>
          </button>
        `).join("")}
      </nav>
      `:""}

      <div class="sidebar-footer">
        <div class="sidebar-user" id="sidebar-user-info">
          ${t.user?`👤 ${t.user.username}`:""}
        </div>
        <button class="sidebar-bug-report" id="sidebar-bug-report-btn" title="Report a Bug">🐛 Report Bug</button>
        <button class="sidebar-logout" id="sidebar-logout-btn" title="Sign Out">🚪 Sign Out</button>
      </div>
    </div>
  `,Mi(),e.querySelectorAll(".nav-item").forEach(p=>{p.addEventListener("click",()=>ke(p.dataset.route))}),(c=e.querySelector("#sidebar-bug-report-btn"))==null||c.addEventListener("click",()=>{Ci()});const r=e.querySelector("#campaign-selector"),d=e.querySelector("#campaign-dropdown");r==null||r.addEventListener("click",async()=>{d.style.display!=="none"?d.style.display="none":(d.style.display="",await Ti(e))}),(o=e.querySelector("#campaign-manage-btn"))==null||o.addEventListener("click",()=>{d.style.display="none",ke("settings")})}async function Ti(e){var s;const t=e.querySelector("#campaign-dropdown-list");if(t)try{const n=(await Rs()).campaigns||[],i=(s=ne().currentCampaign)==null?void 0:s.id;if(n.length===0){t.innerHTML='<div class="muted" style="padding:0.5rem">No campaigns</div>';return}t.innerHTML=n.map(r=>`
      <div class="campaign-dropdown-item${r.id==i?" active":""}" data-campaign-id="${r.id}">
        <span class="campaign-item-name">${r.name}</span>
        <span class="campaign-item-edition">${nn(r.dnd_edition)}</span>
      </div>
    `).join(""),t.querySelectorAll(".campaign-dropdown-item").forEach(r=>{r.addEventListener("click",async()=>{const d=parseInt(r.dataset.campaignId);if(d!==i)try{const c=await Bs(d);c.campaign&&(me({currentCampaign:c.campaign}),ze(c.campaign.dnd_edition),$t(),yt(e.closest("#sidebar-container")||e),ke("dashboard"))}catch(c){alert("Failed to switch campaign: "+c.message)}})})}catch{t.innerHTML='<div class="muted" style="padding:0.5rem">Error loading campaigns</div>'}}function nn(e){return{"3.5e":"3.5e","5e":"5e 2014","5e2024":"5e 2024"}[e]||e||""}function xi(){const e="/".replace(/\/$/,"");let s=window.location.pathname.replace(new RegExp("^"+e.replace(/\//g,"\\/")),"");return s=s.replace(/^\//,"").replace(/\/$/,""),s.split("/")[0]||"dashboard"}function Ai(e){const t=document.getElementById("sidebar-calendar-text");t&&(t.textContent=Ke(e))}let Za="";na(e=>{if(e.calendar){const t=Ke(e.calendar);if(t!==Za){Za=t;const s=document.getElementById("sidebar-calendar-text");s&&(s.textContent=t)}}});async function Mi(){const e=document.getElementById("sidebar-usage");if(e)try{const t=await Na();if(!t.ok)return;const{tier_label:s,credit_balance:a,tokens_used_this_month:n}=t,l=a||0,i=d=>d>=1e6?(d/1e6).toFixed(1)+"M":d>=1e3?(d/1e3).toFixed(0)+"K":d,r=l<=0?"#ef4444":l<1e6?"#f59e0b":"#22c55e";e.innerHTML=`
      <div class="sidebar-usage-row">
        <span class="sidebar-tier-badge tier-${t.tier}">${s}</span>
      </div>
      <div class="sidebar-credits-display">
        <span class="sidebar-credits-icon">🪙</span>
        <span class="sidebar-credits-value" style="color:${r}">${i(l)}</span>
        <span class="sidebar-credits-label">Eon Credits</span>
      </div>
      <div class="sidebar-usage-label">${i(n||0)} used this month</div>
    `}catch{}}function ln(e,t){return N("login",{method:"POST",body:{login:e,password:t}})}function rn(e,t,s,a){return N("register",{method:"POST",body:{username:e,email:t,password:s,beta_key:a}})}function Oa(){return N("logout",{method:"POST"})}function qt(){return N("me")}const qi=Object.freeze(Object.defineProperty({__proto__:null,apiGetCurrentUser:qt,apiLogin:ln,apiLogout:Oa,apiRegister:rn},Symbol.toStringTag,{value:"Module"}));function St(){return N("towns")}function Di(e,t){return N("create_town",{method:"POST",body:{name:e,subtitle:t}})}function on(e){return N("delete_town",{method:"POST",body:{town_id:e}})}function cn(e,t=!0,s=!1){return N("purge_population",{method:"POST",body:{town_id:e,purge_population:t,purge_buildings:s}})}function dn(e){return N("history",{params:{town_id:e}})}function Dt(e){return N("town_meta",{params:{town_id:e}})}function vt(e,t,s){return N("save_meta",{method:"POST",body:{town_id:e,key:t,value:s}})}const Ii=Object.freeze(Object.defineProperty({__proto__:null,apiCreateTown:Di,apiDeleteTown:on,apiGetHistory:dn,apiGetTownMeta:Dt,apiGetTowns:St,apiPurgePopulation:cn,apiSaveTownMeta:vt},Symbol.toStringTag,{value:"Module"}));function At(e,t,s,a,n=0,l=0){return We("run_simulation",{town_id:e,months:t,rules:s,instructions:a,num_arrivals:n,days:l})}function Pi(e,t,s,a){return We("plan_simulation",{town_id:e,months:t,rules:s,instructions:a})}function Hi(e){return We("generate_weather",{town_id:e})}function Re(e,t,s,a=0,n=0){return We("apply_simulation",{town_id:e,changes:t,history_entry:s,months_elapsed:a,days_elapsed:n}).then(l=>{var i;if((i=l==null?void 0:l.applied)!=null&&i.calendar_date)try{const r=ne().calendar||{},d=l.applied.calendar_date;me({calendar:{...r,current_month:d.month,current_year:d.year,current_day:d.day||r.current_day,era_name:d.era||r.era_name}})}catch{}return l})}function Ri(){return We("debug_llm",{})}function Sa(e,t,s,a){return We("intake_roster",{town_id:e,num_arrivals:t,rules:s,instructions:a})}function Yt(e,t,s){return We("intake_flesh",{town_id:e,stubs:t,rules:s})}function Mt(e,t,s,a){return We("intake_creature",{town_id:e,creature_name:t,count:s,instructions:a})}function wt(){return N("get_campaign_rules")}function pn(e,t,s={},a={}){return N("save_campaign_rules",{method:"POST",body:{rules_text:e,campaign_description:t,homebrew_settings:s,...a}})}function un(e,t=!1){return We("auto_assign_spells_town",{town_id:e,force:t})}function Ni(e,t,s=""){return We("intake_custom",{town_id:e,prompt:t,level_range:s})}function Bi(e){var s;const t=ne();e.innerHTML=`
    <div class="view-dashboard">
      <header class="view-header">
        <h1>Campaign Dashboard</h1>
        <p class="view-subtitle">Overview of your world</p>
      </header>

      <div class="dashboard-grid">
        <div class="dash-card dash-card-calendar">
          <h3>Calendar</h3>
          <div class="dash-calendar-display" id="dash-calendar">
            ${t.calendar?Ke(t.calendar):"Loading..."}
          </div>
        </div>

        <div class="dash-card dash-card-towns">
          <h3>Your Towns</h3>
          <div id="dash-town-list" class="dash-town-list">Loading...</div>
          <button class="btn-primary btn-sm" id="dash-new-town-btn">+ New Town</button>
        </div>

        <div class="dash-card dash-card-stats">
          <h3>World Stats</h3>
          <div id="dash-world-stats" class="dash-stats-grid">Loading...</div>
        </div>
      </div>

      <!-- World Simulation Panel (hidden by default) -->
      <div id="world-sim-panel" class="dash-card" style="display:none;margin-top:1rem;">
        <h3>World Simulation</h3>
        <div id="world-sim-content"></div>
      </div>
    </div>
  `,es(e),(s=e.querySelector("#dash-new-town-btn"))==null||s.addEventListener("click",()=>{const a=prompt("Enter town name:");a&&re(async()=>{const{apiCreateTown:n}=await Promise.resolve().then(()=>Ii);return{apiCreateTown:n}},void 0).then(({apiCreateTown:n})=>{n(a,"").then(()=>es(e))})})}async function es(e){try{const t=await St(),s=Array.isArray(t)?t:t.towns||[];me({towns:s});const a=e.querySelector("#dash-town-list");a&&(s.length===0?a.innerHTML='<p class="muted">No towns yet. Create one to get started!</p>':(a.innerHTML=s.map(l=>`
          <div class="dash-town-item" data-town-id="${l.id}">
            <span class="dash-town-name">${l.name}</span>
            <span class="dash-town-sub">${l.subtitle||""}</span>
          </div>
        `).join(""),a.querySelectorAll(".dash-town-item").forEach(l=>{l.addEventListener("click",()=>{ke(`town/${l.dataset.townId}`)})})));const n=e.querySelector("#dash-world-stats");n&&(n.innerHTML=`
        <div class="stat-item"><span class="stat-value">${s.length}</span><span class="stat-label">Towns</span></div>
      `);try{const l=await tt();if(l.calendar){me({calendar:l.calendar});const i=e.querySelector("#dash-calendar");i&&(i.textContent=Ke(l.calendar))}}catch{}}catch(t){console.error("Dashboard load error:",t)}}function Le(e){return N("characters",{params:{town_id:e}})}function Xe(e,t){return N("save_character",{method:"POST",body:{town_id:e,character:t}})}function Fi(e,t){return We("level_up",{town_id:e,character_id:t})}function mn(e,t){return N("delete_character",{method:"POST",body:{town_id:e,character_id:t}})}function vn(e,t,s){return N("move_character",{method:"POST",body:{character_id:e,from_town_id:t,to_town_id:s}})}function Oi(e){return N("get_xp_log",{params:{character_id:e}})}function xe(e){return{id:e.id,dbId:e.id,name:e.name||"",race:e.race||"",class:e.class||"",level:e.level?parseInt(e.level):0,status:e.status||"Alive",title:e.title||"",gender:e.gender||"",spouse:e.spouse||"None",spouseLabel:e.spouse_label||"",age:e.age?String(e.age):"",xp:e.xp?String(e.xp):"",cr:e.cr||"",ecl:e.ecl||"",hp:e.hp?String(e.hp):"",hd:e.hd||"",ac:e.ac||"",init:e.init||"",spd:e.spd||"",grapple:e.grapple||"",atk:e.atk||"",alignment:e.alignment||"",saves:e.saves||"",str:e.str?String(e.str):"",dex:e.dex?String(e.dex):"",con:e.con?String(e.con):"",int_:e.int_?String(e.int_):"",wis:e.wis?String(e.wis):"",cha:e.cha?String(e.cha):"",languages:e.languages||"",skills_feats:e.skills_feats||"",feats:e.feats||"",gear:e.gear||"",role:e.role||"",history:e.history||"",portrait_url:e.portrait_url||"",portrait_prompt:e.portrait_prompt||"",ai_data:e.ai_data||"",months_in_town:e.months_in_town?parseInt(e.months_in_town):0,building_id:e.building_id||null}}const lt=Object.freeze(Object.defineProperty({__proto__:null,apiDeleteCharacter:mn,apiGetCharacters:Le,apiGetXpLog:Oi,apiLevelUpCharacter:Fi,apiMoveCharacter:vn,apiSaveCharacter:Xe,normalizeCharacter:xe},Symbol.toStringTag,{value:"Module"}));function _a(e){return N("get_buildings",{params:{town_id:e}})}function ji(e,t){return N("save_building",{method:"POST",body:{town_id:e,building:t}})}function Qo(e,t){return N("delete_building",{method:"POST",body:{town_id:e,building_id:t}})}function Zo(e,t){return N("save_room",{method:"POST",body:{building_id:e,room:t}})}function ec(e,t){return N("delete_room",{method:"POST",body:{building_id:e,room_id:t}})}function tc(e,t,s){return N("assign_character_building",{method:"POST",body:{town_id:e,character_id:t,building_id:s}})}const hn={ftr:"Fighter",rog:"Rogue",clr:"Cleric",wiz:"Wizard",pal:"Paladin",rgr:"Ranger",bbn:"Barbarian",brd:"Bard",drd:"Druid",mnk:"Monk",sor:"Sorcerer",com:"Commoner",exp:"Expert",war:"Warrior",ari:"Aristocrat",adp:"Adept",con:"Conjurer",div:"Diviner",evo:"Evoker",abj:"Abjurer",tra:"Transmuter",art:"Artificer",hex:"Hexblade",duskblade:"Duskblade",swashbuckler:"Swashbuckler"};function Gi(e){if(!e)return{name:"",level:0};const t=e.match(/^([A-Za-z]+)\s*(\d+)$/);if(!t)return{name:e,level:0};const s=t[1].toLowerCase(),a=parseInt(t[2])||0;return{name:hn[s]||t[1],level:a}}const zi=["fighter","barbarian","paladin","ranger","warrior"],Wi=["cleric","druid","monk","rogue","bard","expert","aristocrat","adept"];function gn(e,t){const s=(e||"").toLowerCase();return zi.includes(s)?t:Wi.includes(s)?Math.floor(t*.75):Math.floor(t*.5)}function bn(e,t=0){const s=[];let a=e+t;for(;(a>0||s.length===0)&&(s.push(a),a-=5,!(a<=0&&s.length>1||s.length>=4)););return s}function zt(e,t){return t?2+Math.floor(e/2):Math.floor(e/3)}function Ui(e,t){const s=e+3;return t?s:Math.floor(s/2)}function fn(e){return e*(e-1)*500}function Xi(e){let t=1;for(;fn(t+1)<=e;)t++;return t}function Jt(e){return Math.floor((e-10)/2)}const ja={Fine:8,Diminutive:4,Tiny:2,Small:1,Medium:0,Large:-1,Huge:-2,Gargantuan:-4,Colossal:-8};function Vi(e){return ja[e]||0}function Ki(e){return-(ja[e]||0)*(e==="Fine"||e==="Diminutive"?2:1)}function Yi(e){let t=0;for(const s of e)t+=gn(s.name,s.level);return t}const Ji={fighter:["fort"],barbarian:["fort"],paladin:["fort"],ranger:["fort","ref"],monk:["fort","ref","will"],rogue:["ref"],bard:["ref","will"],cleric:["fort","will"],druid:["fort","will"],wizard:["will"],sorcerer:["will"],commoner:[],expert:[],warrior:["fort"],adept:["will"],aristocrat:["will"]};function Qi(e){const t={fort:0,ref:0,will:0};for(const s of e){const a=Ji[s.name.toLowerCase()]||[];t.fort+=zt(s.level,a.includes("fort")),t.ref+=zt(s.level,a.includes("ref")),t.will+=zt(s.level,a.includes("will"))}return t}const Zi={Human:"any","Half-Elf":"any",Dwarf:"Fighter",Elf:"Wizard",Gnome:"Bard",Halfling:"Rogue","Half-Orc":"Barbarian"};function el(e,t){if(e.length<2)return{hasPenalty:!1,penaltyPercent:0,details:""};const s=Zi[t]||"any";let a=[...e];if(s==="any"){const d=Math.max(...a.map(o=>o.level)),c=a.findIndex(o=>o.level===d);c>=0&&a.splice(c,1)}else{const d=a.findIndex(c=>c.name===s);d>=0&&a.splice(d,1)}if(a.length<2)return{hasPenalty:!1,penaltyPercent:0,details:""};let n=0;const l=a.map(d=>d.level),i=Math.max(...l),r=Math.min(...l);return i-r>1&&(n=20),{hasPenalty:n>0,penaltyPercent:n,details:n>0?`${a.map(d=>`${d.name} ${d.level}`).join(", ")} differ by more than 1 level → -${n}% XP`:""}}const tl=Object.freeze(Object.defineProperty({__proto__:null,CLASS_MAP:hn,SIZE_MODS:ja,abilityMod:Jt,calcAttackBonuses:bn,calcBAB:gn,calcBaseSave:zt,calcMulticlassBAB:Yi,calcMulticlassSaves:Qi,checkMulticlassXPPenalty:el,levelFromXP:Xi,maxSkillRanks:Ui,parseClass:Gi,sizeModAC:Vi,sizeModGrapple:Ki,xpForLevel:fn},Symbol.toStringTag,{value:"Module"})),yn={dagger:{dmg:"1d4",crit:"19-20/×2",type:"P",cat:"Light",size:"T",ranged:!1},handaxe:{dmg:"1d6",crit:"20/×3",type:"S",cat:"Light",size:"S",ranged:!1},"light hammer":{dmg:"1d4",crit:"20/×2",type:"B",cat:"Light",size:"S",ranged:!1},"punching dagger":{dmg:"1d4",crit:"20/×3",type:"P",cat:"Light",size:"T",ranged:!1},sickle:{dmg:"1d6",crit:"20/×2",type:"S",cat:"Light",size:"S",ranged:!1},"short sword":{dmg:"1d6",crit:"19-20/×2",type:"P",cat:"Light",size:"S",ranged:!1},club:{dmg:"1d6",crit:"20/×2",type:"B",cat:"1-Handed",size:"M",ranged:!1},longsword:{dmg:"1d8",crit:"19-20/×2",type:"S",cat:"1-Handed",size:"M",ranged:!1},rapier:{dmg:"1d6",crit:"18-20/×2",type:"P",cat:"1-Handed",size:"M",ranged:!1},scimitar:{dmg:"1d6",crit:"18-20/×2",type:"S",cat:"1-Handed",size:"M",ranged:!1},warhammer:{dmg:"1d8",crit:"20/×3",type:"B",cat:"1-Handed",size:"M",ranged:!1},battleaxe:{dmg:"1d8",crit:"20/×3",type:"S",cat:"1-Handed",size:"M",ranged:!1},flail:{dmg:"1d8",crit:"20/×2",type:"B",cat:"1-Handed",size:"M",ranged:!1},mace:{dmg:"1d8",crit:"20/×2",type:"B",cat:"1-Handed",size:"M",ranged:!1},"heavy mace":{dmg:"1d8",crit:"20/×2",type:"B",cat:"1-Handed",size:"M",ranged:!1},morningstar:{dmg:"1d8",crit:"20/×2",type:"B&P",cat:"1-Handed",size:"M",ranged:!1},shortspear:{dmg:"1d6",crit:"20/×2",type:"P",cat:"1-Handed",size:"M",ranged:!1},trident:{dmg:"1d8",crit:"20/×2",type:"P",cat:"1-Handed",size:"M",ranged:!1},greatsword:{dmg:"2d6",crit:"19-20/×2",type:"S",cat:"2-Handed",size:"M",ranged:!1},greataxe:{dmg:"1d12",crit:"20/×3",type:"S",cat:"2-Handed",size:"M",ranged:!1},greatclub:{dmg:"1d10",crit:"20/×2",type:"B",cat:"2-Handed",size:"M",ranged:!1},longspear:{dmg:"1d8",crit:"20/×3",type:"P",cat:"2-Handed",size:"M",ranged:!1},quarterstaff:{dmg:"1d6",crit:"20/×2",type:"B",cat:"2-Handed",size:"M",ranged:!1},glaive:{dmg:"1d10",crit:"20/×3",type:"S",cat:"2-Handed",size:"M",ranged:!1},halberd:{dmg:"1d10",crit:"20/×3",type:"P&S",cat:"2-Handed",size:"M",ranged:!1},"heavy flail":{dmg:"1d10",crit:"19-20/×2",type:"B",cat:"2-Handed",size:"M",ranged:!1},lance:{dmg:"1d8",crit:"20/×3",type:"P",cat:"2-Handed",size:"M",ranged:!1},scythe:{dmg:"2d4",crit:"20/×4",type:"P&S",cat:"2-Handed",size:"M",ranged:!1},falchion:{dmg:"2d4",crit:"18-20/×2",type:"S",cat:"2-Handed",size:"M",ranged:!1},shortbow:{dmg:"1d6",crit:"20/×3",type:"P",cat:"2-Handed",size:"M",ranged:!0},longbow:{dmg:"1d8",crit:"20/×3",type:"P",cat:"2-Handed",size:"M",ranged:!0},"light crossbow":{dmg:"1d8",crit:"19-20/×2",type:"P",cat:"2-Handed",size:"M",ranged:!0},"heavy crossbow":{dmg:"1d10",crit:"19-20/×2",type:"P",cat:"2-Handed",size:"M",ranged:!0},"hand crossbow":{dmg:"1d4",crit:"19-20/×2",type:"P",cat:"Light",size:"T",ranged:!0},javelin:{dmg:"1d6",crit:"20/×2",type:"P",cat:"1-Handed",size:"M",ranged:!0},sling:{dmg:"1d4",crit:"20/×2",type:"B",cat:"2-Handed",size:"S",ranged:!0},"throwing axe":{dmg:"1d6",crit:"20/×2",type:"S",cat:"Light",size:"S",ranged:!0},pitchfork:{dmg:"1d6",crit:"20/×2",type:"P",cat:"2-Handed",size:"M",ranged:!1},shovel:{dmg:"1d6",crit:"20/×2",type:"B",cat:"2-Handed",size:"M",ranged:!1}};function al(e,t){if(!e)return[];const s=[],a=e.toLowerCase();for(const[n,l]of Object.entries(yn))if(a.includes(n)){const i=t.str?Jt(parseInt(t.str)):0,r=t.dex?Jt(parseInt(t.dex)):0,d=l.ranged?r:i,c=a.match(new RegExp(`\\+(\\d)\\s*${n}`)),o=c?parseInt(c[1]):0;s.push({name:o?`+${o} ${n}`:n,...l,atkMod:d,enhancement:o,strMod:i,dexMod:r})}return s}const ka={"padded armor":{ac:1,maxDex:8,checkPenalty:0,weight:10,type:"light",arcFail:5},"leather armor":{ac:2,maxDex:6,checkPenalty:0,weight:15,type:"light",arcFail:10},"studded leather":{ac:3,maxDex:5,checkPenalty:-1,weight:20,type:"light",arcFail:15},"studded leather armor":{ac:3,maxDex:5,checkPenalty:-1,weight:20,type:"light",arcFail:15},"chain shirt":{ac:4,maxDex:4,checkPenalty:-2,weight:25,type:"light",arcFail:20},"hide armor":{ac:3,maxDex:4,checkPenalty:-3,weight:25,type:"medium",arcFail:20},"scale mail":{ac:4,maxDex:3,checkPenalty:-4,weight:30,type:"medium",arcFail:25},chainmail:{ac:5,maxDex:2,checkPenalty:-5,weight:40,type:"medium",arcFail:30},breastplate:{ac:5,maxDex:3,checkPenalty:-4,weight:30,type:"medium",arcFail:25},"splint mail":{ac:6,maxDex:0,checkPenalty:-7,weight:45,type:"heavy",arcFail:40},"banded mail":{ac:6,maxDex:1,checkPenalty:-6,weight:35,type:"heavy",arcFail:35},"half-plate":{ac:7,maxDex:0,checkPenalty:-7,weight:50,type:"heavy",arcFail:40},"full plate":{ac:8,maxDex:1,checkPenalty:-6,weight:50,type:"heavy",arcFail:35}},La={buckler:{ac:1,checkPenalty:-1,weight:5,arcFail:5},"light wooden shield":{ac:1,checkPenalty:-1,weight:5,arcFail:5},"light steel shield":{ac:1,checkPenalty:-1,weight:6,arcFail:5},"heavy wooden shield":{ac:2,checkPenalty:-2,weight:10,arcFail:15},"heavy steel shield":{ac:2,checkPenalty:-2,weight:15,arcFail:15},"tower shield":{ac:4,checkPenalty:-10,weight:45,arcFail:50}};function sl(e,t){const s=t.dex?Jt(parseInt(t.dex)):0;let a=0,n=0,l=99,i=0;const r=e.filter(v=>v.equipped);for(const v of r){const b=(v.item_name||"").toLowerCase(),y=ka[b],h=La[b];y&&(v.slot==="armor"||v.item_type==="armor")&&(a=Math.max(a,y.ac),l=Math.min(l,y.maxDex),i+=y.checkPenalty),h&&(v.slot==="off_hand"||v.item_type==="shield")&&(n=Math.max(n,h.ac),i+=h.checkPenalty);const f=b.match(/^\+(\d)/);if(f){const w=parseInt(f[1]),A=b.replace(/^\+\d\s*/,"");ka[A]&&(a+=w),La[A]&&(n+=w)}}const d=Math.min(s,l),c=0,o=10+a+n+d+c,p=10+d+c,g=10+a+n+c;return{total:o,touch:p,flatFooted:g,armorBonus:a,shieldBonus:n,dexBonus:d,sizeBonus:c,maxDex:l,checkPenalty:i}}const nl=Object.freeze(Object.defineProperty({__proto__:null,ARMOR_DB:ka,SHIELD_DB:La,WEAPON_DB:yn,calcEquippedAC:sl,parseGearWeapons:al},Symbol.toStringTag,{value:"Module"})),Qt={"3.5e":{rules:tl,combat:nl}};function wn(){var t;return((t=ne().activeCampaign)==null?void 0:t.edition)||"3.5e"}function Ga(e){var s;const t=wn();return((s=Qt[t])==null?void 0:s.rules)||Qt["3.5e"].rules}function il(e){var s;const t=wn();return((s=Qt[t])==null?void 0:s.combat)||Qt["3.5e"].combat}function $n(e){return Ga().parseClass(e)}function Ca(e){return Ga().abilityMod(e)}function ll(e,t){return Ga().calcBAB(e,t)}function za(e,t){return il().parseGearWeapons(e,t)}const ts={Wizard:{type:"prepared",source:"arcane",ability:"INT",abilKey:"int_",maxSpellLevel:9,startsAt:1,useSpellbook:!0},Sorcerer:{type:"spontaneous",source:"arcane",ability:"CHA",abilKey:"cha",maxSpellLevel:9,startsAt:1},Cleric:{type:"prepared",source:"divine",ability:"WIS",abilKey:"wis",maxSpellLevel:9,startsAt:1,hasDomains:!0},Druid:{type:"prepared",source:"divine",ability:"WIS",abilKey:"wis",maxSpellLevel:9,startsAt:1},Bard:{type:"spontaneous",source:"arcane",ability:"CHA",abilKey:"cha",maxSpellLevel:6,startsAt:1},Paladin:{type:"prepared",source:"divine",ability:"WIS",abilKey:"wis",maxSpellLevel:4,startsAt:4},Ranger:{type:"prepared",source:"divine",ability:"WIS",abilKey:"wis",maxSpellLevel:4,startsAt:4},Adept:{type:"prepared",source:"divine",ability:"WIS",abilKey:"wis",maxSpellLevel:5,startsAt:1}};function rl(e){if(!e)return null;const t=Object.keys(ts).find(s=>e.toLowerCase().includes(s.toLowerCase()));return t?{...ts[t],className:t}:null}function ol(e){const t=[];for(let s=0;s<=9;s++){const a=e==null?void 0:e[`slots_${s}`];a==null||a===""||a==="—"||a==="-"?t.push(null):t.push(parseInt(a)||0)}return t}function cl(e,t){return t<=0||e<t?0:1+Math.floor((e-t)/4)}function dl(e){return e<10?-1:e-10}function pl(e,t,s){const a=ol(e),n=Math.floor((t-10)/2),l=dl(t),i=[],r=(s==null?void 0:s.hasDomains)||!1;for(let d=0;d<=((s==null?void 0:s.maxSpellLevel)||9);d++){const c=a[d];if(c===null){i.push({level:d,base:null,bonus:0,total:0,dc:0,available:!1,domainSlot:!1});continue}const o=d===0||d<=l,p=o?cl(n,d):0,g=o?c+p:0,v=o?10+d+n:0,b=r&&o&&d>=1&&c!==null;i.push({level:d,base:c,bonus:p,total:g,dc:v,available:o&&g>0,domainSlot:b})}return i}const ul={1:[4,2],2:[5,2],3:[5,3],4:[6,3,1],5:[6,4,2],6:[7,4,2,1],7:[7,5,3,2],8:[8,5,3,2,1],9:[8,5,4,3,2],10:[9,5,4,3,2,1],11:[9,5,5,4,3,2],12:[9,5,5,4,3,2,1],13:[9,5,5,4,4,3,2],14:[9,5,5,4,4,3,2,1],15:[9,5,5,4,4,4,3,2],16:[9,5,5,4,4,4,3,2,1],17:[9,5,5,4,4,4,3,3,2],18:[9,5,5,4,4,4,3,3,2,1],19:[9,5,5,4,4,4,3,3,3,2],20:[9,5,5,4,4,4,3,3,3,3]},ml={1:[4],2:[5,2],3:[6,3],4:[6,3,2],5:[6,4,3],6:[6,4,3],7:[6,4,4,2],8:[6,4,4,3],9:[6,4,4,3],10:[6,4,4,4,2],11:[6,4,4,4,3],12:[6,4,4,4,3],13:[6,4,4,4,4,2],14:[6,4,4,4,4,3],15:[6,4,4,4,4,3],16:[6,5,4,4,4,4,2],17:[6,5,5,4,4,4,3],18:[6,5,5,5,4,4,3],19:[6,5,5,5,5,4,4],20:[6,5,5,5,5,5,4]};function vl(e,t){const s=Math.min(20,Math.max(1,t||1));let a;if(e!=null&&e.toLowerCase().includes("sorcerer"))a=ul;else if(e!=null&&e.toLowerCase().includes("bard"))a=ml;else return null;const n=a[s]||[],l=[];for(let i=0;i<=9;i++)l.push(n[i]!==void 0?n[i]:null);return l}const hl={Brd:"Bard",Sor:"Sorcerer",Wiz:"Wizard",Clr:"Cleric",Drd:"Druid",Pal:"Paladin",Rgr:"Ranger",Adp:"Adept",Bard:"Bard",Sorcerer:"Sorcerer",Wizard:"Wizard",Cleric:"Cleric",Druid:"Druid",Paladin:"Paladin",Ranger:"Ranger",Adept:"Adept"};function gl(e){if(!e)return{};const t={};for(const s of e.split(",").map(a=>a.trim())){const a=s.match(/^(.+?)\s+(\d+)$/);if(!a)continue;const n=a[1].split("/").map(i=>i.trim()),l=parseInt(a[2]);for(const i of n){const r=hl[i]||i;t[r]=l}}return t}function as(e,t){const s=gl(e);if(s[t]!==void 0)return s[t];for(const[a,n]of Object.entries(s))if(a.toLowerCase().includes(t.toLowerCase())||t.toLowerCase().includes(a.toLowerCase()))return n;return null}async function bl(e){return(await N("get_spells_known",{params:{character_id:e}})).spells||[]}async function fl(e){return N("save_spell_known",{method:"POST",body:e})}async function yl(e){return N("delete_spell_known",{method:"POST",body:{id:e}})}async function wl(e){return(await N("get_spells_prepared",{params:{character_id:e}})).spells||[]}async function oa(e){return N("save_spell_prepared",{method:"POST",body:e})}async function $l(e){return N("delete_spell_prepared",{method:"POST",body:{id:e}})}async function Sl(e){return N("clear_spells_prepared",{method:"POST",body:{character_id:e}})}async function ss(e,t=!0){return N("mark_spell_used",{method:"POST",body:{id:e,used:t?1:0}})}async function _l(e){return N("rest_all_spells",{method:"POST",body:{character_id:e}})}async function kl(e){return(await N("get_spellbook",{params:{character_id:e}})).spells||[]}async function Ll(e){return N("save_spellbook_entry",{method:"POST",body:e})}async function Cl(e){return N("delete_spellbook_entry",{method:"POST",body:{id:e}})}async function ac(e){return N("apply_level_up",{method:"POST",body:e})}const rt=e=>e>=0?`+${e}`:`${e}`;function El(e){const t={fort:"",ref:"",will:""};if(!e)return t;const s=e.match(/Fort\s*([+-]?\d+)/i);s&&(t.fort=rt(parseInt(s[1])));const a=e.match(/Ref\s*([+-]?\d+)/i);a&&(t.ref=rt(parseInt(a[1])));const n=e.match(/Will\s*([+-]?\d+)/i);return n&&(t.will=rt(parseInt(n[1]))),t}function Sn(e){const t={total:"",touch:"",flat:"",armor:"",shield:"",dex:"",natural:"",misc:""};if(!e)return t;const s=String(e).match(/^(\d+)/);s&&(t.total=s[1]);const a=String(e).match(/touch\s*:?\s*(\d+)/i);a&&(t.touch=a[1]);const n=String(e).match(/flat[- ]?footed\s*:?\s*(\d+)/i);n&&(t.flat=n[1]);const l=String(e).match(/armor\s*[+:]?\s*(\d+)/i);l&&(t.armor=l[1]);const i=String(e).match(/shield\s*[+:]?\s*(\d+)/i);i&&(t.shield=i[1]);const r=String(e).match(/dex\s*[+:]?\s*([+-]?\d+)/i);r&&(t.dex=r[1]);const d=String(e).match(/natural\s*[+:]?\s*(\d+)/i);return d&&(t.natural=d[1]),t}function Tl(e){if(!e||!e.trim())return[];const t=[];for(const s of e.split(/[;]|\sor\s/i)){const a=s.trim();if(!a)continue;let n="Melee";/ranged|bow|crossbow|sling|thrown|javelin/i.test(a)&&(n="Ranged"),/touch/i.test(a)&&(n="Touch");const l=a.match(/([+-]\d+)/),i=l?l[1]:"+0",r=a.match(/(\d+d\d+(?:[+-]\d+)?)/i),d=r?r[1]:"",c=a.match(/((?:\d+-\d+\/)?x\d+)/i),o=c?c[1]:"20/x2";let p=a.replace(/^(melee|ranged):\s*/i,"").replace(/[+-]\d+/g,"").replace(/\(\s*\d+d\d+.*?\)/g,"").replace(/\d+d\d+[+-]?\d*/gi,"").replace(/(?:\d+-\d+\/)?x\d+/g,"").replace(/[()]/g,"").trim()||"Attack";t.push({name:p,bonus:i,damage:d,type:n,crit:o})}return t}const xl=[{name:"Appraise",ability:"INT"},{name:"Balance",ability:"DEX"},{name:"Bluff",ability:"CHA"},{name:"Climb",ability:"STR"},{name:"Concentration",ability:"CON"},{name:"Craft",ability:"INT"},{name:"Decipher Script",ability:"INT"},{name:"Diplomacy",ability:"CHA"},{name:"Disable Device",ability:"INT"},{name:"Disguise",ability:"CHA"},{name:"Escape Artist",ability:"DEX"},{name:"Forgery",ability:"INT"},{name:"Gather Information",ability:"CHA"},{name:"Handle Animal",ability:"CHA"},{name:"Heal",ability:"WIS"},{name:"Hide",ability:"DEX"},{name:"Intimidate",ability:"CHA"},{name:"Jump",ability:"STR"},{name:"Knowledge (Arcana)",ability:"INT"},{name:"Knowledge (Architecture)",ability:"INT"},{name:"Knowledge (Dungeoneering)",ability:"INT"},{name:"Knowledge (Geography)",ability:"INT"},{name:"Knowledge (History)",ability:"INT"},{name:"Knowledge (Local)",ability:"INT"},{name:"Knowledge (Nature)",ability:"INT"},{name:"Knowledge (Nobility)",ability:"INT"},{name:"Knowledge (Religion)",ability:"INT"},{name:"Knowledge (The Planes)",ability:"INT"},{name:"Listen",ability:"WIS"},{name:"Move Silently",ability:"DEX"},{name:"Open Lock",ability:"DEX"},{name:"Perform",ability:"CHA"},{name:"Profession",ability:"WIS"},{name:"Ride",ability:"DEX"},{name:"Search",ability:"INT"},{name:"Sense Motive",ability:"WIS"},{name:"Sleight of Hand",ability:"DEX"},{name:"Spellcraft",ability:"INT"},{name:"Spot",ability:"WIS"},{name:"Survival",ability:"WIS"},{name:"Swim",ability:"STR"},{name:"Tumble",ability:"DEX"},{name:"Use Magic Device",ability:"CHA"},{name:"Use Rope",ability:"DEX"}];function Al(e,t){const s={};if(e)for(const a of e.split(/[,;]/)){const n=a.trim().match(/^(.+?)\s+([+-]?\d+)$/);n&&(s[n[1].trim().toLowerCase()]=parseInt(n[2]))}return xl.map(a=>{const n=t[a.ability]||0,l=a.name.toLowerCase();let i=s[l]!==void 0?s[l]:n;const r=s[l]!==void 0?Math.max(0,i-n):0;return{name:a.name,ability:a.ability,total:i,ranks:r,misc:i-n-r}})}const Ml={Dwarf:["Darkvision 60ft","Stability","Stonecunning","+2 vs Poison","+2 vs Spells"],Elf:["Low-Light Vision","Weapon Proficiency (Bows/Swords)","Keen Senses","Immune to Sleep"],Halfling:["+1 Attack with Thrown","+2 Climb/Jump/Listen/Move Silently","+1 All Saves","+2 vs Fear"],Gnome:["Low-Light Vision","+2 vs Illusions","+1 Attack vs Kobolds/Goblinoids","Speak with Animals"],"Half-Elf":["Low-Light Vision","+2 Diplomacy/Gather Info","+1 Listen/Search/Spot","Immune to Sleep"],"Half-Orc":["Darkvision 60ft","Orc Blood"],Human:["Bonus Feat","Extra Skill Points"]},ql={Fighter:e=>{const t=["Bonus Feats"];return e>=2&&t.push("Bravery"),e>=3&&t.push("Armour Training"),t},Rogue:e=>{const t=["Sneak Attack","Trapfinding"];return e>=2&&t.push("Evasion"),t},Wizard:()=>["Arcane Spellcasting","Scribe Scroll","Summon Familiar","Bonus Feats"],Cleric:()=>["Divine Spellcasting","Turn Undead","Domain Powers"],Ranger:e=>{const t=["Track","Wild Empathy","Favored Enemy"];return e>=2&&t.push("Two-Weapon Style"),t},Paladin:e=>{const t=["Aura of Good","Detect Evil","Smite Evil"];return e>=2&&t.push("Divine Grace","Lay on Hands"),t},Barbarian:e=>{const t=["Fast Movement","Rage"];return e>=2&&t.push("Uncanny Dodge"),t},Bard:()=>["Bardic Music","Bardic Knowledge","Countersong","Fascinate","Arcane Spellcasting"],Druid:()=>["Animal Companion","Nature Sense","Wild Empathy","Wild Shape","Divine Spellcasting"],Monk:e=>{const t=["Flurry of Blows","Unarmed Strike"];return e>=2&&t.push("Evasion"),t},Sorcerer:()=>["Arcane Spellcasting","Summon Familiar"]},st={skill:null,feat:null,equipment:null};async function Dl(e){if(st[e])return st[e];try{const{apiGetSrdSkills:t,apiGetSrdFeats:s,apiGetSrdEquipment:a}=await re(async()=>{const{apiGetSrdSkills:n,apiGetSrdFeats:l,apiGetSrdEquipment:i}=await Promise.resolve().then(()=>sn);return{apiGetSrdSkills:n,apiGetSrdFeats:l,apiGetSrdEquipment:i}},void 0);if(e==="skill"){const n=await t();st.skill=n.data||[]}else if(e==="feat"){const n=await s();st.feat=n.data||[]}else if(e==="equipment"){const n=await a();st.equipment=n.data||[]}}catch{st[e]=[]}return st[e]||[]}function Il(e,t){if(!t||!e.length)return null;const s=t.toLowerCase().trim();let a=e.find(l=>l.name&&l.name.toLowerCase()===s);if(a)return a;const n=s.split(/\s+/);return n.length>=2&&(a=e.find(l=>l.name&&l.name.toLowerCase()===n[n.length-1]+", "+n.slice(0,-1).join(" ")),a||(a=e.find(l=>l.name&&l.name.toLowerCase()===n.slice(1).join(" ")+", "+n[0]),a))?a:(a=e.find(l=>l.name&&(l.name.toLowerCase().includes(s)||s.includes(l.name.toLowerCase()))),a||null)}function _n(e){let t=document.getElementById("sheet-tooltip");t||(t=document.createElement("div"),t.id="sheet-tooltip",t.className="sheet-tooltip",document.body.appendChild(t)),e.querySelectorAll("[data-srd-type]").forEach(s=>{s.addEventListener("mouseenter",async()=>{t.textContent="Loading...",t.style.display="block";const a=s.getBoundingClientRect();t.style.left=a.left+"px",t.style.top=a.bottom+4+"px";const n=await Dl(s.dataset.srdType),l=Il(n,s.dataset.srdName);if(l){const i=l.full_text||l.description||l.benefit||l.effect||"";t.innerHTML=`<strong>${l.name}</strong><br>${i.length>300?i.substring(0,300)+"...":i||"No description."}`}else t.innerHTML=`<strong>${s.dataset.srdName}</strong><br><em>No SRD entry found</em>`}),s.addEventListener("mouseleave",()=>{t.style.display="none"})})}function Pe(e,t,{onListRefresh:s,onDelete:a,containerRef:n}){var D,Y,K,ae,oe,he,z,pe,L,J,te;if(!e||!t)return;const l=t.class||"",i=parseInt(t.level)||$n(t.class).level||0,r=["STR","DEX","CON","INT","WIS","CHA"].map(R=>{const j=R==="INT"?t.int_:t[R.toLowerCase()],X=parseInt(j)||10,V=Ca(X);return{name:R,score:X,mod:V,modStr:rt(V),val:j}}),d={};r.forEach(R=>d[R.name]=R.mod);const c=ll(l,i),o=bn(c,0).map(R=>(R>=0?"+":"")+R).join("/"),p=El(t.saves),g=Sn(t.ac),v=Al(t.skills_feats||"",d),b=v.filter(R=>R.ranks>0||R.total>0),y=(t.feats||"").split(/[,;]/).map(R=>R.trim()).filter(Boolean),h=(t.gear||"").split(/[,;]/).map(R=>R.trim()).filter(Boolean),f=(t.languages||"").split(/[,;]/).map(R=>R.trim()).filter(Boolean);let w=Tl(t.atk||"");if(!w.length&&t.gear){const R=za(t.gear,t),j=((D=r.find(V=>V.name==="STR"))==null?void 0:D.mod)||0,X=((Y=r.find(V=>V.name==="DEX"))==null?void 0:Y.mod)||0;w=R.map(V=>{const se=V.ranged?X:j,ee=c+se+(V.enhancement||0),ie=(V.ranged?0:j)+(V.enhancement||0);return{name:V.name.charAt(0).toUpperCase()+V.name.slice(1),bonus:(ee>=0?"+":"")+ee,damage:V.dmg+(ie?(ie>=0?"+":"")+ie:""),type:V.ranged?"Ranged":"Melee",crit:V.crit,weaponData:V}})}const A=t.race||"",k=Ml[A]||[],_=ql[l],P=_?typeof _=="function"?_(i):_:[],F=[...k,...P],I=(l||"").replace(/\s+\d+$/,"").toUpperCase(),M=`${(t.race||"").toUpperCase()} ${I} ${i}${t.title?" / "+t.title.toUpperCase():""}`,C=t.portrait_url?`<img class="cs-portrait-img" src="${t.portrait_url}" alt="${t.name}" onerror="this.parentElement.innerHTML='<div class=\\'cs-portrait-placeholder\\'><span>📜</span></div>'">`:'<div class="cs-portrait-placeholder"><span>📜</span></div>',u=/^\s*(\d+(?:,\d+)?)\s*(pp|gp|sp|cp|ep)\s*$/i,x={pp:0,gp:0,ep:0,sp:0,cp:0},B=[];for(const R of h){const j=R.match(u);j?x[j[2].toLowerCase()]+=parseInt(j[1].replace(",","")):B.push(R)}e.innerHTML=`
  <div class="cs-sheet">
    <!-- Header -->
    <div class="cs-header">
      <div class="cs-header-left">
        <div class="cs-portrait-wrap" id="cs-portrait-click" title="Click to upload portrait" style="cursor:pointer;position:relative;">
          ${C}
          <div class="cs-portrait-overlay"><span>📷</span></div>
          <input type="file" id="cs-portrait-header-file" accept="image/*" style="display:none">
        </div>
        <div class="cs-header-info">
          <h1 class="cs-name">${t.name}</h1>
          <p class="cs-subtitle">${M}</p>
          ${t.status==="Deceased"?'<span class="cs-deceased">☠ DECEASED</span>':""}
        </div>
      </div>
      <div class="cs-header-right">
        <button class="cs-action-btn" id="cs-edit-btn" title="Edit">✎</button>
        <button class="cs-action-btn" id="cs-pdf-btn" title="Export PDF">📄</button>
        <button class="cs-action-btn" id="cs-levelup-btn" title="Manual Level Up">⬆</button>
        <button class="cs-action-btn" id="cs-ai-levelup-btn" title="AI Level Up" style="color:#b39ddb;">🤖</button>
        <button class="cs-action-btn cs-action-del" id="cs-delete-btn" title="Delete">✕</button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="cs-tabs">
      <button class="cs-tab active" data-tab="page1">📋 Page 1</button>
      <button class="cs-tab" data-tab="page2">🎒 Page 2</button>
      <button class="cs-tab" data-tab="social">🤝 Social</button>
      <button class="cs-tab" data-tab="family">🌳 Family</button>
      <button class="cs-tab" data-tab="background">📖 Background</button>
    </div>

    <!-- Tab Content -->
    <div class="cs-tab-content" id="cs-tab-page1">
      ${Pl(t,r,p,g,c,o,w,b,v)}
    </div>
    <div class="cs-tab-content" id="cs-tab-page2" style="display:none;">
      ${Hl(t,B,x,y,F,f,l)}
    </div>
    <div class="cs-tab-content" id="cs-tab-social" style="display:none;">
      <div class="cs-social-grid">
        <div class="cs-block">
          <div class="cs-block-title">🤝 Relationships <span class="cs-block-count" id="cs-rel-count"></span></div>
          <div id="cs-rel-list" class="social-rel-list"><div class="cs-loading">Loading...</div></div>
          <div class="social-add-bar"><button class="social-add-btn" id="cs-add-rel-btn">+ Add Relationship</button></div>
        </div>
        <div class="cs-block">
          <div class="cs-block-title">🧠 Memories <span class="cs-block-count" id="cs-mem-count"></span></div>
          <div id="cs-mem-list" class="social-mem-list"><div class="cs-loading">Loading...</div></div>
          <div class="social-add-bar"><button class="social-add-btn" id="cs-add-mem-btn">+ Add Memory</button></div>
        </div>
      </div>
    </div>
    <div class="cs-tab-content" id="cs-tab-family" style="display:none;">
      <div id="cs-family-tree-root"><div class="cs-loading">Loading family tree...</div></div>
    </div>
    <div class="cs-tab-content" id="cs-tab-background" style="display:none;">
      ${Yl(t)}
    </div>

    <!-- Roll Log (persistent across tabs) -->
    <div class="cs-roll-log-bar">
      <div class="cs-roll-log-header">🎲 Roll Log <span id="cs-roll-log-clear">Clear</span></div>
      <div class="cs-roll-log" id="cs-roll-log"></div>
    </div>
  </div>`;let $=!1,E=!1,m=!1,S=!1;e.querySelectorAll(".cs-tab").forEach(R=>{R.addEventListener("click",()=>{e.querySelectorAll(".cs-tab").forEach(j=>j.classList.remove("active")),e.querySelectorAll(".cs-tab-content").forEach(j=>j.style.display="none"),R.classList.add("active"),e.querySelector(`#cs-tab-${R.dataset.tab}`).style.display="",R.dataset.tab==="page2"&&!$&&t.id&&($=!0,is(e,t.id,t,{onListRefresh:s,onDelete:a,containerRef:n})),R.dataset.tab==="social"&&!E&&t.id&&(E=!0,Fl(e,t.id,t)),R.dataset.tab==="page2"&&!m&&t.id&&(m=!0,Ge(e,t.id,t)),R.dataset.tab==="family"&&!S&&t.id&&(S=!0,Kl(e,t.id,t,{onListRefresh:s,containerRef:n}))})}),t.id&&(is(e,t.id,t,{onListRefresh:s,onDelete:a,containerRef:n}),$=!0),jl(e,t),_n(e),(K=e.querySelector(".cs-debug-toggle"))==null||K.addEventListener("click",()=>{const R=e.querySelector(".cs-debug-content"),j=e.querySelector(".cs-debug-toggle .cs-block-count");if(R){const X=R.style.display!=="none";R.style.display=X?"none":"block",j&&(j.textContent=X?"▶ click to expand":"▼ click to collapse")}});const T=e.querySelector("#cs-roll-log");function q(R,j,X){if(!T)return;const V=new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit"}),se=document.createElement("div");se.className="roll-log-entry roll-log-"+R,se.innerHTML=`<span class="roll-log-time">${V}</span><span class="roll-log-label">${j}</span>${X}`,T.prepend(se)}(ae=e.querySelector("#cs-roll-log-clear"))==null||ae.addEventListener("click",()=>{T&&(T.innerHTML="")}),e.querySelectorAll(".cs-skill-row[data-skill]").forEach(R=>{R.style.cursor="pointer",R.addEventListener("click",async()=>{const j=b.find(ee=>ee.name===R.dataset.skill)||v.find(ee=>ee.name===R.dataset.skill);if(!j)return;const{showModal:X}=await re(async()=>{const{showModal:ee}=await Promise.resolve().then(()=>Ie);return{showModal:ee}},void 0),{el:V,close:se}=X({title:"Skill Check: "+j.name,width:"narrow",content:`<div class="skill-check-body"><div class="skill-check-info"><span class="skill-check-label">Modifier:</span><span class="skill-check-mod">${rt(j.total)}</span></div><div class="skill-check-extra"><label>Extra:</label><input type="number" id="sk-extra" value="0" class="skill-check-input"/></div><button id="sk-roll" class="btn-primary skill-roll-btn">Roll d20</button></div>`});V.querySelector("#sk-roll").addEventListener("click",()=>{const ee=Math.floor(Math.random()*20)+1,ie=parseInt(V.querySelector("#sk-extra").value)||0,Q=ee+j.total+ie;q("skill",j.name,`<span class="roll-log-dice">[${ee}]</span> + ${j.total+ie} = <strong>${Q}</strong>${ee===20?' <span class="roll-crit">NAT 20!</span>':""}${ee===1?' <span class="roll-fumble">NAT 1!</span>':""}`),R.classList.add("roll-flash"),setTimeout(()=>R.classList.remove("roll-flash"),400),se()}),V.querySelector("#sk-roll").focus()})}),e.querySelectorAll(".cs-attack-block[data-atk-idx]").forEach(R=>{R.addEventListener("click",async()=>{const j=w[parseInt(R.dataset.atkIdx)];if(!j)return;const X=parseInt(j.bonus)||0,{showModal:V}=await re(async()=>{const{showModal:Q}=await Promise.resolve().then(()=>Ie);return{showModal:Q}},void 0),{el:se,close:ee}=V({title:"Attack: "+j.name,width:"narrow",content:`<div class="skill-check-body"><div class="wsim-result-stats" style="margin-bottom:0.5rem"><span>Type: ${j.type}</span><span>Dmg: ${j.damage}</span><span>Crit: ${j.crit}</span></div><div class="skill-check-info"><span class="skill-check-label">Bonus:</span><span class="skill-check-mod">${j.bonus}</span></div><div class="skill-check-extra"><label>Extra:</label><input type="number" id="atk-extra" value="0" class="skill-check-input"/></div><button id="atk-roll" class="btn-primary skill-roll-btn">Roll Attack + Damage</button><button id="dmg-only" class="btn-secondary skill-roll-btn" style="margin-left:0.5rem">Damage Only</button></div>`});function ie(){const Q=(j.damage||"1d4").match(/(\d+)d(\d+)([+-]\d+)?/);if(!Q)return{rolls:[],total:0,bonus:0};const ve=[];let de=0;const ge=parseInt(Q[3])||0;for(let Se=0;Se<parseInt(Q[1]);Se++){const fe=Math.floor(Math.random()*parseInt(Q[2]))+1;ve.push(fe),de+=fe}return{rolls:ve,total:Math.max(1,de+ge),bonus:ge}}se.querySelector("#atk-roll").addEventListener("click",()=>{const Q=Math.floor(Math.random()*20)+1,ve=parseInt(se.querySelector("#atk-extra").value)||0,de=Q+X+ve,ge=ie();let Se=`<span class="roll-log-dice">[${Q}]</span> + ${X+ve} = <strong>${de}</strong>`;Q===20?Se+=' <span class="roll-crit">CRIT!</span>':Q===1&&(Se+=' <span class="roll-fumble">MISS!</span>'),Se+=` &mdash; <span class="roll-log-dmg">${ge.rolls.join("+")}${ge.bonus?(ge.bonus>=0?"+":"")+ge.bonus:""} = ${ge.total} dmg</span>`,q("attack",j.name,Se),R.classList.add("roll-flash"),setTimeout(()=>R.classList.remove("roll-flash"),400),ee()}),se.querySelector("#dmg-only").addEventListener("click",()=>{const Q=ie();q("attack",j.name+" (dmg)",`<span class="roll-log-dmg">${Q.rolls.join("+")}${Q.bonus?(Q.bonus>=0?"+":"")+Q.bonus:""} = ${Q.total} dmg</span>`),ee()}),se.querySelector("#atk-roll").focus()})}),(oe=e.querySelector("#cs-hp-display"))==null||oe.addEventListener("click",async()=>{var ve,de,ge,Se;const R=parseInt(t.hp)||1;let j=parseInt((ve=e.querySelector("#cs-hp-display"))==null?void 0:ve.textContent)||R;const{showModal:X}=await re(async()=>{const{showModal:fe}=await Promise.resolve().then(()=>Ie);return{showModal:fe}},void 0),{el:V,close:se}=X({title:"Hit Points - "+t.name,width:"narrow",content:`<div class="hp-adjuster"><div class="hp-adjuster-display"><span class="hp-current" id="hp-cur">${j}</span><span class="hp-separator">/</span><span class="hp-max">${R}</span></div><div class="hp-adjuster-bar"><div class="hp-bar-fill" id="hp-bar" style="width:${Math.max(0,Math.min(100,j/R*100))}%"></div></div><div class="hp-adjuster-buttons"><button class="hp-btn hp-btn-dmg" data-d="-10">-10</button><button class="hp-btn hp-btn-dmg" data-d="-5">-5</button><button class="hp-btn hp-btn-dmg" data-d="-1">-1</button><button class="hp-btn hp-btn-heal" data-d="1">+1</button><button class="hp-btn hp-btn-heal" data-d="5">+5</button><button class="hp-btn hp-btn-heal" data-d="10">+10</button></div><div class="hp-adjuster-custom"><input type="number" id="hp-amt" class="form-input" value="1" min="1" style="width:80px"><button class="btn-secondary hp-btn-apply" id="hp-dmg-btn">Damage</button><button class="btn-secondary hp-btn-apply" id="hp-heal-btn">Heal</button><button class="btn-primary hp-btn-apply" id="hp-full-btn">Full Heal</button></div></div>`}),ee=V.querySelector("#hp-cur"),ie=V.querySelector("#hp-bar");function Q(fe){j=Math.max(-10,Math.min(R,fe)),ee.textContent=j,ie.style.width=Math.max(0,j/R*100)+"%",ie.style.background=j<=0?"#8b0000":j<=R*.25?"#cc3333":j<=R*.5?"#cc8833":"var(--accent)";const Be=e.querySelector("#cs-hp-display");Be&&(Be.textContent=j),Xe(ne().currentTownId||t.town_id,{id:t.id,hp:String(j)}).catch(()=>{})}V.querySelectorAll("[data-d]").forEach(fe=>fe.addEventListener("click",()=>{Q(j+parseInt(fe.dataset.d)),se()})),(de=V.querySelector("#hp-dmg-btn"))==null||de.addEventListener("click",()=>{const fe=parseInt(V.querySelector("#hp-amt").value)||0;fe>0&&(Q(j-fe),se())}),(ge=V.querySelector("#hp-heal-btn"))==null||ge.addEventListener("click",()=>{const fe=parseInt(V.querySelector("#hp-amt").value)||0;fe>0&&(Q(j+fe),se())}),(Se=V.querySelector("#hp-full-btn"))==null||Se.addEventListener("click",()=>{Q(R),se()})}),e.querySelectorAll(".purse-btn").forEach(R=>{R.addEventListener("click",async()=>{const j=R.dataset.coin,X=parseInt(R.dataset.dir),V=e.querySelector(`.purse-val[data-coin="${j}"]`);if(!V)return;let se=Math.max(0,(parseInt(V.textContent)||0)+X);V.textContent=se;const ee={};e.querySelectorAll(".purse-val").forEach(ve=>ee[ve.dataset.coin]=parseInt(ve.textContent)||0);const ie=[];e.querySelectorAll(".cs-gear-item span:last-child").forEach(ve=>{const de=ve.textContent.trim();de&&!de.endsWith("XP")&&ie.push(de)});const Q=[];ee.pp>0&&Q.push(ee.pp+" pp"),ee.gp>0&&Q.push(ee.gp+" gp"),ee.ep>0&&Q.push(ee.ep+" ep"),ee.sp>0&&Q.push(ee.sp+" sp"),ee.cp>0&&Q.push(ee.cp+" cp"),await Xe(ne().currentTownId||t.town_id,{id:t.id,gear:[...ie,...Q].join(", ")}).catch(()=>{})})}),(he=e.querySelector("#cs-portrait-file"))==null||he.addEventListener("change",async R=>{const j=R.target.files[0];if(!j)return;const X=new FileReader;X.onload=V=>{const se=new Image;se.onload=async()=>{var Se,fe;let ee=se.width,ie=se.height;const Q=Math.min(200/ee,270/ie);Q<1&&(ee=Math.round(ee*Q),ie=Math.round(ie*Q));const ve=document.createElement("canvas");ve.width=ee,ve.height=ie,ve.getContext("2d").drawImage(se,0,0,ee,ie);const de=ve.toDataURL("image/jpeg",.72);t.portrait_url=de,await Xe(ne().currentTownId||t.town_id,{id:t.id,portrait_url:de}).catch(()=>{});const ge=(fe=(Se=ne().currentTown)==null?void 0:Se.characters)==null?void 0:fe.find(Be=>Be.id===t.id);ge&&(ge.portrait_url=de),Pe(e,t,{onListRefresh:s,onDelete:a,containerRef:n})},se.src=V.target.result},X.readAsDataURL(j)});const H=e.querySelector("#cs-portrait-click"),W=e.querySelector("#cs-portrait-header-file");H&&W&&(H.addEventListener("click",R=>{R.target.closest("input")||W.click()}),W.addEventListener("change",async R=>{const j=R.target.files[0];if(!j)return;const X=new FileReader;X.onload=V=>{const se=new Image;se.onload=async()=>{var Se,fe;let ee=se.width,ie=se.height;const Q=Math.min(200/ee,270/ie);Q<1&&(ee=Math.round(ee*Q),ie=Math.round(ie*Q));const ve=document.createElement("canvas");ve.width=ee,ve.height=ie,ve.getContext("2d").drawImage(se,0,0,ee,ie);const de=ve.toDataURL("image/jpeg",.72);t.portrait_url=de,await Xe(ne().currentTownId||t.town_id,{id:t.id,portrait_url:de}).catch(()=>{});const ge=(fe=(Se=ne().currentTown)==null?void 0:Se.characters)==null?void 0:fe.find(Be=>Be.id===t.id);ge&&(ge.portrait_url=de),Pe(e,t,{onListRefresh:s,onDelete:a,containerRef:n})},se.src=V.target.result},X.readAsDataURL(j)})),(z=e.querySelector("#cs-edit-btn"))==null||z.addEventListener("click",async()=>{try{const{initCreatorFromCharacter:R,renderCreator:j}=await re(async()=>{const{initCreatorFromCharacter:se,renderCreator:ee}=await import("./CharacterCreator--XtsdYhc.js");return{initCreatorFromCharacter:se,renderCreator:ee}},[]),X=ne().currentTownId||t.town_id;await R(t,{townId:X,onComplete:async()=>{var se;try{const ie=((await Le(X)).characters||[]).find(Q=>Q.id==t.id);if(ie){const Q=xe(ie),ve=((se=ne().currentTown)==null?void 0:se.characters)||[],de=ve.findIndex(ge=>ge.id==t.id);de>=0&&(ve[de]=Q),s&&s(),Pe(e,Q,{onListRefresh:s,onDelete:a,containerRef:n})}else Pe(e,t,{onListRefresh:s,onDelete:a,containerRef:n})}catch{Pe(e,t,{onListRefresh:s,onDelete:a,containerRef:n})}},onCancel:()=>Pe(e,t,{onListRefresh:s,onDelete:a,containerRef:n})}),j(e)}catch(R){console.error("Failed to open editor:",R),alert("Edit failed: "+R.message)}}),(pe=e.querySelector("#cs-pdf-btn"))==null||pe.addEventListener("click",async()=>{const R=e.querySelector("#cs-pdf-btn");R.textContent="⏳",R.disabled=!0;try{const{exportCharacterPDF:j}=await re(async()=>{const{exportCharacterPDF:X}=await import("./pdfExport-Dw8rbSyY.js");return{exportCharacterPDF:X}},__vite__mapDeps([0,1]));await j(t)}catch(j){alert("PDF export failed: "+j.message)}finally{R.textContent="📄",R.disabled=!1}}),(L=e.querySelector("#cs-delete-btn"))==null||L.addEventListener("click",async()=>{if(confirm(`Delete "${t.name}"? This cannot be undone.`))try{await mn(ne().currentTownId||t.town_id,t.id),a&&a()}catch(R){alert("Delete failed: "+R.message)}}),(J=e.querySelector("#cs-levelup-btn"))==null||J.addEventListener("click",async()=>{try{const{openLevelUpWizard:R}=await re(async()=>{const{openLevelUpWizard:j}=await import("./LevelUpWizard-k3yjN73z.js");return{openLevelUpWizard:j}},__vite__mapDeps([2,1,3]));R(t,async j=>{var X;try{const{apiGetCharacters:V,normalizeCharacter:se}=await re(async()=>{const{apiGetCharacters:ve,normalizeCharacter:de}=await Promise.resolve().then(()=>lt);return{apiGetCharacters:ve,normalizeCharacter:de}},void 0),Q=((await V(ne().currentTownId||t.town_id)).characters||[]).find(ve=>ve.id==t.id);if(Q){const ve=se(Q),de=((X=ne().currentTown)==null?void 0:X.characters)||[],ge=de.findIndex(Se=>Se.id==t.id);ge>=0&&(de[ge]=ve),s&&s(),Pe(e,ve,{onListRefresh:s,onDelete:a,containerRef:n}),q("hp","LEVEL UP",`<strong>Leveled up to ${j.selectedClass} (Level ${j.newTotalLevel})</strong>`)}}catch(V){console.error("Failed to refresh after level up:",V)}})}catch(R){const{showToast:j}=await re(async()=>{const{showToast:X}=await Promise.resolve().then(()=>it);return{showToast:X}},void 0);j("Failed to open level up wizard: "+R.message,"error")}}),(te=e.querySelector("#cs-ai-levelup-btn"))==null||te.addEventListener("click",async()=>{var se;const R=ne().currentTownId||t.town_id;if(!R||!t.id)return;const{showModal:j}=await re(async()=>{const{showModal:ee}=await Promise.resolve().then(()=>Ie);return{showModal:ee}},void 0),{el:X,close:V}=j({title:"🤖 AI Level Up",width:"wide",content:`<div class="ai-levelup-loading"><div class="ai-levelup-spinner"></div><div class="ai-levelup-text">AI is leveling up ${t.name}...<br><small>Using AI for narrative level-up decisions (5-15 sec)</small></div></div>`});try{const{apiLevelUpCharacter:ee}=await re(async()=>{const{apiLevelUpCharacter:de}=await Promise.resolve().then(()=>lt);return{apiLevelUpCharacter:de}},void 0),ie=await ee(R,t.id);if(!ie.ok)throw new Error(ie.error||"AI level up failed");const Q=ie.character||{},ve=[{label:"Class",old:t.class,new:Q.class},{label:"Level",old:ie.old_level,new:ie.new_level},{label:"HP",old:t.hp,new:Q.hp},{label:"Saves",old:t.saves,new:Q.saves},{label:"STR",old:t.str,new:Q.str},{label:"DEX",old:t.dex,new:Q.dex},{label:"CON",old:t.con,new:Q.con},{label:"INT",old:t.int_,new:Q.int_},{label:"WIS",old:t.wis,new:Q.wis},{label:"CHA",old:t.cha,new:Q.cha},{label:"Feats",old:t.feats,new:Q.feats},{label:"Skills",old:t.skills_feats,new:Q.skills_feats},{label:"CR",old:t.cr,new:Q.cr}].filter(de=>String(de.old||"")!==String(de.new||""));X.innerHTML=`
        <div>
          <h4 style="color:#b39ddb;margin:0 0 0.75rem;">🤖 AI Level Up: ${t.name} → Level ${ie.new_level}</h4>
          <div class="ai-levelup-diff">
            ${ve.map(de=>`
              <div class="ai-diff-row changed">
                <span class="ai-diff-label">${de.label}</span>
                <span class="ai-diff-old">${String(de.old||"—").substring(0,80)}</span>
                <span class="ai-diff-arrow">→</span>
                <span class="ai-diff-new">${String(de.new||"—").substring(0,80)}</span>
              </div>
            `).join("")}
          </div>
          ${ie.summary?`<div class="ai-levelup-summary"><strong>AI Summary:</strong>
${ie.summary}</div>`:""}
          <div class="ai-levelup-actions">
            <button class="btn-primary btn-sm" id="ai-lu-ok">Accept</button>
          </div>
        </div>
      `,(se=X.querySelector("#ai-lu-ok"))==null||se.addEventListener("click",async()=>{var de;V();try{const{apiGetCharacters:ge,normalizeCharacter:Se}=await re(async()=>{const{apiGetCharacters:O,normalizeCharacter:G}=await Promise.resolve().then(()=>lt);return{apiGetCharacters:O,normalizeCharacter:G}},void 0),Be=((await ge(R)).characters||[]).find(O=>O.id==t.id);if(Be){const O=Se(Be),G=((de=ne().currentTown)==null?void 0:de.characters)||[],le=G.findIndex(ye=>ye.id==t.id);le>=0&&(G[le]=O),s&&s(),Pe(e,O,{onListRefresh:s,onDelete:a,containerRef:n})}}catch(ge){console.error("Refresh failed:",ge)}})}catch(ee){X.innerHTML=`
        <div style="text-align:center;padding:2rem;">
          <div style="font-size:1.5rem;margin-bottom:0.5rem;">❌</div>
          <div style="color:#ff5252;">${ee.message}</div>
          <button class="btn-secondary btn-sm" style="margin-top:1rem;" onclick="this.closest('.modal')?.remove()">Close</button>
        </div>
      `}})}function Pl(e,t,s,a,n,l,i,r,d){var p;const c=e.grapple||"—",o=(parseInt(e.level)||1)+3;return`
  <!-- Character Info Bar -->
  <div class="cs-info-bar">
    <div class="cs-info-field"><span class="cs-info-val">${e.name||""}</span><span class="cs-info-label">Character Name</span></div>
    <div class="cs-info-field"><span class="cs-info-val">${e.race||""}</span><span class="cs-info-label">Race</span></div>
    <div class="cs-info-field"><span class="cs-info-val">${e.alignment||""}</span><span class="cs-info-label">Alignment</span></div>
  </div>
  <div class="cs-phys-bar">
    <div class="cs-phys-field"><span class="cs-info-val">${e.class||""}</span><span class="cs-info-label">Class & Level</span></div>
    <div class="cs-phys-field"><span class="cs-info-val">${e.gender||""}</span><span class="cs-info-label">Gender</span></div>
    <div class="cs-phys-field"><span class="cs-info-val">${e.age||""}</span><span class="cs-info-label">Age</span></div>
    <div class="cs-phys-field"><span class="cs-info-val">${e.role||""}</span><span class="cs-info-label">Role</span></div>
  </div>

  <!-- 3-Column: Abilities | Combat | Skills -->
  <div class="cs-page1-grid">
    <!-- Left: Abilities -->
    <div class="cs-abilities-col">
      <div class="dnd-section-head">Ability Scores</div>
      <div class="cs-ability-header">
        <span></span>
        <span>Score</span>
        <span>Mod</span>
        <span>Temp</span>
        <span>T.Mod</span>
      </div>
      ${t.map(g=>`
        <div class="cs-ability-row">
          <div class="cs-ability-name">${g.name}<small>${{STR:"Strength",DEX:"Dexterity",CON:"Constitution",INT:"Intelligence",WIS:"Wisdom",CHA:"Charisma"}[g.name]||""}</small></div>
          <div class="dnd-field">${g.val||"—"}</div>
          <div class="dnd-field">${g.val?g.modStr:""}</div>
          <div class="dnd-field dnd-field-sm"></div>
          <div class="dnd-field dnd-field-sm"></div>
        </div>`).join("")}
    </div>

    <!-- Center: Combat -->
    <div class="cs-combat-col">
      <!-- HP -->
      <div>
        <div class="dnd-section-head">Hit Points</div>
        <div class="cs-hp-section">
          <div class="cs-hp-total">
            <div class="dnd-field dnd-field-lg" id="cs-hp-display" title="Click to adjust HP" style="cursor:pointer">${e.hp||"0"}</div>
            <div class="dnd-field-label">Total</div>
          </div>
          <div class="cs-hp-boxes">
            <div class="cs-hp-box"><div class="dnd-field" style="flex:1;width:100%;min-height:28px">${e.hd||""}</div><div class="dnd-field-label">Hit Dice</div></div>
            <div class="cs-hp-box"><div class="dnd-field" style="flex:1;width:100%;min-height:28px;color:#ff6b6b"></div><div class="dnd-field-label">Wounds</div></div>
          </div>
        </div>
      </div>

      <!-- Speed -->
      <div>
        <div class="dnd-section-head">Speed</div>
        <div style="display:flex;gap:0.3rem">
          <div style="display:flex;flex-direction:column;align-items:center"><div class="dnd-field">${e.spd||"30 ft"}</div><div class="dnd-field-label">Speed</div></div>
        </div>
      </div>

      <!-- AC -->
      <div>
        <div class="dnd-section-head">Armor Class</div>
        <div class="cs-ac-section">
          <div class="cs-ac-main-row">
            <div style="display:flex;flex-direction:column;align-items:center"><div class="dnd-field dnd-field-lg">${a.total||"10"}</div><div class="dnd-field-label">Total</div></div>
            <span class="cs-ac-equals">=</span>
            <div class="cs-ac-breakdown">
              <div style="display:flex;flex-direction:column;align-items:center"><div class="dnd-field dnd-field-sm">10</div><div class="dnd-field-label">Base</div></div>
              <span class="cs-ac-plus">+</span>
              <div style="display:flex;flex-direction:column;align-items:center"><div class="dnd-field dnd-field-sm">${a.armor||""}</div><div class="dnd-field-label">Armor</div></div>
              <span class="cs-ac-plus">+</span>
              <div style="display:flex;flex-direction:column;align-items:center"><div class="dnd-field dnd-field-sm">${a.shield||""}</div><div class="dnd-field-label">Shield</div></div>
              <span class="cs-ac-plus">+</span>
              <div style="display:flex;flex-direction:column;align-items:center"><div class="dnd-field dnd-field-sm">${a.dex||""}</div><div class="dnd-field-label">Dex</div></div>
              <span class="cs-ac-plus">+</span>
              <div style="display:flex;flex-direction:column;align-items:center"><div class="dnd-field dnd-field-sm">${a.natural||""}</div><div class="dnd-field-label">Natural</div></div>
              <span class="cs-ac-plus">+</span>
              <div style="display:flex;flex-direction:column;align-items:center"><div class="dnd-field dnd-field-sm">${a.misc||""}</div><div class="dnd-field-label">Misc</div></div>
            </div>
          </div>
          <div class="cs-ac-sub-row">
            <div class="cs-ac-sub-item"><span class="cs-ac-sub-label">Touch</span><div class="dnd-field dnd-field-sm">${a.touch||"—"}</div></div>
            <div class="cs-ac-sub-item"><span class="cs-ac-sub-label">Flat-Footed</span><div class="dnd-field dnd-field-sm">${a.flat||"—"}</div></div>
          </div>
        </div>
      </div>

      <!-- Initiative -->
      <div>
        <div class="dnd-section-head">Initiative</div>
        <div class="cs-init-row">
          <div style="display:flex;flex-direction:column;align-items:center"><div class="dnd-field">${e.init||"+0"}</div><div class="dnd-field-label">Total</div></div>
          <span class="cs-ac-equals">=</span>
          <div style="display:flex;flex-direction:column;align-items:center"><div class="dnd-field dnd-field-sm">${((p=t.find(g=>g.name==="DEX"))==null?void 0:p.modStr)||"+0"}</div><div class="dnd-field-label">Dex Mod</div></div>
          <span class="cs-ac-plus">+</span>
          <div style="display:flex;flex-direction:column;align-items:center"><div class="dnd-field dnd-field-sm"></div><div class="dnd-field-label">Misc</div></div>
        </div>
      </div>

      <!-- Saving Throws -->
      <div>
        <div class="dnd-section-head">Saving Throws</div>
        <div class="cs-saves-section">
          <div class="cs-save-header">
            <span></span><span>Total</span><span>Base</span><span>Ability</span><span>Magic</span><span>Misc</span><span>Temp</span>
          </div>
          ${[{name:"Fortitude",sub:"CON",val:s.fort},{name:"Reflex",sub:"DEX",val:s.ref},{name:"Will",sub:"WIS",val:s.will}].map(g=>{var v;return`
            <div class="cs-save-row">
              <div class="cs-save-name">${g.name}<small>(${g.sub})</small></div>
              <div class="dnd-field">${g.val||"+0"}</div>
              <div class="dnd-field dnd-field-sm"></div>
              <div class="dnd-field dnd-field-sm">${((v=t.find(b=>b.name===g.sub))==null?void 0:v.modStr)||""}</div>
              <div class="dnd-field dnd-field-sm"></div>
              <div class="dnd-field dnd-field-sm"></div>
              <div class="dnd-field dnd-field-sm"></div>
            </div>`}).join("")}
        </div>
      </div>

      <!-- BAB & Grapple -->
      <div>
        <div class="dnd-section-head">Base Attack / Grapple</div>
        <div class="cs-bab-section">
          <div class="cs-bab-item"><span class="cs-bab-label">BAB</span><div class="dnd-field">${l}</div></div>
          <div class="cs-bab-item"><span class="cs-bab-label">Grapple</span><div class="dnd-field">${c}</div></div>
          <div class="cs-bab-item"><span class="cs-bab-label">Spell Res.</span><div class="dnd-field">${e.sr||""}</div></div>
        </div>
      </div>

      <!-- Attacks -->
      <div>
        <div class="dnd-section-head">Attacks</div>
        ${i.length?i.map((g,v)=>{var b;return`
          <div class="cs-attack-block" data-atk-idx="${v}" title="Click to roll">
            <div class="cs-atk-top">
              <div><span class="cs-atk-val-text">${g.name}</span><span class="cs-atk-label-text">Attack</span></div>
              <div><span class="cs-atk-val-text">${g.bonus}</span><span class="cs-atk-label-text">Attack Bonus</span></div>
              <div><span class="cs-atk-val-text">${g.damage}</span><span class="cs-atk-label-text">Damage</span></div>
              <div><span class="cs-atk-val-text">${g.crit}</span><span class="cs-atk-label-text">Critical</span></div>
            </div>
            <div class="cs-atk-bot">
              <div><span class="cs-atk-val-text">${((b=g.weaponData)==null?void 0:b.range)||""}</span><span class="cs-atk-label-text">Range</span></div>
              <div><span class="cs-atk-val-text">${g.type||""}</span><span class="cs-atk-label-text">Type</span></div>
              <div><span class="cs-atk-val-text"></span><span class="cs-atk-label-text">Notes</span></div>
            </div>
          </div>`}).join(""):'<div class="cs-empty">No attacks</div>'}
      </div>
    </div>

    <!-- Right: Skills -->
    <div class="cs-skills-col">
      <div class="dnd-section-head">Skills <span class="head-count">${r.length} trained · Max Ranks ${o}</span></div>
      <div class="cs-skills-list">
        <div class="cs-skill-header">
          <span>✓</span><span>Skill Name</span><span>Key</span><span>Mod</span><span>Ab</span><span>Rnk</span><span>Misc</span>
        </div>
        ${d.map(g=>{const v=g.ranks>0,b=g.total>0?"cs-val-pos":g.total<0?"cs-val-neg":"",y=t.find(w=>w.name===g.ability),h=y?y.mod:0,f=h>0?"cs-val-pos":h<0?"cs-val-neg":"";return`<div class="cs-skill-row" data-skill="${g.name}" data-srd-type="skill" data-srd-name="${g.name}">
            <div class="cs-skill-check">${v?"✓":""}</div>
            <span class="cs-skill-name">${g.name}</span>
            <span class="cs-skill-ab">${g.ability}</span>
            <span class="cs-skill-val ${b}">${rt(g.total)}</span>
            <span class="cs-skill-val ${f}">${rt(h)}</span>
            <span class="cs-skill-val">${g.ranks||""}</span>
            <span class="cs-skill-val">${g.misc||""}</span>
          </div>`}).join("")}
      </div>
    </div>
  </div>`}function Hl(e,t,s,a,n,l,i,r,d){return`
  <div class="cs-page2-grid">
    <!-- Left: Equipment + Money -->
    <div class="cs-page2-left">
      <!-- Paperdoll -->
      <div class="cs-block cs-paperdoll-block">
        <div class="cs-block-title">Equipment <span class="cs-block-count" id="cs-equip-count"></span></div>
        <div class="cs-paperdoll" id="cs-paperdoll">
          <div class="pd-row pd-row-top">
            <div class="pd-slot pd-empty" data-slot="head"><span class="pd-label">Head</span><span class="pd-item" id="pd-head"></span></div>
          </div>
          <div class="pd-row pd-row-shoulders">
            <div class="pd-slot pd-empty" data-slot="back"><span class="pd-label">Back</span><span class="pd-item" id="pd-back"></span></div>
            <div class="pd-slot pd-empty" data-slot="neck"><span class="pd-label">Neck</span><span class="pd-item" id="pd-neck"></span></div>
          </div>
          <div class="pd-row pd-row-torso">
            <div class="pd-slot pd-empty" data-slot="main_hand"><span class="pd-label">Main Hand</span><span class="pd-item" id="pd-main_hand"></span></div>
            <div class="pd-body-center">
              <svg viewBox="0 0 80 140" class="pd-svg">
                <ellipse cx="40" cy="16" rx="11" ry="13" fill="none" stroke="rgba(255,215,0,0.18)" stroke-width="1.2"/>
                <line x1="40" y1="29" x2="40" y2="82" stroke="rgba(255,215,0,0.14)" stroke-width="1.5"/>
                <line x1="40" y1="42" x2="14" y2="68" stroke="rgba(255,215,0,0.14)" stroke-width="1.2"/>
                <line x1="40" y1="42" x2="66" y2="68" stroke="rgba(255,215,0,0.14)" stroke-width="1.2"/>
                <line x1="40" y1="82" x2="24" y2="130" stroke="rgba(255,215,0,0.14)" stroke-width="1.2"/>
                <line x1="40" y1="82" x2="56" y2="130" stroke="rgba(255,215,0,0.14)" stroke-width="1.2"/>
              </svg>
            </div>
            <div class="pd-slot pd-empty" data-slot="off_hand"><span class="pd-label">Off Hand</span><span class="pd-item" id="pd-off_hand"></span></div>
          </div>
          <div class="pd-row pd-row-chest">
            <div class="pd-slot pd-empty pd-wide" data-slot="armor"><span class="pd-label">Armor</span><span class="pd-item" id="pd-armor"></span></div>
          </div>
          <div class="pd-row pd-row-mid">
            <div class="pd-slot pd-empty pd-small" data-slot="hands"><span class="pd-label">Hands</span><span class="pd-item" id="pd-hands"></span></div>
            <div class="pd-slot pd-empty" data-slot="waist"><span class="pd-label">Belt</span><span class="pd-item" id="pd-waist"></span></div>
            <div class="pd-slot pd-empty pd-small" data-slot="ring1"><span class="pd-label">Ring</span><span class="pd-item" id="pd-ring1"></span></div>
          </div>
          <div class="pd-row pd-row-bottom">
            <div class="pd-slot pd-empty pd-small" data-slot="ring2"><span class="pd-label">Ring</span><span class="pd-item" id="pd-ring2"></span></div>
            <div class="pd-slot pd-empty" data-slot="feet"><span class="pd-label">Feet</span><span class="pd-item" id="pd-feet"></span></div>
          </div>
        </div>
      </div>

      <!-- Backpack -->
      <div class="cs-block">
        <div class="cs-block-title">Backpack <span class="cs-block-count" id="cs-backpack-count"></span></div>
        <div class="cs-backpack-list" id="cs-backpack-list">
          <div class="cs-loading">Loading...</div>
        </div>
      </div>

      <!-- Add from SRD -->
      <div class="cs-add-srd-bar">
        <button class="btn-primary btn-sm cs-add-srd-btn" id="cs-add-srd-btn">📦 Add from SRD</button>
      </div>

      ${`<div class="cs-purse">
    <span class="cs-purse-title">Coin Purse</span>
    <div class="cs-purse-coins">
      ${["pp","gp","ep","sp","cp"].map(o=>`
        <div class="purse-spinner purse-${o}">
          <button class="purse-btn purse-minus" data-coin="${o}" data-dir="-1">−</button>
          <span class="purse-val" data-coin="${o}">${s[o]}</span>
          <label class="purse-label">${o}</label>
          <button class="purse-btn purse-plus" data-coin="${o}" data-dir="1">+</button>
        </div>`).join("")}
    </div>
  </div>`}
      ${Ol(e)}
    </div>

    <!-- Center: Feats + Traits + Languages -->
    <div class="cs-page2-center">
      <div>
        <div class="dnd-section-head">Feats</div>
        <div class="cs-feats-list">
          ${a.length?a.map(o=>`<div class="cs-feat-item" data-srd-type="feat" data-srd-name="${o}">${o}</div>`).join(""):'<div class="cs-empty">No feats</div>'}
        </div>
      </div>

      <div>
        <div class="dnd-section-head">Special Abilities</div>
        <div class="cs-traits-list">
          ${n.length?n.map(o=>`<div class="cs-trait-item">${o}</div>`).join(""):'<div class="cs-empty">No special abilities</div>'}
        </div>
      </div>

      <div>
        <div class="dnd-section-head">Languages</div>
        <div class="cs-languages">${l.length?l.join(", "):"Common"}</div>
      </div>

      <div class="cs-block cs-ai-debug">
        <div class="cs-block-title cs-debug-toggle" style="cursor:pointer;user-select:none;">🤖 AI Character Data <span class="cs-block-count" style="font-size:0.65rem;">▶ click to expand</span></div>
        <div class="cs-debug-content" style="display:none;">
          <pre class="cs-debug-json" style="font-size:0.65rem;line-height:1.3;background:rgba(0,0,0,0.3);padding:0.5rem;border-radius:4px;overflow-x:auto;max-height:400px;overflow-y:auto;color:var(--text-secondary);white-space:pre-wrap;word-break:break-word;">${JSON.stringify({name:e.name,race:e.race,class:e.class,gender:e.gender,age:e.age,status:e.status,alignment:e.alignment,hp:e.hp,ac:e.ac,init:e.init,spd:e.spd,hd:e.hd,str:e.str,dex:e.dex,con:e.con,int_:e.int_,wis:e.wis,cha:e.cha,saves:e.saves,grapple:e.grapple,atk:e.atk,skills_feats:e.skills_feats,feats:e.feats,spells:e.spells||"",gear:e.gear,languages:e.languages,role:e.role,spouse:e.spouse,cr:e.cr,xp:e.xp},null,2).replace(/</g,"&lt;").replace(/>/g,"&gt;")}</pre>
        </div>
      </div>
    </div>

    <!-- Right: Spells -->
    <div class="cs-page2-right">
      ${Gl(e,i)}
    </div>
  </div>`}const Rl={armor:"armor",shield:"off_hand",weapon:"main_hand",ring:"ring1"},Nl=["head","neck","back","main_hand","armor","off_hand","hands","ring1","ring2","waist","feet"],kn={head:"Head",neck:"Neck",back:"Back",main_hand:"Main Hand",armor:"Armor",off_hand:"Off Hand",hands:"Hands",ring1:"Ring 1",ring2:"Ring 2",waist:"Belt",feet:"Feet"};function Bl(e){const t=e.filter(s=>!s.equipped);return t.length?t.map(s=>{const a={weapon:"⚔️",armor:"🛡️",shield:"🛡️",potion:"🧪",scroll:"📜",wand:"🪄",ring:"💍",wondrous:"✨"}[s.item_type]||"📦";let n=Rl[s.item_type]||"";if(!n){const d=(s.item_name||"").toLowerCase(),c=["sword","dagger","axe","bow","crossbow","mace","hammer","spear","staff","quarterstaff","sickle","club","flail","morningstar","scimitar","rapier","trident","javelin","sling","lance","halberd","glaive","scythe","falchion","warhammer","battleaxe","greataxe","greatsword"],o=["armor","mail","plate","breastplate","chain shirt","hide"],p=["shield","buckler"];c.some(g=>d.includes(g))?n="main_hand":p.some(g=>d.includes(g))?n="off_hand":o.some(g=>d.includes(g))&&(n="armor")}const l=(s.item_name||"").replace(/\s*\(.*\)/,"").replace(/\+\d+/,"").replace(/masterwork\s*/i,"").trim();let i=!1,r="";try{const d=typeof s.properties=="string"?JSON.parse(s.properties||"{}"):s.properties||{};if(d.cost){const c=Wt(d.cost);c&&c.cp>0&&(i=!0,r=d.cost)}}catch{}return`<div class="cs-backpack-item" data-item-id="${s.id}" data-srd-type="equipment" data-srd-name="${l}">
      <span class="cs-bp-icon">${a}</span>
      <span class="cs-bp-name">${s.item_name}${s.quantity>1?` ×${s.quantity}`:""}</span>
      <span class="cs-bp-actions">
        ${n?`<button class="cs-bp-equip-btn" data-item-id="${s.id}" data-slot="${n}" title="Equip to ${kn[n]||n}">⬆ Equip</button>`:""}
        ${i?`<button class="cs-bp-sell-btn" data-item-id="${s.id}" data-cost="${r}" title="Sell for ${r}">💰 Sell</button>`:""}
        <button class="cs-bp-del-btn" data-item-id="${s.id}" title="Delete">🗑️</button>
      </span>
    </div>`}).join(""):'<div class="cs-empty">Backpack is empty</div>'}function pa(e,t,s){if(!t)return;s.ac=t;const a=Sn(t),n=e.querySelector(".cs-ac-section");if(n){const l=n.querySelector(".dnd-field-lg");l&&(l.textContent=a.total||"10");const i=n.querySelectorAll(".cs-ac-sub-item .dnd-field-sm");i.length>=2&&(i[0].textContent=a.touch||"—",i[1].textContent=a.flat||"—")}}async function Fl(e,t,s,a){var b,y;const{apiGetSocialData:n,apiSaveRelationship:l,apiDeleteRelationship:i,apiGetMemories:r,apiSaveMemory:d,apiDeleteMemory:c}=await re(async()=>{const{apiGetSocialData:h,apiSaveRelationship:f,apiDeleteRelationship:w,apiGetMemories:A,apiSaveMemory:k,apiDeleteMemory:_}=await import("./social-BXKEC03o.js");return{apiGetSocialData:h,apiSaveRelationship:f,apiDeleteRelationship:w,apiGetMemories:A,apiSaveMemory:k,apiDeleteMemory:_}},[]),{getState:o}=await re(async()=>{const{getState:h}=await Promise.resolve().then(()=>$a);return{getState:h}},void 0),p={friend:"🤝",rival:"⚡",enemy:"⚔️",romantic:"❤️",mentor:"📚",student:"📖",ally:"🤜",acquaintance:"👋",family:"👨‍👩‍👧"};async function g(){const h=e.querySelector("#cs-rel-list"),f=e.querySelector("#cs-rel-count");if(h)try{const w=o().currentTownId;if(!w){h.innerHTML='<div class="social-empty"><div class="social-empty-icon">🤝</div>No town selected</div>';return}const k=((await n(w)).relationships||[]).filter(_=>_.char1_id==t||_.char2_id==t);if(f&&(f.textContent=k.length),!k.length){h.innerHTML='<div class="social-empty"><div class="social-empty-icon">🤝</div>No relationships yet</div>';return}h.innerHTML=k.map(_=>{const P=_.char1_id==t?_.char2_name:_.char1_name,F=p[_.rel_type]||"👋",I=parseInt(_.disposition)||0;let M="neutral";return I>=7?M="close":I>=3?M="friendly":I<=-7?M="hostile":I<=-3&&(M="unfriendly"),`<div class="social-rel-card" data-type="${_.rel_type}" data-rel-id="${_.id}">
          <div class="rel-icon">${F}</div>
          <div class="rel-info">
            <div class="rel-names">${s.name} ↔ ${P}</div>
            <div class="rel-type">${_.rel_type}${_.reason?" — "+_.reason:""}</div>
          </div>
          <div class="rel-disposition ${M}" title="Disposition: ${I}/10">${I>0?"+":""}${I}</div>
        </div>`}).join("")}catch(w){h.innerHTML='<div class="social-empty">Failed to load relationships</div>',console.error("Social relationships error:",w)}}async function v(){const h=e.querySelector("#cs-mem-list"),f=e.querySelector("#cs-mem-count");if(h)try{const w=await r(t);if(f&&(f.textContent=w.length),!w.length){h.innerHTML='<div class="social-empty"><div class="social-empty-icon">🧠</div>No memories yet</div>';return}h.innerHTML=w.map(A=>{const k=parseInt(A.sentiment)||0;let _="mem-sentiment-neutral";k>0?_="mem-sentiment-pos":k<0&&(_="mem-sentiment-neg");const P=(parseInt(A.importance)||5)>=7?" mem-importance-high":"";return`<div class="social-mem-card ${_}${P}" data-mem-id="${A.id}">
          <div class="mem-content">${A.content}</div>
          <div class="mem-meta">
            <span>${A.memory_type||"event"}</span>
            ${A.related_char_name?`<span>↔ ${A.related_char_name}</span>`:""}
            <span>⭐ ${A.importance||5}</span>
            ${A.game_date?`<span>📅 ${A.game_date}</span>`:""}
          </div>
        </div>`}).join("")}catch(w){h.innerHTML='<div class="social-empty">Failed to load memories</div>',console.error("Social memories error:",w)}}(b=e.querySelector("#cs-add-rel-btn"))==null||b.addEventListener("click",async()=>{var F;const{showModal:h}=await re(async()=>{const{showModal:I}=await Promise.resolve().then(()=>Ie);return{showModal:I}},void 0),{apiGetCharacters:f}=await re(async()=>{const{apiGetCharacters:I}=await Promise.resolve().then(()=>lt);return{apiGetCharacters:I}},void 0),w=o().currentTownId;if(!w)return;const k=((await f(w)).characters||[]).filter(I=>I.id!=t),{el:_,close:P}=h({title:"🤝 Add Relationship",width:"narrow",content:`<div class="modal-form">
        <label>Other Character</label>
        <select id="rel-other-char" class="form-select">
          ${k.map(I=>`<option value="${I.id}">${I.name}</option>`).join("")}
        </select>
        <label>Type</label>
        <select id="rel-type" class="form-select">
          <option value="acquaintance">Acquaintance</option>
          <option value="friend">Friend</option>
          <option value="ally">Ally</option>
          <option value="rival">Rival</option>
          <option value="enemy">Enemy</option>
          <option value="romantic">Romantic</option>
          <option value="mentor">Mentor</option>
          <option value="student">Student</option>
          <option value="family">Family</option>
        </select>
        <label>Disposition (-10 to 10)</label>
        <input type="number" id="rel-disp" class="form-input" value="0" min="-10" max="10">
        <label>Reason</label>
        <input type="text" id="rel-reason" class="form-input" placeholder="How they know each other...">
        <button class="btn-primary" id="rel-save-btn" style="margin-top:0.75rem;width:100%">Save Relationship</button>
      </div>`});(F=_.querySelector("#rel-save-btn"))==null||F.addEventListener("click",async()=>{await l({char1_id:t,char2_id:parseInt(_.querySelector("#rel-other-char").value),rel_type:_.querySelector("#rel-type").value,disposition:parseInt(_.querySelector("#rel-disp").value)||0,reason:_.querySelector("#rel-reason").value}),P(),await g()})}),(y=e.querySelector("#cs-add-mem-btn"))==null||y.addEventListener("click",async()=>{var A;const{showModal:h}=await re(async()=>{const{showModal:k}=await Promise.resolve().then(()=>Ie);return{showModal:k}},void 0),{el:f,close:w}=h({title:"🧠 Add Memory",width:"narrow",content:`<div class="modal-form">
        <label>Memory Content</label>
        <textarea id="mem-content" class="form-input" rows="3" placeholder="What does this character remember?"></textarea>
        <label>Type</label>
        <select id="mem-type" class="form-select">
          <option value="event">Event</option>
          <option value="interaction">Interaction</option>
          <option value="impression">Impression</option>
          <option value="rumor">Rumor</option>
          <option value="secret">Secret</option>
        </select>
        <label>Sentiment (-5 to 5)</label>
        <input type="number" id="mem-sentiment" class="form-input" value="0" min="-5" max="5">
        <label>Importance (1-10)</label>
        <input type="number" id="mem-importance" class="form-input" value="5" min="1" max="10">
        <button class="btn-primary" id="mem-save-btn" style="margin-top:0.75rem;width:100%">Save Memory</button>
      </div>`});(A=f.querySelector("#mem-save-btn"))==null||A.addEventListener("click",async()=>{await d({character_id:t,content:f.querySelector("#mem-content").value,memory_type:f.querySelector("#mem-type").value,sentiment:parseInt(f.querySelector("#mem-sentiment").value)||0,importance:parseInt(f.querySelector("#mem-importance").value)||5}),w(),await v()})}),await Promise.all([g(),v()])}function Wt(e){if(!e||e==="—"||e==="-")return null;const s=e.replace(/[+,]/g,"").trim().match(/^(\d+(?:\.\d+)?)\s*(pp|gp|ep|sp|cp)$/i);if(!s)return null;const a=parseFloat(s[1]),n=s[2].toLowerCase();return{cp:Math.round(a*({pp:1e3,gp:100,ep:50,sp:10,cp:1}[n]||0)),display:e.replace(/[+]/g,"").trim()}}function Ct(e){const t=Math.floor(e/1e3);e-=t*1e3;const s=Math.floor(e/100);e-=s*100;const a=Math.floor(e/50);e-=a*50;const n=Math.floor(e/10);return e-=n*10,{pp:t,gp:s,ep:a,sp:n,cp:e}}function ua(e){const t={pp:0,gp:0,ep:0,sp:0,cp:0};return e.querySelectorAll(".purse-val").forEach(s=>{t[s.dataset.coin]=parseInt(s.textContent)||0}),t}function ma(e){return(e.pp||0)*1e3+(e.gp||0)*100+(e.ep||0)*50+(e.sp||0)*10+(e.cp||0)}async function ns(e,t,s){for(const[l,i]of Object.entries(t)){const r=e.querySelector(`.purse-val[data-coin="${l}"]`);r&&(r.textContent=i)}const a=[];e.querySelectorAll(".cs-gear-item span:last-child").forEach(l=>{const i=l.textContent.trim();i&&!i.endsWith("XP")&&a.push(i)});const n=[];t.pp>0&&n.push(t.pp+" pp"),t.gp>0&&n.push(t.gp+" gp"),t.ep>0&&n.push(t.ep+" ep"),t.sp>0&&n.push(t.sp+" sp"),t.cp>0&&n.push(t.cp+" cp"),await Xe(ne().currentTownId||s.town_id,{id:s.id,gear:[...a,...n].join(", ")}).catch(()=>{})}async function is(e,t,s,a){var y;const{apiGetEquipment:n,apiEquipItem:l,apiUnequipItem:i,apiDeleteEquipment:r,apiSaveEquipment:d}=await re(async()=>{const{apiGetEquipment:h,apiEquipItem:f,apiUnequipItem:w,apiDeleteEquipment:A,apiSaveEquipment:k}=await import("./equipment-DIBB7eHT.js");return{apiGetEquipment:h,apiEquipItem:f,apiUnequipItem:w,apiDeleteEquipment:A,apiSaveEquipment:k}},[]);let c=[];try{c=await n(t)}catch{}const o=e.querySelector("#cs-backpack-list"),p=e.querySelector("#cs-equip-count"),g=e.querySelector("#cs-backpack-count");async function v(){const h={};for(const f of c)f.equipped&&f.slot&&(h[f.slot]=f);for(const f of Nl){const w=e.querySelector(`.pd-slot[data-slot="${f}"]`),A=e.querySelector(`#pd-${f}`);if(!w||!A)continue;const k=h[f];if(k){A.textContent=k.item_name,w.classList.add("pd-filled"),w.classList.remove("pd-empty"),w.dataset.itemId=k.id;const _=(k.item_name||"").replace(/\s*\(.*\)/,"").replace(/\+\d+/,"").replace(/masterwork\s*/i,"").trim();w.dataset.srdType="equipment",w.dataset.srdName=_}else A.textContent="",w.classList.remove("pd-filled"),w.classList.add("pd-empty"),delete w.dataset.itemId,delete w.dataset.srdType,delete w.dataset.srdName}o&&(o.innerHTML=Bl(c)),p&&(p.textContent=c.filter(f=>f.equipped).length+" equipped"),g&&(g.textContent=c.filter(f=>!f.equipped).length+" items"),b(),_n(e)}function b(){e.querySelectorAll(".pd-slot").forEach(h=>{h.onclick=async()=>{const f=h.dataset.slot;if(h.classList.contains("pd-filled")&&h.dataset.itemId){const w=parseInt(h.dataset.itemId),A=await i(t,w),k=c.find(_=>_.id==w);k&&(k.equipped=!1,k.slot=null),A.ac&&(pa(e,A.ac,s),a.onListRefresh&&a.onListRefresh()),await v()}else{const w=c.filter(P=>!P.equipped);if(!w.length)return;const{showModal:A}=await re(async()=>{const{showModal:P}=await Promise.resolve().then(()=>Ie);return{showModal:P}},void 0),{el:k,close:_}=A({title:"Equip to "+(kn[f]||f),width:"narrow",content:'<div class="equip-pick-list">'+w.map(P=>{const F={weapon:"⚔️",armor:"🛡️",shield:"🛡️",potion:"🧪",scroll:"📜",ring:"💍",wondrous:"✨"}[P.item_type]||"📦";return'<div class="equip-pick-item" data-id="'+P.id+'"><span>'+F+"</span><span>"+P.item_name+"</span></div>"}).join("")+"</div>"});k.querySelectorAll(".equip-pick-item").forEach(P=>{P.addEventListener("click",async()=>{const F=parseInt(P.dataset.id),I=await l(t,F,f),M=c.find(u=>u.equipped&&u.slot===f);M&&(M.equipped=!1,M.slot=null);const C=c.find(u=>u.id==F);C&&(C.equipped=!0,C.slot=f),I.ac&&(pa(e,I.ac,s),a.onListRefresh&&a.onListRefresh()),_(),await v()})})}}}),e.querySelectorAll(".cs-bp-equip-btn").forEach(h=>{h.addEventListener("click",async()=>{const f=parseInt(h.dataset.itemId),w=h.dataset.slot,A=await l(t,f,w),k=c.find(P=>P.equipped&&P.slot===w);k&&(k.equipped=!1,k.slot=null);const _=c.find(P=>P.id==f);_&&(_.equipped=!0,_.slot=w),A.ac&&(pa(e,A.ac,s),a.onListRefresh&&a.onListRefresh()),await v()})}),e.querySelectorAll(".cs-bp-del-btn").forEach(h=>{h.addEventListener("click",async()=>{const f=parseInt(h.dataset.itemId);confirm("Delete this item?")&&(await r(t,f),c=c.filter(w=>w.id!=f),await v())})}),e.querySelectorAll(".cs-bp-sell-btn").forEach(h=>{h.addEventListener("click",async()=>{var $;const f=parseInt(h.dataset.itemId),w=h.dataset.cost,A=c.find(E=>E.id==f);if(!A)return;const k=Wt(w);if(!k||k.cp<=0){const{showToast:E}=await re(async()=>{const{showToast:m}=await Promise.resolve().then(()=>it);return{showToast:m}},void 0);E(`Cannot determine sell value for "${A.item_name}"`,"warning");return}let _=50;try{const{apiGetSettings:E}=await re(async()=>{const{apiGetSettings:S}=await Promise.resolve().then(()=>ci);return{apiGetSettings:S}},void 0),m=await E();($=m.settings)!=null&&$.sell_rate&&(_=parseInt(m.settings.sell_rate)||50)}catch{}const P=Math.max(1,Math.floor(k.cp*_/100)),F=Ct(P),I=[F.pp&&`${F.pp} pp`,F.gp&&`${F.gp} gp`,F.sp&&`${F.sp} sp`,F.cp&&`${F.cp} cp`].filter(Boolean).join(", ");if(!confirm(`Sell ${A.item_name} for ${I} (${_}% of ${w})?`))return;const M=ua(e),u=ma(M)+P,x=Ct(u);await ns(e,x,s),await r(t,f),c=c.filter(E=>E.id!=f);const{showToast:B}=await re(async()=>{const{showToast:E}=await Promise.resolve().then(()=>it);return{showToast:E}},void 0);B(`Sold ${A.item_name} for ${I}`,"success"),await v()})})}v(),(y=e.querySelector("#cs-add-srd-btn"))==null||y.addEventListener("click",async()=>{var B;const{apiGetSrdEquipment:h}=await re(async()=>{const{apiGetSrdEquipment:$}=await Promise.resolve().then(()=>sn);return{apiGetSrdEquipment:$}},void 0),{showModal:f}=await re(async()=>{const{showModal:$}=await Promise.resolve().then(()=>Ie);return{showModal:$}},void 0);let w=[],A="",k="";const{el:_,close:P}=f({title:"📦 Add Equipment from SRD",width:"wide",content:`<div class="srd-equip-browser">
        <div class="srd-equip-search">
          <input type="text" id="srd-eq-search" class="form-input" placeholder="Search equipment..." autofocus>
        </div>
        <div class="srd-equip-cats" id="srd-eq-cats"></div>
        <div class="srd-equip-results" id="srd-eq-results">
          <div class="cs-loading">Loading SRD equipment...</div>
        </div>
      </div>`});try{const $=await h();w=$.data||$||[]}catch{w=[]}const F=[...new Set(w.map($=>$.category).filter(Boolean))].sort(),I=_.querySelector("#srd-eq-cats");I.innerHTML=`<button class="srd-cat-btn active" data-cat="">All (${w.length})</button>`+F.map($=>{const E=w.filter(m=>m.category===$).length;return`<button class="srd-cat-btn" data-cat="${$}">${$} (${E})</button>`}).join("");function M(){let $=w;if(A&&($=$.filter(T=>T.category===A)),k){const T=k.toLowerCase();$=$.filter(q=>(q.name||"").toLowerCase().includes(T))}const E=_.querySelector("#srd-eq-results");if(!$.length){E.innerHTML='<div class="cs-empty">No items found</div>';return}const m=ua(e),S=ma(m);E.innerHTML='<div class="srd-eq-header"><span>Name</span><span>Category</span><span>Cost</span><span>Wt</span><span>Damage</span><span></span></div>'+$.slice(0,100).map(T=>{const q=Wt(T.cost),H=q?S>=q.cp:!1,W=T.cost&&T.cost!=="—";let D="";if(W)if(H)D=`<button class="btn-sm srd-eq-buy" data-id="${T.id}" title="Buy — subtract ${T.cost} from coin purse">🪙 Buy</button>`;else{const Y=q?q.cp-S:0,K=Ct(Y),ae=[K.gp&&`${K.gp} gp`,K.sp&&`${K.sp} sp`,K.cp&&`${K.cp} cp`].filter(Boolean).join(", ")||"—";D=`<button class="btn-sm srd-eq-buy srd-eq-cant-afford" data-id="${T.id}" disabled title="Can't afford — need ${ae} more">🪙 Buy</button>`}return`<div class="srd-eq-row" data-id="${T.id}">
          <span class="srd-eq-name">${T.name}</span>
          <span class="srd-eq-cat">${T.category||"—"}</span>
          <span class="srd-eq-cost">${T.cost||"—"}</span>
          <span class="srd-eq-wt">${T.weight||"—"}</span>
          <span class="srd-eq-dmg">${T.damage||"—"}</span>
          <span class="srd-eq-actions"><button class="btn-primary btn-sm srd-eq-add" data-id="${T.id}">+ Add</button>${D}</span>
        </div>`}).join("")+($.length>100?'<div class="cs-muted" style="text-align:center;padding:0.5rem">Showing first 100 results...</div>':""),C(),u()}function C(){_.querySelectorAll(".srd-eq-add").forEach($=>{$.addEventListener("click",async E=>{E.stopPropagation();const m=parseInt($.dataset.id),S=w.find(K=>K.id===m);if(!S)return;const T=(S.category||"").toLowerCase(),q=(S.name||"").toLowerCase();let H="gear";T.includes("weapon")?H="weapon":T.includes("armor")||T.includes("shield")?H=q.startsWith("shield")||q.includes("buckler")?"shield":"armor":T.includes("potion")?H="potion":T.includes("ring")?H="ring":T.includes("wand")||T.includes("rod")||T.includes("staff")?H="wand":T.includes("scroll")&&(H="scroll");const W={};S.damage&&(W.damage=S.damage),S.critical&&(W.critical=S.critical),S.cost&&(W.cost=S.cost),S.properties&&(W.srd_properties=S.properties);const D=parseFloat((S.weight||"0").replace(/[^\d.]/g,""))||0,Y=await d(t,{item_name:S.name,item_type:H,quantity:1,weight:D,properties:JSON.stringify(W),srd_ref:"srd_equipment:"+S.id});Y.ok&&(c.push({id:Y.id,character_id:t,item_name:S.name,item_type:H,quantity:1,weight:D,properties:JSON.stringify(W),srd_ref:"srd_equipment:"+S.id,equipped:!1,slot:null}),$.textContent="✓ Added",$.disabled=!0,$.classList.remove("btn-primary"),v())})})}function u(){_.querySelectorAll(".srd-eq-buy").forEach($=>{$.addEventListener("click",async E=>{E.stopPropagation();const m=parseInt($.dataset.id),S=w.find(pe=>pe.id===m);if(!S)return;const T=Wt(S.cost);if(!T||T.cp<=0){const{showToast:pe}=await re(async()=>{const{showToast:L}=await Promise.resolve().then(()=>it);return{showToast:L}},void 0);pe(`Cannot parse cost: "${S.cost}"`,"warning");return}const q=ua(e),H=ma(q);if(H<T.cp){const{showToast:pe}=await re(async()=>{const{showToast:te}=await Promise.resolve().then(()=>it);return{showToast:te}},void 0),L=Ct(H),J=[L.pp&&`${L.pp} pp`,L.gp&&`${L.gp} gp`,L.sp&&`${L.sp} sp`,L.cp&&`${L.cp} cp`].filter(Boolean).join(", ")||"0 cp";pe(`Can't afford ${S.name} (${T.display}) — you have ${J}`,"error");return}const W=H-T.cp,D=Ct(W);await ns(e,D,s);const Y=(S.category||"").toLowerCase(),K=(S.name||"").toLowerCase();let ae="gear";Y.includes("weapon")?ae="weapon":Y.includes("armor")||Y.includes("shield")?ae=K.startsWith("shield")||K.includes("buckler")?"shield":"armor":Y.includes("potion")?ae="potion":Y.includes("ring")?ae="ring":Y.includes("wand")||Y.includes("rod")||Y.includes("staff")?ae="wand":Y.includes("scroll")&&(ae="scroll");const oe={};S.damage&&(oe.damage=S.damage),S.critical&&(oe.critical=S.critical),S.cost&&(oe.cost=S.cost),S.properties&&(oe.srd_properties=S.properties);const he=parseFloat((S.weight||"0").replace(/[^\d.]/g,""))||0,z=await d(t,{item_name:S.name,item_type:ae,quantity:1,weight:he,properties:JSON.stringify(oe),srd_ref:"srd_equipment:"+S.id});if(z.ok){c.push({id:z.id,character_id:t,item_name:S.name,item_type:ae,quantity:1,weight:he,properties:JSON.stringify(oe),srd_ref:"srd_equipment:"+S.id,equipped:!1,slot:null});const{showToast:pe}=await re(async()=>{const{showToast:L}=await Promise.resolve().then(()=>it);return{showToast:L}},void 0);pe(`Bought ${S.name} for ${T.display}`,"success"),v(),M()}})})}I.addEventListener("click",$=>{const E=$.target.closest(".srd-cat-btn");E&&(A=E.dataset.cat,I.querySelectorAll(".srd-cat-btn").forEach(m=>m.classList.remove("active")),E.classList.add("active"),M())});let x;(B=_.querySelector("#srd-eq-search"))==null||B.addEventListener("input",$=>{clearTimeout(x),x=setTimeout(()=>{k=$.target.value.trim(),M()},200)}),M()})}function Ol(e){const t=parseInt(e.xp)||0,s=parseInt(e.level)||1,a=s+1,n=a*(a-1)*500,l=s*(s-1)*500,i=n>l?Math.min(100,Math.round((t-l)/(n-l)*100)):100;return`
    <div class="cs-xp-section">
      <div class="cs-xp-header" id="cs-xp-header" title="Click to view XP log" style="cursor:pointer;">
        <div class="cs-xp-info">
          <span class="cs-xp-label">✨ Experience</span>
          <span class="cs-xp-total">${t.toLocaleString()} XP</span>
        </div>
        <div class="cs-xp-next">
          <span class="cs-xp-next-label">Next Level (${a}): ${n.toLocaleString()} XP</span>
        </div>
      </div>
      <div class="cs-xp-progress-bar">
        <div class="cs-xp-progress-fill" style="width:${i}%"></div>
        <span class="cs-xp-progress-text">${i}%</span>
      </div>
      <div class="cs-xp-log-panel" id="cs-xp-log-panel" style="display:none;">
        <div class="cs-xp-log-header">
          <span>📋 XP History</span>
          <span class="cs-xp-log-indicator" id="cs-xp-log-indicator">Loading...</span>
        </div>
        <div class="cs-xp-log-list" id="cs-xp-log-list"></div>
      </div>
    </div>`}function jl(e,t){const s=e.querySelector("#cs-xp-header"),a=e.querySelector("#cs-xp-log-panel");if(!s||!a)return;let n=!1;s.addEventListener("click",async()=>{const l=a.style.display!=="none";if(a.style.display=l?"none":"",!l&&!n&&t.id){n=!0;const i=e.querySelector("#cs-xp-log-list"),r=e.querySelector("#cs-xp-log-indicator");try{const{apiGetXpLog:d}=await re(async()=>{const{apiGetXpLog:p}=await Promise.resolve().then(()=>lt);return{apiGetXpLog:p}},void 0),o=(await d(t.id)).xp_log||[];if(r&&(r.textContent=`${o.length} entries`),!o.length){i.innerHTML='<div class="cs-xp-log-empty">No XP history yet. Run a simulation to start tracking.</div>';return}i.innerHTML=`
          <table class="cs-xp-log-table">
            <thead><tr><th>Date</th><th>XP</th><th>Source</th><th>Reason</th></tr></thead>
            <tbody>
              ${o.map(p=>{const g=p.source==="ai"?"🤖":"⚙️",v=p.source==="ai"?"AI":"System";return`<tr>
                  <td class="xplog-date">${p.game_date||"—"}</td>
                  <td class="xplog-xp">+${parseInt(p.xp_gained).toLocaleString()}</td>
                  <td class="xplog-source">${g} ${v}</td>
                  <td class="xplog-reason">${p.reason||"—"}</td>
                </tr>`}).join("")}
            </tbody>
          </table>`}catch(d){i.innerHTML=`<div class="cs-xp-log-empty">Failed to load XP log: ${d.message}</div>`,r&&(r.textContent="Error")}}})}function Gl(e,t,s,a){return["Wizard","Sorcerer","Cleric","Druid","Bard","Paladin","Ranger","Adept"].some(r=>t.toLowerCase().includes(r.toLowerCase()))?`
  <div class="cs-spell-grid">
    <div class="cs-block">
      <div class="cs-block-title">📊 Spells Per Day <span class="cs-block-count" id="cs-spell-ability-label"></span></div>
      <div id="cs-spell-slots-table"><div class="cs-loading">Loading spell data...</div></div>
      <div class="cs-spell-actions" style="margin-top:0.5rem;display:flex;gap:0.5rem;">
        <button class="btn-secondary btn-sm" id="cs-spell-rest-btn" title="Reset all used spell slots">🛏️ Rest</button>
        <button class="btn-secondary btn-sm" id="cs-spell-clear-btn" title="Clear all prepared spells" style="color:#ff5252;border-color:rgba(255,82,82,0.3);">🗑️ Clear All</button>
      </div>
      <div id="cs-metamagic-known"></div>
      ${t.toLowerCase().includes("cleric")?`
      <div id="cs-domain-section" class="domain-section">
        <div class="domain-section-title">⛪ Cleric Domains <span class="cs-block-count" id="cs-domain-names"></span></div>
        <div id="cs-domain-content"><div class="cs-loading">Loading domains...</div></div>
        <div id="cs-domain-spells-list" class="domain-spells-list"></div>
      </div>
      <div id="cs-spontaneous-section" class="spontaneous-section">
        <div class="spontaneous-title" id="cs-spontaneous-title">🔄 Spontaneous Casting</div>
        <div id="cs-spontaneous-content"></div>
      </div>`:""}
    </div>
    <div class="cs-block" style="flex:2;">
      <div class="cs-block-title" id="cs-spell-list-title">📜 Spell List</div>
      <div id="cs-spell-list"><div class="cs-loading">Loading...</div></div>
      <div class="cs-spell-add-bar" id="cs-spell-add-bar" style="margin-top:0.5rem;">
        <div style="display:flex;gap:0.4rem;align-items:center;flex-wrap:wrap;">
          <input type="text" id="cs-spell-search" class="form-input" placeholder="Search spells..." style="flex:1;min-width:100px;font-size:0.8rem;padding:0.3rem 0.5rem;">
          <select id="cs-spell-class-filter" class="form-input" style="width:auto;font-size:0.75rem;padding:0.25rem;">
            <option value="${t}">${t}</option>
          </select>
          <select id="cs-spell-level-filter" class="form-input" style="width:auto;font-size:0.75rem;padding:0.25rem;">
            <option value="">All Lvls</option>
            <option value="0">0</option><option value="1">1</option><option value="2">2</option>
            <option value="3">3</option><option value="4">4</option><option value="5">5</option>
            <option value="6">6</option><option value="7">7</option><option value="8">8</option>
            <option value="9">9</option>
          </select>
          <select id="cs-spell-school-filter" class="form-input" style="width:auto;font-size:0.75rem;padding:0.25rem;">
            <option value="">All Schools</option>
            <option value="Abjuration">Abjuration</option>
            <option value="Conjuration">Conjuration</option>
            <option value="Divination">Divination</option>
            <option value="Enchantment">Enchantment</option>
            <option value="Evocation">Evocation</option>
            <option value="Illusion">Illusion</option>
            <option value="Necromancy">Necromancy</option>
            <option value="Transmutation">Transmutation</option>
            <option value="Universal">Universal</option>
          </select>
          <button class="btn-primary btn-sm" id="cs-spell-search-btn">🔍</button>
        </div>
        <div id="cs-spell-search-results" style="margin-top:0.4rem;max-height:250px;overflow-y:auto;"></div>
      </div>
    </div>
  </div>`:'<div class="cs-spell-empty"><div class="cs-spell-empty-icon">✨</div><p>This character does not have spellcasting abilities.</p><p class="cs-muted">Only spellcasting classes (Wizard, Sorcerer, Cleric, Druid, Bard, Paladin, Ranger) have access to spells.</p></div>'}const zl={Adept:{1:[3,1],2:[3,1],3:[3,2],4:[3,2,0],5:[3,2,1],6:[3,2,1],7:[3,3,2],8:[3,3,2,0],9:[3,3,2,1],10:[3,3,2,1],11:[3,3,3,2],12:[3,3,3,2,0],13:[3,3,3,2,1],14:[3,3,3,2,1],15:[3,3,3,3,2],16:[3,3,3,3,2,0],17:[3,3,3,3,2,1],18:[3,3,3,3,2,1],19:[3,3,3,3,3,2],20:[3,3,3,3,3,2]},Wizard:{1:[3,1],2:[4,2],3:[4,2,1],4:[4,3,2],5:[4,3,2,1],6:[4,3,3,2],7:[4,4,3,2,1],8:[4,4,3,3,2],9:[4,4,4,3,2,1],10:[4,4,4,3,3,2],11:[4,4,4,4,3,2,1],12:[4,4,4,4,3,3,2],13:[4,4,4,4,4,3,2,1],14:[4,4,4,4,4,3,3,2],15:[4,4,4,4,4,4,3,2,1],16:[4,4,4,4,4,4,3,3,2],17:[4,4,4,4,4,4,4,3,2,1],18:[4,4,4,4,4,4,4,3,3,2],19:[4,4,4,4,4,4,4,4,3,3],20:[4,4,4,4,4,4,4,4,4,4]},Sorcerer:{1:[5,3],2:[6,4],3:[6,5],4:[6,6,3],5:[6,6,4],6:[6,6,5,3],7:[6,6,6,4],8:[6,6,6,5,3],9:[6,6,6,6,4],10:[6,6,6,6,5,3],11:[6,6,6,6,6,4],12:[6,6,6,6,6,5,3],13:[6,6,6,6,6,6,4],14:[6,6,6,6,6,6,5,3],15:[6,6,6,6,6,6,6,4],16:[6,6,6,6,6,6,6,5,3],17:[6,6,6,6,6,6,6,6,4],18:[6,6,6,6,6,6,6,6,5,3],19:[6,6,6,6,6,6,6,6,6,4],20:[6,6,6,6,6,6,6,6,6,6]},Cleric:{1:[3,1],2:[4,2],3:[4,2,1],4:[5,3,2],5:[5,3,2,1],6:[5,3,3,2],7:[6,4,3,2,1],8:[6,4,3,3,2],9:[6,4,4,3,2,1],10:[6,4,4,3,3,2],11:[6,5,4,4,3,2,1],12:[6,5,4,4,3,3,2],13:[6,5,5,4,4,3,2,1],14:[6,5,5,4,4,3,3,2],15:[6,5,5,5,4,4,3,2,1],16:[6,5,5,5,4,4,3,3,2],17:[6,5,5,5,5,4,4,3,2,1],18:[6,5,5,5,5,4,4,3,3,2],19:[6,5,5,5,5,5,4,4,3,3],20:[6,5,5,5,5,5,4,4,4,4]},Druid:{1:[3,1],2:[4,2],3:[4,2,1],4:[5,3,2],5:[5,3,2,1],6:[5,3,3,2],7:[6,4,3,2,1],8:[6,4,3,3,2],9:[6,4,4,3,2,1],10:[6,4,4,3,3,2],11:[6,5,4,4,3,2,1],12:[6,5,4,4,3,3,2],13:[6,5,5,4,4,3,2,1],14:[6,5,5,4,4,3,3,2],15:[6,5,5,5,4,4,3,2,1],16:[6,5,5,5,4,4,3,3,2],17:[6,5,5,5,5,4,4,3,2,1],18:[6,5,5,5,5,4,4,3,3,2],19:[6,5,5,5,5,5,4,4,3,3],20:[6,5,5,5,5,5,4,4,4,4]},Bard:{1:[2],2:[3,0],3:[3,1],4:[3,2,0],5:[3,3,1],6:[3,3,2],7:[3,3,2,0],8:[3,3,3,1],9:[3,3,3,2],10:[3,3,3,2,0],11:[3,3,3,3,1],12:[3,3,3,3,2],13:[3,3,3,3,2,0],14:[4,3,3,3,3,1],15:[4,4,3,3,3,2],16:[4,4,4,3,3,2,0],17:[4,4,4,4,3,3,1],18:[4,4,4,4,4,3,2],19:[4,4,4,4,4,4,3],20:[4,4,4,4,4,4,4]},Paladin:{1:[],2:[],3:[],4:[0],5:[0],6:[1],7:[1],8:[1,0],9:[1,0],10:[1,1],11:[1,1,0],12:[1,1,1],13:[1,1,1],14:[2,1,1,0],15:[2,1,1,1],16:[2,2,1,1],17:[2,2,2,1],18:[3,2,2,1],19:[3,3,3,2],20:[3,3,3,3]},Ranger:{1:[],2:[],3:[],4:[0],5:[0],6:[1],7:[1],8:[1,0],9:[1,0],10:[1,1],11:[1,1,0],12:[1,1,1],13:[1,1,1],14:[2,1,1,0],15:[2,1,1,1],16:[2,2,1,1],17:[2,2,2,1],18:[3,2,2,1],19:[3,3,3,2],20:[3,3,3,3]}};function Wl(e,t){const s=zl[e];if(!s)return null;const a=Math.min(20,Math.max(1,t)),n=s[a];if(!n)return null;const l={level:a,name:e};for(let i=0;i<=9;i++)l[`slots_${i}`]=i<n.length?n[i]:null;return l}async function Ge(e,t,s){const a=s.class||"",n=parseInt(s.level)||$n(s.class).level||0,l=rl(a);if(!l)return;const i=parseInt(l.abilKey==="int_"?s.int_:s[l.abilKey])||10,r=Math.floor((i-10)/2),d=e.querySelector("#cs-spell-ability-label");d&&(d.textContent=`${l.ability} ${i} (${r>=0?"+":""}${r})`);let c=null;try{c=((await Ba(l.className)).data||[]).find(A=>parseInt(A.level)===n)}catch(f){console.warn("Could not load class progression:",f)}c||(c=Wl(l.className,n));const o=pl(c,i,l);let p=[],g=[],v=[];try{l.type==="spontaneous"?p=await bl(t):(g=await wl(t),l.useSpellbook&&(v=await kl(t)))}catch(f){console.warn("Could not load spells:",f)}Ul(e,o,l,g,p),Xl(e,l,a,n,p,g,v,o,t,s);const b=e.querySelector("#cs-spell-rest-btn");b&&(b.onclick=async()=>{try{b.textContent="⏳ Resting...",b.disabled=!0,await _l(t),await Ge(e,t,s),b.textContent="✅ Rested!",setTimeout(()=>{b.textContent="🛏️ Rest",b.disabled=!1},1200)}catch(f){console.error("Rest failed:",f),b.textContent="🛏️ Rest",b.disabled=!1}});const y=e.querySelector("#cs-spell-clear-btn");y&&(l.type!=="prepared"&&(y.style.display="none"),y.onclick=async()=>{if(confirm("Clear all prepared spells? You will need to re-prepare your spells."))try{await Sl(t),await Ge(e,t,s)}catch(f){console.error("Clear failed:",f)}}),Vl(e,l,a,t,s);try{const{getKnownMetamagicFeats:f,getValidMetamagicCombinations:w,applyMetamagicEffects:A}=await re(async()=>{const{getKnownMetamagicFeats:P,getValidMetamagicCombinations:F,applyMetamagicEffects:I}=await import("./metamagic35e-BoHZwHsE.js");return{getKnownMetamagicFeats:P,getValidMetamagicCombinations:F,applyMetamagicEffects:I}},__vite__mapDeps([4,3])),k=f(s.feats||""),_=e.querySelector("#cs-metamagic-known");k.length&&_&&(_.innerHTML=`
        <div class="metamagic-known-section">
          <div class="metamagic-known-title">⚗️ Metamagic Feats</div>
          <div>${k.map(P=>`<span class="metamagic-feat-badge">${P.name}<span class="meta-slot">+${P.slotIncrease}</span></span>`).join("")}</div>
        </div>
      `,l.type==="prepared"&&(e.querySelectorAll(".metamagic-prepare-btn").forEach(P=>{P.style.display=""}),e.querySelectorAll(".metamagic-prepare-btn").forEach(P=>{P.addEventListener("click",()=>{Ea(P.dataset.spellName,parseInt(P.dataset.spellLevel)||0,o,k,t,a,e,s)})}))),e._metamagicState=k.length?{knownMeta:k,slots:o}:null}catch(f){console.warn("Metamagic integration skipped:",f)}if(a.toLowerCase().includes("cleric"))try{const{getAllDomainNames:f,parseCharacterDomains:w,getDomainSpells:A,getSpontaneousType:k,getSpontaneousSpell:_}=await re(async()=>{const{getAllDomainNames:B,parseCharacterDomains:$,getDomainSpells:E,getSpontaneousType:m,getSpontaneousSpell:S}=await import("./domains35e-DKJlY4n5.js");return{getAllDomainNames:B,parseCharacterDomains:$,getDomainSpells:E,getSpontaneousType:m,getSpontaneousSpell:S}},[]),P=s.domains||"",F=w(P),I=e.querySelector("#cs-domain-names"),M=e.querySelector("#cs-domain-content"),C=e.querySelector("#cs-domain-spells-list");if(I&&(I.textContent=F.length?F.map(B=>B.name).join(", "):"None selected"),M)if(F.length)M.innerHTML=F.map(B=>`
            <div class="domain-power-card">
              <div class="domain-power-name">${B.name}</div>
              <div class="domain-power-desc">${B.grantedPower}</div>
            </div>
          `).join("");else{const B=f();M.innerHTML=`
            <div class="domain-picker">
              <div class="domain-picker-help">Select 2 domains for this Cleric:</div>
              <div class="domain-picker-grid">
                ${B.map(m=>`<label class="domain-pick-option"><input type="checkbox" value="${m}" class="domain-checkbox"> ${m}</label>`).join("")}
              </div>
              <button class="btn-primary btn-sm" id="cs-domain-save-btn" disabled>Save Domains</button>
            </div>
          `;const $=M.querySelectorAll(".domain-checkbox"),E=M.querySelector("#cs-domain-save-btn");$.forEach(m=>{m.addEventListener("change",()=>{const S=M.querySelectorAll(".domain-checkbox:checked");if(S.length>2){m.checked=!1;return}E.disabled=S.length!==2})}),E==null||E.addEventListener("click",async()=>{const m=[...M.querySelectorAll(".domain-checkbox:checked")].map(S=>S.value);if(m.length===2)try{s.domains=m.join(", "),await Xe(ne().currentTownId||s.town_id,{id:s.id,domains:s.domains}),await Ge(e,t,s)}catch(S){console.error("Failed to save domains:",S)}})}if(C&&F.length){const B=A(P);let $="";for(let E=1;E<=9;E++){const m=B[E];if(!m)continue;const S=o.find(T=>T.level===E);if(!(!S||!S.available)){$+=`<div class="domain-spell-level"><span class="domain-spell-lvl">${E}</span>`;for(const{spell:T,domain:q}of m){const H=g.some(W=>W.spell_name===T&&W.is_domain==1&&parseInt(W.spell_level)===E);$+=`<span class="domain-spell-entry${H?" prepared":""}">
              <span class="domain-spell-name">${T}</span>
              <span class="domain-spell-src">${q}</span>
              ${H?'<span class="cs-spell-badge">✓</span>':`<button class="domain-prepare-btn btn-sm" data-spell="${T}" data-level="${E}" data-domain="${q}" title="Prepare as domain spell">📌</button>`}
            </span>`}$+="</div>"}}C.innerHTML=$||'<div class="cs-muted" style="font-size:0.75rem;padding:0.3rem;">Domain spells shown at available spell levels.</div>',C.querySelectorAll(".domain-prepare-btn").forEach(E=>{E.addEventListener("click",async()=>{try{await oa({character_id:t,spell_name:E.dataset.spell,spell_level:parseInt(E.dataset.level),slot_level:parseInt(E.dataset.level),class_name:a,is_domain:1}),await Ge(e,t,s)}catch(m){console.error("Domain prepare failed:",m)}})})}const u=e.querySelector("#cs-spontaneous-content"),x=e.querySelector("#cs-spontaneous-title");if(u){const B=k(s.alignment||""),$=B==="inflict"?"Inflict":"Cure";x&&(x.textContent=`🔄 Spontaneous ${$} Casting`);let E=`<div class="spontaneous-help">Sacrifice any prepared spell to cast a ${$} spell of the same level.</div>`;E+='<div class="spontaneous-list">';for(let m=0;m<=9;m++){const S=o.find(q=>q.level===m);if(!S||!S.available)continue;const T=_(m,B);T&&(E+=`<div class="spontaneous-spell"><span class="spontaneous-lvl">${m}</span><span class="spontaneous-name">${T}</span></div>`)}E+="</div>",u.innerHTML=E}}catch(f){console.warn("Domain integration skipped:",f)}if(l.type==="prepared"&&!l.useSpellbook&&e._metamagicState){const{knownMeta:f,slots:w}=e._metamagicState,A=e.querySelector("#cs-spell-list");A&&A.querySelectorAll(".cs-spell-prepare-btn").forEach(k=>{var P,F;if((P=k.parentElement)!=null&&P.querySelector(".metamagic-prepare-btn"))return;const _=document.createElement("button");_.className="metamagic-prepare-btn metamagic-btn",_.dataset.spellName=k.dataset.spellName,_.dataset.spellLevel=k.dataset.spellLevel,_.title="Prepare with Metamagic",_.textContent="⚗️",_.addEventListener("click",()=>{Ea(k.dataset.spellName,parseInt(k.dataset.spellLevel)||0,w,f,t,a,e,s)}),(F=k.parentElement)==null||F.appendChild(_)})}try{const f=[...p,...g,...v],w=[...new Set(f.map(A=>A.spell_name))];if(w.length){const A={};for(const _ of w)if(!A[_])try{const F=((await ia(_)).data||[]).find(I=>I.name===_);F&&(A[_]=F)}catch{}const k=e.querySelector("#cs-spell-list");k&&(k.querySelectorAll(".cs-spell-name").forEach(_=>{const P=_.dataset.spellName,F=A[P];F&&(_.dataset.spellSchool=F.school||"",_.dataset.spellCast=F.casting_time||"",_.dataset.spellRange=F.spell_range||"",_.dataset.spellDuration=F.duration||"",_.dataset.spellDesc=(F.short_description||"").replace(/"/g,"&quot;"))}),Ln(k))}}catch(f){console.warn("Could not load spell tooltips:",f)}}async function Ea(e,t,s,a,n,l,i,r){var h,f;const{getValidMetamagicCombinations:d,applyMetamagicEffects:c}=await re(async()=>{const{getValidMetamagicCombinations:w,applyMetamagicEffects:A}=await import("./metamagic35e-BoHZwHsE.js");return{getValidMetamagicCombinations:w,applyMetamagicEffects:A}},__vite__mapDeps([4,3])),o=s.reduce((w,A)=>A.available&&A.level>w?A.level:w,0),p=d(t,o,a);if(!p.length){const{showToast:w}=await re(async()=>{const{showToast:A}=await Promise.resolve().then(()=>it);return{showToast:A}},void 0);w("No valid metamagic combinations — spell level too high for available slots","warning");return}const{showModal:g}=await re(async()=>{const{showModal:w}=await Promise.resolve().then(()=>Ie);return{showModal:w}},void 0),{el:v,close:b}=g({title:`⚗️ Metamagic: ${e}`,width:"narrow",content:`
      <div class="metamagic-modal-content">
        <div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:0.75rem;">
          Base spell level: <strong>${t}</strong> — Choose a metamagic combination:
        </div>
        <div id="meta-combos">
          ${p.map((w,A)=>`
            <div class="metamagic-combo-card" data-idx="${A}">
              <div>
                <div class="metamagic-combo-feats">${w.feats.join(" + ")}</div>
                <div class="metamagic-combo-detail">${w.breakdown.join("; ")}</div>
              </div>
              <div class="metamagic-combo-slot">Slot ${w.effectiveLevel}</div>
            </div>
          `).join("")}
        </div>
        <div id="meta-effects-preview" class="metamagic-effects-preview" style="display:none;"></div>
        <div style="margin-top:0.75rem;display:flex;justify-content:flex-end;gap:0.4rem;">
          <button class="btn-secondary btn-sm" id="meta-cancel">Cancel</button>
          <button class="btn-primary btn-sm" id="meta-apply" disabled>Prepare with Metamagic</button>
        </div>
      </div>
    `});let y=null;v.querySelectorAll(".metamagic-combo-card").forEach(w=>{w.addEventListener("click",()=>{v.querySelectorAll(".metamagic-combo-card").forEach(_=>_.classList.remove("selected")),w.classList.add("selected"),y=p[parseInt(w.dataset.idx)],v.querySelector("#meta-apply").disabled=!1;const A=v.querySelector("#meta-effects-preview"),k=c("1d6",y.feats);k.notes.length?(A.style.display="",A.innerHTML=`<strong>Effects:</strong> ${k.notes.join(" | ")}`):A.style.display="none"})}),(h=v.querySelector("#meta-cancel"))==null||h.addEventListener("click",b),(f=v.querySelector("#meta-apply"))==null||f.addEventListener("click",async()=>{if(y)try{const w=v.querySelector("#meta-apply");w&&(w.disabled=!0,w.textContent="⏳ Preparing..."),await oa({character_id:n,spell_name:e,spell_level:t,slot_level:y.effectiveLevel,class_name:l,metamagic:y.feats.join(" + ")}),b(),await Ge(i,n,r)}catch(w){console.error("Metamagic prepare failed:",w);const A=v.querySelector("#meta-apply");A&&(A.disabled=!1,A.textContent="Prepare with Metamagic")}})}function Ul(e,t,s,a,n){const l=e.querySelector("#cs-spell-slots-table");if(!l)return;const i={},r={},d=s.type==="prepared"?a:n;for(const p of d){const g=parseInt(p.slot_level??p.spell_level)||0;p.used==1&&(p.is_domain==1?r[g]=(r[g]||0)+1:i[g]=(i[g]||0)+1)}let o=`<div class="cs-spell-header"><span>Lvl</span><span>Slots${t.some(p=>p.domainSlot)?' + <span class="domain-slot-label">D</span>':""}</span><span>DC</span></div>`;for(const p of t){if(!p.available&&p.base===null)continue;const g=i[p.level]||0,v=Math.max(0,p.total-g),b=p.available?v===0&&p.total>0?"cs-spell-depleted":"":"cs-spell-unavail";let y="";if(p.available&&p.total>0){const h=[];for(let k=0;k<p.total;k++)k<g?h.push('<span class="spell-pip spell-pip-used" title="Used"></span>'):h.push('<span class="spell-pip spell-pip-filled" title="Available"></span>');p.domainSlot&&((r[p.level]||0)>0?h.push('<span class="spell-pip spell-pip-domain-used" title="Domain (Used)">D</span>'):h.push('<span class="spell-pip spell-pip-domain" title="Domain Slot">D</span>'));const f=p.total+(p.domainSlot?1:0),w=g+(r[p.level]||0),A=Math.max(0,f-w);y=`<span class="spell-pip-row">${h.join("")}</span><span class="spell-pip-count">${A}/${f}</span>`}else y='<span class="spell-pip-none">—</span>';o+=`<div class="cs-spell-level-row ${b}">
      <span class="cs-spell-lvl">${p.level}</span>
      <span class="cs-spell-pips">${y}</span>
      <span class="cs-spell-dc">${p.available?p.dc:"—"}</span>
    </div>`}l.innerHTML=o}function Xl(e,t,s,a,n,l,i,r,d,c){const o=e.querySelector("#cs-spell-list"),p=e.querySelector("#cs-spell-list-title");if(o){if(t.type==="spontaneous"){p&&(p.textContent="📜 Spells Known");const g=vl(t.className,a);if(!n.length){o.innerHTML='<div class="cs-empty" style="padding:1rem;text-align:center;">No spells known yet. Use the search below to add spells.</div>';return}const v={};for(const y of n){const h=parseInt(y.spell_level)||0;v[h]||(v[h]=[]),v[h].push(y)}let b="";for(let y=0;y<=(t.maxSpellLevel||9);y++){const h=v[y];if(!h)continue;const f=g?g[y]:null;b+=`<div class="cs-spell-group-header">Level ${y}${f!==null?` (${h.length}/${f})`:""}</div>`;for(const w of h)b+=`<div class="cs-spell-item">
          <span class="cs-spell-name" data-spell-name="${w.spell_name}" title="Click for details">${w.spell_name}</span>
          <button class="cs-spell-remove" data-spell-id="${w.id}" data-spell-type="known" title="Remove">✕</button>
        </div>`}o.innerHTML=b}else{const g=t.useSpellbook;p&&(p.textContent=g?"📜 Spellbook → Prepared":"📜 Prepared Spells");let v="";if(g&&i.length){v+=`<div class="cs-spell-section-label">📖 Spellbook (${i.length} spells)</div>`;const b={};for(const y of i){const h=parseInt(y.spell_level)||0;b[h]||(b[h]=[]),b[h].push(y)}for(const[y,h]of Object.entries(b).sort((f,w)=>f[0]-w[0])){v+=`<div class="cs-spell-group-header">Level ${y}</div>`;for(const f of h){const w=l.some(A=>A.spell_name===f.spell_name&&parseInt(A.spell_level)===parseInt(f.spell_level));v+=`<div class="cs-spell-item ${w?"cs-spell-prepared":""}">
            <span class="cs-spell-name" data-spell-name="${f.spell_name}">${f.spell_name}</span>
            <div style="display:flex;gap:0.3rem;">
              ${w?'<span class="cs-spell-badge">Prepared</span>':`<button class="cs-spell-prepare-btn btn-sm" data-spell-name="${f.spell_name}" data-spell-level="${f.spell_level}" title="Prepare">📌</button><button class="metamagic-prepare-btn metamagic-btn" data-spell-name="${f.spell_name}" data-spell-level="${f.spell_level}" title="Prepare with Metamagic" style="display:none;">⚗️</button>`}
              <button class="cs-spell-remove" data-spell-id="${f.id}" data-spell-type="spellbook" title="Remove from spellbook">✕</button>
            </div>
          </div>`}}}if(l.length){v+=`<div class="cs-spell-section-label" style="margin-top:0.75rem;">📌 Prepared Today (${l.length})</div>`;const b={};for(const y of l){const h=parseInt(y.slot_level??y.spell_level)||0;b[h]||(b[h]=[]),b[h].push(y)}for(const[y,h]of Object.entries(b).sort((f,w)=>f[0]-w[0])){v+=`<div class="cs-spell-group-header">Level ${y}</div>`;for(const f of h){const w=f.used==1,A=f.metamagic?`<span class="metamagic-tag">${f.metamagic}</span>`:"";v+=`<div class="cs-spell-item cs-spell-castable ${w?"cs-spell-used":""}${f.metamagic?" cs-spell-metamagic":""}" data-cast-id="${f.id}" data-used="${w?"1":"0"}" title="Double-click to ${w?"recover":"cast"}">
            <button class="cs-spell-cast-btn ${w?"used":""}" data-spell-id="${f.id}" data-used="${w?"1":"0"}" title="${w?"Mark unused":"Cast (mark used)"}">${w?"⬜":"🔮"}</button>
            <span class="cs-spell-name" data-spell-name="${f.spell_name}">${f.spell_name}${f.is_domain==1?" <em>(D)</em>":""}${A}</span>
            <button class="cs-spell-remove" data-spell-id="${f.id}" data-spell-type="prepared" title="Unprepare">✕</button>
          </div>`}}}else(!g||!i.length)&&(v+='<div class="cs-empty" style="padding:1rem;text-align:center;">No spells prepared. Use the search below to add spells.</div>');o.innerHTML=v,o.querySelectorAll(".cs-spell-prepare-btn").forEach(b=>{b.addEventListener("click",async()=>{try{await oa({character_id:d,spell_name:b.dataset.spellName,spell_level:parseInt(b.dataset.spellLevel)||0,slot_level:parseInt(b.dataset.spellLevel)||0,class_name:s}),await Ge(e,d,c)}catch(y){console.error("Prepare failed:",y)}})}),o.querySelectorAll(".cs-spell-cast-btn").forEach(b=>{b.addEventListener("click",async()=>{try{const y=b.dataset.used==="1";await ss(parseInt(b.dataset.spellId),!y),await Ge(e,d,c)}catch(y){console.error("Cast toggle failed:",y)}})}),o.querySelectorAll(".cs-spell-castable").forEach(b=>{b.addEventListener("dblclick",async y=>{if(y.target.closest("button"))return;const h=parseInt(b.dataset.castId),f=b.dataset.used==="1";try{await ss(h,!f),await Ge(e,d,c)}catch(w){console.error("Cast toggle failed:",w)}})})}o.querySelectorAll(".cs-spell-remove").forEach(g=>{g.addEventListener("click",async()=>{const v=g.dataset.spellType,b=parseInt(g.dataset.spellId);try{v==="known"?await yl(b):v==="prepared"?await $l(b):v==="spellbook"&&await Cl(b),await Ge(e,d,c)}catch(y){console.error("Delete failed:",y)}})})}}let Et=null;function ls(){return Et||(Et=document.createElement("div"),Et.className="cs-spell-tooltip",document.body.appendChild(Et)),Et}function Ln(e){e.querySelectorAll(".cs-spell-name, .cs-spell-search-name").forEach(t=>{t.addEventListener("mouseenter",s=>{const a=ls(),n=t.dataset.spellDesc||"",l=t.dataset.spellSchool||"",i=t.dataset.spellCast||"",r=t.dataset.spellRange||"",d=t.dataset.spellDuration||"";let o=`<strong>${t.dataset.spellName||t.textContent}</strong>`;l&&(o+=`<br><em>${l}</em>`);const p=[i&&`⏱ ${i}`,r&&`📏 ${r}`,d&&`⏳ ${d}`].filter(Boolean);p.length&&(o+=`<br><span class="cs-spell-tip-details">${p.join(" · ")}</span>`),n?o+=`<br><span class="cs-spell-tip-desc">${n.length>250?n.substring(0,250)+"…":n}</span>`:o+='<br><span class="cs-spell-tip-desc"><em>No description available</em></span>',a.innerHTML=o,a.style.display="block";const g=t.getBoundingClientRect();a.style.left=Math.min(g.left,window.innerWidth-320)+"px",a.style.top=g.bottom+4+"px"}),t.addEventListener("mouseleave",()=>{ls().style.display="none"})})}function Vl(e,t,s,a,n){const l=e.querySelector("#cs-spell-search"),i=e.querySelector("#cs-spell-search-btn"),r=e.querySelector("#cs-spell-level-filter"),d=e.querySelector("#cs-spell-class-filter"),c=e.querySelector("#cs-spell-school-filter"),o=e.querySelector("#cs-spell-search-results");if(!i||!o)return;if(d){const g=d.querySelectorAll("option");for(const v of g)if(v.value&&t.className.toLowerCase().includes(v.value.toLowerCase())){v.selected=!0;break}}const p=async()=>{var h;const g=((h=l==null?void 0:l.value)==null?void 0:h.trim())||"",v=r==null?void 0:r.value,b=(d==null?void 0:d.value)||t.className,y=(c==null?void 0:c.value)||"";if(!g&&!v&&!y){o.innerHTML='<div class="cs-muted" style="padding:0.5rem;font-size:0.8rem;">Enter a search term or select a filter to browse spells.</div>';return}o.innerHTML='<div class="cs-loading" style="padding:0.5rem;">Searching...</div>';try{const A=((await ia(g||"")).data||[]).filter(k=>{const _=as(k.level,b);return!(_===null||v!==""&&v!==void 0&&parseInt(v)!==_||y&&k.school!==y)}).slice(0,30);if(!A.length){o.innerHTML=`<div class="cs-muted" style="padding:0.5rem;font-size:0.8rem;">No ${b} spells found${g?` for "${g}"`:""}${y?` (${y})`:""}</div>`;return}if(o.innerHTML=A.map(k=>{const _=as(k.level,b),P=(k.short_description||"").replace(/"/g,"&quot;");return`<div class="cs-spell-search-item">
          <div class="cs-spell-search-name" data-spell-name="${k.name}" data-spell-school="${k.school||""}" data-spell-cast="${k.casting_time||""}" data-spell-range="${k.spell_range||""}" data-spell-duration="${k.duration||""}" data-spell-desc="${P}">
            <strong>${k.name}</strong>
            <span class="cs-spell-meta">${k.school||""} [${b} ${_}]</span>
          </div>
          <button class="btn-sm btn-primary cs-spell-add-btn" data-spell-name="${k.name}" data-spell-level="${_}" data-spell-id="${k.id}">+ Add</button>
          ${t.type==="prepared"&&e._metamagicState?`<button class="btn-sm metamagic-btn cs-spell-meta-add-btn" data-spell-name="${k.name}" data-spell-level="${_}" title="Add with Metamagic">⚗️</button>`:""}
        </div>`}).join(""),Ln(o),o.querySelectorAll(".cs-spell-add-btn").forEach(k=>{k.addEventListener("click",async()=>{k.disabled=!0,k.textContent="...";try{const _=k.dataset.spellName,P=parseInt(k.dataset.spellLevel)||0;t.type==="spontaneous"?await fl({character_id:a,spell_name:_,spell_level:P,class_name:t.className}):t.useSpellbook?await Ll({character_id:a,spell_name:_,spell_level:P}):await oa({character_id:a,spell_name:_,spell_level:P,slot_level:P,class_name:t.className}),k.textContent="✓",await Ge(e,a,n)}catch(_){k.textContent="✕",console.error("Add spell failed:",_)}})}),e._metamagicState){const{knownMeta:k,slots:_}=e._metamagicState;o.querySelectorAll(".cs-spell-meta-add-btn").forEach(P=>{P.addEventListener("click",()=>{Ea(P.dataset.spellName,parseInt(P.dataset.spellLevel)||0,_,k,a,s,e,n)})})}}catch(f){o.innerHTML=`<div class="cs-muted" style="padding:0.5rem;color:var(--error);">Search failed: ${f.message}</div>`}};i.addEventListener("click",p),l==null||l.addEventListener("keydown",g=>{g.key==="Enter"&&p()}),[r,d,c].forEach(g=>{g&&g.addEventListener("change",p)})}async function Kl(e,t,s,a){const{apiGetFamilyTree:n,apiSaveFamilyLink:l,apiDeleteFamilyLink:i}=await re(async()=>{const{apiGetFamilyTree:o,apiSaveFamilyLink:p,apiDeleteFamilyLink:g}=await import("./social-BXKEC03o.js");return{apiGetFamilyTree:o,apiSaveFamilyLink:p,apiDeleteFamilyLink:g}},[]),{getState:r}=await re(async()=>{const{getState:o}=await Promise.resolve().then(()=>$a);return{getState:o}},void 0),d=e.querySelector("#cs-family-tree-root");if(!d)return;async function c(){var o;d.innerHTML='<div class="cs-loading">Loading family tree...</div>';try{let I=function(u,x=!1,B=null){if(!u||!u.id)return"";const $=u.portrait_url?`<img class="ft-portrait" src="${u.portrait_url}" alt="${u.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`:"",E=u.gender==="F"?"👩":u.gender==="M"?"👨":"🧑",m=u.class?u.class.match(/\d/)?u.class:`${u.class} ${u.level||""}`.trim():"",S=u.status==="Deceased"?" ft-deceased":"",T=x?" ft-root":"",q=x?"":`data-ft-nav="${u.id}"`,H=B&&!x?`<button class="ft-delete-btn" data-ft-del="${B}" title="Remove link">✕</button>`:"";return`<div class="ft-person${T}${S}" ${q}>
          ${H}
          <div class="ft-portrait-wrap">
            ${$}
            <div class="ft-portrait-fallback" ${$?'style="display:none"':""}>${E}</div>
          </div>
          <div class="ft-name">${u.name}</div>
          <div class="ft-meta">${u.race||""} ${m}</div>
          ${u.age?`<div class="ft-age">Age ${u.age}</div>`:""}
          ${u.status==="Deceased"?'<div class="ft-status">☠ Deceased</div>':""}
        </div>`};const p=await n(t),g=p.links||[],v={};(p.members||[]).forEach(u=>{v[u.id]=u}),v[t]||(v[t]={id:t,name:s.name,race:s.race,class:s.class,level:s.level,gender:s.gender,age:s.age,status:s.status,portrait_url:s.portrait_url,alignment:s.alignment,role:s.role,title:s.title});const b=[],y=[],h=[];for(const u of g){const x=u.family_role;x==="parent"?b.push({parentId:u.char1_id,childId:u.char2_id,linkId:u.id}):x==="spouse"?y.push({id1:u.char1_id,id2:u.char2_id,linkId:u.id}):x==="sibling"&&h.push({id1:u.char1_id,id2:u.char2_id,linkId:u.id})}const f=b.filter(u=>u.childId==t).map(u=>({...v[u.parentId],linkId:u.linkId})).filter(u=>u.id),w={};for(const u of f){const x=b.filter(B=>B.childId==u.id).map(B=>({...v[B.parentId],linkId:B.linkId})).filter(B=>B.id);w[u.id]=x}const A=y.filter(u=>u.id1==t||u.id2==t).map(u=>{const x=u.id1==t?u.id2:u.id1;return{...v[x],linkId:u.linkId}}).filter(u=>u.id)[0]||null,k=h.filter(u=>u.id1==t||u.id2==t).map(u=>{const x=u.id1==t?u.id2:u.id1;return{...v[x],linkId:u.linkId}}).filter(u=>u.id),_=b.filter(u=>u.parentId==t).map(u=>({...v[u.childId],linkId:u.linkId})).filter(u=>u.id),P={};for(const u of _){const x=b.filter(B=>B.parentId==u.id).map(B=>({...v[B.childId],linkId:B.linkId})).filter(B=>B.id);P[u.id]=x}const F=!f.length&&!A&&!k.length&&!_.length;let M='<div class="ft-container">';if(Object.values(w).some(u=>u.length>0)){M+='<div class="ft-generation ft-gen-grandparents">',M+='<div class="ft-gen-label">Grandparents</div>',M+='<div class="ft-gen-row">';for(const u of f){const x=w[u.id]||[];if(x.length){M+='<div class="ft-couple-group">';for(const B of x)M+=I(B,!1,B.linkId);M+="</div>"}}M+="</div></div>",M+='<div class="ft-connector ft-connector-horizontal"></div>'}if(f.length){M+='<div class="ft-generation ft-gen-parents">',M+='<div class="ft-gen-label">Parents</div>',M+='<div class="ft-gen-row">';for(const u of f)M+=I(u,!1,u.linkId);M+="</div></div>",M+='<div class="ft-connector ft-connector-horizontal"></div>'}if(k.length){M+='<div class="ft-generation">',M+='<div class="ft-gen-label ft-gen-label-sm">Siblings</div>',M+='<div class="ft-gen-row">';for(const u of k)M+=I(u,!1,u.linkId);M+="</div></div>",M+='<div class="ft-connector ft-connector-horizontal"></div>'}if(M+='<div class="ft-generation ft-gen-root">',M+='<div class="ft-gen-row ft-root-row">',M+=I(v[t],!0),A&&(M+='<div class="ft-connector ft-connector-vertical ft-connector-heart">❤️</div>',M+=I(A,!1,A.linkId)),M+="</div></div>",_.length){M+='<div class="ft-connector ft-connector-horizontal"></div>',M+='<div class="ft-generation ft-gen-children">',M+='<div class="ft-gen-label">Children</div>',M+='<div class="ft-gen-row">';for(const x of _)M+=I(x,!1,x.linkId);if(M+="</div></div>",Object.values(P).some(x=>x.length>0)){M+='<div class="ft-connector ft-connector-horizontal"></div>',M+='<div class="ft-generation ft-gen-grandchildren">',M+='<div class="ft-gen-label">Grandchildren</div>',M+='<div class="ft-gen-row">';for(const x of _){const B=P[x.id]||[];if(B.length){M+='<div class="ft-couple-group">';for(const $ of B)M+=I($,!1,$.linkId);M+="</div>"}}M+="</div></div>"}}M+="</div>",F&&(M=`<div class="ft-container">
          <div class="ft-empty">
            <div class="ft-empty-icon">🌳</div>
            <div class="ft-empty-title">No Family Connections Yet</div>
            <div class="ft-empty-text">Add parents, children, siblings, or a spouse to build ${s.name}'s family tree.</div>
          </div>
          <div class="ft-generation ft-gen-root">
            <div class="ft-gen-row ft-root-row">
              ${I(v[t],!0)}
            </div>
          </div>
        </div>`),M+=`<div class="ft-actions">
        <button class="btn-primary ft-add-btn" id="ft-add-link-btn">🌳 Add Family Member</button>
      </div>`,d.innerHTML=M,d.querySelectorAll("[data-ft-nav]").forEach(u=>{u.style.cursor="pointer",u.addEventListener("click",x=>{if(x.target.closest(".ft-delete-btn"))return;const B=parseInt(u.dataset.ftNav),$=v[B];$&&re(async()=>{const{apiGetCharacters:E,normalizeCharacter:m}=await Promise.resolve().then(()=>lt);return{apiGetCharacters:E,normalizeCharacter:m}},void 0).then(({apiGetCharacters:E,normalizeCharacter:m})=>{E($.town_id).then(S=>{var q;const T=(S.characters||[]).find(H=>H.id==B);if(T){const H=m(T),W=r();$.town_id!=W.currentTownId&&re(async()=>{const{setState:Y}=await Promise.resolve().then(()=>$a);return{setState:Y}},void 0).then(({setState:Y})=>{Y({currentTownId:$.town_id})}),a.onListRefresh&&a.onListRefresh();const D=((q=e.closest(".cs-sheet"))==null?void 0:q.parentElement)||e;Pe(D,H,a)}})})})}),d.querySelectorAll("[data-ft-del]").forEach(u=>{u.addEventListener("click",async x=>{x.stopPropagation();const B=parseInt(u.dataset.ftDel);if(confirm("Remove this family connection?"))try{await i(B),await c()}catch($){console.error("Delete family link failed:",$)}})}),(o=d.querySelector("#ft-add-link-btn"))==null||o.addEventListener("click",async()=>{var T;const{showModal:u}=await re(async()=>{const{showModal:q}=await Promise.resolve().then(()=>Ie);return{showModal:q}},void 0),{apiGetCharacters:x}=await re(async()=>{const{apiGetCharacters:q}=await Promise.resolve().then(()=>lt);return{apiGetCharacters:q}},void 0),B=r().currentTownId;if(!B)return;const E=((await x(B)).characters||[]).filter(q=>q.id!=t),{el:m,close:S}=u({title:"🌳 Add Family Member",width:"narrow",content:`<div class="modal-form">
            <label>Family Member</label>
            <select id="ft-target-char" class="form-select">
              ${E.map(q=>`<option value="${q.id}">${q.name} (${q.race||""} ${q.class||""})</option>`).join("")}
            </select>
            <label>Relationship</label>
            <select id="ft-link-type" class="form-select">
              <option value="parent-of">This person is ${s.name}'s Parent</option>
              <option value="child-of">This person is ${s.name}'s Child</option>
              <option value="sibling">This person is ${s.name}'s Sibling</option>
              <option value="spouse">This person is ${s.name}'s Spouse</option>
            </select>
            <button class="btn-primary" id="ft-save-btn" style="margin-top:0.75rem;width:100%">Add to Family Tree</button>
          </div>`});(T=m.querySelector("#ft-save-btn"))==null||T.addEventListener("click",async()=>{const q=parseInt(m.querySelector("#ft-target-char").value),H=m.querySelector("#ft-link-type").value;let W={};H==="parent-of"?W={char1_id:q,char2_id:t,family_role:"parent"}:H==="child-of"?W={char1_id:t,char2_id:q,family_role:"parent"}:H==="sibling"?W={char1_id:t,char2_id:q,family_role:"sibling"}:H==="spouse"&&(W={char1_id:t,char2_id:q,family_role:"spouse"});try{await l(W),S(),await c()}catch(D){console.error("Save family link failed:",D),alert("Failed to save: "+D.message)}})})}catch(p){d.innerHTML=`<div class="ft-container"><div class="ft-empty"><div class="ft-empty-icon">❌</div><div class="ft-empty-text">Failed to load family tree: ${p.message}</div></div></div>`,console.error("Family tree error:",p)}}await c()}function Yl(e){const t=e.gender==="M"?"Male":e.gender==="F"?"Female":e.gender||"—";return`
  <div class="cs-bg-grid">
    <div class="cs-bg-left">
      <div class="cs-block">
        <div class="cs-block-title">Description</div>
        <div class="cs-desc-grid">
          <div class="cs-desc-item"><span class="cs-desc-label">Age</span><span>${e.age||"—"}</span></div>
          <div class="cs-desc-item"><span class="cs-desc-label">Gender</span><span>${t}</span></div>
          <div class="cs-desc-item"><span class="cs-desc-label">Alignment</span><span>${e.alignment||"—"}</span></div>
          <div class="cs-desc-item"><span class="cs-desc-label">Role</span><span>${e.role||"—"}</span></div>
          <div class="cs-desc-item"><span class="cs-desc-label">Title</span><span>${e.title||"—"}</span></div>
          <div class="cs-desc-item"><span class="cs-desc-label">CR</span><span>${e.cr||"—"}</span></div>
        </div>
      </div>

      ${e.spouse&&e.spouse!=="None"?`
      <div class="cs-block">
        <div class="cs-block-title">${e.spouseLabel||"Spouse"}</div>
        <div class="cs-bg-text">${e.spouse}</div>
      </div>`:""}

      <div class="cs-block">
        <div class="cs-block-title">Portrait</div>
        <div class="cs-portrait-section">
          ${e.portrait_url?`<img class="cs-bg-portrait" src="${e.portrait_url}" alt="${e.name}">`:'<div class="cs-empty">No portrait</div>'}
          <div class="cs-portrait-actions">
            <label class="btn-secondary btn-sm"><span>📷 Upload</span><input type="file" id="cs-portrait-file" accept="image/*" style="display:none"></label>
          </div>
        </div>
      </div>
    </div>
    <div class="cs-bg-right">
      <div class="cs-block">
        <div class="cs-block-title">History & Backstory</div>
        <div class="cs-bg-text cs-history-text">${e.history?e.history.replace(/\n/g,"<br>"):'<span class="cs-muted">No history recorded.</span>'}</div>
      </div>
      ${e.ai_data?`
      <div class="cs-block">
        <div class="cs-block-title" style="cursor:pointer;" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'">🤖 AI Character Data <span style="font-size:0.65rem;color:var(--text-muted);">(click to expand)</span></div>
        <pre class="cs-ai-data" style="display:none;font-size:0.65rem;background:rgba(0,0,0,0.3);padding:0.5rem;border-radius:4px;overflow-x:auto;white-space:pre-wrap;word-break:break-word;color:var(--text-muted);max-height:300px;overflow-y:auto;">${typeof e.ai_data=="string"?e.ai_data.replace(/</g,"&lt;"):JSON.stringify(e.ai_data,null,2)}</pre>
      </div>`:""}
    </div>
  </div>`}const Cn=[{id:"statblock",label:"📋 Paste Statblock",desc:"Paste a D&D statblock in text format — parsed locally, no AI credits used."},{id:"ai_prompt",label:"🤖 AI Character Prompt",desc:"Describe a character in plain language and let the AI generate full stats."}];async function Jl(e,t,s){var r;let a=null,n=Cn[0].id;const{el:l,close:i}=ra({title:"📥 Import Character",width:"wide",content:Ql(n)});(r=l.querySelector("#import-method-select"))==null||r.addEventListener("change",d=>{n=d.target.value,a=null;const c=l.querySelector("#import-method-body");c&&(c.innerHTML=En(n)),rs(l,n,t,s,e,i,()=>a,o=>{a=o})}),rs(l,n,t,s,e,i,()=>a,d=>{a=d})}function Ql(e){return`
    <div class="import-modal-body">
        <div class="import-method-row">
            <label class="import-method-label">Import Method:</label>
            <select id="import-method-select" class="form-select import-method-select">
                ${Cn.map(t=>`<option value="${t.id}" ${t.id===e?"selected":""}>${t.label}</option>`).join("")}
            </select>
        </div>
        <div id="import-method-body">
            ${En(e)}
        </div>
    </div>`}function En(e){return e==="statblock"?Zl():e==="ai_prompt"?er():'<p class="muted">Unknown import method.</p>'}function Zl(){return`
        <p class="import-instructions">Paste a D&D statblock below. The parser handles formats like:<br>
            <code>Name: Race Class; CR X; HP XX; AC XX; Init +X; ...</code></p>
        <textarea id="import-textarea" class="modal-textarea" rows="8"
            placeholder="Paste statblock here...&#10;&#10;Example:&#10;Grimnar Stonefist: Dwarf Fighter 3; CR 3; hp 28; Init +1; Spd 20; AC 18; Atk +6 melee (1d8+3/x3); AL LG; SV Fort +5, Ref +2, Will +1; Str 16, Dex 12, Con 14, Int 10, Wis 12, Cha 8. Languages: Common, Dwarven. Skills/Feats: Climb +5, Intimidate +3; Power Attack, Cleave, Weapon Focus (warhammer). Gear: masterwork warhammer, breastplate, heavy steel shield."></textarea>
        <div id="import-error" class="modal-error" style="display:none;"></div>
        <div id="import-preview" class="import-preview" style="display:none;"></div>
        <div class="modal-actions">
            <button id="import-parse-btn" class="btn-secondary">👁 Preview</button>
            <button id="import-confirm-btn" class="btn-primary" disabled>📥 Import Character</button>
        </div>`}function er(){return`
        <p class="import-instructions">Describe the character you want the AI to create. Be as detailed as you like — include race, class, level, personality, backstory, or any special traits.<br>
            <span class="import-hint">⚡ Uses AI credits · one character per prompt</span></p>
        <textarea id="ai-prompt-textarea" class="modal-textarea" rows="8"
            placeholder="Example:&#10;A grizzled half-orc barbarian named Krag Bloodtusk, level 5. He's a former gladiator who earned his freedom and now works as a bounty hunter. He wields a massive greataxe and has a scar across his left eye. Chaotic neutral alignment. He's intimidating but secretly has a soft spot for stray animals."></textarea>
        <div class="ai-prompt-options">
            <div class="ai-opt-row">
                <label>Level Range:</label>
                <select id="ai-level-range" class="form-select form-select-sm">
                    <option value="">Auto (AI decides)</option>
                    <option value="1-3">Low (1–3)</option>
                    <option value="3-6" selected>Mid-Low (3–6)</option>
                    <option value="5-10">Mid (5–10)</option>
                    <option value="8-14">Mid-High (8–14)</option>
                    <option value="12-20">High (12–20)</option>
                </select>
            </div>
        </div>
        <div id="import-error" class="modal-error" style="display:none;"></div>
        <div id="import-preview" class="import-preview" style="display:none;"></div>
        <div class="modal-actions">
            <button id="ai-generate-btn" class="btn-primary">🤖 Generate Character</button>
            <button id="import-confirm-btn" class="btn-primary" disabled style="display:none;">📥 Import Character</button>
        </div>`}function rs(e,t,s,a,n,l,i,r){t==="statblock"&&tr(e,s,a,n,l,i,r),t==="ai_prompt"&&ar(e,s,a,n,l,r)}function tr(e,t,s,a,n,l,i){var r,d;(r=e.querySelector("#import-parse-btn"))==null||r.addEventListener("click",()=>{var p;const c=(p=e.querySelector("#import-textarea"))==null?void 0:p.value.trim();if(!c)return;const o=e.querySelector("#import-error");o.style.display="none";try{const g=nr(c);i(g),Tn(e,g)}catch(g){o.textContent="Parse error: "+g.message,o.style.display="block"}}),(d=e.querySelector("#import-confirm-btn"))==null||d.addEventListener("click",async()=>{const c=l();if(!c||!t)return;const o=e.querySelector("#import-confirm-btn");o.disabled=!0,o.textContent="⏳ Importing...";try{await Xe(t,c),await sr(a,t,s,c.name,n)}catch(p){o.disabled=!1,o.textContent="📥 Import Character";const g=e.querySelector("#import-error");g.textContent="Import failed: "+p.message,g.style.display="block"}})}function ar(e,t,s,a,n,l){var i;(i=e.querySelector("#ai-generate-btn"))==null||i.addEventListener("click",async()=>{var o,p;const r=(o=e.querySelector("#ai-prompt-textarea"))==null?void 0:o.value.trim();if(!r){ue("Please describe the character you want to create.","warning");return}const d=e.querySelector("#ai-generate-btn"),c=e.querySelector("#import-error");c.style.display="none",d.disabled=!0,d.innerHTML='<span class="spinner-inline"></span> Generating...';try{const g=((p=e.querySelector("#ai-level-range"))==null?void 0:p.value)||"",v=await Ni(t,r,g);if(!(v!=null&&v.ok)||!(v!=null&&v.character))throw new Error((v==null?void 0:v.error)||"AI failed to generate a character. Please try a different description.");const b=v.character;l(b),Tn(e,b),d.innerHTML='<span class="spinner-inline"></span> Saving...',await Xe(t,b);const h=((await Le(t)).characters||[]).map(xe);s.length=0,s.push(...h);const f=ne();f.currentTown&&(f.currentTown.characters=h);const w=h.find(A=>{var k,_;return((k=A.name)==null?void 0:k.toLowerCase())===((_=b.name)==null?void 0:_.toLowerCase())})||h[h.length-1];if(w){ue(`${w.name} created!`,"success"),me({selectedCharId:w.id});const A=a.querySelector("#detail-area");A&&Pe(A,w,{onListRefresh:()=>{},onDelete:()=>{},containerRef:a})}else ue(`${b.name} created!`,"success");n()}catch(g){c.textContent=g.message,c.style.display="block",d.disabled=!1,d.innerHTML="🤖 Generate Character"}})}function Tn(e,t){const s=e.querySelector("#import-preview"),a=[["Name",t.name],["Race",t.race],["Class",t.class],["CR",t.cr],["HP",t.hp],["AC",t.ac],["Init",t.init],["Speed",t.spd],["Attack",t.atk],["Alignment",t.alignment],["Saves",t.saves],["Str/Dex/Con",`${t.str||""} / ${t.dex||""} / ${t.con||""}`],["Int/Wis/Cha",`${t.int_||""} / ${t.wis||""} / ${t.cha||""}`],["Languages",t.languages],["Skills",t.skills_feats],["Feats",t.feats],["Gear",t.gear]];s.innerHTML=`<h3 class="preview-name">${t.name||"Unknown"}</h3>`+a.filter(([,l])=>l).map(([l,i])=>`<div class="preview-row"><span class="preview-label">${l}:</span> <strong>${i}</strong></div>`).join(""),s.style.display="block";const n=e.querySelector("#import-confirm-btn");n&&(n.disabled=!1)}async function sr(e,t,s,a,n){const i=((await Le(t)).characters||[]).map(xe),r=ne();r.currentTown&&(r.currentTown.characters=i),s.length=0,s.push(...i);const d=i.find(c=>c.name===a);if(d){me({selectedCharId:d.id});const c=e.querySelector("#detail-area");c&&Pe(c,d,{onListRefresh:()=>{},onDelete:()=>{},containerRef:e})}n()}function nr(e){const t={name:"",race:"",class:"",status:"Alive",cr:"",hp:"",ac:"",init:"",spd:"",grapple:"",atk:"",alignment:"",saves:"",str:"",dex:"",con:"",int_:"",wis:"",cha:"",hd:"",ecl:"",age:"",xp:"",gender:"",languages:"",skills_feats:"",feats:"",gear:"",role:"",title:"",spouse:"None",spouse_label:""},s=e.split(`
`).map(f=>f.replace(/^##\s*/,"").trim()).filter(Boolean).join(" ");let a=s;const n=["Languages?(?:\\s*spoken)?","Skills?\\/Feats?","Skills?\\s+and\\s+Feats?","Possessions?","Gear","Feats?","Special"],l=new RegExp(`\\.?\\s*(${n.join("|")})\\s*:\\s*`,"i"),i=a.search(l);let r="";i>-1&&(r=a.substring(i).replace(/^\.\s*/,""),a=a.substring(0,i).trim());const d=/(?:^|\.\s*)(Languages?\s*(?:spoken)?|Skills?\/Feats?|Skills?\s+and\s+Feats?|Possessions?|Gear|Feats?|Special)\s*:\s*/gi,c={};let o,p=null,g=0;const v=r;for(;(o=d.exec(v))!==null;)p!==null&&(c[p]=v.substring(g,o.index).replace(/\.\s*$/,"").trim()),p=o[1].toLowerCase(),g=o.index+o[0].length;p!==null&&(c[p]=v.substring(g).replace(/\.\s*$/,"").trim());for(const[f,w]of Object.entries(c))/language/i.test(f)?t.languages=w:/skill/i.test(f)?t.skills_feats=w:/^feats?$/i.test(f)?t.feats=w:/possession|gear/i.test(f)&&(t.gear=w);const b=a.split(";").map(f=>f.trim()).filter(Boolean);if(b.length<2)return t.name=a,t;const y=b[0].indexOf(":");if(y>-1&&!/\b(?:CR|hp|Init|Spd|AC|BAB|Atk|AL|SV|Str|Dex|Con|Int|Wis|Cha|HD|Fort|Ref|Will|Grapple)\b/i.test(b[0].substring(0,y))){t.name=b[0].substring(0,y).trim();const f=b[0].substring(y+1).trim(),w=f.match(/^(\S+)\s+(.+)$/);w?(t.race=w[1],t.class=w[2]):t.race=f}else if(t.name=b[0],b.length>1){const f=b[1];if(!/\b(?:CR|hp|Init|Spd|AC|BAB)\b/i.test(f)){const w=f.match(/^(\S+)\s+(.+)$/);w?(t.race=w[1],t.class=w[2]):t.race=f}}for(const f of b){const w=f.trim(),A=w.match(/^\s*(\w[\w\s/]*?)\s*[:]\s*(.+)$/);if(!A){const P=w.match(/^CR\s+(.+)/i);if(P){t.cr=P[1];continue}const F=w.match(/^hp\s+(\d+)/i);if(F){t.hp=F[1];continue}continue}const k=A[1].trim().toLowerCase(),_=A[2].trim();k==="cr"?t.cr=_:k==="ecl"?t.ecl=_:k==="age"?t.age=_:k==="xp"?t.xp=_:k==="hp"?t.hp=_:k==="hd"?t.hd=_:k==="init"?t.init=_:k==="spd"?t.spd=_:k==="ac"?t.ac=_:k==="bab"||(k==="atk"?t.atk=_:k==="grapple"?t.grapple=_:k==="al"?t.alignment=_:k==="sv"?t.saves=_:k==="size"||(k==="gender"?t.gender=_:/wife|husband/i.test(k)&&(t.spouse=_,t.spouse_label=k.charAt(0).toUpperCase()+k.slice(1))))}const h=s.match(/Str\s+(\d+).*?Dex\s+(\d+).*?Con\s+(\d+).*?Int\s+(\d+).*?Wis\s+(\d+).*?Cha\s+(\d+)/i);return h&&(t.str=h[1],t.dex=h[2],t.con=h[3],t.int_=h[4],t.wis=h[5],t.cha=h[6]),(/\(DECEASED\)/i.test(s)||/deceased/i.test(t.status))&&(t.status="Deceased"),t}const Tt={core:[{name:"Town Hall",type:"civic",desc:"The central administrative building where the town council meets and records are kept"},{name:"Tavern",type:"commercial",desc:"A lively establishment serving food, drink, and local gossip",variants:["The Rusty Flagon","The Sleeping Dragon","The Golden Goblet","The Wanderer's Rest","The Barrel & Blade","The Stag & Hound","The Copper Kettle","The Dancing Bear","The Crooked Crow","The Red Lantern","The Broken Anvil","The Merry Minstrel"]},{name:"Well",type:"infrastructure",desc:"The town's primary water source"}],common:[{name:"General Store",type:"commercial",desc:"Sells everyday goods, tools, rope, rations, and basic supplies"},{name:"Blacksmith",type:"commercial",desc:"Forges weapons, horseshoes, nails, and metal goods",variants:["Ironworks","The Forge","Hammer & Tongs"]},{name:"Temple",type:"religious",desc:"A modest temple dedicated to the local deity, offering healing and blessings",variants:["Shrine","Chapel","Sanctuary"]},{name:"Stables",type:"commercial",desc:"Houses horses, mules, and pack animals for travelers and residents"},{name:"Mill",type:"infrastructure",desc:"Grinds grain into flour for the settlement",variants:["Windmill","Water Mill","Grain Mill"]},{name:"Graveyard",type:"civic",desc:"Consecrated burial grounds tended by the local clergy"},{name:"Marketplace",type:"commercial",desc:"An open-air trading area where merchants sell wares on market days"},{name:"Palisade Wall",type:"fortification",desc:"A wooden defensive wall surrounding the settlement core"}],uncommon:[{name:"Inn",type:"commercial",desc:"Provides lodging for travelers and adventurers",variants:["The Wayfarer's Lodge","The Hearthstone Inn","The Pilgrim's Rest"]},{name:"Bakery",type:"commercial",desc:"Bakes bread, pastries, and other goods for the town"},{name:"Tannery",type:"commercial",desc:"Processes animal hides into leather, located downwind due to the smell"},{name:"Guard Post",type:"military",desc:"A small fortified post where the town watch keeps vigil"},{name:"Herbalist",type:"commercial",desc:"Sells poultices, remedies, dried herbs, and minor alchemical goods"},{name:"Carpenter's Workshop",type:"commercial",desc:"Builds furniture, repairs structures, and shapes wood"},{name:"Barracks",type:"military",desc:"Housing and training grounds for the town guard or militia"},{name:"Warehouse",type:"commercial",desc:"Stores trade goods, grain reserves, and imported supplies"},{name:"Cemetery",type:"civic",desc:"A formal burial ground with stone markers and mausoleums"},{name:"Bathhouse",type:"civic",desc:"Public bathing facilities for hygiene and socializing"},{name:"Potter's Workshop",type:"commercial",desc:"Creates clay vessels, bowls, tiles, and decorative ceramics"},{name:"Weaver's Shop",type:"commercial",desc:"Produces cloth, tapestries, and garments from local wool and flax"}],rare:[{name:"Wizard's Tower",type:"arcane",desc:"Home to the local arcanist, filled with books and magical curiosities"},{name:"Library",type:"civic",desc:"A repository of knowledge, scrolls, and historical records"},{name:"Alchemist's Lab",type:"arcane",desc:"Produces potions, acids, and experimental concoctions"},{name:"Arena",type:"entertainment",desc:"A fighting pit or amphitheater for combat exhibitions and town events"},{name:"Brewery",type:"commercial",desc:"Produces ales, meads, and local spirits"},{name:"Clocktower",type:"civic",desc:"A tall tower with a mechanical clock, visible across the settlement"},{name:"Jail",type:"civic",desc:"Holds criminals and troublemakers awaiting judgment"},{name:"Apothecary",type:"commercial",desc:"Sells medicines, poisons (discreetly), and rare reagents"},{name:"Guild Hall",type:"commercial",desc:"Meeting and working headquarters for the local trade guild"},{name:"Stone Wall",type:"fortification",desc:"Sturdy stone fortifications replacing the earlier wooden palisade"},{name:"Watchtower",type:"military",desc:"A tall stone tower providing lookout over the surrounding terrain"},{name:"Butcher's Shop",type:"commercial",desc:"Processes and sells meat from local livestock and game"}],biome:{"Coastal / Seaside":[{name:"Docks",type:"infrastructure",desc:"Wooden piers for fishing boats and trade vessels"},{name:"Lighthouse",type:"infrastructure",desc:"Guides ships safely into harbor at night"},{name:"Fish Market",type:"commercial",desc:"Where the daily catch is sold fresh each morning"},{name:"Shipwright",type:"commercial",desc:"Builds and repairs boats and small ships"}],"Mountain / Highland":[{name:"Mine Entrance",type:"infrastructure",desc:"Shaft leading into the mountain for ore extraction"},{name:"Smelter",type:"commercial",desc:"Processes raw ore into usable metal ingots"},{name:"Rope Bridge",type:"infrastructure",desc:"Spans a deep gorge connecting two parts of the settlement"}],"Temperate Forest":[{name:"Lumber Mill",type:"infrastructure",desc:"Processes felled timber into building materials"},{name:"Hunting Lodge",type:"commercial",desc:"Base for hunters and trappers working the forest"},{name:"Druid's Grove",type:"religious",desc:"A sacred clearing among ancient trees where druids gather"}],"Desert (Sandy)":[{name:"Oasis Well",type:"infrastructure",desc:"Deep well drawing precious water from underground aquifers"},{name:"Caravanserai",type:"commercial",desc:"Walled rest stop for trading caravans crossing the desert"}],"Desert (Rocky)":[{name:"Cistern",type:"infrastructure",desc:"Underground water storage carved from living rock"},{name:"Stone Quarry",type:"infrastructure",desc:"Where building stone is cut from the rocky landscape"}],"Arctic Tundra":[{name:"Longhouse",type:"civic",desc:"Large communal hall for gathering, feasting, and shelter from the cold"},{name:"Smokehouse",type:"commercial",desc:"Preserves fish and meat for the long winters"},{name:"Fur Trading Post",type:"commercial",desc:"Trades in pelts, furs, and cold-weather supplies"}],"Swamp / Marsh":[{name:"Stilted Walkway",type:"infrastructure",desc:"Raised wooden pathways connecting buildings above the waterline"},{name:"Herbalist's Hut",type:"commercial",desc:"Specialized in rare swamp herbs and medicinal plants"}],"Underground / Underdark":[{name:"Mushroom Farm",type:"infrastructure",desc:"Cultivates edible fungi in dark, damp caverns"},{name:"Phosphorescent Lamps",type:"infrastructure",desc:"Natural or magical lighting systems for the cavern settlement"}],"Tropical Jungle":[{name:"Canopy Platform",type:"infrastructure",desc:"Elevated platforms built among the giant tree canopy"},{name:"Medicine Hut",type:"commercial",desc:"Processes jungle plants into medicines and antidotes"}],"Grassland / Plains":[{name:"Granary",type:"infrastructure",desc:"Stores harvested grain and seed for planting season"},{name:"Cattle Pen",type:"infrastructure",desc:"Fenced area for livestock management and breeding"}]}};function Ot(e){for(let t=e.length-1;t>0;t--){const s=Math.floor(Math.random()*(t+1));[e[t],e[s]]=[e[s],e[t]]}return e}function ir(e){return e[Math.floor(Math.random()*e.length)]}function lr(e){return e.variants&&Math.random()>.4?ir(e.variants):e.name}function rr(e,t,s,a=[]){const n=new Set(a.map(v=>v.name.toLowerCase())),l=[];function i(v){const b=lr(v);n.has(b.toLowerCase())||(n.add(b.toLowerCase()),l.push({name:b,type:v.type||"other",description:v.desc||""}))}Tt.core.forEach(i);const r=Ot([...Tt.common]),d=e==="new"?.3:e==="young"?.5:e==="established"?.75:.9,c=Math.ceil(r.length*d);if(r.slice(0,c).forEach(i),e!=="new"){const v=Ot([...Tt.uncommon]),b=e==="young"?.2:e==="established"?.4:.6,y=Math.ceil(v.length*b);v.slice(0,y).forEach(i)}if(e==="established"||e==="ancient"){const v=Ot([...Tt.rare]),b=e==="established"?.15:.35,y=Math.max(1,Math.ceil(v.length*b));v.slice(0,y).forEach(i)}const o=Tt.biome[s];if(o){const v=Ot([...o]),b=e==="new"?.3:e==="young"?.5:.8,y=Math.max(1,Math.ceil(v.length*b));v.slice(0,y).forEach(i)}const p=Math.max(1,Math.floor(t/4)),g=e==="new"?3:e==="young"?6:e==="established"?12:20;for(let v=0;v<Math.min(p,g);v++){const y=`Residence #${v+1}`;n.has(y.toLowerCase())||(n.add(y.toLowerCase()),l.push({name:y,type:"residential",description:"A modest dwelling for town residents"}))}return l}function or(e,t){var g;const s=ne(),{el:a,close:n}=ra({title:"🏗️ Town Setup Wizard",width:"wide",content:`
      <div class="setup-wizard">
        <div class="setup-tabs" id="setup-tabs">
          <button class="setup-tab active" data-tab="populate">👥 Populate</button>
          <button class="setup-tab" data-tab="buildings">🏛️ Buildings</button>
          <button class="setup-tab" data-tab="weather">🌦️ Weather</button>
          <button class="setup-tab" data-tab="spells">✨ Spells</button>
          <button class="setup-tab" data-tab="settings">⚙️ Settings</button>
        </div>

        <!-- POPULATE TAB -->
        <div class="setup-panel active" data-panel="populate">
          <h3 style="margin-bottom:0.5rem;">👥 Add Population</h3>
          <p class="setup-desc">Generate new residents for this town using AI. No simulation is run — characters are created and added directly.</p>

          <div class="setup-row">
            <div class="form-group" style="flex:0 0 100px;">
              <label>Count</label>
              <input type="number" id="sw-pop-count" class="form-input" min="1" max="50" value="5" style="text-align:center;">
            </div>
            <div class="form-group" style="flex:1;">
              <label>Instructions <span style="color:var(--text-muted);font-weight:400;">(optional)</span></label>
              <input type="text" id="sw-pop-instructions" class="form-input"
                placeholder="e.g. 'all dwarves', 'merchants only', 'a family of 4', 'goblin 5'...">
            </div>
          </div>

          <div class="setup-actions">
            <button class="btn-primary" id="sw-pop-generate">🎲 Generate Characters</button>
          </div>
          <div class="setup-status" id="sw-pop-status"></div>
        </div>

        <!-- BUILDINGS TAB -->
        <div class="setup-panel" data-panel="buildings">
          <h3 style="margin-bottom:0.5rem;">🏛️ Generate Buildings</h3>
          <p class="setup-desc">Auto-generate D&D-appropriate buildings based on the town's age and biome. Buildings are randomized so no two towns are identical.</p>

          <div class="setup-row">
            <div class="form-group">
              <label>Town Age</label>
              <select id="sw-bld-age" class="form-select" style="min-width:200px;">
                <option value="new">🌱 New Settlement (just founded)</option>
                <option value="young">🏘️ Young (5-20 years old)</option>
                <option value="established" selected>🏰 Established (20-100 years)</option>
                <option value="ancient">🗿 Ancient (100+ years)</option>
              </select>
            </div>
            <div class="form-group">
              <label>Biome</label>
              <span id="sw-bld-biome" class="setup-info-value">Loading...</span>
            </div>
            <div class="form-group">
              <label>Existing Buildings</label>
              <span id="sw-bld-existing" class="setup-info-value">Loading...</span>
            </div>
          </div>

          <div class="setup-actions">
            <button class="btn-secondary" id="sw-bld-preview">👁️ Preview Buildings</button>
            <button class="btn-primary" id="sw-bld-create" disabled>🏗️ Create All Buildings</button>
          </div>
          <div id="sw-bld-preview-list" class="setup-preview-list"></div>
          <div class="setup-status" id="sw-bld-status"></div>
        </div>

        <!-- WEATHER TAB -->
        <div class="setup-panel" data-panel="weather">
          <h3 style="margin-bottom:0.5rem;">🌦️ Generate Weather</h3>
          <p class="setup-desc">AI generates a full year of weather patterns based on this town's biome and climate. The result is saved and used during simulations for immersive, thematic events.</p>

          <div class="setup-row">
            <div class="form-group">
              <label>Biome</label>
              <span id="sw-wx-biome" class="setup-info-value">Loading...</span>
            </div>
            <div class="form-group">
              <label>Calendar</label>
              <span id="sw-wx-calendar" class="setup-info-value">Loading...</span>
            </div>
            <div class="form-group">
              <label>Status</label>
              <span id="sw-wx-existing" class="setup-info-value">Checking...</span>
            </div>
          </div>

          <div class="setup-actions">
            <button class="btn-primary" id="sw-wx-generate">🌤️ Generate Full Year Weather</button>
          </div>
          <div id="sw-wx-preview" class="setup-weather-preview"></div>
          <div class="setup-status" id="sw-wx-status"></div>
        </div>

        <!-- SPELLS TAB -->
        <div class="setup-panel" data-panel="spells">
          <h3 style="margin-bottom:0.5rem;">✨ Auto-Assign Spells</h3>
          <p class="setup-desc">Automatically assigns role-optimal SRD spells to all spellcasting NPCs in this town. Existing spell assignments will be replaced.</p>

          <div class="setup-actions">
            <button class="btn-primary" id="sw-spell-assign">✨ Auto-Assign All Caster Spells</button>
          </div>
          <div class="setup-status" id="sw-spell-status"></div>
        </div>

        <!-- SETTINGS TAB -->
        <div class="setup-panel" data-panel="settings">
          <h3 style="margin-bottom:0.5rem;">⚙️ Campaign Rules</h3>
          <p class="setup-desc">These settings control how the AI simulation generates content. Changes are saved to your active campaign and affect all towns.</p>

          <div id="sw-settings-loading" style="color:var(--text-muted);padding:1rem;">Loading settings...</div>
          <div id="sw-settings-content" style="display:none;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
              <div>
                <h4 style="color:var(--accent);margin-bottom:0.5rem;font-size:0.85rem;">🌍 World Simulation</h4>
                <div class="form-group"><label>Relationship Formation</label>
                  <select id="sw-rel-speed" class="form-select">
                    <option value="very slow">Very Slow</option><option value="slow">Slow</option>
                    <option value="normal" selected>Normal</option><option value="fast">Fast</option>
                  </select></div>
                <div class="form-group"><label>Birth Rate</label>
                  <select id="sw-birth-rate" class="form-select">
                    <option value="rare">Rare</option><option value="low">Low</option>
                    <option value="normal" selected>Normal</option><option value="high">High</option>
                  </select></div>
                <div class="form-group"><label>Death Threshold</label>
                  <select id="sw-death-threshold" class="form-select">
                    <option value="25">25</option><option value="50" selected>50</option>
                    <option value="75">75</option><option value="100">100</option>
                    <option value="150">150</option><option value="unlimited">Unlimited</option>
                  </select></div>
                <div class="form-group"><label>Child Growth</label>
                  <select id="sw-child-growth" class="form-select">
                    <option value="realistic" selected>Realistic (18 yr)</option>
                    <option value="accelerated">Accelerated</option><option value="instant">Instant</option>
                  </select></div>
                <div class="form-group"><label>Conflict & Events</label>
                  <select id="sw-conflict" class="form-select">
                    <option value="peaceful">Peaceful</option><option value="occasional" selected>Occasional</option>
                    <option value="frequent">Frequent</option><option value="brutal">Brutal</option>
                  </select></div>
              </div>
              <div>
                <h4 style="color:var(--accent);margin-bottom:0.5rem;font-size:0.85rem;">🧪 Homebrew & World</h4>
                <div class="form-group"><label>✨ Magic Level</label>
                  <select id="sw-hb-magic-level" class="form-select">
                    <option value="">— Default —</option><option value="none">No Magic</option>
                    <option value="low">Low Magic</option><option value="standard">Standard</option>
                    <option value="high">High Magic</option><option value="wild">Wild Magic</option>
                  </select></div>
                <div class="form-group"><label>🎭 World Tone</label>
                  <select id="sw-hb-tone" class="form-select">
                    <option value="">— Default —</option><option value="grimdark">Grimdark</option>
                    <option value="dark_fantasy">Dark Fantasy</option><option value="standard">Standard</option>
                    <option value="lighthearted">Lighthearted</option><option value="horror">Horror</option>
                    <option value="intrigue">Political Intrigue</option>
                  </select></div>
                <div class="form-group"><label>🗣️ NPC Depth</label>
                  <select id="sw-hb-npc-depth" class="form-select">
                    <option value="">— Default —</option><option value="simple">Simple</option>
                    <option value="standard">Standard</option><option value="deep">Deep</option>
                    <option value="literary">Literary</option>
                  </select></div>
                <div class="form-group"><label>💕 Romance</label>
                  <select id="sw-hb-romance" class="form-select">
                    <option value="">— Default —</option><option value="none">None</option>
                    <option value="subtle">Subtle</option><option value="present">Present</option>
                    <option value="focus">Focus</option>
                  </select></div>
                <div class="form-group"><label>☠️ NPC Mortality</label>
                  <select id="sw-hb-mortality" class="form-select">
                    <option value="">— Default —</option><option value="lethal">Lethal</option>
                    <option value="impactful">Impactful</option><option value="rare">Rare</option>
                  </select></div>
              </div>
            </div>

            <div class="form-group" style="margin-top:0.75rem;">
              <label>📜 Campaign Description</label>
              <textarea id="sw-campaign-desc" class="form-input" rows="2" placeholder="Describe your world..."></textarea>
            </div>
            <div class="form-group">
              <label>📋 House Rules</label>
              <textarea id="sw-house-rules" class="form-input" rows="2" placeholder="House rules for simulations..."></textarea>
            </div>

            <div class="setup-actions">
              <button class="btn-primary" id="sw-settings-save">💾 Save Settings</button>
            </div>
            <div class="setup-status" id="sw-settings-status"></div>
          </div>
        </div>
      </div>
    `});a.querySelectorAll(".setup-tab").forEach(v=>{v.addEventListener("click",()=>{var b;a.querySelectorAll(".setup-tab").forEach(y=>y.classList.remove("active")),a.querySelectorAll(".setup-panel").forEach(y=>y.classList.remove("active")),v.classList.add("active"),(b=a.querySelector(`.setup-panel[data-panel="${v.dataset.tab}"]`))==null||b.classList.add("active")})});let l={},i="",r=null,d=[];(async()=>{var v;try{const[b,y,h]=await Promise.all([Dt(e),tt().catch(()=>null),_a(e).catch(()=>({buildings:[]}))]);if(l=b.meta||{},i=l.biome||"Grassland / Plains",r=(y==null?void 0:y.calendar)||null,d=h.buildings||[],a.querySelector("#sw-bld-biome").textContent=i||"(not set)",a.querySelector("#sw-bld-existing").textContent=`${d.length} buildings`,a.querySelector("#sw-wx-biome").textContent=i||"(not set)",r){const f=r.month_names||r.months||[];a.querySelector("#sw-wx-calendar").textContent=`${f.length||r.months_per_year||12} months, ${r.days_per_month||30} days/month`}if(l.weather_year)try{const f=JSON.parse(l.weather_year);a.querySelector("#sw-wx-existing").innerHTML=`<span style="color:var(--success);">✅ Weather generated (${((v=f.months)==null?void 0:v.length)||0} months)</span>`,os(a,f)}catch{a.querySelector("#sw-wx-existing").textContent="❌ Invalid weather data"}else a.querySelector("#sw-wx-existing").textContent="No weather generated yet"}catch(b){console.warn("[SetupWizard] Failed to load context:",b)}})();const c=/^(human|elf|dwarf|halfling|gnome|half-elf|half-orc|tiefling|dragonborn|aasimar)$/i,o=/\b(stirge|goblin|kobold|orc|skeleton|zombie|rat|wolf|spider|bat|snake|bear|ogre|troll|undead|beast|creature|monster|animal|vermin|aberration|ooze|elemental|fiend|fey|dragon|worg|hyena|dire|ghoul|wight|wraith|gnoll|lizardfolk|bugbear|hobgoblin|minotaur|harpy|imp|demon|devil|slime|ant|scorpion|centipede|crocodile|shark|owl|hawk|eagle|boar|lion|tiger|ape|horse|mule|donkey|cat|dog|badger|wolverine|weasel|raven|toad|lizard|squid|octopus|crab|wasp|beetle|moth|gryphon|griffon|basilisk|cockatrice|chimera|manticore|hydra|gargoyle|golem|treant|dryad|nymph|satyr|pegasus|unicorn|wyvern|drake|giant)\b/i;a.querySelector("#sw-pop-generate").addEventListener("click",async()=>{const v=Math.max(1,Math.min(50,parseInt(a.querySelector("#sw-pop-count").value)||5)),b=a.querySelector("#sw-pop-instructions").value.trim(),y=a.querySelector("#sw-pop-generate"),h=a.querySelector("#sw-pop-status");y.disabled=!0,y.textContent="⏳ Generating...";try{let f="";try{const _=await wt(),P=[];_.campaign_description&&P.push(_.campaign_description),_.rules_text&&P.push("House Rules: "+_.rules_text),f=P.join(`

`)}catch{}const w=b.match(o);let A=[],k=0;try{const _=l.demographics||"";if(_){let P=[];try{const F=JSON.parse(_);Array.isArray(F)?P=F.map(I=>`${I.race} ${I.pct}%`):P=_.split(",").map(I=>I.trim())}catch{P=_.split(",").map(F=>F.trim())}for(const F of P){const I=F.match(/^(.+?)\s+(\d+)%?$/);if(I){const M=I[1].trim(),C=parseInt(I[2]);c.test(M)?k+=C:A.push({name:M,pct:C})}}}}catch(_){console.warn("[SetupWizard] Demographics parse error:",_)}if(A.length>0&&k===0&&!w){h.innerHTML='<span style="color:var(--text-secondary)">🐉 Creature demographics detected — pulling from SRD...</span>';try{let _=0,P=A.map(M=>({...M,exact:v*M.pct/100,count:Math.max(1,Math.floor(v*M.pct/100))})),F=P.reduce((M,C)=>M+C.count,0),I=v-F;if(I>0){P.sort((M,C)=>C.exact-Math.floor(C.exact)-(M.exact-Math.floor(M.exact)));for(let M=0;M<I&&M<P.length;M++)P[M].count++}else if(F>v)for(P.sort((M,C)=>M.pct-C.pct);F>v&&P.length>0;){const M=P.find(C=>C.count>1);if(M)M.count--,F--;else break}for(const M of P){h.innerHTML=`<span style="color:var(--text-secondary)">🔍 Looking up "${M.name}" in SRD... (${M.count} creatures)</span>`;try{const C=(await Mt(e,M.name,M.count,b)).characters||[];C.length>0&&(await Re(e,{new_characters:C},null,0),_+=C.length)}catch(C){console.warn(`SRD lookup failed for "${M.name}":`,C.message)}}_>0?h.innerHTML=`<span style="color:var(--success)">✅ ${_} creatures added from SRD! No AI credits used.</span>`:h.innerHTML='<span style="color:var(--error)">❌ No matching creatures found in SRD. Check demographic race names match SRD monster names.</span>';return}catch(_){h.innerHTML=`<span style="color:var(--error)">❌ SRD creature error: ${_.message}</span>`;return}}if(A.length>0&&k>0&&!w){h.innerHTML='<span style="color:var(--text-secondary)">🐉 Mixed demographics detected — generating humanoids via AI + creatures from SRD...</span>';try{let _=0;const P=A.reduce((M,C)=>M+C.pct,0),F=Math.max(1,Math.round(v*P/100)),I=Math.max(0,v-F);if(F>0){let M=A.map(x=>({...x,exact:F*x.pct/P,count:Math.max(1,Math.floor(F*x.pct/P))})),C=M.reduce((x,B)=>x+B.count,0),u=F-C;if(u>0){M.sort((x,B)=>B.exact-Math.floor(B.exact)-(x.exact-Math.floor(x.exact)));for(let x=0;x<u&&x<M.length;x++)M[x].count++}for(const x of M){h.innerHTML=`<span style="color:var(--text-secondary)">🔍 Looking up "${x.name}" in SRD... (${x.count} creatures)</span>`;try{const B=(await Mt(e,x.name,x.count,b)).characters||[];B.length>0&&(await Re(e,{new_characters:B},null,0),_+=B.length)}catch(B){console.warn(`SRD lookup failed for "${x.name}":`,B.message)}}}if(I>0){h.innerHTML=`<span style="color:var(--text-secondary)">📋 Generating ${I} humanoid NPCs via AI...</span>`;const C=(await Sa(e,I,f,b)).roster||[];if(C.length>0){await new Promise(x=>setTimeout(x,500));const u=10;for(let x=0;x<C.length;x+=u){const B=C.slice(x,x+u);h.innerHTML=`<span style="color:var(--text-secondary)">🔧 Fleshing out humanoids... (${_-(_-I>=0?_-I:0)}/${C.length})</span>`;try{const E=(await Yt(e,B,f)).characters||[];E.length&&(await Re(e,{new_characters:E},null,0),_+=E.length)}catch($){console.warn("Flesh batch failed:",$.message)}}}}_>0?h.innerHTML=`<span style="color:var(--success)">✅ ${_} characters/creatures added!</span>`:h.innerHTML='<span style="color:var(--error)">❌ Failed to generate population</span>';return}catch(_){h.innerHTML=`<span style="color:var(--error)">❌ Mixed population error: ${_.message}</span>`;return}}if(w){const _=w[1];h.innerHTML=`<span style="color:var(--text-secondary)">🔍 Looking up "${_}" in SRD...</span>`;const F=(await Mt(e,_,v,b)).characters||[];F.length>0?(await Re(e,{new_characters:F},null,0),h.innerHTML=`<span style="color:var(--success)">✅ ${F.length}x ${_} added from SRD! No AI credits used.</span>`):h.innerHTML=`<span style="color:var(--error)">❌ "${_}" not found in SRD.</span>`}else{h.innerHTML=`<span style="color:var(--text-secondary)">📋 Step 1/2: Creating roster (${v} characters)...</span>`;const P=(await Sa(e,v,f,b)).roster||[];if(P.length===0){h.innerHTML='<span style="color:var(--error)">❌ AI returned empty roster</span>';return}h.innerHTML=`<span style="color:var(--success)">✅ Step 1: ${P.length} planned</span>`,await new Promise(M=>setTimeout(M,500));let F=0;const I=10;for(let M=0;M<P.length;M+=I){const C=P.slice(M,M+I);h.innerHTML=`<span style="color:var(--text-secondary)">🔧 Step 2/2: Fleshing out... (${F}/${P.length})</span>`;try{const x=(await Yt(e,C,f)).characters||[];x.length&&(await Re(e,{new_characters:x},null,0),F+=x.length)}catch(u){console.warn("Flesh batch failed:",u.message)}}F>0?h.innerHTML=`<span style="color:var(--success)">✅ ${F} character${F!==1?"s":""} added!</span>`:h.innerHTML='<span style="color:var(--error)">❌ Failed to generate characters</span>'}t&&t()}catch(f){h.innerHTML=`<span style="color:var(--error)">❌ ${f.message}</span>`}finally{y.disabled=!1,y.textContent="🎲 Generate Characters"}});let p=[];a.querySelector("#sw-bld-preview").addEventListener("click",()=>{var f,w,A;const v=a.querySelector("#sw-bld-age").value,b=((A=(w=(f=s.currentTown)==null?void 0:f.characters)==null?void 0:w.filter(k=>k.status!=="Deceased"))==null?void 0:A.length)||10;p=rr(v,b,i,d);const y=a.querySelector("#sw-bld-preview-list");if(p.length===0){y.innerHTML='<p style="color:var(--text-muted);padding:0.5rem;">No new buildings to add — town already has everything!</p>',a.querySelector("#sw-bld-create").disabled=!0;return}const h={civic:"🏛️",commercial:"🏪",infrastructure:"⚙️",military:"⚔️",religious:"⛪",arcane:"🔮",fortification:"🏰",entertainment:"🎭",residential:"🏠",other:"🏘️"};y.innerHTML=`
      <h4 style="margin:0.75rem 0 0.5rem;color:var(--text-secondary);">📋 ${p.length} Buildings to Create</h4>
      <div class="setup-building-grid">
        ${p.map(k=>`
          <div class="setup-building-card">
            <div class="setup-building-header">
              <span>${h[k.type]||"🏘️"} <strong>${k.name}</strong></span>
              <span class="setup-building-type">${k.type}</span>
            </div>
            <div class="setup-building-desc">${k.description}</div>
          </div>
        `).join("")}
      </div>
    `,a.querySelector("#sw-bld-create").disabled=!1}),a.querySelector("#sw-bld-create").addEventListener("click",async()=>{if(p.length===0)return;const v=a.querySelector("#sw-bld-create"),b=a.querySelector("#sw-bld-status");v.disabled=!0,v.textContent="⏳ Creating...";let y=0;for(const h of p)try{await ji(e,{name:h.name,status:"completed",build_progress:1,build_time:1,description:h.description,building_type:h.type}),y++}catch(f){console.warn("Failed to create building:",h.name,f)}b.innerHTML=`<span style="color:var(--success)">✅ ${y} buildings created!</span>`,v.textContent="✅ Done!",d=[...d,...p.map(h=>({...h,status:"completed"}))],a.querySelector("#sw-bld-existing").textContent=`${d.length} buildings`,p=[],t&&t(),setTimeout(()=>{v.disabled=!1,v.textContent="🏗️ Create All Buildings"},3e3)}),a.querySelector("#sw-wx-generate").addEventListener("click",async()=>{var y,h;const v=a.querySelector("#sw-wx-generate"),b=a.querySelector("#sw-wx-status");v.disabled=!0,v.textContent="⏳ Generating weather...",b.innerHTML='<span style="color:var(--text-secondary)">🌤️ AI is generating a full year of weather patterns...</span>';try{const f=await Hi(e);f.ok&&f.weather?(b.innerHTML=`<span style="color:var(--success)">✅ Weather generated! ${((y=f.weather.months)==null?void 0:y.length)||0} months of weather data saved.</span>`,a.querySelector("#sw-wx-existing").innerHTML=`<span style="color:var(--success);">✅ Weather generated (${((h=f.weather.months)==null?void 0:h.length)||0} months)</span>`,os(a,f.weather)):b.innerHTML=`<span style="color:var(--error)">❌ ${f.error||"Weather generation failed"}</span>`}catch(f){b.innerHTML=`<span style="color:var(--error)">❌ ${f.message}</span>`}finally{v.disabled=!1,v.textContent="🌤️ Generate Full Year Weather"}}),a.querySelector("#sw-spell-assign").addEventListener("click",async()=>{const v=a.querySelector("#sw-spell-assign"),b=a.querySelector("#sw-spell-status");v.disabled=!0,v.textContent="⏳ Assigning...",b.innerHTML='<span style="color:var(--text-secondary)">✨ Auto-assigning spells to all casters...</span>';try{const y=await un(e,!0);if(y.ok){const h=(y.characters||[]).join(", ");b.innerHTML=`<span style="color:var(--success)">✅ Assigned spells to ${y.assigned} caster${y.assigned!==1?"s":""}${h?": "+h:""}</span>`}else b.innerHTML=`<span style="color:var(--error)">❌ ${y.error||"Failed"}</span>`}catch(y){b.innerHTML=`<span style="color:var(--error)">❌ ${y.message}</span>`}finally{v.disabled=!1,v.textContent="✨ Auto-Assign All Caster Spells"}}),(async()=>{try{const v=await wt(),b=a.querySelector("#sw-settings-content"),y=a.querySelector("#sw-settings-loading");if(!b)return;v.relationship_speed&&(a.querySelector("#sw-rel-speed").value=v.relationship_speed),v.birth_rate&&(a.querySelector("#sw-birth-rate").value=v.birth_rate),v.death_threshold&&(a.querySelector("#sw-death-threshold").value=v.death_threshold),v.child_growth&&(a.querySelector("#sw-child-growth").value=v.child_growth),v.conflict_frequency&&(a.querySelector("#sw-conflict").value=v.conflict_frequency);const h=v.homebrew_settings||{};h.magic_level&&(a.querySelector("#sw-hb-magic-level").value=h.magic_level),h.tone&&(a.querySelector("#sw-hb-tone").value=h.tone),h.npc_depth&&(a.querySelector("#sw-hb-npc-depth").value=h.npc_depth),h.romance&&(a.querySelector("#sw-hb-romance").value=h.romance),h.mortality&&(a.querySelector("#sw-hb-mortality").value=h.mortality),v.campaign_description&&(a.querySelector("#sw-campaign-desc").value=v.campaign_description),v.rules_text&&(a.querySelector("#sw-house-rules").value=v.rules_text),y.style.display="none",b.style.display=""}catch{const b=a.querySelector("#sw-settings-loading");b&&(b.textContent="❌ Failed to load settings")}})(),(g=a.querySelector("#sw-settings-save"))==null||g.addEventListener("click",async()=>{var y;const v=a.querySelector("#sw-settings-save"),b=a.querySelector("#sw-settings-status");v.disabled=!0,v.textContent="⏳ Saving...";try{const h=a.querySelector("#sw-house-rules").value.trim(),f=a.querySelector("#sw-campaign-desc").value.trim(),w={},A={"sw-hb-magic-level":"magic_level","sw-hb-tone":"tone","sw-hb-npc-depth":"npc_depth","sw-hb-romance":"romance","sw-hb-mortality":"mortality"};for(const[_,P]of Object.entries(A)){const F=((y=a.querySelector(`#${_}`))==null?void 0:y.value)||"";F&&(w[P]=F)}const k={relationship_speed:a.querySelector("#sw-rel-speed").value,birth_rate:a.querySelector("#sw-birth-rate").value,death_threshold:a.querySelector("#sw-death-threshold").value,child_growth:a.querySelector("#sw-child-growth").value,conflict_frequency:a.querySelector("#sw-conflict").value};await pn(h,f,w,k),b.innerHTML='<span style="color:var(--success)">✅ Settings saved!</span>'}catch(h){b.innerHTML=`<span style="color:var(--error)">❌ ${h.message}</span>`}finally{v.disabled=!1,v.textContent="💾 Save Settings"}})}function os(e,t){const s=e.querySelector("#sw-wx-preview");if(!s||!(t!=null&&t.months))return;const a={clear:"☀️",sunny:"☀️",fair:"🌤️",cloudy:"☁️",overcast:"☁️",rain:"🌧️",heavy_rain:"🌧️",light_rain:"🌦️",drizzle:"🌦️",storm:"⛈️",thunderstorm:"⛈️",snow:"❄️",heavy_snow:"🌨️",blizzard:"🌨️",fog:"🌫️",mist:"🌫️",wind:"💨",hot:"🔥",cold:"🥶",mild:"🌤️",warm:"🌞",freezing:"🥶"};function n(l){if(!l)return"🌤️";const i=l.toLowerCase();for(const[r,d]of Object.entries(a))if(i.includes(r))return d;return"🌤️"}s.innerHTML=`
    <h4 style="margin:0.75rem 0 0.5rem;color:var(--text-secondary);">📅 Year ${t.year||"—"} Weather</h4>
    <div class="setup-weather-grid">
      ${t.months.map(l=>{var i;return`
        <div class="setup-weather-card">
          <div class="setup-weather-month">${n(l.weather_pattern)} ${l.name||"Month "+l.month}</div>
          <div class="setup-weather-temp">${l.avg_temp||"—"}</div>
          <div class="setup-weather-pattern">${l.weather_pattern||"—"}</div>
          ${(i=l.notable_events)!=null&&i.length?`<div class="setup-weather-events">${l.notable_events.map(r=>`<span class="setup-weather-event">• ${r}</span>`).join("")}</div>`:""}
        </div>
      `}).join("")}
    </div>
  `}const xn=e=>e(),cr={Human:"var(--race-human, #c9a84c)",Dwarf:"var(--race-dwarf, #a0522d)",Elf:"var(--race-elf, #4fc978)",Halfling:"var(--race-halfling, #e6a040)",Gnome:"var(--race-gnome, #c97fbf)","Half-Elf":"var(--race-half-elf, #5fb8a0)","Half-Orc":"var(--race-half-orc, #8b4513)",Tiefling:"var(--race-tiefling, #c0392b)",Orc:"var(--race-orc, #556b2f)",Goblin:"var(--race-goblin, #6b8e23)",Drow:"var(--race-drow, #8a2be2)"},jt={barbarian:"Bar",bard:"Brd",cleric:"Clr",druid:"Drd",fighter:"Ftr",monk:"Mnk",paladin:"Pal",ranger:"Rgr",rogue:"Rog",sorcerer:"Sor",wizard:"Wiz",commoner:"Com",expert:"Exp",warrior:"War",adept:"Adp",aristocrat:"Ari","arcane archer":"AAt","arcane trickster":"ATk",assassin:"Asn",blackguard:"Blk","dragon disciple":"DDi",duelist:"Dlt","dwarven defender":"DwD","eldritch knight":"EKn",hierophant:"Hie","horizon walker":"HWk",loremaster:"Lor","mystic theurge":"MTh",shadowdancer:"Shd",thaumaturgist:"Thg"};function dr(e){if(!e)return"";const t=e.replace(/\s+\d+$/,"").trim(),s=t.toLowerCase();if(jt[s])return jt[s];const a=s.split(/\s+/)[0];return jt[a]?jt[a]:t.substring(0,3).charAt(0).toUpperCase()+t.substring(1,3)}const cs={human:"Hum",dwarf:"Dwf",elf:"Elf",halfling:"Hlf",gnome:"Gnm","half-elf":"H-E","half-orc":"H-O",tiefling:"Tfl",dragonborn:"Drg",aasimar:"Asm",orc:"Orc",goblin:"Gob",drow:"Drw",hobgoblin:"Hob",bugbear:"Bug",kobold:"Kob",lizardfolk:"Lzf",gnoll:"Gnl",ogre:"Ogr",troll:"Trl",minotaur:"Min",centaur:"Cen",satyr:"Sat",changeling:"Chg",shifter:"Shf",warforged:"Wfg",kenku:"Ken",tabaxi:"Tab",firbolg:"Fir",goliath:"Gol",genasi:"Gen",tortle:"Trt","yuan-ti":"Y-T",githyanki:"Gyk",githzerai:"Gzr"};function pr(e){if(!e)return"";const t=e.toLowerCase().trim();return cs[t]?cs[t]:e.substring(0,3).charAt(0).toUpperCase()+e.substring(1,3)}const ds={"lawful good":"LG","neutral good":"NG","chaotic good":"CG","lawful neutral":"LN","true neutral":"TN",neutral:"TN","chaotic neutral":"CN","lawful evil":"LE","neutral evil":"NE","chaotic evil":"CE"};function ur(e){if(!e)return"";const t=e.toLowerCase().trim();return ds[t]?ds[t]:t.length<=3?e:e.split(/\s+/).map(s=>s[0]).join("").toUpperCase()}function mr(e,t){const s=ne(),a=t.id?parseInt(t.id):s.currentTownId;if(!a){e.innerHTML=`
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
  `,vr(e,a)}async function vr(e,t){var s,a,n,l,i,r,d,c,o,p,g,v,b;try{const y=await St(),h=Array.isArray(y)?y:y.towns||[],f=e.querySelector("#town-select-view");f&&(f.innerHTML=h.map(I=>`<option value="${I.id}" ${I.id===t?"selected":""}>${I.name}</option>`).join(""),f.addEventListener("change",I=>{ke(`town/${I.target.value}`)}));const[w,A]=await Promise.all([Le(t),_a(t).catch(()=>({buildings:[]}))]),k=(w.characters||[]).map(xe),_=A.buildings||[],P=h.find(I=>I.id===t)||{id:t,name:"Unknown"};P.characters=k,P.buildings=_,me({currentTownId:t,currentTown:P,towns:h}),pt(e,k,_),nt(e,k),An(e),Me(e,k),Oe(e,k),(s=e.querySelector("#town-search"))==null||s.addEventListener("input",I=>{me({searchQuery:I.target.value.trim()}),Me(e,k)}),(a=e.querySelector("#town-sim-btn"))==null||a.addEventListener("click",()=>{ke("simulation")}),(n=e.querySelector("#town-stats-btn"))==null||n.addEventListener("click",()=>{ke("townstats/"+t)}),(l=e.querySelector("#town-import-btn"))==null||l.addEventListener("click",()=>{Jl(e,t,k)}),(i=e.querySelector("#town-history-btn"))==null||i.addEventListener("click",()=>{hr(t)}),(r=e.querySelector("#town-settings-btn"))==null||r.addEventListener("click",()=>{gr(t)}),(d=e.querySelector("#town-buildings-btn"))==null||d.addEventListener("click",async()=>{const{openBuildingsPanel:I}=await re(()=>import("./BuildingsPanel-CQUsnHxJ.js"),[]);I(t)}),(c=e.querySelector("#town-social-btn"))==null||c.addEventListener("click",async()=>{const{openTownSocialPanel:I}=await re(()=>import("./TownSocialPanel-Bnsu79Cv.js"),__vite__mapDeps([5,6]));I(t)});const F=e.querySelector("#town-setup-btn");F&&F.addEventListener("click",()=>{or(t,async()=>{const I=((await Le(t)).characters||[]).map(xe);ne().currentTown.characters=I,k.length=0,k.push(...I),pt(e,k,_),nt(e,k),Me(e,k),Oe(e,k)})}),(o=e.querySelector("#town-purge-btn"))==null||o.addEventListener("click",async()=>{const{showModal:I}=await xn(async()=>{const{showModal:q}=await Promise.resolve().then(()=>Ie);return{showModal:q}},void 0),M=P.name||"this town",C=k.length;console.log("[Purge] Opening purge modal for town:",M,"| Population:",C,"| TownID:",t);const{el:u,close:x}=I({title:"☠️ Purge Town Data",width:"normal",content:`
<div style="padding:1rem;">
<p>Select what data you want to permanently delete from <strong>${M}</strong>.</p>
<div class="form-group">
<label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;"><input type="checkbox" id="purge-pop-chk" checked> Purge Population (${C} characters)</label>
</div>
<div class="form-group" style="margin-top:0.5rem;">
<label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;"><input type="checkbox" id="purge-bld-chk"> Purge Buildings</label>
</div>
<div class="form-group" style="margin-top:1rem;">
<label>Type town name to confirm: <strong>${M}</strong></label>
<input type="text" id="purge-confirm-name" class="form-input" style="margin-top:0.5rem;" placeholder="Type the exact town name here">
</div>
<div id="purge-status" style="margin-top:0.5rem;"></div>
<div class="modal-actions" style="margin-top:1rem;">
<button class="btn-danger" id="purge-confirm-btn" disabled>Purge Selected Data</button>
<button class="btn-secondary" id="purge-cancel-btn">Cancel</button>
</div>
</div>
`}),B=u.querySelector("#purge-confirm-name"),$=u.querySelector("#purge-confirm-btn"),E=u.querySelector("#purge-cancel-btn"),m=u.querySelector("#purge-pop-chk"),S=u.querySelector("#purge-bld-chk"),T=u.querySelector("#purge-status");B.addEventListener("input",()=>{const q=B.value.trim().toLowerCase()===M.trim().toLowerCase();$.disabled=!q}),E.addEventListener("click",()=>x()),$.addEventListener("click",async()=>{const q=m.checked,H=S.checked;if(!q&&!H){T.innerHTML='<span style="color:var(--error)">⚠️ No data selected to purge.</span>';return}$.disabled=!0,$.textContent="⏳ Purging...",T.innerHTML='<span style="color:var(--text-secondary)">🔄 Purging data...</span>',console.log("[Purge] Starting purge — pop:",q,"| bld:",H,"| townId:",t);try{const W=await cn(t,q,H);console.log("[Purge] API response:",W);let D=[];q&&D.push((W.purged||C)+" characters"),H&&D.push("buildings");const Y=D.join(" and ")+" purged from "+M+".";if(T.innerHTML=`<span style="color:var(--success)">✅ ${Y}</span>`,ue(Y,"success"),q){const K=((await Le(t)).characters||[]).map(xe);console.log("[Purge] Re-fetched characters after purge:",K.length),ne().currentTown.characters=K,k.length=0,k.push(...K),pt(e,K,_),nt(e,K),Me(e,K),Oe(e,K);const ae=e.querySelector("#detail-area");ae&&(ae.innerHTML='<div class="detail-empty">Select a character</div>')}if(H)try{const ae=(await _a(t)).buildings||[];_.length=0,_.push(...ae),ne().currentTown&&(ne().currentTown.buildings=ae)}catch(K){console.warn("[Purge] Building refresh error:",K)}setTimeout(()=>x(),1500)}catch(W){console.error("[Purge] FAILED:",W),T.innerHTML=`<span style="color:var(--error)">❌ Failed to purge: ${W.message}</span>`,ue("Purge failed: "+W.message,"error"),$.disabled=!1,$.textContent="Purge Selected Data"}})}),(p=e.querySelector("#town-delete-btn"))==null||p.addEventListener("click",async()=>{const I=P.name||"this town",M=prompt('This will permanently delete "'+I+`" and ALL its characters.

Type the town name to confirm:`);if(M&&M.trim().toLowerCase()===I.toLowerCase())try{await on(t),alert(I+" has been deleted."),ke("dashboard")}catch(C){alert("Failed to delete town: "+C.message)}else M!==null&&alert("Town name did not match. Deletion cancelled.")}),(g=e.querySelector("#list-body"))==null||g.addEventListener("click",I=>{const M=I.target.closest(".char-row");if(!M)return;const C=parseInt(M.dataset.id),u=k.find(x=>x.id===C||x.dbId===C);if(u){me({selectedCharId:u.id});const x=e.querySelector("#detail-area");x&&Pe(x,u,{onListRefresh:()=>{Me(e,k),Oe(e,k)},onDelete:async()=>{const B=((await Le(ne().currentTownId)).characters||[]).map(xe);ne().currentTown.characters=B,me({selectedCharId:null}),Me(e,B),Oe(e,B),x.innerHTML='<div class="detail-empty">Select a character</div>'},containerRef:e})}}),(v=e.querySelector("#intake-generate-btn"))==null||v.addEventListener("click",async()=>{var I,M,C,u,x;const B=Math.max(1,Math.min(50,parseInt((I=e.querySelector("#intake-count"))==null?void 0:I.value)||5)),$=e.querySelector("#intake-generate-btn"),E=e.querySelector("#intake-status"),m=10;$.disabled=!0,$.textContent="⏳ Generating...";try{let S="";try{const L=await wt(),J=[];L.campaign_description&&J.push(L.campaign_description),L.rules_text&&J.push("House Rules: "+L.rules_text);const te=L.homebrew_settings||{},R=[],j={magic_level:{label:"MAGIC LEVEL",none:"None — mundane.",low:"Low — rare.",standard:"Standard.",high:"High — common.",wild:"Wild — unpredictable."},tech_level:{label:"TECHNOLOGY",primitive:"Primitive.",ancient:"Ancient.",medieval:"Medieval.",renaissance:"Renaissance.",magitech:"Magitech.",steampunk:"Steampunk."},tone:{label:"TONE",grimdark:"Grimdark.",dark_fantasy:"Dark Fantasy.",standard:"Standard.",lighthearted:"Lighthearted.",horror:"Horror.",intrigue:"Political Intrigue.",mythic_saga:"Mythic Saga."},divine:{label:"DIVINE",absent:"Absent.",distant:"Distant.",active:"Active.",meddling:"Meddling."},planar:{label:"PLANAR",sealed:"Sealed.",rare:"Rare.",active:"Active.",chaotic:"Chaotic."},economy:{label:"ECONOMY",barter:"Barter.",poor:"Impoverished.",standard:"Standard.",rich:"Prosperous.",guild:"Guild-Controlled."},law:{label:"LAW",lawless:"Lawless.",frontier:"Frontier.",standard:"Standard.",authoritarian:"Authoritarian.",theocracy:"Theocratic."},monster_intelligence:{label:"MONSTERS",bestial:"Bestial.",cunning:"Cunning.",sentient:"Sentient."},power_level:{label:"POWER",gritty:"Gritty.",heroic:"Heroic.",mythic:"Mythic."},ability_scores:{label:"ABILITY SCORES",standard_array:"Standard Array.",point_buy:"Point Buy.",roll_4d6:"4d6 drop lowest.",roll_3d6:"3d6 straight.",heroic:"Heroic Array."},leveling:{label:"LEVELING",xp:"XP-based.",milestone:"Milestone.",session:"Session-based.",slow:"Slow.",fast:"Fast."},multiclass:{label:"MULTICLASS",forbidden:"Forbidden.",restricted:"Restricted.",standard:"Standard.",free:"Free."},alignment:{label:"ALIGNMENT",strict:"Strict.",guideline:"Guideline.",dynamic:"Dynamic.",none:"None."},racial:{label:"RACIAL",standard:"Standard.",flexible:"Flexible.",custom_lineage:"Custom Lineage.",no_bonuses:"No Bonuses."},feats:{label:"FEATS",none:"None.",standard:"Standard.",bonus:"Bonus.",frequent:"Frequent.",free_start:"Free Starting."},mortality:{label:"MORTALITY",lethal:"Lethal.",impactful:"Impactful.",rare:"Rare."},death:{label:"DEATH",permanent:"Permanent.",costly:"Costly.",available:"Available.",impactful:"Impactful."},healing:{label:"HEALING",fast:"Fast.",standard:"Standard.",slow:"Slow.",gritty:"Gritty.",medicine:"Medicine Required."},resting:{label:"RESTING",standard:"Standard.",gritty:"Gritty.",epic:"Epic Heroism.",safe_haven:"Safe Haven."},encumbrance:{label:"ENCUMBRANCE",none:"None.",simple:"Simple.",variant:"Variant.",slot:"Slot-Based.",strict:"Strict."},disease:{label:"DISEASE",none:"None.",rare:"Rare.",realistic:"Realistic.",rampant:"Rampant."},natural_hazards:{label:"HAZARDS",mild:"Mild.",standard:"Standard.",harsh:"Harsh.",catastrophic:"Catastrophic."},npc_depth:{label:"NPC DEPTH",simple:"Simple.",standard:"Standard.",deep:"Deep.",literary:"Literary."},romance:{label:"ROMANCE",none:"None.",subtle:"Subtle.",present:"Present.",focus:"Focus."},factions:{label:"FACTIONS",none:"None.",simple:"Simple.",complex:"Complex.",dominant:"Dominant."},crafting:{label:"CRAFTING",none:"None.",simple:"Simple.",detailed:"Detailed.",central:"Central."},magic_items:{label:"MAGIC ITEMS",nonexistent:"Nonexistent.",very_rare:"Very Rare.",uncommon:"Uncommon.",available:"Available.",abundant:"Abundant."},undead:{label:"UNDEAD",nonexistent:"Nonexistent.",abomination:"Abomination.",standard:"Standard.",commonplace:"Commonplace.",dominant:"Dominant."}};for(const[X,V]of Object.entries(te))V&&(M=j[X])!=null&&M[V]&&R.push(`${j[X].label}: ${j[X][V]}`);R.length&&J.push(`HOMEBREW RULES:
`+R.join(`
`));try{const X=(await Dt(ne().currentTownId)).meta||{};if(X.gen_rules){const V=JSON.parse(X.gen_rules),se=[],ee={hp_rule:{label:"HP RULE",max:"Max HP.",average:"Average.",rolled:"Rolled.",max_first:"Max L1, roll after."},sources:{label:"SOURCES",phb_only:"PHB Only.",phb_xge:"PHB+XGE.",phb_xge_tce:"PHB+XGE+TCE.",all_official:"All Official.",homebrew:"All+Homebrew."},starting_equip:{label:"START EQUIP",class_default:"Class Default.",rolled_gold:"Rolled Gold.",minimal:"Minimal.",wealthy:"Wealthy."},class_dist:{label:"CLASS DIST",commoner:"Mostly Commoners.",balanced:"Balanced.",adventurer:"Adventurer-Heavy.",elite:"Elite."},name_style:{label:"NAME STYLE",high_fantasy:"High Fantasy.",cultural:"Cultural.",real_world:"Real-World.",whimsical:"Whimsical."},bg_complexity:{label:"BACKGROUND",simple:"Simple.",standard:"Standard.",detailed:"Detailed.",epic:"Epic."},age_dist:{label:"AGE DIST",young:"Young.",prime:"Prime.",full_range:"Full Range.",elder:"Elder-Heavy."}};V.intake_level&&parseInt(V.intake_level)>0?se.push(`INTAKE LEVEL: All new NPCs are level ${V.intake_level}.`):(V.intake_level==="0"||V.intake_level===0)&&se.push("INTAKE LEVEL: AI picks an appropriate level for each creature. For humanoids, randomize between levels 1-4. For monsters/creatures, use a level appropriate to the creature type."),V.max_level&&se.push(`MAX LEVEL: NPCs cannot exceed level ${V.max_level}.`);for(const[ie,Q]of Object.entries(V))ie==="intake_level"||ie==="max_level"||Q&&(C=ee[ie])!=null&&C[Q]&&se.push(`${ee[ie].label}: ${ee[ie][Q]}`);se.length&&J.push(`TOWN GENERATION RULES:
`+se.join(`
`))}}catch{}S=J.join(`

`)}catch{}const T=((x=(u=e.querySelector("#intake-instructions"))==null?void 0:u.value)==null?void 0:x.trim())||"",q=/\b(stirge|goblin|kobold|orc|skeleton|zombie|rat|wolf|spider|bat|snake|bear|ogre|troll|undead|beast|creature|monster|animal|vermin|aberration|ooze|elemental|fiend|fey|dragon|worg|hyena|dire|ghoul|wight|wraith|gnoll|lizardfolk|bugbear|hobgoblin|minotaur|harpy|imp|demon|devil|slime|ant|scorpion|centipede|crocodile|shark|owl|hawk|eagle|boar|lion|tiger|ape|horse|mule|donkey|cat|dog|badger|wolverine|weasel|raven|toad|lizard|squid|octopus|crab|wasp|beetle|moth|gryphon|griffon|basilisk|cockatrice|chimera|manticore|hydra|gargoyle|golem|treant|dryad|nymph|satyr|pegasus|unicorn|wyvern|drake|giant)\b/i,H=/^(human|elf|dwarf|halfling|gnome|half-elf|half-orc|tiefling|dragonborn|aasimar)$/i;let W=T.match(q),D=[],Y=0;try{const L=((await Dt(ne().currentTownId)).meta||{}).demographics||"";if(L){const J=L.split(",").map(te=>te.trim());for(const te of J){const R=te.match(/^(.+?)\s+(\d+)%?$/);if(R){const j=R[1].trim(),X=parseInt(R[2]);H.test(j)?Y+=X:q.test(j)?D.push({name:j,pct:X}):D.push({name:j,pct:X})}}}}catch{}if(D.length>0&&Y===0&&!W){E.innerHTML='<span style="color:var(--text-secondary)">🐉 Creature demographics detected — pulling from SRD...</span>';try{let L=0,J=D.map(X=>({...X,exact:B*X.pct/100,count:Math.max(1,Math.floor(B*X.pct/100))})),te=J.reduce((X,V)=>X+V.count,0),R=B-te;if(R>0){J.sort((X,V)=>V.exact-Math.floor(V.exact)-(X.exact-Math.floor(X.exact)));for(let X=0;X<R&&X<J.length;X++)J[X].count++}else if(te>B)for(J.sort((X,V)=>X.pct-V.pct);te>B&&J.length>0;){const X=J.find(V=>V.count>1);if(X)X.count--,te--;else break}for(const X of J){E.innerHTML=`<span style="color:var(--text-secondary)">🔍 Looking up "${X.name}" in SRD... (${X.count} creatures)</span>`;try{const V=(await Mt(t,X.name,X.count,T)).characters||[];V.length>0&&(await Re(t,{new_characters:V},null,0),L+=V.length)}catch(V){console.warn(`SRD lookup failed for "${X.name}":`,V.message)}}const j=((await Le(t)).characters||[]).map(xe);ne().currentTown.characters=j,k.length=0,k.push(...j),pt(e,j),nt(e,j),Me(e,j),Oe(e,j),L>0?(E.innerHTML=`<span style="color:var(--success)">✅ ${L} creatures added from SRD! No AI credits used.</span>`,setTimeout(()=>{E.innerHTML=""},8e3)):E.innerHTML='<span style="color:var(--error)">❌ No matching creatures found in SRD. Check demographic race names match SRD monster names.</span>';return}catch(L){E.innerHTML=`<span style="color:var(--error)">❌ SRD creature error: ${L.message}</span>`;return}}if(W){const L=W[1];E.innerHTML=`<span style="color:var(--text-secondary)">🔍 Looking up "${L}" in SRD database...</span>`;try{const J=await Mt(t,L,B,T),te=J.characters||[],R=J.monster_info;if(te.length===0){E.innerHTML=`<span style="color:var(--error)">❌ "${L}" not found in SRD. Try the exact SRD name (e.g. "Wolf" not "Wolves").</span>`;return}E.innerHTML=`<span style="color:var(--text-secondary)">💾 Adding ${te.length}x ${(R==null?void 0:R.name)||L} (${(R==null?void 0:R.type)||"?"}, CR ${(R==null?void 0:R.cr)||"?"})...</span>`,await Re(t,{new_characters:te},null,0);const j=((await Le(t)).characters||[]).map(xe);ne().currentTown.characters=j,k.length=0,k.push(...j),pt(e,j),nt(e,j),Me(e,j),Oe(e,j),E.innerHTML=`<span style="color:var(--success)">✅ ${te.length}x ${(R==null?void 0:R.name)||L} added from SRD! (${(R==null?void 0:R.type)||"?"}, CR ${(R==null?void 0:R.cr)||"?"}, HD ${(R==null?void 0:R.hd)||"?"}) — No AI credits used.</span>`,setTimeout(()=>{E.innerHTML=""},8e3);return}catch(J){E.innerHTML=`<span style="color:var(--error)">❌ SRD creature error: ${J.message}</span>`;return}}E.innerHTML=`<span style="color:var(--text-secondary)">📋 Step 1/2: Creating character roster (${B} characters)...</span>`;const K=(await Sa(t,B,S,T)).roster||[];if(K.length===0){E.innerHTML='<span style="color:var(--error)">❌ AI returned empty roster</span>';return}E.innerHTML=`<span style="color:var(--success)">✅ Step 1/2: Roster created — ${K.length} characters planned</span>`,await new Promise(L=>setTimeout(L,800));let ae=0,oe=0,he=0;for(let L=0;L<K.length;L+=m){const J=K.slice(L,L+m),te=Math.floor(L/m)+1,R=Math.ceil(K.length/m);E.innerHTML=`<span style="color:var(--text-secondary)">🔧 Step 2/2: Fleshing out characters... (${ae}/${K.length}, batch ${te}/${R})</span>`;let j;try{j=await Yt(t,J,S)}catch(se){if(he++,console.warn(`Flesh batch ${te} failed:`,se.message),he>=3)break;await new Promise(ee=>setTimeout(ee,2e3));try{j=await Yt(t,J,S),he=0}catch{console.warn("Retry also failed, skipping batch");continue}}const X=j.characters||[];if(X.length===0){if(he++,he>=3)break;continue}he=0,ae+=X.length,E.innerHTML=`<span style="color:var(--text-secondary)">💾 Saving... (${ae}/${K.length})</span>`;const V=await Re(t,{new_characters:X},null,0);console.log("Apply response:",V),oe+=X.length}const z=((await Le(t)).characters||[]).map(xe);ne().currentTown.characters=z,k.length=0,k.push(...z),pt(e,z),nt(e,z),Me(e,z),Oe(e,z);const pe=K.length-oe;pe>0&&oe>0?E.innerHTML=`<span style="color:var(--warning, orange)">⚠️ ${oe} of ${K.length} characters added (${pe} failed to flesh out — try again)</span>`:oe===0?E.innerHTML='<span style="color:var(--error)">❌ Failed to flesh out any characters</span>':(E.innerHTML=`<span style="color:var(--success)">✅ ${oe} character${oe!==1?"s":""} added!</span>`,setTimeout(()=>{E.innerHTML=""},5e3))}catch(S){E.innerHTML=`<span style="color:var(--error)">❌ ${S.message}</span>`}finally{$.disabled=!1,$.textContent="🎲 Generate"}}),(b=e.querySelector("#auto-assign-spells-btn"))==null||b.addEventListener("click",async()=>{var I;const M=e.querySelector("#auto-assign-spells-btn"),C=e.querySelector("#intake-status");M.disabled=!0,M.textContent="⏳ Assigning...",C.innerHTML='<span style="color:var(--text-secondary)">✨ Auto-assigning role-optimal spells to all casters...</span>';try{const u=await un(ne().currentTownId,!0);if(console.log("Auto-assign spells response:",u),u.debug&&console.table(u.debug),u.ok){const x=(u.characters||[]).join(", "),B=(I=u.debug)==null?void 0:I[0],$=B?` | SRD:${B.totalSrdSpells} found:${JSON.stringify(B.spellsFoundPerLevel)} sel:${B.selectedCount} known:${B.knownInserted} prep:${B.prepInserted}${B.error?" ERR:"+B.error:""}`:"";C.innerHTML=`<span style="color:var(--success)">✅ Assigned spells to ${u.assigned} caster${u.assigned!==1?"s":""}${x?": "+x:""}${$}</span>`;const E=((await Le(ne().currentTownId)).characters||[]).map(xe);ne().currentTown.characters=E,Me(e,E)}else C.innerHTML=`<span style="color:var(--error)">❌ ${u.error||"Failed"}</span>`}catch(u){C.innerHTML=`<span style="color:var(--error)">❌ ${u.message}</span>`}finally{M.disabled=!1,M.textContent="✨ Auto-Assign Spells"}})}catch(y){console.error("Town load error:",y),e.querySelector(".split-layout").innerHTML=`<div class="view-empty"><h2>Error</h2><p>${y.message}</p></div>`}}function pt(e,t,s){var a,n,l,i;const r=ne(),d=r.activeStatusFilter==="Deceased"?t.filter(g=>g.status==="Deceased"):t.filter(g=>g.status!=="Deceased"),c=[...new Set(d.map(g=>g.race).filter(Boolean))].sort(),o=[...new Set(d.map(g=>g.class).filter(Boolean))].sort();s=s||((a=r.currentTown)==null?void 0:a.buildings)||[];const p=e.querySelector("#race-filters");if(p){const g={};d.forEach(h=>{g[h.race]=(g[h.race]||0)+1});const v={};d.forEach(h=>{const f=h.class;v[f]=(v[f]||0)+1});const b={};let y=0;d.forEach(h=>{h.building_id?b[h.building_id]=(b[h.building_id]||0)+1:y++}),p.innerHTML=`
      <select id="filter-race" class="filter-dropdown">
        <option value="">All Races (${d.length})</option>
        ${c.map(h=>`<option value="${h}" ${r.activeRaceFilter===h?"selected":""}>${h} (${g[h]||0})</option>`).join("")}
      </select>
      <select id="filter-class" class="filter-dropdown">
        <option value="">All Classes (${d.length})</option>
        ${o.map(h=>`<option value="${h}" ${r.activeClassFilter===h?"selected":""}>${h} (${v[h]||0})</option>`).join("")}
      </select>
      ${s.length?`<select id="filter-building" class="filter-dropdown">
        <option value="">All Buildings (${d.length})</option>
        ${s.map(h=>`<option value="${h.id}" ${r.activeBuildingFilter===String(h.id)?"selected":""}>${h.name} (${b[h.id]||0})</option>`).join("")}
        <option value="_unassigned" ${r.activeBuildingFilter==="_unassigned"?"selected":""}>🚶 Unassigned (${y})</option>
      </select>`:""}
    `,(n=p.querySelector("#filter-race"))==null||n.addEventListener("change",h=>{me({activeRaceFilter:h.target.value||null}),Me(e,t),Oe(e,t)}),(l=p.querySelector("#filter-class"))==null||l.addEventListener("change",h=>{me({activeClassFilter:h.target.value||null}),Me(e,t),Oe(e,t)}),(i=p.querySelector("#filter-building"))==null||i.addEventListener("change",h=>{me({activeBuildingFilter:h.target.value||null}),Me(e,t),Oe(e,t)})}}function nt(e,t){const s=e.querySelector("#roster-tabs");if(!s)return;const a=ne(),n=t.filter(r=>r.status!=="Deceased").length,l=t.filter(r=>r.status==="Deceased").length,i=a.activeStatusFilter==="Deceased";s.innerHTML='<button class="roster-tab'+(i?"":" active")+'" data-tab="living">Living <span class="roster-tab-count">'+n+'</span></button><button class="roster-tab'+(i?" active":"")+'" data-tab="graveyard">Graveyard <span class="roster-tab-count">'+l+"</span></button>",s.addEventListener("click",r=>{const d=r.target.closest(".roster-tab");if(!d)return;const c=d.dataset.tab;me({activeStatusFilter:c==="graveyard"?"Deceased":null}),nt(e,t),Me(e,t),Oe(e,t)})}function An(e){const t=ne(),s=e.querySelector("#list-header");if(!s)return;const a=n=>t.sortCol===n?(t.sortDir," "):"";s.innerHTML=`
    <div class="list-header-row">
      <span class="sort-col col-name" data-sort="name">Name${a("name")}</span>
      <span class="sort-col col-race" data-sort="race">Rac${a("race")}</span>
      <span class="sort-col col-age" data-sort="age">Age${a("age")}</span>
      <span class="sort-col col-class" data-sort="class">Cls${a("class")}</span>
      <span class="sort-col col-lvl" data-sort="level">Lv${a("level")}</span>
      <span class="sort-col col-hp" data-sort="hp">HP${a("hp")}</span>
      <span class="sort-col col-ac" data-sort="ac">AC${a("ac")}</span>
      <span class="sort-col col-align" data-sort="alignment">AL${a("alignment")}</span>
    </div>
  `,s.addEventListener("click",n=>{var l;const i=n.target.closest(".sort-col");if(!(i!=null&&i.dataset.sort))return;const r=i.dataset.sort;t.sortCol===r?me({sortDir:t.sortDir==="asc"?"desc":"asc"}):me({sortCol:r,sortDir:"asc"}),An(e),Me(e,((l=ne().currentTown)==null?void 0:l.characters)||[])})}function Mn(e){const t=ne();let s=[...e];if(t.activeRaceFilter&&(s=s.filter(n=>n.race===t.activeRaceFilter)),t.activeClassFilter&&(s=s.filter(n=>n.class===t.activeClassFilter)),t.activeBuildingFilter&&(t.activeBuildingFilter==="_unassigned"?s=s.filter(n=>!n.building_id):s=s.filter(n=>String(n.building_id)===t.activeBuildingFilter)),t.activeStatusFilter==="Deceased"?s=s.filter(n=>n.status==="Deceased"):s=s.filter(n=>n.status!=="Deceased"),t.searchQuery){const n=t.searchQuery.toLowerCase();s=s.filter(l=>(l.name||"").toLowerCase().includes(n)||(l.race||"").toLowerCase().includes(n)||(l.class||"").toLowerCase().includes(n)||(l.role||"").toLowerCase().includes(n))}s.sort((n,l)=>{let i,r;return t.sortCol==="level"?(i=parseInt(n.level)||0,r=parseInt(l.level)||0):["hp","ac","xp","age"].includes(t.sortCol)?(i=parseInt(n[t.sortCol])||0,r=parseInt(l[t.sortCol])||0):(i=String(n[t.sortCol]||"").toLowerCase(),r=String(l[t.sortCol]||"").toLowerCase()),i<r?t.sortDir==="asc"?-1:1:i>r?t.sortDir==="asc"?1:-1:0});const a=s.findIndex(n=>(n.role||"").toLowerCase().includes("mayor"));if(a>0){const[n]=s.splice(a,1);s.unshift(n)}return s}function Me(e,t){const s=e.querySelector("#list-body");if(!s)return;const a=ne(),n=Mn(t);s.innerHTML=n.map(l=>{const i=cr[l.race]||"var(--text-muted)",r=l.id==a.selectedCharId||l.dbId==a.selectedCharId?" active":"",d=l.status==="Deceased"?" deceased":"",c=String(l.ac||"").split(",")[0].trim()||"";return`
      <div class="char-row${r}${d}${(l.role||"").toLowerCase().includes("mayor")?" mayor-row":""}" data-id="${l.id}">
        <span class="col-name" title="${l.name}${l.role?" — "+l.role:""}">${(l.role||"").toLowerCase().includes("mayor")?'<span class="mayor-badge">&#9813;</span> ':""}${l.name}</span>
        <span class="col-race" style="color:${i}" title="${l.race}">${pr(l.race)}</span>
        <span class="col-age">${l.age||""}</span>
        <span class="col-class" title="${(l.class||"").replace(/\s+\d+$/,"")}">${dr(l.class)}</span>
        <span class="col-lvl">${l.level||0}</span>
        <span class="col-hp">${l.hp||""}</span>
        <span class="col-ac">${c}</span>
        <span class="col-align" title="${l.alignment||""}">${ur(l.alignment)}</span>
      </div>
    `}).join("")}function Oe(e,t){const s=e.querySelector("#stats-bar");if(!s)return;const a=ne(),n=Mn(t);a.activeStatusFilter==="Deceased"?s.textContent=n.length+" departed soul"+(n.length!==1?"s":""):s.textContent=n.length+" living resident"+(n.length!==1?"s":"")+"  |  "+t.length+" total"}async function hr(e){const{openHistoryModal:t}=await re(()=>import("./HistoryModal-DJulEmqu.js"),[]);t(e)}const qn=[{race:"Human",pct:60},{race:"Dwarf",pct:10},{race:"Elf",pct:8},{race:"Halfling",pct:7},{race:"Gnome",pct:5},{race:"Half-Elf",pct:4},{race:"Half-Orc",pct:3},{race:"Other",pct:3}];async function gr(e){const{showModal:t}=await xn(async()=>{const{showModal:n}=await Promise.resolve().then(()=>Ie);return{showModal:n}}),{el:s,close:a}=t({title:" Town Settings",width:"wide",content:'<p class="muted">Loading settings...</p>'});try{const n=(await Dt(e)).meta||{};let l=[],i={};if(n.gen_rules)try{i=JSON.parse(n.gen_rules)}catch{}if(n.demographics)try{l=JSON.parse(n.demographics)}catch{l=n.demographics.split(",").map(r=>{const d=r.trim().match(/^(.+?)\s+(\d+)%?$/);return d?{race:d[1].trim(),pct:parseInt(d[2])}:null}).filter(Boolean)}l.length||(l=JSON.parse(JSON.stringify(qn))),Ut(s,e,l,n.biome||"Grassland / Plains",n.difficulty_level||"struggling",n.settlement_type||"",i,a)}catch(n){s.innerHTML=`<p class="modal-error" style="display:block;">Failed to load settings: ${n.message}</p>`}}function Ut(e,t,s,a,n,l,i,r){const d=()=>s.reduce((b,y)=>b+y.pct,0),c=[{value:"",label:"— Not Set (Standard Town) —"},{value:"village",label:"🏘️ Village / Hamlet"},{value:"walled_town",label:"🏰 Walled Town"},{value:"fortress",label:"⚔️ Fortress / Keep"},{value:"cave_system",label:"🕳️ Cave System"},{value:"underground_warren",label:"🐀 Underground Warren"},{value:"ruins",label:"🏚️ Ruins / Abandoned"},{value:"camp",label:"⛺ Camp / Encampment"},{value:"nomadic",label:"🐫 Nomadic / Caravan"},{value:"treetop",label:"🌳 Treetop Settlement"},{value:"floating",label:"⛵ Floating / Ship"},{value:"burrow",label:"🕳️ Burrow / Den"},{value:"nest",label:"🪹 Nest / Hive"},{value:"dungeon",label:"⬛ Dungeon"},{value:"temple",label:"🛕 Temple / Shrine Complex"},{value:"mine",label:"⛏️ Mine / Quarry"},{value:"tower",label:"🗼 Tower / Spire"},{value:"outpost",label:"🚩 Outpost / Watchtower"},{value:"port",label:"⚓ Port / Harbor"},{value:"planar",label:"🌀 Planar / Extraplanar"}],o=["","Temperate Forest","Tropical Jungle","Desert (Sandy)","Desert (Rocky)","Arctic Tundra","Subarctic Taiga","Grassland / Plains","Savanna","Coastal / Seaside","Swamp / Marsh","Mountain / Highland","Underground / Underdark","Volcanic","Island / Archipelago","River Valley","Steppe","Badlands"],p=[{value:"peaceful",label:"☀️ Peaceful (×1.0)",desc:"Safe, established village with no threats"},{value:"struggling",label:"⚔️ Struggling (×1.5)",desc:"Occasional monsters, bandits, or hardship"},{value:"frontier",label:"🏔️ Frontier (×2.0)",desc:"Dangerous border, wild lands, regular threats"},{value:"warzone",label:"🔥 Warzone (×3.0)",desc:"Active conflict, siege, monster pressure, plague"}];e.innerHTML=`
        <div class="town-settings-body">
            <h3 class="settings-section-title">🏗️ Settlement Type</h3>
            <p class="settings-desc">What kind of physical location is this? This tells the AI what structures, infrastructure, and inhabitants to expect. (Population size is determined automatically.)</p>
            <select class="form-select" id="settlement-type-select" style="max-width:320px;margin-bottom:1.25rem;">
              ${c.map(b=>`<option value="${b.value}"${b.value===l?" selected":""}>${b.label}</option>`).join("")}
            </select>

            <h3 class="settings-section-title">🌍 Town Biome / Terrain</h3>
            <p class="settings-desc">Select the environment this town is located in. The AI will only generate buildings, resources, and infrastructure appropriate for this biome.</p>
            <select class="form-select" id="biome-select" style="max-width:320px;margin-bottom:1.25rem;">
              ${o.map(b=>`<option value="${b}"${b===a?" selected":""}>${b||"— Not Set —"}</option>`).join("")}
            </select>

            <h3 class="settings-section-title">⚔️ Town Difficulty Level</h3>
            <p class="settings-desc">Controls the XP multiplier for this town. Higher difficulty = more XP from the same activities, reflecting a more dangerous environment.</p>
            <select class="form-select" id="difficulty-select" style="max-width:320px;margin-bottom:1.25rem;">
              ${p.map(b=>`<option value="${b.value}"${b.value===n?" selected":""}>${b.label} — ${b.desc}</option>`).join("")}
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
                ${s.map((b,y)=>`
                    <div class="demo-row" data-index="${y}">
                        <input type="text" class="form-input demo-race" value="${b.race}" placeholder="Race name">
                        <div class="demo-pct-wrap">
                            <input type="range" class="demo-slider" min="0" max="100" value="${b.pct}" data-index="${y}">
                            <input type="number" class="form-input demo-pct" value="${b.pct}" min="0" max="100" data-index="${y}">
                            <span class="demo-pct-sign">%</span>
                        </div>
                        <button class="btn-danger btn-sm demo-remove" data-index="${y}" title="Remove">&#10006;</button>
                    </div>
                `).join("")}
            </div>

            <div class="demo-footer">
                <button class="btn-secondary btn-sm" id="demo-add-btn">+ Add Race</button>
                <span class="demo-total" id="demo-total">Total: <strong>${d()}%</strong></span>
            </div>

            <div class="modal-actions" style="margin-top:1rem;">
                <button class="btn-secondary" id="demo-reset-btn">Reset to Default</button>
                <button class="btn-primary" id="demo-save-btn">💾 Save Settings</button>
            </div>

            <div id="demo-status" style="margin-top:0.5rem;"></div>
        </div>
    `;const g=()=>{const b=d(),y=e.querySelector("#demo-total");y.innerHTML=`Total: <strong style="color:${b===100?"var(--success)":b>100?"var(--error)":"var(--warning)"}">${b}%</strong>`};e.querySelectorAll(".demo-slider").forEach(b=>{b.addEventListener("input",y=>{const h=parseInt(y.target.dataset.index);s[h].pct=parseInt(y.target.value),e.querySelector(`.demo-pct[data-index="${h}"]`).value=y.target.value,g()})}),e.querySelectorAll(".demo-pct").forEach(b=>{b.addEventListener("input",y=>{const h=parseInt(y.target.dataset.index),f=Math.max(0,Math.min(100,parseInt(y.target.value)||0));s[h].pct=f,e.querySelector(`.demo-slider[data-index="${h}"]`).value=f,g()})}),e.querySelectorAll(".demo-race").forEach((b,y)=>{b.addEventListener("input",h=>{s[y].race=h.target.value})});const v=()=>{var b;const y={},h=f=>{var w;return((w=e.querySelector(`#${f}`))==null?void 0:w.value)||""};return h("ts-intake-level")!==""&&(y.intake_level=h("ts-intake-level")),h("ts-max-level")&&(y.max_level=h("ts-max-level")),h("ts-hp-rule")&&(y.hp_rule=h("ts-hp-rule")),h("ts-sources")&&(y.sources=h("ts-sources")),h("ts-starting-equip")&&(y.starting_equip=h("ts-starting-equip")),h("ts-class-dist")&&(y.class_dist=h("ts-class-dist")),h("ts-name-style")&&(y.name_style=h("ts-name-style")),h("ts-bg-complexity")&&(y.bg_complexity=h("ts-bg-complexity")),h("ts-age-dist")&&(y.age_dist=h("ts-age-dist")),y.closed_borders=((b=e.querySelector("#ts-closed-borders"))==null?void 0:b.checked)||!1,y};e.querySelectorAll(".demo-remove").forEach(b=>{b.addEventListener("click",y=>{var h,f,w;const A=parseInt(y.target.dataset.index);s.splice(A,1),Ut(e,t,s,((h=e.querySelector("#biome-select"))==null?void 0:h.value)||"",((f=e.querySelector("#difficulty-select"))==null?void 0:f.value)||"struggling",((w=e.querySelector("#settlement-type-select"))==null?void 0:w.value)||"",v())})}),e.querySelector("#demo-add-btn").addEventListener("click",()=>{var b,y,h;s.push({race:"",pct:0}),Ut(e,t,s,((b=e.querySelector("#biome-select"))==null?void 0:b.value)||"",((y=e.querySelector("#difficulty-select"))==null?void 0:y.value)||"struggling",((h=e.querySelector("#settlement-type-select"))==null?void 0:h.value)||"",v())}),e.querySelector("#demo-reset-btn").addEventListener("click",()=>{var b,y,h;s.length=0,s.push(...JSON.parse(JSON.stringify(qn))),Ut(e,t,s,((b=e.querySelector("#biome-select"))==null?void 0:b.value)||"",((y=e.querySelector("#difficulty-select"))==null?void 0:y.value)||"struggling",((h=e.querySelector("#settlement-type-select"))==null?void 0:h.value)||"",v())}),e.querySelector("#demo-save-btn").addEventListener("click",async()=>{var b,y,h;const f=e.querySelector("#demo-save-btn"),w=e.querySelector("#demo-status");f.disabled=!0,f.textContent=" Saving...";try{const A=s.filter(F=>F.race&&F.pct>0).map(F=>`${F.race} ${F.pct}%`).join(", ");await vt(t,"demographics",A);const k=((b=e.querySelector("#biome-select"))==null?void 0:b.value)||"";await vt(t,"biome",k);const _=((y=e.querySelector("#difficulty-select"))==null?void 0:y.value)||"struggling";await vt(t,"difficulty_level",_);const P=((h=e.querySelector("#settlement-type-select"))==null?void 0:h.value)||"";await vt(t,"settlement_type",P),await vt(t,"gen_rules",JSON.stringify(v())),f.textContent="✅ Saved!",w.innerHTML='<span style="color:var(--success);">✅ Settings saved successfully!</span>',setTimeout(()=>{f.disabled=!1,f.textContent=" Save Settings"},2e3)}catch(A){f.disabled=!1,f.textContent=" Save Settings",w.innerHTML=`<span style="color:var(--error);"> ${A.message}</span>`}})}function br(e){e.innerHTML=`
    <div class="view-settings">
      <header class="view-header">
        <h1>⚙️ Settings</h1>
      </header>

      <div class="settings-grid">
        <section class="settings-section-card">
          <h3 class="settings-section">📜 Campaigns</h3>
          <div id="campaigns-panel">Loading campaigns...</div>
          <div id="usage-meter-panel"></div>
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

          <div class="form-group">
            <label for="s-sell-rate">💰 Item Sell Rate</label>
            <small class="settings-hint">Percentage of base cost when selling items. Will be modified by factions & world events in the future.</small>
            <select id="s-sell-rate" class="form-select">
              <option value="100">100% (Full price)</option>
              <option value="75">75% (Favorable market)</option>
              <option value="50" selected>50% (Standard — D&D default)</option>
              <option value="33">33% (Rough economy)</option>
              <option value="25">25% (Desperate times)</option>
              <option value="10">10% (Pawnshop prices)</option>
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
  `,Sr(),It(e),Dn(e),$r(e),e.querySelector("#settings-save-btn").addEventListener("click",()=>_r(e))}async function It(e){var s,a;const t=e.querySelector("#campaigns-panel");if(t)try{const n=await Rs(),l=n.campaigns||[],i=n.tier||"free",r=n.max_campaigns||1,c=(s=ne().currentCampaign)==null?void 0:s.id,o={free:"Free",adventurer:"Adventurer",guild_master:"Guild Master",world_builder:"World Builder"};t.innerHTML=`
      <div class="campaign-tier-info">
        <span class="tier-badge tier-${i}">${o[i]||i}</span>
        <span class="tier-limit">${l.length} / ${r>=999?"∞":r} campaigns</span>
      </div>
      <div class="campaign-list" id="campaign-list">
        ${l.map(p=>`
          <div class="campaign-card${p.id==c?" campaign-active":""}" data-campaign-id="${p.id}">
            <div class="campaign-card-header">
              <div class="campaign-card-title">
                <span class="campaign-card-name">${p.name}</span>
                ${p.id==c?'<span class="campaign-active-badge">Active</span>':""}
              </div>
              <div class="campaign-card-actions">
                ${p.id!=c?`<button class="btn-sm btn-secondary campaign-switch-btn" data-id="${p.id}" title="Switch to this campaign">▶ Switch</button>`:""}
                <button class="btn-sm btn-secondary campaign-edit-btn" data-id="${p.id}" title="Edit campaign">✏️</button>
                <button class="btn-sm btn-danger campaign-delete-btn" data-id="${p.id}" title="Delete campaign">🗑️</button>
              </div>
            </div>
            <div class="campaign-card-meta">
              <span class="campaign-edition-badge">${wr(p.dnd_edition)}</span>
              <span class="campaign-town-count">${p.town_count||0} towns</span>
            </div>
            ${p.description?`<div class="campaign-card-desc">${p.description}</div>`:""}
          </div>
        `).join("")}
      </div>
      ${l.length<r||r>=999?`
        <button class="btn-primary btn-sm" id="campaign-create-btn" style="margin-top:0.75rem;">+ New Campaign</button>
      `:`
        <div class="muted" style="margin-top:0.5rem;">Subscribe to create unlimited campaigns and towns.</div>
      `}
    `,t.querySelectorAll(".campaign-switch-btn").forEach(p=>{p.addEventListener("click",async()=>{const g=parseInt(p.dataset.id);try{const v=await Bs(g);if(v.campaign){me({currentCampaign:v.campaign}),ze(v.campaign.dnd_edition),$t();const b=document.getElementById("sidebar-container");b&&yt(b),ue(`Switched to "${v.campaign.name}"`,"success"),It(e),Dn(e)}}catch(v){ue(v.message,"error")}})}),t.querySelectorAll(".campaign-edit-btn").forEach(p=>{p.addEventListener("click",()=>yr(e,l.find(g=>g.id==p.dataset.id)))}),t.querySelectorAll(".campaign-delete-btn").forEach(p=>{p.addEventListener("click",async()=>{var v,b,y;const g=l.find(h=>h.id==p.dataset.id);if(g&&confirm(`Delete campaign "${g.name}"? This will delete all its towns and characters permanently.`))try{await pi(g.id),ue(`Campaign "${g.name}" deleted.`,"success");const h=await(await re(async()=>{const{apiGetCurrentUser:w}=await Promise.resolve().then(()=>qi);return{apiGetCurrentUser:w}},void 0)).apiGetCurrentUser();me({currentCampaign:((v=h.user)==null?void 0:v.active_campaign)||null}),(b=h.user)!=null&&b.active_campaign?ze(h.user.active_campaign.dnd_edition):ze(null);const f=document.getElementById("sidebar-container");f&&yt(f),It(e),(y=h.user)!=null&&y.active_campaign||window.location.reload()}catch(h){ue(h.message,"error")}})}),(a=t.querySelector("#campaign-create-btn"))==null||a.addEventListener("click",()=>fr(e))}catch(n){t.innerHTML=`<div class="muted">Error loading campaigns: ${n.message}</div>`}}function fr(e){const t=e.querySelector("#campaigns-panel"),s=t.querySelector(".campaign-form");if(s){s.remove();return}const a=document.createElement("div");a.className="campaign-form",a.innerHTML=`
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
  `,t.insertBefore(a,t.firstChild),a.querySelector("#new-camp-cancel").addEventListener("click",()=>a.remove()),a.querySelector("#new-camp-submit").addEventListener("click",async()=>{const n=a.querySelector("#new-camp-name").value.trim(),l=a.querySelector("#new-camp-edition").value,i=a.querySelector("#new-camp-desc").value.trim();if(!n){ue("Name is required.","error");return}try{const r=await Ns(n,l,i);ue(`Campaign "${n}" created & activated!`,"success"),me({currentCampaign:r.campaign}),ze(l),$t();const d=document.getElementById("sidebar-container");d&&yt(d),a.remove(),It(e)}catch(r){ue(r.message,"error")}})}function yr(e,t){if(!t)return;const s=e.querySelector("#campaigns-panel"),a=s.querySelector(".campaign-form");a&&a.remove();const n=document.createElement("div");n.className="campaign-form",n.innerHTML=`
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
  `,s.insertBefore(n,s.firstChild),n.querySelector("#edit-camp-cancel").addEventListener("click",()=>n.remove()),n.querySelector("#edit-camp-submit").addEventListener("click",async()=>{var d;const l=n.querySelector("#edit-camp-name").value.trim(),i=n.querySelector("#edit-camp-edition").value,r=n.querySelector("#edit-camp-desc").value.trim();if(!l){ue("Name is required.","error");return}try{await di(t.id,{name:l,dnd_edition:i,description:r}),ue("Campaign updated!","success");const c=ne();((d=c.currentCampaign)==null?void 0:d.id)===t.id&&(me({currentCampaign:{...c.currentCampaign,name:l,dnd_edition:i,description:r}}),ze(i),$t());const o=document.getElementById("sidebar-container");o&&yt(o),n.remove(),It(e)}catch(c){ue(c.message,"error")}})}function wr(e){return{"3.5e":"D&D 3.5e","5e":"D&D 5e (2014)","5e2024":"D&D 5e (2024)"}[e]||e||""}async function $r(e){const t=e.querySelector("#usage-meter-panel");if(t)try{const s=await Na();if(!s.ok)return;const{tier:a,tier_label:n,tokens_used:l,token_limit:i,percentage:r,call_count:d,year_month:c}=s,o=y=>y>=1e6?(y/1e6).toFixed(1)+"M":y>=1e3?(y/1e3).toFixed(0)+"K":y.toString();let p,g,v;r>=90?(p="#ef4444",g="usage-critical",v="Almost at limit"):r>=70?(p="#f59e0b",g="usage-warning",v="Getting close"):r>=40?(p="#eab308",g="usage-moderate",v="Moderate usage"):(p="#22c55e",g="usage-good",v="Plenty remaining");const b={free:"Upgrade to Adventurer for 4x more AI capacity.",adventurer:"Upgrade to Guild Master for 3x more capacity.",guild_master:"Upgrade to World Builder for 3x more capacity.",world_builder:""};t.innerHTML=`
      <div class="usage-meter-card">
        <div class="usage-meter-header">
          <span class="usage-meter-title">📊 AI Usage This Month</span>
          <span class="usage-meter-period">${c}</span>
        </div>
        <div class="usage-bar-container">
          <div class="usage-bar-track">
            <div class="usage-bar-fill ${g}" style="width: ${Math.min(r,100)}%; background: ${p};"></div>
          </div>
          <div class="usage-bar-labels">
            <span class="usage-bar-used">${o(l)} used</span>
            <span class="usage-bar-pct" style="color: ${p}">${r}%</span>
            <span class="usage-bar-limit">${o(i)} limit</span>
          </div>
        </div>
        <div class="usage-meter-details">
          <span class="usage-detail-item">🔮 ${d.toLocaleString()} AI calls</span>
          <span class="usage-detail-item">📦 ${o(l)} tokens</span>
          <span class="usage-detail-item usage-status ${g}">${v}</span>
        </div>
        ${b[a]?`<div class="usage-upgrade-hint">${b[a]}</div>`:""}
      </div>
    `}catch(s){console.error("Failed to load usage meter:",s)}}async function Sr(e){}async function Dn(e){try{const t=await wt();t.campaign_description&&(e.querySelector("#s-campaign-desc").value=t.campaign_description),t.rules_text&&(e.querySelector("#s-house-rules").value=t.rules_text),t.relationship_speed&&(e.querySelector("#s-rel-speed").value=t.relationship_speed),t.birth_rate&&(e.querySelector("#s-birth-rate").value=t.birth_rate),t.death_threshold&&(e.querySelector("#s-death-threshold").value=t.death_threshold),t.child_growth&&(e.querySelector("#s-child-growth").value=t.child_growth),t.conflict_frequency&&(e.querySelector("#s-conflict").value=t.conflict_frequency),t.sell_rate&&(e.querySelector("#s-sell-rate").value=t.sell_rate);const s=t.homebrew_settings||{},a=["magic-level","tech-level","tone","divine","planar","economy","law","monster-int","power-level","ability-scores","leveling","multiclass","alignment","racial","feats","mortality","death","healing","resting","encumbrance","disease","natural-hazards","npc-depth","romance","factions","crafting","magic-items","undead"],n=["magic_level","tech_level","tone","divine","planar","economy","law","monster_intelligence","power_level","ability_scores","leveling","multiclass","alignment","racial","feats","mortality","death","healing","resting","encumbrance","disease","natural_hazards","npc_depth","romance","factions","crafting","magic_items","undead"];a.forEach((l,i)=>{const r=e.querySelector(`#hb-${l}`);r&&s[n[i]]&&(r.value=s[n[i]])})}catch(t){console.error("Failed to load campaign rules:",t)}}async function _r(e){try{const t=e.querySelector("#s-campaign-desc").value.trim(),s=e.querySelector("#s-house-rules").value.trim(),a={},n=["magic-level","tech-level","tone","divine","planar","economy","law","monster-int","power-level","ability-scores","leveling","multiclass","alignment","racial","feats","mortality","death","healing","resting","encumbrance","disease","natural-hazards","npc-depth","romance","factions","crafting","magic-items","undead"],l=["magic_level","tech_level","tone","divine","planar","economy","law","monster_intelligence","power_level","ability_scores","leveling","multiclass","alignment","racial","feats","mortality","death","healing","resting","encumbrance","disease","natural_hazards","npc_depth","romance","factions","crafting","magic_items","undead"];n.forEach((r,d)=>{var o;const c=((o=e.querySelector(`#hb-${r}`))==null?void 0:o.value)||"";c&&(a[l[d]]=c)});const i={relationship_speed:e.querySelector("#s-rel-speed").value,birth_rate:e.querySelector("#s-birth-rate").value,death_threshold:e.querySelector("#s-death-threshold").value,child_growth:e.querySelector("#s-child-growth").value,conflict_frequency:e.querySelector("#s-conflict").value,sell_rate:e.querySelector("#s-sell-rate").value};await pn(s,t,a,i),ue("Settings saved!","success")}catch(t){ue("Save failed: "+t.message,"error")}}const kr=[{key:"spells",icon:"✨",label:"Spells",count:699},{key:"monsters",icon:"🐉",label:"Monsters",count:681},{key:"feats",icon:"⚔️",label:"Feats",count:387},{key:"powers",icon:"🔮",label:"Powers",count:286},{key:"equipment",icon:"🛡️",label:"Equipment",count:282},{key:"items",icon:"💎",label:"Magic Items",count:1680},{key:"classes",icon:"🎭",label:"Classes",count:16},{key:"races",icon:"👤",label:"Races",count:7},{key:"skills",icon:"📋",label:"Skills",count:40},{key:"domains",icon:"⛪",label:"Domains",count:36}];let ps=null;function Lr(e){e.innerHTML=`
    <div class="view-srd">
      <header class="view-header">
        <h1>📖 SRD Reference Browser</h1>
      </header>

      <div class="srd-tabs" id="srd-tabs">
        ${kr.map(a=>`<button class="srd-tab${a.key==="spells"?" active":""}" data-tab="${a.key}">
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
  `;let t="spells";e.querySelectorAll(".srd-tab").forEach(a=>{a.addEventListener("click",()=>{t=a.dataset.tab,e.querySelectorAll(".srd-tab").forEach(n=>n.classList.toggle("active",n===a)),e.querySelector("#srd-search").value="",va(e,t,"")})}),e.querySelector("#srd-search").addEventListener("input",a=>{clearTimeout(ps),ps=setTimeout(()=>{va(e,t,a.target.value.trim())},300)}),va(e,"spells","")}async function va(e,t,s){const a=e.querySelector("#srd-content");if(a){a.innerHTML='<div class="srd-loading"><div class="spinner"></div>Loading...</div>';try{switch(t){case"spells":await Cr(a,s);break;case"monsters":await Er(a,s);break;case"feats":await Tr(a,s);break;case"powers":await xr(a,s);break;case"equipment":await Ar(a,s);break;case"items":await Mr(a,s);break;case"classes":await qr(a,s);break;case"races":await Dr(a,s);break;case"skills":await Ir(a,s);break;case"domains":await Pr(a,s);break}}catch(n){a.innerHTML=`<p class="error">Failed to load: ${n.message}</p>`}}}function U(e){return!e||e==="None"||e==="null"?"":e}function Ne(e){return!e||e==="None"?"":e.replace(/<div topic=['"][^'"]*['"][^>]*>/gi,"").replace(/<\/div>/gi,"").replace(/<p>/gi,"<p>").replace(/<h[2-8]>/gi,t=>t).trim()}function Ve(e){return`<div class="srd-empty">
        <div class="srd-empty-icon">📭</div>
        <p>No ${e} found matching your search.</p>
    </div>`}async function Cr(e,t){var i;const s=(await ia(t)).data||[];if(!s.length){e.innerHTML=Ve("spells");return}const a={};s.forEach(r=>{const d=r.school||"Unknown";a[d]||(a[d]={});const c=(r.level||"").match(/(\d+)/),p=`Level ${c?parseInt(c[1]):0}`;a[d][p]||(a[d][p]=[]),a[d][p].push(r)});const l=Object.keys(a).sort().map(r=>{const d=Object.keys(a[r]).sort((o,p)=>parseInt(o.replace("Level ",""))-parseInt(p.replace("Level ",""))),c=d.reduce((o,p)=>o+a[r][p].length,0);return`<div class="srd-group">
      <div class="srd-group-header"><span class="srd-group-arrow">▶</span>
        <span class="srd-group-name">${U(r)}</span>
        <span class="srd-group-count">${c}</span></div>
      <div class="srd-group-body" style="display:none;">
        ${d.map(o=>`<div class="srd-subgroup">
          <div class="srd-subgroup-header"><span class="srd-subgroup-arrow">▶</span>
            <span class="srd-subgroup-name">${U(o)}</span>
            <span class="srd-group-count">${a[r][o].length}</span></div>
          <div class="srd-subgroup-body" style="display:none;">
            ${a[r][o].map(p=>`<div class="srd-list-item" data-id="${p.id}">
              <span class="srd-list-name">${p.name}</span>
              <span class="srd-list-meta">${U(p.level||"")}</span>
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
    </div></div>`,e.querySelectorAll(".srd-group-header").forEach(r=>{r.addEventListener("click",()=>{const d=r.nextElementSibling,c=r.querySelector(".srd-group-arrow"),o=d.style.display!=="none";d.style.display=o?"none":"block",c.textContent=o?"▶":"▼"})}),e.querySelectorAll(".srd-subgroup-header").forEach(r=>{r.addEventListener("click",d=>{d.stopPropagation();const c=r.nextElementSibling,o=r.querySelector(".srd-subgroup-arrow"),p=c.style.display!=="none";c.style.display=p?"none":"block",o.textContent=p?"▶":"▼"})}),(i=e.querySelector("#srd-expand-all"))==null||i.addEventListener("click",()=>{const r=e.querySelectorAll(".srd-group-body, .srd-subgroup-body"),d=[...r].some(c=>c.style.display==="none");r.forEach(c=>c.style.display=d?"block":"none"),e.querySelectorAll(".srd-group-arrow, .srd-subgroup-arrow").forEach(c=>c.textContent=d?"▼":"▶"),e.querySelector("#srd-expand-all").textContent=d?"Collapse All":"Expand All"}),e.querySelector("#srd-list").addEventListener("click",async r=>{const d=r.target.closest(".srd-list-item");if(!d)return;e.querySelectorAll(".srd-list-item").forEach(p=>p.classList.remove("selected")),d.classList.add("selected");const c=e.querySelector("#srd-detail");c.innerHTML='<div class="srd-loading"><div class="spinner"></div></div>';const o=(await Ws(d.dataset.id)).data;if(!o){c.innerHTML='<p class="error">Not found</p>';return}c.innerHTML=`<div class="srd-detail-content">
      <h2>${o.name}</h2>
      <div class="srd-detail-tags">
        <span class="srd-badge">${U(o.school)}</span>
        ${o.subschool?`<span class="srd-badge srd-badge-sub">${o.subschool}</span>`:""}
        ${o.descriptor_text?`<span class="srd-badge srd-badge-desc">[${o.descriptor_text}]</span>`:""}
      </div>
      <div class="srd-stat-grid">
        <div class="srd-stat"><label>Level</label><span>${U(o.level)}</span></div>
        <div class="srd-stat"><label>Components</label><span>${U(o.components)}</span></div>
        <div class="srd-stat"><label>Casting Time</label><span>${U(o.casting_time)}</span></div>
        <div class="srd-stat"><label>Range</label><span>${U(o.spell_range)}</span></div>
        ${o.target?`<div class="srd-stat"><label>Target</label><span>${U(o.target)}</span></div>`:""}
        ${o.area?`<div class="srd-stat"><label>Area</label><span>${U(o.area)}</span></div>`:""}
        ${o.effect?`<div class="srd-stat"><label>Effect</label><span>${U(o.effect)}</span></div>`:""}
        <div class="srd-stat"><label>Duration</label><span>${U(o.duration)}</span></div>
        <div class="srd-stat"><label>Saving Throw</label><span>${U(o.saving_throw)}</span></div>
        <div class="srd-stat"><label>Spell Resistance</label><span>${U(o.spell_resistance)}</span></div>
      </div>
      ${o.description?`<div class="srd-description">${Ne(o.description)}</div>`:""}
      ${o.material_components?`<div class="srd-extra"><strong>Material Components:</strong> ${U(o.material_components)}</div>`:""}
      ${o.focus?`<div class="srd-extra"><strong>Focus:</strong> ${U(o.focus)}</div>`:""}
      ${o.xp_cost?`<div class="srd-extra"><strong>XP Cost:</strong> ${U(o.xp_cost)}</div>`:""}
    </div>`})}async function Er(e,t){const s=(await Us(t)).data||[];if(!s.length){e.innerHTML=Ve("monsters");return}e.innerHTML=`
        <div class="srd-split">
            <div class="srd-list" id="srd-list">
                <div class="srd-list-header">
                    <span class="srd-list-count">${s.length} monsters</span>
                </div>
                ${s.map(a=>`
                    <div class="srd-list-item" data-id="${a.id}">
                        <span class="srd-list-name">${a.name}</span>
                        <span class="srd-list-meta">${U(a.type)} · CR ${U(a.challenge_rating)}</span>
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
    `,e.querySelector("#srd-list").addEventListener("click",async a=>{const n=a.target.closest(".srd-list-item");if(!n)return;e.querySelectorAll(".srd-list-item").forEach(r=>r.classList.remove("selected")),n.classList.add("selected");const l=e.querySelector("#srd-detail");l.innerHTML='<div class="srd-loading"><div class="spinner"></div></div>';const i=(await Xs(n.dataset.id)).data;if(!i){l.innerHTML='<p class="error">Not found</p>';return}l.innerHTML=`
            <div class="srd-detail-content srd-statblock">
                <h2>${i.name}</h2>
                <div class="srd-detail-tags">
                    <span class="srd-badge">${U(i.size)} ${U(i.type)}</span>
                    ${i.descriptor_text?`<span class="srd-badge srd-badge-desc">${i.descriptor_text}</span>`:""}
                    <span class="srd-badge srd-badge-cr">CR ${U(i.challenge_rating)}</span>
                </div>
                <div class="srd-stat-grid">
                    <div class="srd-stat"><label>Hit Dice</label><span>${U(i.hit_dice)}</span></div>
                    <div class="srd-stat"><label>Initiative</label><span>${U(i.initiative)}</span></div>
                    <div class="srd-stat"><label>Speed</label><span>${U(i.speed)}</span></div>
                    <div class="srd-stat srd-stat-wide"><label>Armor Class</label><span>${U(i.armor_class)}</span></div>
                    <div class="srd-stat"><label>Base Attack</label><span>${U(i.base_attack)}</span></div>
                    <div class="srd-stat"><label>Grapple</label><span>${U(i.grapple)}</span></div>
                    <div class="srd-stat srd-stat-wide"><label>Attack</label><span>${U(i.attack)}</span></div>
                    <div class="srd-stat srd-stat-wide"><label>Full Attack</label><span>${U(i.full_attack)}</span></div>
                    <div class="srd-stat"><label>Space/Reach</label><span>${U(i.space)} / ${U(i.reach)}</span></div>
                    <div class="srd-stat srd-stat-wide"><label>Abilities</label><span>${U(i.abilities)}</span></div>
                    <div class="srd-stat srd-stat-wide"><label>Saves</label><span>${U(i.saves)}</span></div>
                </div>
                ${i.special_attacks?`<div class="srd-extra"><strong>Special Attacks:</strong> ${U(i.special_attacks)}</div>`:""}
                ${i.special_qualities?`<div class="srd-extra"><strong>Special Qualities:</strong> ${U(i.special_qualities)}</div>`:""}
                ${i.skills?`<div class="srd-extra"><strong>Skills:</strong> ${U(i.skills)}</div>`:""}
                ${i.feats?`<div class="srd-extra"><strong>Feats:</strong> ${U(i.feats)}</div>`:""}
                <div class="srd-stat-grid">
                    <div class="srd-stat"><label>Environment</label><span>${U(i.environment)}</span></div>
                    <div class="srd-stat"><label>Organization</label><span>${U(i.organization)}</span></div>
                    <div class="srd-stat"><label>Treasure</label><span>${U(i.treasure)}</span></div>
                    <div class="srd-stat"><label>Alignment</label><span>${U(i.alignment)}</span></div>
                    <div class="srd-stat"><label>Advancement</label><span>${U(i.advancement)}</span></div>
                    ${i.level_adjustment?`<div class="srd-stat"><label>Level Adj.</label><span>${U(i.level_adjustment)}</span></div>`:""}
                </div>
                ${i.special_abilities?`<div class="srd-description"><strong>Special Abilities:</strong><br>${Ne(i.special_abilities)}</div>`:""}
            </div>
        `})}async function Tr(e,t){const s=(await Gs(t)).data||[];if(!s.length){e.innerHTML=Ve("feats");return}const a={};s.forEach(i=>{const r=i.type||"General";a[r]||(a[r]=[]),a[r].push(i)});const n=Object.keys(a).sort();e.innerHTML=`
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
    `;const l={};s.forEach(i=>l[i.id]=i),e.querySelector("#srd-list").addEventListener("click",i=>{const r=i.target.closest(".srd-list-item");if(!r)return;e.querySelectorAll(".srd-list-item").forEach(b=>b.classList.remove("selected")),r.classList.add("selected");const d=e.querySelector("#srd-detail"),c=l[r.dataset.id];if(!c)return;const o=U(c.prerequisites)||"None",p=U(c.benefit)||"",g=U(c.special)||"",v=U(c.normal_text)||"";d.innerHTML=`
            <div class="srd-detail-content">
                <h2>${c.name}</h2>
                <div class="srd-detail-tags">
                    <span class="srd-badge">${c.type}</span>
                    ${c.multiple==="Yes"?'<span class="srd-badge srd-badge-sub">Multiple</span>':""}
                    ${c.stack==="Yes"?'<span class="srd-badge srd-badge-desc">Stacks</span>':""}
                </div>
                <div class="srd-feat-section">
                    <h4>Prerequisites</h4>
                    <p>${o}</p>
                </div>
                <div class="srd-feat-section">
                    <h4>Benefit</h4>
                    <div>${Ne(p)}</div>
                </div>
                ${v&&v!=="None"?`<div class="srd-feat-section"><h4>Normal</h4><div>${Ne(v)}</div></div>`:""}
                ${g&&g!=="None"?`<div class="srd-feat-section"><h4>Special</h4><div>${Ne(g)}</div></div>`:""}
            </div>
        `})}async function xr(e,t){var i;const s=(await Vs(t)).data||[];if(!s.length){e.innerHTML=Ve("psionic powers");return}const a={};s.forEach(r=>{const d=r.discipline||"Unknown";a[d]||(a[d]={});const c=(r.level||"").match(/(\d+)/),p=`Level ${c?parseInt(c[1]):0}`;a[d][p]||(a[d][p]=[]),a[d][p].push(r)});const l=Object.keys(a).sort().map(r=>{const d=Object.keys(a[r]).sort((o,p)=>parseInt(o.replace("Level ",""))-parseInt(p.replace("Level ",""))),c=d.reduce((o,p)=>o+a[r][p].length,0);return`<div class="srd-group">
            <div class="srd-group-header"><span class="srd-group-arrow">▶</span>
                <span class="srd-group-name">${U(r)}</span>
                <span class="srd-group-count">${c}</span></div>
            <div class="srd-group-body" style="display:none;">
                ${d.map(o=>`<div class="srd-subgroup">
                    <div class="srd-subgroup-header"><span class="srd-subgroup-arrow">▶</span>
                        <span class="srd-subgroup-name">${U(o)}</span>
                        <span class="srd-group-count">${a[r][o].length}</span></div>
                    <div class="srd-subgroup-body" style="display:none;">
                        ${a[r][o].map(p=>`<div class="srd-list-item" data-id="${p.id}">
                            <span class="srd-list-name">${p.name}</span>
                            <span class="srd-list-meta">${U(p.power_points||"")} PP</span>
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
        </div></div>`,e.querySelectorAll(".srd-group-header").forEach(r=>{r.addEventListener("click",()=>{const d=r.nextElementSibling,c=r.querySelector(".srd-group-arrow"),o=d.style.display!=="none";d.style.display=o?"none":"block",c.textContent=o?"▶":"▼"})}),e.querySelectorAll(".srd-subgroup-header").forEach(r=>{r.addEventListener("click",d=>{d.stopPropagation();const c=r.nextElementSibling,o=r.querySelector(".srd-subgroup-arrow"),p=c.style.display!=="none";c.style.display=p?"none":"block",o.textContent=p?"▶":"▼"})}),(i=e.querySelector("#srd-expand-all"))==null||i.addEventListener("click",()=>{const r=e.querySelectorAll(".srd-group-body, .srd-subgroup-body"),d=[...r].some(c=>c.style.display==="none");r.forEach(c=>c.style.display=d?"block":"none"),e.querySelectorAll(".srd-group-arrow, .srd-subgroup-arrow").forEach(c=>c.textContent=d?"▼":"▶"),e.querySelector("#srd-expand-all").textContent=d?"Collapse All":"Expand All"}),e.querySelector("#srd-list").addEventListener("click",async r=>{const d=r.target.closest(".srd-list-item");if(!d)return;e.querySelectorAll(".srd-list-item").forEach(p=>p.classList.remove("selected")),d.classList.add("selected");const c=e.querySelector("#srd-detail");c.innerHTML='<div class="srd-loading"><div class="spinner"></div></div>';const o=(await Ks(d.dataset.id)).data;if(!o){c.innerHTML='<p class="error">Not found</p>';return}c.innerHTML=`<div class="srd-detail-content">
            <h2>${o.name}</h2>
            <div class="srd-detail-tags">
                <span class="srd-badge">${U(o.discipline)}</span>
                ${o.subdiscipline?`<span class="srd-badge srd-badge-sub">${o.subdiscipline}</span>`:""}
                ${o.descriptor_text?`<span class="srd-badge srd-badge-desc">[${o.descriptor_text}]</span>`:""}
            </div>
            <div class="srd-stat-grid">
                <div class="srd-stat"><label>Level</label><span>${U(o.level)}</span></div>
                <div class="srd-stat"><label>Display</label><span>${U(o.display)}</span></div>
                <div class="srd-stat"><label>Manifesting Time</label><span>${U(o.manifesting_time)}</span></div>
                <div class="srd-stat"><label>Range</label><span>${U(o.power_range)}</span></div>
                ${o.target?`<div class="srd-stat"><label>Target</label><span>${U(o.target)}</span></div>`:""}
                <div class="srd-stat"><label>Duration</label><span>${U(o.duration)}</span></div>
                <div class="srd-stat"><label>Saving Throw</label><span>${U(o.saving_throw)}</span></div>
                <div class="srd-stat"><label>Power Points</label><span>${U(o.power_points)}</span></div>
                <div class="srd-stat"><label>Power Resistance</label><span>${U(o.power_resistance)}</span></div>
            </div>
            ${o.description?`<div class="srd-description">${Ne(o.description)}</div>`:""}
            ${o.augment?`<div class="srd-extra"><strong>Augment:</strong> ${Ne(o.augment)}</div>`:""}
        </div>`})}async function Ar(e,t){const s=(await zs(t)).data||[];if(!s.length){e.innerHTML=Ve("equipment");return}const a={};s.forEach(l=>{const i=l.category||"Other";a[i]||(a[i]=[]),a[i].push(l)});const n=Object.keys(a).sort();e.innerHTML=`
        <div class="srd-equip-layout">
            <div class="srd-equip-cats">
                <button class="srd-cat-btn active" data-cat="all">All (${s.length})</button>
                ${n.map(l=>`<button class="srd-cat-btn" data-cat="${l}">${l} (${a[l].length})</button>`).join("")}
            </div>
            <div class="srd-equip-table" id="srd-equip-table">
                ${us(s)}
            </div>
        </div>
    `,e.querySelectorAll(".srd-cat-btn").forEach(l=>{l.addEventListener("click",()=>{e.querySelectorAll(".srd-cat-btn").forEach(d=>d.classList.remove("active")),l.classList.add("active");const i=l.dataset.cat,r=i==="all"?s:a[i]||[];e.querySelector("#srd-equip-table").innerHTML=us(r)})})}function us(e){return`<table class="srd-table srd-table-hover">
        <thead><tr>
            <th>Name</th><th>Category</th><th>Cost</th><th>Weight</th><th>Damage (M)</th><th>Critical</th><th>Type</th>
        </tr></thead>
        <tbody>${e.map(t=>{const s=[];t.armor_bonus&&s.push(`AC Bonus: +${t.armor_bonus}`),t.max_dex&&s.push(`Max Dex: +${t.max_dex}`),t.acp&&s.push(`ACP: ${t.acp}`),t.spell_failure&&s.push(`Spell Failure: ${t.spell_failure}%`),t.range_increment&&s.push(`Range: ${t.range_increment}`),t.dmg_s&&s.push(`Dmg (S): ${t.dmg_s}`),t.properties&&s.push(t.properties);const a=s.length?s.join(" | "):"";return`<tr class="srd-equip-row" ${a?`data-tooltip="${a.replace(/"/g,"&quot;")}"`:""}>
                <td class="srd-equip-name">${t.name}${a?'<span class="srd-tooltip-icon">ℹ️</span>':""}</td>
                <td>${U(t.category)}</td>
                <td>${U(t.cost)}</td>
                <td>${U(t.weight)}</td>
                <td>${U(t.dmg_m)||U(t.damage)||"—"}</td>
                <td>${U(t.critical)||"—"}</td>
                <td>${U(t.type_text)||"—"}</td>
            </tr>`}).join("")}</tbody>
    </table>`}async function Mr(e,t){const s=(await Js(t)).data||[];if(!s.length){e.innerHTML=Ve("magic items");return}e.innerHTML=`
        <div class="srd-split">
            <div class="srd-list" id="srd-list">
                <div class="srd-list-header">
                    <span class="srd-list-count">${s.length} items</span>
                </div>
                ${s.map(a=>`
                    <div class="srd-list-item" data-id="${a.id}">
                        <span class="srd-list-name">${a.name}</span>
                        <span class="srd-list-meta">${U(a.category)} · ${U(a.price)}</span>
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
    `,e.querySelector("#srd-list").addEventListener("click",async a=>{const n=a.target.closest(".srd-list-item");if(!n)return;e.querySelectorAll(".srd-list-item").forEach(r=>r.classList.remove("selected")),n.classList.add("selected");const l=e.querySelector("#srd-detail");l.innerHTML='<div class="srd-loading"><div class="spinner"></div></div>';const i=(await Qs(n.dataset.id)).data;if(!i){l.innerHTML='<p class="error">Not found</p>';return}l.innerHTML=`
            <div class="srd-detail-content">
                <h2>${i.name}</h2>
                <div class="srd-detail-tags">
                    <span class="srd-badge">${U(i.category)}</span>
                    ${i.subcategory?`<span class="srd-badge srd-badge-sub">${i.subcategory}</span>`:""}
                </div>
                <div class="srd-stat-grid">
                    ${i.aura?`<div class="srd-stat"><label>Aura</label><span>${U(i.aura)}</span></div>`:""}
                    ${i.caster_level?`<div class="srd-stat"><label>Caster Level</label><span>${U(i.caster_level)}</span></div>`:""}
                    <div class="srd-stat"><label>Price</label><span>${U(i.price)}</span></div>
                    ${i.cost?`<div class="srd-stat"><label>Cost</label><span>${U(i.cost)}</span></div>`:""}
                    ${i.weight?`<div class="srd-stat"><label>Weight</label><span>${U(i.weight)}</span></div>`:""}
                </div>
                ${i.prereq?`<div class="srd-extra"><strong>Prerequisites:</strong> ${U(i.prereq)}</div>`:""}
                ${i.full_text?`<div class="srd-description">${Ne(i.full_text)}</div>`:""}
            </div>
        `})}async function qr(e,t){const s=(await Os()).data||[],a=(t||"").toLowerCase(),n=a?s.filter(i=>(i.name||"").toLowerCase().includes(a)||(i.class_features||"").toLowerCase().includes(a)):s;if(!n.length){e.innerHTML=Ve("classes");return}e.innerHTML=`
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
  `;const l={};n.forEach(i=>l[i.name]=i),e.querySelector("#srd-list").addEventListener("click",async i=>{const r=i.target.closest(".srd-list-item");if(!r)return;e.querySelectorAll(".srd-list-item").forEach(p=>p.classList.remove("selected")),r.classList.add("selected");const d=e.querySelector("#srd-detail"),c=l[r.dataset.name];if(!c)return;d.innerHTML='<div class="srd-loading"><div class="spinner"></div>Loading progression...</div>';const o=(await Ba(c.name)).data||[];d.innerHTML=`
        <div class="srd-detail-content">
            <h2>${c.name}</h2>
            <div class="srd-stat-grid">
                <div class="srd-stat"><label>Hit Die</label><span>${c.hit_die}</span></div>
                <div class="srd-stat"><label>BAB Type</label><span>${c.bab_type}</span></div>
                <div class="srd-stat"><label>Skills/Level</label><span>${c.skills_per_level}</span></div>
                <div class="srd-stat"><label>Good Saves</label><span>${c.good_saves||"None"}</span></div>
            </div>
            <div class="srd-extra"><strong>Class Features:</strong> ${c.class_features||"—"}</div>
            ${o.length?`
                <h3 class="srd-section-title">📊 Level Progression</h3>
                <div class="srd-progression-wrap">
                    <table class="srd-table srd-table-sm">
                        <thead><tr><th>Lvl</th><th>BAB</th><th>Fort</th><th>Ref</th><th>Will</th><th>Special</th></tr></thead>
                        <tbody>${o.map(p=>`<tr>
                            <td>${p.level}</td><td>${U(p.base_attack_bonus)}</td><td>${U(p.fort_save)}</td><td>${U(p.ref_save)}</td><td>${U(p.will_save)}</td><td>${U(p.special)||"—"}</td>
                        </tr>`).join("")}</tbody>
                    </table>
                </div>
            `:'<p class="muted">No progression data available.</p>'}
        </div>
    `})}async function Dr(e,t){const s=(await Fs()).data||[],a=(t||"").toLowerCase(),n=a?s.filter(l=>(l.name||"").toLowerCase().includes(a)):s;if(!n.length){e.innerHTML=Ve("races");return}e.innerHTML=`<div class="srd-grid">${n.map(l=>`
        <div class="srd-card">
            <h3>${l.name}</h3>
            <div class="srd-detail"><strong>Size:</strong> ${l.size} | <strong>Speed:</strong> ${l.speed}ft</div>
            <div class="srd-detail"><strong>Ability Mods:</strong> ${l.ability_mods||"None"}</div>
            <div class="srd-detail"><strong>Traits:</strong> ${l.traits||"—"}</div>
            <div class="srd-detail"><strong>Languages:</strong> ${l.languages||"—"}</div>
        </div>
    `).join("")}</div>`}async function Ir(e,t){const s=(await js()).data||[],a=(t||"").toLowerCase(),n=a?s.filter(l=>(l.name||"").toLowerCase().includes(a)):s;if(!n.length){e.innerHTML=Ve("skills");return}e.innerHTML=`<div class="srd-split">
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
    </div>`,e.querySelector("#srd-skills-table").addEventListener("click",l=>{const i=l.target.closest("tr[data-id]");if(!i)return;e.querySelectorAll(".srd-skill-row").forEach(o=>o.classList.remove("selected")),i.classList.add("selected");const r=parseInt(i.dataset.id),d=n.find(o=>o.id===r||o.id===String(r)),c=e.querySelector("#srd-detail");if(!d){c.innerHTML='<p class="error">Not found</p>';return}c.innerHTML=`<div class="srd-detail-content">
            <h2>${d.name}${d.subtype?` (${d.subtype})`:""}</h2>
            <div class="srd-detail-tags">
                <span class="srd-badge">${d.ability||"N/A"}</span>
                ${d.trained_only==1||d.trained_only==="Yes"?'<span class="srd-badge srd-badge-sub">Trained Only</span>':""}
                ${d.armor_check_penalty==1||d.armor_check_penalty==="Yes"?'<span class="srd-badge srd-badge-desc">Armor Check Penalty</span>':""}
                ${d.psionic==="Yes"?'<span class="srd-badge srd-badge-sub">Psionic</span>':""}
            </div>
            ${d.full_text?`<div class="srd-description" style="margin-top:0.75rem;">${Ne(d.full_text)}</div>`:d.description?`<div class="srd-description" style="margin-top:0.75rem;">${Ne(d.description)}</div>`:""}
            ${d.synergy?`<div class="srd-extra"><strong>Synergy:</strong> ${Ne(d.synergy)}</div>`:""}
        </div>`})}async function Pr(e,t){const s=(await Ys()).data||[],a=(t||"").toLowerCase(),n=a?s.filter(i=>(i.name||"").toLowerCase().includes(a)):s;if(!n.length){e.innerHTML=Ve("domains");return}e.innerHTML=`
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
  `;const l={};n.forEach(i=>l[i.name]=i),e.querySelector("#srd-list").addEventListener("click",i=>{const r=i.target.closest(".srd-list-item");if(!r)return;e.querySelectorAll(".srd-list-item").forEach(p=>p.classList.remove("selected")),r.classList.add("selected");const d=e.querySelector("#srd-detail"),c=l[r.dataset.name];if(!c)return;const o=[];for(let p=1;p<=9;p++){const g=c[`spell_${p}`];g&&o.push({level:p,name:g})}d.innerHTML=`
        <div class="srd-detail-content">
            <h2>⛪ ${c.name} Domain</h2>
            <div class="srd-feat-section">
                <h4>Granted Powers</h4>
                <div>${Ne(c.granted_powers)||"—"}</div>
            </div>
            <div class="srd-feat-section">
                <h4>Domain Spells</h4>
                <table class="srd-table srd-table-sm">
                    <thead><tr><th>Level</th><th>Spell</th></tr></thead>
                    <tbody>${o.map(p=>`<tr>
                        <td><strong>${p.level}</strong></td>
                        <td>${p.name}</td>
                    </tr>`).join("")}</tbody>
                </table>
            </div>
            ${c.full_text?`<div class="srd-description">${Ne(c.full_text)}</div>`:""}
        </div>
    `})}const ms=["Hammer","Alturiak","Ches","Tarsakh","Mirtul","Kythorn","Flamerule","Eleasis","Eleint","Marpenoth","Uktar","Nightal"],ha=30;function Hr(e){e.innerHTML=`
    <div class="view-calendar">
      <header class="view-header"><h1>📅 Calendar</h1></header>
      <div class="calendar-display" id="cal-display">Loading...</div>

      <!-- Full-width Current Date panel -->
      <section class="settings-section-card" style="margin-bottom:1rem;">
        <h3>Current Date</h3>
        <div class="form-row" style="flex-wrap:wrap;gap:1rem;">
          <div class="form-group" style="flex:1;min-width:80px;"><label>Day</label><input type="number" id="cal-day" min="1" max="100" class="form-input"></div>
          <div class="form-group" style="flex:1;min-width:80px;"><label>Month</label><input type="number" id="cal-month" min="1" max="20" class="form-input"></div>
          <div class="form-group" style="flex:2;min-width:120px;"><label>Year</label><input type="number" id="cal-year" class="form-input"></div>
          <div class="form-group" style="flex:1;min-width:100px;"><label>Era Name</label><input type="text" id="cal-era" placeholder="DR" class="form-input"></div>
        </div>
      </section>

      <!-- Month Names + Days list with +/- controls -->
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
    </div>`;let t=12;function s(l,i,r){const d=e.querySelector("#cal-month-list");if(!d)return;for(;i.length<l;)i.push("Month "+(i.length+1));for(;r.length<l;)r.push(ha);const c=[];for(let g=0;g<l;g++)c.push(`
        <div class="cal-month-row">
          <span class="cal-month-number">${g+1}</span>
          <input type="text" class="form-input cal-month-name" data-month-idx="${g}"
                 value="${(i[g]||"").replace(/"/g,"&quot;")}"
                 placeholder="Month ${g+1}">
          <input type="number" class="form-input cal-month-days" data-month-idx="${g}"
                 value="${r[g]||ha}" min="1" max="100"
                 title="Days in this month" style="width:65px;text-align:center;">
          <span class="cal-days-label">days</span>
        </div>`);d.innerHTML=c.join(""),t=l;const o=e.querySelector("#cal-month-count");o&&(o.textContent=`(${l})`);const p=e.querySelector("#cal-month");p&&(p.max=l)}function a(){const l=e.querySelectorAll(".cal-month-name");return Array.from(l).map(i=>i.value.trim()||`Month ${parseInt(i.dataset.monthIdx)+1}`)}function n(){const l=e.querySelectorAll(".cal-month-days");return Array.from(l).map(i=>Math.max(1,parseInt(i.value)||ha))}e.querySelector("#cal-add-month").addEventListener("click",()=>{if(t>=20)return;const l=a(),i=n();s(t+1,l,i)}),e.querySelector("#cal-remove-month").addEventListener("click",()=>{if(t<=1)return;const l=a(),i=n();l.pop(),i.pop(),s(t-1,l,i)}),Rr(e,s),e.querySelector("#cal-save").addEventListener("click",()=>{Nr(e,a,n,t)})}async function Rr(e,t){try{const a=(await tt()).calendar;if(!a)return;e.querySelector("#cal-display").textContent=Ke(a),e.querySelector("#cal-day").value=a.current_day||1,e.querySelector("#cal-month").value=a.current_month||1,e.querySelector("#cal-year").value=a.current_year||1490,e.querySelector("#cal-era").value=a.era_name||"DR";const n=a.months_per_year||12,l=Array.isArray(a.month_names)?a.month_names:ms.slice();let i;if(Array.isArray(a.days_per_month))i=a.days_per_month;else{const r=parseInt(a.days_per_month)||30;i=Array(n).fill(r)}t(n,l,i),me({calendar:a})}catch(s){console.error("Calendar load error:",s),t(12,ms.slice(),Array(12).fill(30))}}async function Nr(e,t,s,a){try{const n=t(),l=s(),i={current_day:parseInt(e.querySelector("#cal-day").value)||1,current_month:parseInt(e.querySelector("#cal-month").value)||1,current_year:parseInt(e.querySelector("#cal-year").value)||1490,era_name:e.querySelector("#cal-era").value||"DR",months_per_year:a,days_per_month:l,month_names:n};await Hs(i),me({calendar:i}),e.querySelector("#cal-display").textContent=Ke(i),ue("Calendar saved!","success")}catch(n){ue("Save failed: "+n.message,"error")}}function Br(e){const t=ne();if(!t.currentTownId){e.innerHTML=`
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
            <label>📅 Days (Partial Month)</label>
            <div style="display:flex;align-items:center;gap:0.5rem;">
              <input type="number" id="sim-days" class="form-input" min="0" max="30" value="0" style="width:70px;text-align:center;" title="Days to simulate within the month (0 = full month)">
              <span style="font-size:0.75rem;color:var(--text-muted)">0 = full month</span>
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
  `;let s=1,a=null;function n(c,o="info"){const p=e.querySelector("#sim-log-entries");if(!p)return;const g=new Date().toLocaleTimeString(),v={info:"var(--text-secondary)",success:"var(--success)",error:"var(--error)",warn:"var(--warning)"};p.innerHTML+=`<div style="color:${v[o]||v.info};font-size:0.8rem;padding:0.15rem 0;border-bottom:1px solid var(--border);font-family:monospace;"><span style="color:var(--text-muted)">[${g}]</span> ${c}</div>`,p.scrollTop=p.scrollHeight}e.querySelector("#sim-back-btn").addEventListener("click",()=>{ke(`town/${t.currentTownId}`)});function l(c){const o=e.querySelector("#sim-months-group");o&&(o.innerHTML=Array.from({length:c},(p,g)=>{const v=g+1;return`<button class="sim-month-btn${v===1?" active":""}" data-months="${v}">${v}</button>`}).join(""),o.querySelectorAll(".sim-month-btn").forEach(p=>{p.addEventListener("click",()=>{o.querySelectorAll(".sim-month-btn").forEach(g=>g.classList.remove("active")),p.classList.add("active"),s=parseInt(p.dataset.months)})}),s=1)}(async()=>{try{const o=(await tt()).calendar||{};l(parseInt(o.months_per_year)||12)}catch{l(12)}})(),e.querySelector("#sim-clear-log").addEventListener("click",()=>{e.querySelector("#sim-log-entries").innerHTML=""}),e.querySelector("#sim-debug-btn").addEventListener("click",async()=>{n("Testing OpenRouter connectivity...");try{const c=await Ri();n(`API Key Source: ${c.api_key_source||"N/A"}`,"info"),n(`API Key Set: ${c.api_key_set?"YES":"NO"}`,c.api_key_set?"success":"error"),n(`API Key Preview: ${c.api_key_preview||"(empty)"}`,"info"),n(`Model: ${c.model||"N/A"}`,"info"),n(`PHP: ${c.php_version}`,"info"),c.openrouter_http_code!==void 0&&(n(`OpenRouter HTTP: ${c.openrouter_http_code}`,c.openrouter_reachable?"success":"error"),c.total_models&&n(`OpenRouter Models Available: ${c.total_models}`,"success"),c.error_response&&n(`Error Response: ${c.error_response}`,"error")),c.curl_error&&n(`cURL Error: ${c.curl_error}`,"error"),n("Debug complete.","success")}catch(c){n(`Debug failed: ${c.message}`,"error")}}),i(e),n("Simulation view loaded. Town ID: "+t.currentTownId),e.querySelector("#sim-run-btn").addEventListener("click",()=>{r(e)});async function i(c){var o;try{const p=await St(),v=(Array.isArray(p)?p:p.towns||[]).find(y=>y.id===t.currentTownId);v&&(c.querySelector("#sim-town-info").innerHTML=`
                    <span class="sim-town-name">🏰 ${v.name}</span>
                    <span class="sim-town-pop">👥 ${v.character_count||"?"} residents</span>
                `);let b="";try{const y=await wt(),h=[];y.campaign_description&&h.push(y.campaign_description),y.rules_text&&h.push("House Rules: "+y.rules_text);const f=y.homebrew_settings||{},w=[],A={magic_level:{n:"MAGIC LEVEL",none:"None — mundane world, no magic.",low:"Low — Magic is rare, feared, or revered.",standard:"Standard — Per D&D rules.",high:"High — Magic is common, used daily.",wild:"Wild — Unpredictable surges, chaotic anomalies."},tech_level:{n:"TECHNOLOGY",primitive:"Primitive — stone age, tribal.",ancient:"Ancient — bronze/iron age.",medieval:"Medieval — standard D&D.",renaissance:"Renaissance — early firearms, printing.",magitech:"Magitech — magic-driven technology.",steampunk:"Steampunk — steam & clockwork machines."},tone:{n:"WORLD TONE",grimdark:"Grimdark — bleak, hopeless, morally grey.",dark_fantasy:"Dark Fantasy — dark but with hope.",standard:"Standard Fantasy — heroic adventure.",lighthearted:"Lighthearted — comedy, whimsy.",horror:"Horror — dread, terror, madness lurks everywhere.",intrigue:"Political Intrigue — schemes, betrayal, secrets.",mythic_saga:"Mythic Saga — epic legends, fate-driven."},divine:{n:"DIVINE INVOLVEMENT",absent:"Absent — gods are silent or nonexistent.",distant:"Distant — gods exist but rarely intervene.",active:"Active — gods grant power, send visions.",meddling:"Meddling — gods walk the earth, interfere directly."},planar:{n:"PLANAR ACTIVITY",sealed:"Sealed — no planar travel or influence.",rare:"Rare — occasional anomalies.",active:"Active — portals, extraplanar visitors.",chaotic:"Chaotic — planes bleed into the material world."},economy:{n:"ECONOMY",barter:"Barter — no currency, trade goods only.",poor:"Impoverished — scarcity, poverty.",standard:"Standard — coins, merchants, trade.",rich:"Prosperous — wealthy, abundant trade.",guild:"Guild-Controlled — guilds dominate trade."},law:{n:"LAW & ORDER",lawless:"Lawless — no organized law, might = right.",frontier:"Frontier Justice — informal, community-driven.",standard:"Standard — guards, courts, laws.",authoritarian:"Authoritarian — strict laws, harsh punishment.",theocracy:"Theocratic — religious law dominates."},monster_intelligence:{n:"MONSTER INTELLIGENCE",bestial:"Bestial — instinct-driven.",cunning:"Cunning — use tactics, set traps.",sentient:"Sentient — societies, politics, diplomacy."},power_level:{n:"POWER LEVEL",gritty:"Gritty — mortals, 1st-level, survival focus.",heroic:"Heroic — standard D&D adventurer scale.",mythic:"Mythic — demigods, epic-level."},ability_scores:{n:"ABILITY SCORES",standard_array:"Standard Array (15,14,13,12,10,8).",point_buy:"Point Buy (27 pts).",roll_4d6:"4d6 drop lowest.",roll_3d6:"3d6 straight (old school).",heroic:"Heroic Array (higher stats)."},leveling:{n:"LEVELING",xp:"XP-based.",milestone:"Milestone — level at story beats.",session:"Session-based.",slow:"Slow progression.",fast:"Fast progression."},multiclass:{n:"MULTICLASSING",forbidden:"Forbidden — no multiclassing allowed.",restricted:"Restricted — max 2 classes, prerequisites.",standard:"Standard — per D&D rules.",free:"Free — no prerequisites."},alignment:{n:"ALIGNMENT",strict:"Strict — mechanical consequences for alignment.",guideline:"Guideline — descriptive only.",dynamic:"Dynamic — shifts based on actions.",none:"No Alignment — removed entirely."},racial:{n:"RACIAL TRAITS",standard:"Standard — fixed racial bonuses.",flexible:"Flexible — choose where bonuses go.",custom_lineage:"Custom Lineage — any race, any bonus.",no_bonuses:"No Racial Bonuses."},feats:{n:"FEATS",none:"No Feats.",standard:"Standard — feats replace ASI.",bonus:"Bonus — feats + ASI both.",frequent:"Frequent — feat every odd level.",free_start:"Free Starting Feat at L1."},mortality:{n:"NPC MORTALITY",lethal:"Lethal — deaths are common.",impactful:"Impactful — deaths are meaningful.",rare:"Rare — plot armor protects most."},death:{n:"DEATH & RESURRECTION",permanent:"Permanent — dead is dead.",costly:"Costly — possible but rare/expensive.",available:"Available — clerics can raise dead.",impactful:"Deaths shape survivors' personalities."},healing:{n:"HEALING",fast:"Fast — recover quickly.",standard:"Standard.",slow:"Slow — no full recovery on long rest.",gritty:"Gritty Realism — short rest 8hr, long rest 1wk.",medicine:"Medicine Required — healer/supplies needed."},resting:{n:"RESTING",standard:"Standard (1hr short, 8hr long).",gritty:"Gritty (8hr short, 1wk long).",epic:"Epic Heroism (5min short, 1hr long).",safe_haven:"Safe Haven — long rest only in safe locations."},encumbrance:{n:"ENCUMBRANCE",none:"None — carry anything.",simple:"Simple (STR×15 lbs).",variant:"Variant — speed penalties.",slot:"Slot-Based (STR = slots).",strict:"Strict — every pound tracked."},disease:{n:"DISEASE",none:"None — disease doesn't exist.",rare:"Rare — occasional illness.",realistic:"Realistic — diseases spread, can kill.",rampant:"Rampant — plagues are common."},natural_hazards:{n:"NATURAL HAZARDS",mild:"Mild — good weather, safe terrain.",standard:"Standard — seasonal, normal.",harsh:"Harsh — extreme weather, dangerous.",catastrophic:"Catastrophic — frequent disasters."},npc_depth:{n:"NPC DEPTH",simple:"Simple — basic roles.",standard:"Standard — distinct personalities.",deep:"Deep — complex motivations, secrets.",literary:"Literary — rich inner lives, character arcs."},romance:{n:"ROMANCE",none:"None — no romantic content.",subtle:"Subtle — implied, fade-to-black.",present:"Present — acknowledged, part of life.",focus:"Focus — relationships drive drama."},factions:{n:"FACTIONS",none:"None — no organized factions.",simple:"Simple — a few groups.",complex:"Complex — rival factions, shifting alliances.",dominant:"Dominant — factions control everything."},crafting:{n:"CRAFTING",none:"None.",simple:"Simple — basic item creation.",detailed:"Detailed — materials, time, skill checks.",central:"Central — crafting drives the economy."},magic_items:{n:"MAGIC ITEMS",nonexistent:"Nonexistent — no magic items.",very_rare:"Very Rare — legendary, world-shaking.",uncommon:"Uncommon — exist but hard to find.",available:"Available — can be bought.",abundant:"Abundant — magic shops everywhere."},undead:{n:"UNDEAD",nonexistent:"Nonexistent.",abomination:"Abomination — universally feared.",standard:"Standard — exists, dangerous.",commonplace:"Commonplace — undead labor, accepted by some.",dominant:"Dominant — undead rule or overrun areas."}};for(const[k,_]of Object.entries(f))_&&((o=A[k])!=null&&o[_])&&w.push(`${A[k].n}: ${A[k][_]}`);w.length&&h.push(`HOMEBREW WORLD RULES:
`+w.join(`
`)),b=h.join(`

`)}catch{}c._campaignRules=b}catch(p){console.error("Failed to load sim data:",p)}}async function r(c){var P,F;const o=t.currentTownId,p=c.querySelector("#sim-instructions").value.trim(),g=c._campaignRules||"",v=c.querySelector("#sim-run-btn"),b=c.querySelector("#sim-status"),y=c.querySelector("#sim-progress"),h=c.querySelector("#sim-results");c.querySelector("#sim-config");let f=p,w=Math.max(0,Math.min(50,parseInt((P=c.querySelector("#sim-intake-count"))==null?void 0:P.value)||0)),A=Math.max(0,Math.min(30,parseInt((F=c.querySelector("#sim-days"))==null?void 0:F.value)||0));n(`--- Starting simulation: ${s} month(s)${A?` (${A} days)`:""}, town ID ${o} ---`),n(`Instructions: ${f||"(none)"}`),n(`Rules length: ${g.length} chars`),n(`Forced intake: ${w>0?w+" new arrivals":"none (natural only)"}`),v.disabled=!0,v.textContent="⏳ Running...",b.textContent="",h.style.display="none",y.style.display="block";const k=c.querySelector("#sim-progress-fill"),_=c.querySelector("#sim-progress-text");k.style.width="5%";try{if(s<=1){_.textContent=s===0?"AI is generating new characters (intake mode)...":"AI is simulating 1 month of town life...";let I=10;const M=setInterval(()=>{I<85&&(I+=Math.random()*3,k.style.width=`${I}%`)},1e3);n("Calling apiRunSimulation (single)...","info");const C=await At(o,s,g,f,w,A);if(clearInterval(M),k.style.width="100%",_.textContent="Simulation complete!",n("✅ Simulation completed successfully!","success"),C.simulation){const u=C.simulation.changes||{};n(`New chars: ${(u.new_characters||[]).length}, Deaths: ${(u.deaths||[]).length}, XP: ${(u.xp_gains||[]).length}`,"info")}setTimeout(()=>{y.style.display="none"},1e3),a=C,d(c,C)}else{n(`Running ${s} months month-by-month...`,"info");const I={summary:"",events:[],changes:{new_characters:[],deaths:[],new_relationships:[],xp_gains:[],stat_changes:[],role_changes:[],building_changes:[],levelup_details:[]},new_history_entry:{heading:"",content:""}},M=[],C=1,u=s;for(let x=0;x<u;x++){const B=x*C+1,$=Math.min((x+1)*C,s),E=$-B+1,m=Math.round((x+1)/u*90)+5;k.style.width=`${m}%`,_.textContent=`Simulating months ${B}-${$} of ${s}... (batch ${x+1}/${u})`,n(`Batch ${x+1}/${u}: months ${B}-${$} (${E} months)...`,"info");const S=x===0?w:0,T=x===0?f:"";try{const H=(await At(o,E,g,T,S)).simulation||{},W=H.changes||{};H.summary&&M.push(`**Months ${B}-${$}:** ${H.summary}`),(H.events||[]).forEach(D=>{if(typeof D=="string")I.events.push({month:B,description:D});else{const Y=(D.month||1)+B-1;I.events.push({...D,month:Y})}}),["new_characters","deaths","new_relationships","xp_gains","stat_changes","role_changes","building_changes"].forEach(D=>{Array.isArray(W[D])&&I.changes[D].push(...W[D])}),H.new_history_entry&&H.new_history_entry.content&&(I.new_history_entry.content+=`

**Months ${B}-${$}:**
${H.new_history_entry.content}`);try{const D=await Re(o,W,H.new_history_entry||null,E);n(`  Applied batch ${x+1} changes`,"success");const Y=D.applied||{};if(Y.levelup_details&&Y.levelup_details.length&&(I.changes.levelup_details.push(...Y.levelup_details),n(`  ⬆️ ${Y.levelup_details.length} level-up(s) this batch`,"info")),Y.deaths_failed&&Y.deaths_failed.length&&Y.deaths_failed.forEach(K=>n(`  ⚠️ Death not applied: ${K}`,"warn")),typeof Y.deaths=="number"){const K=(W.deaths||[]).length;Y.deaths<K&&n(`  ⚠️ Only ${Y.deaths}/${K} deaths matched characters in the DB`,"warn")}}catch(D){n(`  Warning: Could not apply batch ${x+1}: ${D.message}`,"warn")}n(`  Batch ${x+1}: ${(W.new_characters||[]).length} arrivals, ${(W.deaths||[]).length} deaths, ${(W.building_changes||[]).length} builds`,"info")}catch(q){n(`  ❌ Batch ${x+1} (months ${B}-${$}) failed: ${q.message}`,"error")}}I.summary=M.join(`

`),I.new_history_entry.heading=`Months 1-${s}: Simulation`,I.new_history_entry.content||(I.new_history_entry.content=I.summary),k.style.width="100%",_.textContent=`All ${s} months complete!`,n(`✅ All ${s} months completed! (${u} API calls)`,"success"),setTimeout(()=>{y.style.display="none"},1e3),a={ok:!0,simulation:I,town_id:o,months:s,already_applied:!0},d(c,a)}}catch(I){y.style.display="none",n(`❌ ERROR: ${I.message}`,"error"),b.innerHTML=`<span style="color:var(--error);word-break:break-all;">❌ ${I.message}</span>`}finally{v.disabled=!1,v.textContent="🎲 Run Simulation"}}function d(c,o){var $,E;const p=o.simulation||{},g=p.changes||{},v=c.querySelector("#sim-results"),b=m=>{const S=((m.field||"")+(m.reason||"")+(m.description||"")).toLowerCase();return S.includes("aged")||S.includes("age ")||S.includes("birthday")||m.field&&m.field.toLowerCase()==="age"},y=(g.stat_changes||[]).filter(m=>!b(m)),h=(p.events||[]).filter(m=>{const S=typeof m=="string"?m:m.description||"";return!/\baged\b|\bbirthday\b|\bturns?\s+\d+\b/i.test(S)}),f=g.new_characters||[],w=g.deaths||[],A=g.new_relationships||[],k=g.xp_gains||[],_=g.role_changes||[],P=g.building_changes||[],F=[],I=[];if(p.summary&&I.push(`<p class="sim-summary-text">${p.summary}</p>`),h.length&&I.push(`<div class="sim-events-list">
        ${h.map(m=>typeof m=="string"?`<div class="sim-event-card"><span class="sim-event-dot"></span>${m}</div>`:`<div class="sim-event-card"><span class="sim-event-month">Month ${m.month}</span>${m.description}</div>`).join("")}
      </div>`),I.length&&F.push(["summary","📖","Summary",h.length,I.join("")]),f.length){const m=f.filter(T=>(T.reason||"").toLowerCase().includes("born")||(T.reason||"").toLowerCase().includes("birth")),S=f.filter(T=>!m.includes(T));S.length&&F.push(["arrivals","👥","Arrivals",S.length,`<div class="sim-change-list">${S.map(T=>`
            <div class="sim-change-item sim-change-add">
              <strong>${T.name}</strong> — ${T.race} ${T.class}
              ${T.reason?`<span class="sim-reason">${T.reason}</span>`:""}
            </div>`).join("")}</div>`]),m.length&&F.push(["births","🍼","Births",m.length,`<div class="sim-change-list">${m.map(T=>`
            <div class="sim-change-item sim-change-add">
              <strong>${T.name}</strong> — ${T.race} ${T.class}
              ${T.reason?`<span class="sim-reason">${T.reason}</span>`:""}
            </div>`).join("")}</div>`])}w.length&&F.push(["deaths","💀","Deaths",w.length,`<div class="sim-change-list">${w.map(m=>`
          <div class="sim-change-item sim-change-death">
            <strong>${m.name}</strong>
            ${m.reason?`<span class="sim-reason">${m.reason}</span>`:""}
          </div>`).join("")}</div>`]),A.length&&F.push(["social","💕","Social",A.length,`<div class="sim-change-list">${A.map(m=>`
          <div class="sim-change-item sim-change-social">
            <strong>${m.char1}</strong> <span class="sim-rel-arrow">↔</span> <strong>${m.char2}</strong>
            <span class="sim-rel-type">${m.type}</span>
            ${m.reason?`<span class="sim-reason">${m.reason}</span>`:""}
          </div>`).join("")}</div>`]);const M=[];if(k.length&&M.push(`<h4 class="sim-sub-heading">✨ XP Gains <span class="sim-badge">${k.length}</span></h4>
        <div class="sim-change-list">${k.map(m=>`
          <div class="sim-change-item sim-change-xp">
            <strong>${m.name}</strong> <span class="sim-xp-val">+${m.xp_gained} XP</span>
            ${m.reason?`<span class="sim-reason">${m.reason}</span>`:""}
          </div>`).join("")}</div>`),y.length&&M.push(`<h4 class="sim-sub-heading">📊 Stat Changes <span class="sim-badge">${y.length}</span></h4>
        <div class="sim-change-list">${y.map(m=>`
          <div class="sim-change-item">
            <strong>${m.name}</strong> <span class="sim-stat-field">${m.field}:</span>
            <span class="sim-stat-old">${m.old_value}</span> → <span class="sim-stat-new">${m.new_value}</span>
            ${m.reason?`<span class="sim-reason">${m.reason}</span>`:""}
          </div>`).join("")}</div>`),M.length&&F.push(["progression","📈","Progression",k.length+y.length,M.join("")]),_.length&&F.push(["roles","🎭","Roles",_.length,`<div class="sim-change-list">${_.map(m=>`
          <div class="sim-change-item sim-change-role">
            <strong>${m.name}</strong>
            <span class="sim-role-old">${m.old_role}</span> → <span class="sim-role-new">${m.new_role}</span>
            ${m.reason?`<span class="sim-reason">${m.reason}</span>`:""}
          </div>`).join("")}</div>`]),P.length){const m={start:"🔨",progress:"🏗️",complete:"✅",damage:"⚠️",destroy:"💥"};F.push(["buildings","🏛️","Buildings",P.length,`<div class="sim-change-list">${P.map(S=>{const T=m[S.action]||"🏠";let q="";return S.action==="start"?q=`Construction begins (${S.build_time||"?"} months)`:S.action==="progress"?q="Work continues this month":S.action==="complete"?q="Construction complete!":S.action==="damage"?q="Building damaged":S.action==="destroy"&&(q="Building destroyed"),`
            <div class="sim-change-item sim-change-building">
              <span class="sim-building-icon">${T}</span>
              <strong>${S.name}</strong>
              <span class="sim-building-action">${q}</span>
              ${S.description?`<span class="sim-reason">${S.description}</span>`:""}
            </div>`}).join("")}</div>`])}const C=g.levelup_details||[];C.length&&F.push(["levelups","⬆️","Level Ups",C.length,`<div class="sim-change-list">${C.map(m=>{var S,T;return`
          <div class="sim-change-item sim-change-xp">
            <strong>${m.name}</strong>
            <span class="sim-stat-field">${m.class||""}:</span>
            <span class="sim-stat-old">Lv ${m.old_level}</span> → <span class="sim-stat-new">Lv ${m.new_level}</span>
            <span class="sim-reason">XP: ${((T=(S=m.xp)==null?void 0:S.toLocaleString)==null?void 0:T.call(S))||m.xp||"?"}</span>
          </div>`}).join("")}</div>`]);const u=F.map((m,S)=>`<button class="sim-res-tab${S===0?" active":""}" data-sim-tab="${m[0]}">
        ${m[1]} ${m[2]} ${m[3]>0?`<span class="sim-tab-badge">${m[3]}</span>`:""}
      </button>`).join(""),x=F.map((m,S)=>`<div class="sim-res-panel${S===0?" active":""}" data-sim-panel="${m[0]}">${m[4]}</div>`).join(""),B=o.already_applied===!0;v.innerHTML=`
      <h2 class="sim-results-title">🎲 Simulation Results${o.months>1?` (${o.months} months)`:""}</h2>
      <div class="sim-res-tabs">${u}</div>
      <div class="sim-res-panels">${x}</div>
      <div class="sim-apply-actions">
        ${B?`<button class="btn-primary" id="sim-apply-btn" disabled style="background:var(--success);cursor:default;">✅ All ${o.months} Months Applied</button>
             <button class="btn-secondary btn-sm" id="sim-goto-town-btn">🏰 Go to Town View</button>`:`<button class="btn-primary" id="sim-apply-btn">✅ Apply All Changes</button>
             <button class="btn-danger" id="sim-reject-btn">❌ Reject & Discard</button>`}
      </div>
    `,v.style.display="block",v.querySelectorAll(".sim-res-tab").forEach(m=>{m.addEventListener("click",()=>{var S;v.querySelectorAll(".sim-res-tab").forEach(T=>T.classList.remove("active")),v.querySelectorAll(".sim-res-panel").forEach(T=>T.classList.remove("active")),m.classList.add("active"),(S=v.querySelector(`.sim-res-panel[data-sim-panel="${m.dataset.simTab}"]`))==null||S.classList.add("active")})}),v.scrollIntoView({behavior:"smooth"}),($=v.querySelector("#sim-goto-town-btn"))==null||$.addEventListener("click",()=>{ke("town/"+t.currentTownId)}),B?(async()=>{try{const S=((await Le(t.currentTownId)).characters||[]).map(xe);t.currentTown&&(t.currentTown.characters=S),me({selectedCharId:null})}catch{}})():(v.querySelector("#sim-apply-btn").addEventListener("click",async()=>{var S;const m=v.querySelector("#sim-apply-btn");m.disabled=!0,m.textContent="⏳ Applying...",n("Applying simulation changes...","info");try{const T=await Re(t.currentTownId,g,p.new_history_entry||null,s);T.debug_info&&console.log("Apply debug_info:",T.debug_info);const q=T.applied||{},H=[];if(q.new_characters&&H.push(`${q.new_characters} characters added`),q.deaths&&H.push(`${q.deaths} deaths`),q.relationships&&H.push(`${q.relationships} relationships`),q.xp&&H.push(`${q.xp} XP updates`),q.stats&&H.push(`${q.stats} stat changes`),q.roles&&H.push(`${q.roles} role changes`),q.buildings&&H.push(`${q.buildings} building changes`),q.auto_levelups&&H.push(`${q.auto_levelups} auto level-ups`),q.history&&H.push("history updated"),q.deaths_failed&&q.deaths_failed.length){q.deaths_failed.forEach(ae=>n(`  ⚠️ Death not applied: ${ae}`,"warn"));const K=(g.deaths||[]).length;n(`  ⚠️ ${q.deaths}/${K} deaths actually matched characters in the DB`,"warn")}const W=q.levelup_details||[];if(W.length){W.forEach(oe=>n(`  ⬆️ ${oe.name} (${oe.class||"?"}): Lv ${oe.old_level} → ${oe.new_level}`,"success"));const K=v.querySelector(".sim-res-tabs"),ae=v.querySelector(".sim-res-panels");if(K&&ae){const oe=document.createElement("button");oe.className="sim-res-tab",oe.dataset.simTab="levelups",oe.innerHTML=`⬆️ Level Ups <span class="sim-tab-badge">${W.length}</span>`,K.appendChild(oe);const he=document.createElement("div");he.className="sim-res-panel",he.dataset.simPanel="levelups",he.innerHTML=`<div class="sim-change-list">${W.map(z=>{var pe,L;return`
                <div class="sim-change-item sim-change-xp">
                  <strong>${z.name}</strong>
                  <span class="sim-stat-field">${z.class||""}:</span>
                  <span class="sim-stat-old">Lv ${z.old_level}</span> → <span class="sim-stat-new">Lv ${z.new_level}</span>
                  <span class="sim-reason">XP: ${((L=(pe=z.xp)==null?void 0:pe.toLocaleString)==null?void 0:L.call(pe))||z.xp||"?"}</span>
                </div>`}).join("")}</div>`,ae.appendChild(he),oe.addEventListener("click",()=>{v.querySelectorAll(".sim-res-tab").forEach(z=>z.classList.remove("active")),v.querySelectorAll(".sim-res-panel").forEach(z=>z.classList.remove("active")),oe.classList.add("active"),he.classList.add("active")})}}const D=H.length?H.join(", "):"No changes applied";n(`✅ Applied: ${D}`,"success"),m.textContent="✅ Applied!",m.style.background="var(--success)";try{const ae=((await Le(t.currentTownId)).characters||[]).map(xe);t.currentTown&&(t.currentTown.characters=ae),me({selectedCharId:null}),n(`Refreshed town data: ${ae.length} total characters now`,"success")}catch(K){n(`Warning: Could not refresh town data: ${K.message}`,"warn")}const Y=c.querySelector("#sim-status");Y.innerHTML=`<span style="color:var(--success)">✅ ${D}</span><br>
            <button class="btn-secondary btn-sm" id="sim-goto-town" style="margin-top:0.5rem;">🏰 Go to Town View</button>`,(S=c.querySelector("#sim-goto-town"))==null||S.addEventListener("click",()=>{ke("town/"+t.currentTownId)})}catch(T){n(`❌ Apply failed: ${T.message}`,"error"),m.disabled=!1,m.textContent="✅ Apply All Changes",c.querySelector("#sim-status").textContent=`❌ ${T.message}`,c.querySelector("#sim-status").style.color="var(--error)"}}),(E=v.querySelector("#sim-reject-btn"))==null||E.addEventListener("click",()=>{v.style.display="none",a=null,c.querySelector("#sim-status").textContent="🗑️ Results discarded.",c.querySelector("#sim-status").style.color="var(--text-muted)"}))}}const vs=6;function Fr(e){e.innerHTML=`
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
            <label>📅 Days (Partial Month)</label>
            <div style="display:flex;align-items:center;gap:0.5rem;">
              <input type="number" id="ws-days" class="form-input" min="0" max="30" value="0" style="width:70px;text-align:center;" title="Days to simulate within each month (0 = full month)">
              <span style="font-size:0.75rem;color:var(--text-muted)">0 = full month</span>
            </div>
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
          <small class="settings-hint" style="margin-top:0.25rem;display:block;">📜 Campaign rules are loaded automatically from <a href="/dev/settings" style="color:var(--accent)">⚙️ Settings</a>.</small>
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
  `;let t=1;e.querySelector("#ws-back-btn").addEventListener("click",()=>ke("dashboard")),s(e);async function s(l){var i;try{const[r,d,c]=await Promise.all([St(),tt().catch(()=>null),wt().catch(()=>({}))]),o=Array.isArray(r)?r:r.towns||[],p=l.querySelector("#ws-months-group"),g=d==null?void 0:d.calendar,v=(g==null?void 0:g.months)||[];let b="";for(let w=1;w<=12;w++){const A=v[w-1]?` title="${v[w-1].name||v[w-1]}"`:"";b+=`<button class="sim-month-btn${w===1?" active":""}" data-months="${w}"${A}>${w}</button>`}p.innerHTML=b,p.querySelectorAll(".sim-month-btn").forEach(w=>{w.addEventListener("click",()=>{p.querySelectorAll(".sim-month-btn").forEach(A=>A.classList.remove("active")),w.classList.add("active"),t=parseInt(w.dataset.months)||1})});const y=l.querySelector("#ws-town-list");if(o.length===0){y.innerHTML=`<div class="dash-card" style="text-align:center;padding:2rem;">
          <h3 style="color:var(--text-muted)">No Towns</h3>
          <p>Create towns from the <a href="/dev/dashboard">Dashboard</a> first.</p>
        </div>`;return}const h=o.map(w=>Le(w.id).catch(()=>({characters:[]}))),f=await Promise.all(h);y.innerHTML=`
        <div class="dash-card" style="padding:1rem;">
          <h3 style="margin-bottom:0.75rem;">🏰 Towns to Simulate</h3>
          <div style="margin-bottom:0.5rem;">
            <label style="cursor:pointer;font-size:0.8rem;">
              <input type="checkbox" id="ws-select-all" checked> Select All
            </label>
          </div>
          <div class="ws-town-grid">
            ${o.map((w,A)=>{var P;const _=(((P=f[A])==null?void 0:P.characters)||[]).filter(F=>(F.status||"Alive")!=="Deceased").length;return`
                <div class="ws-town-card" data-town-id="${w.id}">
                  <label class="ws-town-check">
                    <input type="checkbox" class="ws-town-cb" data-town-id="${w.id}" checked>
                    <div class="ws-town-info">
                      <span class="ws-town-name">${w.name}</span>
                      <span class="ws-town-pop">${_} residents</span>
                    </div>
                  </label>
                  <div class="ws-town-status" id="ws-status-${w.id}"></div>
                  <textarea class="form-input ws-town-instructions" data-town-id="${w.id}" rows="2"
                    placeholder="Instructions for ${w.name} only..."
                    style="margin-top:0.4rem;font-size:0.75rem;resize:vertical;min-height:2.4rem;"></textarea>
                </div>
              `}).join("")}
          </div>
        </div>
      `,(i=l.querySelector("#ws-select-all"))==null||i.addEventListener("change",w=>{l.querySelectorAll(".ws-town-cb").forEach(A=>{A.checked=w.target.checked})}),l.querySelector("#ws-run-btn").addEventListener("click",()=>{a(l,o,c,f,d)})}catch(r){l.querySelector("#ws-town-list").innerHTML=`<div class="dash-card" style="padding:1rem;color:var(--error);">Error loading data: ${r.message}</div>`}}async function a(l,i,r,d,c){var se,ee,ie,Q,ve,de,ge,Se,fe,Be;const o=new Set;l.querySelectorAll(".ws-town-cb:checked").forEach(O=>{o.add(parseInt(O.dataset.townId))});const p=i.filter(O=>o.has(O.id));if(p.length===0){alert("Select at least one town to simulate.");return}const g=((ee=(se=l.querySelector("#ws-instructions"))==null?void 0:se.value)==null?void 0:ee.trim())||"",v=Math.max(0,Math.min(50,parseInt((ie=l.querySelector("#ws-intake-count"))==null?void 0:ie.value)||0)),b=Math.max(0,Math.min(100,parseInt((Q=l.querySelector("#ws-days"))==null?void 0:Q.value)||0)),y={};l.querySelectorAll(".ws-town-instructions").forEach(O=>{const G=parseInt(O.dataset.townId),le=O.value.trim();le&&(y[G]=le)}),i.map(O=>O.name.toLowerCase());function h(O){let G=[];if(g){const le=g.toLowerCase(),ye=i.filter(_e=>le.includes(_e.name.toLowerCase()));(ye.length===0||ye.some(_e=>_e.id===O.id))&&G.push(g)}return y[O.id]&&G.push(y[O.id]),G.join(`

`)}const f=l.querySelector("#ws-run-btn"),w=l.querySelector("#ws-progress"),A=l.querySelector("#ws-progress-fill"),k=l.querySelector("#ws-progress-text"),_=l.querySelector("#ws-results");f.disabled=!0,f.textContent="⏳ Simulating...",w.style.display="",_.style.display="none",_.innerHTML="";let P=document.createElement("div");P.className="sim-log-overlay",P.innerHTML=`
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
    `,document.body.appendChild(P);const F=document.getElementById("sim-log-body"),I=document.getElementById("sim-log-fill"),M=document.getElementById("sim-log-pct"),C=document.getElementById("sim-log-close-btn");function u(O,G,le=""){const ye=document.createElement("div");ye.className="sim-log-entry"+(le?` ${le}`:""),ye.innerHTML=`<span class="sim-log-icon">${O}</span><span class="sim-log-text">${G}</span>`,F.appendChild(ye),F.scrollTop=F.scrollHeight}function x(O){I.style.width=`${O}%`,M.textContent=`${Math.round(O)}%`}u("🚀",`Starting simulation: <strong>${p.length} town${p.length>1?"s":""}</strong> × <strong>${t} month${t>1?"s":""}</strong>`);const B=t*p.length+t;let $=0;const E=[],m=[],S=[],T=[],q=[];let H=0;const W=[],D={};p.forEach(O=>{D[O.id]={arrivals:0,births:0,deaths:0}});const Y={};p.forEach(O=>{Y[O.id]=[]});const K={},ae=c==null?void 0:c.calendar,oe=(ae==null?void 0:ae.month_names)||[],he=((ae==null?void 0:ae.current_month)||1)-1;if(v>0)for(const O of p){const G=l.querySelector(`#ws-status-${O.id}`);try{k.textContent=`Intake: Adding ${v} characters to ${O.name}...`,G&&(G.innerHTML='<span style="color:var(--warning);">⏳ Intake...</span>'),u("👥",`Adding <strong>${v}</strong> characters to <strong>${O.name}</strong>...`);const le=await At(O.id,0,r,h(O),v);if(le.simulation){const ye=le.simulation.changes||{};await Re(O.id,ye,null,0);const _e=(ye.new_characters||[]).map($e=>({...$e,town:O.name,townId:O.id,month:0}));S.push(..._e),D[O.id].arrivals+=_e.length,G&&(G.innerHTML=`<span style="color:var(--success);">✅ +${_e.length} intake</span>`),u("✅",`<strong>${O.name}</strong>: +${_e.length} new residents`,"sim-log-success")}}catch(le){K[O.id]=(K[O.id]||"")+` Intake: ${le.message}`,G&&(G.innerHTML='<span style="color:var(--error);">❌ Intake failed</span>'),u("❌",`<strong>${O.name}</strong> intake failed: ${le.message}`,"sim-log-error")}await new Promise(le=>setTimeout(le,1500))}const z={};if(t>1)for(const O of p){const G=l.querySelector(`#ws-status-${O.id}`);try{k.textContent=`Planning ${O.name} (${t} months)...`,G&&(G.innerHTML='<span style="color:var(--warning);">📋 Planning...</span>'),u("📋",`Planning <strong>${O.name}</strong> (${t} months)...`);const le=await Pi(O.id,t,r,h(O));le.plan&&(z[O.id]=le.plan,console.log(`[WorldSim] Plan for ${O.name}:`,JSON.stringify(le.plan).slice(0,800)),G&&(G.innerHTML='<span style="color:var(--success);">📋 Planned</span>'))}catch(le){console.warn(`[WorldSim] Planning failed for ${O.name}:`,le.message)}await new Promise(le=>setTimeout(le,1e3))}for(let O=1;O<=t;O++){for(const G of p){const le=l.querySelector(`#ws-status-${G.id}`);let ye=h(G);const _e=z[G.id];if(_e){const $e=(_e.plan||[]).find(we=>we.month===O),Ae=(_e.arrival_details||[]).filter(we=>we.month===O),Ee=(_e.death_details||[]).filter(we=>we.month===O);let be=`[SIMULATION PLAN for month ${O}/${t}]
`;_e.summary&&(be+=`Overview: ${_e.summary}
`),$e&&(be+=`This month's plan: ${$e.events||"Normal activity"}
`,$e.arrivals>0&&(be+=`PLANNED ARRIVALS this month: ${$e.arrivals} new character(s). You MUST generate ${$e.arrivals} new_characters.
`),$e.deaths>0&&(be+=`PLANNED DEATHS this month: ${$e.deaths}. You MUST add death(s) to the changes.
`),$e.births>0&&(be+=`PLANNED BIRTHS this month: ${$e.births}.
`)),Ae.length>0&&(be+=`Arrival details: ${Ae.map(we=>we.description).join("; ")}
`),Ee.length>0&&(be+=`Death details: ${Ee.map(we=>`${we.name}: ${we.reason}`).join("; ")}
`),be+=`[END PLAN]

`,ye=be+ye}try{k.textContent=`Month ${O}/${t} — Simulating ${G.name}...`,A.style.width=`${$/B*100}%`,x($/B*100),le&&(le.innerHTML=`<span style="color:var(--warning);">⏳ Month ${O}...</span>`),u("⏳",`Month <strong>${O}/${t}</strong> — Simulating <strong>${G.name}</strong>...`);const $e=await At(G.id,1,r,ye,0,b);if($e.simulation){console.log(`[WorldSim] ${G.name} Month ${O}:`,JSON.stringify($e.simulation).slice(0,500));const Ae=$e.simulation,Ee=Ae.changes||{},be=Ee.new_characters||Ae.new_characters||[],we=Ee.deaths||Ae.deaths||[],Ue=Ee.births||Ae.births||[],Te=Ee.events||Ae.events||[],at=b>0?0:1,ca=b>0?b:0;await Re(G.id,Ee,Ae.new_history_entry||null,at,ca).then(ce=>{var ct,Ce,Ft,Xa,Va,Ka,Ya;if((ct=ce==null?void 0:ce.applied)!=null&&ct.auto_levelups&&(H+=ce.applied.auto_levelups,D[G.id].levelups=(D[G.id].levelups||0)+ce.applied.auto_levelups),(Ft=(Ce=ce==null?void 0:ce.applied)==null?void 0:Ce.levelup_details)!=null&&Ft.length&&W.push(...ce.applied.levelup_details.map(da=>({...da,town:G.name,townId:G.id,month:O}))),ce!=null&&ce.applied){const da=ce.applied.deaths||0,ai=ce.applied.new_characters||0;D[G.id]._serverDeaths=(D[G.id]._serverDeaths||0)+da,D[G.id]._serverArrivals=(D[G.id]._serverArrivals||0)+ai,(Xa=ce.applied.death_details)!=null&&Xa.length&&ce.applied.death_details.forEach(dt=>{u("💀",`<strong>${G.name}</strong>: ${dt.name} — ${dt.reason}`,"sim-log-death")}),(Va=ce.applied.deaths_failed)!=null&&Va.length&&ce.applied.deaths_failed.forEach(dt=>{u("⚠️",`<strong>${G.name}</strong>: Death not applied — ${dt}`,"sim-log-error")}),(Ka=ce.applied.arrivals_failed)!=null&&Ka.length&&ce.applied.arrivals_failed.forEach(dt=>{u("⚠️",`<strong>${G.name}</strong>: Arrival not applied — ${dt}`,"sim-log-error")})}ce!=null&&ce.debug_info&&console.log(`[WorldSim] Apply debug for ${G.name}:`,JSON.stringify(ce.debug_info)),(Ya=ce==null?void 0:ce.applied)!=null&&Ya.calendar&&u("📅",`<strong>${G.name}</strong>: ${ce.applied.calendar}`)});const Nt=Ue.map(ce=>({...ce,town:G.name,townId:G.id,month:O})),Fe=we.map(ce=>({...ce,town:G.name,townId:G.id,month:O})),_t=be.map(ce=>({...ce,town:G.name,townId:G.id,month:O})),Bt=Te.map(ce=>({...ce,town:G.name,townId:G.id,month:O}));if(E.push(...Nt),m.push(...Fe),S.push(..._t),T.push(...Bt),D[G.id].arrivals+=_t.length,D[G.id].births+=Nt.length,D[G.id].deaths+=Fe.length,Y[G.id].push(((ve=$e.simulation.new_history_entry)==null?void 0:ve.content)||""),le){const ce=D[G.id],ct=ce.levelups?` ⬆${ce.levelups}`:"";le.innerHTML=`<span style="color:var(--success);">✅ ${O}/${t}</span>
                <span style="font-size:0.7rem;color:var(--text-muted);margin-left:0.5rem;">
                  +${ce.arrivals} 👤  ${ce.births} 👶  ${ce.deaths} 💀${ct}
                </span>`}}else le&&(le.innerHTML=`<span style="color:var(--error);">⚠️ Month ${O} no data</span>`),u("⚠️",`<strong>${G.name}</strong> month ${O}: No simulation data returned`)}catch($e){let Ae=!1;const Ee=2,be=[5e3,1e4];for(let we=1;we<=Ee&&!Ae;we++){const Ue=be[we-1]||1e4;le&&(le.innerHTML=`<span style="color:var(--warning);">🔄 Retry ${we}/${Ee} M${O}...</span>`),u("🔄",`<strong>${G.name}</strong> M${O}: Retry ${we}/${Ee} after error: ${$e.message.slice(0,60)}...`),await new Promise(Te=>setTimeout(Te,Ue));try{const Te=await At(G.id,1,r,ye,0,b);if(Te.simulation){const at=Te.simulation.changes||{},ca=b>0?0:1,Nt=b>0?b:0,Fe=await Re(G.id,at,Te.simulation.new_history_entry||null,ca,Nt),_t=(at.births||Te.simulation.births||[]).map(Ce=>({...Ce,town:G.name,townId:G.id,month:O})),Bt=(at.deaths||Te.simulation.deaths||[]).map(Ce=>({...Ce,town:G.name,townId:G.id,month:O})),ce=(at.new_characters||Te.simulation.new_characters||[]).map(Ce=>({...Ce,town:G.name,townId:G.id,month:O})),ct=(at.events||Te.simulation.events||[]).map(Ce=>({...Ce,town:G.name,townId:G.id,month:O}));if(E.push(..._t),m.push(...Bt),S.push(...ce),T.push(...ct),D[G.id].arrivals+=ce.length,D[G.id].births+=_t.length,D[G.id].deaths+=Bt.length,Y[G.id].push(((de=Te.simulation.new_history_entry)==null?void 0:de.content)||""),(ge=Fe==null?void 0:Fe.applied)!=null&&ge.auto_levelups&&(H+=Fe.applied.auto_levelups,D[G.id].levelups=(D[G.id].levelups||0)+Fe.applied.auto_levelups),(fe=(Se=Fe==null?void 0:Fe.applied)==null?void 0:Se.levelup_details)!=null&&fe.length&&W.push(...Fe.applied.levelup_details.map(Ce=>({...Ce,town:G.name,townId:G.id,month:O}))),le){const Ce=D[G.id],Ft=Ce.levelups?` ⬆${Ce.levelups}`:"";le.innerHTML=`<span style="color:var(--success);">✅ ${O}/${t}</span> <span style="font-size:0.7rem;color:var(--text-muted);margin-left:0.5rem;">+${Ce.arrivals} 👤  ${Ce.births} 👶  ${Ce.deaths} 💀${Ft}</span>`}u("✅",`<strong>${G.name}</strong> M${O}: Retry ${we} succeeded!`,"sim-log-success"),Ae=!0}}catch(Te){we===Ee&&(K[G.id]=(K[G.id]||"")+` Month ${O}: ${Te.message}`,le&&(le.innerHTML=`<span style="color:var(--error);">❌ M${O}: Failed after ${Ee} retries</span>`),u("❌",`<strong>${G.name}</strong> M${O}: Failed after ${Ee} retries — ${Te.message.slice(0,60)}`,"sim-log-error"))}}}await new Promise($e=>setTimeout($e,1500)),$++}if(k.textContent=`Month ${O}/${t} — Checking movement...`,p.length>=2)try{const G=await Promise.all(p.map(le=>Le(le.id).catch(()=>({characters:[]}))));for(let le=0;le<p.length;le++){const ye=p[le],_e=(((Be=G[le])==null?void 0:Be.characters)||[]).filter(be=>(be.status||"Alive")==="Alive"),$e=["mayor","chieftain","chief","lord","lady","captain of the guard","town leader"],Ae=_e.filter(be=>parseInt(be.months_in_town||0)>=vs).filter(be=>{const we=(be.role||"").toLowerCase().trim();return!$e.some(Ue=>we.includes(Ue))});if(Ae.length===0)continue;const Ee=Ae.filter(()=>Math.random()<.2).slice(0,2);for(const be of Ee){const we=p.filter(Te=>Te.id!==ye.id),Ue=we[Math.floor(Math.random()*we.length)];try{await vn(be.id,ye.id,Ue.id),q.push({name:be.name,class:be.class,level:be.level,fromTown:ye.name,fromTownId:ye.id,toTown:Ue.name,toTownId:Ue.id,monthsLived:parseInt(be.months_in_town||0),month:O}),u("🚶",`<strong>${be.name}</strong> moved from ${ye.name} → ${Ue.name}`)}catch{}}}}catch{}$++}const pe=p.map(O=>{const G=D[O.id],le=(Y[O.id]||[]).map((_e,$e)=>({month:$e+1,content:_e||""})).filter(_e=>_e.content),ye=K[O.id];return{town:O.name,townId:O.id,ok:!ye,births:G.births,deaths:G.deaths,arrivals:G.arrivals,events:T.filter(_e=>_e.townId===O.id).length,narrativeEntries:le,error:ye||""}});A.style.width="100%",k.textContent=`✅ World simulation complete! (${p.length} towns × ${t} months)`,f.disabled=!1,f.textContent="🌍 Run World Simulation",x(100);let L=0,J=0;Object.values(D).forEach(O=>{L+=O._serverArrivals||0,J+=O._serverDeaths||0});const te=L||S.length,R=E.length,j=J||m.length,X=T.length,V=q.length;u("🏁",`<strong>Simulation complete!</strong> Arrivals: ${te} | Births: ${R} | Deaths: ${j} | Events: ${X} | Moves: ${V}`,"sim-log-success"),Object.keys(K).length>0&&u("⚠️",`${Object.keys(K).length} town(s) had errors — check results below.`),C.style.display="",C.addEventListener("click",()=>{P.remove()}),P.addEventListener("click",O=>{O.target===P&&P.remove()});try{const O=await tt();O!=null&&O.calendar&&(me({calendar:O.calendar}),Ai(O.calendar))}catch{}n(_,pe,t,E,m,S,T,q,oe,he,H,W)}function n(l,i,r,d,c,o,p,g,v=[],b=0,y=0,h=[]){l.style.display="";const f=i.filter(C=>C.ok),w=i.filter(C=>!C.ok),A=d.length,k=c.length,_=o.length,P=p.length;l.innerHTML=`
      <div class="dash-card" style="padding:1.5rem;margin-top:1rem;">
        <h2 style="color:var(--accent);margin-bottom:1rem;">🌍 World Simulation Summary — ${r} Month${r>1?"s":""}</h2>

        <div class="stats-cards" style="margin-bottom:1rem;">
          <div class="stat-card"><div class="stat-card-value">${f.length}</div><div class="stat-card-label">Towns</div></div>
          <div class="stat-card"><div class="stat-card-value">${_}</div><div class="stat-card-label">Arrivals</div></div>
          <div class="stat-card"><div class="stat-card-value">${A}</div><div class="stat-card-label">Births</div></div>
          <div class="stat-card stat-card-muted"><div class="stat-card-value">${k}</div><div class="stat-card-label">Deaths</div></div>
          <div class="stat-card"><div class="stat-card-value">${P}</div><div class="stat-card-label">Events</div></div>
          <div class="stat-card"><div class="stat-card-value">${g.length}</div><div class="stat-card-label">Moves</div></div>
          ${y>0?`<div class="stat-card" style="border-color:var(--success);"><div class="stat-card-value" style="color:var(--success);">${y}</div><div class="stat-card-label">⬆️ Level Ups</div></div>`:""}
        </div>

        ${w.length?`
          <div style="margin-bottom:1rem;padding:0.75rem;background:rgba(224,85,85,0.1);border-radius:8px;">
            <strong style="color:var(--error);">⚠️ ${w.length} town(s) failed:</strong>
            ${w.map(C=>`<div style="margin-top:0.25rem;font-size:0.8rem;">${C.town}: ${C.error}</div>`).join("")}
          </div>
        `:""}

        <!-- Tabs -->
        <div class="detail-tabs" id="ws-result-tabs">
          <button class="detail-tab active" data-tab="narratives">📖 Narratives</button>
          <button class="detail-tab" data-tab="arrivals">👤 Arrivals (${_})</button>
          <button class="detail-tab" data-tab="births">👶 Births (${A})</button>
          <button class="detail-tab" data-tab="deaths">💀 Deaths (${k})</button>
          <button class="detail-tab" data-tab="events">📜 Events (${P})</button>
          ${h.length?`<button class="detail-tab" data-tab="levelups">⬆️ Level Ups (${h.length})</button>`:""}
          <button class="detail-tab" data-tab="movement">🚶 Movement (${g.length})</button>
        </div>

        <!-- Tab Content: Narratives -->
        <div class="detail-tab-content active" id="ws-tab-narratives">
          <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem;">
            <label style="font-size:0.75rem;color:var(--text-muted);font-weight:600;">MONTH</label>
            <select class="form-input" id="ws-narrative-month-filter" style="width:auto;min-width:120px;">
              <option value="all">All Months</option>
              ${Array.from({length:r},(C,u)=>{const x=(b+u)%(v.length||12),B=v[x]||`Month ${u+1}`,$=typeof B=="object"?B.name:B;return`<option value="${u+1}">${$}</option>`}).join("")}
            </select>
          </div>
          <div id="ws-narrative-list"></div>
        </div>

        <!-- Tab Content: Arrivals -->
        <div class="detail-tab-content" id="ws-tab-arrivals">
          ${o.length?`
            <table class="srd-table srd-table-sm" style="margin-top:0.5rem;">
              <thead><tr><th>Name</th><th>Race</th><th>Class</th><th>Town</th></tr></thead>
              <tbody>
                ${o.map(C=>`<tr>
                  <td style="font-weight:600;">${C.name||"Unknown"}</td>
                  <td>${C.race||"—"}</td>
                  <td>${C.class||"—"}</td>
                  <td style="color:var(--accent);">${C.town}</td>
                </tr>`).join("")}
              </tbody>
            </table>
          `:'<p class="muted" style="padding:1rem;">No arrivals this period.</p>'}
        </div>

        <!-- Tab Content: Births -->
        <div class="detail-tab-content" id="ws-tab-births">
          ${d.length?`
            <table class="srd-table srd-table-sm" style="margin-top:0.5rem;">
              <thead><tr><th>Name</th><th>Parents</th><th>Town</th></tr></thead>
              <tbody>
                ${d.map(C=>`<tr>
                  <td style="font-weight:600;">${C.child_name||C.name||"Unknown"}</td>
                  <td>${C.parents||C.parent_names||"—"}</td>
                  <td style="color:var(--accent);">${C.town}</td>
                </tr>`).join("")}
              </tbody>
            </table>
          `:'<p class="muted" style="padding:1rem;">No births this period.</p>'}
        </div>

        <!-- Tab Content: Deaths -->
        <div class="detail-tab-content" id="ws-tab-deaths">
          ${c.length?`
            <table class="srd-table srd-table-sm" style="margin-top:0.5rem;">
              <thead><tr><th>Name</th><th>Cause</th><th>Town</th></tr></thead>
              <tbody>
                ${c.map(C=>`<tr>
                  <td style="font-weight:600;">${C.name||"Unknown"}</td>
                  <td>${C.cause||C.reason||"—"}</td>
                  <td style="color:var(--accent);">${C.town}</td>
                </tr>`).join("")}
              </tbody>
            </table>
          `:'<p class="muted" style="padding:1rem;">No deaths this period.</p>'}
        </div>

        <!-- Tab Content: Events -->
        <div class="detail-tab-content" id="ws-tab-events">
          ${p.length?p.map(C=>`
            <div class="ws-narrative-card">
              <div class="ws-narrative-header">
                <span style="font-weight:600;color:var(--text-primary);">${C.title||C.type||"Event"}</span>
                <span class="ws-narrative-stats">${C.town}</span>
              </div>
              ${C.description?`<div class="ws-narrative-body">${C.description}</div>`:""}
            </div>
          `).join(""):'<p class="muted" style="padding:1rem;">No events this period.</p>'}
        </div>

        <!-- Tab Content: Level Ups -->
        ${h.length?`
        <div class="detail-tab-content" id="ws-tab-levelups">
          <table class="srd-table srd-table-sm" style="margin-top:0.5rem;">
            <thead><tr><th>Name</th><th>Class</th><th>Level</th><th>XP</th><th>Town</th></tr></thead>
            <tbody>
              ${h.map(C=>{var u;return`<tr>
                <td style="font-weight:600;">${C.name}</td>
                <td>${C.class||"—"}</td>
                <td><span style="color:var(--text-muted);">${C.old_level}</span> → <span style="color:var(--success);font-weight:700;">${C.new_level}</span></td>
                <td style="color:var(--text-secondary);">${((u=C.xp)==null?void 0:u.toLocaleString())||"—"}</td>
                <td style="color:var(--accent);">${C.town}</td>
              </tr>`}).join("")}
            </tbody>
          </table>
        </div>
        `:""}

        <!-- Tab Content: Movement -->
        <div class="detail-tab-content" id="ws-tab-movement">
          ${g.length?`
            <table class="srd-table srd-table-sm" style="margin-top:0.5rem;">
              <thead><tr><th>Name</th><th>Class</th><th>From</th><th>To</th><th>Months Lived</th></tr></thead>
              <tbody>
                ${g.map(C=>`<tr>
                  <td style="font-weight:600;">${C.name}</td>
                  <td>${C.class} ${C.level}</td>
                  <td>${C.fromTown}</td>
                  <td style="color:var(--accent);">→ ${C.toTown}</td>
                  <td style="text-align:center;">${C.monthsLived}</td>
                </tr>`).join("")}
              </tbody>
            </table>
          `:`<p class="muted" style="padding:1rem;">No character movement this period. Characters must live in a town for at least ${vs} months before they may relocate.</p>`}
        </div>
      </div>
    `,l.querySelectorAll(".detail-tab").forEach(C=>{C.addEventListener("click",()=>{var u;l.querySelectorAll(".detail-tab").forEach(x=>x.classList.remove("active")),l.querySelectorAll(".detail-tab-content").forEach(x=>x.classList.remove("active")),C.classList.add("active"),(u=l.querySelector(`#ws-tab-${C.dataset.tab}`))==null||u.classList.add("active")})});const F=l.querySelector("#ws-narrative-list"),I=l.querySelector("#ws-narrative-month-filter");function M(){const C=I.value;if(!f.length){F.innerHTML='<p class="muted" style="padding:1rem;">No results.</p>';return}let u="";for(const x of f){const B=C==="all"?x.narrativeEntries:x.narrativeEntries.filter($=>String($.month)===C);if(B.length!==0)for(const $ of B){const E=(b+$.month-1)%(v.length||12),m=v[E]||`Month ${$.month}`,S=typeof m=="object"?m.name:m;u+=`
            <div class="ws-narrative-card">
              <div class="ws-narrative-header">
                <span class="ws-narrative-town" style="cursor:pointer;" data-town-id="${x.townId}">${x.town}</span>
                <span class="ws-narrative-stats">${S}</span>
              </div>
              <div class="ws-narrative-body">${$.content}</div>
            </div>
          `}}F.innerHTML=u||'<p class="muted" style="padding:1rem;">No narratives for this month.</p>',F.querySelectorAll("[data-town-id]").forEach(x=>{x.addEventListener("click",()=>{const B=parseInt(x.dataset.townId);me({currentTownId:B}),ke("town/"+B)})})}M(),I.addEventListener("change",M),l.querySelectorAll("[data-town-id]").forEach(C=>{C.addEventListener("click",()=>{const u=parseInt(C.dataset.townId);me({currentTownId:u}),ke("town/"+u)})})}}const Or="/".replace(/\/$/,"")+"/api.php",hs={completed:{icon:"✅",label:"Completed",color:"var(--success)"},under_construction:{icon:"🏗️",label:"Building...",color:"var(--warning)"},planned:{icon:"📋",label:"Planned",color:"var(--text-muted)"},damaged:{icon:"⚠️",label:"Damaged",color:"#e05555"},destroyed:{icon:"💥",label:"Destroyed",color:"#888"}};async function jr(e){const t=localStorage.getItem("ws_token")||"";return(await(await fetch(`${Or}?action=get_buildings&town_id=${e}`,{headers:{Authorization:`Bearer ${t}`}})).json()).buildings||[]}function Gr(e,t){const s=ne(),a=t.id?parseInt(t.id):s.currentTownId;if(!a){e.innerHTML='<div class="view-empty"><h2>No Town Selected</h2><p>Select a town from the <a href="/dev/dashboard">Dashboard</a> first.</p></div>';return}e.innerHTML=`
    <div class="view-town-stats">
      <header class="view-header">
        <h1>Town Statistics</h1>
        <div class="view-header-right">
          <button class="btn-secondary btn-sm" id="stats-back-btn">Back to Town</button>
        </div>
      </header>
      <div class="stats-loading">Loading town data...</div>
    </div>`,e.querySelector("#stats-back-btn").addEventListener("click",()=>{ke("town/"+a)}),zr(e,a)}async function zr(e,t){try{const[s,a,n,l]=await Promise.all([St(),Le(t),dn(t).catch(()=>({entries:[]})),jr(t)]),r=(Array.isArray(s)?s:s.towns||[]).find(c=>c.id===t)||{name:"Unknown"},d=(a.characters||[]).map(xe);Wr(e,r,d,l)}catch(s){const a=e.querySelector(".stats-loading");a&&(a.innerHTML='<span style="color:var(--error)">Failed to load: '+s.message+"</span>")}}function Wr(e,t,s,a){const n=s.filter(C=>C.status==="Alive"),l=s.filter(C=>C.status!=="Alive"),i=n.filter(C=>C.gender==="M"),r=n.filter(C=>C.gender==="F"),d={};n.forEach(C=>{d[C.race||"Unknown"]=(d[C.race||"Unknown"]||0)+1});const c=Object.entries(d).sort((C,u)=>u[1]-C[1]),o={};n.forEach(C=>{o[C.class||"Unknown"]=(o[C.class||"Unknown"]||0)+1});const p=Object.entries(o).sort((C,u)=>u[1]-C[1]),g={"Children (0-15)":0,"Young (16-25)":0,"Adult (26-45)":0,"Middle-Aged (46-65)":0,"Elder (66+)":0};n.forEach(C=>{const u=C.age||0;u<=15?g["Children (0-15)"]++:u<=25?g["Young (16-25)"]++:u<=45?g["Adult (26-45)"]++:u<=65?g["Middle-Aged (46-65)"]++:g["Elder (66+)"]++});const v={};n.forEach(C=>{v[C.role||"Unassigned"]=(v[C.role||"Unassigned"]||0)+1});const b=Object.entries(v).sort((C,u)=>u[1]-C[1]);let y=0;n.forEach(C=>{y+=parseInt(C.level)||0});const h=n.length?(y/n.length).toFixed(1):"0",f=n.filter(C=>C.spouse&&C.spouse!=="None"),w=a.filter(C=>C.status==="completed"),A=a.filter(C=>C.status==="under_construction"),k=a.filter(C=>!["completed","under_construction"].includes(C.status));function _(C,u,x,B){const $=x?(u/x*100).toFixed(1):0;return'<div class="stats-bar-row"><span class="stats-bar-label">'+C+'</span><div class="stats-bar-track"><div class="stats-bar-fill '+(B||"")+'" style="width:'+$+'%"></div></div><span class="stats-bar-value">'+u+" ("+$+"%)</span></div>"}function P(C){const u=hs[C.status]||hs.planned;let x="";if(C.status==="under_construction"){const B=C.build_time>0?Math.round(C.build_progress/C.build_time*100):0;x=`<div class="building-progress-wrap">
                <div class="building-progress-bar"><div class="building-progress-fill" style="width:${B}%"></div></div>
                <span class="building-progress-text">${C.build_progress}/${C.build_time} months (${B}%)</span>
            </div>`}return`<div class="stats-building-card building-status-${C.status}">
            <div class="stats-building-header">
                <span class="stats-building-name">${u.icon} ${C.name}</span>
                <span class="stats-building-status" style="color:${u.color}">${u.label}</span>
            </div>
            ${C.description?`<div class="building-desc">${C.description}</div>`:""}
            ${x}
        </div>`}const F=e.querySelector(".view-town-stats"),I=F.querySelector(".stats-loading");I&&I.remove();const M=document.createElement("div");M.className="stats-content",M.innerHTML='<div class="stats-banner"><h2>'+t.name+'</h2></div><div class="stats-cards"><div class="stat-card"><div class="stat-card-value">'+n.length+'</div><div class="stat-card-label">Living Residents</div></div><div class="stat-card stat-card-muted"><div class="stat-card-value">'+l.length+'</div><div class="stat-card-label">Deceased</div></div><div class="stat-card"><div class="stat-card-value">'+i.length+" / "+r.length+'</div><div class="stat-card-label">Male / Female</div></div><div class="stat-card"><div class="stat-card-value">'+h+'</div><div class="stat-card-label">Avg Level</div></div><div class="stat-card"><div class="stat-card-value">'+f.length+'</div><div class="stat-card-label">Married</div></div><div class="stat-card"><div class="stat-card-value">'+w.length+'</div><div class="stat-card-label">Buildings</div></div>'+(A.length?'<div class="stat-card stat-card-warn"><div class="stat-card-value">'+A.length+'</div><div class="stat-card-label">Under Construction</div></div>':"")+'</div><div class="stats-grid"><div class="stats-panel"><h3>Race Distribution</h3><div class="stats-bar-list">'+c.map(([C,u])=>_(C,u,n.length,"")).join("")+'</div></div><div class="stats-panel"><h3>Class Distribution</h3><div class="stats-bar-list">'+p.map(([C,u])=>_(C,u,n.length,"stats-bar-fill-class")).join("")+'</div></div><div class="stats-panel"><h3>Age Demographics</h3><div class="stats-bar-list">'+Object.entries(g).map(([C,u])=>_(C,u,n.length,"stats-bar-fill-age")).join("")+'</div></div><div class="stats-panel"><h3>Roles</h3><div class="stats-bar-list stats-bar-scrollable">'+b.map(([C,u])=>_(C,u,n.length,"stats-bar-fill-role")).join("")+'</div></div></div><div class="stats-buildings-section"><h3>🏛️ Buildings & Infrastructure ('+a.length+")</h3>"+(a.length?(A.length?'<h4 class="building-group-title">🏗️ Under Construction</h4><div class="stats-buildings-grid">'+A.map(P).join("")+"</div>":"")+(w.length?'<h4 class="building-group-title">✅ Completed</h4><div class="stats-buildings-grid">'+w.map(P).join("")+"</div>":"")+(k.length?'<h4 class="building-group-title">⚠️ Other</h4><div class="stats-buildings-grid">'+k.map(P).join("")+"</div>":""):`<div class="stats-empty">No buildings yet. Run simulations to develop the town's infrastructure over time.</div>`)+"</div>",F.appendChild(M)}function In(){return N("get_party")}function Pn(e){return N("add_party_member",{method:"POST",body:{character_id:e}})}function Ur(e){return N("remove_party_member",{method:"POST",body:{character_id:e}})}function Xr(){return N("get_encounters")}function Vr(e,t=""){return N("create_encounter",{method:"POST",body:{name:e,description:t}})}function Hn(e){return N(`get_encounter&id=${e}`)}function Kr(e){return N("delete_encounter",{method:"POST",body:{encounter_id:e}})}function Gt(e,t){return N("update_encounter",{method:"POST",body:{encounter_id:e,...t}})}function Yr(e,t){return N("create_encounter_group",{method:"POST",body:{encounter_id:e,name:t}})}function Jr(e,t){return N("rename_encounter_group",{method:"POST",body:{group_id:e,name:t}})}function Qr(e){return N("delete_encounter_group",{method:"POST",body:{group_id:e}})}function gs(e,t,s="enemy",a=null){return N("add_participant",{method:"POST",body:{encounter_id:e,character_id:t,side:s,group_id:a}})}function Zr(e){return N("remove_participant",{method:"POST",body:{participant_id:e}})}function Qe(e,t){return N("update_participant",{method:"POST",body:{participant_id:e,...t}})}function eo(e){return Math.floor(Math.random()*e)+1}function to(e,t){const s=[];for(let a=0;a<e;a++)s.push(eo(t));return s}function Ta(e){const t=e.trim().toLowerCase(),s=t.match(/^(\d+)d(\d+)(?:k(\d+))?(?:\s*([+-])\s*(\d+))?$/);if(!s){const v=parseInt(t);if(!isNaN(v))return{rolls:[v],kept:[v],modifier:0,total:v,expression:t};throw new Error(`Invalid dice expression: "${e}"`)}const a=parseInt(s[1]),n=parseInt(s[2]),l=s[3]?parseInt(s[3]):a,i=s[4]||"+",r=s[5]?parseInt(s[5]):0,d=i==="-"?-r:r,c=to(a,n),p=[...c].sort((v,b)=>b-v).slice(0,l),g=p.reduce((v,b)=>v+b,0)+d;return{rolls:c,kept:p,modifier:d,total:g,expression:t}}function xa(e){return e>=0?`+${e}`:`${e}`}const Pt={blinded:{name:"Blinded",category:"condition",effects:{ac:-2,attackRolls:-2,loseDexToAC:!0,movementHalved:!0},description:"Cannot see. -2 AC, loses Dex bonus to AC. -2 on most Str/Dex skill checks."},dazzled:{name:"Dazzled",category:"condition",effects:{attackRolls:-1,spotChecks:-1,searchChecks:-1},description:"-1 penalty on attack rolls, Search/Spot checks."},deafened:{name:"Deafened",category:"condition",effects:{initiative:-4,spellFailure:20},description:"-4 initiative. 20% arcane spell failure for verbal components."},entangled:{name:"Entangled",category:"condition",effects:{attackRolls:-2,dex:-4,movementHalved:!0},description:"-2 attack rolls, -4 Dex. Movement halved."},exhausted:{name:"Exhausted",category:"condition",effects:{str:-6,dex:-6,movementHalved:!0},description:"-6 to Str and Dex. Move at half speed. Cannot run or charge."},fatigued:{name:"Fatigued",category:"condition",effects:{str:-2,dex:-2},description:"-2 to Str and Dex. Cannot run or charge."},frightened:{name:"Frightened",category:"condition",effects:{attackRolls:-2,savingThrows:-2,skillChecks:-2,abilityChecks:-2,flees:!0},description:"-2 on attacks, saves, skills, ability checks. Must flee from source."},flatFooted:{name:"Flat-Footed",category:"condition",effects:{loseDexToAC:!0},description:"Loses Dex bonus to AC. Cannot make AoO."},grappled:{name:"Grappled",category:"condition",effects:{loseDexToAC:!0,attackRolls:-4},description:"Loses Dex to AC vs non-grapplers. -4 attacks vs non-grapplers."},invisible:{name:"Invisible",category:"buff",effects:{attackRolls:2},description:"+2 on attack rolls. Opponents flat-footed to you."},panicked:{name:"Panicked",category:"condition",effects:{attackRolls:-2,savingThrows:-2,flees:!0,dropsItems:!0},description:"-2 on saves. Must flee. Drops what is held."},paralyzed:{name:"Paralyzed",category:"condition",effects:{str:-999,dex:-999,helpless:!0},description:"Helpless. Cannot move or act. Effective Str and Dex of 0."},prone:{name:"Prone",category:"condition",effects:{meleeAttackRolls:-4,acVsMelee:-4,acVsRanged:4},description:"-4 melee attacks. -4 AC vs melee. +4 AC vs ranged."},shaken:{name:"Shaken",category:"condition",effects:{attackRolls:-2,savingThrows:-2,skillChecks:-2,abilityChecks:-2},description:"-2 on attacks, saves, skills, ability checks."},sickened:{name:"Sickened",category:"condition",effects:{attackRolls:-2,weaponDamage:-2,savingThrows:-2,skillChecks:-2,abilityChecks:-2},description:"-2 on attacks, damage, saves, skills, ability checks."},stunned:{name:"Stunned",category:"condition",effects:{loseDexToAC:!0,ac:-2,dropsItems:!0},description:"Drops held items. Cannot act. -2 AC. Loses Dex to AC."},nauseated:{name:"Nauseated",category:"condition",effects:{canOnlyMove:!0},description:"Unable to attack, cast spells, or concentrate. Can only take a single move action."},confused:{name:"Confused",category:"condition",effects:{},description:"Acts randomly. Roll d% each round to determine behavior."},fascinated:{name:"Fascinated",category:"condition",effects:{spotChecks:-4,listenChecks:-4},description:"-4 on skill checks made reactively. Stands/sits quietly, taking no actions."},cowering:{name:"Cowering",category:"condition",effects:{loseDexToAC:!0,ac:-2},description:"Frozen in fear. Loses Dex to AC, -2 AC."},dazed:{name:"Dazed",category:"condition",effects:{},description:"Unable to act. No AC penalty."},energyDrained:{name:"Energy Drained",category:"condition",effects:{},description:"Negative levels. -1 per level on attacks, saves, skills, abilities, CL, effective level."},petrified:{name:"Petrified",category:"condition",effects:{helpless:!0},description:"Turned to stone. Effectively unconscious."}};function ao(){return Object.keys(Pt)}const Ye={"1/8":50,"1/6":65,"1/4":75,"1/3":100,"1/2":150,1:300,2:600,3:900,4:1200,5:1800,6:2700,7:3600,8:5400,9:7200,10:1e4,11:13500,12:18e3,13:23400,14:3e4,15:39e3,16:49500,17:63e3,18:81e3,19:103500,20:135e3,21:18e4,22:225e3,23:279e3,24:337500,25:405e3},so=Object.keys(Ye);function no(e,t){const s=t.id?parseInt(t.id):null;s?ro(e,s):io(e)}function io(e){e.innerHTML=`
    <div class="encounter-view">
      <div class="view-header">
        <h1>⚔️ Encounters</h1>
        <div class="view-header-actions">
          <button class="btn-primary" id="enc-create-btn">+ New Encounter</button>
        </div>
      </div>
      <div id="enc-list" class="enc-list"><div class="loading-spinner">Loading encounters...</div></div>
    </div>
    `,Rn(e),lo(e)}async function Rn(e){try{const t=await Xr(),s=e.querySelector("#enc-list"),a=t.encounters||[];if(!a.length){s.innerHTML='<div class="empty-state"><p>No encounters yet. Create one to get started!</p></div>';return}s.innerHTML=a.map(n=>`
            <div class="enc-card" data-id="${n.id}">
                <div class="enc-card-header">
                    <span class="enc-card-status enc-status-${n.status}">${mo(n.status)}</span>
                    <span class="enc-card-name">${n.name}</span>
                    <span class="enc-card-count">${n.participant_count||0} 👤</span>
                </div>
                ${n.description?`<div class="enc-card-desc">${n.description}</div>`:""}
                <div class="enc-card-footer">
                    <span class="text-muted">${vo(n.updated_at)}</span>
                    <div class="enc-card-actions">
                        <button class="btn-secondary btn-sm enc-open-btn" data-id="${n.id}">Open</button>
                        <button class="btn-danger btn-sm enc-delete-btn" data-id="${n.id}" title="Delete">🗑️</button>
                    </div>
                </div>
            </div>
        `).join("")}catch(t){e.querySelector("#enc-list").innerHTML=`<div class="error-state">Error: ${t.message}</div>`}}function lo(e){e.querySelector("#enc-create-btn").addEventListener("click",async()=>{const t=prompt("Encounter name:");if(!t)return;const s=prompt("Description (optional):","")||"";try{const a=await Vr(t,s);ke(`encounters/${a.id}`)}catch(a){alert("Error: "+a.message)}}),e.querySelector("#enc-list").addEventListener("click",async t=>{const s=t.target.closest(".enc-open-btn");if(s){ke(`encounters/${s.dataset.id}`);return}const a=t.target.closest(".enc-delete-btn");if(a){if(!confirm("Delete this encounter?"))return;try{await Kr(parseInt(a.dataset.id)),Rn(e)}catch(l){alert("Error: "+l.message)}return}const n=t.target.closest(".enc-card");n&&!t.target.closest("button")&&ke(`encounters/${n.dataset.id}`)})}let Z=null,Nn=[];function ro(e,t){e.innerHTML=`
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
              <div class="enc-combat-zone-actions">
                <button class="btn-secondary btn-sm" id="enc-combat-add-party" title="Add party members to this encounter">🛡️ Add Party</button>
                <button class="btn-secondary btn-sm" id="enc-end-combat-btn">⏹ End Combat</button>
              </div>
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

        <!-- CR Calculator & XP Award (auto-calculated from encounter) -->
        <div class="enc-cr-panel">
          <div class="enc-cr-header">
            <h3>📊 Encounter XP Calculator</h3>
          </div>
          <div class="enc-cr-body">
            <div class="enc-cr-monsters">
              <div class="enc-cr-auto-label">Enemies in encounter:</div>
              <div id="enc-cr-auto-list" class="enc-cr-list"></div>
              <div class="enc-cr-manual-section">
                <div class="enc-cr-manual-label">Add extra (unlisted monsters):</div>
                <div class="enc-cr-add-row">
                  <select id="enc-cr-select" class="form-input enc-cr-select">
                    ${so.map(s=>`<option value="${s}">CR ${s} (${Ye[s].toLocaleString()} XP)</option>`).join("")}
                  </select>
                  <input type="number" id="enc-cr-count" class="form-input enc-cr-count" value="1" min="1" max="50" title="Count">
                  <button class="btn-primary btn-sm" id="enc-cr-add-btn">+ Add</button>
                </div>
                <div id="enc-cr-extra-list" class="enc-cr-list"></div>
              </div>
            </div>
            <div class="enc-cr-summary">
              <div class="enc-cr-total">
                <span>Total XP:</span>
                <strong id="enc-cr-total-xp">0</strong>
              </div>
              <div class="enc-cr-per-member">
                <span>Per Party Member:</span>
                <strong id="enc-cr-per-xp">0</strong>
                <span class="enc-cr-party-count" id="enc-cr-party-info">(0 party members)</span>
              </div>
              <button class="btn-primary" id="enc-award-xp-btn" disabled>🏆 Award XP to Party</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    `,oo(e,t),co(e,t)}async function oo(e,t){try{Z=(await Hn(t)).encounter,e.querySelector("#enc-detail-title").textContent=`⚔️ ${Z.name}`;const n=(await N("towns")).towns||[],l=e.querySelector("#enc-pick-town");l.innerHTML='<option value="">Select a town...</option>'+n.map(i=>`<option value="${i.id}">🏰 ${i.name} (${i.character_count})</option>`).join(""),Z.status==="active"?Fn(e):Ma(e),Bn(e)}catch(s){e.querySelector("#enc-detail-title").textContent=`Error: ${s.message}`}}async function Aa(e){var n;const t=parseInt(e.querySelector("#enc-pick-town").value)||0,s=(((n=e.querySelector("#enc-pick-search"))==null?void 0:n.value)||"").trim().toLowerCase(),a=e.querySelector("#enc-pick-list");if(!t){a.innerHTML='<div class="srd-detail-empty" style="padding:0.75rem"><p style="font-size:0.8rem">Select a town to browse its characters</p></div>';return}a.innerHTML='<div class="srd-loading" style="padding:0.5rem"><div class="spinner"></div>Loading...</div>';try{let i=((await N(`characters&town_id=${t}`)).characters||[]).filter(p=>p.status==="Alive");s&&(i=i.filter(p=>(p.name||"").toLowerCase().includes(s)||(p.race||"").toLowerCase().includes(s)||(p.class||"").toLowerCase().includes(s)));const r=new Set(((Z==null?void 0:Z.participants)||[]).map(p=>parseInt(p.character_id))),d=i.filter(p=>!r.has(parseInt(p.id))),c=i.filter(p=>r.has(parseInt(p.id)));if(!i.length){a.innerHTML='<div class="srd-detail-empty" style="padding:0.5rem"><p style="font-size:0.8rem">No characters match your search.</p></div>';return}let o="";d.length&&(o+=d.map(p=>`
                <div class="enc-pick-item" data-char-id="${p.id}">
                    <div class="enc-pick-info">
                        <span class="enc-pick-name">${p.name}</span>
                        <span class="enc-pick-detail">${p.race||""} ${p.class||""}</span>
                    </div>
                    <div class="enc-pick-stats">
                        <span>♥${p.hp||"?"}</span>
                        <span>🛡${p.ac||"?"}</span>
                    </div>
                    <button class="btn-primary btn-xs enc-add-char-btn" data-char-id="${p.id}">+</button>
                </div>
            `).join("")),c.length&&(o+='<div class="enc-pick-divider">Already in encounter</div>',o+=c.map(p=>`
                <div class="enc-pick-item enc-pick-added">
                    <div class="enc-pick-info">
                        <span class="enc-pick-name">${p.name}</span>
                        <span class="enc-pick-detail">${p.race||""} ${p.class||""}</span>
                    </div>
                    <span class="party-in-badge">Added ✓</span>
                </div>
            `).join("")),a.innerHTML=o}catch(l){a.innerHTML=`<div class="error-state" style="font-size:0.8rem">Error: ${l.message}</div>`}}function Bn(e){const t=e.querySelector("#enc-roster-list");if(!Z)return;const s=Z.groups||[],a=Z.participants||[],n=a.filter(i=>!i.group_id);let l="";s.forEach(i=>{const r=a.filter(d=>parseInt(d.group_id)===parseInt(i.id));l+=`
        <div class="enc-group" data-group-id="${i.id}">
            <div class="enc-group-header">
                <span class="enc-group-name" data-group-id="${i.id}" title="Click to rename">${i.name}</span>
                <span class="enc-group-count">${r.length}</span>
                <button class="btn-danger btn-xs enc-delete-group-btn" data-group-id="${i.id}" title="Delete group">✕</button>
            </div>
            <div class="enc-group-members">
                ${r.map(d=>bs(d)).join("")}
                ${r.length?"":'<div class="empty-state" style="padding:0.3rem;font-size:0.75rem">Empty</div>'}
            </div>
        </div>`}),(n.length||!s.length)&&(l+=`
        <div class="enc-group enc-group-ungrouped">
            <div class="enc-group-header">
                <span class="enc-group-name">Ungrouped</span>
                <span class="enc-group-count">${n.length}</span>
            </div>
            <div class="enc-group-members">
                ${n.map(i=>bs(i)).join("")}
                ${n.length?"":'<div class="empty-state" style="padding:0.3rem;font-size:0.75rem">Select a town and add characters</div>'}
            </div>
        </div>`),t.innerHTML=l,t.querySelectorAll(".enc-remove-part-btn").forEach(i=>{i.addEventListener("click",async()=>{await Zr(parseInt(i.dataset.partId)),await De(e)})}),t.querySelectorAll(".enc-part-side-select").forEach(i=>{i.addEventListener("change",async()=>{await Qe(parseInt(i.dataset.partId),{side:i.value}),await De(e)})}),t.querySelectorAll(".enc-group-name[data-group-id]").forEach(i=>{i.addEventListener("click",async()=>{const r=prompt("Rename group:",i.textContent);r&&(await Jr(parseInt(i.dataset.groupId),r),await De(e))})}),t.querySelectorAll(".enc-delete-group-btn").forEach(i=>{i.addEventListener("click",async()=>{confirm("Delete this group? Participants will become ungrouped.")&&(await Qr(parseInt(i.dataset.groupId)),await De(e))})}),t.querySelectorAll(".enc-part-group-select").forEach(i=>{i.addEventListener("change",async()=>{const r=i.value?parseInt(i.value):null;await Qe(parseInt(i.dataset.partId),{group_id:r}),await De(e)})})}function bs(e){const t={party:"#4a9eff",ally:"#50c878",enemy:"#ff5555",neutral:"#aaa"},s={party:"🛡️",ally:"🤝",enemy:"👹",neutral:"👤"},a=(Z==null?void 0:Z.groups)||[],n=e.conditions?typeof e.conditions=="string"?JSON.parse(e.conditions):e.conditions:[];return`
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
            ${n.length?`<span class="enc-part-conditions">${n.map(l=>{var i;return((i=Pt[l])==null?void 0:i.name)||l}).join(", ")}</span>`:""}
        </div>
    </div>`}async function De(e){const t=Z==null?void 0:Z.id;if(!t)return;Z=(await Hn(t)).encounter,Bn(e),Aa(e),Z.status==="active"&&(qa(e),Da(e))}function co(e,t){var r,d;e.querySelector("#enc-back-btn").addEventListener("click",()=>ke("encounters")),e.querySelector("#enc-pick-town").addEventListener("change",()=>Aa(e));let s=null;e.querySelector("#enc-pick-search").addEventListener("input",()=>{clearTimeout(s),s=setTimeout(()=>Aa(e),300)}),e.querySelector("#enc-pick-list").addEventListener("click",async c=>{const o=c.target.closest(".enc-add-char-btn");if(!o)return;const p=parseInt(o.dataset.charId),g=e.querySelector("#enc-default-side").value||"enemy";try{await gs(t,p,g),await De(e)}catch(v){alert("Error: "+v.message)}}),e.querySelector("#enc-add-group-btn").addEventListener("click",async()=>{const c=prompt("Group/location name:","New Location");if(c)try{await Yr(t,c),await De(e)}catch(o){alert("Error: "+o.message)}}),e.querySelector("#enc-mode-setup").addEventListener("click",async()=>{await Gt(t,{status:"setup"}),Z.status="setup",Ma(e)}),e.querySelector("#enc-mode-combat").addEventListener("click",async()=>{if(!((Z==null?void 0:Z.participants)||[]).length){alert("Add some participants first!");return}await Gt(t,{status:"active",current_round:1,current_turn:0}),Z.status="active",Z.current_round=1,Z.current_turn=0,Fn(e),qa(e),Da(e)}),e.querySelector("#enc-roll-init-btn").addEventListener("click",async()=>{const c=(Z==null?void 0:Z.participants)||[];for(const o of c){const p=Ta("1d20"),g=parseInt(o.initiative_mod)||0,v=p.total+g;await Qe(parseInt(o.id),{initiative:v}),je(e,`${o.name} rolls initiative: ${p.total} + ${xa(g)} = ${v}`)}await De(e)}),e.querySelector("#enc-next-turn-btn").addEventListener("click",async()=>{if(!Z)return;const c=(Z.participants||[]).filter(v=>parseInt(v.is_active)!==0);if(!c.length)return;let o=(parseInt(Z.current_turn)||0)+1,p=parseInt(Z.current_round)||1;o>=c.length&&(o=0,p++),await Gt(Z.id,{current_turn:o,current_round:p}),Z.current_turn=o,Z.current_round=p;const g=c[o];g&&je(e,`--- ${g.name}'s turn (Round ${p}) ---`,"turn"),e.querySelector("#enc-round-num").textContent=p,qa(e),Da(e)}),e.querySelector("#enc-end-combat-btn").addEventListener("click",async()=>{confirm("End combat and return to setup?")&&(await Gt(t,{status:"completed"}),Z.status="completed",je(e,"=== COMBAT ENDED ===","system"),Ma(e))}),e.querySelector("#enc-clear-log-btn").addEventListener("click",()=>{Nn=[],e.querySelector("#enc-combat-log").innerHTML=""}),e.querySelector("#enc-combat-add-party").addEventListener("click",async()=>{try{const o=(await In()).party||[];if(!o.length){ue("No party members. Add to your party first (🛡️ Party page).","warning");return}const p=new Set(((Z==null?void 0:Z.participants)||[]).map(h=>parseInt(h.character_id))),g=o.filter(h=>!p.has(parseInt(h.character_id)));if(!g.length){ue("All party members are already in this encounter.","info");return}const{showModal:v}=await re(async()=>{const{showModal:h}=await Promise.resolve().then(()=>Ie);return{showModal:h}},void 0),{el:b,close:y}=v({title:"🛡️ Add Party Members to Combat",width:"narrow",content:`
                    <div class="enc-party-picker">
                        ${g.map(h=>`
                            <label class="enc-party-pick-item" data-char-id="${h.character_id}">
                                <input type="checkbox" class="enc-party-check" data-char-id="${h.character_id}" checked>
                                <span class="enc-party-pick-name">${h.name}</span>
                                <span class="enc-party-pick-detail">${h.race||""} ${h.class||""} L${h.level||"?"}</span>
                                <span class="enc-party-pick-stats">♥${h.hp||"?"} 🛡${h.ac||"?"}</span>
                            </label>
                        `).join("")}
                        <div style="margin-top:0.75rem;display:flex;gap:0.5rem;justify-content:flex-end">
                            <button class="btn-secondary btn-sm" id="enc-party-pick-cancel">Cancel</button>
                            <button class="btn-primary btn-sm" id="enc-party-pick-add">Add Selected</button>
                        </div>
                    </div>
                `});b.querySelector("#enc-party-pick-cancel").addEventListener("click",y),b.querySelector("#enc-party-pick-add").addEventListener("click",async()=>{const h=[...b.querySelectorAll(".enc-party-check:checked")];if(!h.length){ue("No members selected.","warning");return}let f=0;for(const w of h)await gs(t,parseInt(w.dataset.charId),"party"),f++;y(),ue(`Added ${f} party member${f>1?"s":""} to combat.`,"success"),await De(e),i(e)})}catch(c){ue("Error: "+c.message,"error")}});let a=[];function n(){const c=e.querySelector("#enc-cr-extra-list");c&&(a.length?(c.innerHTML=a.map((o,p)=>`
                <div class="enc-cr-entry">
                    <span class="enc-cr-entry-label">${o.count}× CR ${o.cr}</span>
                    <span class="enc-cr-entry-xp">${(Ye[o.cr]*o.count).toLocaleString()} XP</span>
                    <button class="btn-danger btn-xs enc-cr-extra-remove" data-idx="${p}" title="Remove">✕</button>
                </div>
            `).join(""),c.querySelectorAll(".enc-cr-extra-remove").forEach(o=>{o.addEventListener("click",()=>{a.splice(parseInt(o.dataset.idx),1),n(),i(e)})})):c.innerHTML="")}(r=e.querySelector("#enc-cr-add-btn"))==null||r.addEventListener("click",()=>{const c=e.querySelector("#enc-cr-select").value,o=parseInt(e.querySelector("#enc-cr-count").value)||1,p=a.find(g=>g.cr===c);p?p.count+=o:a.push({cr:c,count:o}),e.querySelector("#enc-cr-count").value="1",n(),i(e)}),(d=e.querySelector("#enc-award-xp-btn"))==null||d.addEventListener("click",async()=>{const{autoXp:c,extraXp:o}=l(),p=c+o,g=((Z==null?void 0:Z.participants)||[]).filter(h=>h.side==="party");if(!g.length){ue("No party members in encounter!","warning");return}if(!p){ue("No enemy XP to award.","warning");return}const v=Math.floor(p/g.length);if(!confirm(`Award ${v.toLocaleString()} XP to each of ${g.length} party member${g.length>1?"s":""}?`))return;const b=e.querySelector("#enc-award-xp-btn");b.disabled=!0,b.textContent="⏳ Awarding...";let y=0;for(const h of g)try{const f=parseInt(h.character_id),w=parseInt(h.town_id);if(!f||!w)continue;const A=parseInt(h.xp)||0,k=A+v;await Xe(w,{id:f,xp:k}),await N("add_combat_xp",{method:"POST",body:{character_id:f,town_id:w,xp_gained:v,reason:`Combat XP: ${Z.name}`,source:"encounter"}}),y++,je(e,`${h.name} gained ${v.toLocaleString()} XP (${A} → ${k})`,"success")}catch(f){console.error(`Failed to award XP to ${h.name}:`,f),je(e,`Failed to award XP to ${h.name}: ${f.message}`,"danger")}ue(`Awarded ${v.toLocaleString()} XP to ${y} party member${y>1?"s":""}!`,"success"),b.textContent="✅ XP Awarded!",setTimeout(()=>{b.textContent="🏆 Award XP to Party",b.disabled=!1},3e3)});function l(){const c=((Z==null?void 0:Z.participants)||[]).filter(g=>g.side==="enemy"||g.side==="neutral");let o=0;c.forEach(g=>{const v=parseInt(g.level)||1;o+=Ye[v]||Ye[String(v)]||0});let p=a.reduce((g,v)=>g+(Ye[v.cr]||0)*v.count,0);return{autoXp:o,extraXp:p}}function i(c){const o=c.querySelector("#enc-cr-auto-list");if(!o)return;const p=((Z==null?void 0:Z.participants)||[]).filter(_=>_.side==="enemy"||_.side==="neutral"),g=((Z==null?void 0:Z.participants)||[]).filter(_=>_.side==="party");p.length?o.innerHTML=p.map(_=>{const P=parseInt(_.level)||1,F=Ye[P]||Ye[String(P)]||0;return`<div class="enc-cr-entry">
                    <span class="enc-cr-entry-label">${_.name} (CR ${P})</span>
                    <span class="enc-cr-entry-xp">${F.toLocaleString()} XP</span>
                </div>`}).join(""):o.innerHTML='<div class="enc-cr-empty">No enemies in encounter</div>';const{autoXp:v,extraXp:b}=l(),y=v+b,h=g.length>0?Math.floor(y/g.length):0,f=c.querySelector("#enc-cr-total-xp"),w=c.querySelector("#enc-cr-per-xp"),A=c.querySelector("#enc-cr-party-info"),k=c.querySelector("#enc-award-xp-btn");f&&(f.textContent=y.toLocaleString()),w&&(w.textContent=h.toLocaleString()),A&&(A.textContent=`(${g.length} party member${g.length!==1?"s":""})`),k&&(k.disabled=!y||!g.length)}n(),i(e)}function Ma(e){e.querySelector("#enc-setup").style.display="",e.querySelector("#enc-combat").style.display="none",e.querySelector("#enc-mode-setup").classList.add("active"),e.querySelector("#enc-mode-combat").classList.remove("active")}function Fn(e){e.querySelector("#enc-setup").style.display="none",e.querySelector("#enc-combat").style.display="",e.querySelector("#enc-mode-setup").classList.remove("active"),e.querySelector("#enc-mode-combat").classList.add("active"),Z&&(e.querySelector("#enc-round-num").textContent=Z.current_round||0)}function qa(e){const t=e.querySelector("#enc-init-list");if(!Z)return;const s=(Z.participants||[]).sort((i,r)=>(parseInt(r.initiative)||0)-(parseInt(i.initiative)||0)),a=parseInt(Z.current_turn)||0,n=s.filter(i=>parseInt(i.is_active)!==0),l={party:"#4a9eff",ally:"#50c878",enemy:"#ff5555",neutral:"#aaa"};t.innerHTML=s.map(i=>{var o;const r=((o=n[a])==null?void 0:o.id)===i.id,d=parseInt(i.current_hp)<=0,c=parseInt(i.is_active)===0;return`
        <div class="enc-init-item ${r?"enc-init-active":""} ${d?"enc-init-dead":""} ${c?"enc-init-inactive":""}"
             data-part-id="${i.id}" style="border-left: 3px solid ${l[i.side]||"#aaa"}">
            <span class="enc-init-turn">${r?"▶":""}</span>
            <span class="enc-init-roll">${i.initiative||"—"}</span>
            <div class="enc-init-info">
                <span class="enc-init-name">${i.name}</span>
                <span class="enc-init-hp ${d?"hp-dead":parseInt(i.current_hp)<parseInt(i.max_hp)/2?"hp-low":""}"
                >♥ ${i.current_hp}/${i.max_hp}</span>
            </div>
        </div>`}).join("")}function Da(e){const t=e.querySelector("#enc-combat-area");if(!Z)return;const s=Z.participants||[],a={party:[],ally:[],enemy:[],neutral:[]};s.forEach(i=>{(a[i.side]||a.neutral).push(i)});const n={party:"🛡️ Party",ally:"🤝 Allies",enemy:"👹 Enemies",neutral:"👤 Neutral"},l={party:"#4a9eff",ally:"#50c878",enemy:"#ff5555",neutral:"#888"};t.innerHTML=Object.entries(a).filter(([,i])=>i.length>0).map(([i,r])=>`
            <div class="enc-combat-side">
                <h4 style="color:${l[i]}">${n[i]}</h4>
                <div class="enc-combat-members">
                    ${r.map(d=>po(d)).join("")}
                </div>
            </div>
        `).join(""),uo(e)}function po(e){const t=parseInt(e.current_hp)<=0,s=Math.max(0,Math.min(100,parseInt(e.current_hp)/Math.max(1,parseInt(e.max_hp))*100)),a=s>50?"#50c878":s>25?"#f0ad4e":"#ff5555",n=e.conditions?typeof e.conditions=="string"?JSON.parse(e.conditions):e.conditions:[],l=za(e.gear||"",e);return`
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
                <button class="btn-danger btn-xs enc-hp-minus" data-part-id="${e.id}" title="-1 HP">−1</button>
                <button class="btn-danger btn-xs enc-dmg-btn" data-part-id="${e.id}">-HP</button>
                <button class="btn-success btn-xs enc-heal-btn" data-part-id="${e.id}">+HP</button>
                <button class="btn-success btn-xs enc-hp-plus" data-part-id="${e.id}" title="+1 HP">+1</button>
            </div>
        </div>
        <div class="enc-ccard-stats">
            <span>🛡 ${e.base_ac||"?"}</span>
            <span>${xa(Ca(parseInt(e.str)||10))} STR</span>
            <span>${xa(Ca(parseInt(e.dex)||10))} DEX</span>
        </div>
        ${l.length?`
        <div class="enc-ccard-weapons">
            ${l.slice(0,3).map(i=>`
                <button class="btn-secondary btn-xs enc-attack-btn" data-part-id="${e.id}" data-weapon="${i.name}"
                    title="${i.dmg} ${i.crit}">⚔ ${i.name}</button>
            `).join("")}
        </div>`:""}
        ${n.length?`<div class="enc-ccard-conditions">${n.map(i=>{var r;return`<span class="enc-condition-tag">${((r=Pt[i])==null?void 0:r.name)||i}</span>`}).join("")}</div>`:""}
        <div class="enc-ccard-actions">
            <button class="btn-secondary btn-xs enc-condition-btn" data-part-id="${e.id}">🏷️</button>
            <button class="btn-secondary btn-xs enc-note-btn" data-part-id="${e.id}">📝</button>
        </div>
    </div>`}function uo(e){e.querySelectorAll(".enc-hp-minus").forEach(t=>{t.addEventListener("click",async()=>{const s=parseInt(t.dataset.partId),a=Z.participants.find(l=>parseInt(l.id)===s);if(!a)return;const n=Math.max(-10,parseInt(a.current_hp)-1);await Qe(s,{current_hp:n,is_active:n>-10?1:0}),n<=0&&parseInt(a.current_hp)>0&&je(e,`${a.name} goes DOWN! (0 HP) 💀`,"danger"),await De(e)})}),e.querySelectorAll(".enc-hp-plus").forEach(t=>{t.addEventListener("click",async()=>{const s=parseInt(t.dataset.partId),a=Z.participants.find(l=>parseInt(l.id)===s);if(!a)return;const n=Math.min(parseInt(a.max_hp),parseInt(a.current_hp)+1);await Qe(s,{current_hp:n,is_active:1}),await De(e)})}),e.querySelectorAll(".enc-dmg-btn").forEach(t=>{t.addEventListener("click",async()=>{const s=parseInt(t.dataset.partId),a=Z.participants.find(r=>parseInt(r.id)===s);if(!a)return;const n=prompt(`Damage to ${a.name}:`,"");if(!n)return;const l=parseInt(n)||0,i=Math.max(-10,parseInt(a.current_hp)-l);await Qe(s,{current_hp:i,is_active:i>-10?1:0}),je(e,`${a.name} takes ${l} damage (${a.current_hp} → ${i} HP)${i<=0?" 💀 DOWN!":""}`,i<=0?"danger":"info"),await De(e)})}),e.querySelectorAll(".enc-heal-btn").forEach(t=>{t.addEventListener("click",async()=>{const s=parseInt(t.dataset.partId),a=Z.participants.find(r=>parseInt(r.id)===s);if(!a)return;const n=prompt(`Heal ${a.name}:`,"");if(!n)return;const l=parseInt(n)||0,i=Math.min(parseInt(a.max_hp),parseInt(a.current_hp)+l);await Qe(s,{current_hp:i,is_active:1}),je(e,`${a.name} heals ${l} HP (${a.current_hp} → ${i} HP)`,"success"),await De(e)})}),e.querySelectorAll(".enc-attack-btn").forEach(t=>{t.addEventListener("click",async()=>{const s=parseInt(t.dataset.partId),a=t.dataset.weapon,n=Z.participants.find(f=>parseInt(f.id)===s);if(!n)return;const i=za(n.gear||"",n).find(f=>f.name===a);if(!i)return;const r=parseInt(n.atk)||0,d=Ta("1d20"),c=d.total+r+i.atkMod+i.enhancement,o=Ta(i.dmg),p=i.ranged?0:i.strMod,g=Math.max(1,o.total+p+i.enhancement),v=i.crit.split("/")[0].split("-"),b=v.length>1?parseInt(v[0]):20,y=d.total>=b;let h=`${n.name} attacks with ${i.name}: 🎲${d.total} + ${r+i.atkMod+i.enhancement} = ${c}`;d.total===20?h+=" (NAT 20!)":y?h+=" (CRIT THREAT!)":d.total===1&&(h+=" (FUMBLE!)"),h+=` | Damage: ${g} (${i.dmg}: ${o.rolls.join("+")}${p?` +${p}str`:""})`,je(e,h,y?"crit":"attack")})}),e.querySelectorAll(".enc-condition-btn").forEach(t=>{t.addEventListener("click",async()=>{var c,o;const s=parseInt(t.dataset.partId),a=Z.participants.find(p=>parseInt(p.id)===s);if(!a)return;const n=a.conditions?typeof a.conditions=="string"?JSON.parse(a.conditions):[...a.conditions]:[],l=ao(),i=prompt(`Conditions for ${a.name}:
Current: ${n.join(", ")||"none"}

Available: ${l.join(", ")}

Enter condition to toggle:`,"");if(!i)return;const r=i.toLowerCase().replace(/[- ]/g,""),d=n.indexOf(r);d>=0?(n.splice(d,1),je(e,`${a.name}: removed ${((c=Pt[r])==null?void 0:c.name)||r}`,"info")):(n.push(r),je(e,`${a.name}: applied ${((o=Pt[r])==null?void 0:o.name)||r}`,"warn")),await Qe(s,{conditions:n}),await De(e)})})}function je(e,t,s="info"){const a=e.querySelector("#enc-combat-log");if(!a)return;const n=new Date().toLocaleTimeString(),l={info:"var(--text-secondary)",success:"#50c878",danger:"#ff5555",warn:"#f0ad4e",attack:"#4a9eff",crit:"#ff44ff",turn:"#f5c518",system:"#aaa"};Nn.push({time:n,message:t,type:s}),a.innerHTML+=`<div class="enc-log-entry" style="color:${l[s]||l.info}">
        <span class="enc-log-time">[${n}]</span> ${t}
    </div>`,a.scrollTop=a.scrollHeight}function mo(e){return{setup:"⚙️",active:"⚔️",completed:"✅"}[e]||"❓"}function vo(e){if(!e)return"";try{return new Date(e).toLocaleDateString()}catch{return e}}let et=[],fs=[],He=null,Xt=0,On="Party Camp";function ho(e){e.innerHTML=`
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
    </div>`,go(e)}async function go(e){try{const t=await N("get_party_base");t.party_base&&(Xt=t.party_base.id,On=t.party_base.name)}catch(t){console.warn("Could not load party base:",t.message)}ot(e),bo(e),yo(e)}async function ot(e){try{et=(await In()).party||[],Zt(e)}catch(t){e.querySelector("#party-member-list").innerHTML=`<p class="error">Error: ${t.message}</p>`}}async function bo(e){try{fs=(await N("towns")).towns||[];const s=e.querySelector("#recruit-town-select");s.innerHTML='<option value="">Select a town...</option>'+fs.map(a=>`<option value="${a.id}">🏰 ${a.name}</option>`).join("")}catch(t){console.error("Failed to load towns:",t)}}function Zt(e){const t=e.querySelector("#party-member-list");if(e.querySelector("#party-count").textContent=`${et.length} members`,!et.length){t.innerHTML='<div class="srd-detail-empty" style="padding:1.5rem"><div class="srd-empty-icon">🛡️</div><p>No party members yet.</p><p style="font-size:0.75rem;color:var(--text-muted)">Use "Recruit from Town" or "Create Character" to add members.</p></div>';return}t.innerHTML=et.map(s=>`<div class="party-list-item ${He&&parseInt(He.character_id)===parseInt(s.character_id)?"selected":""}" data-char-id="${s.character_id}">
            <div class="party-item-main"><div class="party-item-info"><span class="party-item-name">${s.name}</span><span class="party-item-meta">${s.race||""} ${s.class||""}</span></div>
            <div class="party-item-badges"><span class="party-badge party-badge-hp">♥ ${s.hp||"?"}</span><span class="party-badge party-badge-ac">🛡 ${s.ac||"?"}</span></div></div>
            <div class="party-item-from">📍 ${s.town_name}</div></div>`).join("")}function Ze(e,t){var l;const s=e.querySelector("#party-detail-panel");if(!t){s.innerHTML='<div class="srd-detail-empty"><div class="srd-empty-icon">🛡️</div><p>Select a party member to view their character sheet</p></div>';return}const a={...t,id:t.character_id||t.id};s.innerHTML=`
      <div class="party-remove-bar">
        <span class="party-from-town">📍 From ${t.town_name||"Party Camp"}</span>
        <button class="btn-danger btn-xs party-remove-btn" data-char-id="${t.character_id}">Remove from Party</button>
      </div>
      <div id="party-charsheet-area" style="flex:1;min-height:0;overflow:hidden;"></div>`;const n=s.querySelector("#party-charsheet-area");Pe(n,a,{onListRefresh:()=>ot(e),onDelete:async()=>{He=null,await ot(e),Ze(e,null)},containerRef:e}),(l=s.querySelector(".party-remove-btn"))==null||l.addEventListener("click",async()=>{if(confirm(`Remove ${t.name} from the party?`))try{await Ur(parseInt(t.character_id)),He=null,await ot(e),Ze(e,null)}catch(i){alert("Error: "+i.message)}})}async function ga(e,t,s=""){const a=e.querySelector("#recruit-char-list");if(!t){a.innerHTML='<div class="srd-detail-empty"><p>Select a town to browse characters</p></div>';return}a.innerHTML='<div class="srd-loading"><div class="spinner"></div>Loading...</div>';try{let l=(await N(`characters&town_id=${t}`)).characters||[];if(s&&(l=l.filter(i=>i.name.toLowerCase().includes(s.toLowerCase()))),!l.length){a.innerHTML='<div class="srd-detail-empty"><p>No characters found.</p></div>';return}a.innerHTML=l.map(i=>{const r=et.some(d=>parseInt(d.character_id)===parseInt(i.id));return`<div class="party-recruit-item ${r?"already-in-party":""}" data-char-id="${i.id}">
                <div class="party-recruit-info"><span class="party-recruit-name">${i.name}</span><span class="party-recruit-meta">${i.race||""} ${i.class||""} · ♥${i.hp||"?"} 🛡${i.ac||"?"}</span></div>
                ${r?'<span class="party-in-badge">In Party ✓</span>':`<button class="btn-primary btn-xs party-recruit-btn" data-char-id="${i.id}">+ Add</button>`}</div>`}).join("")}catch(n){a.innerHTML=`<p class="error">Error: ${n.message}</p>`}}async function fo(e){var i;const{showModal:t}=await re(async()=>{const{showModal:r}=await Promise.resolve().then(()=>Ie);return{showModal:r}},void 0),{el:s,close:a}=t({title:"✨ Create New Character",width:"narrow",content:`
            <div style="padding: 0.5rem 0;">
                <label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:0.4rem;">Character Name</label>
                <input type="text" id="qc-name" class="form-input" placeholder="Enter character name..." autofocus style="font-size:1rem;padding:0.6rem;">
                <div style="margin-top:1rem;display:flex;gap:0.5rem;justify-content:flex-end;">
                    <button class="btn-secondary btn-sm" id="qc-cancel">Cancel</button>
                    <button class="btn-primary btn-sm" id="qc-create" disabled>Create & Edit →</button>
                </div>
            </div>`}),n=s.querySelector("#qc-name"),l=s.querySelector("#qc-create");n==null||n.addEventListener("input",()=>{l.disabled=!n.value.trim()}),n==null||n.focus(),n==null||n.addEventListener("keydown",r=>{r.key==="Enter"&&n.value.trim()&&l.click()}),(i=s.querySelector("#qc-cancel"))==null||i.addEventListener("click",a),l==null||l.addEventListener("click",async()=>{const r=n.value.trim();if(r){l.disabled=!0,l.textContent="⏳ Creating...";try{const c=await N("save_character",{method:"POST",body:{town_id:Xt,character:{name:r,race:"Human",class:"Fighter 1",status:"Alive",gender:"",alignment:"True Neutral",hp:10,hd:"1d10",ac:"10, touch 10, flat-footed 10",init:"+0",spd:"30 ft",str:10,dex:10,con:10,int_:10,wis:10,cha:10,saves:"Fort +2, Ref +0, Will +0",atk:"",feats:"",skills_feats:"",gear:"",languages:"Common",history:"",role:"Player Character",xp:0,cr:"1"}}});if(!c.ok)throw new Error(c.error||"Failed to create character");const o=c.id;await Pn(o),await ot(e),a(),jn(e,"roster");const g=((await Le(Xt)).characters||[]).find(v=>v.id==o);if(g){const v=xe(g);He=et.find(y=>parseInt(y.character_id)===o)||null,Zt(e),Ze(e,He||{...v,character_id:o,town_name:On});const b=e.querySelector("#party-charsheet-area");if(b){const{initCreatorFromCharacter:y,renderCreator:h}=await re(async()=>{const{initCreatorFromCharacter:A,renderCreator:k}=await import("./CharacterCreator--XtsdYhc.js");return{initCreatorFromCharacter:A,renderCreator:k}},[]),f=Xt;await y(v,{townId:f,onComplete:async()=>{try{const k=((await Le(f)).characters||[]).find(_=>_.id==o);if(k){const _=xe(k);await ot(e),He=et.find(P=>parseInt(P.character_id)===o)||null,Zt(e),Ze(e,He)}}catch{Ze(e,He)}},onCancel:()=>Ze(e,He)}),h(b)}}}catch(d){alert("Error creating character: "+d.message),l.disabled=!1,l.textContent="Create & Edit →"}}})}function jn(e,t){var n;e.querySelectorAll(".party-tab").forEach(l=>l.classList.remove("active")),(n=e.querySelector(`[data-tab="${t}"]`))==null||n.classList.add("active"),e.querySelector("#party-tab-roster").style.display=t==="roster"?"":"none",e.querySelector("#party-tab-recruit").style.display=t==="recruit"?"":"none";const s=e.querySelector("#party-list-panel"),a=e.querySelector("#party-detail-panel");s.style.display="",a.style.flex=""}function yo(e){e.querySelectorAll(".party-tab").forEach(s=>s.addEventListener("click",()=>{const a=s.dataset.tab;if(a==="create"){fo(e);return}jn(e,a),a==="roster"?Ze(e,He):e.querySelector("#party-detail-panel").innerHTML='<div class="srd-detail-empty"><div class="srd-empty-icon">🏰</div><p>Select a town and add characters to your party</p></div>'})),e.querySelector("#party-member-list").addEventListener("click",s=>{const a=s.target.closest(".party-list-item");a&&(He=et.find(n=>parseInt(n.character_id)===parseInt(a.dataset.charId))||null,Zt(e),Ze(e,He))}),e.querySelector("#recruit-town-select").addEventListener("change",s=>ga(e,parseInt(s.target.value)||0));let t=null;e.querySelector("#recruit-search").addEventListener("input",s=>{clearTimeout(t),t=setTimeout(()=>ga(e,parseInt(e.querySelector("#recruit-town-select").value)||0,s.target.value.trim()),300)}),e.querySelector("#recruit-char-list").addEventListener("click",async s=>{const a=s.target.closest(".party-recruit-btn");if(a)try{await Pn(parseInt(a.dataset.charId)),await ot(e);const n=parseInt(e.querySelector("#recruit-town-select").value)||0;ga(e,n,e.querySelector("#recruit-search").value.trim())}catch(n){alert("Error: "+n.message)}})}function wo(e){const t=[{id:"getting-started",icon:"🚀",title:"Getting Started",content:`
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
        <p>The AI Intake bar at the bottom of the Town Roster generates new D&D-legal characters. Standard NPC populations are generated <strong>procedurally</strong> (instantly, no AI credits), while creature/monster intake uses AI.</p>
        
        <div class="help-feature">
          <strong>🔢 Count</strong>
          <p>Set how many characters to generate (1-100). Large numbers are automatically batched into groups of 10.</p>
        </div>
        <div class="help-feature">
          <strong>⚡ Procedural Generation (NPCs)</strong>
          <p>Standard NPC intake uses <strong>no AI credits</strong>. Names, races, classes, roles, and levels are generated procedurally using your town's demographic targets and biome settings. Characters are then optionally fleshed out with backstories via AI.</p>
        </div>
        <div class="help-feature">
          <strong>📝 Instructions</strong>
          <p>Type custom instructions to guide generation. Examples:</p>
          <ul class="help-list">
            <li><code>all dwarves</code> — everyone will be a dwarf</li>
            <li><code>merchants and traders only</code> — specific professions</li>
            <li><code>a family of 4 with 2 parents and 2 children</code> — family groups</li>
            <li><code>all evil-aligned, rogues and assassins</code> — alignment + class</li>
            <li><code>a patrol of 5 guards, all fighters level 3</code> — specific class/level</li>
          </ul>
        </div>
        <div class="help-feature">
          <strong>🎲 Generate</strong>
          <p>Click Generate and characters are produced that respect your town's demographic targets, biome, and generation rules.</p>
        </div>
        <div class="help-tip">
          💡 <strong>Tip:</strong> Leave instructions blank for a natural, diverse population. The system follows your town's demographics, biome, and name style automatically.
        </div>
      `},{id:"character-import",icon:"📥",title:"Character Import",content:`
        <p>The <strong>Import</strong> button (📥) in the town roster header opens a flexible import modal. A dropdown lets you choose your import method, with more formats planned for the future.</p>
        
        <h4>Import Methods</h4>
        <div class="help-feature">
          <strong>📋 Paste Statblock</strong>
          <p>Paste a D&D statblock in text format. The parser handles semicolon-separated formats like:</p>
          <p><code>Name: Race Class; CR X; hp XX; AC XX; Init +X; Atk +X melee; AL NG; SV Fort +3, Ref +1, Will +2; Str 14, Dex 12, Con 13, Int 10, Wis 11, Cha 10. Languages: Common. Skills/Feats: Climb +5; Power Attack. Gear: longsword, chain shirt.</code></p>
          <p>Click <strong>Preview</strong> to parse and review, then <strong>Import</strong> to add to the roster. <em>No AI credits used.</em></p>
        </div>
        <div class="help-feature">
          <strong>🤖 AI Character Prompt</strong>
          <p>Describe any character in plain language and the AI generates a complete D&D stat block — ability scores, HP, AC, feats, skills, gear, and backstory — in one click.</p>
          <p>Examples:</p>
          <ul class="help-list">
            <li><em>"A grizzled half-orc barbarian named Krag, level 5, former gladiator turned bounty hunter"</em></li>
            <li><em>"An elderly elven wizard who runs the town's library, specializing in divination magic"</em></li>
            <li><em>"A charismatic halfling bard who secretly works as a spy for the thieves' guild"</em></li>
          </ul>
          <p>Select a <strong>Level Range</strong> (Auto, Low 1-3, Mid-Low 3-6, Mid 5-10, Mid-High 8-14, High 12-20) to control power level. <em>Uses AI credits (one call per character).</em></p>
        </div>
        <div class="help-tip">
          💡 <strong>Tip:</strong> The AI prompt mode is best for creating important, detailed NPCs — quest givers, villains, recurring characters. For filling out general population, use the faster AI Intake bar instead.
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
          <p>Personal history, backstory, personality traits, and portrait.</p>
        </div>
        <div class="help-feature">
          <strong>📷 Portrait Upload</strong>
          <p>Click the character's portrait in the sheet header to upload a custom image. A camera icon overlay appears on hover. Images are automatically resized and optimized. You can also upload portraits from the Background tab.</p>
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
      `,i.scrollTop=0})})}function Gn(){return N("get_custom_content")}function zn(e){return N("save_custom_race",{method:"POST",body:{race:e}})}function Wn(e){return N("save_custom_class",{method:"POST",body:{class:e}})}function Un(e){return N("save_custom_feat",{method:"POST",body:{feat:e}})}function Xn(e){return N("save_custom_spell",{method:"POST",body:{spell:e}})}function Vn(e){return N("save_custom_equipment",{method:"POST",body:{equipment:e}})}function Kn(e,t){return N("delete_custom_content",{method:"POST",body:{content_type:e,content_id:t}})}function Yn(){return N("get_user_files")}function Jn(e){return N("delete_user_file",{method:"POST",body:{file_id:e}})}async function Qn(e,t="document",s="",a=!0){const l=`${"/".replace(/\/$/,"")}/upload_content.php`,i=new FormData;i.append("file",e),i.append("file_type",t),i.append("description",s),i.append("campaign_scoped",a?"1":"0");const r=await fetch(l,{method:"POST",credentials:"same-origin",body:i}),d=await r.json();if(!r.ok||d.error)throw new Error(d.error||`Upload error ${r.status}`);return d}const $o=Object.freeze(Object.defineProperty({__proto__:null,apiDeleteCustomContent:Kn,apiDeleteUserFile:Jn,apiGetCustomContent:Gn,apiGetUserFiles:Yn,apiSaveCustomClass:Wn,apiSaveCustomEquipment:Vn,apiSaveCustomFeat:Un,apiSaveCustomRace:zn,apiSaveCustomSpell:Xn,apiUploadContent:Qn},Symbol.toStringTag,{value:"Module"})),Wa=[{key:"custom_races",label:"Races",icon:"👤",singular:"Race"},{key:"custom_classes",label:"Classes",icon:"🎭",singular:"Class"},{key:"custom_feats",label:"Feats",icon:"⚔️",singular:"Feat"},{key:"custom_spells",label:"Spells",icon:"✨",singular:"Spell"},{key:"custom_equipment",label:"Equipment",icon:"🛡️",singular:"Item"}];let bt="custom_races",Ia={};function So(e){e.innerHTML=`
    <div class="view-homebrew">
      <header class="view-header">
        <h1>🧪 Homebrew Content</h1>
        <p class="view-subtitle">Create custom races, classes, feats, spells, and equipment for your campaign.</p>
      </header>

      <div class="homebrew-tabs" id="homebrew-tabs">
        ${Wa.map(t=>`
          <button class="hb-tab${t.key===bt?" active":""}" data-tab="${t.key}">
            <span class="hb-tab-icon">${t.icon}</span>
            <span class="hb-tab-label">${t.label}</span>
            <span class="hb-tab-count" id="count-${t.key}">0</span>
          </button>
        `).join("")}
      </div>

      <div class="homebrew-content" id="homebrew-content">
        <div class="view-empty">Loading homebrew content...</div>
      </div>
    </div>
    `,e.querySelectorAll(".hb-tab").forEach(t=>{t.addEventListener("click",()=>{bt=t.dataset.tab,e.querySelectorAll(".hb-tab").forEach(s=>s.classList.toggle("active",s.dataset.tab===bt)),Zn(e)})}),Ua(e)}async function Ua(e){try{Ia=(await Gn()).content||{},Wa.forEach(s=>{const a=e.querySelector(`#count-${s.key}`);a&&(a.textContent=(Ia[s.key]||[]).length)}),Zn(e)}catch(t){e.querySelector("#homebrew-content").innerHTML=`<div class="view-empty"><h3>Error loading content</h3><p>${t.message}</p></div>`}}function Zn(e){var n;const t=e.querySelector("#homebrew-content");if(!t)return;const s=Wa.find(l=>l.key===bt),a=Ia[bt]||[];t.innerHTML=`
    <div class="hb-list-header">
      <h3>${s.icon} ${s.label} <span class="hb-count">(${a.length})</span></h3>
      <button class="btn-primary btn-sm" id="hb-add-btn">+ New ${s.singular}</button>
    </div>
    <div id="hb-form-area"></div>
    <div class="hb-list" id="hb-list">
      ${a.length===0?`<div class="hb-empty">
            <span class="hb-empty-icon">${s.icon}</span>
            <p>No custom ${s.label.toLowerCase()} yet.</p>
            <p class="muted">Click "New ${s.singular}" to create your first!</p>
          </div>`:a.map(l=>_o(l,s)).join("")}
    </div>
    `,(n=t.querySelector("#hb-add-btn"))==null||n.addEventListener("click",()=>{ys(e,s,null)}),t.querySelectorAll(".hb-item-edit").forEach(l=>{l.addEventListener("click",()=>{const i=parseInt(l.dataset.id),r=a.find(d=>d.id==i);r&&ys(e,s,r)})}),t.querySelectorAll(".hb-item-delete").forEach(l=>{l.addEventListener("click",async()=>{const i=parseInt(l.dataset.id),r=a.find(d=>d.id==i);if(!(!r||!confirm(`Delete "${r.name}"? This cannot be undone.`)))try{await Kn(bt,i),Fa(),ue(`"${r.name}" deleted.`,"success"),Ua(e)}catch(d){ue("Delete failed: "+d.message,"error")}})})}function _o(e,t){const s=ko(e,t.key);return`
    <div class="hb-item-card" data-id="${e.id}">
      <div class="hb-item-header">
        <span class="hb-item-name">${t.icon} ${e.name}</span>
        <span class="hb-badge">Homebrew</span>
      </div>
      <div class="hb-item-details">${s}</div>
      <div class="hb-item-actions">
        <button class="btn-sm btn-secondary hb-item-edit" data-id="${e.id}">✏️ Edit</button>
        <button class="btn-sm btn-danger hb-item-delete" data-id="${e.id}">🗑️</button>
      </div>
    </div>`}function ko(e,t){switch(t){case"custom_races":return`<span>Size: ${e.size||"Medium"}</span> · <span>Speed: ${e.speed||30}ft</span>${e.ability_mods?` · <span>${e.ability_mods}</span>`:""}`;case"custom_classes":return`<span>HD: ${e.hit_die||"d8"}</span> · <span>BAB: ${e.bab_type||"3/4"}</span> · <span>Saves: ${e.good_saves||"—"}</span>`;case"custom_feats":return`<span>Type: ${e.type||"General"}</span>${e.prerequisites?` · <span>Prereq: ${e.prerequisites}</span>`:""}${e.benefit?`<br><em>${e.benefit}</em>`:""}`;case"custom_spells":return`<span>Level ${e.level}</span> · <span>${e.school||"Universal"}</span>${e.classes?` · <span>${e.classes}</span>`:""}`;case"custom_equipment":return`<span>${e.category||"Gear"}</span>${e.cost?` · <span>${e.cost}</span>`:""}${e.damage?` · <span>${e.damage}</span>`:""}`;default:return""}}function ys(e,t,s){var i,r;const a=e.querySelector("#hb-form-area");if(!a)return;const n=!!s,l=Lo(t.key,s);a.innerHTML=`
    <div class="hb-form-card">
      <h4>${n?`Edit ${t.singular}`:`New ${t.singular}`}</h4>
      <div class="hb-form-fields">
        ${l}
      </div>
      <div class="hb-form-actions">
        <button class="btn-primary btn-sm" id="hb-form-save">${n?"💾 Save Changes":"✅ Create"}</button>
        <button class="btn-secondary btn-sm" id="hb-form-cancel">Cancel</button>
      </div>
    </div>`,(i=a.querySelector("#hb-form-cancel"))==null||i.addEventListener("click",()=>{a.innerHTML=""}),(r=a.querySelector("#hb-form-save"))==null||r.addEventListener("click",async()=>{const d=Co(t.key,a,s);try{await{custom_races:zn,custom_classes:Wn,custom_feats:Un,custom_spells:Xn,custom_equipment:Vn}[t.key](d),Fa(),ue(`${t.singular} "${d.name}" ${n?"updated":"created"}!`,"success"),a.innerHTML="",Ua(e)}catch(c){ue("Save failed: "+c.message,"error")}}),a.scrollIntoView({behavior:"smooth",block:"nearest"}),t.key==="custom_feats"&&To(a)}function Lo(e,t){const s=t||{};switch(e){case"custom_races":return`
            <div class="form-group"><label>Name *</label><input class="form-input" id="hf-name" value="${s.name||""}" required></div>
            <div class="hb-form-row">
              <div class="form-group"><label>Size</label>
                <select class="form-select" id="hf-size">
                  ${["Fine","Diminutive","Tiny","Small","Medium","Large","Huge","Gargantuan","Colossal"].map(a=>`<option value="${a}"${(s.size||"Medium")===a?" selected":""}>${a}</option>`).join("")}
                </select>
              </div>
              <div class="form-group"><label>Speed (ft)</label><input class="form-input" id="hf-speed" type="number" value="${s.speed||30}"></div>
            </div>
            <div class="form-group"><label>Ability Modifiers</label><input class="form-input" id="hf-ability_mods" value="${s.ability_mods||""}" placeholder="e.g., Str +2, Dex -2"></div>
            <div class="form-group"><label>Racial Traits</label><textarea class="form-input" id="hf-traits" rows="3" placeholder="Special abilities, resistances, etc.">${s.traits||""}</textarea></div>
            <div class="form-group"><label>Languages</label><input class="form-input" id="hf-languages" value="${s.languages||""}" placeholder="e.g., Common, Elvish"></div>`;case"custom_classes":return`
            <div class="form-group"><label>Name *</label><input class="form-input" id="hf-name" value="${s.name||""}" required></div>
            <div class="hb-form-row">
              <div class="form-group"><label>Hit Die</label>
                <select class="form-select" id="hf-hit_die">
                  ${["d4","d6","d8","d10","d12"].map(a=>`<option value="${a}"${(s.hit_die||"d8")===a?" selected":""}>${a}</option>`).join("")}
                </select>
              </div>
              <div class="form-group"><label>BAB Progression</label>
                <select class="form-select" id="hf-bab_type">
                  ${[["Full","Full"],["3/4","3/4"],["1/2","1/2"]].map(([a,n])=>`<option value="${n}"${(s.bab_type||"3/4")===n?" selected":""}>${a}</option>`).join("")}
                </select>
              </div>
              <div class="form-group"><label>Skills/Level</label><input class="form-input" id="hf-skills_per_level" type="number" value="${s.skills_per_level||2}" min="0" max="10"></div>
            </div>
            <div class="form-group"><label>Good Saves</label><input class="form-input" id="hf-good_saves" value="${s.good_saves||""}" placeholder="e.g., Fort, Ref"></div>
            <div class="form-group"><label>Class Skills</label><input class="form-input" id="hf-class_skills" value="${s.class_skills||""}" placeholder="Comma-separated list"></div>
            <div class="form-group"><label>Class Features</label><textarea class="form-input" id="hf-class_features" rows="3" placeholder="Special abilities, features per level, etc.">${s.class_features||""}</textarea></div>`;case"custom_feats":{const a=Eo(s.modifiers);return`
            <div class="form-group"><label>Name *</label><input class="form-input" id="hf-name" value="${s.name||""}" required></div>
            <div class="form-group"><label>Type</label>
              <select class="form-select" id="hf-type">
                ${["General","Fighter","Metamagic","Item Creation","Divine","Epic","Racial","Regional","Tactical"].map(n=>`<option value="${n}"${(s.type||"General")===n?" selected":""}>${n}</option>`).join("")}
              </select>
            </div>
            <div class="form-group"><label>Prerequisites</label><input class="form-input" id="hf-prerequisites" value="${s.prerequisites||""}" placeholder="e.g., BAB +6, Power Attack"></div>

            <div class="form-group hb-modifiers-section">
              <label>⚙️ Mechanical Modifiers</label>
              <p class="hb-mod-hint">Add stat changes this feat grants when taken. These are applied automatically in the Character Creator.</p>
              <div class="hb-mod-list" id="hb-mod-list">
                ${a.map((n,l)=>ei(n,l)).join("")}
              </div>
              <button class="btn-sm btn-secondary" id="hb-mod-add" type="button">+ Add Modifier</button>
            </div>

            <div class="form-group"><label>Benefit <span class="hb-auto-label">(auto-generated from modifiers if empty)</span></label><textarea class="form-input" id="hf-benefit" rows="2" placeholder="What does this feat do?">${s.benefit||""}</textarea></div>
            <div class="form-group"><label>Description</label><textarea class="form-input" id="hf-description" rows="3" placeholder="Extended description, flavor text...">${s.description||""}</textarea></div>`}case"custom_spells":return`
            <div class="form-group"><label>Name *</label><input class="form-input" id="hf-name" value="${s.name||""}" required></div>
            <div class="hb-form-row">
              <div class="form-group"><label>Level</label><input class="form-input" id="hf-level" type="number" value="${s.level||0}" min="0" max="9"></div>
              <div class="form-group"><label>School</label>
                <select class="form-select" id="hf-school">
                  ${["","Abjuration","Conjuration","Divination","Enchantment","Evocation","Illusion","Necromancy","Transmutation","Universal"].map(a=>`<option value="${a}"${(s.school||"")===a?" selected":""}>${a||"— Any —"}</option>`).join("")}
                </select>
              </div>
            </div>
            <div class="hb-form-row">
              <div class="form-group"><label>Casting Time</label><input class="form-input" id="hf-casting_time" value="${s.casting_time||"1 standard action"}"></div>
              <div class="form-group"><label>Range</label><input class="form-input" id="hf-range" value="${s.range||""}" placeholder="e.g., Close (25 ft)"></div>
            </div>
            <div class="hb-form-row">
              <div class="form-group"><label>Duration</label><input class="form-input" id="hf-duration" value="${s.duration||""}" placeholder="e.g., 1 min/level"></div>
              <div class="form-group"><label>Components</label><input class="form-input" id="hf-components" value="${s.components||""}" placeholder="e.g., V, S, M"></div>
            </div>
            <div class="form-group"><label>Classes</label><input class="form-input" id="hf-classes" value="${s.classes||""}" placeholder="e.g., Wizard 3, Cleric 4"></div>
            <div class="form-group"><label>Description</label><textarea class="form-input" id="hf-description" rows="4" placeholder="What does this spell do?">${s.description||""}</textarea></div>`;case"custom_equipment":return`
            <div class="form-group"><label>Name *</label><input class="form-input" id="hf-name" value="${s.name||""}" required></div>
            <div class="hb-form-row">
              <div class="form-group"><label>Category</label>
                <select class="form-select" id="hf-category">
                  ${["","Simple Melee","Simple Ranged","Martial Melee","Martial Ranged","Exotic Melee","Exotic Ranged","Light Armor","Medium Armor","Heavy Armor","Shield","Adventuring Gear","Alchemical","Trade Goods","Special"].map(a=>`<option value="${a}"${(s.category||"")===a?" selected":""}>${a||"— Select —"}</option>`).join("")}
                </select>
              </div>
              <div class="form-group"><label>Cost</label><input class="form-input" id="hf-cost" value="${s.cost||""}" placeholder="e.g., 50 gp"></div>
            </div>
            <div class="hb-form-row">
              <div class="form-group"><label>Weight</label><input class="form-input" id="hf-weight" value="${s.weight||""}" placeholder="e.g., 5 lb"></div>
              <div class="form-group"><label>Damage</label><input class="form-input" id="hf-damage" value="${s.damage||""}" placeholder="e.g., 1d8"></div>
              <div class="form-group"><label>Critical</label><input class="form-input" id="hf-critical" value="${s.critical||""}" placeholder="e.g., 19-20/x2"></div>
            </div>
            <div class="form-group"><label>Properties</label><textarea class="form-input" id="hf-properties" rows="2" placeholder="Special properties, notes...">${s.properties||""}</textarea></div>`;default:return"<p>Unknown content type</p>"}}function Co(e,t,s){const a=l=>{var i,r;return((r=(i=t.querySelector(`#hf-${l}`))==null?void 0:i.value)==null?void 0:r.trim())||""},n=s?{id:s.id}:{};switch(e){case"custom_races":return{...n,name:a("name"),size:a("size"),speed:parseInt(a("speed"))||30,ability_mods:a("ability_mods"),traits:a("traits"),languages:a("languages")};case"custom_classes":return{...n,name:a("name"),hit_die:a("hit_die"),bab_type:a("bab_type"),good_saves:a("good_saves"),skills_per_level:parseInt(a("skills_per_level"))||2,class_skills:a("class_skills"),class_features:a("class_features")};case"custom_feats":{const l=xo(t);let i=a("benefit");return!i&&l.length&&(i=Ao(l)),{...n,name:a("name"),type:a("type"),prerequisites:a("prerequisites"),benefit:i,description:a("description"),modifiers:l}}case"custom_spells":return{...n,name:a("name"),level:parseInt(a("level"))||0,school:a("school"),casting_time:a("casting_time"),range:a("range"),duration:a("duration"),components:a("components"),description:a("description"),classes:a("classes")};case"custom_equipment":return{...n,name:a("name"),category:a("category"),cost:a("cost"),weight:a("weight"),damage:a("damage"),critical:a("critical"),properties:a("properties")};default:return n}}const ft=[{value:"ability",label:"Ability Score",hasTarget:!0,targets:["str","dex","con","int","wis","cha"]},{value:"save",label:"Saving Throw",hasTarget:!0,targets:["fort","ref","will","all_saves"]},{value:"skill",label:"Skill Bonus",hasTarget:!0,targets:[]},{value:"ac",label:"Armor Class",hasTarget:!1},{value:"hp",label:"Hit Points",hasTarget:!1},{value:"initiative",label:"Initiative",hasTarget:!1},{value:"attack",label:"Attack Bonus",hasTarget:!1},{value:"damage",label:"Damage Bonus",hasTarget:!1},{value:"speed",label:"Speed (ft)",hasTarget:!1},{value:"spell_dc",label:"Spell Save DC",hasTarget:!1}],ea={str:"STR",dex:"DEX",con:"CON",int:"INT",wis:"WIS",cha:"CHA",fort:"Fortitude",ref:"Reflex",will:"Will",all_saves:"All Saves"};function Eo(e){if(!e)return[];if(typeof e=="string")try{return JSON.parse(e)||[]}catch{return[]}return Array.isArray(e)?e:[]}function ei(e,t){const s=ft.find(a=>a.value===e.type)||ft[0];return`
    <div class="hb-mod-row" data-index="${t}">
        <select class="form-select hb-mod-type" data-index="${t}">
            ${ft.map(a=>`<option value="${a.value}"${e.type===a.value?" selected":""}>${a.label}</option>`).join("")}
        </select>
        ${s.hasTarget?`
            <select class="form-select hb-mod-target" data-index="${t}">
                ${s.targets.map(a=>`<option value="${a}"${e.target===a?" selected":""}>${ea[a]||a}</option>`).join("")}
                ${e.type==="skill"?`<option value="${e.target||""}" selected>${e.target||"Select skill..."}</option>`:""}
            </select>
        `:'<span class="hb-mod-no-target"></span>'}
        <div class="hb-mod-value-wrap">
            <select class="form-select hb-mod-sign" data-index="${t}">
                <option value="+"${(e.value||0)>=0?" selected":""}>+</option>
                <option value="-"${(e.value||0)<0?" selected":""}>−</option>
            </select>
            <input type="number" class="form-input hb-mod-val" data-index="${t}" value="${Math.abs(e.value||0)}" min="1" max="99">
        </div>
        <button class="btn-sm btn-danger hb-mod-remove" data-index="${t}" type="button">✕</button>
    </div>`}function ws(e,t){const s=ft.find(a=>a.value===e);return!s||!s.hasTarget?"":e==="skill"?["Appraise","Balance","Bluff","Climb","Concentration","Craft","Decipher Script","Diplomacy","Disable Device","Disguise","Escape Artist","Forgery","Gather Information","Handle Animal","Heal","Hide","Intimidate","Jump","Knowledge","Listen","Move Silently","Open Lock","Perform","Profession","Ride","Search","Sense Motive","Sleight of Hand","Speak Language","Spellcraft","Spot","Survival","Swim","Tumble","Use Magic Device","Use Rope"].map(n=>`<option value="${n}"${t===n?" selected":""}>${n}</option>`).join(""):s.targets.map(a=>`<option value="${a}"${t===a?" selected":""}>${ea[a]||a}</option>`).join("")}function To(e){const t=e.querySelector("#hb-mod-list"),s=e.querySelector("#hb-mod-add");!t||!s||(s.addEventListener("click",()=>{const a=t.querySelectorAll(".hb-mod-row").length,n={type:"ability",target:"str",value:2},l=document.createElement("div");l.innerHTML=ei(n,a),t.appendChild(l.firstElementChild),$s(t)}),$s(t))}function $s(e){e.querySelectorAll(".hb-mod-remove").forEach(t=>{t.onclick=()=>{var s;(s=t.closest(".hb-mod-row"))==null||s.remove(),e.querySelectorAll(".hb-mod-row").forEach((a,n)=>{a.dataset.index=n,a.querySelectorAll("[data-index]").forEach(l=>l.dataset.index=n)})}}),e.querySelectorAll(".hb-mod-type").forEach(t=>{t.onchange=()=>{const s=t.closest(".hb-mod-row"),a=ft.find(i=>i.value===t.value),n=s.querySelector(".hb-mod-target"),l=s.querySelector(".hb-mod-no-target");if(a!=null&&a.hasTarget)if(n)n.innerHTML=ws(t.value,""),n.style.display="",l&&(l.style.display="none");else{const i=document.createElement("select");i.className="form-select hb-mod-target",i.dataset.index=s.dataset.index,i.innerHTML=ws(t.value,""),t.after(i),l&&l.remove()}else if(n&&(n.style.display="none"),!l){const i=document.createElement("span");i.className="hb-mod-no-target",t.after(i)}}})}function xo(e){const t=e.querySelectorAll(".hb-mod-row"),s=[];return t.forEach(a=>{var p,g,v,b;const n=((p=a.querySelector(".hb-mod-type"))==null?void 0:p.value)||"ability",l=((g=a.querySelector(".hb-mod-target"))==null?void 0:g.value)||"",i=((v=a.querySelector(".hb-mod-sign"))==null?void 0:v.value)||"+",r=parseInt((b=a.querySelector(".hb-mod-val"))==null?void 0:b.value)||0,d=i==="-"?-r:r,c=ft.find(y=>y.value===n),o={type:n,value:d};c!=null&&c.hasTarget&&l&&(o.target=l),s.push(o)}),s}function Ao(e){const t={ability:s=>`${s.value>=0?"+":""}${s.value} ${(ea[s.target]||s.target||"").toUpperCase()}`,save:s=>`${s.value>=0?"+":""}${s.value} ${ea[s.target]||s.target||""} save`,skill:s=>`${s.value>=0?"+":""}${s.value} ${s.target||"skill"}`,ac:s=>`${s.value>=0?"+":""}${s.value} AC`,hp:s=>`${s.value>=0?"+":""}${s.value} HP`,initiative:s=>`${s.value>=0?"+":""}${s.value} Initiative`,attack:s=>`${s.value>=0?"+":""}${s.value} Attack`,damage:s=>`${s.value>=0?"+":""}${s.value} Damage`,speed:s=>`${s.value>=0?"+":""}${s.value} ft. Speed`,spell_dc:s=>`${s.value>=0?"+":""}${s.value} Spell DC`};return e.map(s=>(t[s.type]||(()=>""))(s)).filter(Boolean).join(", ")}const Mo=[{value:"map",label:"🗺️ Map",icon:"🗺️"},{value:"handout",label:"📄 Handout",icon:"📄"},{value:"asset",label:"🎨 Asset",icon:"🎨"},{value:"document",label:"📝 Document",icon:"📝"}];function qo(e){var i,r;e.innerHTML=`
    <div class="view-content-library">
      <header class="view-header">
        <h1>📁 Content Library</h1>
        <p class="view-subtitle">Upload maps, handouts, and campaign assets. Files are stored in your personal account folder.</p>
      </header>

      <div class="cl-upload-area" id="cl-upload-area">
        <div class="cl-dropzone" id="cl-dropzone">
          <span class="cl-dropzone-icon">📤</span>
          <p class="cl-dropzone-text">Drag & drop files here, or click to browse</p>
          <p class="cl-dropzone-hint">Supports: JPG, PNG, WEBP, GIF, PDF, TXT, MD, JSON</p>
          <input type="file" id="cl-file-input" style="display:none;" multiple
            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain,text/markdown,application/json">
        </div>
        <div class="cl-upload-options" id="cl-upload-options" style="display:none;">
          <div class="form-group">
            <label>File Type</label>
            <select class="form-select" id="cl-upload-type">
              ${Mo.map(d=>`<option value="${d.value}">${d.label}</option>`).join("")}
            </select>
          </div>
          <div class="form-group">
            <label>Description <span class="muted">(optional)</span></label>
            <input class="form-input" id="cl-upload-desc" placeholder="Brief description of this file...">
          </div>
          <div class="cl-upload-actions">
            <button class="btn-primary btn-sm" id="cl-upload-btn">📤 Upload</button>
            <button class="btn-secondary btn-sm" id="cl-upload-cancel">Cancel</button>
          </div>
          <div id="cl-upload-progress" class="cl-upload-progress" style="display:none;">
            <div class="cl-progress-bar"><div class="cl-progress-fill" id="cl-progress-fill"></div></div>
          </div>
        </div>
      </div>

      <div class="cl-storage-info" id="cl-storage-info"></div>

      <div class="cl-files" id="cl-files">
        <div class="view-empty">Loading content library...</div>
      </div>
    </div>`;const t=e.querySelector("#cl-dropzone"),s=e.querySelector("#cl-file-input"),a=e.querySelector("#cl-upload-options");let n=[];t.addEventListener("click",()=>s.click()),t.addEventListener("dragover",d=>{d.preventDefault(),t.classList.add("dragover")}),t.addEventListener("dragleave",()=>t.classList.remove("dragover")),t.addEventListener("drop",d=>{d.preventDefault(),t.classList.remove("dragover"),l(d.dataTransfer.files)}),s.addEventListener("change",()=>l(s.files));function l(d){!d||!d.length||(n=Array.from(d),t.querySelector(".cl-dropzone-text").textContent=`${n.length} file${n.length>1?"s":""} selected: ${n.map(c=>c.name).join(", ")}`,a.style.display="")}(i=e.querySelector("#cl-upload-cancel"))==null||i.addEventListener("click",()=>{n=[],a.style.display="none",s.value="",t.querySelector(".cl-dropzone-text").textContent="Drag & drop files here, or click to browse"}),(r=e.querySelector("#cl-upload-btn"))==null||r.addEventListener("click",async()=>{if(!n.length)return;const d=e.querySelector("#cl-upload-type").value,c=e.querySelector("#cl-upload-desc").value.trim(),o=e.querySelector("#cl-upload-btn");o.disabled=!0,o.textContent="⏳ Uploading...";let p=0;for(const g of n)try{await Qn(g,d,c),p++}catch(v){ue(`Upload failed for "${g.name}": ${v.message}`,"error")}p>0&&ue(`${p} file${p>1?"s":""} uploaded!`,"success"),n=[],a.style.display="none",s.value="",t.querySelector(".cl-dropzone-text").textContent="Drag & drop files here, or click to browse",o.disabled=!1,o.textContent="📤 Upload",e.querySelector("#cl-upload-desc").value="",Pa(e)}),Pa(e)}async function Pa(e){const t=e.querySelector("#cl-files"),s=e.querySelector("#cl-storage-info");try{const a=await Yn(),n=a.files||[],l=a.storage_used||0,i=a.storage_limit||20*1024*1024,r=a.file_count||0,d=a.file_limit||10,c=(l/(1024*1024)).toFixed(1),o=(i/(1024*1024)).toFixed(0),p=Math.min(100,l/i*100);if(s.innerHTML=`
        <div class="cl-storage-bar-container">
          <div class="cl-storage-label">
            <span>📊 ${r} / ${d} files</span>
            <span>${c} MB / ${o} MB used</span>
          </div>
          <div class="cl-storage-bar">
            <div class="cl-storage-fill" style="width:${p}%;${p>80?"background:var(--danger)":""}"></div>
          </div>
        </div>`,n.length===0){t.innerHTML=`
            <div class="cl-empty">
              <span class="cl-empty-icon">📁</span>
              <p>No files uploaded yet.</p>
              <p class="muted">Use the upload area above to add maps, handouts, and assets.</p>
            </div>`;return}t.innerHTML=`
        <div class="cl-grid">
          ${n.map(g=>Do(g)).join("")}
        </div>`,t.querySelectorAll(".cl-file-delete").forEach(g=>{g.addEventListener("click",async()=>{const v=parseInt(g.dataset.id),b=g.dataset.name;if(confirm(`Delete "${b}"?`))try{await Jn(v),ue(`"${b}" deleted.`,"success"),Pa(e)}catch(y){ue("Delete failed: "+y.message,"error")}})}),t.querySelectorAll(".cl-file-copy").forEach(g=>{g.addEventListener("click",()=>{const v=g.dataset.url,b="/".replace(/\/$/,""),y=window.location.origin+b+"/"+v;navigator.clipboard.writeText(y).then(()=>{ue("URL copied!","success")}).catch(()=>{const h=document.createElement("textarea");h.value=y,document.body.appendChild(h),h.select(),document.execCommand("copy"),h.remove(),ue("URL copied!","success")})})})}catch(a){t.innerHTML=`<div class="view-empty"><p>Error: ${a.message}</p></div>`}}function Do(e){var r;const t=(r=e.mime_type)==null?void 0:r.startsWith("image/"),a=`${"/".replace(/\/$/,"")}/${e.url}`,n=(e.file_size/1024).toFixed(1),i={map:"🗺️",handout:"📄",asset:"🎨",document:"📝"}[e.file_type]||"📎";return`
    <div class="cl-file-card">
      <div class="cl-file-preview">
        ${t?`<img src="${a}" alt="${e.original_name}" class="cl-file-thumb" loading="lazy">`:`<div class="cl-file-icon">${i}</div>`}
      </div>
      <div class="cl-file-info">
        <div class="cl-file-name" title="${e.original_name}">${e.original_name}</div>
        <div class="cl-file-meta">
          <span class="cl-file-type-badge">${i} ${e.file_type}</span>
          <span>${n} KB</span>
        </div>
        ${e.description?`<div class="cl-file-desc">${e.description}</div>`:""}
      </div>
      <div class="cl-file-actions">
        ${t?`<a href="${a}" target="_blank" class="btn-sm btn-secondary" title="View full size">🔍</a>`:`<a href="${a}" target="_blank" class="btn-sm btn-secondary" title="Download">⬇️</a>`}
        <button class="btn-sm btn-secondary cl-file-copy" data-url="${e.url}" title="Copy URL">📋</button>
        <button class="btn-sm btn-danger cl-file-delete" data-id="${e.id}" data-name="${e.original_name}" title="Delete">🗑️</button>
      </div>
    </div>`}function Io(){return N("admin_overview")}function Po(){return N("admin_members")}function Ho(e,t){return N("admin_update_member",{method:"POST",body:{user_id:e,...t}})}function Ro(e){return N("admin_delete_member",{method:"DELETE",body:{user_id:e}})}function No(e){return N("admin_user_campaigns",{params:{user_id:e}})}function Ss(e,t=0){const s={user_id:e};return t&&(s.campaign_id=t),N("admin_user_towns",{params:s})}function _s(e){return N("admin_town_characters",{params:{town_id:e}})}function Bo(e){return N("admin_character_detail",{params:{character_id:e}})}function ba(e,t){return N("admin_update_character",{method:"POST",body:{character_id:e,data:t}})}function ks(e){return N("admin_delete_character",{method:"DELETE",body:{character_id:e}})}function fa(e,t){return N("admin_update_town",{method:"POST",body:{town_id:e,data:t}})}function Ls(e){return N("admin_delete_town",{method:"DELETE",body:{town_id:e}})}function Cs(e,t){return N("admin_update_campaign",{method:"POST",body:{campaign_id:e,data:t}})}function Es(e){return N("admin_town_meta",{params:{town_id:e}})}function Ts(e){return N("admin_town_buildings",{params:{town_id:e}})}function xs(e){return N("admin_town_history",{params:{town_id:e}})}function As(e){return N("admin_town_factions",{params:{town_id:e}})}function Fo(e){return N("admin_campaign_rules",{params:{campaign_id:e}})}function Oo(e){return N("admin_calendar",{params:{campaign_id:e}})}function jo(){return N("admin_token_usage")}function Go(){return N("admin_site_settings")}function Ms(e,t){return N("admin_update_site_setting",{method:"POST",body:{key:e,value:t}})}function zo(){return N("admin_all_towns")}function Wo(){return N("admin_all_campaigns")}function qs(e,t,s){return N("admin_update_meta",{method:"POST",body:{town_id:e,key:t,value:s}})}function Uo(e,t){return N("admin_delete_meta",{method:"DELETE",body:{town_id:e,key:t}})}function Xo(e,t,s="add"){return N("admin_adjust_credits",{method:"POST",body:{user_id:e,amount:t,mode:s}})}function Vo(e){let t="overview",s=[];e.innerHTML=`
    <div class="admin-dashboard">
      <div class="admin-header">
        <h1 class="admin-title">🛡️ Admin Dashboard</h1>
        <p class="admin-subtitle">Eon Weaver — Full Database Management</p>
      </div>

      <div class="admin-tabs" id="admin-tabs">
        <button class="admin-tab active" data-tab="overview">📊 Overview</button>
        <button class="admin-tab" data-tab="members">👥 Accounts</button>
        <button class="admin-tab" data-tab="campaigns">📜 Campaigns</button>
        <button class="admin-tab" data-tab="towns">🏰 Towns</button>
        <button class="admin-tab" data-tab="usage">📈 Token Usage</button>
        <button class="admin-tab" data-tab="settings">⚙️ Site Settings</button>
      </div>

      <div class="admin-breadcrumb" id="admin-breadcrumb"></div>

      <div class="admin-content" id="admin-content">
        <div class="admin-loading">Loading...</div>
      </div>
    </div>
    `;const a=e.querySelector("#admin-content"),n=e.querySelector("#admin-breadcrumb");e.querySelectorAll(".admin-tab").forEach($=>{$.addEventListener("click",()=>{e.querySelectorAll(".admin-tab").forEach(E=>E.classList.remove("active")),$.classList.add("active"),t=$.dataset.tab,s=[],l(t)})});async function l($){a.innerHTML='<div class="admin-loading"><div class="admin-spinner"></div>Loading...</div>',i();try{$==="overview"?await r():$==="members"?await c():$==="campaigns"?await A():$==="towns"?await k():$==="usage"?await P():$==="settings"&&await F()}catch(E){a.innerHTML=`<div class="admin-error">⚠️ ${E.message}</div>`}}function i(){if(!s.length){n.innerHTML="";return}n.innerHTML=`
            <div class="breadcrumb-trail">
                <button class="breadcrumb-item breadcrumb-root" data-idx="-1">🏠 All Accounts</button>
                ${s.map(($,E)=>`
                    <span class="breadcrumb-sep">›</span>
                    <button class="breadcrumb-item ${E===s.length-1?"breadcrumb-current":""}" data-idx="${E}">
                        ${$.icon||""} ${$.label}
                    </button>
                `).join("")}
            </div>
        `,n.querySelectorAll(".breadcrumb-item").forEach($=>{$.addEventListener("click",()=>{const E=parseInt($.dataset.idx);if(E<0){s=[],l("members");return}const m=s[E];s=s.slice(0,E+1),m.loader&&m.loader()})})}async function r(){const $=await Io();a.innerHTML=`
        <div class="admin-stats-grid">
          ${d("👥",$.total_users,"Registered Users")}
          ${d("📜",$.total_campaigns,"Total Campaigns")}
          ${d("🏰",$.total_towns,"Total Towns")}
          ${d("🧙",$.total_characters,"Total Characters")}
          ${d("🧠",M($.monthly_tokens),"Tokens This Month")}
          ${d("📡",$.monthly_calls,"AI Calls This Month")}
          ${d("🟢",$.active_users,`Active Users (${$.month})`)}
          ${d("💰","$"+C($.monthly_tokens),"Est. Cost This Month")}
        </div>
        `}function d($,E,m){return`
        <div class="admin-stat-card">
          <div class="stat-icon">${$}</div>
          <div class="stat-value">${E}</div>
          <div class="stat-label">${m}</div>
        </div>`}async function c(){const E=(await Po()).members||[];if(!E.length){a.innerHTML='<div class="admin-empty">No members yet.</div>';return}a.innerHTML=`
        <div class="admin-section-header">
            <h2>All Accounts (${E.length})</h2>
        </div>
        <div class="admin-table-wrap">
          <table class="admin-table" id="admin-members-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Email</th>
                <th>Tier</th>
                <th>Role</th>
                <th>Campaigns</th>
                <th>Towns</th>
                <th>🪙 Eon Credits</th>
                <th>Tokens (Month)</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${E.map(m=>(m.usage_pct,`
              <tr data-user-id="${m.id}">
                <td class="cell-id">${m.id}</td>
                <td class="member-name clickable" data-action="drill" data-user-id="${m.id}" data-username="${u(m.username)}">${u(m.username)}</td>
                <td class="member-email">${u(m.email)}</td>
                <td>
                    <select class="admin-inline-select tier-select" data-field="subscription_tier" data-user-id="${m.id}">
                        <option value="free" ${m.subscription_tier==="free"?"selected":""}>Free</option>
                        <option value="adventurer" ${m.subscription_tier==="adventurer"?"selected":""}>Adventurer</option>
                        <option value="guild_master" ${m.subscription_tier==="guild_master"?"selected":""}>Guild Master</option>
                        <option value="world_builder" ${m.subscription_tier==="world_builder"?"selected":""}>World Builder</option>
                    </select>
                </td>
                <td>
                    <select class="admin-inline-select role-select" data-field="role" data-user-id="${m.id}">
                        <option value="user" ${(m.role||"user")==="user"?"selected":""}>User</option>
                        <option value="admin" ${m.role==="admin"?"selected":""}>Admin</option>
                    </select>
                </td>
                <td class="clickable" data-action="drill" data-user-id="${m.id}" data-username="${u(m.username)}">${m.campaign_count}</td>
                <td>${m.town_count??0}</td>
                <td>
                    <div class="admin-credit-cell">
                        <span class="credit-balance" title="${parseInt(m.credit_balance||0).toLocaleString()} tokens">🪙 ${M(m.credit_balance||0)}</span>
                        <button class="admin-btn admin-btn-small admin-btn-primary" data-action="adjust-credits" data-user-id="${m.id}" data-username="${u(m.username)}" data-balance="${m.credit_balance||0}" title="Adjust Credits">💰</button>
                    </div>
                </td>
                <td>${M(m.tokens_this_month)}</td>
                <td>${new Date(m.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="admin-btn admin-btn-danger admin-btn-small" data-action="delete-member" data-user-id="${m.id}" data-username="${u(m.username)}" title="Delete Account">🗑️</button>
                </td>
              </tr>
              `)).join("")}
            </tbody>
          </table>
        </div>
        `,a.querySelectorAll(".admin-inline-select").forEach(m=>{m.addEventListener("change",async()=>{const S=parseInt(m.dataset.userId),T=m.dataset.field;try{await Ho(S,{[T]:m.value}),B(m)}catch(q){alert("Error: "+q.message),c()}})}),a.querySelectorAll('[data-action="drill"]').forEach(m=>{m.addEventListener("click",()=>{const S=parseInt(m.dataset.userId),T=m.dataset.username;s=[{type:"user",label:T,icon:"👤",id:S,loader:()=>o(S,T)}],o(S,T)})}),a.querySelectorAll('[data-action="delete-member"]').forEach(m=>{m.addEventListener("click",async()=>{const S=parseInt(m.dataset.userId),T=m.dataset.username;if(confirm(`⚠️ DELETE user "${T}" and ALL their data? This cannot be undone.`))try{await Ro(S),c()}catch(q){alert("Error: "+q.message)}})}),a.querySelectorAll('[data-action="adjust-credits"]').forEach(m=>{m.addEventListener("click",()=>{const S=parseInt(m.dataset.userId),T=m.dataset.username,q=parseInt(m.dataset.balance||0);I(`🪙 Adjust Eon Credits — ${T}`,[{key:"info",label:`Current Balance: ${M(q)} (${q.toLocaleString()})`,value:"",type:"info"},{key:"mode",label:"Mode",value:"add",type:"select",options:["add","set","subtract"]},{key:"amount",label:"Amount (tokens)",value:"10000000",type:"number"}],async H=>{await Xo(S,parseInt(H.amount),H.mode),c()})})})}async function o($,E){a.innerHTML='<div class="admin-loading"><div class="admin-spinner"></div>Loading campaigns...</div>',i();try{const S=(await No($)).campaigns||[],q=(await Ss($)).towns||[];a.innerHTML=`
            <div class="admin-drill-header">
                <h2>👤 ${u(E)}</h2>
                <span class="admin-drill-count">${S.length} campaign(s) · ${q.length} town(s)</span>
            </div>

            <div class="admin-drill-section">
                <h3>📜 Campaigns</h3>
                ${S.length?`
                <div class="admin-card-grid">
                    ${S.map(H=>`
                    <div class="admin-data-card" data-campaign-id="${H.id}">
                        <div class="card-header">
                            <span class="card-title clickable" data-action="drill-campaign" data-campaign-id="${H.id}" data-user-id="${$}" data-username="${u(E)}" data-name="${u(H.name)}">${u(H.name)}</span>
                            <span class="card-badge ${H.is_active?"badge-active":"badge-inactive"}">${H.is_active?"Active":"Inactive"}</span>
                        </div>
                        <div class="card-meta">
                            <span class="meta-item">🎲 ${H.dnd_edition}</span>
                            <span class="meta-item">🏰 ${H.town_count} towns</span>
                        </div>
                        ${H.description?`<div class="card-desc">${u(H.description)}</div>`:""}
                        <div class="card-actions">
                            <button class="admin-btn admin-btn-small" data-action="edit-campaign" data-campaign-id="${H.id}" data-name="${u(H.name)}" data-edition="${H.dnd_edition}" data-desc="${u(H.description||"")}">✏️ Edit</button>
                        </div>
                    </div>
                    `).join("")}
                </div>
                `:'<div class="admin-empty-inline">No campaigns.</div>'}
            </div>

            <div class="admin-drill-section">
                <h3>🏰 All Towns</h3>
                ${q.length?`
                <div class="admin-table-wrap">
                <table class="admin-table compact">
                    <thead>
                        <tr><th>ID</th><th>Town</th><th>Campaign ID</th><th>Characters</th><th>Party Base</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                        ${q.map(H=>`
                        <tr>
                            <td class="cell-id">${H.id}</td>
                            <td class="clickable" data-action="drill-town" data-town-id="${H.id}" data-user-id="${$}" data-username="${u(E)}" data-town-name="${u(H.name)}">${u(H.name)}</td>
                            <td>${H.campaign_id||"—"}</td>
                            <td>${H.character_count}</td>
                            <td>${H.is_party_base?"⛺ Yes":"—"}</td>
                            <td>
                                <button class="admin-btn admin-btn-small" data-action="edit-town" data-town-id="${H.id}" data-name="${u(H.name)}" data-subtitle="${u(H.subtitle||"")}">✏️</button>
                                <button class="admin-btn admin-btn-danger admin-btn-small" data-action="delete-town" data-town-id="${H.id}" data-name="${u(H.name)}">🗑️</button>
                            </td>
                        </tr>
                        `).join("")}
                    </tbody>
                </table>
                </div>
                `:'<div class="admin-empty-inline">No towns.</div>'}
            </div>
            `,p($,E),g($,E),v(),b($,E),y($,E)}catch(m){a.innerHTML=`<div class="admin-error">⚠️ ${m.message}</div>`}}function p($,E){a.querySelectorAll('[data-action="drill-campaign"]').forEach(m=>{m.addEventListener("click",()=>{const S=parseInt(m.dataset.campaignId),T=m.dataset.name;s=[{type:"user",label:E,icon:"👤",id:$,loader:()=>o($,E)},{type:"campaign",label:T,icon:"📜",id:S,loader:()=>h($,E,S,T)}],h($,E,S,T)})})}function g($,E){a.querySelectorAll('[data-action="drill-town"]').forEach(m=>{m.addEventListener("click",()=>{const S=parseInt(m.dataset.townId),T=m.dataset.townName,q=s.filter(H=>H.type!=="town"&&H.type!=="character");q.find(H=>H.type==="user")||q.push({type:"user",label:E,icon:"👤",id:$,loader:()=>o($,E)}),q.push({type:"town",label:T,icon:"🏰",id:S,loader:()=>f($,E,S,T)}),s=q,f($,E,S,T)})})}function v(){a.querySelectorAll('[data-action="edit-campaign"]').forEach($=>{$.addEventListener("click",()=>{const E=parseInt($.dataset.campaignId),m=$.dataset.name,S=$.dataset.edition,T=$.dataset.desc;I("Edit Campaign",[{key:"name",label:"Name",value:m},{key:"dnd_edition",label:"Edition",value:S,type:"select",options:["3.5e","5e","5e2024"]},{key:"description",label:"Description",value:T,type:"textarea"}],async q=>{await Cs(E,q)})})})}function b($,E){a.querySelectorAll('[data-action="edit-town"]').forEach(m=>{m.addEventListener("click",()=>{const S=parseInt(m.dataset.townId);I("Edit Town",[{key:"name",label:"Name",value:m.dataset.name},{key:"subtitle",label:"Subtitle",value:m.dataset.subtitle,type:"textarea"}],async T=>{await fa(S,T),o($,E)})})})}function y($,E){a.querySelectorAll('[data-action="delete-town"]').forEach(m=>{m.addEventListener("click",async()=>{const S=parseInt(m.dataset.townId);if(confirm(`⚠️ DELETE town "${m.dataset.name}" and all characters? Cannot be undone.`))try{await Ls(S),o($,E)}catch(T){alert("Error: "+T.message)}})})}async function h($,E,m,S){a.innerHTML='<div class="admin-loading"><div class="admin-spinner"></div>Loading campaign data...</div>',i();try{const[T,q,H]=await Promise.all([Ss($,m),Fo(m).catch(()=>({rules:null})),Oo(m).catch(()=>({calendar:null}))]),W=T.towns||[],D=q.rules,Y=H.calendar;a.innerHTML=`
            <div class="admin-drill-header">
                <h2>📜 ${u(S)}</h2>
                <span class="admin-drill-count">${W.length} town(s)</span>
            </div>

            ${Y?`
            <div class="admin-drill-section">
                <h3>📅 Calendar</h3>
                <div class="admin-kv-grid">
                    ${x("Year",Y.current_year)}
                    ${x("Month",Y.current_month)}
                    ${x("Day",Y.current_day)}
                    ${x("Era",Y.era_name)}
                    ${x("Months/Year",Y.months_per_year)}
                </div>
            </div>
            `:""}

            ${D?`
            <div class="admin-drill-section">
                <h3>📋 Campaign Rules</h3>
                <div class="admin-kv-grid">
                    ${x("Relationship Speed",D.relationship_speed)}
                    ${x("Birth Rate",D.birth_rate)}
                    ${x("Death Threshold",D.death_threshold)}
                    ${x("Child Growth",D.child_growth)}
                    ${x("Conflict Frequency",D.conflict_frequency)}
                    ${x("Sell Rate",D.sell_rate)}
                </div>
                ${D.rules_text?`<div class="admin-text-block"><strong>House Rules:</strong><pre>${u(D.rules_text)}</pre></div>`:""}
                ${D.campaign_description?`<div class="admin-text-block"><strong>World Lore:</strong><pre>${u(D.campaign_description)}</pre></div>`:""}
            </div>
            `:""}

            <div class="admin-drill-section">
                <h3>🏰 Towns in Campaign</h3>
                ${W.length?`
                <div class="admin-table-wrap">
                <table class="admin-table compact">
                    <thead><tr><th>ID</th><th>Town</th><th>Characters</th><th>Party Base</th><th>Actions</th></tr></thead>
                    <tbody>
                        ${W.map(K=>`
                        <tr>
                            <td class="cell-id">${K.id}</td>
                            <td class="clickable" data-action="drill-town" data-town-id="${K.id}" data-user-id="${$}" data-username="${u(E)}" data-town-name="${u(K.name)}">${u(K.name)}</td>
                            <td>${K.character_count}</td>
                            <td>${K.is_party_base?"⛺ Yes":"—"}</td>
                            <td>
                                <button class="admin-btn admin-btn-danger admin-btn-small" data-action="delete-town" data-town-id="${K.id}" data-name="${u(K.name)}">🗑️</button>
                            </td>
                        </tr>
                        `).join("")}
                    </tbody>
                </table>
                </div>
                `:'<div class="admin-empty-inline">No towns in this campaign.</div>'}
            </div>
            `,g($,E),y($,E)}catch(T){a.innerHTML=`<div class="admin-error">⚠️ ${T.message}</div>`}}async function f($,E,m,S){a.innerHTML='<div class="admin-loading"><div class="admin-spinner"></div>Loading town data...</div>',i();try{const[T,q,H,W,D]=await Promise.all([_s(m),Es(m).catch(()=>({meta:[]})),Ts(m).catch(()=>({buildings:[]})),xs(m).catch(()=>({history:[]})),As(m).catch(()=>({factions:[]}))]),Y=T.characters||[],K=q.meta||[],ae=H.buildings||[],oe=W.history||[],he=D.factions||[];a.innerHTML=`
            <div class="admin-drill-header">
                <h2>🏰 ${u(S)}</h2>
                <span class="admin-drill-count">${Y.length} characters · ${ae.length} buildings</span>
            </div>

            <!-- Characters -->
            <div class="admin-drill-section">
                <h3>🧙 Characters (${Y.length})</h3>
                ${Y.length?`
                <div class="admin-table-wrap">
                <table class="admin-table compact">
                    <thead>
                        <tr><th>ID</th><th>Name</th><th>Race</th><th>Class</th><th>Lvl</th><th>HP</th><th>Status</th><th>Alignment</th><th>Role</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                        ${Y.map(z=>`
                        <tr data-char-id="${z.id}">
                            <td class="cell-id">${z.id}</td>
                            <td class="member-name clickable" data-action="drill-char" data-char-id="${z.id}" data-char-name="${u(z.name)}">${u(z.name)}</td>
                            <td>${u(z.race||"—")}</td>
                            <td>${u(z.class||"—")}</td>
                            <td>${z.level||"—"}</td>
                            <td>${z.hp||"—"}</td>
                            <td><span class="status-badge status-${(z.status||"alive").toLowerCase()}">${z.status||"Alive"}</span></td>
                            <td>${u(z.alignment||"—")}</td>
                            <td class="cell-truncate">${u(z.role||"—")}</td>
                            <td>
                                <button class="admin-btn admin-btn-small" data-action="edit-char-quick" data-char-id="${z.id}">✏️</button>
                                <button class="admin-btn admin-btn-danger admin-btn-small" data-action="delete-char" data-char-id="${z.id}" data-name="${u(z.name)}">🗑️</button>
                            </td>
                        </tr>
                        `).join("")}
                    </tbody>
                </table>
                </div>
                `:'<div class="admin-empty-inline">No characters.</div>'}
            </div>

            <!-- Town Meta -->
            ${K.length?`
            <div class="admin-drill-section">
                <h3>🔧 Town Metadata (${K.length})</h3>
                <div class="admin-kv-grid">
                    ${K.map(z=>x(z.key,z.value)).join("")}
                </div>
            </div>
            `:""}

            <!-- Buildings -->
            ${ae.length?`
            <div class="admin-drill-section">
                <h3>🏗️ Buildings (${ae.length})</h3>
                <div class="admin-table-wrap">
                <table class="admin-table compact">
                    <thead><tr><th>ID</th><th>Name</th><th>Type</th><th>Status</th><th>Owner ID</th><th>Description</th></tr></thead>
                    <tbody>
                        ${ae.map(z=>`
                        <tr>
                            <td class="cell-id">${z.id}</td>
                            <td>${u(z.name)}</td>
                            <td>${u(z.building_type||"—")}</td>
                            <td>${u(z.status||"—")}</td>
                            <td>${z.owner_id||"—"}</td>
                            <td class="cell-truncate">${u(z.description||"—")}</td>
                        </tr>
                        `).join("")}
                    </tbody>
                </table>
                </div>
            </div>
            `:""}

            <!-- Factions -->
            ${he.length?`
            <div class="admin-drill-section">
                <h3>⚔️ Factions (${he.length})</h3>
                <div class="admin-table-wrap">
                <table class="admin-table compact">
                    <thead><tr><th>ID</th><th>Name</th><th>Alignment</th><th>Type</th><th>Status</th><th>Influence</th></tr></thead>
                    <tbody>
                        ${he.map(z=>`
                        <tr>
                            <td class="cell-id">${z.id}</td>
                            <td>${u(z.name)}</td>
                            <td>${u(z.alignment||"—")}</td>
                            <td>${u(z.faction_type||"—")}</td>
                            <td>${u(z.status||"—")}</td>
                            <td>${z.influence||"—"}</td>
                        </tr>
                        `).join("")}
                    </tbody>
                </table>
                </div>
            </div>
            `:""}

            <!-- History -->
            ${oe.length?`
            <div class="admin-drill-section">
                <h3>📖 History (${oe.length} entries)</h3>
                <div class="admin-history-list">
                    ${oe.map(z=>`
                    <div class="admin-history-entry">
                        <div class="history-heading">${u(z.heading)}</div>
                        <div class="history-content">${u((z.content||"").substring(0,300))}${(z.content||"").length>300?"...":""}</div>
                    </div>
                    `).join("")}
                </div>
            </div>
            `:""}
            `,a.querySelectorAll('[data-action="drill-char"]').forEach(z=>{z.addEventListener("click",()=>{const pe=parseInt(z.dataset.charId),L=z.dataset.charName,J=s.filter(te=>te.type!=="character");J.push({type:"character",label:L,icon:"🧙",id:pe,loader:()=>w($,E,m,S,pe,L)}),s=J,w($,E,m,S,pe,L)})}),a.querySelectorAll('[data-action="edit-char-quick"]').forEach(z=>{z.addEventListener("click",async()=>{const pe=parseInt(z.dataset.charId),L=Y.find(J=>J.id==pe);L&&I("Edit Character",[{key:"name",label:"Name",value:L.name},{key:"race",label:"Race",value:L.race},{key:"class",label:"Class",value:L.class},{key:"level",label:"Level",value:L.level,type:"number"},{key:"hp",label:"HP",value:L.hp,type:"number"},{key:"status",label:"Status",value:L.status,type:"select",options:["Alive","Dead","Missing","Departed","Unconscious"]},{key:"alignment",label:"Alignment",value:L.alignment},{key:"role",label:"Role",value:L.role},{key:"age",label:"Age",value:L.age,type:"number"},{key:"gender",label:"Gender",value:L.gender}],async J=>{await ba(pe,J),f($,E,m,S)})})}),a.querySelectorAll('[data-action="delete-char"]').forEach(z=>{z.addEventListener("click",async()=>{const pe=parseInt(z.dataset.charId);if(confirm(`Delete character "${z.dataset.name}"?`))try{await ks(pe),f($,E,m,S)}catch(L){alert("Error: "+L.message)}})})}catch(T){a.innerHTML=`<div class="admin-error">⚠️ ${T.message}</div>`}}async function w($,E,m,S,T,q){var H;a.innerHTML='<div class="admin-loading"><div class="admin-spinner"></div>Loading character data...</div>',i();try{const W=await Bo(T),D=W.character,Y=W.equipment||[],K=W.xp_log||[],ae=W.memories||[],oe=W.relationships||[],he=W.spells_known||[],z=W.active_effects||[],pe=W.level_history||[];a.innerHTML=`
            <div class="admin-drill-header">
                <h2>🧙 ${u(D.name)}</h2>
                <span class="admin-drill-count">${u(D.race)} ${u(D.class)} Lv${D.level} · ${D.status}</span>
                <button class="admin-btn admin-btn-primary" id="edit-full-char">✏️ Edit All Fields</button>
            </div>

            <!-- Core Stats -->
            <div class="admin-drill-section">
                <h3>📊 Core Stats</h3>
                <div class="admin-kv-grid char-stats-grid">
                    ${x("Name",D.name)}
                    ${x("Race",D.race)}
                    ${x("Class",D.class)}
                    ${x("Level",D.level)}
                    ${x("XP",D.xp)}
                    ${x("HP",D.hp)}
                    ${x("HD",D.hd)}
                    ${x("AC",D.ac)}
                    ${x("Init",D.init)}
                    ${x("Speed",D.spd)}
                    ${x("BAB/Grapple",D.grapple)}
                    ${x("Attack",D.atk)}
                    ${x("Status",D.status)}
                    ${x("Alignment",D.alignment)}
                    ${x("Gender",D.gender)}
                    ${x("Age",D.age)}
                    ${x("Title",D.title)}
                    ${x("Role",D.role)}
                    ${x("Spouse",D.spouse)}
                    ${x("CR",D.cr)}
                    ${x("ECL",D.ecl)}
                </div>
            </div>

            <!-- Ability Scores -->
            <div class="admin-drill-section">
                <h3>💪 Ability Scores</h3>
                <div class="admin-ability-grid">
                    ${["STR","DEX","CON","INT","WIS","CHA"].map(L=>{const J=L==="INT"?"int_":L.toLowerCase(),te=D[J]||"—",R=te!=="—"?Math.floor((parseInt(te)-10)/2):"";return`<div class="ability-card"><div class="ability-label">${L}</div><div class="ability-value">${te}</div>${R!==""?`<div class="ability-mod">${R>=0?"+":""}${R}</div>`:""}</div>`}).join("")}
                </div>
            </div>

            <!-- Saves & Skills -->
            <div class="admin-drill-section">
                <h3>🛡️ Saves & Skills</h3>
                <div class="admin-kv-grid">
                    ${x("Saves",D.saves)}
                    ${x("Languages",D.languages)}
                    ${x("Domains",D.domains)}
                </div>
                ${D.skills_feats?`<div class="admin-text-block"><strong>Skills:</strong><pre>${u(D.skills_feats)}</pre></div>`:""}
                ${D.feats?`<div class="admin-text-block"><strong>Feats:</strong><pre>${u(D.feats)}</pre></div>`:""}
            </div>

            <!-- Equipment -->
            ${Y.length?`
            <div class="admin-drill-section">
                <h3>⚔️ Equipment (${Y.length})</h3>
                <div class="admin-table-wrap">
                <table class="admin-table compact">
                    <thead><tr><th>Item</th><th>Type</th><th>Slot</th><th>Qty</th><th>Weight</th><th>Equipped</th></tr></thead>
                    <tbody>
                        ${Y.map(L=>`
                        <tr class="${L.equipped?"row-equipped":""}">
                            <td>${u(L.item_name)}</td>
                            <td>${u(L.item_type)}</td>
                            <td>${u(L.slot||"—")}</td>
                            <td>${L.quantity}</td>
                            <td>${L.weight}</td>
                            <td>${L.equipped?"✅":"—"}</td>
                        </tr>
                        `).join("")}
                    </tbody>
                </table>
                </div>
            </div>
            `:""}

            <!-- Gear text -->
            ${D.gear?`
            <div class="admin-drill-section">
                <h3>🎒 Gear Text</h3>
                <div class="admin-text-block"><pre>${u(D.gear)}</pre></div>
            </div>
            `:""}

            <!-- History / Backstory -->
            ${D.history?`
            <div class="admin-drill-section">
                <h3>📖 History</h3>
                <div class="admin-text-block"><pre>${u(D.history)}</pre></div>
            </div>
            `:""}

            <!-- Portrait -->
            ${D.portrait_url?`
            <div class="admin-drill-section">
                <h3>🖼️ Portrait</h3>
                <img src="${D.portrait_url}" class="admin-portrait" alt="Portrait">
                ${D.portrait_prompt?`<div class="admin-text-block"><strong>Prompt:</strong> ${u(D.portrait_prompt)}</div>`:""}
            </div>
            `:""}

            <!-- Relationships -->
            ${oe.length?`
            <div class="admin-drill-section">
                <h3>💕 Relationships (${oe.length})</h3>
                <div class="admin-table-wrap">
                <table class="admin-table compact">
                    <thead><tr><th>Character 1</th><th>Character 2</th><th>Type</th><th>Disposition</th><th>Reason</th></tr></thead>
                    <tbody>
                        ${oe.map(L=>`
                        <tr>
                            <td>${u(L.char1_name||L.char1_id)}</td>
                            <td>${u(L.char2_name||L.char2_id)}</td>
                            <td>${u(L.rel_type)}</td>
                            <td>${L.disposition}</td>
                            <td class="cell-truncate">${u(L.reason||"")}</td>
                        </tr>
                        `).join("")}
                    </tbody>
                </table>
                </div>
            </div>
            `:""}

            <!-- Memories -->
            ${ae.length?`
            <div class="admin-drill-section">
                <h3>🧠 Memories (${ae.length})</h3>
                <div class="admin-table-wrap">
                <table class="admin-table compact">
                    <thead><tr><th>Type</th><th>Content</th><th>Sentiment</th><th>Importance</th></tr></thead>
                    <tbody>
                        ${ae.map(L=>`
                        <tr>
                            <td>${u(L.memory_type)}</td>
                            <td class="cell-truncate">${u(L.content)}</td>
                            <td>${L.sentiment}</td>
                            <td>${L.importance}</td>
                        </tr>
                        `).join("")}
                    </tbody>
                </table>
                </div>
            </div>
            `:""}

            <!-- Spells Known -->
            ${he.length?`
            <div class="admin-drill-section">
                <h3>🔮 Spells Known (${he.length})</h3>
                <div class="admin-table-wrap">
                <table class="admin-table compact">
                    <thead><tr><th>Spell</th><th>Level</th><th>Class</th><th>Source</th></tr></thead>
                    <tbody>
                        ${he.map(L=>`
                        <tr><td>${u(L.spell_name)}</td><td>${L.spell_level}</td><td>${u(L.class_name)}</td><td>${u(L.source)}</td></tr>
                        `).join("")}
                    </tbody>
                </table>
                </div>
            </div>
            `:""}

            <!-- Active Effects -->
            ${z.length?`
            <div class="admin-drill-section">
                <h3>✨ Active Effects (${z.length})</h3>
                <div class="admin-table-wrap">
                <table class="admin-table compact">
                    <thead><tr><th>Effect</th><th>Category</th><th>Duration</th><th>Source</th></tr></thead>
                    <tbody>
                        ${z.map(L=>`
                        <tr><td>${u(L.effect_name)}</td><td>${u(L.category)}</td><td>${L.duration_type}${L.duration_remaining?" ("+L.duration_remaining+" left)":""}</td><td>${u(L.source)}</td></tr>
                        `).join("")}
                    </tbody>
                </table>
                </div>
            </div>
            `:""}

            <!-- Level History -->
            ${pe.length?`
            <div class="admin-drill-section">
                <h3>📈 Level History</h3>
                <div class="admin-table-wrap">
                <table class="admin-table compact">
                    <thead><tr><th>Lvl</th><th>Class</th><th>HP Gained</th><th>Skill Pts</th><th>Feat</th><th>Ability Increase</th></tr></thead>
                    <tbody>
                        ${pe.map(L=>`
                        <tr>
                            <td>${L.level_number}</td>
                            <td>${u(L.class_name)}</td>
                            <td>${L.hp_gained}</td>
                            <td>${L.skill_points}</td>
                            <td>${u(L.feat_chosen||"—")}</td>
                            <td>${u(L.ability_increase||"—")}</td>
                        </tr>
                        `).join("")}
                    </tbody>
                </table>
                </div>
            </div>
            `:""}

            <!-- XP Log -->
            ${K.length?`
            <div class="admin-drill-section">
                <h3>⭐ XP Log (last ${K.length})</h3>
                <div class="admin-table-wrap">
                <table class="admin-table compact">
                    <thead><tr><th>XP</th><th>Reason</th><th>Source</th><th>Date</th></tr></thead>
                    <tbody>
                        ${K.map(L=>`
                        <tr>
                            <td class="xp-value">+${L.xp_gained}</td>
                            <td class="cell-truncate">${u(L.reason)}</td>
                            <td>${u(L.source)}</td>
                            <td>${L.created_at?new Date(L.created_at).toLocaleDateString():"—"}</td>
                        </tr>
                        `).join("")}
                    </tbody>
                </table>
                </div>
            </div>
            `:""}

            <!-- AI Data -->
            ${D.ai_data?`
            <div class="admin-drill-section">
                <h3>🤖 AI Data (raw)</h3>
                <div class="admin-text-block"><pre>${u(D.ai_data.substring(0,2e3))}${D.ai_data.length>2e3?"...":""}</pre></div>
            </div>
            `:""}
            `,(H=a.querySelector("#edit-full-char"))==null||H.addEventListener("click",()=>{I(`Edit: ${D.name}`,[{key:"name",label:"Name",value:D.name},{key:"race",label:"Race",value:D.race},{key:"class",label:"Class",value:D.class},{key:"level",label:"Level",value:D.level,type:"number"},{key:"hp",label:"HP",value:D.hp,type:"number"},{key:"xp",label:"XP",value:D.xp,type:"number"},{key:"age",label:"Age",value:D.age,type:"number"},{key:"status",label:"Status",value:D.status,type:"select",options:["Alive","Dead","Missing","Departed","Unconscious"]},{key:"alignment",label:"Alignment",value:D.alignment},{key:"gender",label:"Gender",value:D.gender},{key:"title",label:"Title",value:D.title},{key:"role",label:"Role",value:D.role},{key:"str",label:"STR",value:D.str,type:"number"},{key:"dex",label:"DEX",value:D.dex,type:"number"},{key:"con",label:"CON",value:D.con,type:"number"},{key:"int_",label:"INT",value:D.int_,type:"number"},{key:"wis",label:"WIS",value:D.wis,type:"number"},{key:"cha",label:"CHA",value:D.cha,type:"number"},{key:"languages",label:"Languages",value:D.languages},{key:"feats",label:"Feats",value:D.feats,type:"textarea"},{key:"skills_feats",label:"Skills",value:D.skills_feats,type:"textarea"},{key:"gear",label:"Gear",value:D.gear,type:"textarea"},{key:"history",label:"History",value:D.history,type:"textarea"},{key:"portrait_url",label:"Portrait URL",value:D.portrait_url}],async L=>{await ba(T,L),w($,E,m,S,T,L.name||q)})})}catch(W){a.innerHTML=`<div class="admin-error">⚠️ ${W.message}</div>`}}async function A(){const E=(await Wo()).campaigns||[];a.innerHTML=`
        <div class="admin-section-header">
            <h2>📜 All Campaigns (${E.length})</h2>
        </div>
        ${E.length?`
        <div class="admin-table-wrap">
          <table class="admin-table" id="admin-all-campaigns-table">
            <thead>
              <tr>
                <th>ID</th><th>Owner</th><th>Campaign Name</th><th>Edition</th>
                <th>Towns</th><th>Active</th><th>Created</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${E.map(m=>`
              <tr>
                <td class="cell-id">${m.id}</td>
                <td class="member-name">${u(m.owner_name)}</td>
                <td>${u(m.name)}</td>
                <td><span class="card-badge badge-active">${m.dnd_edition}</span></td>
                <td>${m.town_count}</td>
                <td>${m.is_active?"✅ Yes":"—"}</td>
                <td>${m.created_at?new Date(m.created_at).toLocaleDateString():"—"}</td>
                <td>
                    <button class="admin-btn admin-btn-small" data-action="edit-campaign-global" data-cid="${m.id}" data-name="${u(m.name)}" data-edition="${m.dnd_edition}" data-desc="${u(m.description||"")}" data-active="${m.is_active}">✏️ Edit</button>
                </td>
              </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        `:'<div class="admin-empty">No campaigns yet.</div>'}
        `,a.querySelectorAll('[data-action="edit-campaign-global"]').forEach(m=>{m.addEventListener("click",()=>{I("Edit Campaign",[{key:"name",label:"Name",value:m.dataset.name},{key:"dnd_edition",label:"Edition",value:m.dataset.edition,type:"select",options:["3.5e","5e","5e2024"]},{key:"description",label:"Description",value:m.dataset.desc,type:"textarea"},{key:"is_active",label:"Active",value:m.dataset.active==="1"?"1":"0",type:"select",options:["1","0"]}],async S=>{await Cs(parseInt(m.dataset.cid),S),A()})})})}async function k(){const E=(await zo()).towns||[];a.innerHTML=`
        <div class="admin-section-header">
            <h2>🏰 All Towns (${E.length})</h2>
        </div>
        ${E.length?`
        <div class="admin-table-wrap">
          <table class="admin-table" id="admin-all-towns-table">
            <thead>
              <tr>
                <th>ID</th><th>Owner</th><th>Campaign</th><th>Town Name</th>
                <th>Characters</th><th>Party Base</th><th>Updated</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${E.map(m=>`
              <tr>
                <td class="cell-id">${m.id}</td>
                <td class="member-name">${u(m.owner_name)}</td>
                <td>${u(m.campaign_name||"—")}</td>
                <td class="clickable town-drill-link" data-town-id="${m.id}" data-town-name="${u(m.name)}" data-user-id="${m.user_id}" data-username="${u(m.owner_name)}">${u(m.name)}</td>
                <td>${m.character_count}</td>
                <td>${m.is_party_base?"⛺ Yes":"—"}</td>
                <td>${m.updated_at?new Date(m.updated_at).toLocaleDateString():"—"}</td>
                <td>
                    <button class="admin-btn admin-btn-small" data-action="edit-town-global" data-tid="${m.id}" data-name="${u(m.name)}" data-subtitle="${u(m.subtitle||"")}" data-party="${m.is_party_base}">✏️</button>
                    <button class="admin-btn admin-btn-small" data-action="view-town-detail" data-tid="${m.id}" data-name="${u(m.name)}" data-uid="${m.user_id}" data-uname="${u(m.owner_name)}">🔍 Detail</button>
                    <button class="admin-btn admin-btn-danger admin-btn-small" data-action="delete-town-global" data-tid="${m.id}" data-name="${u(m.name)}">🗑️</button>
                </td>
              </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        `:'<div class="admin-empty">No towns yet.</div>'}
        `,a.querySelectorAll(".town-drill-link").forEach(m=>{m.addEventListener("click",()=>{const S=parseInt(m.dataset.townId),T=m.dataset.townName,q=parseInt(m.dataset.userId),H=m.dataset.username;s=[{type:"towns-list",label:"All Towns",icon:"🏰",loader:()=>{s=[],k(),i()}},{type:"town",label:T,icon:"🏰",id:S,loader:()=>_(S,T,q,H)}],_(S,T,q,H)})}),a.querySelectorAll('[data-action="view-town-detail"]').forEach(m=>{m.addEventListener("click",()=>{const S=parseInt(m.dataset.tid),T=m.dataset.name,q=parseInt(m.dataset.uid),H=m.dataset.uname;s=[{type:"towns-list",label:"All Towns",icon:"🏰",loader:()=>{s=[],k(),i()}},{type:"town",label:T,icon:"🏰",id:S,loader:()=>_(S,T,q,H)}],_(S,T,q,H)})}),a.querySelectorAll('[data-action="edit-town-global"]').forEach(m=>{m.addEventListener("click",()=>{I("Edit Town",[{key:"name",label:"Name",value:m.dataset.name},{key:"subtitle",label:"Subtitle",value:m.dataset.subtitle,type:"textarea"},{key:"is_party_base",label:"Party Base",value:m.dataset.party==="1"?"1":"0",type:"select",options:["0","1"]}],async S=>{await fa(parseInt(m.dataset.tid),S),k()})})}),a.querySelectorAll('[data-action="delete-town-global"]').forEach(m=>{m.addEventListener("click",async()=>{if(confirm(`⚠️ DELETE town "${m.dataset.name}" and ALL its characters? Cannot be undone.`))try{await Ls(parseInt(m.dataset.tid)),k()}catch(S){alert("Error: "+S.message)}})})}async function _($,E,m,S){var T,q;a.innerHTML='<div class="admin-loading"><div class="admin-spinner"></div>Loading town detail...</div>',i();try{const[H,W,D,Y,K]=await Promise.all([_s($),Es($).catch(()=>({meta:[]})),Ts($).catch(()=>({buildings:[]})),xs($).catch(()=>({history:[]})),As($).catch(()=>({factions:[]}))]),ae=H.characters||[],oe=W.meta||[],he=D.buildings||[],z=Y.history||[],pe=K.factions||[];a.innerHTML=`
            <div class="admin-drill-header">
                <h2>🏰 ${u(E)}</h2>
                <span class="admin-drill-count">Owner: ${u(S)} · ${ae.length} characters · ${he.length} buildings</span>
                <button class="admin-btn admin-btn-small" id="edit-town-from-detail" data-tid="${$}" data-name="${u(E)}">✏️ Edit Town</button>
            </div>

            <!-- Town Metadata -->
            <div class="admin-drill-section">
                <h3>🔧 Town Metadata (${oe.length})</h3>
                ${oe.length?`
                <div class="admin-table-wrap">
                <table class="admin-table compact">
                    <thead><tr><th>Key</th><th>Value</th><th>Actions</th></tr></thead>
                    <tbody>
                        ${oe.map(L=>`
                        <tr>
                            <td class="setting-key">${u(L.key)}</td>
                            <td>
                                <input type="text" class="admin-inline-input meta-value-input" data-key="${u(L.key)}" value="${u(L.value||"")}" />
                            </td>
                            <td>
                                <button class="admin-btn admin-btn-small admin-btn-primary" data-action="save-meta" data-key="${u(L.key)}">💾</button>
                                <button class="admin-btn admin-btn-small admin-btn-danger" data-action="del-meta" data-key="${u(L.key)}">🗑️</button>
                            </td>
                        </tr>
                        `).join("")}
                    </tbody>
                </table>
                </div>
                `:'<div class="admin-empty-inline">No metadata.</div>'}
                <button class="admin-btn admin-btn-small" id="add-meta-btn" style="margin-top:.5rem;">+ Add Metadata</button>
            </div>

            <!-- Characters -->
            <div class="admin-drill-section">
                <h3>🧙 Characters (${ae.length})</h3>
                ${ae.length?`
                <div class="admin-table-wrap">
                <table class="admin-table compact">
                    <thead>
                        <tr><th>ID</th><th>Name</th><th>Race</th><th>Class</th><th>Lvl</th><th>HP</th><th>Status</th><th>Alignment</th><th>Role</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                        ${ae.map(L=>`
                        <tr>
                            <td class="cell-id">${L.id}</td>
                            <td class="member-name clickable char-detail-link" data-char-id="${L.id}" data-char-name="${u(L.name)}">${u(L.name)}</td>
                            <td>${u(L.race||"—")}</td>
                            <td>${u(L.class||"—")}</td>
                            <td>${L.level||"—"}</td>
                            <td>${L.hp||"—"}</td>
                            <td><span class="status-badge status-${(L.status||"alive").toLowerCase()}">${L.status||"Alive"}</span></td>
                            <td>${u(L.alignment||"—")}</td>
                            <td class="cell-truncate">${u(L.role||"—")}</td>
                            <td>
                                <button class="admin-btn admin-btn-small" data-action="edit-char" data-char-id="${L.id}">✏️</button>
                                <button class="admin-btn admin-btn-danger admin-btn-small" data-action="del-char" data-char-id="${L.id}" data-name="${u(L.name)}">🗑️</button>
                            </td>
                        </tr>
                        `).join("")}
                    </tbody>
                </table>
                </div>
                `:'<div class="admin-empty-inline">No characters.</div>'}
            </div>

            <!-- Buildings -->
            ${he.length?`
            <div class="admin-drill-section">
                <h3>🏗️ Buildings (${he.length})</h3>
                <div class="admin-table-wrap">
                <table class="admin-table compact">
                    <thead><tr><th>ID</th><th>Name</th><th>Type</th><th>Status</th><th>Owner ID</th><th>Description</th></tr></thead>
                    <tbody>
                        ${he.map(L=>`
                        <tr>
                            <td class="cell-id">${L.id}</td>
                            <td>${u(L.name)}</td>
                            <td>${u(L.building_type||"—")}</td>
                            <td>${u(L.status||"—")}</td>
                            <td>${L.owner_id||"—"}</td>
                            <td class="cell-truncate">${u(L.description||"—")}</td>
                        </tr>
                        `).join("")}
                    </tbody>
                </table>
                </div>
            </div>
            `:""}

            <!-- Factions -->
            ${pe.length?`
            <div class="admin-drill-section">
                <h3>⚔️ Factions (${pe.length})</h3>
                <div class="admin-table-wrap">
                <table class="admin-table compact">
                    <thead><tr><th>ID</th><th>Name</th><th>Alignment</th><th>Type</th><th>Status</th><th>Influence</th></tr></thead>
                    <tbody>
                        ${pe.map(L=>`
                        <tr>
                            <td class="cell-id">${L.id}</td>
                            <td>${u(L.name)}</td>
                            <td>${u(L.alignment||"—")}</td>
                            <td>${u(L.faction_type||"—")}</td>
                            <td>${u(L.status||"—")}</td>
                            <td>${L.influence||"—"}</td>
                        </tr>
                        `).join("")}
                    </tbody>
                </table>
                </div>
            </div>
            `:""}

            <!-- History -->
            ${z.length?`
            <div class="admin-drill-section">
                <h3>📖 History (${z.length} entries)</h3>
                <div class="admin-history-list">
                    ${z.slice(0,20).map(L=>`
                    <div class="admin-history-entry">
                        <div class="history-heading">${u(L.heading)}</div>
                        <div class="history-content">${u((L.content||"").substring(0,300))}${(L.content||"").length>300?"...":""}</div>
                    </div>
                    `).join("")}
                    ${z.length>20?`<div class="admin-empty-inline">...and ${z.length-20} more entries</div>`:""}
                </div>
            </div>
            `:""}
            `,(T=a.querySelector("#edit-town-from-detail"))==null||T.addEventListener("click",()=>{I("Edit Town",[{key:"name",label:"Name",value:E},{key:"subtitle",label:"Subtitle",value:"",type:"textarea"}],async L=>{await fa($,L),_($,L.name||E,m,S)})}),a.querySelectorAll('[data-action="save-meta"]').forEach(L=>{L.addEventListener("click",async()=>{const J=L.dataset.key,te=a.querySelector(`.meta-value-input[data-key="${J}"]`);if(te)try{await qs($,J,te.value),B(L)}catch(R){alert("Error: "+R.message)}})}),a.querySelectorAll('[data-action="del-meta"]').forEach(L=>{L.addEventListener("click",async()=>{if(confirm(`Delete metadata key "${L.dataset.key}"?`))try{await Uo($,L.dataset.key),_($,E,m,S)}catch(J){alert("Error: "+J.message)}})}),(q=a.querySelector("#add-meta-btn"))==null||q.addEventListener("click",()=>{I("Add Town Metadata",[{key:"key",label:"Key",value:""},{key:"value",label:"Value",value:"",type:"textarea"}],async L=>{await qs($,L.key,L.value),_($,E,m,S)})}),a.querySelectorAll(".char-detail-link").forEach(L=>{L.addEventListener("click",()=>{const J=parseInt(L.dataset.charId),te=L.dataset.charName;s.push({type:"character",label:te,icon:"🧙",id:J,loader:()=>w(m,S,$,E,J,te)}),w(m,S,$,E,J,te)})}),a.querySelectorAll('[data-action="edit-char"]').forEach(L=>{L.addEventListener("click",()=>{const J=parseInt(L.dataset.charId),te=ae.find(R=>R.id==J);te&&I("Edit Character",[{key:"name",label:"Name",value:te.name},{key:"race",label:"Race",value:te.race},{key:"class",label:"Class",value:te.class},{key:"level",label:"Level",value:te.level,type:"number"},{key:"hp",label:"HP",value:te.hp,type:"number"},{key:"status",label:"Status",value:te.status,type:"select",options:["Alive","Dead","Missing","Departed","Unconscious"]},{key:"alignment",label:"Alignment",value:te.alignment},{key:"role",label:"Role",value:te.role},{key:"age",label:"Age",value:te.age,type:"number"},{key:"gender",label:"Gender",value:te.gender}],async R=>{await ba(J,R),_($,E,m,S)})})}),a.querySelectorAll('[data-action="del-char"]').forEach(L=>{L.addEventListener("click",async()=>{if(confirm(`Delete character "${L.dataset.name}"?`))try{await ks(parseInt(L.dataset.charId)),_($,E,m,S)}catch(J){alert("Error: "+J.message)}})})}catch(H){a.innerHTML=`<div class="admin-error">⚠️ ${H.message}</div>`}}async function P(){const E=(await jo()).usage||[];if(!E.length){a.innerHTML='<div class="admin-empty">No token usage data yet.</div>';return}const m={};E.forEach(T=>{m[T.year_month]||(m[T.year_month]={}),m[T.year_month][T.username]||(m[T.year_month][T.username]=[]),m[T.year_month][T.username].push(T)});let S='<div class="admin-section-header"><h2>Token Usage by Month</h2></div>';for(const[T,q]of Object.entries(m)){let H=0,W=0,D="";const Y={SIM_STORY:"Story Simulation",SIM_STRUCTURED:"Structured Data Extraction",SIM_SINGLE:"Basic Town Simulation",SIM_WORLD:"World Simulation",SIM_PLAN:"Simulation Planning",SIM_RUN:"Simulation Execution",LEVEL_UP:"Level Up Wizard",INTAKE_ROSTER:"Town Population Intake",INTAKE_FLESH:"NPC Background Generation",INTAKE_CUSTOM:"Custom NPC Intake",PORTRAIT:"Character Portrait Generator",WEATHER:"Weather Simulation",global:"Legacy / Global Usage"};for(const[K,ae]of Object.entries(q)){const oe=ae.reduce((L,J)=>L+parseInt(J.tokens_used||0),0),he=ae.reduce((L,J)=>L+parseInt(J.call_count||0),0);H+=oe,W+=he;const z={};ae.forEach(L=>{const J=L.feature_key||"global";z[J]={tokens:parseInt(L.tokens_used||0),calls:parseInt(L.call_count||0)}});let pe="";for(const[L,J]of Object.entries(Y)){const te=z[L]||{tokens:0,calls:0};L==="global"&&te.tokens===0||(pe+=`
                        <tr>
                            <td><span class="card-badge" style="display:inline-block; min-width: 220px;">${u(J)}</span></td>
                            <td style="${te.tokens===0?"opacity:0.3;":""}">${M(te.tokens)}</td>
                            <td style="${te.calls===0?"opacity:0.3;":""}">${te.calls}</td>
                            <td style="${te.tokens===0?"opacity:0.3;":""}">$${C(te.tokens)}</td>
                        </tr>
                    `)}Object.keys(z).forEach(L=>{if(!Y[L]){const J=z[L];pe+=`
                            <tr>
                                <td><span class="card-badge" style="display:inline-block; min-width: 220px;">Unknown: ${u(L)}</span></td>
                                <td>${M(J.tokens)}</td>
                                <td>${J.calls}</td>
                                <td>$${C(J.tokens)}</td>
                            </tr>
                        `}}),D+=`
                  <tr class="usage-user-row clickable" style="cursor: pointer;" title="Click to expand breakdown">
                    <td><strong>${u(K)}</strong> <span style="font-size: 0.8em; opacity: 0.7; margin-left: 8px;">(Click to expand)</span></td>
                    <td>${M(oe)}</td>
                    <td>${he}</td>
                    <td>$${C(oe)}</td>
                  </tr>
                  <tr class="usage-features-row" style="display: none; background: rgba(0,0,0,0.2);">
                    <td colspan="4" style="padding: 10px 40px; border-left: 3px solid var(--accent);">
                        <table class="admin-table compact" style="margin: 0; background: transparent;">
                            <thead><tr><th style="min-width: 220px;">Feature</th><th>Tokens</th><th>Calls</th><th>Est. Cost</th></tr></thead>
                            <tbody>
                                ${pe}
                            </tbody>
                        </table>
                    </td>
                  </tr>
                `}S+=`
            <div class="usage-month-block">
              <div class="usage-month-header">
                <h3>📅 ${T}</h3>
                <span class="usage-month-total">${M(H)} tokens · ${W} calls · ~$${C(H)}</span>
              </div>
              <table class="admin-table compact">
                <thead>
                  <tr><th>User</th><th>Total Tokens</th><th>Total Calls</th><th>Est. Cost</th></tr>
                </thead>
                <tbody>
                  ${D}
                </tbody>
              </table>
            </div>
            `}a.innerHTML=S,a.querySelectorAll(".usage-user-row").forEach(T=>{T.addEventListener("click",()=>{const q=T.nextElementSibling;q&&q.classList.contains("usage-features-row")&&(q.style.display=q.style.display==="none"?"table-row":"none")})})}async function F(){var m;const E=(await Go()).settings||[];a.innerHTML=`
        <div class="admin-section-header">
            <h2>⚙️ Site Settings</h2>
            <button class="admin-btn admin-btn-primary" id="add-setting-btn">+ Add Setting</button>
        </div>
        <div class="admin-table-wrap">
          <table class="admin-table" id="settings-table">
            <thead><tr><th>Key</th><th>Value</th><th>Updated</th><th>Actions</th></tr></thead>
            <tbody>
              ${E.map(S=>`
              <tr data-key="${u(S.key)}">
                <td class="setting-key">${u(S.key)}</td>
                <td>
                    <input type="text" class="admin-inline-input" data-key="${u(S.key)}" value="${u(S.value||"")}" />
                </td>
                <td>${S.updated_at?new Date(S.updated_at).toLocaleString():"—"}</td>
                <td>
                    <button class="admin-btn admin-btn-small admin-btn-primary" data-action="save-setting" data-key="${u(S.key)}">💾 Save</button>
                </td>
              </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        `,a.querySelectorAll('[data-action="save-setting"]').forEach(S=>{S.addEventListener("click",async()=>{const T=S.dataset.key,q=a.querySelector(`input[data-key="${T}"]`);if(q)try{await Ms(T,q.value),B(S)}catch(H){alert("Error: "+H.message)}})}),(m=a.querySelector("#add-setting-btn"))==null||m.addEventListener("click",()=>{I("Add Site Setting",[{key:"key",label:"Key",value:""},{key:"value",label:"Value",value:""}],async S=>{await Ms(S.key,S.value),F()})})}function I($,E,m){const S=document.createElement("div");S.className="admin-modal-overlay",S.innerHTML=`
        <div class="admin-modal">
            <div class="admin-modal-header">
                <h3>${$}</h3>
                <button class="admin-modal-close">✕</button>
            </div>
            <div class="admin-modal-body">
                ${E.map(q=>`
                <div class="admin-form-group">
                    <label>${q.label}</label>
                    ${q.type==="info"?`<div class="admin-form-info">${u(q.value||q.label)}</div>`:q.type==="textarea"?`<textarea class="admin-form-input" data-key="${q.key}" rows="4">${u(q.value||"")}</textarea>`:q.type==="select"?`<select class="admin-form-input" data-key="${q.key}">
                                ${q.options.map(H=>`<option value="${H}" ${q.value===H?"selected":""}>${H}</option>`).join("")}
                               </select>`:`<input type="${q.type||"text"}" class="admin-form-input" data-key="${q.key}" value="${u(String(q.value??""))}" />`}
                </div>
                `).join("")}
            </div>
            <div class="admin-modal-footer">
                <button class="admin-btn" id="modal-cancel">Cancel</button>
                <button class="admin-btn admin-btn-primary" id="modal-save">💾 Save Changes</button>
            </div>
        </div>
        `,document.body.appendChild(S);const T=()=>S.remove();S.querySelector(".admin-modal-close").addEventListener("click",T),S.querySelector("#modal-cancel").addEventListener("click",T),S.addEventListener("click",q=>{q.target===S&&T()}),S.querySelector("#modal-save").addEventListener("click",async()=>{const q={};S.querySelectorAll(".admin-form-input").forEach(W=>{const D=W.dataset.key;q[D]=(W.tagName==="TEXTAREA",W.value)});const H=S.querySelector("#modal-save");H.disabled=!0,H.textContent="Saving...";try{await m(q),T()}catch(W){alert("Error: "+W.message),H.disabled=!1,H.textContent="💾 Save Changes"}})}function M($){return $=parseInt($)||0,$>=1e6?($/1e6).toFixed(1)+"M":$>=1e3?($/1e3).toFixed(1)+"K":$.toString()}function C($){return((parseInt($)||0)/1e6*.8).toFixed(4)}function u($){if($==null)return"";const E=document.createElement("div");return E.textContent=String($),E.innerHTML}function x($,E){return`<div class="kv-row"><span class="kv-label">${u($)}</span><span class="kv-value">${u(E??"—")}</span></div>`}function B($){$.classList.add("flash-success"),setTimeout(()=>$.classList.remove("flash-success"),1200)}l("overview")}let ta=!1;document.addEventListener("DOMContentLoaded",async()=>{Ko();try{const e=await qt();e.user?(me({user:e.user}),e.user.active_campaign&&(me({currentCampaign:e.user.active_campaign}),ze(e.user.active_campaign.dnd_edition)),e.user.role==="admin"?ti():sa()):aa()}catch{aa()}});function Ko(){const e="/".replace(/\/$/,"");document.addEventListener("click",t=>{const s=t.target.closest("a");if(!s)return;const a=s.getAttribute("href");if(a){if(a.startsWith("#/")){t.preventDefault(),ke(a.replace(/^#\/?/,""));return}if(a.startsWith(e+"/")||a===e){t.preventDefault();const n=a.replace(new RegExp("^"+e.replace(/\//g,"\\/")),"").replace(/^\//,"");ke(n||"dashboard");return}a.includes("://")||!a.startsWith("/")&&!a.startsWith("mailto:")&&!a.startsWith("tel:")&&(t.preventDefault(),ke(a))}})}function aa(){document.getElementById("auth-screen").style.display="",document.getElementById("main-app").style.display="none",Jo()}function sa(){var t;document.getElementById("auth-screen").style.display="none",document.getElementById("main-app").style.display="";const e=ne();if(yt(document.getElementById("sidebar-container")),(t=document.getElementById("sidebar-logout-btn"))==null||t.addEventListener("click",async()=>{await Oa(),Ha(),aa()}),!e.currentCampaign){Yo();return}tt().then(s=>{if(s.calendar){me({calendar:s.calendar});const a=document.getElementById("sidebar-calendar-text");a&&(a.textContent=Ke(s.calendar))}}).catch(()=>{}),ta||(qe("dashboard",Bi),qe("town",mr),qe("settings",br),qe("srd",Lr),qe("calendar",Hr),qe("simulation",Br),qe("world-simulate",Fr),qe("townstats",Gr),qe("encounters",no),qe("party",ho),qe("homebrew",So),qe("content-library",qo),qe("help",wo),ta=!0),Is()}function ti(){var s,a;document.getElementById("auth-screen").style.display="none",document.getElementById("main-app").style.display="";const e=ne(),t=document.getElementById("sidebar-container");t.innerHTML=`
    <div class="sidebar admin-mode">
      <div class="sidebar-brand">
        <h1 class="sidebar-title">Eon Weaver</h1>
        <p class="sidebar-subtitle">Administration</p>
      </div>
      <nav class="sidebar-nav">
        <button class="nav-item active" data-admin-tab="overview">
          <span class="nav-icon">📊</span>
          <span class="nav-label">Overview</span>
        </button>
        <button class="nav-item" data-admin-tab="members">
          <span class="nav-icon">👥</span>
          <span class="nav-label">Accounts</span>
        </button>
        <button class="nav-item" data-admin-tab="campaigns">
          <span class="nav-icon">📜</span>
          <span class="nav-label">Campaigns</span>
        </button>
        <button class="nav-item" data-admin-tab="towns">
          <span class="nav-icon">🏰</span>
          <span class="nav-label">Towns</span>
        </button>
        <button class="nav-item" data-admin-tab="usage">
          <span class="nav-icon">📈</span>
          <span class="nav-label">Token Usage</span>
        </button>
        <button class="nav-item" data-admin-tab="settings">
          <span class="nav-icon">⚙️</span>
          <span class="nav-label">Site Settings</span>
        </button>
      </nav>
      <div class="sidebar-footer">
        <div class="sidebar-user" id="sidebar-user-info">🛡️ ${((s=e.user)==null?void 0:s.username)||"Admin"}</div>
        <button class="sidebar-logout" id="sidebar-logout-btn" title="Sign Out">🚪 Sign Out</button>
      </div>
    </div>
    `,(a=t.querySelector("#sidebar-logout-btn"))==null||a.addEventListener("click",async()=>{await Oa(),Ha(),aa()}),t.querySelectorAll("[data-admin-tab]").forEach(n=>{n.addEventListener("click",()=>{t.querySelectorAll(".nav-item").forEach(i=>i.classList.remove("active")),n.classList.add("active");const l=document.querySelector(`.admin-tab[data-tab="${n.dataset.adminTab}"]`);l&&l.click()})}),ta||(qe("admin",Vo),ta=!0),ke("admin"),Is()}function Yo(){var t,s;const e=document.getElementById("app-content");e&&(e.innerHTML=`
    <div class="onboarding-screen">
      <div class="onboarding-card">
        <div class="onboarding-icon">📜</div>
        <h1 class="onboarding-title">Welcome to Eon Weaver</h1>
        <p class="onboarding-subtitle">Create your first campaign to get started. Your campaign is the container for all your towns, characters, encounters, and world data.</p>

        <div class="onboarding-form">
          <div class="form-group">
            <label for="onboard-name">Campaign Name</label>
            <input type="text" id="onboard-name" class="form-input" placeholder="e.g. Curse of the Crimson Throne" autofocus>
          </div>

          <div class="form-group">
            <label for="onboard-edition">D&D Edition</label>
            <select id="onboard-edition" class="form-select">
              <option value="3.5e">D&D 3.5 Edition (SRD)</option>
              <option value="5e">D&D 5th Edition — 2014 (SRD)</option>
              <option value="5e2024">D&D 5th Edition — 2024 Revised (SRD)</option>
            </select>
          </div>

          <div class="form-group">
            <label for="onboard-desc">Description <span class="muted">(optional)</span></label>
            <input type="text" id="onboard-desc" class="form-input" placeholder="A brief description of your campaign...">
          </div>

          <button class="btn-primary onboarding-submit" id="onboard-create-btn">
            🚀 Create Campaign & Begin
          </button>
          <div id="onboard-error" class="auth-error" style="display:none;"></div>
        </div>
      </div>
    </div>
    `,(t=e.querySelector("#onboard-create-btn"))==null||t.addEventListener("click",async()=>{const a=e.querySelector("#onboard-name").value.trim(),n=e.querySelector("#onboard-edition").value,l=e.querySelector("#onboard-desc").value.trim(),i=e.querySelector("#onboard-error");if(!a){i.textContent="Please enter a campaign name.",i.style.display="";return}const r=e.querySelector("#onboard-create-btn");r.disabled=!0,r.textContent="Creating...",i.style.display="none";try{const d=await Ns(a,n,l);me({currentCampaign:d.campaign}),ze(n);const c=await qt();c.user&&me({user:c.user}),sa()}catch(d){i.textContent=d.message,i.style.display="",r.disabled=!1,r.textContent="🚀 Create Campaign & Begin"}}),(s=e.querySelector("#onboard-name"))==null||s.addEventListener("keydown",a=>{var n;a.key==="Enter"&&((n=e.querySelector("#onboard-create-btn"))==null||n.click())}))}function Jo(){const e=document.getElementById("login-form"),t=document.getElementById("register-form"),s=document.getElementById("show-register"),a=document.getElementById("show-login"),n=document.getElementById("auth-error");s==null||s.addEventListener("click",l=>{l.preventDefault(),e.style.display="none",t.style.display="",n.style.display="none"}),a==null||a.addEventListener("click",l=>{l.preventDefault(),t.style.display="none",e.style.display="",n.style.display="none"}),document.querySelectorAll(".pw-toggle").forEach(l=>{l.addEventListener("click",()=>{const i=document.getElementById(l.dataset.target);if(!i)return;const r=i.type==="password";i.type=r?"text":"password",l.textContent=r?"🙈":"👁️",l.setAttribute("aria-label",r?"Hide password":"Show password")})}),e==null||e.addEventListener("submit",async l=>{var i;l.preventDefault();try{const r=document.getElementById("login-username").value,d=document.getElementById("login-password").value,c=await ln(r,d);me({user:c.user});const o=await qt();o.user&&(me({user:o.user}),o.user.active_campaign&&(me({currentCampaign:o.user.active_campaign}),ze(o.user.active_campaign.dnd_edition))),((i=o.user)==null?void 0:i.role)==="admin"?ti():sa()}catch(r){n.textContent=r.message,n.style.display=""}}),t==null||t.addEventListener("submit",async l=>{l.preventDefault();try{const i=document.getElementById("reg-username").value,r=document.getElementById("reg-email").value,d=document.getElementById("reg-password").value,c=document.getElementById("reg-beta-key").value,o=await rn(i,r,d,c);me({user:o.user});const p=await qt();p.user&&(me({user:p.user}),p.user.active_campaign&&(me({currentCampaign:p.user.active_campaign}),ze(p.user.active_campaign.dnd_edition))),sa()}catch(i){n.textContent=i.message,n.style.display=""}})}export{ac as A,el as B,N as C,Ie as P,re as _,_a as a,Le as b,Qo as c,ec as d,tc as e,ji as f,Zo as g,dn as h,gn as i,zt as j,Jt as k,xa as l,gi as m,bi as n,fi as o,yi as p,hi as q,wi as r,ra as s,$i as t,Si as u,Xe as v,Ui as w,Fa as x,Gi as y,Ta as z};
