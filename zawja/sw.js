const PREFIX='rushd-zawja-',CACHE=PREFIX+'v1';
const FILES=['./','./index.html','./manifest.json','../rushd.js','../rushd.css','./icon-192.png','./icon-512.png'];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>Promise.all(FILES.map(f=>fetch(f,{cache:"reload"}).then(r=>{if(r.ok)return c.put(f,r)}).catch(()=>{})))).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
/* ملفات الموقع نفسه: الشبكة أولاً ثم المخزَّن عند انقطاع الاتصال، حتى تصل التحديثات فوراً. الخطوط: المخزَّن أولاً. */
self.addEventListener("fetch",e=>{
  const req=e.request; if(req.method!=="GET") return;
  const url=new URL(req.url);
  if(url.origin===location.origin){
    e.respondWith(fetch(req,{cache:"no-store"}).then(res=>{if(res.ok){const cp=res.clone();caches.open(CACHE).then(c=>c.put(req,cp))}return res})
      .catch(()=>caches.match(req,{ignoreSearch:true}).then(r=>r||(req.mode==="navigate"?caches.match("./index.html"):undefined))));
    return;
  }
  e.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>{if(res&&(res.ok||res.type==="opaque")){const cp=res.clone();caches.open(CACHE).then(c=>c.put(req,cp))}return res})));
});
