'use strict';
/* ═══════════ النواة: التخزين والتواريخ ═══════════ */
const EDS={
  abnaa:{key:'rushdFam:v1',app:'rushd-abnaa',name:'أبناء',parent:'وليّ الأمر',toParent:'لوليّ الأمر',self:'الابن',names:['حمزة','حورية','حنين','ملك'],subjects:true,plan:false,helper:false,
    inTypes:['مواد','مالي','تقييم','تكليف','إعداد','نسخة_احتياطية'],tabs:[['home','🏠','الرئيسية'],['ach','📝','إنجازاتي'],['ch','⭐','التحديات'],['money','💰','مصروفي'],['rp','📊','التقرير']],tiles:['today','hw','money','month','week','msgs']},
  zawja:{key:'rushdZawja:v1',app:'rushd-zawja',name:'زوجة',parent:'الزوج',toParent:'للزوج',self:'الزوجة',names:null,subjects:false,plan:true,helper:true,
    inTypes:['مالي','إعداد','خطة','نسخة_احتياطية'],tabs:[['home','🏠','الرئيسية'],['plan','📅','الأسبوع'],['ch','⭐','التحديات'],['money','💰','مصروفي'],['rp','📊','التقرير']],tiles:['plan','today','week','money','month','helper']}};
const E=EDS[window.RUSHD_EDITION]||EDS.abnaa;
const KEY=E.key, APPV='1.1', EDITION=E.name;
const pad=n=>String(n).padStart(2,'0');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const keyOf=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const kd=k=>{const[y,m,d]=k.split('-').map(Number);return new Date(y,m-1,d)};
const today=()=>keyOf(new Date());
const addDays=(k,n)=>{const d=kd(k);d.setDate(d.getDate()+n);return keyOf(d)};
const isFri=k=>kd(k).getDay()===5;
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const isoNow=()=>{const d=new Date(),o=-d.getTimezoneOffset(),a=Math.abs(o);return `${keyOf(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${o>=0?'+':'-'}${pad(a/60|0)}:${pad(a%60)}`};
const fmtD=(k,o)=>kd(k).toLocaleDateString('ar-u-nu-latn',o||{weekday:'long',day:'numeric',month:'long'});
const hijri=k=>{try{return kd(k).toLocaleDateString('ar-u-ca-islamic-umalqura-nu-latn',{day:'numeric',month:'long',year:'numeric'})}catch(e){return''}};
const toNum=s=>{if(s==null)return NaN;const t=String(s).trim().replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٫,]/g,'.');return t===''?NaN:+t};
const money=v=>(+v||0).toLocaleString('en',{minimumFractionDigits:3,maximumFractionDigits:3})+' د.ك';
const nfmt=v=>{const r=Math.round(v*10)/10;return Number.isInteger(r)?String(r):r.toFixed(1)};
const dayUnit=(n,fri)=>fri?(n>2&&n<11?'جُمَع':'جمعة'):(n>2&&n<11?'أيام':'يوماً');

function blank(){return{v:1,app:E.app,plan:[],helper:{},created:isoNow(),profile:null,days:{},act:{},tgt:{},ach:[],
  money:{opening:null,tx:[],counts:[]},subjects:{cur:null,hist:[]},inbox:[],tasks:[],evals:[],log:[],tiles:null,lastBackup:null}}
let S;
try{S=JSON.parse(localStorage.getItem(KEY)||'null')||blank()}catch(e){S=blank()}
S=Object.assign(blank(),S);
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){toast('تعذّر الحفظ في ذاكرة المتصفح. صدّر نسخة احتياطية الآن.')}}
function log(w){S.log.push({at:isoNow(),w})}
try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist()}catch(e){}

/* ═══════════ قانون الألوان (من رُشد) ═══════════
   أزرق = الهدف كاملاً، أسود = بلغ النصف فأكثر، أحمر = دون النصف. رمادي = لا أيام مسجَّلة. */
const G=(v,full,half)=>v>=full-1e-9?'b':v>=half-1e-9?'k':'r';
const GC={b:'c-b',k:'c-k',r:'c-r',g:'c-g'};
const GN={b:'أزرق',k:'أسود',r:'أحمر',g:'رمادي'};
const LEG=`<div class="leg"><b class="c-b">أزرق</b> الهدف كاملاً · <b class="c-k">أسود</b> بلغ النصف · <b class="c-r">أحمر</b> دون النصف · <b class="c-g">رمادي</b> لم يُسجَّل</div>`;

/* ═══════════ وحدة التحديات ═══════════ */
const CH=[
  {id:'hifz',n:'الحفظ',i:'📖',g:'القرآن',t:'pages'},
  {id:'muraja',n:'المراجعة',i:'🔁',g:'القرآن',t:'pages'},
  {id:'tasmee',n:'التسميع',i:'🎙️',g:'القرآن',t:'pages'},
  {id:'jamaa',n:'الصلوات في جماعة',i:'🕌',g:'الصلاة',t:'of',items:[['fajr','الفجر'],['dhuhr','الظهر'],['asr','العصر'],['maghrib','المغرب'],['isha','العشاء']]},
  {id:'rawatib',n:'الرواتب',i:'🕋',g:'الصلاة',t:'of',hint:'ركعتان لكل صلاة',items:[['dhuhr','الظهر (قبلها أو بعدها)'],['maghrib','بعد المغرب'],['isha','بعد العشاء']]},
  {id:'fajrS',n:'سنة الفجر',i:'🌄',g:'الصلاة',t:'tick'},
  {id:'witr',n:'الوتر',i:'🌙',g:'الصلاة',t:'tick'},
  {id:'birr',n:'بر الوالدين',i:'🤍',g:'البر والأذكار',t:'birr'},
  {id:'am',n:'أذكار الصباح',i:'🌅',g:'البر والأذكار',t:'tick'},
  {id:'pm',n:'أذكار المساء',i:'🌇',g:'البر والأذكار',t:'tick'},
  {id:'tasbih',n:'التسبيح',i:'📿',g:'البر والأذكار',t:'count',target:10},
  {id:'tahmid',n:'التحميد',i:'🌼',g:'البر والأذكار',t:'count',target:10},
  {id:'takbir',n:'التكبير',i:'☝️',g:'البر والأذكار',t:'count',target:10},
  {id:'salawat',n:'الصلاة على النبي صلى الله عليه وسلم',i:'🤲',g:'البر والأذكار',t:'count',target:10},
  {id:'kahf',n:'سورة الكهف',i:'📗',g:'الجمعة',t:'tick',fri:true}
];
const BR=[['visit','زيارة','🏠'],['call','مكالمة','📞'],['gift','هدية','🎁'],['money','مال','💵'],['serve','خدمة','🤝'],['dua','دعاء','🤲']];
const chById=id=>CH.find(c=>c.id===id);
const perOn=(id,k)=>(S.act[id]||[]).find(p=>p.from<=k&&(!p.to||k<=p.to));
const isOn=(id,k)=>!!perOn(id,k||today());
const openPer=id=>(S.act[id]||[]).find(p=>!p.to);
function activate(id,target){const t=today(),L=S.act[id]=S.act[id]||[];L.forEach(p=>{if(!p.to)p.to=addDays(t,-1)});L.push({from:t,to:null,target:target??null,at:isoNow()});
  const c=chById(id);log(`تفعيل تحدٍّ: ${c.n}${target!=null?` بهدف ${target} صفحة`:''}`)}
function deactivate(id){const t=today();(S.act[id]||[]).forEach(p=>{if(!p.to){p.to=addDays(t,-1);p.endAt=isoNow()}});log(`إيقاف تحدٍّ: ${chById(id).n}`)}
function tgtOn(c,k){if(c.t==='pages'){const p=perOn(c.id,k);return p&&p.target?+p.target:0}
  if(c.t==='of')return c.items.length;if(c.t==='count'){const L=(S.tgt[c.id]||[]).filter(x=>x.from<=k).sort((a,b)=>a.from<b.from?-1:1);return L.length?+L[L.length-1].v:c.target}return 1}
const dayRec=k=>S.days[k]||null;
const recorded=k=>!!(S.days[k]&&S.days[k].touched);
function rawVal(c,k){const d=dayRec(k);return d&&d.c?d.c[c.id]:undefined}
function valOf(c,k){const r=rawVal(c,k);if(r==null)return 0;
  if(c.t==='of')return Array.isArray(r)?r.length:0;if(c.t==='tick')return r?1:0;if(c.t==='birr')return r&&r.t&&r.t.length?1:0;return +r||0}
function setVal(id,k,v){const d=S.days[k]=S.days[k]||{c:{}};d.c=d.c||{};d.c[id]=v;d.touched=true;d.at=isoNow();save()}
/* الإحصاء لفترة: الحد × عدد الأيام المسجَّلة، ولا يُحسب اليوم غير المسجَّل صفراً */
function stat(c,from,to){const end=to<today()?to:today();let sum=0,full=0,n=0,m=0,un=0;
  for(let k=from;k<=end;k=addDays(k,1)){if(!isOn(c.id,k))continue;if(c.fri&&!isFri(k))continue;m++;if(!recorded(k)){un++;continue}n++;sum+=valOf(c,k);full+=tgtOn(c,k)}
  return{sum,full,n,m,un,g:n?G(sum,full,full/2):'g'}}
const monthStart=k=>k.slice(0,8)+'01';
const monthEnd=k=>{const d=kd(monthStart(k));d.setMonth(d.getMonth()+1);d.setDate(0);return keyOf(d)};
const weekStart=k=>addDays(k,-((kd(k).getDay()+1)%7)); // الأسبوع من السبت إلى الجمعة
const activeIds=k=>CH.filter(c=>isOn(c.id,k)&&(!c.fri||isFri(k))).map(c=>c.id);
const everOn=id=>(S.act[id]||[]).some(p=>!p.to||p.to>=p.from);
function unitOf(c){return c.t==='pages'?'صفحة':c.t==='count'?'مرات':c.t==='of'?'':''}
function statLine(c,s){if(!s.m)return'';const u=dayUnit(s.m,c.fri);
  const val=c.t==='tick'||c.t==='birr'?`${s.sum} من ${s.n} ${dayUnit(s.n,c.fri)}`:`${nfmt(s.sum)} من ${nfmt(s.full)} ${unitOf(c)}`;
  return `<b class="${GC[s.g]}">${s.n?val:'لم يُسجَّل'}</b> · سُجّل ${s.n} من ${s.m} ${u}`}

/* ═══════════ وحدة المواد والإنجازات ═══════════ */
const subjKey=s=>s['رمز']||s['الاسم_عربي'];
function subjList(all){const cur=S.subjects.cur;if(!E.subjects||!cur)return[];return cur.list.filter(s=>all||s['الحالة']==='حالي')}
function subjLabel(key){const s=(S.subjects.cur?S.subjects.cur.list:[]).find(x=>subjKey(x)===key)||S.subjects.hist.flatMap(h=>h.list).find(x=>subjKey(x)===key);
  if(!s)return key;return s['رمز']?`${s['الاسم_عربي']} (${s['رمز']})`:s['الاسم_عربي']}
const achOn=k=>S.ach.filter(a=>a.k===k);
const hwCount=(from,to)=>S.ach.filter(a=>a.kind==='hw'&&a.st!=='x'&&a.k>=from&&a.k<=to).reduce((x,a)=>x+(+a.count||1),0);

/* ═══════════ وحدة المال ═══════════ */
const txOk=()=>S.money.tx.filter(t=>t.st!=='x');
function balance(){const o=S.money.opening?+S.money.opening.amount:0,inn=txOk().filter(t=>t.dir==='in').reduce((a,t)=>a+ +t.amount,0),out=txOk().filter(t=>t.dir==='out').reduce((a,t)=>a+ +t.amount,0);
  return{o,inn,out,bal:+(o+inn-out).toFixed(3)}}

/* ═══════════ صيغة ملف رُشد ═══════════ */
const TYPES={'خطة':'خطة الأسبوع','مواد':'قائمة المواد','مالي':'كشف مالي','تقييم':'تقييم','تكليف':'تكليف','إعداد':'إعداد الأهداف','نسخة_احتياطية':'نسخة احتياطية','تقرير':'تقرير','إنجاز_تكليف':'إنجاز تكليف'};
const IN_TYPES=E.inTypes;
function envelope(type,payload,to){return{'صيغة':'rushd-family','إصدار_الصيغة':1,'معرّف':`${type}-${(S.profile&&S.profile.name)||'x'}-${keyOf(new Date()).replace(/-/g,'')}-${uid().slice(-5)}`,
  'النوع':type,'من':(S.profile&&S.profile.name)||'','إلى':to||E.parent,'التاريخ':isoNow(),'التطبيق':`رُشد ${EDITION} ${APPV}`,'الحمولة':payload}}
function parseEnvelope(text){let o;try{o=JSON.parse(String(text).trim().replace(/^```(?:json)?|```$/g,''))}catch(e){return{err:'النص ليس ملف JSON صالحاً. تأكد أنك نسخت الملف كاملاً.'}}
  if(!o||o['صيغة']!=='rushd-family')return{err:'هذا ليس ملف رُشد: حقل «صيغة» ليس rushd-family.'};
  if(o['إصدار_الصيغة']!==1)return{err:`إصدار الصيغة ${esc(o['إصدار_الصيغة'])} غير مدعوم في هذه النسخة.`};
  if(!o['معرّف']||typeof o['معرّف']!=='string')return{err:'الملف بلا «معرّف».'};
  if(!IN_TYPES.includes(o['النوع']))return{err:`نوع الملف «${esc(o['النوع'])}» لا تستقبله هذه النسخة.`};
  if(!o['الحمولة']||typeof o['الحمولة']!=='object')return{err:'الملف بلا «حمولة».'};
  return{o}}

/* ═══════════ أدوات الواجهة ═══════════ */
const U={tab:'home',day:today(),rp:'week',rpK:today(),planK:today(),pending:null};
let toastT=0;
function toast(t){let el=document.querySelector('.toast');if(!el){el=document.createElement('div');el.className='toast';document.body.appendChild(el)}el.textContent=t;clearTimeout(toastT);toastT=setTimeout(()=>el.remove(),2600)}
function openSheet(title,html,bind){closeSheet();const ov=document.createElement('div');ov.className='ov';
  ov.innerHTML=`<div class="sheet" role="dialog" aria-label="${esc(title)}"><h3>${esc(title)}<button class="close" data-x aria-label="إغلاق">✕</button></h3>${html}</div>`;
  ov.addEventListener('click',e=>{if(e.target===ov||e.target.closest('[data-x]'))closeSheet()});document.body.appendChild(ov);bind&&bind(ov.querySelector('.sheet'))}
function closeSheet(){document.querySelectorAll('.ov').forEach(e=>e.remove())}
function twice(btn,fn,label){btn.addEventListener('click',()=>{if(btn.dataset.c!=='1'){btn.dataset.c='1';btn.dataset.t=btn.textContent;btn.textContent=label||'اضغط مرة أخرى للتأكيد';setTimeout(()=>{if(btn.isConnected){btn.dataset.c='';btn.textContent=btn.dataset.t}},3500);return}fn()})}
function go(tab){U.tab=tab;window.scrollTo(0,0);render()}
function dayNav(){const k=U.day,t=today();return `<div class="daynav"><button class="btn ghost sm" data-a="dprev">السابق</button>
  <div class="lbl">${k===t?'اليوم':esc(fmtD(k))}<small>${esc(k===t?fmtD(k):'')} ${esc(hijri(k))}</small></div>
  <button class="btn ghost sm" data-a="dnext" ${k>=t?'disabled':''}>التالي</button></div>`}

/* ═══════════ الشاشات ═══════════ */
function render(){
  const app=document.getElementById('app');
  if(!S.profile){app.innerHTML=vSetup();document.getElementById('tabs').innerHTML='';return}
  app.innerHTML=({home:vHome,ach:vAch,plan:vPlan,ch:vCh,money:vMoney,rp:vReport,set:vSettings})[U.tab]();
  const T=E.tabs;
  document.getElementById('tabs').innerHTML=T.map(([k,i,n])=>`<button data-tab="${k}" ${U.tab===k?'aria-current="page"':''}><span>${i}</span>${n}</button>`).join('');
}

/* أول تشغيل */
function vSetup(){const names=E.names||[];
  return `<div style="padding-top:24px"><h1>أهلاً بك في رُشد ${EDITION}</h1><p class="t2">هذه الصفحة تحفظ بياناتك على هذا الجوال فقط. لا تُرسَل إلى أي مكان إلا بملف ترسله أنت.</p>
  <div class="card"><b>${names.length?'من أنت؟':'ما اسمك؟'}</b>${names.length?`<div class="chips" style="margin-top:10px">${names.map(n=>`<button class="chip" data-a="pickName" data-n="${n}">${n}</button>`).join('')}</div>`:''}
  <label class="field" style="margin-top:12px"><span>${names.length?'أو اكتب اسمك':'الاسم'}</span><input id="nmIn" placeholder="الاسم"></label><button class="btn" data-a="setName">ابدأ</button></div>
  <div class="card"><b>${E.subjects?'أو ابدأ بملف المواد':'أو استعد نسخة احتياطية'}</b><p class="t2" style="margin:4px 0 10px">${E.subjects?`إن أرسل لك ${E.parent} ملف المواد، استلمه أولاً فيُعرف اسمك منه.`:'إن كانت لديك نسخة احتياطية من جوال آخر، استلمها من هنا.'}</p><button class="btn ghost" data-a="import">📥 استلام ملف</button></div></div>`}

function vHome(){const t=today(),b=balance();
  const nb=!S.lastBackup||(Date.now()-new Date(S.lastBackup).getTime())>7*864e5;const hasData=Object.keys(S.days).length||S.ach.length||S.money.tx.length||(S.plan||[]).length;
  const openT=S.tasks.filter(x=>x.st!=='done'),newE=S.evals.filter(e=>!e.seen);
  return `<div class="top"><div><h1>السلام عليكم يا ${esc(S.profile.name)}</h1><div class="t2">${esc(fmtD(t))} · ${esc(hijri(t))}</div></div><button class="iconbtn" data-a="settings" aria-label="الإعدادات والملفات">⚙️</button></div>
  ${hasData&&nb?`<div class="banner">💾 ${S.lastBackup?'مضى أكثر من أسبوع على آخر نسخة احتياطية.':'لم تحفظ نسخة احتياطية بعد.'} <button data-a="backup">احفظ نسخة الآن</button></div>`:''}
  ${E.subjects&&!S.subjects.cur?`<div class="banner">📚 لم تُستلم قائمة موادك بعد. <button data-a="import">استلام ملف المواد</button></div>`:''}
  ${tilesHtml()}
  ${openT.length||newE.length?`<h2>من ${E.parent}</h2>${newE.map(e=>evalCard(e)).join('')}${openT.map(x=>taskCard(x)).join('')}`:''}`}

function evalCard(e){return `<div class="card"><div class="row"><span>📝</span><div class="grow"><b>${esc(e.title||'تقييم')}</b>${e.subj?` <span class="tag">${esc(subjLabel(e.subj))}</span>`:''}<div class="t2">${esc(e.date?fmtD(e.date):'')}</div></div>${e.seen?'':`<button class="btn ghost sm" data-a="evalSeen" data-id="${e.id}">قرأته</button>`}</div>${e.text?`<p style="margin:8px 0 0;white-space:pre-wrap">${esc(e.text)}</p>`:''}${e.grade!=null&&e.grade!==''?`<p style="margin:6px 0 0"><b>التقييم:</b> ${esc(e.grade)}</p>`:''}</div>`}
function taskCard(x){const st={new:'جديد',accepted:'قيد التنفيذ',done:'أُنجز'}[x.st];
  return `<div class="card"><div class="row"><span>📌</span><div class="grow"><b>${esc(x.title)}</b> <span class="tag">${st}</span><div class="t2">${x.due?`الموعد: ${esc(fmtD(x.due))}`:'بلا موعد'}</div></div></div>${x.desc?`<p style="margin:8px 0 0;white-space:pre-wrap">${esc(x.desc)}</p>`:''}
  <div class="actions">${x.st==='new'?`<button class="btn sm" data-a="taskAcc" data-id="${x.id}">قبلت التكليف</button>`:''}${x.st!=='done'?`<button class="btn ${x.st==='new'?'ghost':''} sm" data-a="taskDone" data-id="${x.id}">أنجزته</button>`:''}</div></div>`}

/* المربعات القابلة للسحب (من رُشد) */
const TILE_DEF=E.tiles;
const tiles=()=>Array.isArray(S.tiles)&&S.tiles.length===6?S.tiles:TILE_DEF;
function tileInner(t){const k=today();
  if(t==='today'){const ids=activeIds(k);if(!ids.length)return `<div class="hl">⭐ تحديات اليوم</div><div class="hv">—</div><div class="hs">اضغط لاختيار تحدياتك</div>`;
    const bl=ids.filter(id=>{const c=chById(id);return recorded(k)&&valOf(c,k)>=tgtOn(c,k)}).length;
    return `<div class="hl">⭐ تحديات اليوم</div><div class="hv ${bl===ids.length?'tb':''}">${bl}<small>من ${ids.length} مكتملة</small></div><div class="hs">${recorded(k)?(bl===ids.length?'✓ أتممت تحديات اليوم':`باقٍ ${ids.length-bl}`):'لم تسجّل اليوم بعد'}</div>`}
  if(t==='hw'){const n=hwCount(k,k),o=achOn(k).filter(a=>a.kind==='other'&&a.st!=='x').length;
    return `<div class="hl">📝 إنجازات اليوم</div><div class="hv">${n}<small>واجب</small></div><div class="hs">${o?`و${o} إنجاز آخر`:'اضغط لتسجيل واجب'}</div>`}
  if(t==='money'){const b=balance();return `<div class="hl">💰 ما معي</div><div class="hv ${b.bal<0?'tr':''}">${(b.bal).toFixed(3)}<small>د.ك</small></div><div class="hs">${S.money.opening?`مصروف الأسبوع ${(txOk().filter(x=>x.dir==='out'&&x.k>=weekStart(k)).reduce((a,x)=>a+ +x.amount,0)).toFixed(3)}`:'سجّل ما معك أولاً'}</div>`}
  if(t==='month'){const ms=monthStart(k),on=CH.filter(c=>everOn(c.id));if(!on.length)return `<div class="hl">🗓️ حصيلة الشهر</div><div class="hv">—</div><div class="hs">لا تحديات مفعّلة</div>`;
    const ss=on.map(c=>stat(c,ms,k)).filter(s=>s.m),cnt=g=>ss.filter(s=>s.g===g).length;
    return `<div class="hl">🗓️ حصيلة الشهر</div><div class="hv"><span class="tb">${cnt('b')}</span><small>أزرق</small> ${cnt('k')}<small>أسود</small> <span class="tr">${cnt('r')}</span><small>أحمر</small></div><div class="hs">${ss.length} تحدياً منذ أول الشهر${cnt('g')?` · ${cnt('g')} بلا تسجيل`:''}</div>`}
  if(t==='plan'||t==='helper'||(t==='week'&&E.plan))return planTile(t);
  if(t==='week'){const ws=weekStart(k);let r=0,m=0;for(let d=ws;d<=k;d=addDays(d,1)){m++;if(recorded(d))r++}
    return `<div class="hl">📅 هذا الأسبوع</div><div class="hv">${r}<small>من ${m} ${dayUnit(m)} مسجَّلة</small></div><div class="hs">${hwCount(ws,k)} واجباً منذ السبت</div>`}
  if(t==='msgs'){const o=S.tasks.filter(x=>x.st!=='done').length,e=S.evals.filter(x=>!x.seen).length;
    return `<div class="hl">📬 من ${E.parent}</div><div class="hv">${o+e}<small>${o+e?'جديد':''}</small></div><div class="hs">${o?`${o} تكليف مفتوح`:''}${o&&e?' · ':''}${e?`${e} تقييم جديد`:''}${!o&&!e?'لا شيء جديد · اضغط للاستلام':''}</div>`}
  return ''}
function tilesHtml(){const L=tiles();return `<div class="hm-bar"><span class="t2">اضغط مطولاً على المربع واسحبه لتغيير مكانه</span>${S.tiles?`<button class="chip" data-a="tileReset">ترتيب أصلي</button>`:''}</div>
  <div class="hm-grid">${L.map((t,i)=>`<button class="hm-tile c${Math.floor(i/2)}" data-tile="${t}" data-ti="${i}">${tileInner(t)}</button>`).join('')}</div>`}
(function(){let src=null,ghost=null,tgt=null,tm=0,drag=false,sx=0,sy=0,suppress=false;
  const end=()=>{clearTimeout(tm);if(ghost)ghost.remove();if(src)src.classList.remove('drag-src');document.querySelectorAll('.hm-tile.drop').forEach(e=>e.classList.remove('drop'));src=ghost=tgt=null;drag=false};
  document.addEventListener('pointerdown',e=>{const t=e.target.closest('.hm-tile');if(!t||e.button>0)return;src=t;sx=e.clientX;sy=e.clientY;
    tm=setTimeout(()=>{if(!src)return;drag=true;if(navigator.vibrate)navigator.vibrate(30);const r=src.getBoundingClientRect();ghost=src.cloneNode(true);ghost.classList.add('drag-ghost');ghost.style.width=r.width+'px';ghost.style.height=r.height+'px';ghost.style.left=sx+'px';ghost.style.top=sy+'px';document.body.appendChild(ghost);src.classList.add('drag-src')},320)});
  document.addEventListener('pointermove',e=>{if(!src)return;if(!drag){if(Math.abs(e.clientX-sx)>8||Math.abs(e.clientY-sy)>8){clearTimeout(tm);src=null}return}
    e.preventDefault();ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';
    const el=document.elementFromPoint(e.clientX,e.clientY),o=el&&el.closest('.hm-tile:not(.drag-ghost)');document.querySelectorAll('.hm-tile.drop').forEach(x=>x.classList.remove('drop'));tgt=null;
    if(o&&o!==src){tgt=o;o.classList.add('drop')}},{passive:false});
  document.addEventListener('touchmove',e=>{if(drag)e.preventDefault()},{passive:false});
  document.addEventListener('pointerup',()=>{if(drag){suppress=true;setTimeout(()=>suppress=false,350);
    if(tgt){const a=+src.dataset.ti,b=+tgt.dataset.ti,L=tiles().slice();[L[a],L[b]]=[L[b],L[a]];S.tiles=L;save();end();render();return}}end()});
  document.addEventListener('pointercancel',end);
  document.addEventListener('contextmenu',e=>{if(e.target.closest('.hm-tile'))e.preventDefault()});
  document.addEventListener('click',e=>{if(suppress&&e.target.closest('.hm-tile')){e.preventDefault();e.stopPropagation()}},true);
})();

/* إنجازات اليوم والواجبات */
function vAch(){const k=U.day,L=achOn(k),hw=L.filter(a=>a.kind==='hw'),ot=L.filter(a=>a.kind==='other');
  const groups={};hw.forEach(a=>{(groups[a.subj]=groups[a.subj]||[]).push(a)});
  const it=a=>`<div class="it ${a.st==='x'?'x':''}"><div class="grow">${a.kind==='hw'?`<b class="num">${a.count||1}</b> ${(a.count||1)>1?'واجبات':'واجب'}`:''}${a.text?`${a.kind==='hw'?' — ':''}${esc(a.text)}`:''}
    ${a.st==='x'?`<div class="t2">أُلغي ${esc(new Date(a.xAt).toLocaleString('ar-u-nu-latn',{hour:'numeric',minute:'2-digit',day:'numeric',month:'short'}))}${a.xWhy?` — ${esc(a.xWhy)}`:''}</div>`:''}</div>
    ${a.st!=='x'?`<button class="btn ghost sm" data-a="achX" data-id="${a.id}">إلغاء</button>`:''}</div>`;
  const n=hw.filter(a=>a.st!=='x').reduce((x,a)=>x+(+a.count||1),0);
  return `<h1>إنجازاتي</h1>${dayNav()}
  <div class="actions" style="margin-top:0"><button class="btn" data-a="addHw">+ واجب</button><button class="btn ghost" data-a="addOther">+ إنجاز آخر</button></div>
  <h2>📚 الواجبات <span class="tag">${n} ${n>2&&n<11?'واجبات':'واجباً'}</span></h2>
  ${Object.keys(groups).length?Object.keys(groups).map(s=>`<div class="card"><b>${esc(subjLabel(s))}</b><div class="list">${groups[s].map(it).join('')}</div></div>`).join(''):`<div class="empty">لم يُسجَّل واجب ${U.day===today()?'اليوم':'في هذا اليوم'}.</div>`}
  <h2>🌟 إنجازات أخرى</h2>${ot.length?`<div class="card list">${ot.map(it).join('')}</div>`:`<div class="empty">لا شيء بعد.</div>`}
  ${S.subjects.cur?`<p class="src">قائمة المواد من ملف «${esc(S.subjects.cur.fileId)}» المستلَم ${esc(fmtD(S.subjects.cur.at.slice(0,10),{day:'numeric',month:'long'}))}.</p>`:''}`}
function hwSheet(){const subs=subjList();let sel=subs.length?subjKey(subs[0]):'';
  openSheet('واجب جديد',`${subs.length?`<div class="field"><span>المادة</span><div class="chips">${subs.map(s=>`<button class="chip" data-s="${esc(subjKey(s))}" aria-pressed="${subjKey(s)===sel}">${esc(s['الاسم_عربي'])}${s['رمز']?` <small>${esc(s['رمز'])}</small>`:''}${s['مؤكد']===false?' <span class="tag warn">غير مؤكد</span>':''}</button>`).join('')}<button class="chip" data-s="__o" aria-pressed="false">مادة أخرى</button></div></div>`:`<p class="t2">لم تُستلم قائمة المواد بعد، فاكتب اسم المادة.</p>`}
    <label class="field" id="oWrap" ${subs.length?'hidden':''}><span>اسم المادة</span><input id="oSub"></label>
    <label class="field"><span>عدد الواجبات</span><div class="ctr"><button data-d="-1">−</button><input id="hwN" inputmode="numeric" value="1" class="num"><button data-d="1">+</button></div></label>
    <label class="field"><span>ما الواجب؟ (اختياري)</span><input id="hwT" placeholder="مثلاً: أسئلة الوحدة 2"></label>
    <div class="err" id="hwE"></div><button class="btn" id="hwS">حفظ</button>`,b=>{
    b.querySelectorAll('[data-s]').forEach(el=>el.addEventListener('click',()=>{sel=el.dataset.s;b.querySelectorAll('[data-s]').forEach(x=>x.setAttribute('aria-pressed',x===el));b.querySelector('#oWrap').hidden=sel!=='__o'}));
    b.querySelectorAll('[data-d]').forEach(el=>el.addEventListener('click',()=>{const i=b.querySelector('#hwN');i.value=Math.max(1,(toNum(i.value)||1)+ +el.dataset.d)}));
    b.querySelector('#hwS').addEventListener('click',()=>{let s=sel;if(!subs.length||sel==='__o')s=b.querySelector('#oSub').value.trim();const n=toNum(b.querySelector('#hwN').value);
      if(!s){b.querySelector('#hwE').textContent='اختر المادة أو اكتب اسمها.';return}if(!(n>=1)||!Number.isInteger(n)){b.querySelector('#hwE').textContent='العدد رقم صحيح من 1 فأكثر.';return}
      S.ach.push({id:uid(),k:U.day,kind:'hw',subj:s,count:n,text:b.querySelector('#hwT').value.trim(),at:isoNow(),st:'ok'});save();closeSheet();toast('سُجّل الواجب');render()})})}
function otherSheet(){openSheet('إنجاز آخر',`<label class="field"><span>ما الإنجاز؟</span><input id="oT" placeholder="مثلاً: أنهيت قراءة كتاب"></label><div class="err" id="oE"></div><button class="btn" id="oS">حفظ</button>`,b=>{
  b.querySelector('#oS').addEventListener('click',()=>{const t=b.querySelector('#oT').value.trim();if(!t){b.querySelector('#oE').textContent='اكتب الإنجاز.';return}
    S.ach.push({id:uid(),k:U.day,kind:'other',text:t,at:isoNow(),st:'ok'});save();closeSheet();toast('سُجّل الإنجاز');render()})})}
function cancelSheet(title,onDo){openSheet(title,`<p class="t2" style="margin-top:0">الإلغاء لا يمحو السجل: يبقى ظاهراً مشطوباً مع وقت الإلغاء.</p><label class="field"><span>السبب (اختياري)</span><input id="xW"></label><button class="btn" id="xS">ألغِ</button>`,b=>{
  twice(b.querySelector('#xS'),()=>{onDo(b.querySelector('#xW').value.trim());save();closeSheet();render()})})}

/* التحديات */
function vCh(){const k=U.day,ids=activeIds(k),groups=[...new Set(CH.map(c=>c.g))];
  if(!CH.some(c=>everOn(c.id)))return `<h1>التحديات</h1><div class="card" style="text-align:center"><p>لم تختر أي تحدٍّ بعد.</p><p class="t2">اختر ما تريد، فيظهر هنا ويبدأ حسابه من يوم اختياره.</p><button class="btn" data-a="pickCh">اختر تحدياتك</button></div>`;
  const ms=monthStart(k);
  return `<h1>التحديات</h1>${dayNav()}${LEG}
  ${!recorded(k)&&ids.length?`<div class="banner">لم يُسجَّل هذا اليوم بعد، فلا يُحسب في التقرير. <button data-a="markDay">لم أُنجز شيئاً — سجّله</button></div>`:''}
  ${ids.length?groups.map(g=>{const cs=CH.filter(c=>c.g===g&&ids.includes(c.id));if(!cs.length)return'';return `<h2>${esc(g)}</h2>${cs.map(c=>chCard(c,k,ms)).join('')}`}).join(''):`<div class="empty">لا تحديات مفعّلة في هذا اليوم${isFri(k)?'':'. تحدي الكهف يظهر يوم الجمعة'}.</div>`}
  <div style="margin-top:14px"><button class="btn ghost" data-a="pickCh">⭐ اختر تحدياتك</button></div>`}
function chCard(c,k,ms){const v=valOf(c,k),T=tgtOn(c,k),r=rawVal(c,k),rec=recorded(k),g=rec?G(v,T,T/2):'g';
  const s=stat(c,ms,monthEnd(k)<today()?monthEnd(k):today());
  let ctl='';
  if(c.t==='tick')ctl=`<button class="ck ${r?'on':''}" data-a="tick" data-id="${c.id}" aria-pressed="${!!r}" aria-label="${esc(c.n)}">${r?'✓':''}</button>`;
  if(c.t==='count'||c.t==='pages')ctl=`<div class="ctr"><button data-a="ctr" data-id="${c.id}" data-d="${c.t==='pages'?-0.5:-1}" aria-label="إنقاص">−</button><input class="num" inputmode="decimal" data-ctr="${c.id}" value="${r!=null?esc(r):''}" placeholder="0"><button data-a="ctr" data-id="${c.id}" data-d="${c.t==='pages'?0.5:1}" aria-label="زيادة">+</button></div>`;
  let body='';
  if(c.t==='of')body=`<div class="chips">${c.items.map(([ik,n])=>{const on=Array.isArray(r)&&r.includes(ik);return `<button class="chip" data-a="ofT" data-id="${c.id}" data-k="${ik}" aria-pressed="${on}">${esc(n)}</button>`}).join('')}</div>${c.hint?`<div class="t2" style="margin-top:6px">${esc(c.hint)}</div>`:''}`;
  if(c.t==='birr'){const b=r||{t:[],n:''};body=`<div class="chips">${BR.map(([bk,n,i])=>`<button class="chip" data-a="birrT" data-k="${bk}" aria-pressed="${(b.t||[]).includes(bk)}">${i} ${n}</button>`).join('')}</div><input data-birrn placeholder="ماذا فعلت؟ (اختياري)" value="${esc(b.n||'')}" style="margin-top:8px">`}
  const today_=c.t==='tick'||c.t==='birr'?(v?'✓':'—'):`${nfmt(v)} من ${nfmt(T)}`;
  return `<div class="card"><div class="ch-head"><span>${c.i}</span><span class="nm">${esc(c.n)}</span><b class="${GC[g]} num">${rec?today_:'—'}</b>${ctl}</div>${body}
  <div class="ch-sub">هذا الشهر: ${statLine(c,s)||'—'}${c.t==='pages'?` · الحد اليومي ${nfmt(T)} ${unitOf(c)}`:''}</div></div>`}
function pickChSheet(){const groups=[...new Set(CH.map(c=>c.g))];
  const draw=()=>`<p class="t2" style="margin-top:0">اختر ما تريد. يبدأ الحساب من يوم التفعيل، وإذا أوقفت تحدياً يبقى سجله ظاهراً في التقرير.</p>
    ${groups.map(g=>`<h2 style="margin-top:14px">${esc(g)}</h2><div class="card list">${CH.filter(c=>c.g===g).map(c=>{const p=openPer(c.id);
      return `<div class="it" style="align-items:center"><span>${c.i}</span><div class="grow"><b>${esc(c.n)}</b><div class="t2">${p?`مفعّل منذ ${esc(fmtD(p.from,{day:'numeric',month:'long'}))}${c.t==='pages'?` · ${nfmt(p.target)} صفحة يومياً`:''}`:hintOf(c)}</div></div>
      ${p&&c.t==='pages'?`<button class="chip" data-pg="${c.id}">الهدف</button>`:''}<button class="sw" role="switch" aria-checked="${!!p}" data-sw="${c.id}" aria-label="${esc(c.n)}"></button></div>`}).join('')}</div>`).join('')}`;
  openSheet('اختر تحدياتك',`<div id="pk">${draw()}</div>`,b=>{const bind=()=>{
    b.querySelectorAll('[data-sw]').forEach(el=>el.addEventListener('click',()=>{const id=el.dataset.sw,c=chById(id);
      if(openPer(id)){deactivate(id);save();b.querySelector('#pk').innerHTML=draw();bind();render();return}
      if(c.t==='pages'){pagesTarget(c,()=>{b.querySelector('#pk').innerHTML=draw();bind()});return}
      activate(id);save();b.querySelector('#pk').innerHTML=draw();bind();render()}));
    b.querySelectorAll('[data-pg]').forEach(el=>el.addEventListener('click',()=>pagesTarget(chById(el.dataset.pg),()=>{b.querySelector('#pk').innerHTML=draw();bind()})))};bind()})}
function hintOf(c){return c.t==='pages'?'تحدد هدفك بالصفحات':c.t==='of'?`الهدف ${c.items.length} يومياً`:c.t==='count'?`الهدف ${tgtOn(c,today())} مرات يومياً`:c.fri?'كل جمعة':c.t==='birr'?'زيارة أو مكالمة أو خدمة أو غيرها':'يومياً'}
function pagesTarget(c,after){const p=openPer(c.id);
  const ov=document.createElement('div');ov.className='ov';ov.style.zIndex=55;ov.innerHTML=`<div class="sheet"><h3>هدف ${esc(c.n)}<button class="close" data-x>✕</button></h3>
  <p class="t2" style="margin-top:0">كم صفحة يومياً؟ يمكن كتابة نصف صفحة (0.5). ${p?'تغيير الهدف يسري من اليوم، وتبقى الأيام السابقة بهدفها القديم.':''}</p>
  <label class="field"><span>الصفحات يومياً</span><input id="pgN" inputmode="decimal" value="${p&&p.target?esc(p.target):''}" class="num"></label><div class="err" id="pgE"></div><button class="btn" id="pgS">${p?'حفظ الهدف':'فعّل التحدي'}</button></div>`;
  ov.addEventListener('click',e=>{if(e.target===ov||e.target.closest('[data-x]'))ov.remove()});document.body.appendChild(ov);
  ov.querySelector('#pgS').addEventListener('click',()=>{const n=toNum(ov.querySelector('#pgN').value);if(!(n>0)||n>604){ov.querySelector('#pgE').textContent='اكتب عدد صفحات أكبر من صفر.';return}
    const t=today();if(p&&p.from===t){p.target=n;log(`تعديل هدف ${c.n} إلى ${n} صفحة`)}else activate(c.id,n);save();ov.remove();after&&after();render()})}

/* المصروف */
function vMoney(){const b=balance(),m=S.money,L=m.tx.slice().sort((a,b)=>(b.k+b.at)>(a.k+a.at)?1:-1),lc=m.counts[m.counts.length-1];
  if(!m.opening)return `<h1>مصروفي</h1><div class="card"><p style="margin-top:0">ابدأ بتسجيل ما معك من مال الآن. هذا هو رصيدك الأول، وتُضاف إليه بعد ذلك ما تستلمه وتُطرح منه مصروفاتك.</p><button class="btn" data-a="opening">سجّل ما معي</button></div>
    <div class="card"><b>من ${E.parent}</b><p class="t2" style="margin:4px 0 10px">إن وصلك كشف مالي، استلمه من هنا.</p><button class="btn ghost" data-a="import">📥 استلام ملف</button></div>`;
  return `<h1>مصروفي</h1><div class="card"><div class="t2">ما معي الآن (حسب التسجيل)</div><div class="bal num ${b.bal<0?'c-r':''}">${money(b.bal)}</div>
    <div class="eq">ما بدأت به ${money(b.o)} (${esc(fmtD(m.opening.k,{day:'numeric',month:'long'}))})<br>+ ما استلمته ${money(b.inn)}<br>− ما صرفته ${money(b.out)}</div>
    ${lc?`<div class="src">آخر عدّ للنقد ${esc(fmtD(lc.k,{day:'numeric',month:'long'}))}: ${money(lc.amount)}${Math.abs(lc.diff)>0.0005?` · <b class="c-r">فرق ${money(lc.diff)}</b> عن التسجيل يومها`:' · مطابق'}</div>`:''}</div>
  <div class="actions" style="margin-top:0"><button class="btn" data-a="addExp">+ مصروف</button><button class="btn ghost" data-a="cashCount">عددت ما معي</button></div>
  <div class="actions"><button class="btn ghost" data-a="addIn">+ مال استلمته</button><button class="btn ghost" data-a="import">📥 كشف من ${E.parent}</button></div>
  <h2>السجل</h2>${L.length?`<div class="card list">${L.map(t=>`<div class="it ${t.st==='x'?'x':''}"><div class="grow"><b class="num ${t.dir==='in'?'':''}">${t.dir==='in'?'+':'−'} ${money(t.amount)}</b> ${esc(t.what||'')}
    <div class="t2">${esc(fmtD(t.k,{weekday:'short',day:'numeric',month:'short'}))} · ${t.src==='parent'?`من كشف ${E.parent}`:'سجّلته أنا'}${t.st==='x'?` · أُلغي${t.xWhy?` — ${esc(t.xWhy)}`:''}`:''}</div></div>
    ${t.st!=='x'&&t.src!=='parent'?`<button class="btn ghost sm" data-a="txX" data-id="${t.id}">إلغاء</button>`:''}</div>`).join('')}</div>`:`<div class="empty">لا عمليات بعد.</div>`}`}
function moneySheet(dir){openSheet(dir==='out'?'مصروف جديد':'مال استلمته',`<label class="field"><span>المبلغ (د.ك)</span><input id="mA" inputmode="decimal" class="num" placeholder="0.000"></label>
  <label class="field"><span>${dir==='out'?'فيمَ صرفته؟':'من أين؟'}</span><input id="mW" placeholder="${dir==='out'?'مثلاً: غداء المدرسة':'مثلاً: هدية من الجد'}"></label>
  <label class="field"><span>التاريخ</span><input id="mD" type="date" value="${today()}" max="${today()}"></label><div class="err" id="mE"></div><button class="btn" id="mS">حفظ</button>`,b=>{
  b.querySelector('#mS').addEventListener('click',()=>{const a=toNum(b.querySelector('#mA').value),w=b.querySelector('#mW').value.trim(),d=b.querySelector('#mD').value||today();
    if(!(a>0)){b.querySelector('#mE').textContent='اكتب مبلغاً أكبر من صفر.';return}if(!w){b.querySelector('#mE').textContent=dir==='out'?'اكتب فيمَ صرفته.':'اكتب مصدر المال.';return}
    S.money.tx.push({id:uid(),k:d,dir,amount:+a.toFixed(3),what:w,src:'self',at:isoNow(),st:'ok'});save();closeSheet();toast('سُجّل');render()})})}
function openingSheet(){openSheet('ما معي الآن',`<p class="t2" style="margin-top:0">اكتب المبلغ الذي معك فعلاً اليوم. يُسجَّل مرة واحدة، وأي فرق لاحق يظهر عند عدّ النقد ولا يُعدَّل بصمت.</p>
  <label class="field"><span>المبلغ (د.ك)</span><input id="oA" inputmode="decimal" class="num" placeholder="0.000"></label><div class="err" id="oE"></div><button class="btn" id="oS">حفظ</button>`,b=>{
  b.querySelector('#oS').addEventListener('click',()=>{const a=toNum(b.querySelector('#oA').value);if(!(a>=0)||isNaN(a)){b.querySelector('#oE').textContent='اكتب المبلغ (صفر أو أكثر).';return}
    S.money.opening={amount:+a.toFixed(3),k:today(),at:isoNow()};log(`تسجيل الرصيد الأول ${a.toFixed(3)}`);save();closeSheet();render()})})}
function countSheet(){const b0=balance();openSheet('عددت ما معي',`<p class="t2" style="margin-top:0">حسب التسجيل معك ${money(b0.bal)}. اكتب ما عددته فعلاً. إن اختلف يُسجَّل الفرق ويظهر، ولا يُصحَّح الرصيد آلياً: القرار لك أو ${E.toParent}.</p>
  <label class="field"><span>ما عددته (د.ك)</span><input id="cA" inputmode="decimal" class="num"></label><div class="err" id="cE"></div><button class="btn" id="cS">حفظ</button>`,b=>{
  b.querySelector('#cS').addEventListener('click',()=>{const a=toNum(b.querySelector('#cA').value);if(!(a>=0)||isNaN(a)){b.querySelector('#cE').textContent='اكتب المبلغ.';return}
    const diff=+(a-b0.bal).toFixed(3);S.money.counts.push({k:today(),amount:+a.toFixed(3),expected:b0.bal,diff,at:isoNow()});save();closeSheet();
    toast(Math.abs(diff)<0.0005?'مطابق للتسجيل':`فرق ${money(diff)} عن التسجيل`);render()})})}

/* التقرير */
function rpRange(){const k=U.rpK;if(U.rp==='day')return{from:k,to:k,lbl:fmtD(k)};
  if(U.rp==='week'){const f=weekStart(k),t=addDays(f,6);return{from:f,to:t,lbl:`أسبوع ${fmtD(f,{day:'numeric',month:'short'})} – ${fmtD(t,{day:'numeric',month:'short'})}`}}
  return{from:monthStart(k),to:monthEnd(k),lbl:kd(k).toLocaleDateString('ar-u-nu-latn',{month:'long',year:'numeric'})}}
function buildReport(){const R=rpRange(),end=R.to<today()?R.to:today();
  const chs=CH.filter(c=>stat(c,R.from,R.to).m).map(c=>{const s=stat(c,R.from,R.to);return{c,s}});
  const hw={},oth=[];S.ach.filter(a=>a.st!=='x'&&a.k>=R.from&&a.k<=R.to).forEach(a=>{if(a.kind==='hw')hw[a.subj]=(hw[a.subj]||0)+(+a.count||1);else oth.push(a)});
  const tx=txOk().filter(t=>t.k>=R.from&&t.k<=R.to),inn=tx.filter(t=>t.dir==='in').reduce((a,t)=>a+ +t.amount,0),out=tx.filter(t=>t.dir==='out').reduce((a,t)=>a+ +t.amount,0);
  let days=0,rec=0;for(let k=R.from;k<=end;k=addDays(k,1)){days++;if(recorded(k))rec++}
  return{R,end,chs,hw,oth,tx,inn,out,days,rec,pl:E.plan?planStat(R.from,R.to):null,hp:E.helper?helperStat(R.from,R.to):null}}
function vReport(){const P=buildReport(),R=P.R;
  return `<h1>التقرير</h1><div class="seg">${[['day','يوم'],['week','أسبوع'],['month','شهر']].map(([k,n])=>`<button data-a="rpP" data-p="${k}" aria-pressed="${U.rp===k}">${n}</button>`).join('')}</div>
  <div class="daynav"><button class="btn ghost sm" data-a="rpPrev">السابق</button><div class="lbl">${esc(R.lbl)}<small>التحديات مسجَّلة في ${P.rec} من ${P.days} ${dayUnit(P.days)}${R.to>today()?' حتى اليوم':''}</small></div><button class="btn ghost sm" data-a="rpNext" ${R.to>=today()?'disabled':''}>التالي</button></div>
  <h2>⭐ التحديات</h2>${LEG}
  ${P.chs.length?`<div class="card"><table class="rp"><tr><th>التحدي</th><th>المنجز من الحد</th><th>الأيام</th></tr>${P.chs.map(({c,s})=>`<tr><td>${c.i} ${esc(c.n)}</td><td class="num"><b class="${GC[s.g]}">${s.n?(c.t==='tick'||c.t==='birr'?`${s.sum} من ${s.n}`:`${nfmt(s.sum)} من ${nfmt(s.full)}`):'—'}</b>${s.n&&(c.t==='pages'||c.t==='count')?` <small class="t2">${unitOf(c)}</small>`:''}</td><td class="num t2">${s.n} من ${s.m}${s.un?`<br>${s.un} غير مسجَّل`:''}</td></tr>`).join('')}</table>
  <div class="src">المصدر: سجلّ التحديات اليومي على هذا الجوال. الحد = هدف اليوم × الأيام المسجَّلة فقط${P.chs.some(x=>x.c.fri)?'، والكهف بعدد الجُمَع':''}. الأيام غير المسجَّلة لا تُحسب صفراً.</div></div>`:`<div class="empty">لا تحديات مفعّلة في هذه الفترة.</div>`}
  ${E.plan?planReportHtml(P):''}
  ${E.subjects?`<h2>📚 الواجبات</h2>`:''}${!E.subjects?'':Object.keys(P.hw).length?`<div class="card"><table class="rp"><tr><th>المادة</th><th>العدد</th></tr>${Object.entries(P.hw).map(([s,n])=>`<tr><td>${esc(subjLabel(s))}</td><td class="num"><b>${n}</b></td></tr>`).join('')}<tr><td><b>المجموع</b></td><td class="num"><b>${Object.values(P.hw).reduce((a,b)=>a+b,0)}</b></td></tr></table><div class="src">المصدر: ما سجّلته في «إنجازاتي»، دون الملغى.</div></div>`:`<div class="empty">لا واجبات مسجَّلة.</div>`}
  ${P.oth.length?`<h2>🌟 إنجازات أخرى</h2><div class="card list">${P.oth.map(a=>`<div class="it"><div class="grow">${esc(a.text)}<div class="t2">${esc(fmtD(a.k,{weekday:'short',day:'numeric',month:'short'}))}</div></div></div>`).join('')}</div>`:''}
  <h2>💰 المال</h2><div class="card"><div class="eq" style="color:var(--ink)">استلمت ${money(P.inn)}<br>صرفت ${money(P.out)}<br>ما معي الآن ${money(balance().bal)}</div><div class="src">المصدر: سجلّ «مصروفي»؛ الرصيد الحالي لا يخص الفترة وحدها.</div></div>
  <div class="actions"><button class="btn" data-a="sendReport">📤 أرسل ${E.toParent}</button><button class="btn ghost" data-a="copyReport">نسخ نصاً</button></div>`}
function reportPayload(){const P=buildReport();return{'الفترة':{'النوع':{day:'يوم',week:'أسبوع',month:'شهر'}[U.rp],'من':P.R.from,'إلى':P.R.to,'الأيام':P.days,'الأيام_المسجلة':P.rec},
  'التحديات':P.chs.map(({c,s})=>({'معرّف':c.id,'الاسم':c.n,'المنجز':s.sum,'الحد':s.full,'الوحدة':unitOf(c)||null,'الأيام_المسجلة':s.n,'أيام_التفعيل':s.m,'اللون':GN[s.g]})),
  ...(E.plan?{'الخطة':planPayload(P)}:{}),...(E.helper?{'ساعات_المساعدة':{'المجموع':P.hp.sum,'الأيام_المسجلة':P.hp.n,'الأيام':P.hp.m,'التفصيل':P.hp.rows}}:{}),
  'الواجبات':Object.entries(P.hw).map(([s,n])=>({'المادة':s,'الاسم':subjLabel(s),'العدد':n})),
  'إنجازات_أخرى':P.oth.map(a=>({'التاريخ':a.k,'الوصف':a.text})),
  'المال':{'المستلم':+P.inn.toFixed(3),'المصروف':+P.out.toFixed(3),'الرصيد_الحالي':balance().bal,'البنود':P.tx.map(t=>({'التاريخ':t.k,'الاتجاه':t.dir==='in'?'دخل':'مصروف','المبلغ':t.amount,'البيان':t.what,'المصدر':t.src==='parent'?E.parent:E.self}))}}}
function reportText(){const P=buildReport();let t=`تقرير ${S.profile.name} — ${P.R.lbl}\nالتحديات مسجَّلة في ${P.rec} من ${P.days} ${dayUnit(P.days)}\n\nالتحديات:\n`;
  P.chs.forEach(({c,s})=>{t+=`• ${c.n}: ${s.n?(c.t==='tick'||c.t==='birr'?`${s.sum} من ${s.n}`:`${nfmt(s.sum)} من ${nfmt(s.full)} ${unitOf(c)}`):'لم يُسجَّل'} (${GN[s.g]}) — ${s.n} من ${s.m} ${dayUnit(s.m,c.fri)}\n`});
  if(E.plan)t+=planText(P);
  if(E.subjects){t+=`\nالواجبات:\n`;Object.entries(P.hw).forEach(([s,n])=>t+=`• ${subjLabel(s)}: ${n}\n`);if(!Object.keys(P.hw).length)t+='• لا شيء\n';}
  if(P.oth.length){t+='\nإنجازات أخرى:\n';P.oth.forEach(a=>t+=`• ${a.text}\n`)}
  t+=`\nالمال: استلمت ${money(P.inn)} · صرفت ${money(P.out)} · معي الآن ${money(balance().bal)}`;return t}

/* الإعدادات والملفات */
function vSettings(){const inb=S.inbox.slice().reverse();
  return `<div class="top"><h1>الإعدادات والملفات</h1><button class="iconbtn" data-a="home" aria-label="رجوع">↩︎</button></div>
  <div class="card"><b>📥 استلام ملف</b><p class="t2" style="margin:4px 0 10px">ملف من ${E.parent}: ${E.inTypes.map(t=>TYPES[t]).join('، ')}. تراه أولاً، ثم تقبله أو ترفضه.</p><button class="btn" data-a="import">اختر ملفاً أو الصق نصه</button></div>
  <div class="card"><b>💾 النسخ الاحتياطي</b><p class="t2" style="margin:4px 0 10px">بياناتك على هذا الجوال فقط. احفظ نسخة كل أسبوع وأرسلها ${E.toParent} أو احفظها في الملفات. ${S.lastBackup?`آخر نسخة: ${esc(fmtD(S.lastBackup.slice(0,10),{day:'numeric',month:'long'}))}.`:'لم تُحفظ نسخة بعد.'}</p><button class="btn ghost" data-a="backup">احفظ نسخة احتياطية</button><p class="t2" style="margin:8px 2px 0">للاستعادة: استلم ملف النسخة من «استلام ملف».</p></div>
  ${E.subjects?`<div class="card"><b>📚 المواد</b>${S.subjects.cur?`<div class="list" style="margin-top:6px">${S.subjects.cur.list.map(s=>`<div class="it"><div class="grow">${esc(s['الاسم_عربي'])}${s['رمز']?` <small class="t2">${esc(s['رمز'])}</small>`:''} ${s['مؤكد']===false?'<span class="tag warn">غير مؤكد</span>':''}<div class="t2">${esc(s['النوع']==='درس_خاص'?'درس خاص':'مدرسية')} · ${esc(s['الحالة'])}${s['الفصل']?` · الفصل ${esc(s['الفصل'])}`:''}</div></div></div>`).join('')}</div><div class="src">من ملف «${esc(S.subjects.cur.fileId)}».</div>`:`<p class="t2">لم تُستلم بعد.</p>`}</div>`:''}
  <div class="card"><b>📜 الملفات المستلمة</b>${inb.length?`<div class="list" style="margin-top:6px">${inb.map(x=>`<div class="it"><div class="grow">${esc(TYPES[x.type]||x.type)} <span class="tag ${x.dec==='rejected'?'warn':''}">${x.dec==='accepted'?'قُبل':'رُفض'}</span><div class="t2">${esc(x.id)} · ${esc(new Date(x.at).toLocaleDateString('ar-u-nu-latn',{day:'numeric',month:'short'}))}</div></div></div>`).join('')}</div>`:`<p class="t2">لا شيء بعد.</p>`}</div>
  <div class="card"><b>👤 الاسم</b><p class="t2" style="margin:4px 0 0">${esc(S.profile.name)} · رُشد ${EDITION} ${APPV}</p></div>
  <div class="card"><b>📱 على آيفون</b><p class="t2" style="margin:4px 0 0">افتح الصفحة في Safari ثم «مشاركة» ← «إضافة إلى الشاشة الرئيسية»، واستخدمها من الأيقونة. Safari قد يمسح بيانات المواقع غير المستخدمة، والنسخة الاحتياطية هي الضمان.</p></div>`}

/* الاستلام: معاينة ثم قبول أو رفض */
function importSheet(prefill){openSheet('استلام ملف',`<button class="btn ghost" id="pickF">📂 اختر ملفاً</button><p class="t2" style="text-align:center;margin:10px 0">أو الصق نص الملف</p>
  <textarea id="pTx" placeholder='{"صيغة": "rushd-family", ...}'>${esc(prefill||'')}</textarea><div class="err" id="pE"></div><button class="btn" id="pGo" style="margin-top:10px">اعرض الملف</button>`,b=>{
  b.querySelector('#pickF').addEventListener('click',()=>{const fi=document.getElementById('fileIn');fi.value='';fi.onchange=()=>{const f=fi.files[0];if(!f)return;f.text().then(t=>preview(t))};fi.click()});
  b.querySelector('#pGo').addEventListener('click',()=>preview(b.querySelector('#pTx').value))})}
function preview(text){const r=parseEnvelope(text);if(r.err){importSheet(text);setTimeout(()=>{const e=document.querySelector('#pE');if(e)e.innerHTML=r.err},0);return}
  const o=r.o,ty=o['النوع'],p=o['الحمولة'],prev=S.inbox.find(x=>x.id===o['معرّف']);
  const me=S.profile?S.profile.name:null,to=o['إلى'],mismatch=me&&to&&to!==me&&ty!=='نسخة_احتياطية';
  let body='',err='';
  try{body=previewBody(ty,p,o)}catch(e){err='محتوى الملف ناقص أو بغير الصيغة المتوقعة: '+esc(e.message)}
  openSheet(`معاينة: ${TYPES[ty]}`,`<div class="card"><div class="t2">من: <b>${esc(o['من']||'—')}</b> · إلى: <b>${esc(to||'—')}</b><br>التاريخ: ${esc(String(o['التاريخ']||'').slice(0,10))}<br>المعرّف: <span style="direction:ltr;unicode-bidi:embed">${esc(o['معرّف'])}</span></div></div>
    ${prev?`<div class="banner">استُلم هذا الملف من قبل (${prev.dec==='accepted'?'قُبل':'رُفض'} في ${esc(prev.at.slice(0,10))})، فلا يُستلم مرة ثانية.</div>`:''}
    ${mismatch?`<div class="banner">⚠️ هذا الملف موجَّه إلى «${esc(to)}» وأنت «${esc(me)}».<label class="row" style="margin-top:8px"><input type="checkbox" id="mmOk" style="width:22px;height:22px;flex:none"> أفهم، وأريد استلامه</label></div>`:''}
    ${err?`<div class="err">${err}</div>`:body}
    ${!prev&&!err?`<div class="actions"><button class="btn" id="aOk" ${mismatch?'disabled':''}>قبول</button><button class="btn ghost" id="aNo">رفض</button></div>`:''}`,b=>{
    const ok=b.querySelector('#aOk'),mm=b.querySelector('#mmOk');if(mm)mm.addEventListener('change',()=>{ok.disabled=!mm.checked});
    if(ok){if(ty==='نسخة_احتياطية')twice(ok,()=>accept(o),'تأكيد: استبدال بيانات هذا الجوال');else ok.addEventListener('click',()=>accept(o))}
    const no=b.querySelector('#aNo');if(no)no.addEventListener('click',()=>{S.inbox.push({id:o['معرّف'],type:ty,from:o['من'],at:isoNow(),dec:'rejected'});log(`رفض ملف ${o['معرّف']}`);save();closeSheet();toast('رُفض الملف وسُجّل رفضه');render()})})}
function previewBody(ty,p,o){
  if(ty==='مواد'){const L=p['المواد'];if(!Array.isArray(L))throw new Error('لا توجد قائمة «المواد»');const st=p['الطالب']||{};
    const old=S.subjects.cur?S.subjects.cur.list:[],ok=new Set(old.map(subjKey)),nk=new Set(L.map(subjKey));
    const added=L.filter(s=>!ok.has(subjKey(s))),removed=old.filter(s=>!nk.has(subjKey(s))),changed=L.filter(s=>{const x=old.find(y=>subjKey(y)===subjKey(s));return x&&(x['الحالة']!==s['الحالة']||x['مؤكد']!==s['مؤكد'])});
    return `<div class="card"><b>${esc(st['الاسم']||'')}</b> <span class="t2">${st['الصف']?`الصف ${esc(st['الصف'])}`:''} ${esc(st['المدرسة']||'')} ${esc(st['العام_الدراسي']||'')}</span>
      <div class="list" style="margin-top:6px">${L.map(s=>`<div class="it"><div class="grow">${esc(s['الاسم_عربي'])}${s['رمز']?` <small class="t2">${esc(s['رمز'])}</small>`:''} ${s['مؤكد']===false?'<span class="tag warn">غير مؤكد</span>':''}<div class="t2">${s['النوع']==='درس_خاص'?'درس خاص':'مدرسية'} · ${esc(s['الحالة'])}</div></div></div>`).join('')}</div></div>
      ${old.length?`<div class="card"><b>الفرق عن قائمتك الحالية</b><div class="t2">${added.length?`جديد: ${added.map(s=>esc(s['الاسم_عربي'])).join('، ')}<br>`:''}${removed.length?`لم يعد في القائمة: ${removed.map(s=>esc(s['الاسم_عربي'])).join('، ')}<br>`:''}${changed.length?`تغيّرت حالته: ${changed.map(s=>esc(s['الاسم_عربي'])).join('، ')}<br>`:''}${!added.length&&!removed.length&&!changed.length?'لا فرق.':''}<br>القائمة الحالية تُحفظ في السجل ولا تُمحى، والواجبات المسجَّلة تبقى كما هي.</div></div>`:''}`}
  if(ty==='مالي'){const L=p['البنود'];if(!Array.isArray(L)||!L.length)throw new Error('لا توجد «البنود»');L.forEach(x=>{if(!(toNum(x['المبلغ'])>0))throw new Error('مبلغ غير صالح في أحد البنود')});
    const tot=L.reduce((a,x)=>a+toNum(x['المبلغ']),0),pr=p['الفترة']||{};
    return `<div class="card">${pr['من']?`<div class="t2">الفترة: ${esc(pr['من'])} إلى ${esc(pr['إلى']||'')}</div>`:''}<div class="list">${L.map(x=>`<div class="it"><div class="grow"><b>+ ${money(toNum(x['المبلغ']))}</b> ${esc(x['السبب']||'')}<div class="t2">${esc(x['التاريخ']||'')}</div></div></div>`).join('')}</div><div class="src">المجموع ${money(tot)}. عند القبول تُضاف إلى «ما استلمته» موسومة «من كشف ${E.parent}».</div></div>`}
  if(ty==='تقييم'){if(!p['العنوان']&&!p['النص'])throw new Error('التقييم بلا عنوان ولا نص');return `<div class="card"><b>${esc(p['العنوان']||'تقييم')}</b>${p['المادة']?` <span class="tag">${esc(subjLabel(p['المادة']))}</span>`:''}${p['النص']?`<p style="white-space:pre-wrap">${esc(p['النص'])}</p>`:''}${p['التقييم']!=null?`<p><b>التقييم:</b> ${esc(p['التقييم'])}</p>`:''}</div>`}
  if(ty==='تكليف'){if(!p['العنوان'])throw new Error('التكليف بلا «العنوان»');return `<div class="card"><b>${esc(p['العنوان'])}</b>${p['الموعد']?`<div class="t2">الموعد: ${esc(p['الموعد'])}</div>`:''}${p['الوصف']?`<p style="white-space:pre-wrap">${esc(p['الوصف'])}</p>`:''}</div>`}
  if(ty==='خطة')return planPreview(p);
  if(ty==='إعداد'){const T=p['الأهداف']||{};const ks=Object.keys(T);if(!ks.length)throw new Error('لا توجد «الأهداف»');ks.forEach(k=>{const c=chById(k);if(!c||c.t!=='count')throw new Error(`«${k}» ليس تحدياً بعدّاد`);if(!(toNum(T[k])>0))throw new Error('هدف غير صالح')});
    return `<div class="card"><p class="t2" style="margin-top:0">أهداف جديدة تسري من يوم القبول، وتبقى الأيام السابقة بأهدافها:</p>${ks.map(k=>`<div>${chById(k).i} ${esc(chById(k).n)}: <b>${toNum(T[k])}</b> مرات (الحالي ${tgtOn(chById(k),today())})</div>`).join('')}</div>`}
  if(ty==='نسخة_احتياطية'){const d=p['البيانات'];if(!d||d.app!==E.app)throw new Error(`ليست نسخة رُشد ${EDITION}`);
    return `<div class="card"><b>نسخة ${esc((d.profile||{}).name||'')}</b><div class="t2">محفوظة ${esc(String(o['التاريخ']).slice(0,10))} · ${Object.keys(d.days||{}).length} يوماً من التحديات · ${(d.ach||[]).length} إنجازاً · ${((d.money||{}).tx||[]).length} عملية مالية</div></div>
      <div class="banner">الاستعادة تستبدل كل بيانات هذا الجوال بالنسخة. تُحفظ البيانات الحالية جانباً قبل الاستبدال.</div>`}
  throw new Error('نوع غير معروف')}
function accept(o){const ty=o['النوع'],p=o['الحمولة'],id=o['معرّف'],t=today();
  if(ty==='نسخة_احتياطية'){try{localStorage.setItem(KEY+':prev',JSON.stringify(S))}catch(e){}const d=p['البيانات'];S=Object.assign(blank(),d);
    S.inbox.push({id,type:ty,from:o['من'],at:isoNow(),dec:'accepted'});log(`استعادة نسخة احتياطية ${id}`);save();closeSheet();toast('تمت الاستعادة');go('home');return}
  if(ty==='مواد'){if(S.subjects.cur)S.subjects.hist.push(S.subjects.cur);const st=p['الطالب']||{};
    S.subjects.cur={fileId:id,at:isoNow(),student:st,terms:p['الفصول']||[],list:p['المواد']};
    if(!S.profile&&st['الاسم'])S.profile={name:st['الاسم'],nameEn:st['الاسم_الإنجليزي']||'',grade:st['الصف']||null,at:isoNow()}}
  if(ty==='مالي')p['البنود'].forEach(x=>S.money.tx.push({id:uid(),k:/^\d{4}-\d\d-\d\d$/.test(x['التاريخ']||'')?x['التاريخ']:t,dir:'in',amount:+toNum(x['المبلغ']).toFixed(3),what:x['السبب']||`من ${E.parent}`,src:'parent',fileId:id,at:isoNow(),st:'ok'}));
  if(ty==='تقييم')S.evals.push({id:uid(),fileId:id,title:p['العنوان']||'',subj:p['المادة']||null,text:p['النص']||'',grade:p['التقييم']??null,date:(p['التاريخ']||String(o['التاريخ']).slice(0,10)),at:isoNow(),seen:false});
  if(ty==='تكليف')S.tasks.push({id:uid(),fileId:id,title:p['العنوان'],desc:p['الوصف']||'',due:/^\d{4}-\d\d-\d\d$/.test(p['الموعد']||'')?p['الموعد']:null,st:'new',at:isoNow()});
  if(ty==='خطة')planAccept(p,id);
  if(ty==='إعداد')Object.entries(p['الأهداف']).forEach(([k,v])=>{(S.tgt[k]=S.tgt[k]||[]).push({from:t,v:toNum(v),fileId:id})});
  S.inbox.push({id,type:ty,from:o['من'],at:isoNow(),dec:'accepted'});log(`قبول ملف ${id}`);save();closeSheet();toast('قُبل الملف');render()}

/* الإرسال: مشاركة أو تنزيل أو نسخ */
function fileName(type){return `رشد-${type}-${(S.profile&&S.profile.name)||''}-${today()}.json`}
function sendFile(obj,type,after){const text=JSON.stringify(obj,null,2),name=fileName(type);
  openSheet('إرسال',`<p class="t2" style="margin-top:0">${esc(TYPES[type]||type)} · ${esc(name)}</p>
    <button class="btn" id="sShare">📤 مشاركة (واتساب، بريد، ملفات…)</button><div class="actions"><button class="btn ghost" id="sDl">تنزيل الملف</button><button class="btn ghost" id="sCp">نسخ النص</button></div>`,b=>{
    const done=()=>{after&&after();save()};
    b.querySelector('#sShare').addEventListener('click',async()=>{try{const f=new File([text],name,{type:'application/json'});
      if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:name});done();closeSheet();render();return}
      if(navigator.share){await navigator.share({title:name,text});done();closeSheet();render();return}toast('المشاركة غير متاحة هنا، استخدم التنزيل أو النسخ')}catch(e){if(e&&e.name!=='AbortError')toast('تعذّرت المشاركة')}});
    b.querySelector('#sDl').addEventListener('click',()=>{const u=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);done();toast('نُزّل الملف')});
    b.querySelector('#sCp').addEventListener('click',()=>{copy(text).then(()=>{done();toast('نُسخ النص')})})})}
function copy(t){if(navigator.clipboard&&window.isSecureContext)return navigator.clipboard.writeText(t).catch(()=>fallbackCopy(t));return Promise.resolve(fallbackCopy(t))}
function fallbackCopy(t){const a=document.createElement('textarea');a.value=t;a.style.position='fixed';a.style.opacity='0';document.body.appendChild(a);a.select();try{document.execCommand('copy')}catch(e){}a.remove()}
function doBackup(){const env=envelope('نسخة_احتياطية',{'البيانات':JSON.parse(JSON.stringify(S))},(S.profile&&S.profile.name)||'');sendFile(env,'نسخة_احتياطية',()=>{S.lastBackup=isoNow();log('حفظ نسخة احتياطية')})}

/* ═══════════ وحدة تخطيط الأسبوع (رُشد زوجة) ═══════════
   كل نشاط: مخطَّط ← تم، أو أُجّل (يبقى أثره وينشأ نشاط في اليوم الجديد)، أو أُلغي بسبب.
   المحسوب: ما حلّ يومه فقط. النشاط المخطَّط الذي مضى يومه بلا قرار يظهر «لم يُحسم» ولا يُعدّ صفراً بصمت. */
const PC=[['out','خروج','🚗'],['cook','طبخ','🍲'],['tasmee','تسميع','🎙️'],['visit','زيارة وصلة رحم','🏠'],['kids','وقت مع الأبناء','👨‍👩‍👧'],['shop','تسوق','🛒'],
  ['house','ترتيب البيت','🧹'],['appt','موعد','📅'],['learn','تعلّم ودرس','📚'],['sport','رياضة ومشي','🚶‍♀️'],['guest','ضيافة','☕'],['other','أخرى','✨']];
const PCH={cook:'ما الطبق؟',tasmee:'ماذا يُسمَّع؟ ولمن؟',out:'إلى أين؟',visit:'زيارة من؟',appt:'ما الموعد؟',shop:'ماذا نشتري؟',learn:'ما الدرس؟',guest:'من الضيوف؟'};
const pcOf=id=>PC.find(c=>c[0]===id)||PC[PC.length-1];
const pcByName=n=>PC.find(c=>c[1]===n||c[0]===n)||PC[PC.length-1];
const WD=['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
const PST={plan:'مخطَّط',done:'تم',moved:'أُجّل',x:'أُلغي'};
const planIn=(from,to)=>S.plan.filter(x=>x.k>=from&&x.k<=to);
function planStat(from,to){const L=planIn(from,to),t=today(),cut=to<t?to:t;
  const due=L.filter(x=>x.k<=cut&&(x.st==='plan'||x.st==='done')),done=due.filter(x=>x.st==='done').length,open=L.filter(x=>x.st==='plan'&&x.k<t).length;
  const byCat={};L.forEach(x=>{const c=byCat[x.cat]=byCat[x.cat]||{plan:0,done:0,moved:0,x:0,ahead:0};if(x.st==='plan'&&x.k>cut)c.ahead++;else c[x.st]++});
  return{L,due:due.length,done,open,moved:L.filter(x=>x.st==='moved').length,x:L.filter(x=>x.st==='x').length,ahead:L.filter(x=>x.st==='plan'&&x.k>cut).length,byCat,g:due.length?G(done,due.length,due.length/2):'g'}}
function helperStat(from,to){const t=today(),end=to<t?to:t;let sum=0,n=0,m=0;const rows=[];
  for(let k=from;k<=end;k=addDays(k,1)){m++;const v=S.helper[k];if(v!=null&&v!==''){n++;sum+=+v;rows.push({'التاريخ':k,'الساعات':+v})}}return{sum:+sum.toFixed(2),n,m,rows}}

function vPlan(){const ws=weekStart(U.planK),we=addDays(ws,6),t=today(),st=planStat(ws,we);
  const prevHas=planIn(addDays(ws,-7),addDays(ws,-1)).some(x=>x.st!=='moved'),copied=S.plan.some(x=>x.copiedTo===ws);
  const day=k=>{const L=S.plan.filter(x=>x.k===k).sort((a,b)=>(a.time||'99')<(b.time||'99')?-1:1),act=L.filter(x=>x.st!=='moved'&&x.st!=='x'),dn=act.filter(x=>x.st==='done').length;
    return `<div class="card" ${k===t?'style="border-color:var(--accent);border-width:2px"':''}><div class="row"><div class="grow"><b>${WD[kd(k).getDay()]}</b> <span class="t2">${esc(fmtD(k,{day:'numeric',month:'short'}))}${k===t?' · اليوم':''}</span></div>
      ${act.length?`<span class="tag num">${dn} من ${act.length}</span>`:''}<button class="btn ghost sm" data-pa="add" data-k="${k}" aria-label="أضف نشاطاً يوم ${WD[kd(k).getDay()]}">+ أضف</button></div>
      ${L.length?`<div class="list" style="margin-top:4px">${L.map(x=>planItem(x)).join('')}</div>`:''}</div>`};
  return `<h1>خطة الأسبوع</h1>
  <div class="daynav"><button class="btn ghost sm" data-pa="wprev">السابق</button><div class="lbl">${esc(fmtD(ws,{day:'numeric',month:'long'}))} – ${esc(fmtD(we,{day:'numeric',month:'long'}))}<small>من السبت إلى الجمعة</small></div><button class="btn ghost sm" data-pa="wnext">التالي</button></div>
  ${st.L.length?`<div class="card"><div class="row"><div class="grow"><div class="t2">المنجز مما حلّ موعده</div><div style="font-size:1.5rem;font-weight:700" class="${GC[st.g]} num">${st.due?`${st.done} من ${st.due}`:'—'}</div></div>
    <div class="t2" style="text-align:end;line-height:1.7">${st.ahead?`${st.ahead} قادم<br>`:''}${st.open?`<b class="c-r">${st.open} لم يُحسم</b><br>`:''}${st.moved?`${st.moved} أُجّل<br>`:''}${st.x?`${st.x} أُلغي`:''}</div></div>
    <div class="src">القادم لا يُحسب بعد. المؤجَّل يُحسب في يومه الجديد، والملغى لا يُحسب ويبقى ظاهراً بسببه.</div></div>`:`<div class="empty">لا أنشطة في هذا الأسبوع بعد. اضغط «+ أضف» بجانب أي يوم.</div>`}
  ${prevHas&&!copied?`<button class="btn ghost" data-pa="copyPrev" style="margin-bottom:10px">↻ انسخ خطة الأسبوع الماضي</button>`:''}
  ${Array.from({length:7},(_,i)=>day(addDays(ws,i))).join('')}
  ${E.helper?helperCard(ws):''}`}
function planItem(x){const c=pcOf(x.cat),past=x.st==='plan'&&x.k<today();
  const stl=x.st==='done'?'<b class="c-b">✓ تم</b>':x.st==='moved'?`<span class="tag">أُجّل إلى ${esc(fmtD(x.movedTo,{weekday:'short',day:'numeric',month:'short'}))}</span>`:x.st==='x'?`<span class="tag">أُلغي${x.xWhy?`: ${esc(x.xWhy)}`:''}</span>`:past?'<span class="tag warn">لم يُحسم</span>':'';
  return `<button class="it" data-pa="item" data-id="${x.id}" style="width:100%;text-align:start;align-items:center"><span style="font-size:1.2rem">${c[2]}</span>
    <div class="grow ${x.st==='x'||x.st==='moved'?'x':''}"><b>${esc(x.title||c[1])}</b>${x.time?` <span class="t2 num">${esc(x.time)}</span>`:''}
    <div class="t2">${esc(c[1])}${x.note?` · ${esc(x.note)}`:''}${x.src==='parent'?` · من ${E.parent}`:''}${x.movedFrom?` · مؤجَّل من ${esc(fmtD(x.movedFrom,{weekday:'short',day:'numeric'}))}`:''}</div></div>${stl}</button>`}
function recentTitles(cat){const seen=new Set(),out=[];for(let i=S.plan.length-1;i>=0&&out.length<6;i--){const x=S.plan[i];if(x.cat===cat&&x.title&&!seen.has(x.title)){seen.add(x.title);out.push(x.title)}}return out}
function addPlanSheet(k0,edit){let cat=edit?edit.cat:'out',k=edit?edit.k:k0;const ws=weekStart(k0);
  const sugg=()=>{const r=recentTitles(cat);return r.length?`<div class="chips" style="margin-top:6px">${r.map(t=>`<button class="chip" data-tt="${esc(t)}">${esc(t)}</button>`).join('')}</div>`:''};
  openSheet(edit?'تعديل النشاط':'نشاط جديد',`<div class="field"><span>النوع</span><div class="chips" id="pcC">${PC.map(c=>`<button class="chip" data-c="${c[0]}" aria-pressed="${c[0]===cat}">${c[2]} ${c[1]}</button>`).join('')}</div></div>
    <label class="field"><span id="pTL">${esc(PCH[cat]||'ما النشاط؟')}</span><input id="pT" value="${esc(edit?edit.title:'')}"><div id="pS">${sugg()}</div></label>
    <div class="field"><span>اليوم</span><div class="chips">${Array.from({length:7},(_,i)=>{const d=addDays(ws,i);return `<button class="chip" data-d="${d}" aria-pressed="${d===k}">${WD[kd(d).getDay()]}</button>`}).join('')}</div></div>
    <div class="actions" style="margin-top:0"><label class="field"><span>الوقت (اختياري)</span><input id="pH" type="time" value="${esc(edit?edit.time||'':'')}"></label><label class="field"><span>ملاحظة (اختياري)</span><input id="pN" value="${esc(edit?edit.note||'':'')}" placeholder="مع من؟"></label></div>
    <div class="err" id="pE"></div><button class="btn" id="pSv">حفظ</button>`,b=>{
    const bindS=()=>b.querySelectorAll('[data-tt]').forEach(el=>el.addEventListener('click',()=>{b.querySelector('#pT').value=el.dataset.tt}));bindS();
    b.querySelectorAll('[data-c]').forEach(el=>el.addEventListener('click',()=>{cat=el.dataset.c;b.querySelectorAll('[data-c]').forEach(x=>x.setAttribute('aria-pressed',x===el));b.querySelector('#pTL').textContent=PCH[cat]||'ما النشاط؟';b.querySelector('#pS').innerHTML=sugg();bindS()}));
    b.querySelectorAll('[data-d]').forEach(el=>el.addEventListener('click',()=>{k=el.dataset.d;b.querySelectorAll('[data-d]').forEach(x=>x.setAttribute('aria-pressed',x===el))}));
    b.querySelector('#pSv').addEventListener('click',()=>{const title=b.querySelector('#pT').value.trim(),time=b.querySelector('#pH').value,note=b.querySelector('#pN').value.trim();
      if(!title&&cat==='other'){b.querySelector('#pE').textContent='اكتب النشاط.';return}
      if(edit){const ch=[];if(edit.cat!==cat)ch.push('النوع');if(edit.title!==title)ch.push('العنوان');if(edit.k!==k)ch.push('اليوم');if((edit.time||'')!==time)ch.push('الوقت');
        Object.assign(edit,{cat,title,k,time,note});edit.edits=(edit.edits||[]).concat({at:isoNow(),what:ch.join('، ')||'الملاحظة'});log(`تعديل نشاط ${edit.id}`)}
      else S.plan.push({id:uid(),k,cat,title,time,note,st:'plan',src:'self',at:isoNow()});save();closeSheet();toast(edit?'عُدّل النشاط':'أُضيف إلى الخطة');render()})})}
function itemSheet(x){const c=pcOf(x.cat);
  const hist=[`أُضيف ${new Date(x.at).toLocaleString('ar-u-nu-latn',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})}${x.src==='parent'?` من ملف ${E.parent}`:''}`].concat((x.edits||[]).map(e=>`عُدّل (${e.what}) ${new Date(e.at).toLocaleString('ar-u-nu-latn',{day:'numeric',month:'short'})}`));
  if(x.doneAt)hist.push(`تم ${new Date(x.doneAt).toLocaleString('ar-u-nu-latn',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})}`);(x.undo||[]).forEach(u=>hist.push(`تراجُع عن «تم» ${new Date(u).toLocaleString('ar-u-nu-latn',{day:'numeric',month:'short'})}`));
  openSheet(`${c[2]} ${x.title||c[1]}`,`<p class="t2" style="margin-top:0">${esc(c[1])} · ${esc(fmtD(x.k))}${x.time?` · ${esc(x.time)}`:''} · ${PST[x.st]}${x.note?`<br>${esc(x.note)}`:''}</p>
    ${x.st==='plan'?`<button class="btn" id="iDone">✓ تم</button><div class="actions"><button class="btn ghost" id="iMove">أجّل إلى يوم آخر</button><button class="btn ghost" id="iX">ألغِ</button></div><button class="btn ghost" id="iEd" style="margin-top:8px">تعديل</button>`:''}
    ${x.st==='done'?`<button class="btn ghost" id="iUndo">تراجع عن «تم»</button>`:''}
    <div id="iMv" hidden><div class="field" style="margin-top:12px"><span>إلى أي يوم؟</span><div class="chips">${Array.from({length:14},(_,i)=>{const d=addDays(today()>x.k?today():x.k,i+ (today()>x.k?0:1));return `<button class="chip" data-mv="${d}">${WD[kd(d).getDay()]} ${kd(d).getDate()}</button>`}).join('')}</div></div></div>
    <div id="iXw" hidden><label class="field" style="margin-top:12px"><span>السبب (اختياري)</span><input id="iXr"></label><button class="btn" id="iXs">تأكيد الإلغاء</button></div>
    <div class="src" style="margin-top:12px">${hist.map(esc).join('<br>')}</div>`,b=>{
    const q=s=>b.querySelector(s);
    if(q('#iDone'))q('#iDone').addEventListener('click',()=>{x.st='done';x.doneAt=isoNow();log(`تم نشاط ${x.title}`);save();closeSheet();toast('أحسنتِ');render()});
    if(q('#iUndo'))q('#iUndo').addEventListener('click',()=>{x.st='plan';x.undo=(x.undo||[]).concat(isoNow());delete x.doneAt;log(`تراجع عن تم ${x.title}`);save();closeSheet();render()});
    if(q('#iEd'))q('#iEd').addEventListener('click',()=>addPlanSheet(x.k,x));
    if(q('#iMove'))q('#iMove').addEventListener('click',()=>{q('#iMv').hidden=false;q('#iXw').hidden=true});
    if(q('#iX'))q('#iX').addEventListener('click',()=>{q('#iXw').hidden=false;q('#iMv').hidden=true});
    b.querySelectorAll('[data-mv]').forEach(el=>el.addEventListener('click',()=>{const d=el.dataset.mv;x.st='moved';x.movedTo=d;x.movedAt=isoNow();
      S.plan.push({id:uid(),k:d,cat:x.cat,title:x.title,time:x.time,note:x.note,st:'plan',src:x.src,movedFrom:x.k,origin:x.id,at:isoNow()});log(`تأجيل ${x.title} إلى ${d}`);save();closeSheet();toast('أُجّل، وبقي أثره في يومه');render()}));
    if(q('#iXs'))q('#iXs').addEventListener('click',()=>{x.st='x';x.xAt=isoNow();x.xWhy=q('#iXr').value.trim();log(`إلغاء ${x.title}`);save();closeSheet();render()})})}
function copyPrevWeek(){const ws=weekStart(U.planK),L=planIn(addDays(ws,-7),addDays(ws,-1)).filter(x=>x.st!=='moved');
  openSheet('نسخ خطة الأسبوع الماضي',`<p class="t2" style="margin-top:0">تُنسخ ${L.length} أنشطة إلى الأيام نفسها من هذا الأسبوع، كلها «مخطَّط». الأسبوع الماضي يبقى كما هو.</p>
    <div class="card list">${L.map(x=>`<div class="it"><span>${pcOf(x.cat)[2]}</span><div class="grow">${esc(x.title||pcOf(x.cat)[1])}<div class="t2">${WD[kd(x.k).getDay()]}</div></div></div>`).join('')}</div><button class="btn" id="cpGo">انسخها</button>`,b=>{
    b.querySelector('#cpGo').addEventListener('click',()=>{L.forEach(x=>{x.copiedTo=ws;S.plan.push({id:uid(),k:addDays(x.k,7),cat:x.cat,title:x.title,time:x.time,note:x.note,st:'plan',src:'self',copiedFrom:x.id,at:isoNow()})});
      log(`نسخ خطة الأسبوع ${ws}`);save();closeSheet();toast('نُسخت الخطة');render()})})}
function helperCard(ws){const t=today(),hs=helperStat(ws,addDays(ws,6));
  return `<h2>🧹 ساعات المساعدة</h2><div class="card"><div class="t2" style="margin-bottom:8px">عدد ساعات عمل المساعدة في كل يوم. اتركه فارغاً إن لم تسجّليه.</div>
  <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:5px">${Array.from({length:7},(_,i)=>{const k=addDays(ws,i),v=S.helper[k];
    return `<label style="text-align:center;font-size:.7rem;color:var(--muted)">${WD[kd(k).getDay()].replace('ال','')}<input data-hp="${k}" inputmode="decimal" class="num" value="${v!=null?esc(v):''}" ${k>t?'disabled':''} style="padding:8px 2px;text-align:center;margin-top:3px" aria-label="ساعات ${WD[kd(k).getDay()]}"></label>`}).join('')}</div>
  <div class="src">المجموع ${nfmt(hs.sum)} ساعة · سُجّل ${hs.n} من ${hs.m} ${dayUnit(hs.m)} حتى اليوم</div></div>`}
function planTile(t){const k=today();
  if(t==='plan'){const L=S.plan.filter(x=>x.k===k&&x.st!=='moved'&&x.st!=='x'),dn=L.filter(x=>x.st==='done').length,nx=L.find(x=>x.st==='plan');
    return `<div class="hl">📅 خطة اليوم</div><div class="hv ${L.length&&dn===L.length?'tb':''}">${L.length?dn:'—'}<small>${L.length?`من ${L.length} تم`:''}</small></div><div class="hs">${nx?`التالي: ${esc(nx.title||pcOf(nx.cat)[1])}${nx.time?' '+esc(nx.time):''}`:L.length?'✓ أتممت خطة اليوم':'اضغط لتخطيط يومك'}</div>`}
  if(t==='week'){const ws=weekStart(k),st=planStat(ws,addDays(ws,6));
    return `<div class="hl">🗓️ خطة الأسبوع</div><div class="hv ${st.g==='b'?'tb':st.g==='r'?'tr':''}">${st.due?st.done:'—'}<small>${st.due?`من ${st.due} حلّ موعدها`:''}</small></div><div class="hs">${st.L.length?([st.ahead?`${st.ahead} قادم`:'',st.open?`${st.open} لم يُحسم`:''].filter(Boolean).join(' · ')||'لا شيء معلَّق'):'لا أنشطة بعد'}</div>`}
  if(t==='helper'){const ws=weekStart(k),hs=helperStat(ws,k);
    return `<div class="hl">🧹 ساعات المساعدة</div><div class="hv">${hs.n?nfmt(hs.sum):'—'}<small>${hs.n?'ساعة هذا الأسبوع':''}</small></div><div class="hs">سُجّل ${hs.n} من ${hs.m} ${dayUnit(hs.m)}</div>`}
  return ''}
function planReportHtml(P){const s=P.pl,h=P.hp;
  return `<h2>📅 الخطة</h2>${s.L.length?`<div class="card"><table class="rp"><tr><th>النوع</th><th>تم مما حلّ</th><th>غير ذلك</th></tr>${Object.entries(s.byCat).map(([k,c])=>{const due=c.plan+c.done,g=due?G(c.done,due,due/2):'g',pc=pcOf(k);
    return `<tr><td>${pc[2]} ${esc(pc[1])}</td><td class="num"><b class="${GC[g]}">${due?`${c.done} من ${due}`:'—'}</b></td><td class="t2">${[c.ahead?`${c.ahead} قادم`:'',c.moved?`${c.moved} أُجّل`:'',c.x?`${c.x} أُلغي`:''].filter(Boolean).join('، ')||'—'}</td></tr>`}).join('')}
    <tr><td><b>المجموع</b></td><td class="num"><b class="${GC[s.g]}">${s.due?`${s.done} من ${s.due}`:'—'}</b></td><td class="t2">${s.open?`<b class="c-r">${s.open} لم يُحسم</b>`:''}</td></tr></table>
    <div class="src">المصدر: خطة الأسبوع. «حلّ موعده» = المخطَّط والمنجز حتى اليوم؛ المؤجَّل يُحسب في يومه الجديد، والملغى لا يُحسب.</div></div>`:`<div class="empty">لا أنشطة في هذه الفترة.</div>`}
  ${E.helper?`<h2>🧹 ساعات المساعدة</h2><div class="card"><b class="num">${h.n?`${nfmt(h.sum)} ساعة`:'—'}</b><div class="src">سُجّل ${h.n} من ${h.m} ${dayUnit(h.m)}؛ غير المسجَّل لا يُحسب صفراً.</div></div>`:''}`}
function planPayload(P){const s=P.pl;return{'حلّ_موعده':s.due,'تم':s.done,'لم_يُحسم':s.open,'قادم':s.ahead,'أُجّل':s.moved,'أُلغي':s.x,'اللون':GN[s.g],
  'الأنشطة':s.L.map(x=>({'التاريخ':x.k,'الفئة':pcOf(x.cat)[1],'العنوان':x.title||null,'الوقت':x.time||null,'الحالة':PST[x.st],'السبب':x.xWhy||null,'أُجّل_إلى':x.movedTo||null,'المصدر':x.src==='parent'?E.parent:E.self}))}}
function planText(P){const s=P.pl;let t=`\nالخطة: تم ${s.done} من ${s.due} مما حلّ موعده (${GN[s.g]})${s.open?` · ${s.open} لم يُحسم`:''}${s.moved?` · ${s.moved} أُجّل`:''}${s.x?` · ${s.x} أُلغي`:''}\n`;
  Object.entries(s.byCat).forEach(([k,c])=>{const due=c.plan+c.done,ex=[c.ahead?`${c.ahead} قادم`:'',c.moved?`${c.moved} أُجّل`:'',c.x?`${c.x} أُلغي`:''].filter(Boolean).join('، ');t+=`• ${pcOf(k)[1]}: ${due?`${c.done} من ${due}`:'—'}${ex?` (${ex})`:''}\n`});
  if(E.helper)t+=`\nساعات المساعدة: ${P.hp.n?nfmt(P.hp.sum)+' ساعة':'لم تُسجَّل'} (سُجّل ${P.hp.n} من ${P.hp.m} ${dayUnit(P.hp.m)})\n`;return t}
function planPreview(p){const L=p['البنود'];if(!Array.isArray(L)||!L.length)throw new Error('لا توجد «البنود»');
  L.forEach(x=>{if(!/^\d{4}-\d\d-\d\d$/.test(x['التاريخ']||''))throw new Error('تاريخ غير صالح في أحد البنود');if(!x['العنوان']&&!x['الفئة'])throw new Error('بند بلا عنوان ولا فئة')});
  return `<div class="card"><div class="list">${L.map(x=>{const c=pcByName(x['الفئة']);return `<div class="it"><span>${c[2]}</span><div class="grow"><b>${esc(x['العنوان']||c[1])}</b>${x['الوقت']?` <span class="t2">${esc(x['الوقت'])}</span>`:''}<div class="t2">${esc(fmtD(x['التاريخ']))} · ${esc(c[1])}${x['ملاحظة']?` · ${esc(x['ملاحظة'])}`:''}</div></div></div>`}).join('')}</div>
    <div class="src">عند القبول تُضاف إلى خطة الأسبوع «مخطَّطة» وموسومة «من ${E.parent}»، ويمكنك بعد ذلك تأجيلها أو إلغاؤها بسبب.</div></div>`}
function planAccept(p,id){p['البنود'].forEach(x=>S.plan.push({id:uid(),k:x['التاريخ'],cat:pcByName(x['الفئة'])[0],title:x['العنوان']||'',time:/^\d\d:\d\d$/.test(x['الوقت']||'')?x['الوقت']:'',note:x['ملاحظة']||'',st:'plan',src:'parent',fileId:id,at:isoNow()}))}
document.addEventListener('click',e=>{const el=e.target.closest('[data-pa]');if(!el)return;const a=el.dataset.pa;
  if(a==='add'){addPlanSheet(el.dataset.k);return}if(a==='item'){const x=S.plan.find(y=>y.id===el.dataset.id);if(x)itemSheet(x);return}
  if(a==='wprev'||a==='wnext'){U.planK=addDays(weekStart(U.planK),a==='wprev'?-7:7);render();return}if(a==='copyPrev'){copyPrevWeek();return}});
document.addEventListener('change',e=>{const h=e.target.closest('[data-hp]');if(!h)return;const k=h.dataset.hp,v=toNum(h.value);
  if(h.value.trim()===''){delete S.helper[k];log(`مسح ساعات ${k}`)}else if(!(v>=0&&v<=24)){toast('اكتب عدد ساعات بين 0 و24');render();return}else{S.helper[k]=+v.toFixed(2);log(`ساعات المساعدة ${k}: ${v}`)}save();render()});

/* ═══════════ الأحداث ═══════════ */
document.addEventListener('click',e=>{
  const tb=e.target.closest('[data-tab]');if(tb){go(tb.dataset.tab);return}
  const tl=e.target.closest('[data-tile]');if(tl){const t=tl.dataset.tile;U.day=today();if(t==='plan'||t==='helper'||(t==='week'&&E.plan)){U.planK=today();go('plan');return}go({today:'ch',hw:'ach',money:'money',month:'rp',week:'rp',msgs:'home'}[t]);if(t==='month'){U.rp='month';U.rpK=today();render()}if(t==='week'){U.rp='week';U.rpK=today();render()}if(t==='msgs'&&!S.tasks.some(x=>x.st!=='done')&&!S.evals.some(x=>!x.seen))importSheet();return}
  const el=e.target.closest('[data-a]');if(!el)return;const a=el.dataset.a,id=el.dataset.id;
  if(a==='pickName'){document.getElementById('nmIn').value=el.dataset.n;return}
  if(a==='setName'){const n=document.getElementById('nmIn').value.trim();if(!n){toast('اختر اسمك أو اكتبه');return}S.profile={name:n,at:isoNow()};log(`بدء الاستخدام باسم ${n}`);save();render();return}
  if(a==='settings'){go('set');return}if(a==='home'){go('home');return}
  if(a==='import'){importSheet();return}if(a==='backup'){doBackup();return}
  if(a==='tileReset'){S.tiles=null;save();render();return}
  if(a==='dprev'){U.day=addDays(U.day,-1);render();return}if(a==='dnext'){if(U.day<today())U.day=addDays(U.day,1);render();return}
  if(a==='addHw'){hwSheet();return}if(a==='addOther'){otherSheet();return}
  if(a==='achX'){const x=S.ach.find(y=>y.id===id);cancelSheet('إلغاء الإنجاز',w=>{x.st='x';x.xAt=isoNow();x.xWhy=w;log(`إلغاء إنجاز ${x.id}`)});return}
  if(a==='pickCh'){pickChSheet();return}
  if(a==='markDay'){const d=S.days[U.day]=S.days[U.day]||{c:{}};d.touched=true;d.at=isoNow();save();render();return}
  if(a==='tick'){setVal(id,U.day,!rawVal(chById(id),U.day));render();return}
  if(a==='ofT'){const c=chById(id),cur=(rawVal(c,U.day)||[]).slice(),k=el.dataset.k,i=cur.indexOf(k);if(i>=0)cur.splice(i,1);else cur.push(k);setVal(id,U.day,cur);render();return}
  if(a==='ctr'){const c=chById(id),v=Math.max(0,(+rawVal(c,U.day)||0)+ +el.dataset.d);setVal(id,U.day,+v.toFixed(2));render();return}
  if(a==='birrT'){const c=chById('birr'),b=Object.assign({t:[],n:''},rawVal(c,U.day)||{}),k=el.dataset.k;b.t=b.t.slice();const i=b.t.indexOf(k);if(i>=0)b.t.splice(i,1);else b.t.push(k);setVal('birr',U.day,b);render();return}
  if(a==='opening'){openingSheet();return}if(a==='addExp'){moneySheet('out');return}if(a==='addIn'){moneySheet('in');return}if(a==='cashCount'){countSheet();return}
  if(a==='txX'){const x=S.money.tx.find(y=>y.id===id);cancelSheet('إلغاء العملية',w=>{x.st='x';x.xAt=isoNow();x.xWhy=w;log(`إلغاء عملية ${x.id}`)});return}
  if(a==='rpP'){U.rp=el.dataset.p;render();return}
  if(a==='rpPrev'||a==='rpNext'){const s=a==='rpPrev'?-1:1;if(U.rp==='day')U.rpK=addDays(U.rpK,s);else if(U.rp==='week')U.rpK=addDays(U.rpK,7*s);else{const d=kd(monthStart(U.rpK));d.setMonth(d.getMonth()+s);U.rpK=keyOf(d)}if(U.rpK>today())U.rpK=today();render();return}
  if(a==='sendReport'){sendFile(envelope('تقرير',reportPayload()),'تقرير');return}
  if(a==='copyReport'){copy(reportText()).then(()=>toast('نُسخ التقرير نصاً'));return}
  if(a==='evalSeen'){const x=S.evals.find(y=>y.id===id);x.seen=true;x.seenAt=isoNow();save();render();return}
  if(a==='taskAcc'){const x=S.tasks.find(y=>y.id===id);x.st='accepted';x.accAt=isoNow();log(`قبول تكليف ${x.title}`);save();render();return}
  if(a==='taskDone'){const x=S.tasks.find(y=>y.id===id);openSheet('أنجزت التكليف',`<p style="margin-top:0"><b>${esc(x.title)}</b></p><label class="field"><span>ملاحظة ${E.toParent} (اختياري)</span><input id="tdN"></label><button class="btn" id="tdS">سجّل الإنجاز وأرسله</button>`,b=>{
    b.querySelector('#tdS').addEventListener('click',()=>{x.st='done';x.doneAt=isoNow();x.note=b.querySelector('#tdN').value.trim();log(`إنجاز تكليف ${x.title}`);save();
      sendFile(envelope('إنجاز_تكليف',{'ملف_التكليف':x.fileId,'العنوان':x.title,'أُنجز_في':x.doneAt,'ملاحظة':x.note||null}),'إنجاز_تكليف')})});return}
});
document.addEventListener('change',e=>{
  const ci=e.target.closest('[data-ctr]');if(ci){const id=ci.dataset.ctr,v=toNum(ci.value);if(ci.value.trim()===''){setVal(id,U.day,null)}else if(!(v>=0)){toast('اكتب رقماً');render();return}else setVal(id,U.day,+v.toFixed(2));render();return}
  if(e.target.matches('[data-birrn]')){const c=chById('birr'),b=Object.assign({t:[],n:''},rawVal(c,U.day)||{});b.n=e.target.value.trim();setVal('birr',U.day,b);render()}
});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&!document.querySelector('.ov'))render()});
render();
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});
