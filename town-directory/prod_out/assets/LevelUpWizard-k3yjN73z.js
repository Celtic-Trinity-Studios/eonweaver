import{s as R,y as j,z as D,A as H,B as _}from"./index-DC0rDkAm.js";import{a as k,c as C,g as N,d as x,i as G,e as U,f as z,h as W,j as O,k as J}from"./classData35e-ZsD8k0RV.js";import{g as F,F as T}from"./featData35e-CXgV1EMm.js";const L={"Arcane Archer":{hitDie:8,babType:"full",goodSaves:["fort","ref"],skillsPerLevel:4,maxLevel:10,prereqs:{bab:6,feats:["Point Blank Shot","Precise Shot","Weapon Focus (longbow)"],race:["Elf","Half-Elf"],spellAbility:"Must be able to cast 1st-level arcane spells"},description:"Masters of ranged combat who imbue arrows with magical power.",features:[{level:1,name:"Enhance Arrow +1"},{level:2,name:"Imbue Arrow"},{level:3,name:"Enhance Arrow +2"},{level:4,name:"Seeker Arrow"},{level:5,name:"Enhance Arrow +3"},{level:6,name:"Phase Arrow"},{level:7,name:"Enhance Arrow +4"},{level:8,name:"Hail of Arrows"},{level:9,name:"Enhance Arrow +5"},{level:10,name:"Arrow of Death"}]},"Arcane Trickster":{hitDie:4,babType:"1/2",goodSaves:["ref","will"],skillsPerLevel:4,maxLevel:10,prereqs:{alignment:"Nonlawful",skills:{"decipher script":7,"disable device":7,"escape artist":7,"knowledge (arcana)":4},spellAbility:"Able to cast mage hand and 3rd-level arcane spells",classFeatures:["Sneak Attack +2d6"]},description:"Rogues who supplement their natural cunning with arcane magic.",features:[{level:1,name:"Ranged Legerdemain",spellProgression:!0},{level:2,name:"Sneak Attack +1d6",spellProgression:!0},{level:3,name:"Impromptu Sneak Attack 1/day",spellProgression:!0},{level:5,name:"Sneak Attack +2d6",spellProgression:!0},{level:7,name:"Impromptu Sneak Attack 2/day",spellProgression:!0},{level:8,name:"Sneak Attack +3d6",spellProgression:!0}]},Assassin:{hitDie:6,babType:"3/4",goodSaves:["ref"],skillsPerLevel:4,maxLevel:10,prereqs:{alignment:"Evil",skills:{disguise:4,hide:8,"move silently":8},special:"Must kill someone for no other reason than joining the assassins"},description:"Professional killers who study the art of death.",features:[{level:1,name:"Sneak Attack +1d6, Death Attack, Poison Use, Spells"},{level:2,name:"+1 save vs poison, Uncanny Dodge"},{level:3,name:"Sneak Attack +2d6"},{level:4,name:"+2 save vs poison"},{level:5,name:"Sneak Attack +3d6, Improved Uncanny Dodge"},{level:6,name:"+3 save vs poison"},{level:7,name:"Sneak Attack +4d6"},{level:8,name:"+4 save vs poison, Hide in Plain Sight"},{level:9,name:"Sneak Attack +5d6"},{level:10,name:"+5 save vs poison"}]},Blackguard:{hitDie:10,babType:"full",goodSaves:["fort"],skillsPerLevel:2,maxLevel:10,prereqs:{bab:6,alignment:"Evil",skills:{hide:5,"knowledge (religion)":2},feats:["Cleave","Improved Sunder","Power Attack"]},description:"Fallen paladins and evil champions who serve dark powers.",features:[{level:1,name:"Aura of Evil, Detect Good, Poison Use"},{level:2,name:"Dark Blessing, Smite Good 1/day"},{level:3,name:"Aura of Despair, Command Undead"},{level:4,name:"Sneak Attack +1d6"},{level:5,name:"Fiendish Servant, Smite Good 2/day"},{level:7,name:"Sneak Attack +2d6"},{level:10,name:"Sneak Attack +3d6, Smite Good 3/day"}]},"Dragon Disciple":{hitDie:12,babType:"3/4",goodSaves:["fort","will"],skillsPerLevel:2,maxLevel:10,prereqs:{race:"Non-dragon",spellAbility:"Able to cast arcane spells without preparation (Sorcerer or Bard)",languages:["Draconic"]},description:"Sorcerers who embrace their draconic heritage.",features:[{level:1,name:"Natural Armor +1"},{level:2,name:"Str +2, Claws and Bite"},{level:3,name:"Breath Weapon (2d8)"},{level:4,name:"Str +2, Natural Armor +1"},{level:5,name:"Blindsense 30ft"},{level:6,name:"Con +2"},{level:7,name:"Breath Weapon (4d8), Natural Armor +1"},{level:8,name:"Int +2"},{level:9,name:"Wings"},{level:10,name:"Blindsense 60ft, Dragon Apotheosis"}]},Duelist:{hitDie:10,babType:"full",goodSaves:["ref"],skillsPerLevel:4,maxLevel:10,prereqs:{bab:6,skills:{perform:3,tumble:5},feats:["Dodge","Mobility","Weapon Finesse"]},description:"Agile sword fighters who rely on speed and precision.",features:[{level:1,name:"Canny Defense"},{level:2,name:"Improved Reaction +2, Parry"},{level:3,name:"Enhanced Mobility"},{level:4,name:"Grace"},{level:5,name:"Precise Strike +1d6"},{level:6,name:"Acrobatic Charge"},{level:7,name:"Elaborate Parry"},{level:8,name:"Improved Reaction +4"},{level:9,name:"Deflect Arrows"},{level:10,name:"Precise Strike +2d6, Crippling Strike"}]},"Dwarven Defender":{hitDie:12,babType:"full",goodSaves:["fort","will"],skillsPerLevel:2,maxLevel:10,prereqs:{alignment:"Lawful",bab:7,race:["Dwarf"],feats:["Dodge","Endurance","Toughness"]},description:"Dwarven warriors who specialize in holding positions.",features:[{level:1,name:"Defensive Stance 1/day"},{level:2,name:"Uncanny Dodge"},{level:3,name:"Defensive Stance 2/day"},{level:4,name:"Trap Sense +1"},{level:5,name:"Defensive Stance 3/day"},{level:6,name:"Improved Uncanny Dodge, DR 3/-"},{level:7,name:"Defensive Stance 4/day"},{level:8,name:"Trap Sense +2, Mobile Defense"},{level:9,name:"Defensive Stance 5/day"},{level:10,name:"DR 6/-"}]},"Eldritch Knight":{hitDie:6,babType:"full",goodSaves:["fort"],skillsPerLevel:2,maxLevel:10,prereqs:{feats:["Martial Weapon Proficiency"],spellAbility:"Able to cast 3rd-level arcane spells"},description:"Fighters who wield both blade and spell.",features:[{level:1,name:"Bonus Feat"},{level:2,name:"Spellcasting (+1 existing class)",spellProgression:!0}]},Hierophant:{hitDie:8,babType:"1/2",goodSaves:["fort","will"],skillsPerLevel:2,maxLevel:5,prereqs:{feats:["any metamagic or item creation feat"],spellAbility:"Able to cast 7th-level divine spells"},description:"Divine spellcasters who transcend mortal limits.",features:[{level:1,name:"Special Ability",spellProgression:!0},{level:2,name:"Special Ability",spellProgression:!0},{level:3,name:"Special Ability",spellProgression:!0},{level:4,name:"Special Ability",spellProgression:!0},{level:5,name:"Special Ability",spellProgression:!0}]},Loremaster:{hitDie:4,babType:"1/2",goodSaves:["will"],skillsPerLevel:4,maxLevel:10,prereqs:{skills:{"knowledge (any two)":10},feats:["any three metamagic or item creation feats"],spellAbility:"Able to cast 7 different divination spells"},description:"Seekers of ancient knowledge and forgotten lore.",features:[{level:1,name:"Secret",spellProgression:!0},{level:2,name:"Lore",spellProgression:!0},{level:3,name:"Secret",spellProgression:!0},{level:4,name:"Bonus Language",spellProgression:!0},{level:5,name:"Secret",spellProgression:!0},{level:6,name:"Greater Lore",spellProgression:!0},{level:7,name:"Secret",spellProgression:!0},{level:8,name:"Bonus Language",spellProgression:!0},{level:9,name:"Secret",spellProgression:!0},{level:10,name:"True Lore",spellProgression:!0}]},"Mystic Theurge":{hitDie:4,babType:"1/2",goodSaves:["will"],skillsPerLevel:2,maxLevel:10,prereqs:{spellAbility:"Able to cast 2nd-level divine spells AND 2nd-level arcane spells"},description:"Masters of both arcane and divine magic.",features:[{level:1,name:"+1 arcane / +1 divine spellcasting",dualProgression:!0}]},Shadowdancer:{hitDie:8,babType:"3/4",goodSaves:["ref"],skillsPerLevel:6,maxLevel:10,prereqs:{skills:{"move silently":8,hide:10,"perform (dance)":5},feats:["Dodge","Mobility","Combat Reflexes"]},description:"Warriors of shadow who blend martial skill with dark magic.",features:[{level:1,name:"Hide in Plain Sight"},{level:2,name:"Evasion, Darkvision, Uncanny Dodge"},{level:3,name:"Shadow Illusion, Summon Shadow"},{level:4,name:"Shadow Jump 20ft"},{level:5,name:"Defensive Roll, Improved Uncanny Dodge"},{level:6,name:"Shadow Jump 40ft, Summon Shadow (2)"},{level:7,name:"Slippery Mind"},{level:8,name:"Shadow Jump 80ft"},{level:9,name:"Summon Shadow (3)"},{level:10,name:"Shadow Jump 160ft, Improved Evasion"}]},Thaumaturgist:{hitDie:4,babType:"1/2",goodSaves:["will"],skillsPerLevel:2,maxLevel:5,prereqs:{feats:["Spell Focus (Conjuration)"],spellAbility:"Able to cast lesser planar ally"},description:"Specialists in summoning extraplanar creatures.",features:[{level:1,name:"Improved Ally",spellProgression:!0},{level:2,name:"Augment Summoning",spellProgression:!0},{level:3,name:"Extended Summoning",spellProgression:!0},{level:4,name:"Contingent Conjuration",spellProgression:!0},{level:5,name:"Planar Cohort",spellProgression:!0}]}};function X(){return Object.keys(L)}function Y(l,e){var v;const i=L[l];if(!i)return{eligible:!1,missing:["Class not found"]};const s=i.prereqs,a=[];if(s.bab&&(e.bab||0)<s.bab&&a.push(`BAB +${s.bab}+`),s.alignment){const r=(e.alignment||"").toLowerCase(),n=s.alignment.toLowerCase();n==="evil"&&!r.includes("evil")&&a.push("Must be Evil alignment"),n==="lawful"&&!r.includes("lawful")&&a.push("Must be Lawful alignment"),n==="nonlawful"&&r.includes("lawful")&&a.push("Must be non-Lawful alignment")}if(s.race){const r=Array.isArray(s.race)?s.race:[s.race],n=(e.race||"").toLowerCase();r.some(c=>n===c.toLowerCase())||a.push(`Race: ${r.join(" or ")}`)}if(s.feats){const r=(e.feats||[]).map(n=>n.toLowerCase());for(const n of s.feats)r.some(c=>c.includes(n.toLowerCase()))||a.push(`Feat: ${n}`)}if(s.skills)for(const[r,n]of Object.entries(s.skills))(((v=e.skillRanks)==null?void 0:v[r.toLowerCase()])||0)<n&&a.push(`${r} ${n}+ ranks`);if(s.spellAbility&&a.push(`Spellcasting: ${s.spellAbility}`),s.classFeatures)for(const r of s.classFeatures)(e.classFeatures||[]).some(n=>n.toLowerCase().includes(r.toLowerCase()))||a.push(`Class Feature: ${r}`);return s.special&&a.push(`Special: ${s.special}`),{eligible:a.length===0,missing:a}}async function oe(l,e){const i=l.class||"",s=parseInt(l.level)||0,a=ie(i,s),v=a.reduce((t,o)=>t+o.level,0)||s,r=v+1,n=J(r),c=r%4===0,y={character:l,parsed:a,totalLevel:v,newTotalLevel:r,selectedClass:a.length===1?a[0].name:"",newClassLevel:0,hpRoll:0,hpGained:0,getsFeat:n,getsAbility:c,selectedFeat:"",selectedBonusFeat:"",abilityIncrease:"",skillAllocations:{},spellsChosen:[],currentStep:1,totalSteps:6},{el:u,close:g}=R({title:"🎯 Level Up — Level "+r,width:"wide",content:'<div id="levelup-wizard" class="levelup-wizard"></div>'}),b=u.querySelector("#levelup-wizard");S(b,y,g,e)}function S(l,e,i,s){var v,r,n;switch(e.currentStep){case 1:K(l,e);break;case 2:Q(l,e);break;case 3:V(l,e,i,s);break;case 4:Z(l,e,i,s);break;case 5:ee(l,e);break;case 6:le(l,e);break}const a=document.createElement("div");a.className="levelup-nav",a.innerHTML=`
    <div class="levelup-progress">
      ${[1,2,3,4,5,6].map(c=>`<div class="levelup-step-dot${c===e.currentStep?" active":""}${c<e.currentStep?" done":""}">${c}</div>`).join("")}
    </div>
    <div class="levelup-nav-buttons">
      ${e.currentStep>1?'<button class="btn-secondary btn-sm" id="luw-prev">← Back</button>':""}
      ${e.currentStep<e.totalSteps?'<button class="btn-primary btn-sm" id="luw-next">Next →</button>':""}
      ${e.currentStep===e.totalSteps?'<button class="btn-primary btn-sm" id="luw-apply" style="background:linear-gradient(135deg,#f5c518,#ff6b35);">⚡ Apply Level Up</button>':""}
    </div>
  `,l.appendChild(a),(v=a.querySelector("#luw-prev"))==null||v.addEventListener("click",()=>{e.currentStep--,l.innerHTML="",S(l,e,i,s)}),(r=a.querySelector("#luw-next"))==null||r.addEventListener("click",()=>{ae(e)&&(e.currentStep++,l.innerHTML="",S(l,e,i,s))}),(n=a.querySelector("#luw-apply"))==null||n.addEventListener("click",async()=>{const c=a.querySelector("#luw-apply");c.disabled=!0,c.textContent="Applying...";try{await se(e),i(),s&&s(e)}catch(y){alert("Level up failed: "+y.message),c.disabled=!1,c.textContent="⚡ Apply Level Up"}})}function K(l,e,i,s){const{parsed:a,character:v,newTotalLevel:r}=e,n=a.map(t=>t.name),c=["Barbarian","Bard","Cleric","Druid","Fighter","Monk","Paladin","Ranger","Rogue","Sorcerer","Wizard"],y=X();let u=`
    <div class="levelup-step">
      <h3>Step 1: Choose Class <span class="levelup-sublabel">(Character Level ${r})</span></h3>
      <div class="levelup-current-classes">
        <strong>Current:</strong> ${a.map(t=>`${t.name} ${t.level}`).join(" / ")||"None"}
      </div>

      <div class="levelup-class-section">
        <div class="levelup-section-title">Continue Existing Class</div>
        <div class="levelup-class-grid">
  `;for(const t of a){const o=k(t.name),f=e.selectedClass===t.name;u+=`
      <div class="levelup-class-card${f?" selected":""}" data-class="${t.name}">
        <div class="class-card-name">${t.name} ${t.level} → ${t.level+1}</div>
        <div class="class-card-info">HD: d${(o==null?void 0:o.hitDie)||"?"} | BAB: ${(o==null?void 0:o.babType)||"?"}</div>
      </div>
    `}u+="</div></div>";const g=c.filter(t=>!n.some(o=>o.toLowerCase()===t.toLowerCase()));if(g.length){u+=`
      <div class="levelup-class-section">
        <div class="levelup-section-title">Multiclass Into New Class</div>
        <div class="levelup-class-grid">
    `;for(const t of g){const o=k(t),f=e.selectedClass===t;u+=`
        <div class="levelup-class-card new${f?" selected":""}" data-class="${t}">
          <div class="class-card-name">${t} 1</div>
          <div class="class-card-info">HD: d${(o==null?void 0:o.hitDie)||"?"} | ${(o==null?void 0:o.babType)||"?"} BAB | ${(o==null?void 0:o.skillsPerLevel)||"?"} skill pts</div>
        </div>
      `}u+="</div></div>"}u+=`
    <div class="levelup-class-section">
      <div class="levelup-section-title">Prestige Classes</div>
      <div class="levelup-class-grid">
  `;for(const t of y){const o=L[t],{eligible:f,missing:p}=Y(t,E(e)),d=e.selectedClass===t;u+=`
      <div class="levelup-class-card prestige${d?" selected":""}${f?"":" ineligible"}" data-class="${t}" ${f?"":'title="Missing: '+p.join(", ")+'"'}>
        <div class="class-card-name">${t}${f?"":" 🔒"}</div>
        <div class="class-card-info">HD: d${o.hitDie} | ${o.babType} BAB</div>
        ${f?"":`<div class="class-card-missing">${p.slice(0,2).join(", ")}</div>`}
      </div>
    `}u+="</div></div></div>",u+='<div id="luw-xp-penalty" class="levelup-xp-penalty" style="display:none;"></div>',l.innerHTML=u;function b(){const t=l.querySelector("#luw-xp-penalty");if(!t)return;const o=[...e.parsed.map(p=>({name:p.name,level:p.level}))],f=o.find(p=>p.name.toLowerCase()===e.selectedClass.toLowerCase());if(f?f.level++:o.push({name:e.selectedClass,level:1}),o.length>=2){const p=_(o,e.character.race||"");p.hasPenalty?(t.style.display="",t.innerHTML=`⚠️ <strong>-${p.penaltyPercent}% XP Penalty:</strong> ${p.details}`):t.style.display="none"}else t.style.display="none"}if(l.querySelectorAll(".levelup-class-card:not(.ineligible)").forEach(t=>{t.addEventListener("click",()=>{l.querySelectorAll(".levelup-class-card").forEach(f=>f.classList.remove("selected")),t.classList.add("selected"),e.selectedClass=t.dataset.class;const o=e.parsed.find(f=>f.name.toLowerCase()===e.selectedClass.toLowerCase());e.newClassLevel=o?o.level+1:1,b()})}),e.selectedClass){const t=e.parsed.find(o=>o.name.toLowerCase()===e.selectedClass.toLowerCase());e.newClassLevel=t?t.level+1:1,b()}}function Q(l,e){var r;const i=k(e.selectedClass),s=(i==null?void 0:i.hitDie)||8,a=Math.floor(((parseInt(e.character.con)||10)-10)/2),v=e.newTotalLevel===1;e.hpRoll||(e.hpRoll=v?s:D(`1d${s}`).total,e.hpGained=Math.max(1,e.hpRoll+a)),l.innerHTML=`
    <div class="levelup-step">
      <h3>Step 2: Hit Points</h3>
      <div class="levelup-hp-display">
        <div class="hp-roll-result">
          <div class="hp-label">Hit Die</div>
          <div class="hp-die">d${s}</div>
        </div>
        <div class="hp-roll-result">
          <div class="hp-label">Roll</div>
          <div class="hp-die" id="hp-roll-value">${e.hpRoll}</div>
        </div>
        <div class="hp-roll-result">
          <div class="hp-label">CON Mod</div>
          <div class="hp-die">${a>=0?"+":""}${a}</div>
        </div>
        <div class="hp-roll-result total">
          <div class="hp-label">Total</div>
          <div class="hp-die" id="hp-total">${e.hpGained}</div>
        </div>
      </div>
      <div class="levelup-hp-actions">
        ${v?'<div style="color:var(--accent);font-size:0.8rem;">🎯 First level: Maximum hit points!</div>':`
          <button class="btn-secondary btn-sm" id="hp-reroll">🎲 Re-Roll</button>
          <span style="font-size:0.75rem;color:var(--text-secondary)">Current HP: ${e.character.hp}</span>
        `}
      </div>
      <div class="levelup-hp-result">
        <span>New Total HP:</span>
        <strong>${(parseInt(e.character.hp)||0)+e.hpGained}</strong>
      </div>
    </div>
  `,(r=l.querySelector("#hp-reroll"))==null||r.addEventListener("click",()=>{e.hpRoll=Math.max(1,D(`1d${s}`).total),e.hpGained=Math.max(1,e.hpRoll+a),l.querySelector("#hp-roll-value").textContent=e.hpRoll,l.querySelector("#hp-total").textContent=e.hpGained,l.querySelector(".levelup-hp-result strong").textContent=(parseInt(e.character.hp)||0)+e.hpGained})}function V(l,e,i,s){const a=k(e.selectedClass),v=Math.floor(((parseInt(e.character.int_)||10)-10)/2),r=(e.character.race||"").toLowerCase()==="human",n=U(e.selectedClass,v,e.newClassLevel,r),c=e.newTotalLevel+3,y=Math.floor(c/2),u=A(e.character.skills_feats||"");a!=null&&a.classSkills,Object.keys(e.skillAllocations).length||(e.skillAllocations={});const g=Object.values(e.skillAllocations).reduce((p,d)=>p+d,0),b=n-g,t=new Set([...Object.keys(u),"appraise","balance","bluff","climb","concentration","craft","decipher script","diplomacy","disable device","disguise","escape artist","forgery","gather information","handle animal","heal","hide","intimidate","jump","knowledge (arcana)","knowledge (dungeoneering)","knowledge (geography)","knowledge (history)","knowledge (local)","knowledge (nature)","knowledge (nobility)","knowledge (religion)","knowledge (the planes)","listen","move silently","open lock","perform","profession","ride","search","sense motive","sleight of hand","speak language","spellcraft","spot","survival","swim","tumble","use magic device","use rope"]);let o=`
    <div class="levelup-step">
      <h3>Step 3: Skill Points</h3>
      <div class="levelup-skill-header">
        <span class="skill-points-remaining${b===0?" done":""}" id="skill-remaining">
          ${b} / ${n} points remaining
        </span>
        <span style="font-size:0.7rem;color:var(--text-secondary)">Max class rank: ${c} | Cross-class: ${y}</span>
      </div>
      <div class="levelup-skill-list" id="skill-list">
  `;const f=[...t].sort();for(const p of f){const d=z(e.selectedClass,p),m=u[p]||0,h=e.skillAllocations[p]||0,w=d?c:y,P=d?1:2,q=b>=P&&m+h<w;o+=`
      <div class="levelup-skill-row${d?" class-skill":""}">
        <span class="skill-name">${d?"✦ ":""}${p}</span>
        <span class="skill-ranks">${m}${h?` + ${h}`:""}</span>
        <div class="skill-buttons">
          <button class="skill-btn minus" data-skill="${p}" ${h<=0?"disabled":""}>−</button>
          <button class="skill-btn plus" data-skill="${p}" data-cost="${P}" ${q?"":"disabled"}>+</button>
        </div>
      </div>
    `}o+="</div></div>",l.innerHTML=o,l.querySelectorAll(".skill-btn").forEach(p=>{p.addEventListener("click",()=>{const d=p.dataset.skill;parseInt(p.dataset.cost),p.classList.contains("plus")?e.skillAllocations[d]=(e.skillAllocations[d]||0)+1:(e.skillAllocations[d]=Math.max(0,(e.skillAllocations[d]||0)-1),e.skillAllocations[d]===0&&delete e.skillAllocations[d]),l.innerHTML="",S(l,e,i,s)})})}function Z(l,e,i,s){var t,o,f,p;const{getsFeat:a,getsAbility:v,newTotalLevel:r,selectedClass:n,newClassLevel:c}=e,y=G(n,c),u=E(e);let g='<div class="levelup-step"><h3>Step 4: Feats & Abilities</h3>';if(v&&(g+=`
      <div class="levelup-feat-section">
        <div class="levelup-section-title">⬆️ Ability Score Increase (Level ${r})</div>
        <div class="levelup-ability-grid">
          ${["STR","DEX","CON","INT","WIS","CHA"].map(d=>{const m=d==="INT"?"int_":d.toLowerCase(),h=parseInt(e.character[m])||10,w=e.abilityIncrease===d;return`<div class="levelup-ability-card${w?" selected":""}" data-ability="${d}">
              <div class="ability-name">${d}</div>
              <div class="ability-val">${h}${w?" → "+(h+1):""}</div>
            </div>`}).join("")}
        </div>
      </div>
    `),a){const d=F(u);g+=`
      <div class="levelup-feat-section">
        <div class="levelup-section-title">🎖️ General Feat (Level ${r})</div>
        <select class="form-select" id="luw-feat-select" style="max-width:400px">
          <option value="">— Choose a feat —</option>
          ${d.filter(m=>m.eligible).map(m=>`<option value="${m.name}"${e.selectedFeat===m.name?" selected":""}>${m.name}</option>`).join("")}
          <optgroup label="Not Yet Eligible">
            ${d.filter(m=>!m.eligible).slice(0,15).map(m=>`<option value="" disabled>${m.name} (need: ${m.missing.join(", ")})</option>`).join("")}
          </optgroup>
        </select>
        ${e.selectedFeat?`<div class="feat-benefit">${((t=T[e.selectedFeat])==null?void 0:t.benefit)||""}</div>`:""}
      </div>
    `}if(y){let d="general";["Fighter"].includes(n)?d="fighter":["Wizard"].includes(n)?d="wizard_bonus":["Monk"].includes(n)&&(d="fighter");const m=F(u,{category:d});g+=`
      <div class="levelup-feat-section">
        <div class="levelup-section-title">⚔️ ${n} Bonus Feat</div>
        <select class="form-select" id="luw-bonus-feat-select" style="max-width:400px">
          <option value="">— Choose a bonus feat —</option>
          ${m.filter(h=>h.eligible).map(h=>`<option value="${h.name}"${e.selectedBonusFeat===h.name?" selected":""}>${h.name}</option>`).join("")}
        </select>
        ${e.selectedBonusFeat?`<div class="feat-benefit">${((o=T[e.selectedBonusFeat])==null?void 0:o.benefit)||""}</div>`:""}
      </div>
    `}const b=C(n,c);b.length&&(g+=`
      <div class="levelup-feat-section">
        <div class="levelup-section-title">🔓 Class Features Unlocked</div>
        <div class="levelup-features-list">
          ${b.map(d=>`<div class="feature-item">✦ ${d}</div>`).join("")}
        </div>
      </div>
    `),!a&&!v&&!y&&!b.length&&(g+='<div class="social-empty" style="margin:1rem 0"><div class="social-empty-icon">📋</div>No feats or abilities to select at this level</div>'),g+="</div>",l.innerHTML=g,l.querySelectorAll(".levelup-ability-card").forEach(d=>{d.addEventListener("click",()=>{l.querySelectorAll(".levelup-ability-card").forEach(w=>w.classList.remove("selected")),d.classList.add("selected"),e.abilityIncrease=d.dataset.ability;const m=e.abilityIncrease==="INT"?"int_":e.abilityIncrease.toLowerCase(),h=parseInt(e.character[m])||10;d.querySelector(".ability-val").textContent=`${h} → ${h+1}`})}),(f=l.querySelector("#luw-feat-select"))==null||f.addEventListener("change",d=>{e.selectedFeat=d.target.value,l.innerHTML="",S(l,e,i,s)}),(p=l.querySelector("#luw-bonus-feat-select"))==null||p.addEventListener("change",d=>{e.selectedBonusFeat=d.target.value,l.innerHTML="",S(l,e,i,s)})}function ee(l,e){const i=k(e.selectedClass);if(!(i!=null&&i.castingType)){l.innerHTML=`
      <div class="levelup-step">
        <h3>Step 5: Spells</h3>
        <div class="social-empty"><div class="social-empty-icon">🔮</div>${e.selectedClass} is not a spellcasting class</div>
      </div>
    `;return}const s=N(e.selectedClass,e.newClassLevel),a=x(e.selectedClass,e.newClassLevel),v=e.newClassLevel>1?x(e.selectedClass,e.newClassLevel-1):null;let r=`
    <div class="levelup-step">
      <h3>Step 5: Spells</h3>
      <div class="levelup-spell-info">
        <div class="spell-info-label">Casting Type</div>
        <div class="spell-info-value">${i.castingType==="spontaneous"?"✨ Spontaneous":"📖 Prepared"}</div>
        <div class="spell-info-label">Key Ability</div>
        <div class="spell-info-value">${(i.castingAbility||"??").toUpperCase()}</div>
      </div>
  `;if(s&&(r+=`
      <div class="levelup-section-title" style="margin-top:1rem;">📊 Spells Per Day at ${e.selectedClass} ${e.newClassLevel}</div>
      <div class="levelup-spell-slots">
        ${s.map((n,c)=>`
          <div class="spell-slot-box">
            <div class="slot-level">${c===0?"0th":c+M(c)}</div>
            <div class="slot-count">${n}</div>
          </div>
        `).join("")}
      </div>
    `),i.castingType==="spontaneous"&&a&&v){const n=[];for(let c=0;c<a.length;c++){const y=(v==null?void 0:v[c])||0,u=a[c];if(u>y)for(let g=0;g<u-y;g++)n.push(c)}n.length&&(r+=`
        <div class="levelup-section-title" style="margin-top:1rem;">✨ New Spells to Learn</div>
        <div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:0.5rem;">
          You gain ${n.length} new spell(s). Choose from the SRD spell list on the character sheet after leveling up.
        </div>
        <div class="levelup-spell-slots">
          ${n.map(c=>`
            <div class="spell-slot-box new">
              <div class="slot-level">${c===0?"0th":c+M(c)}</div>
              <div class="slot-count">NEW</div>
            </div>
          `).join("")}
        </div>
      `)}i.hasSpellbook&&(r+=`
      <div class="levelup-section-title" style="margin-top:1rem;">📖 Spellbook</div>
      <div style="font-size:0.75rem;color:var(--text-secondary);">
        As a Wizard, you automatically add <strong>2 free spells</strong> to your spellbook at each level.
        You may add more by copying from scrolls or other spellbooks (Spellcraft check, 100gp/spell level in materials).
        Choose your spells from the Spells tab on the character sheet after leveling up.
      </div>
    `),r+="</div>",l.innerHTML=r}function le(l,e,i,s){k(e.selectedClass);const a=e.parsed.find(u=>u.name.toLowerCase()===e.selectedClass.toLowerCase()),v=a?a.level+1:1,r=$(e),n=B(e),c=C(e.selectedClass,v),y=Object.entries(e.skillAllocations).filter(([,u])=>u>0);l.innerHTML=`
    <div class="levelup-step">
      <h3>Step 6: Summary</h3>
      <div class="levelup-summary">
        <div class="summary-section">
          <div class="summary-title">📋 Class</div>
          <div class="summary-value">${I(e)}</div>
        </div>
        <div class="summary-section">
          <div class="summary-title">❤️ Hit Points</div>
          <div class="summary-value">${e.character.hp} → ${(parseInt(e.character.hp)||0)+e.hpGained} (+${e.hpGained})</div>
        </div>
        <div class="summary-section">
          <div class="summary-title">⚔️ BAB</div>
          <div class="summary-value">+${r}</div>
        </div>
        <div class="summary-section">
          <div class="summary-title">🛡️ Saves</div>
          <div class="summary-value">Fort +${n.fort} / Ref +${n.ref} / Will +${n.will}</div>
        </div>
        ${e.abilityIncrease?`
          <div class="summary-section">
            <div class="summary-title">⬆️ Ability</div>
            <div class="summary-value">${e.abilityIncrease} +1</div>
          </div>
        `:""}
        ${e.selectedFeat?`
          <div class="summary-section">
            <div class="summary-title">🎖️ Feat</div>
            <div class="summary-value">${e.selectedFeat}</div>
          </div>
        `:""}
        ${e.selectedBonusFeat?`
          <div class="summary-section">
            <div class="summary-title">⚔️ Bonus Feat</div>
            <div class="summary-value">${e.selectedBonusFeat}</div>
          </div>
        `:""}
        ${y.length?`
          <div class="summary-section">
            <div class="summary-title">📚 Skills</div>
            <div class="summary-value">${y.map(([u,g])=>`${u} +${g}`).join(", ")}</div>
          </div>
        `:""}
        ${c.length?`
          <div class="summary-section">
            <div class="summary-title">🔓 Features</div>
            <div class="summary-value">${c.join(", ")}</div>
          </div>
        `:""}
      </div>
    </div>
  `}async function se(l){const{character:e,selectedClass:i,hpGained:s,newTotalLevel:a,newClassLevel:v,selectedFeat:r,selectedBonusFeat:n,abilityIncrease:c,skillAllocations:y,spellsChosen:u}=l,g=I(l),b=(parseInt(e.hp)||0)+s,t=$(l),o=B(l);let f=e.feats||"";r&&(f+=(f?", ":"")+r),n&&(f+=(f?", ":"")+n);const p=A(e.skills_feats||"");for(const[m,h]of Object.entries(y))p[m]=(p[m]||0)+h;const d=Object.entries(p).filter(([,m])=>m>0).map(([m,h])=>`${m} +${h}`).join(", ");await H({character_id:e.id,class_name:i,new_level:a,new_class_string:g,hp_gained:s,new_hp:b,new_saves:`Fort +${o.fort}, Ref +${o.ref}, Will +${o.will}`,new_bab:`+${t}`,feat_chosen:r,bonus_feat:n,ability_increase:c,new_feats_string:f,new_skills_string:d,skill_points_spent:Object.values(y).reduce((m,h)=>m+h,0),new_spells_known:u})}function ae(l){switch(l.currentStep){case 1:return l.selectedClass?!0:(alert("Please select a class."),!1);case 2:return!0;case 3:return!0;case 4:return l.getsAbility&&!l.abilityIncrease?(alert("Please select an ability score to increase."),!1):!0;case 5:return!0;default:return!0}}function ie(l,e=0){if(!l)return[];const i=l.split("/").map(a=>{const v=j(a.trim());return{name:v.name,level:v.level}}).filter(a=>a.name);return i.reduce((a,v)=>a+v.level,0)===0&&e>0&&(i.length,i[0].level=e),i}function I(l){const e=[...l.parsed],i=e.find(s=>s.name.toLowerCase()===l.selectedClass.toLowerCase());return i?i.level++:e.push({name:l.selectedClass,level:1}),e.map(s=>s.name).join(" / ")}function $(l){const e=[...l.parsed],i=e.find(s=>s.name.toLowerCase()===l.selectedClass.toLowerCase());return i?i.level++:e.push({name:l.selectedClass,level:1}),e.reduce((s,a)=>s+W(a.name,a.level),0)}function B(l){const e=[...l.parsed],i=e.find(a=>a.name.toLowerCase()===l.selectedClass.toLowerCase());i?i.level++:e.push({name:l.selectedClass,level:1});const s={fort:0,ref:0,will:0};for(const a of e){const v=O(a.name,a.level);s.fort+=v.fort,s.ref+=v.ref,s.will+=v.will}return s}function E(l){const e=l.character,i=(e.feats||"").split(",").map(a=>a.trim()).filter(Boolean);l.selectedFeat&&i.push(l.selectedFeat);const s=C(l.selectedClass,l.newClassLevel||1);return{str:parseInt(e.str)||10,dex:parseInt(e.dex)||10,con:parseInt(e.con)||10,int_:parseInt(e.int_)||10,wis:parseInt(e.wis)||10,cha:parseInt(e.cha)||10,level:l.newTotalLevel,bab:$(l),feats:i,classFeatures:s,className:l.selectedClass,classLevel:l.newClassLevel||1,casterLevel:l.newClassLevel||0,race:e.race||"",alignment:e.alignment||"",skillRanks:A(e.skills_feats||"")}}function A(l){const e={};if(!l)return e;for(const i of l.split(",")){const s=i.trim().match(/^(.+?)\s*\+(\d+)$/);s&&(e[s[1].trim().toLowerCase()]=parseInt(s[2]))}return e}function M(l){const e=["th","st","nd","rd"],i=l%100;return e[(i-20)%10]||e[i]||e[0]}export{oe as openLevelUpWizard,ie as parseMulticlass};
