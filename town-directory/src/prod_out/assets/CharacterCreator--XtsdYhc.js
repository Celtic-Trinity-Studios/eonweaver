import{i as Y,j as T,k as $,l as h,m as ds,n as vs,o as us,p as ps,q as ms,r as ys,t as _s,u as ws,v as Ss,w as K,x as fs}from"./index-DC0rDkAm.js";const Cs=["Lawful Good","Neutral Good","Chaotic Good","Lawful Neutral","True Neutral","Chaotic Neutral","Lawful Evil","Neutral Evil","Chaotic Evil"],P=["str","dex","con","int_","wis","cha"],es={str:"STR",dex:"DEX",con:"CON",int_:"INT",wis:"WIS",cha:"CHA"},cs={7:-4,8:0,9:1,10:2,11:3,12:4,13:5,14:6,15:8,16:10,17:13,18:16},Ms=[15,14,13,12,10,8],xs=["Adept","Aristocrat","Commoner","Expert","Warrior"];let q=[],L=[],V=[],gs=[],W=[],t=null;function Q(){return{tab:"class",name:"",gender:"",race:"",class_:"",level:1,alignment:"True Neutral",abilityMethod:"pointbuy",abilities:{str:10,dex:10,con:10,int_:10,wis:10,cha:10},skillRanks:{},selectedFeats:[],gear:"",languages:"",history:"",showPcClasses:!0,showNpcClasses:!0,showPrestigeClasses:!0,showAllSkills:!0,showAllFeats:!0,_editMode:!1,_editId:null,_editTownId:null,_editStatus:"Alive",_editRole:"",_editAge:null,_editPortraitUrl:"",_editXp:0,_editCr:"",_onEditComplete:null,_onEditCancel:null}}function I(e){return q.find(a=>a.name===e)||q[0]||{}}function F(e){return L.find(a=>a.name===e)||L[0]||{}}function G(e){return ys(e==null?void 0:e.ability_mods)}function as(e){return _s(e==null?void 0:e.hit_die)}function ts(e){return ws(e==null?void 0:e.good_saves)}function ls(e){return((e==null?void 0:e.class_skills)||"").split(",").map(a=>a.trim()).filter(Boolean)}function J(e){return xs.includes(e)}const is={"Improved Initiative":[{type:"initiative",value:4}],Toughness:[{type:"hp",value:3}],"Iron Will":[{type:"save",target:"will",value:2}],"Great Fortitude":[{type:"save",target:"fort",value:2}],"Lightning Reflexes":[{type:"save",target:"ref",value:2}],Alertness:[{type:"skill",target:"Listen",value:2},{type:"skill",target:"Spot",value:2}],Dodge:[{type:"ac",value:1}],"Point Blank Shot":[{type:"attack",value:1},{type:"damage",value:1}],"Weapon Focus":[{type:"attack",value:1}],"Weapon Specialization":[{type:"damage",value:2}]};function As(){if(!t)return[];const e=[];for(const a of t.selectedFeats){const s=V.find(n=>n.name===a);let l=[];if(s)if(typeof s.modifiers=="string")try{l=JSON.parse(s.modifiers)||[]}catch{l=[]}else Array.isArray(s.modifiers)&&(l=s.modifiers);!l.length&&is[a]&&(l=is[a]);for(const n of l)n&&n.type&&typeof n.value=="number"&&e.push(n)}return e}function g(e,a=null){return As().filter(s=>s.type===e&&(a===null||s.target===a||s.target==="all_saves")).reduce((s,l)=>s+(l.value||0),0)}function E(e){const a=I(t.race),s=G(a),l=e==="int_"?"int":e;return t.abilities[e]+(s[e]||0)+g("ability",l)}function ns(){const e=F(t.class_),a=$(E("int_")),s=(parseInt(e==null?void 0:e.skills_per_level)||2)+a,l=Math.max(1,s),n=I(t.race),i=(n==null?void 0:n.name)==="Human"?4:0;return l*t.level+i}function os(){return Object.values(t.skillRanks).reduce((e,a)=>e+a,0)}function Es(e){if(!(e!=null&&e.modifiers))return[];let a=e.modifiers;if(typeof a=="string")try{a=JSON.parse(a)}catch{return[]}return Array.isArray(a)?a.filter(s=>s&&s.type&&typeof s.value=="number"):[]}function Ls(e){const a={str:"STR",dex:"DEX",con:"CON",int:"INT",wis:"WIS",cha:"CHA",fort:"Fort",ref:"Ref",will:"Will",all_saves:"All Saves"},s=`${e.value>=0?"+":""}${e.value}`;switch(e.type){case"ability":return`<span class="cc-mod-badge cc-mod-ability">${s} ${a[e.target]||e.target}</span>`;case"save":return`<span class="cc-mod-badge cc-mod-save">${s} ${a[e.target]||e.target}</span>`;case"skill":return`<span class="cc-mod-badge cc-mod-skill">${s} ${e.target||"Skill"}</span>`;case"ac":return`<span class="cc-mod-badge cc-mod-ac">${s} AC</span>`;case"hp":return`<span class="cc-mod-badge cc-mod-hp">${s} HP</span>`;case"initiative":return`<span class="cc-mod-badge cc-mod-init">${s} Init</span>`;case"attack":return`<span class="cc-mod-badge cc-mod-atk">${s} Atk</span>`;case"damage":return`<span class="cc-mod-badge cc-mod-dmg">${s} Dmg</span>`;case"speed":return`<span class="cc-mod-badge cc-mod-spd">${s} ft</span>`;default:return`<span class="cc-mod-badge">${s} ${e.type}</span>`}}async function Ps(){var e,a,s;fs(),[q,L,V,gs,W]=await Promise.all([ds(),vs(),us(),ps(),ms()]),t=Q(),t.race=((e=q[0])==null?void 0:e.name)||"Human",t.class_=((a=L.find(l=>!J(l.name)))==null?void 0:a.name)||((s=L[0])==null?void 0:s.name)||"Fighter"}async function Hs(e,{townId:a,onComplete:s,onCancel:l}={}){var r,v;fs(),[q,L,V,gs,W]=await Promise.all([ds(),vs(),us(),ps(),ms()]),t=Q();const n=e.class||"",i=n.match(/^(.+?)\s+(\d+)$/),c=i?i[1].trim():n.trim(),u=i?parseInt(i[2]):parseInt(e.level)||1;t.name=e.name||"",t.gender=e.gender||"",t.race=e.race||((r=q[0])==null?void 0:r.name)||"Human",t.class_=c||((v=L[0])==null?void 0:v.name)||"Fighter",t.level=u,t.alignment=e.alignment||"True Neutral",t.abilityMethod="manual";const p=I(t.race),b=G(p);P.forEach(m=>{const _=parseInt(e[m==="int_"?"int_":m])||10,S=b[m]||0;t.abilities[m]=_-S}),t.selectedFeats=(e.feats||"").split(/[,;]/).map(m=>m.trim()).filter(Boolean),t.skillRanks={};const d=e.skills_feats||"";if(d){const m=d.split(/,\s*/);for(const k of m){const _=k.match(/^(.+?)\s+[+-]?(\d+)$/);if(_){const S=_[1].trim(),x=parseInt(_[2])||0,C=W.find(A=>A.name===S);if(C){const A=C.ability.toLowerCase()==="int"?"int_":C.ability.toLowerCase(),N=$(E(A));t.skillRanks[S]=Math.max(0,x-N)}else t.skillRanks[S]=x}}}t.gear=e.gear||"",t.languages=e.languages||"",t.history=e.history||"",t._editMode=!0,t._editId=e.id||e.dbId,t._editTownId=a,t._editStatus=e.status||"Alive",t._editRole=e.role||"",t._editAge=e.age?parseInt(e.age):null,t._editPortraitUrl=e.portrait_url||"",t._editXp=parseInt(e.xp)||0,t._editCr=e.cr||"",t._onEditComplete=s||null,t._onEditCancel=l||null,t.tab="review"}function js(){var e,a,s;t=Q(),t.race=((e=q[0])==null?void 0:e.name)||"Human",t.class_=((a=L.find(l=>!J(l.name)))==null?void 0:a.name)||((s=L[0])==null?void 0:s.name)||"Fighter"}function Fs(e){var l,n,i;t||(t=Q(),t.race=((l=q[0])==null?void 0:l.name)||"Human",t.class_=((n=L[0])==null?void 0:n.name)||"Fighter");const a=t;F(a.class_),I(a.race);const s=a._editMode;e.innerHTML=`
    <div class="cc-root">
        <div class="cc-header">
            <div class="cc-header-info">
                ${s?'<button class="btn-secondary btn-sm" id="cc-cancel-edit" style="margin-right:0.5rem;font-size:0.7rem;">← Back to Sheet</button>':""}
                <input type="text" id="cc-name" class="cc-name-input" value="${a.name}" placeholder="Character Name...">
                <span class="cc-header-detail">${s?"✏️ Editing · ":""}${a.race} ${a.class_} ${a.level}</span>
            </div>
            <div class="cc-header-right">
                <select id="cc-race" class="cc-header-select">${q.map(c=>`<option value="${c.name}" ${a.race===c.name?"selected":""}>${c.name}${c._isHomebrew?" ✨":""}</option>`).join("")}</select>
                <select id="cc-alignment" class="cc-header-select">${Cs.map(c=>`<option value="${c}" ${a.alignment===c?"selected":""}>${c}</option>`).join("")}</select>
            </div>
        </div>
        <div class="cc-tabs" id="cc-tabs">
            ${["class","abilities","skills","feats","features","review"].map(c=>`<button class="cc-tab ${a.tab===c?"active":""}" data-tab="${c}">${{class:"⚔️ Class",abilities:"📊 Abilities",skills:"📜 Skills",feats:"🏅 Feats",features:"✨ Features",review:"✅ Review"}[c]}</button>`).join("")}
        </div>
        <div class="cc-body" id="cc-body"></div>
    </div>`,Ts(e),Is(e),s&&((i=e.querySelector("#cc-cancel-edit"))==null||i.addEventListener("click",()=>{a._onEditCancel&&a._onEditCancel()}))}function Is(e){var a,s,l,n;(a=e.querySelector("#cc-name"))==null||a.addEventListener("input",i=>{t.name=i.target.value.trim(),bs(e)}),(s=e.querySelector("#cc-race"))==null||s.addEventListener("change",i=>{t.race=i.target.value,Z(e)}),(l=e.querySelector("#cc-alignment"))==null||l.addEventListener("change",i=>{t.alignment=i.target.value}),(n=e.querySelector("#cc-tabs"))==null||n.addEventListener("click",i=>{const c=i.target.closest(".cc-tab");c&&(t.tab=c.dataset.tab,Z(e))})}function Z(e){Fs(e)}function bs(e){const a=e.querySelector(".cc-header-detail");a&&(a.textContent=`${t.race} ${t.class_} ${t.level}`)}function Ts(e){const a=e.querySelector("#cc-body");if(a)switch(t.tab){case"class":ss(a,e);break;case"abilities":O(a);break;case"skills":U(a);break;case"feats":X(a);break;case"features":qs(a);break;case"review":Ns(a);break}}function ss(e,a){var u,p,b,d;const s=t,l=F(s.class_),n=I(s.race),i=G(n);let c=L.filter(r=>!(J(r.name)&&!s.showNpcClasses||!J(r.name)&&!s.showPcClasses));e.innerHTML=`
    <div class="cc-class-layout">
        <div class="cc-class-left">
            <div class="cc-filter-row">
                <label class="cc-checkbox"><input type="checkbox" id="cc-filter-pc" ${s.showPcClasses?"checked":""}> PC Classes</label>
                <label class="cc-checkbox"><input type="checkbox" id="cc-filter-npc" ${s.showNpcClasses?"checked":""}> NPC Classes</label>
            </div>
            <div class="cc-class-list" id="cc-class-list">
                ${c.map(r=>`
                    <div class="cc-class-item ${s.class_===r.name?"selected":""}" data-class="${r.name}">
                        <span class="cc-class-item-name">${r.name}${r._isHomebrew?' <span class="cc-homebrew-badge">✨ Homebrew</span>':""}</span>
                        <span class="cc-class-item-hd">${r.hit_die}</span>
                    </div>
                `).join("")}
            </div>
        </div>
        <div class="cc-class-right">
            <div class="cc-class-info">
                <div class="cc-info-row">
                    <span class="cc-info-label">Class Selected:</span>
                    <span class="cc-info-value">${l.name} (${l.hit_die})</span>
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
                    <span class="cc-info-value">${l.bab_type||"—"}</span>
                </div>
                <div class="cc-info-row">
                    <span class="cc-info-label">Good Saves:</span>
                    <span class="cc-info-value">${l.good_saves||"None"}</span>
                </div>
                <div class="cc-info-row">
                    <span class="cc-info-label">Skills/Level:</span>
                    <span class="cc-info-value">${l.skills_per_level||2} + INT mod</span>
                </div>
            </div>
            <div class="cc-race-traits">
                <h4>📋 ${n.name} Traits</h4>
                <div class="cc-traits-grid">
                    <span>Size: <strong>${n.size||"Medium"}</strong></span>
                    <span>Speed: <strong>${parseInt(n.speed)||30} ft</strong></span>
                    ${Object.entries(i).length?`<span>Ability Mods: <strong>${Object.entries(i).map(([r,v])=>`${h(v)} ${es[r]}`).join(", ")}</strong></span>`:"<span>No ability adjustments</span>"}
                    <span>Languages: <strong>${(n.languages||"Common").split(",").map(r=>r.trim()).join(", ")}</strong></span>
                </div>
            </div>
            <div class="cc-class-desc">
                <h4>📖 ${l.name}</h4>
                <p>${l.class_features||"No description available."}</p>
            </div>
        </div>
    </div>`,e.querySelector("#cc-class-list").addEventListener("click",r=>{const v=r.target.closest(".cc-class-item");v&&(s.class_=v.dataset.class,Z(a))}),(u=e.querySelector("#cc-level"))==null||u.addEventListener("input",r=>{s.level=Math.max(1,Math.min(20,parseInt(r.target.value)||1)),bs(a)}),(p=e.querySelector("#cc-gender"))==null||p.addEventListener("change",r=>{s.gender=r.target.value}),(b=e.querySelector("#cc-filter-pc"))==null||b.addEventListener("change",r=>{s.showPcClasses=r.target.checked,ss(e,a)}),(d=e.querySelector("#cc-filter-npc"))==null||d.addEventListener("change",r=>{s.showNpcClasses=r.target.checked,ss(e,a)})}function O(e,a){const s=t,l=I(s.race),n=F(s.class_),i=G(l),c=as(n),u=ts(n),p=s.level,b=25;let d=0;P.forEach(f=>{d+=cs[s.abilities[f]]||0});const r=b-d,v=E("con"),m=E("dex"),k=$(v),_=$(m),S=c+k,x=Math.max(1,S+(p-1)*Math.max(1,Math.floor(c/2+1)+k))+g("hp"),C=Y(s.class_,p)+g("attack"),A=10+_+((l.size||"Medium")==="Small"?1:0)+g("ac"),N=T(p,u.includes("fort"))+$(E("con"))+g("save","fort"),H=T(p,u.includes("ref"))+$(E("dex"))+g("save","ref"),j=T(p,u.includes("will"))+$(E("wis"))+g("save","will"),R=_+g("initiative");e.innerHTML=`
    <div class="cc-abilities-layout">
        <div class="cc-method-toggle">
            <button class="cc-method-btn ${s.abilityMethod==="pointbuy"?"active":""}" data-method="pointbuy">Point Buy (25)</button>
            <button class="cc-method-btn ${s.abilityMethod==="standard"?"active":""}" data-method="standard">Standard Array</button>
            <button class="cc-method-btn ${s.abilityMethod==="manual"?"active":""}" data-method="manual">Manual Entry</button>
        </div>
        ${s.abilityMethod==="pointbuy"?`<div class="cc-points-bar">Points: <strong class="${r<0?"text-danger":r===0?"text-success":""}">${r}</strong> / ${b}</div>`:""}

        <div class="cc-ability-grid">
            ${P.map(f=>{const w=s.abilities[f],o=i[f]||0,y=g("ability",f==="int_"?"int":f),D=w+o+y,B=$(D),z=cs[w]||0;return`<div class="cc-ability-card">
                    <div class="cc-ab-label">${es[f]}</div>
                    <div class="cc-ab-controls">
                        ${s.abilityMethod!=="manual"?`<button class="cc-ab-btn cc-ab-minus" data-ab="${f}" ${w<=7?"disabled":""}>−</button>`:""}
                        <input type="number" class="cc-ab-input" data-ab="${f}" value="${w}" min="3" max="18" ${s.abilityMethod==="pointbuy"?"readonly":""}>
                        ${s.abilityMethod!=="manual"?`<button class="cc-ab-btn cc-ab-plus" data-ab="${f}" ${w>=18?"disabled":""}>+</button>`:""}
                    </div>
                    ${o||y?`<div class="cc-ab-race">${o?h(o)+" racial":""}${o&&y?", ":""}${y?h(y)+" feat":""}</div>`:'<div class="cc-ab-race">&nbsp;</div>'}
                    <div class="cc-ab-final"><span class="cc-ab-total">${D}</span><span class="cc-ab-mod">${h(B)}</span></div>
                    ${s.abilityMethod==="pointbuy"?`<div class="cc-ab-cost">Cost: ${z}</div>`:""}
                </div>`}).join("")}
        </div>

        <div class="cc-stats-row">
            <div class="cc-stat-box cc-stat-hp"><div class="cc-stat-label">HP</div><div class="cc-stat-val">${x}</div><div class="cc-stat-detail">${n.hit_die}+${h(k)}/lvl</div></div>
            <div class="cc-stat-box"><div class="cc-stat-label">AC</div><div class="cc-stat-val">${A}</div></div>
            <div class="cc-stat-box"><div class="cc-stat-label">BAB</div><div class="cc-stat-val">+${C}</div></div>
            <div class="cc-stat-box"><div class="cc-stat-label">Fort</div><div class="cc-stat-val">${h(N)}</div></div>
            <div class="cc-stat-box"><div class="cc-stat-label">Ref</div><div class="cc-stat-val">${h(H)}</div></div>
            <div class="cc-stat-box"><div class="cc-stat-label">Will</div><div class="cc-stat-val">${h(j)}</div></div>
            <div class="cc-stat-box"><div class="cc-stat-label">Init</div><div class="cc-stat-val">${h(R)}</div></div>
        </div>
    </div>`,e.querySelectorAll(".cc-method-btn").forEach(f=>f.addEventListener("click",()=>{s.abilityMethod=f.dataset.method,f.dataset.method==="standard"&&P.forEach((w,o)=>{s.abilities[w]=Ms[o]}),O(e)})),e.querySelectorAll(".cc-ab-minus").forEach(f=>f.addEventListener("click",()=>{const w=f.dataset.ab;s.abilities[w]>7&&(s.abilities[w]--,O(e))})),e.querySelectorAll(".cc-ab-plus").forEach(f=>f.addEventListener("click",()=>{const w=f.dataset.ab;s.abilities[w]<18&&(s.abilities[w]++,O(e))})),s.abilityMethod==="manual"&&e.querySelectorAll(".cc-ab-input").forEach(f=>f.addEventListener("change",()=>{s.abilities[f.dataset.ab]=Math.max(3,Math.min(18,parseInt(f.value)||10)),O(e)}))}function U(e,a){var r;const s=t,l=F(s.class_),n=ls(l),i=ns(),c=os(),u=i-c,p=K(s.level,!0),b=K(s.level,!1);let d=[...W];s.showAllSkills||(d=d.filter(v=>n.includes(v.name))),e.innerHTML=`
    <div class="cc-skills-layout">
        <div class="cc-skills-header">
            <div class="cc-skills-points">
                Skill Points: <strong class="${u<0?"text-danger":u===0?"text-success":""}">${u}</strong> / ${i}
                <span class="cc-skills-hint">(Class max: ${p}, Cross-class max: ${b})</span>
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
            ${d.map(v=>{const m=n.includes(v.name),k=s.skillRanks[v.name]||0,_=m?p:b,S=v.ability.toLowerCase()==="int"?"int_":v.ability.toLowerCase(),x=$(E(S)),C=g("skill",v.name),A=k+x+C;return`<div class="cc-skill-row ${m?"cc-skill-class":"cc-skill-cross"} ${k>0?"cc-skill-active":""}">
                    <span class="cc-skill-name" title="${v.trained_only?"Trained only":""}">
                        ${v.name}${v.trained_only?" *":""}
                    </span>
                    <span class="cc-skill-ab">${v.ability}</span>
                    <span class="cc-skill-isclass">${m?"✓":""}</span>
                    <span class="cc-skill-ranks">
                        <button class="cc-sk-btn cc-sk-minus" data-skill="${v.name}" ${k<=0?"disabled":""}>−</button>
                        <span class="cc-sk-val">${k}</span>
                        <button class="cc-sk-btn cc-sk-plus" data-skill="${v.name}" ${k>=_||u<=0?"disabled":""}>+</button>
                    </span>
                    <span class="cc-skill-total ${A>=0?"":"text-danger"}">${h(A)}${C?` <span class="cc-mod-badge cc-mod-skill" style="font-size:.55rem">${h(C)} feat</span>`:""}</span>
                </div>`}).join("")}
        </div>
        <div class="cc-skills-footer">* = Trained only skill</div>
    </div>`,(r=e.querySelector("#cc-skills-filter"))==null||r.addEventListener("change",v=>{s.showAllSkills=v.target.checked,U(e)}),e.querySelectorAll(".cc-sk-minus").forEach(v=>v.addEventListener("click",()=>{const m=v.dataset.skill;(s.skillRanks[m]||0)>0&&(s.skillRanks[m]=(s.skillRanks[m]||0)-1,U(e))})),e.querySelectorAll(".cc-sk-plus").forEach(v=>v.addEventListener("click",()=>{const m=v.dataset.skill,k=F(s.class_),S=ls(k).includes(m)?K(s.level,!0):K(s.level,!1),x=s.skillRanks[m]||0;x<S&&os()<ns()&&(s.skillRanks[m]=x+1,U(e))}))}function rs(e){const a=(e.prerequisites||"").trim();if(!a||a==="None")return!0;const s=a.match(/(Str|Dex|Con|Int|Wis|Cha)\s+(\d+)/gi);if(s)for(const i of s){const[c,u,p]=i.match(/(Str|Dex|Con|Int|Wis|Cha)\s+(\d+)/i),b=u.toLowerCase()==="int"?"int_":u.toLowerCase();if(E(b)<parseInt(p))return!1}const l=a.match(/BAB\s*\+?(\d+)/i);if(l&&Y(t.class_,t.level)<parseInt(l[1]))return!1;const n=a.split(",").map(i=>i.trim()).filter(i=>!i.match(/^(Str|Dex|Con|Int|Wis|Cha|BAB|None)/i)&&i.length>2);for(const i of n){const c=i.replace(/\s*\d+.*$/,"").trim();if(c&&!t.selectedFeats.includes(c)&&!t.selectedFeats.some(u=>u.toLowerCase()===c.toLowerCase())&&!c.match(/^(Fighter|Ranger|Rogue|Cleric|Wizard|Sorcerer|Bard|Druid|Monk|Paladin|Barbarian|Turn|Rebuke)/i))return!1}return!0}function X(e,a){var b;const s=t,l=I(s.race);F(s.class_);const n=s.class_==="Fighter",i=l.name==="Human",c=1+Math.floor(s.level/3)+(i?1:0)+(n?1+Math.floor(s.level/2):0),u=c-s.selectedFeats.length;let p=[...V];s.showAllFeats||(p=p.filter(d=>rs(d))),e.innerHTML=`
    <div class="cc-feats-layout">
        <div class="cc-feats-header">
            <div class="cc-feats-slots">
                Feat Slots: <strong class="${u<0?"text-danger":u===0?"text-success":""}">${u}</strong> / ${c}
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
            ${s.selectedFeats.length?`<div class="cc-feat-tags">${s.selectedFeats.map(d=>`<span class="cc-feat-tag">${d} <button class="cc-feat-remove" data-feat="${d}">✕</button></span>`).join("")}</div>`:'<p class="text-muted" style="font-size:0.8rem">No feats selected yet.</p>'}
        </div>
        <div class="cc-feats-table">
            <div class="cc-feat-header-row">
                <span class="cc-feat-h-name">Feat</span>
                <span class="cc-feat-h-type">Type</span>
                <span class="cc-feat-h-prereq">Prerequisites</span>
                <span class="cc-feat-h-add"></span>
            </div>
            ${p.map(d=>{const r=rs(d),v=s.selectedFeats.includes(d.name),m=Es(d),k=m.length?m.map(_=>Ls(_)).join(" "):"";return`<div class="cc-feat-row ${r?"":"cc-feat-unqualified"} ${v?"cc-feat-selected":""}">
                    <span class="cc-feat-name">${d.name}${d._isHomebrew?' <span class="cc-homebrew-badge">✨</span>':""}${k?`<span class="cc-feat-mods">${k}</span>`:""}</span>
                    <span class="cc-feat-type">${d.type||"General"}</span>
                    <span class="cc-feat-prereq">${d.prerequisites||"None"}</span>
                    <span class="cc-feat-action">
                        ${v?'<span class="cc-feat-check">✓</span>':`<button class="cc-feat-add-btn" data-feat="${d.name}" ${!r||u<=0?"disabled":""}>+</button>`}
                    </span>
                </div>`}).join("")}
        </div>
    </div>`,(b=e.querySelector("#cc-feats-filter"))==null||b.addEventListener("change",d=>{s.showAllFeats=d.target.checked,X(e)}),e.querySelectorAll(".cc-feat-add-btn").forEach(d=>d.addEventListener("click",()=>{s.selectedFeats.includes(d.dataset.feat)||(s.selectedFeats.push(d.dataset.feat),X(e))})),e.querySelectorAll(".cc-feat-remove").forEach(d=>d.addEventListener("click",()=>{s.selectedFeats=s.selectedFeats.filter(r=>r!==d.dataset.feat),X(e)}))}function qs(e){const a=F(t.class_),s=I(t.race);e.innerHTML=`
    <div class="cc-features-layout">
        <div class="cc-features-section">
            <h3>⚔️ ${a.name} Class Features</h3>
            <p>${a.class_features||"No class features described."}</p>
            <div class="cc-features-info">
                <div class="cc-fi-row"><span>Hit Die:</span> <strong>${a.hit_die}</strong></div>
                <div class="cc-fi-row"><span>BAB:</span> <strong>${a.bab_type}</strong></div>
                <div class="cc-fi-row"><span>Good Saves:</span> <strong>${a.good_saves||"None"}</strong></div>
                <div class="cc-fi-row"><span>Skill Points:</span> <strong>${a.skills_per_level} + INT per level</strong></div>
                <div class="cc-fi-row"><span>Class Skills:</span> <strong>${a.class_skills||"—"}</strong></div>
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
    </div>`}function Ns(e,a){var A,N,H,j,R,f,w;const s=t,l=I(s.race),n=F(s.class_);G(l);const i=as(n),c=ts(n),u=s.level,p={};P.forEach(o=>{p[o]=E(o)});const b=$(p.con),d=$(p.dex),r=i+b,v=Math.max(1,r+(u-1)*Math.max(1,Math.floor(i/2+1)+b))+g("hp"),m=Y(s.class_,u)+g("attack"),k=10+d+((l.size||"Medium")==="Small"?1:0)+g("ac"),_=T(u,c.includes("fort"))+$(p.con)+g("save","fort"),S=T(u,c.includes("ref"))+$(p.dex)+g("save","ref"),x=T(u,c.includes("will"))+$(p.wis)+g("save","will"),C=Object.entries(s.skillRanks).filter(([,o])=>o>0).map(([o,M])=>{const y=W.find(z=>z.name===o),D=y?y.ability.toLowerCase()==="int"?"int_":y.ability.toLowerCase():"str",B=g("skill",o);return`${o} +${M+$(E(D))+B}`}).join(", ")||"None";e.innerHTML=`
    <div class="cc-review-layout">
        <div class="cc-review-card">
            <div class="cc-review-header">
                <h2>${s.name||"Unnamed Character"}</h2>
                <div class="cc-review-subtitle">${s.gender?s.gender+" ":""}${s.race} ${s.class_} ${u} · ${s.alignment}</div>
            </div>
            <div class="cc-stats-row" style="margin:1rem 0">
                <div class="cc-stat-box cc-stat-hp"><div class="cc-stat-label">HP</div><div class="cc-stat-val">${v}</div></div>
                <div class="cc-stat-box"><div class="cc-stat-label">AC</div><div class="cc-stat-val">${k}</div></div>
                ${P.map(o=>`<div class="cc-stat-box"><div class="cc-stat-label">${es[o]}</div><div class="cc-stat-val">${p[o]}</div><div class="cc-stat-detail">${h($(p[o]))}</div></div>`).join("")}
            </div>
            <div class="cc-review-stats">
                <span>BAB: <strong>+${m}</strong></span>
                <span>Init: <strong>${h(d+g("initiative"))}</strong></span>
                <span>Speed: <strong>${(parseInt(l.speed)||30)+g("speed")} ft</strong></span>
                <span>Fort: <strong>${h(_)}</strong></span>
                <span>Ref: <strong>${h(S)}</strong></span>
                <span>Will: <strong>${h(x)}</strong></span>
            </div>
            ${s.selectedFeats.length?`<div class="cc-review-section"><strong>Feats:</strong> ${s.selectedFeats.join(", ")}</div>`:""}
            ${C!=="None"?`<div class="cc-review-section"><strong>Skills:</strong> ${C}</div>`:""}
            <div class="cc-review-section">
                <label><strong>Equipment & Gear:</strong></label>
                <textarea id="cc-gear" class="form-input" rows="2" placeholder="List gear...">${s.gear}</textarea>
            </div>
            <div class="cc-review-section">
                <label><strong>Languages:</strong></label>
                <input type="text" id="cc-languages" class="form-input" value="${s.languages||(l.languages||"Common").split(",").map(o=>o.trim()).join(", ")}">
            </div>
            <div class="cc-review-section">
                <label><strong>Background / History:</strong></label>
                <textarea id="cc-history" class="form-input" rows="3" placeholder="Brief background...">${s.history}</textarea>
            </div>
            ${s._editMode?`
                <div class="cc-review-section">
                    <label><strong>Status:</strong></label>
                    <select id="cc-edit-status" class="form-select" style="max-width:200px">
                        ${["Alive","Deceased","Missing","Imprisoned"].map(o=>`<option ${s._editStatus===o?"selected":""}>${o}</option>`).join("")}
                    </select>
                </div>
                <div class="cc-review-section">
                    <label><strong>Town Role:</strong></label>
                    <input type="text" id="cc-edit-role" class="form-input" value="${s._editRole}" placeholder="e.g. Blacksmith, Guard...">
                </div>
                ${s._editPortraitUrl?`<div class="cc-review-section"><strong>Portrait:</strong> <img src="${s._editPortraitUrl}" style="width:48px;height:auto;border-radius:4px;vertical-align:middle;margin-left:6px" alt="portrait"></div>`:""}
            `:'<div class="cc-review-town">🏕️ Saving to: <strong>Party Camp</strong></div>'}
        </div>
        <div class="cc-review-actions">
            ${s._editMode?`<button class="btn-secondary btn-lg" id="cc-cancel-edit-btn">Cancel</button>
                   <button class="btn-primary btn-lg" id="cc-save-edit-btn" ${s.name?"":"disabled"}>💾 Save Changes</button>`:`<button class="btn-primary btn-lg" id="cc-create-btn" ${s.name?"":"disabled"}>🎲 Create & Add to Party</button>`}
        </div>
    </div>`,(A=e.querySelector("#cc-gear"))==null||A.addEventListener("input",o=>{s.gear=o.target.value.trim()}),(N=e.querySelector("#cc-languages"))==null||N.addEventListener("input",o=>{s.languages=o.target.value.trim()}),(H=e.querySelector("#cc-history"))==null||H.addEventListener("input",o=>{s.history=o.target.value.trim()}),s._editMode&&((j=e.querySelector("#cc-edit-status"))==null||j.addEventListener("change",o=>{s._editStatus=o.target.value}),(R=e.querySelector("#cc-edit-role"))==null||R.addEventListener("input",o=>{s._editRole=o.target.value.trim()}),(f=e.querySelector("#cc-cancel-edit-btn"))==null||f.addEventListener("click",()=>{s._onEditCancel&&s._onEditCancel()}),(w=e.querySelector("#cc-save-edit-btn"))==null||w.addEventListener("click",async()=>{const o=e.querySelector("#cc-save-edit-btn");o&&(o.disabled=!0,o.textContent="⏳ Saving...");try{const M=Rs();M.id=s._editId,M.status=s._editStatus,M.role=s._editRole,M.portrait_url=s._editPortraitUrl,M.xp=s._editXp,s._editAge!=null&&(M.age=s._editAge),await Ss(s._editTownId,M),s._onEditComplete&&s._onEditComplete()}catch(M){alert("Save failed: "+M.message),o&&(o.disabled=!1,o.textContent="💾 Save Changes")}}))}function Rs(){const e=t,a=I(e.race),s=F(e.class_);G(a);const l=as(s),n=ts(s),i=e.level,c={};P.forEach(y=>{c[y]=E(y)});const u=$(c.str),p=$(c.con),b=$(c.dex),d=l+p,r=Math.max(1,d+(i-1)*Math.max(1,Math.floor(l/2+1)+p))+g("hp"),v=Y(e.class_,i)+g("attack"),m=(a.size||"Medium")==="Small",k=m?1:0,_=10+b+k+g("ac"),S=T(i,n.includes("fort"))+$(c.con)+g("save","fort"),x=T(i,n.includes("ref"))+$(c.dex)+g("save","ref"),C=T(i,n.includes("will"))+$(c.wis)+g("save","will"),N=Object.entries(e.skillRanks).filter(([,y])=>y>0).map(([y,D])=>{const B=W.find(ks=>ks.name===y),z=B?B.ability.toLowerCase()==="int"?"int_":B.ability.toLowerCase():"str",hs=g("skill",y),$s=D+$(c[z]||10)+hs;return`${y} ${h($s)}`}).join(", ")||"",H=v+u+(m?-4:0),j={Human:[15,35],Elf:[110,200],Dwarf:[40,100],Gnome:[40,100],Halfling:[20,50],"Half-Elf":[20,60],"Half-Orc":[14,30]},[R,f]=j[e.race]||[18,40],w=Math.floor(Math.random()*(f-R+1))+R,M=["Commoner","Expert","Warrior","Adept","Aristocrat"].includes(e.class_)?i<=1?"1/2":String(i-1):String(i);return{name:e.name,race:e.race,class:`${e.class_} ${i}`,status:"Alive",gender:e.gender,alignment:e.alignment,age:w,hp:r,hd:`${i}${s.hit_die}`,ac:`${_}, touch ${10+b+k}, flat-footed ${_-b}`,init:`${h(b+g("initiative"))}`,spd:`${(parseInt(a.speed)||30)+g("speed")} ft`,grapple:`${h(H)}`,atk:`Melee: ${h(v+u)} (weapon)`,saves:`Fort ${h(S)}, Ref ${h(x)}, Will ${h(C)}`,str:c.str,dex:c.dex,con:c.con,int_:c.int_,wis:c.wis,cha:c.cha,languages:e.languages||(a.languages||"Common").split(",").map(y=>y.trim()).join(", "),skills_feats:N,feats:e.selectedFeats.join(", "),gear:e.gear,history:e.history,role:"Player Character",xp:0,cr:M}}function Ds(){return t}export{Rs as getCharacterData,Ds as getCreatorState,Ps as initCreator,Hs as initCreatorFromCharacter,Fs as renderCreator,js as resetCreatorState};
