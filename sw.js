const CACHE='budget-planner-shell-v2';
const SHELL=['./','./manifest.webmanifest','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./apple-touch-icon.png'];

// Hosts such as Cloudflare redirect /index.html to /. A browser refuses a redirected
// response for a page navigation, so always hand back a clean, non-redirected copy.
function clean(res){
  if(!res.redirected) return Promise.resolve(res);
  return res.blob().then(b=>new Response(b,{status:res.status,statusText:res.statusText,headers:res.headers}));
}

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>Promise.all(SHELL.map(u=>
    fetch(u,{cache:'reload'}).then(clean).then(r=>r.ok?c.put(u,r):null).catch(()=>null)
  ))).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET') return;
  if(req.mode==='navigate'){
    // Network first so updates arrive; fall back to the saved copy when offline.
    e.respondWith(fetch(req).then(clean).then(res=>{
      if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put('./',copy));}
      return res;
    }).catch(()=>caches.match('./')));
    return;
  }
  e.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>{
    if(res.ok&&new URL(req.url).origin===location.origin){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));}
    return res;
  })));
});
