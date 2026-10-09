/* English Daily: interface, progress and lessons. Progress lives only on this device (localStorage). */

/* ---------- State ---------- */
const DEFAULT_PROFILE = { name:"", days:{}, done:{}, items:{}, autoAudio:true, placed:false, installHidden:false };
const S = { profile:structuredClone(DEFAULT_PROFILE), tab:"inicio", unitView:null, lesson:null, backup:{msg:"",err:false} };
const canSpeak = "speechSynthesis" in window;
const LEVELS = [["Nível 1","Base"],["Nível 2","Intermediário"],["Nível 3","Intermediário avançado"],["Nível 4","Inglês no trabalho"]];

/* ---------- Storage ---------- */
const KEY="english-daily:profile";
function load(){ try{ const v=localStorage.getItem(KEY); return v?JSON.parse(v):null; }catch{ return null; } }
let saveFailed=false;
function save(){ try{ localStorage.setItem(KEY,JSON.stringify(S.profile)); saveFailed=false; }catch{ saveFailed=true; } }
try{ navigator.storage?.persist?.(); }catch{}

/* ---------- Curriculum helpers ---------- */
function allUnits(){ return UNITS; }
function unitItems(u){ return u.items.map((x,i)=>({id:u.id+"-"+i,en:x[0],pt:x[1],unit:u.id})); }
function nodesOf(u){ return [0,1,2].map(k=>({id:u.id+"-L"+k,kind:"lesson",k,label:"Lição "+(k+1)})).concat([{id:u.id+"-D",kind:"challenge",label:"Desafio"}]); }
function pathNodes(){ return allUnits().flatMap(u=>nodesOf(u).map(n=>Object.assign(n,{unit:u}))); }
function nextNode(){ return pathNodes().find(n=>!S.profile.done[n.id])||null; }
function seenItems(){ return allUnits().flatMap(unitItems).filter(i=>S.profile.items[i.id]); }
function dueItems(){ const t=today(); return seenItems().filter(i=>S.profile.items[i.id].due<=t).sort((a,b)=>S.profile.items[a.id].s-S.profile.items[b.id].s); }
function unitState(u){
  const ns=nodesOf(u), done=ns.filter(n=>S.profile.done[n.id]).length, nx=nextNode();
  if(done===ns.length) return {state:"done",done};
  if(nx&&nx.unit.id===u.id) return {state:"current",done};
  return {state:"locked",done};
}

/* ---------- Unit look: each unit owns a hue and an icon ---------- */
const HUES=[["#FF6B4A","#fff"],["#2D8CF0","#fff"],["#8B5CF6","#fff"],["#0E9C86","#fff"],["#E2458F","#fff"],["#F5A524","#2B1D00"],["#2E9550","#fff"],["#0B93B0","#fff"],["#E5484D","#fff"],["#4F5BD5","#fff"]];
const GLYPH={
  briefcase:'<rect class="g" x="14" y="19" width="20" height="13" rx="3"/><path class="g" d="M20 19v-3h8v3M14 25h20"/>',
  clock:'<circle class="g" cx="25" cy="24" r="9"/><path class="g" d="M25 19v5l3 2M13.5 21.5l2.2 3 3-2.2"/>',
  globe:'<circle class="g" cx="24" cy="24" r="10"/><ellipse class="g" cx="24" cy="24" rx="4.5" ry="10"/><path class="g" d="M14 24h20"/>',
  calendar:'<rect class="g" x="14" y="16" width="20" height="17" rx="3"/><path class="g" d="M14 22h20M19 13v5M29 13v5"/><circle class="gf" cx="24" cy="28" r="2"/>',
  notequal:'<path class="g" d="M16 21h16M16 28h16M28 15l-8 19"/>',
  chat:'<path class="g" d="M13 17h15a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-8l-5 4v-4h-2a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z"/><path class="g" d="M33 22h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-1v3l-4-3h-4"/>',
  heart:'<path class="g" d="M24 33s-10-6-10-12a5 5 0 0 1 10-1 5 5 0 0 1 10 1c0 6-10 12-10 12z"/>',
  bulb:'<path class="g" d="M24 13a8 8 0 0 0-5 14v3h10v-3a8 8 0 0 0-5-14zM21 34h6"/>',
  mail:'<rect class="g" x="13" y="16" width="22" height="16" rx="3"/><path class="g" d="M14 18l10 7 10-7"/>',
  plane:'<path class="g" d="M12 27l23-10-5 18-6-6-5 4v-6z"/><path class="g" d="M24 29l11-12"/>',
  home:'<path class="g" d="M14 23l10-9 10 9M17 21v12h14V21"/><path class="g" d="M22 33v-6h4v6"/>',
  cart:'<path class="g" d="M12 15h4l3 13h13l3-9H18"/><circle class="gf" cx="21" cy="33" r="2"/><circle class="gf" cx="30" cy="33" r="2"/>',
  health:'<rect class="g" x="15" y="15" width="18" height="18" rx="4"/><path class="g" d="M24 19v10M19 24h10"/>',
  scale:'<path class="g" d="M24 13v20M17 33h14M14 18h20M14 18l-3 8h6zM34 18l-3 8h6z"/>',
  check:'<rect class="g" x="15" y="13" width="18" height="22" rx="3"/><path class="g" d="M19 20l2 2 4-4M19 28l2 2 4-4M28 21h1M28 29h1"/>',
  cloud:'<path class="g" d="M17 31a5 5 0 0 1 0-10 7 7 0 0 1 13-2 5 5 0 0 1 1 12z"/><path class="g" d="M24 26v.01"/>',
  split:'<path class="g" d="M24 34V24l-8-8M24 24l8-8M13 16h5v-5M35 16h-5v-5"/>',
  thought:'<circle class="g" cx="25" cy="21" r="8"/><circle class="gf" cx="16" cy="31" r="2.2"/><circle class="gf" cx="12.5" cy="35" r="1.4"/>',
  gear:'<circle class="g" cx="24" cy="24" r="4"/><path class="g" d="M24 13v4M24 31v4M13 24h4M31 24h4M16.2 16.2l2.8 2.8M29 29l2.8 2.8M16.2 31.8l2.8-2.8M29 19l2.8-2.8"/>',
  book:'<path class="g" d="M13 16c4-2 8-2 11 1 3-3 7-3 11-1v16c-4-2-8-2-11 1-3-3-7-3-11-1z"/><path class="g" d="M24 17v16"/>',
  sun:'<circle class="g" cx="24" cy="24" r="5"/><path class="g" d="M24 12v3M24 33v3M12 24h3M33 24h3M15.5 15.5l2 2M30.5 30.5l2 2M15.5 32.5l2-2M30.5 17.5l2-2"/>',
  chart:'<path class="g" d="M14 33h20M17 33v-7M23 33V18M29 33v-11"/>',
  hand:'<path class="g" d="M12 25l6-6 5 2 5-3 8 7-7 7-4-3-3 2-4-4"/><path class="g" d="M23 21l-3 4 2 2 4-3"/>',
  alert:'<path class="g" d="M24 13l11 19H13z"/><path class="g" d="M24 20v6M24 29.5v.01"/>',
  badge:'<rect class="g" x="15" y="13" width="18" height="22" rx="3"/><circle class="g" cx="24" cy="22" r="3.5"/><path class="g" d="M19 31c1-3 9-3 10 0"/>',
  laptop:'<rect class="g" x="15" y="15" width="18" height="12" rx="2"/><path class="g" d="M12 32h24"/>',
  quote:'<path class="g" d="M16 26c0-5 2-8 6-9M16 26h5v6h-5zM27 26c0-5 2-8 6-9M27 26h5v6h-5z"/>',
  question:'<circle class="g" cx="24" cy="24" r="10"/><path class="g" d="M21 21a3 3 0 1 1 4 3c-1 .5-1 1.5-1 2.5M24 30.5v.01"/>',
  link:'<path class="g" d="M21 27l6-6M19 24l-3 3a4 4 0 0 0 5 5l3-3M29 24l3-3a4 4 0 0 0-5-5l-3 3"/>',
  tools:'<path class="g" d="M15 33l10-10M27 13a5 5 0 0 0-4 7l7 7a5 5 0 0 0 7-4l-3 1-2-2 1-3a5 5 0 0 0-6-6z"/>',
  smile:'<circle class="g" cx="24" cy="24" r="10"/><path class="g" d="M20 27c2 2 6 2 8 0M20.5 21v.01M27.5 21v.01"/>',
  target:'<circle class="g" cx="24" cy="24" r="10"/><circle class="g" cx="24" cy="24" r="5"/><circle class="gf" cx="24" cy="24" r="1.8"/>',
  spark:'<path class="gf" d="M24 12l3 9 9 3-9 3-3 9-3-9-9-3 9-3z"/>',
  star:'<path class="g" d="M24 13l3.2 6.6 7.3 1-5.3 5.1 1.3 7.2L24 29.5l-6.5 3.4 1.3-7.2-5.3-5.1 7.3-1z"/>'
};
function theme(u){ const i=allUnits().findIndex(x=>x.id===u.id); const [c,on]=HUES[(i<0?0:i)%HUES.length]; return {c,on,style:`--c:${c};--on:${on}`}; }
function glyph(u){ return GLYPH[u.icon]||GLYPH.spark; }
function icon(u,cls){ return `<svg class="uicon ${cls||""}" viewBox="0 0 48 48" aria-hidden="true"><circle class="bg" cx="24" cy="24" r="24"/>${glyph(u)}</svg>`; }

/* ---------- Speech ---------- */
function speak(text,slow){
  try{
    if(!canSpeak) return; speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(text); u.lang="en-US"; u.rate=slow?0.6:0.92;
    const vs=speechSynthesis.getVoices(); const v=vs.find(v=>v.lang==="en-US"&&/Samantha|Google|Natural/i.test(v.name))||vs.find(v=>v.lang==="en-US")||vs.find(v=>v.lang&&v.lang.startsWith("en")); if(v) u.voice=v;
    speechSynthesis.speak(u);
  }catch{}
}
if(canSpeak){ try{ speechSynthesis.getVoices(); }catch{} }

/* ---------- Render helpers ---------- */
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const $=s=>document.querySelector(s);
const SPK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>';
const SLOW='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 15c0-4 3-7 7-7s7 3 7 7H3z"/><path d="M17 13h2a2 2 0 0 0 2-2"/><path d="M6 15v3M14 15v3"/></svg>';
const CHECK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const XMARK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
const LOCK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
const PLAY='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.9l10.4-6.5a1 1 0 0 0 0-1.8L9.5 4.6A1 1 0 0 0 8 5.5z"/></svg>';
const TROPHY='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 14v4M8 21h8"/></svg>';
const BACK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
const SHARE='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3M8 7l4-4 4 4"/><path d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8"/></svg>';
function spk(text,cls){ return canSpeak?`<button class="spk ${cls||""}" data-speak="${esc(text)}" aria-label="Ouvir">${SPK}</button>`:""; }
function doneToday(){ return !!S.profile.days[today()]; }
const isStandalone = () => window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone===true;
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);

function render(){
  const root=$("#root");
  if(S.lesson){ root.innerHTML=renderLesson(); afterLessonRender(); return; }
  if(!S.profile.name){ root.innerHTML=renderWelcome(); $("#nameInput")?.focus(); return; }
  const unit=S.unitView&&allUnits().find(u=>u.id===S.unitView);
  const d=new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"}); const dd=d.charAt(0).toUpperCase()+d.slice(1);
  root.innerHTML=`<div class="wrap">
    ${unit?"":`<header class="top"><div><h1>Olá, ${esc(S.profile.name)}!</h1><p>${esc(dd)}</p></div>
      <span class="chip-today ${doneToday()?"on":""}">${doneToday()?CHECK+"Hoje feito":"Hoje pendente"}</span></header>`}
    ${saveFailed?`<p class="notice err">Não estou conseguindo salvar neste aparelho. Verifique se o navegador não está em modo privado.</p>`:""}
    <main>${unit?renderUnit(unit):S.tab==="inicio"?renderHome():renderProfile()}</main>
  </div>
  <nav class="tabs" aria-label="Seções"><div class="in" role="tablist">
    ${[["inicio","Início",'<path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/>'],["perfil","Progresso",'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>']].map(([k,l,p])=>`<button class="tab" role="tab" data-tab="${k}" aria-selected="${!unit&&S.tab===k}"><svg viewBox="0 0 24 24">${p}</svg>${l}</button>`).join("")}
  </div></nav>`;
}

function renderWelcome(){
  return `<div class="wrap welcome">
    <div class="hero on-color" style="--c:#6C4CF1;--on:#fff">
      <span class="eyebrow">English Daily</span>
      <h2>Inglês todo dia, um pouco por vez</h2>
      <p>Uma atividade curta por dia: primeiro você revisa o que errou, depois aprende frases novas. Seu progresso fica salvo neste celular.</p>
    </div>
    <section class="panel">
      <label for="nameInput"><h3>Como você quer ser chamado?</h3></label>
      <input type="text" id="nameInput" placeholder="Seu nome" autocomplete="given-name" maxlength="30">
      <button class="btn fill wide" data-act="saveName" style="--c:#6C4CF1;--on:#fff">Começar</button>
    </section>
  </div>`;
}

function installCard(){
  if(isStandalone()||S.profile.installHidden) return "";
  return `<section class="panel install">
    <div class="row between"><h3>Instale na tela inicial</h3><button class="btn ghost" data-act="hideInstall">Agora não</button></div>
    ${isIOS?`<p class="small">No Safari, toque em <b>Compartilhar</b> ${SHARE} e depois em <b>Adicionar à Tela de Início</b>. O app abre em tela cheia, como um aplicativo.</p>`
      :`<p class="small">No Chrome, toque nos <b>três pontinhos</b> e depois em <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.</p>`}
  </section>`;
}

function heroToday(){
  const nx=nextNode(), rv=Math.min(6,dueItems().length), done=doneToday();
  if(!S.profile.placed && !Object.keys(S.profile.done).length) return `<section class="hero on-color" style="--c:#6C4CF1;--on:#fff">
    <span class="eyebrow">Primeiro passo</span>
    <h2>Vamos descobrir o seu nível</h2>
    <p>Responda 20 perguntas rápidas, cerca de 4 minutos, e o app começa você no ponto certo da trilha.</p>
    <button class="btn white wide" data-act="placement">Fazer o teste de nível</button>
    <button class="btn outline wide" data-act="skipPlacement">Prefiro começar do início</button></section>`;
  if(!nx) return `<section class="hero on-color" style="--c:#6C4CF1;--on:#fff">
    <span class="eyebrow">Atividade de hoje</span><h2>Você concluiu as ${allUnits().length} unidades!</h2>
    <p>Continue revisando todo dia para não esquecer. Novas unidades vão aparecer aqui quando forem adicionadas ao app.</p>
    ${rv?`<button class="btn white wide" data-act="daily">Revisar ${rv} ${rv===1?"frase":"frases"}</button>`:`<p class="note">Nenhuma frase para revisar hoje.</p>`}</section>`;
  const th=theme(nx.unit); let n=0;
  return `<section class="hero on-color" style="${th.style}">
    <div class="row between"><span class="eyebrow">${done?"Feito por hoje":"Atividade de hoje"}</span>${icon(nx.unit)}</div>
    <h2>${done?"Muito bem! Quer fazer mais uma?":esc(nx.unit.title)}</h2>
    <ol class="plan">
      ${rv?`<li><span class="n">${++n}</span><div><b>Revisão</b><span class="s">${rv} ${rv===1?"frase que você errou ou está esquecendo":"frases que você errou ou está esquecendo"}</span></div></li>`:""}
      <li><span class="n">${++n}</span><div><b>${esc(nx.label)}${done?" · "+esc(nx.unit.title):""}</b><span class="s">${nx.kind==="challenge"?"todas as frases da unidade, mais difícil":"4 frases novas"}</span></div></li>
    </ol>
    <button class="btn white wide" data-act="daily">${done?"Fazer mais uma lição":"Começar"}</button>
    <p class="note">${done?"Opcional. A atividade de hoje já está feita.":`Cerca de ${rv?8:5} minutos.`}</p>
  </section>`;
}

function renderHome(){
  const units=allUnits();
  const sections=[];
  for(let s=0;s*10<units.length;s++){
    const group=units.slice(s*10,s*10+10), [lv,name]=LEVELS[s]||[`Nível ${s+1}`,"Extra"];
    const doneN=group.filter(u=>unitState(u).state==="done").length;
    sections.push(`<section class="level"><div class="row between"><div><span class="eyebrow muted">${lv}</span><h2>${name}</h2></div><span class="muted small">${doneN} de ${group.length}</span></div>
      <div class="grid">${group.map(u=>{
        const st=unitState(u), th=theme(u), i=units.indexOf(u);
        const label=st.state==="done"?`${CHECK}Concluída`:st.state==="current"?`${PLAY}Você está aqui`:`${LOCK}Bloqueada`;
        return `<button class="tile ${st.state}" style="${th.style}" data-unit="${u.id}" aria-label="Unidade ${i+1}: ${esc(u.title)}">
          ${icon(u)}<div><span class="eyebrow">Unidade ${i+1}</span><p class="t-title">${esc(u.title)}</p></div>
          <div class="segs" aria-hidden="true">${[0,1,2,3].map(k=>`<i class="${k<st.done?"on":""}"></i>`).join("")}</div>
          <span class="state">${label}</span></button>`; }).join("")}</div></section>`);
  }
  return `<div class="col">${heroToday()}${installCard()}${sections.join("")}</div>`;
}

function renderUnit(u){
  const th=theme(u), i=allUnits().indexOf(u), nx=nextNode(), items=unitItems(u);
  const seen=items.filter(x=>S.profile.items[x.id]);
  const rows=nodesOf(u).map((n,k)=>{
    const done=!!S.profile.done[n.id], cur=nx&&nx.id===n.id, locked=!done&&!cur;
    const sub=n.kind==="challenge"?"Todas as 12 frases, exercícios mais difíceis":items.slice(n.k*4,n.k*4+4).map(x=>x.en).slice(0,2).join(" · ")+" …";
    return `<div class="lrow ${done?"done":cur?"current":""}">
      <span class="dot">${done?CHECK:locked?LOCK:n.kind==="challenge"?TROPHY:k+1}</span>
      <div><b>${n.label}</b><span class="small muted">${esc(sub)}</span></div>
      ${locked?"":`<button class="btn ${cur?"fill":""}" data-start="${n.id}">${done?"Refazer":"Começar"}</button>`}</div>`; }).join("");
  return `<div class="col" style="${th.style}">
    <button class="back" data-act="back">${BACK}Início</button>
    <div class="band on-color">${icon(u,"lg")}<div><span class="eyebrow" style="opacity:.85">Unidade ${i+1}</span><h1>${esc(u.title)}</h1></div></div>
    <section class="tip"><span class="eyebrow">Dica da unidade</span><h3>${esc(u.tip.title)}</h3>${u.tip.paras.map(p=>`<p>${esc(p)}</p>`).join("")}
      ${(u.tip.ex||[]).map(e=>`<div class="ex row"><div class="grow"><p><b>${esc(e[0])}</b></p><p class="muted small">${esc(e[1])}</p></div>${spk(e[0],"mini")}</div>`).join("")}</section>
    <h2>Lições</h2>
    <div class="lessons">${rows}</div>
    ${seen.length?`<section class="panel"><h3>Frases que você já viu</h3><div class="list">${seen.map(x=>`<div class="item"><div><p class="en">${esc(x.en)}</p><p class="pt">${esc(x.pt)}</p></div>${dots(S.profile.items[x.id].s)}${spk(x.en,"mini")}</div>`).join("")}</div></section>`:""}
  </div>`;
}

function dots(s){ return `<span class="dots" title="Força ${s}/5">${[1,2,3,4,5].map(i=>`<i class="${i<=s?"on":""}"></i>`).join("")}</span>`; }

function renderProfile(){
  const p=S.profile, keys=Object.keys(p.days), seen=seenItems();
  const strong=seen.filter(i=>p.items[i.id].s>=4).length, lessons=Object.keys(p.done).length;
  const weak=seen.filter(i=>p.items[i.id].s<=1).slice(0,30);
  const t=today(); const [y,m,d]=t.split("-").map(Number); const dow=new Date(y,m-1,d).getDay();
  const cells=[]; for(let s=addDays(t,-(7*15+dow)); s<=t; s=addDays(s,1)){ const v=p.days[s]; cells.push(`<i class="${v?"l2":""} ${s===t?"today":""}" title="${s}: ${v?"estudou":"não estudou"}"></i>`); }
  const st=(i,label,val,sub)=>`<div class="stat" style="--c:${HUES[i][0]}"><b>${val}</b><span>${label}</span>${sub?`<span class="small">${sub}</span>`:""}</div>`;
  const b=S.backup;
  return `<div class="col">
    <div class="stats">${st(1,"dias estudados",keys.length)}${st(0,"lições concluídas",lessons)}${st(3,"frases firmes",strong,"acertou várias vezes")}${st(2,"frases vistas",seen.length)}</div>
    <section class="panel"><h3>Últimas 16 semanas</h3><div class="heat-wrap"><div class="heat">${cells.join("")}</div></div><p class="small muted">Cada quadrado é um dia. Os coloridos são dias em que você fez a atividade.</p></section>
    ${weak.length?`<section class="panel"><h3>Frases que você mais erra</h3><p class="small muted">Elas entram primeiro na revisão da sua próxima atividade.</p><div class="list">${weak.map(i=>`<div class="item"><div><p class="en">${esc(i.en)}</p><p class="pt">${esc(i.pt)}</p></div>${dots(p.items[i.id].s)}${spk(i.en,"mini")}</div>`).join("")}</div></section>`:""}
    <section class="panel"><h3>Backup do progresso</h3>
      <p class="small muted">Seu progresso fica salvo só neste celular. Copie o código de backup de vez em quando e guarde num lugar seguro, como uma nota ou um e-mail para você mesmo. Para trocar de celular, cole o código lá.</p>
      <div class="row"><button class="btn fill" data-act="copyBackup">Copiar código de backup</button></div>
      <textarea id="backupBox" placeholder="Cole aqui um código de backup para restaurar" rows="3"></textarea>
      <button class="btn" data-act="restore">Restaurar progresso</button>
      ${b.msg?`<p class="notice ${b.err?"err":""}">${esc(b.msg)}</p>`:""}
    </section>
    <section class="panel"><h3>Ajustes</h3>
      <div class="seg"><button data-audio="1" aria-pressed="${p.autoAudio}">Tocar a frase sozinho</button><button data-audio="0" aria-pressed="${!p.autoAudio}">Só quando eu tocar</button></div>
      ${canSpeak?"":`<p class="notice err">Este navegador não tem voz em inglês. Os exercícios de ouvir viram exercícios de leitura.</p>`}
      <p class="small muted">Achou a trilha fácil demais? Refaça o teste. Ele só avança a sua trilha, nunca apaga o que você já fez.</p>
      <button class="btn" data-act="placement">Refazer o teste de nível</button>
      <div class="field"><label for="renameInput" class="small muted">Seu nome</label><div class="row"><input type="text" id="renameInput" class="grow" value="${esc(p.name)}" maxlength="30"><button class="btn" data-act="rename">Salvar</button></div></div>
    </section></div>`;
}

/* ---------- Backup ---------- */
function backupCode(){ return "ED1."+btoa(unescape(encodeURIComponent(JSON.stringify(S.profile)))); }
function readBackup(code){
  const c=String(code||"").trim().replace(/\s+/g,"");
  if(!c.startsWith("ED1.")) throw new Error("format");
  const p=JSON.parse(decodeURIComponent(escape(atob(c.slice(4)))));
  if(!p||typeof p!=="object"||typeof p.done!=="object"||typeof p.items!=="object") throw new Error("shape");
  return p;
}
async function copyBackup(){
  const code=backupCode();
  try{ await navigator.clipboard.writeText(code); S.backup={msg:"Código copiado. Cole numa nota ou mande para você mesmo por e-mail ou WhatsApp.",err:false}; render(); }
  catch{ S.backup={msg:"Não consegui copiar sozinho. O código está na caixa acima: selecione tudo e copie.",err:true}; render(); const box=$("#backupBox"); if(box){ box.value=code; box.focus(); box.select(); } }
}

/* ---------- Lesson ---------- */
function begin(kind,nodeId,title,ex,unit){
  const th=unit?theme(unit):{style:"--c:#6C4CF1;--on:#fff"};
  S.lesson={kind,nodeId,title,unit,style:th.style,queue:ex,done:0,firstTry:0,graded:0,results:{},start:Date.now(),cur:fresh(),retried:new Set(),confirmExit:false,finished:null,
    reviewCount:new Set(ex.filter(e=>e.stage==="review").map(e=>e.item.id)).size,newCount:new Set(ex.filter(e=>e.stage==="new").map(e=>e.item.id)).size};
  render(); window.scrollTo(0,0);
}
function startLesson(nodeId){
  const node=pathNodes().find(n=>n.id===nodeId); if(!node) return;
  const items=unitItems(node.unit), pool=allUnits().flatMap(unitItems);
  const newItems=node.kind==="lesson"?items.slice(node.k*4,node.k*4+4):items;
  const ids=new Set(newItems.map(i=>i.id));
  const review=dueItems().filter(i=>!ids.has(i.id)).slice(0,6);
  begin(node.kind,nodeId,node.unit.title+" · "+node.label,lessonExercises(node.kind,newItems,review,pool,canSpeak),node.unit);
}
function startDaily(){
  const nx=nextNode(); if(nx) return startLesson(nx.id);
  const due=dueItems().slice(0,6); if(!due.length) return;
  begin("practice",null,"Revisão",lessonExercises("practice",[],due,allUnits().flatMap(unitItems),canSpeak),null);
}
function startPlacement(){
  // one question from every other unit, in order: 20 questions across the whole path
  const pool=allUnits().flatMap(unitItems);
  const items=allUnits().filter((u,i)=>i%2===0).map(u=>shuffle(unitItems(u))[0]);
  begin("placement",null,"Teste de nível",lessonExercises("placement",items,[],pool,canSpeak),null);
}
function fresh(){ return {sel:null,built:[],typed:"",checked:false,ok:false,typo:false,easier:false}; }
function curEx(){ return S.lesson.queue[0]; }

function instruction(type){
  return {mc_pt:"O que significa esta frase?",mc_en:"Escolha a tradução certa",listen_mc:"Escolha o que você ouviu",build:"Monte a frase em inglês",listen_build:"Monte o que você ouvir",fill:"Complete a frase",type:"Escreva em inglês"}[type];
}
function renderLesson(){
  const L=S.lesson;
  if(L.finished) return renderFinished();
  const ex=curEx(), c=L.cur, total=L.done+L.queue.length, pct=Math.round(L.done/total*100);
  const type=(ex.type==="type"&&c.easier)?"build":ex.type;
  if(type==="build"&&!ex.bank){ Object.assign(ex,mk("build",ex.item,allUnits().flatMap(unitItems)),{type:ex.type,id:ex.id}); }
  const listen=`<div class="listen">${spk(ex.item.en,"big")}${canSpeak?`<button class="spk" data-slow="${esc(ex.item.en)}" aria-label="Ouvir devagar">${SLOW}</button>`:""}</div>`;
  let body="";
  if(type==="mc_pt") body=`<div class="say">${spk(ex.item.en)}<p class="say-text">${esc(ex.item.en)}</p></div>${opts(ex.options,c)}`;
  else if(type==="mc_en") body=`<p class="prompt-pt">${esc(ex.item.pt)}</p>${opts(ex.options,c)}`;
  else if(type==="listen_mc") body=`${listen}${opts(ex.options,c)}`;
  else if(type==="build"||type==="listen_build"){
    const used=new Set(c.built);
    body=`${type==="build"?`<p class="prompt-pt">${esc(ex.item.pt)}</p>`:listen}
      <div class="answer-line" aria-label="Sua resposta">${c.built.map(i=>`<button class="wchip" data-unbuild="${i}" ${c.checked?"disabled":""}>${esc(ex.bank[i].w)}</button>`).join("")}</div>
      <div class="bank">${ex.bank.map(b=>`<button class="wchip ${used.has(b.i)?"used":""}" data-build="${b.i}" ${c.checked||used.has(b.i)?"disabled":""}>${esc(b.w)}</button>`).join("")}</div>`;
  }
  else if(type==="fill") body=`<p class="fill-sentence">${esc(ex.before)} <span class="blank">${c.sel!=null?esc(ex.options[c.sel]):"&nbsp;"}</span> ${esc(ex.after)}${esc(ex.end)}</p><p class="hint-pt">${esc(ex.item.pt)}</p>${opts(ex.options,c)}`;
  else if(type==="type") body=`<p class="prompt-pt">${esc(ex.item.pt)}</p><textarea id="typed" placeholder="Escreva em inglês" autocapitalize="sentences" autocomplete="off" autocorrect="off" spellcheck="false" ${c.checked?"disabled":""}>${esc(c.typed)}</textarea>
    ${c.checked?"":`<button class="btn ghost" data-act="easier" style="align-self:flex-start">Mais fácil: usar blocos de palavras</button>`}`;
  const ready=(type==="build"||type==="listen_build")?c.built.length>0:type==="type"?c.typed.trim().length>0:c.sel!=null;
  const tag=ex.stage==="review"?`<span class="tag review">Revisão</span>`:ex.isNew?`<span class="tag">Frase nova</span>`:"";
  return `<div style="${L.style}"><div class="lesson">
    <div class="lesson-top"><button class="close" data-act="exit" aria-label="Sair da lição">${XMARK}</button><div class="lbar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div></div>
    ${L.confirmExit?`<div class="confirm"><p><b>Sair da lição?</b> O que você fez nesta lição não será salvo.</p><div class="row"><button class="btn fill" data-act="stay">Continuar a lição</button><button class="btn" data-act="leave">Sair</button></div></div>`:""}
    <div class="col" style="gap:12px">${tag}<h2>${instruction(type)}</h2></div>
    ${body}
  </div>
  <div class="checkbar ${c.checked?(c.ok?"ok":"no"):""}"><div class="in">
    ${c.checked?feedback(ex,c):""}
    ${c.checked?`<button class="btn ${c.ok?"good":"bad"} wide" data-act="next" id="nextBtn">Continuar</button>`:`<button class="btn fill wide" data-act="check" id="checkBtn" ${ready?"":"disabled"}>Verificar</button>`}
  </div></div></div>`;
}
function opts(list,c){
  return `<div class="opts">${list.map((o,i)=>`<button class="opt ${c.sel===i?"sel":""}" data-opt="${i}" ${c.checked?"disabled":""}><span class="k">${i+1}</span><span>${esc(o)}</span></button>`).join("")}</div>`;
}
function feedback(ex,c){
  const line=`<div class="row">${spk(ex.item.en,"mini")}<p class="grow"><span class="fb-answer">${esc(ex.type==="mc_pt"&&!c.ok?ex.item.pt:ex.item.en)}</span><br><span class="small">${esc(ex.type==="mc_pt"&&!c.ok?ex.item.en:ex.item.pt)}</span></p></div>`;
  if(c.ok) return `<p class="fb-title">${CHECK}${c.typo?"Quase perfeito! Atenção à grafia":["Muito bem!","Correto!","Isso aí!","Ótimo!"][rnd(4)]}</p>${line}`;
  return `<p class="fb-title">${XMARK}Resposta certa:</p>${line}${S.lesson.kind==="placement"?"":`<p class="small">Esta frase volta no fim da lição e na revisão de amanhã.</p>`}`;
}
function afterLessonRender(){
  const L=S.lesson; if(!L||L.finished) return;
  const ex=curEx(), c=L.cur;
  if(!c.checked&&!c.spoken&&S.profile.autoAudio&&canSpeak&&["mc_pt","listen_mc","listen_build"].includes(ex.type)){ c.spoken=true; speak(ex.item.en); }
  const ta=$("#typed"); if(ta&&!c.checked){ ta.focus(); ta.setSelectionRange(ta.value.length,ta.value.length); }
  const nb=$("#nextBtn"); if(nb) nb.focus({preventScroll:true});
}
function check(){
  const L=S.lesson, ex=curEx(), c=L.cur; if(c.checked) return;
  const type=(ex.type==="type"&&c.easier)?"build":ex.type;
  let ok=false, typo=false;
  if(type==="build"||type==="listen_build"){ ok=norm(c.built.map(i=>ex.bank[i].w).join(" "))===norm(ex.item.en); }
  else if(type==="type"){ const r=checkText(c.typed,ex.item); ok=r.ok; typo=!!r.typo; }
  else ok=ex.options[c.sel]===ex.answer;
  c.checked=true; c.ok=ok; c.typo=typo;
  const r=L.results[ex.item.id]||(L.results[ex.item.id]={wrong:false});
  if(!L.retried.has(ex.id)){ L.graded++; if(ok) L.firstTry++; }
  if(!ok) r.wrong=true;
  if(S.profile.autoAudio&&canSpeak) speak(ex.item.en);
  render();
}
function next(){
  const L=S.lesson, ex=L.queue.shift(), c=L.cur;
  if(!c.ok && !L.retried.has(ex.id) && L.kind!=="placement"){ const again=mk(ex.type,ex.item,allUnits().flatMap(unitItems)); again.stage=ex.stage; L.retried.add(again.id); L.queue.push(again); }
  L.done++; L.cur=fresh();
  if(!L.queue.length) finishLesson(); else render();
  window.scrollTo(0,0);
}
function finishLesson(){
  const L=S.lesson, p=S.profile, t=today();
  const acc=L.graded?Math.round(L.firstTry/L.graded*100):100;
  if(L.kind==="placement") return finishPlacement(acc);
  for(const [id,r] of Object.entries(L.results)){
    const st=p.items[id]||{s:0,due:t,wrong:0};
    if(r.wrong){ st.s=Math.max(0,st.s-1); st.due=t; st.wrong=(st.wrong||0)+1; }
    else{ st.s=Math.min(5,st.s+1); st.due=addDays(t,INTERVALS[st.s]); }
    st.last=t; p.items[id]=st;
  }
  if(L.nodeId) p.done[L.nodeId]=true;
  p.placed=true;
  const first=!p.days[t]; const d=p.days[t]||{lessons:0}; d.lessons=(d.lessons||0)+1; p.days[t]=d;
  const ks=Object.keys(p.days).sort(); while(ks.length>400) delete p.days[ks.shift()];
  save();
  L.finished={acc,first,mins:Math.max(1,Math.round((Date.now()-L.start)/60000))};
  render();
}
function finishPlacement(acc){
  const L=S.lesson, p=S.profile, t=today(), units=allUnits();
  const wrong=new Set(Object.entries(L.results).filter(([,r])=>r.wrong).map(([id])=>id.slice(0,id.lastIndexOf("-"))));
  const firstWrong=units.findIndex(u=>wrong.has(u.id));
  // the unit before a missed one was not tested, so start there to be safe
  const idx=firstWrong<0?units.length:Math.max(0,firstWrong-1);
  let k=0;
  units.slice(0,idx).forEach(u=>{
    nodesOf(u).forEach(n=>{ p.done[n.id]=true; });
    unitItems(u).forEach(i=>{ if(!p.items[i.id]) p.items[i.id]={s:2,due:addDays(t,2+(k++%14)),wrong:0,last:t}; });
  });
  p.placed=true; save();
  L.finished={placement:true,idx,acc};
  render();
}
function burst(inner){
  const conf=[["12%","8%",HUES[0][0],20],["82%","14%",HUES[1][0],-15],["6%","70%",HUES[5][0],35],["88%","66%",HUES[4][0],-30],["48%","-4%",HUES[3][0],10],["70%","92%",HUES[2][0],45]];
  return `<div class="burst"><span class="ring"></span><span class="ring2"></span>${conf.map(([l,t,c,r])=>`<i style="left:${l};top:${t};background:${c};transform:rotate(${r}deg)"></i>`).join("")}<span class="core">${inner}</span></div>`;
}
function renderFinished(){
  const L=S.lesson, f=L.finished;
  if(f.placement){
    const nx=nextNode();
    return `<div style="${nx?theme(nx.unit).style:L.style}"><div class="lesson done-screen">
      ${burst(nx?`<svg class="uicon lg" viewBox="0 0 48 48" aria-hidden="true">${glyph(nx.unit)}</svg>`:CHECK)}
      <h1>Teste concluído</h1>
      <p class="muted">Você acertou ${f.acc}% das perguntas.</p>
      <section class="tip" style="width:100%;text-align:left">${f.idx===0?`<p>Você começa pela <b>Unidade 1</b>. As primeiras lições vão ser rápidas se você já souber parte delas.</p>`
        :`<p>Você já domina ${f.idx===allUnits().length?"todas as unidades":`as unidades 1 a ${f.idx}`}.${nx?` Sua trilha começa em <b>${esc(nx.unit.title)}</b>.`:""}</p><p class="small muted">As frases dessas unidades voltam aos poucos na revisão, para não serem esquecidas.</p>`}</section>
    </div>
    <div class="checkbar"><div class="in"><button class="btn fill wide" data-act="home" id="nextBtn">Ir para a trilha</button></div></div></div>`;
  }
  return `<div style="${L.style}"><div class="lesson done-screen">
    ${burst(CHECK)}
    <h1>${f.first?"Atividade de hoje feita!":"Lição extra concluída!"}</h1>
    <p class="muted">${esc(L.title)}</p>
    <div class="done-stats">
      <div class="dstat"><b>${L.reviewCount}</b><span>revisadas</span></div>
      <div class="dstat"><b>${L.newCount}</b><span>novas</span></div>
      <div class="dstat"><b>${f.acc}%</b><span>acertos</span></div>
    </div>
    <p class="muted">${f.mins} ${f.mins===1?"minuto":"minutos"}.${f.first?" Até amanhã!":""}</p>
  </div>
  <div class="checkbar"><div class="in"><button class="btn fill wide" data-act="home" id="nextBtn">Continuar</button></div></div></div>`;
}

/* ---------- Events ---------- */
document.addEventListener("click",e=>{
  const b=e.target.closest("button"); if(!b||b.disabled) return;
  const L=S.lesson;
  if(b.dataset.speak!==undefined){ speak(b.dataset.speak); return; }
  if(b.dataset.slow!==undefined){ speak(b.dataset.slow,true); return; }
  if(b.dataset.tab){ S.tab=b.dataset.tab; S.unitView=null; render(); window.scrollTo(0,0); return; }
  if(b.dataset.unit){ S.unitView=b.dataset.unit; render(); window.scrollTo(0,0); return; }
  if(b.dataset.start){ startLesson(b.dataset.start); return; }
  if(b.dataset.audio){ S.profile.autoAudio=b.dataset.audio==="1"; save(); render(); return; }
  if(L&&!L.finished){
    const c=L.cur;
    if(b.dataset.opt){ c.sel=Number(b.dataset.opt); render(); return; }
    if(b.dataset.build){ c.built.push(Number(b.dataset.build)); render(); return; }
    if(b.dataset.unbuild){ c.built=c.built.filter(i=>i!==Number(b.dataset.unbuild)); render(); return; }
  }
  const a=b.dataset.act;
  if(a==="check") check();
  else if(a==="next") next();
  else if(a==="easier"){ L.cur.easier=true; render(); }
  else if(a==="exit"){ L.confirmExit=true; render(); }
  else if(a==="stay"){ L.confirmExit=false; render(); }
  else if(a==="leave"||a==="home"){ S.lesson=null; S.unitView=null; S.tab="inicio"; render(); window.scrollTo(0,0); }
  else if(a==="back"){ S.unitView=null; render(); window.scrollTo(0,0); }
  else if(a==="daily") startDaily();
  else if(a==="placement") startPlacement();
  else if(a==="skipPlacement"){ S.profile.placed=true; save(); render(); }
  else if(a==="hideInstall"){ S.profile.installHidden=true; save(); render(); }
  else if(a==="saveName"||a==="rename"){ const v=($(a==="saveName"?"#nameInput":"#renameInput")?.value||"").trim(); if(v){ S.profile.name=v; save(); render(); } }
  else if(a==="copyBackup") copyBackup();
  else if(a==="restore"){
    try{ const p=readBackup($("#backupBox")?.value); S.profile=Object.assign(structuredClone(DEFAULT_PROFILE),p); save(); S.backup={msg:"Progresso restaurado.",err:false}; }
    catch{ S.backup={msg:"Esse código não parece um backup do English Daily. Confira se copiou o código inteiro, começando por ED1.",err:true}; }
    render();
  }
});
document.addEventListener("input",e=>{
  if(e.target.id==="typed"&&S.lesson){ S.lesson.cur.typed=e.target.value; const cb=$("#checkBtn"); if(cb) cb.disabled=!e.target.value.trim(); }
});
document.addEventListener("keydown",e=>{
  if(e.key==="Enter"&&e.target.id==="nameInput"){ e.preventDefault(); $('[data-act="saveName"]')?.click(); return; }
  const L=S.lesson; if(!L) return;
  if(e.key==="Enter"&&!e.shiftKey){
    if(L.finished){ e.preventDefault(); S.lesson=null; S.unitView=null; render(); return; }
    if(L.cur.checked){ e.preventDefault(); next(); return; }
    const cb=$("#checkBtn"); if(cb&&!cb.disabled){ e.preventDefault(); check(); }
    return;
  }
  if(/TEXTAREA|INPUT/.test(document.activeElement?.tagName)) return;
  const ex=L.queue[0]; if(!ex||L.cur.checked||L.finished) return;
  if(ex.options&&/^[1-3]$/.test(e.key)){ L.cur.sel=Number(e.key)-1; render(); }
});
// a new day may start while the app sits open in the background
document.addEventListener("visibilitychange",()=>{ if(!document.hidden&&!S.lesson) render(); });

/* ---------- Boot ---------- */
S.profile=Object.assign(structuredClone(DEFAULT_PROFILE),load()||{});
render();
if("serviceWorker" in navigator && location.protocol!=="file:"){ navigator.serviceWorker.register("sw.js").catch(()=>{}); }
