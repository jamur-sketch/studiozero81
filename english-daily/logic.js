

const GROUPS = [["have","has","had"],["do","does","did"],["for","since","ago"],["in","on","at"],["go","going","went","gone"],["will","would","won't"],["is","are","was","were"],["am","is","are"],["could","would","should"],["to","for","with"],["some","any","much"],["me","my","I"],["you","your","yours"],["this","these","that"],["yet","already","just"],["up","off","out","over","into"],["make","do","take"],["the","a","an"],["don't","doesn't","didn't"],["there","their","they"],["us","we","our"]];
const STOP_BLANK = new Set(["a","i"]);
const INTERVALS = [0,1,3,7,14,30];

const pad = n => String(n).padStart(2,"0");
const dstr = d => d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const today = () => dstr(new Date());
const addDays = (s,n) => { const [y,m,d]=s.split("-").map(Number); const x=new Date(y,m-1,d); x.setDate(x.getDate()+n); return dstr(x); };
const uid = () => Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const rnd = n => Math.floor(Math.random()*n);
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=rnd(i+1); [a[i],a[j]]=[a[j],a[i]]; } return a; }

function norm(s){
  s=String(s).toLowerCase().replace(/[’‘`´]/g,"'");
  s=s.replace(/\bwon't\b/g,"will not").replace(/\bcan't\b/g,"can not").replace(/\bcannot\b/g,"can not").replace(/\blet's\b/g,"let us")
     .replace(/n't\b/g," not").replace(/'ll\b/g," will").replace(/'ve\b/g," have").replace(/'re\b/g," are").replace(/'d\b/g," would").replace(/'m\b/g," am").replace(/'s\b/g," is");
  s=s.replace(/\b(do|does|did|is|are|was|were|have|has|had|could|would|should)nt\b/g,"$1 not").replace(/\bcant\b/g,"can not").replace(/\bim\b/g,"i am").replace(/\bive\b/g,"i have").replace(/\b(you|they)re\b/g,"$1 are").replace(/\blets\b/g,"let us");
  return s.replace(/[^a-z0-9 ]+/g," ").replace(/\s+/g," ").trim();
}
function lev(a,b){
  const m=a.length,n=b.length; if(!m) return n; if(!n) return m;
  let prev=Array.from({length:n+1},(_,j)=>j);
  for(let i=1;i<=m;i++){ const cur=[i]; for(let j=1;j<=n;j++){ cur[j]=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1)); } prev=cur; }
  return prev[n];
}
function tokens(en){ return String(en).split(/\s+/).map(w=>w.replace(/^[^\w']+|[^\w']+$/g,"")).filter(Boolean); }
function checkText(answer, item){
  const a=norm(answer); if(!a) return {ok:false};
  const targets=[item.en,...(item.alts||[])].map(norm);
  if(targets.includes(a)) return {ok:true};
  const t=targets[0]; const tol=Math.max(1,Math.floor(t.length/14));
  if(lev(a,t)<=tol) return {ok:true,typo:true};
  return {ok:false};
}
function pickOthers(pool,item,n,key){
  const seen=new Set([norm(item[key])]), out=[];
  for(const o of shuffle(pool)){ const k=norm(o[key]); if(seen.has(k)) continue; seen.add(k); out.push(o[key]); if(out.length===n) break; }
  return out;
}
function fillDistractors(word,pool,sentenceWords){
  const lw=word.toLowerCase(), inS=new Set(sentenceWords.map(w=>w.toLowerCase()));
  const g=GROUPS.find(g=>g.includes(lw));
  let out=g?shuffle(g.filter(x=>x!==lw)).slice(0,2):[];
  if(out.length<2){
    const words=shuffle([...new Set(pool.flatMap(o=>tokens(o.en)).map(w=>w.toLowerCase()))].filter(w=>w!==lw&&!inS.has(w)&&!out.includes(w)&&Math.abs(w.length-lw.length)<=3&&w!=="i"));
    out=out.concat(words.slice(0,2-out.length));
  }
  const cap=/^[A-Z]/.test(word)&&word!=="I";
  return out.map(w=>w==="i"?"I":cap?w[0].toUpperCase()+w.slice(1):w);
}
function mk(type,item,pool,opts){
  const ex={type,item,id:uid(),isNew:!!(opts&&opts.isNew)};
  if(type==="mc_pt"){ ex.options=shuffle([item.pt,...pickOthers(pool,item,2,"pt")]); ex.answer=item.pt; }
  else if(type==="mc_en"||type==="listen_mc"){ ex.options=shuffle([item.en,...pickOthers(pool,item,2,"en")]); ex.answer=item.en; }
  else if(type==="build"||type==="listen_build"){
    const t=tokens(item.en), lower=new Set(t.map(w=>w.toLowerCase()));
    const extra=shuffle([...new Set(pool.flatMap(o=>tokens(o.en)))].filter(w=>!lower.has(w.toLowerCase()))).slice(0,t.length>5?3:2);
    ex.bank=shuffle([...t,...extra]).map((w,i)=>({w,i}));
  }
  else if(type==="fill"){
    const t=tokens(item.en);
    let idx=t.map((w,i)=>i).filter(i=>GROUPS.some(g=>g.includes(t[i].toLowerCase())));
    if(!idx.length) idx=t.map((w,i)=>i).filter(i=>t[i].length>=3&&!STOP_BLANK.has(t[i].toLowerCase()));
    if(!idx.length) idx=t.map((w,i)=>i);
    const k=idx[rnd(idx.length)];
    ex.before=t.slice(0,k).join(" "); ex.after=t.slice(k+1).join(" ");
    ex.end=(String(item.en).match(/[.!?]+$/)||[""])[0];
    ex.answer=t[k]; ex.options=shuffle([t[k],...fillDistractors(t[k],pool,t)]);
  }
  return ex;
}
function lessonExercises(kind,newItems,reviewItems,pool,tts){
  const L=t=>tts?t:({listen_mc:"mc_en",listen_build:"build"}[t]||t);
  const rc=["fill","build","listen_build","type"];
  const ex=reviewItems.map((it,i)=>Object.assign(mk(L(rc[i%rc.length]),it,pool),{stage:"review"}));
  const nw=[];
  if(kind==="lesson"){
    newItems.forEach((it,i)=>nw.push(mk(L(i%2?"listen_mc":"mc_pt"),it,pool,{isNew:true})));
    newItems.forEach(it=>nw.push(mk("build",it,pool)));
    const third=["fill","listen_build","mc_en","fill"];
    newItems.forEach((it,i)=>nw.push(mk(L(third[i%4]),it,pool)));
    if(newItems.length) nw.push(mk("type",newItems[rnd(newItems.length)],pool));
  } else if(kind==="placement"){
    newItems.forEach((it,i)=>nw.push(mk(L(["mc_en","fill","build"][i%3]),it,pool)));
  } else {
    const cycle=["type","listen_build","fill","build"];
    shuffle(newItems).forEach((it,i)=>nw.push(mk(L(cycle[i%cycle.length]),it,pool)));
  }
  nw.forEach(e=>{ e.stage="new"; });
  return ex.concat(nw);
}
