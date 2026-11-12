/* Firebase layer: shared sign-in (name + 4-digit PIN), worker list and facility settings.
   The Firebase web config is public by design. What protects the data is firestore.rules. */
const FB_CONFIG={
  apiKey:"AIzaSyCujdSL6uxI7mDKi5EYDwHkIATcwCsusC0",
  authDomain:"firstcarepos.firebaseapp.com",
  projectId:"firstcarepos",
  storageBucket:"firstcarepos.firebasestorage.app",
  messagingSenderId:"426999112198",
  appId:"1:426999112198:web:3904eed4d6d9f101429987"
};
const cloud=(function(){
  if(typeof firebase==="undefined")return null; /* SDK could not be loaded (offline) */
  const app=firebase.initializeApp(FB_CONFIG),auth=app.auth(),db=app.firestore();
  /* nobody stays signed in after the page closes (shared pharmacy devices) */
  const noPersist=auth.setPersistence(firebase.auth.Auth.Persistence.NONE).catch(()=>{});
  const ALL=["dash","inv","pos","rcpt","rx","team","facility"];
  /* Firebase Auth needs 6+ characters, so a fixed suffix is added to the 4-digit PIN */
  const pw=pin=>pin+"-fc";
  const emailOf=name=>{
    let s=name.trim().toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,".").replace(/^\.+|\.+$/g,"");
    if(!s)s="w"+[...name.trim()].map(c=>c.charCodeAt(0).toString(16)).join("");
    return s+"@firstcare.app";
  };
  const ts=()=>firebase.firestore.FieldValue.serverTimestamp();
  const wfrom=d=>({id:d.id,...d.data()});
  const err=(code,msg)=>Object.assign(new Error(msg),{code});
  const net=e=>e&&(e.code==="auth/network-request-failed"||e.code==="unavailable"||e.code==="failed-precondition");

  /* ---- stock and sales: saved in Firestore, live on every device ----
     Collections: stock (one document per batch), catalog (the medicine list), sales (one per receipt).
     meta/store marks that saving has been set up and keeps the next receipt/batch numbers.
     The app code hands in an adapter (see pharmacy.js) so this layer never touches the screen. */
  const SEED_STARTER=true; /* very first run only: save the starter medicines already on screen. Set to false to start empty. */
  const COLS=["stock","catalog","sales"],FIELD={stock:"meds",catalog:"catalog",sales:"sales"};
  const SORT={stock:(a,b)=>a.id-b.id,catalog:(a,b)=>a.id-b.id,sales:(a,b)=>b.id-a.id}; /* receipts newest first, like the app keeps them */
  /* same text for the same data whatever the key order, so Firestore's key order never looks like a change */
  const canon=v=>{const j=JSON.stringify(v);return j===undefined?"null":Array.isArray(v)?"["+v.map(canon).join(",")+"]":(v&&typeof v==="object")?"{"+Object.keys(v).sort().filter(k=>v[k]!==undefined).map(k=>JSON.stringify(k)+":"+canon(v[k])).join(",")+"}":j;};
  const clean=o=>JSON.parse(JSON.stringify(o)); /* drops undefined, which Firestore refuses */
  const store=(function(){
    let ad=null,ready=false,known=null,unsubs=[],pending=new Set(),timer=null,retryAt=0,cKnown={},errShown=false,closing=Promise.resolve();
    const fresh=()=>({stock:new Map(),catalog:new Map(),sales:new Map()});
    const ref=(c,id)=>db.collection(c).doc(String(id));
    const metaRef=()=>db.doc("meta/store");
    const maxId=a=>a.reduce((m,x)=>Math.max(m,+x.id||0),0)+1;
    function counters(r){const d=ad.get();ad.counters(Math.max(maxId(d.meds),+r.nextMed||1),Math.max(maxId(d.catalog),+r.nextCat||1),Math.max(maxId(d.sales),+r.nextSale||1));}
    /* what changed on this device since the last save */
    function diff(){
      const ops=[],d=ad.get();
      for(const c of COLS){
        const list=d[FIELD[c]],seen=new Set(),km=known[c];
        for(const it of list){
          const id=String(it.id),obj=clean(it),js=canon(obj),old=km.get(id);seen.add(id);
          if(old&&old.js===js)continue;
          let op={t:"set",c,id,data:obj,prev:old};
          /* a stock quantity change is sent as "add/subtract N" so two tills selling the same medicine do not overwrite each other */
          if(old&&c==="stock"&&typeof obj.qty==="number"&&typeof old.obj.qty==="number"&&canon(Object.assign({},old.obj,{qty:0}))===canon(Object.assign({},obj,{qty:0})))op={t:"inc",c,id,by:obj.qty-old.obj.qty,prev:old};
          ops.push(op);km.set(id,{js,obj});
        }
        for(const id of [...km.keys()])if(!seen.has(id)){ops.push({t:"del",c,id,prev:km.get(id)});km.delete(id);}
      }
      const w={nextMed:d.nextMed,nextCat:d.nextCat,nextSale:d.nextSale};
      if(w.nextMed>(cKnown.nextMed||0)||w.nextCat>(cKnown.nextCat||0)||w.nextSale>(cKnown.nextSale||0)){ops.push({t:"meta",data:w,prev:cKnown});cKnown=w;}
      return ops;
    }
    function rollback(part){
      for(const o of part){
        if(o.t==="meta"){cKnown={};continue;}
        const km=known&&known[o.c];if(!km)continue;
        if(o.prev)km.set(o.id,o.prev);else km.delete(o.id);
      }
    }
    /* a whole sale (receipt + stock taken off) goes in one batch, so it is saved together or not at all */
    function commit(ops){
      const ps=[];
      for(let i=0;i<ops.length;i+=400){
        const part=ops.slice(i,i+400),b=db.batch();
        for(const o of part){
          if(o.t==="meta")b.set(metaRef(),o.data,{merge:true});
          else if(o.t==="del")b.delete(ref(o.c,o.id));
          else if(o.t==="inc")b.update(ref(o.c,o.id),{qty:firebase.firestore.FieldValue.increment(o.by)});
          else b.set(ref(o.c,o.id),o.data);
        }
        const p=b.commit().then(()=>{errShown=false;},e=>{rollback(part);throw e;});
        pending.add(p);p.then(()=>pending.delete(p),()=>pending.delete(p));
        ps.push(p);
      }
      return Promise.all(ps);
    }
    function flush(){
      if(!ready)return Promise.resolve();
      const ops=diff();if(!ops.length)return Promise.resolve();
      return commit(ops).catch(e=>{
        retryAt=Date.now()+8000;schedule(8000);
        if(!errShown){errShown=true;ad.error("Your latest changes could not be saved to the server"+(net(e)?". Check the internet connection.":". Ask the administrator to check the access rules.")+" The app will keep trying.");}
      });
    }
    function schedule(ms){
      if(!ready||timer)return;
      timer=setTimeout(()=>{timer=null;flush();},Math.max(ms==null?200:ms,retryAt-Date.now(),0));
    }
    const take=(snaps)=>{
      known=fresh();const out={};
      COLS.forEach((c,i)=>{
        const list=snaps[i].docs.map(d=>clean(d.data())).sort(SORT[c]);
        list.forEach(o=>known[c].set(String(o.id),{js:canon(o),obj:clean(o)})); /* own copy: the screen edits its objects in place */
        out[FIELD[c]]=list;
      });
      return out;
    };
    function attach(){
      COLS.forEach(c=>unsubs.push(db.collection(c).onSnapshot(s=>{
        if(!ready)return;
        flush(); /* our own unsaved change is queued first, so a change from another device cannot overwrite it */
        const list=ad.get()[FIELD[c]],km=known[c];let n=0;
        s.docChanges().forEach(ch=>{
          const id=ch.doc.id,i=list.findIndex(x=>String(x.id)===id);
          if(ch.type==="removed"){if(i>=0){list.splice(i,1);n++;}km.delete(id);return;}
          const obj=clean(ch.doc.data()),js=canon(obj),old=km.get(id);
          if(old&&old.js===js)return; /* it is our own change coming back */
          if(i>=0)list[i]=obj;else list.push(obj);
          km.set(id,{js,obj:clean(obj)});n++;
        });
        if(n){list.sort(SORT[c]);counters({});ad.changed();}
      },()=>{})));
      unsubs.push(metaRef().onSnapshot(s=>{if(ready&&s.exists)counters(s.data()||{});},()=>{}));
    }
    async function load(){
      const [meta,...snaps]=await Promise.all([metaRef().get(),...COLS.map(c=>db.collection(c).get())]);
      const hasData=snaps.some(s=>!s.empty);
      if(meta.exists||hasData){
        ad.set(take(snaps));counters(meta.exists?meta.data()||{}:{});
        cKnown=meta.exists?{nextMed:+(meta.data()||{}).nextMed||0,nextCat:+(meta.data()||{}).nextCat||0,nextSale:+(meta.data()||{}).nextSale||0}:{};
        if(!meta.exists)await metaRef().set({initialized:true,created:ts()},{merge:true});
      }else{
        /* first ever run: save what is on screen (or start empty) */
        known=fresh();cKnown={};
        if(!SEED_STARTER)ad.set({meds:[],catalog:[],sales:[]});
        counters({});
        const ops=diff();
        await commit(ops.filter(o=>o.t!=="meta"));
        const d=ad.get();
        await metaRef().set({initialized:true,created:ts(),nextMed:d.nextMed,nextCat:d.nextCat,nextSale:d.nextSale});
        cKnown={nextMed:d.nextMed,nextCat:d.nextCat,nextSale:d.nextSale};
      }
    }
    return {
      async open(adapter){
        await closing;
        ad=adapter;ready=false;errShown=false;
        try{
          await Promise.race([load(),new Promise((_,j)=>setTimeout(()=>j(err("timeout","timeout")),20000))]);
        }catch(e){ad=null;known=null;throw err("store","Signed in, but the saved stock and sales could not be loaded. Check the internet connection and try again.");}
        ready=true;attach();
      },
      sync(){schedule();},
      close(){
        closing=(async()=>{
          if(ready){
            clearTimeout(timer);timer=null;
            try{await flush();}catch(e){}
            await Promise.race([Promise.allSettled([...pending]),new Promise(r=>setTimeout(r,4000))]);
          }
          ready=false;unsubs.forEach(f=>{try{f();}catch(e){}});unsubs=[];known=null;ad=null;cKnown={};pending=new Set();
        })();
        return closing;
      },
      flushNow(){if(ready){clearTimeout(timer);timer=null;flush();}}
    };
  })();
  if(typeof window!=="undefined")window.addEventListener("pagehide",()=>store.flushNow());
  let outP=Promise.resolve();

  return {
    /* has the first (owner) account been created yet? */
    async isSetup(){
      try{const s=await db.doc("meta/setup").get();return s.exists;}
      catch(e){throw err("network","Cannot reach the server. Check the internet connection.");}
    },
    /* the first account on a fresh system becomes the owner and administrator */
    async registerOwner(name,pin){
      await noPersist;await outP.catch(()=>{});
      const email=emailOf(name);let cred;
      try{cred=await auth.createUserWithEmailAndPassword(email,pw(pin));}
      catch(e){
        if(net(e))throw err("network","Cannot reach the server. Check the internet connection.");
        if(e.code==="auth/email-already-in-use"){
          try{cred=await auth.signInWithEmailAndPassword(email,pw(pin));}
          catch(_){throw err("taken","This system already has an account with that name.");}
        }else throw err(e.code,"Could not create the account. "+(e.message||""));
      }
      const uid=cred.user.uid,b=db.batch();
      b.set(db.doc("workers/"+uid),{name,nameLower:name.toLowerCase(),role:"Admin",slot:1,owner:true,access:ALL,created:ts()});
      b.set(db.doc("meta/setup"),{initialized:true,owner:uid,created:ts()});
      try{await b.commit();}
      catch(e){
        try{await cred.user.delete();}catch(_){}
        try{await auth.signOut();}catch(_){}
        if(e.code==="permission-denied")throw err("closed","Someone has already set up this system. Sign in with the account the administrator gave you.");
        throw err(e.code,"Could not finish setup. Try again.");
      }
      return {id:uid,name,role:"Admin",slot:1,owner:true,access:ALL};
    },
    async login(name,pin){
      await noPersist;await outP.catch(()=>{});
      let cred;
      try{cred=await auth.signInWithEmailAndPassword(emailOf(name),pw(pin));}
      catch(e){
        if(net(e))throw err("network","Cannot reach the server. Check the internet connection.");
        if(e.code==="auth/too-many-requests")throw err("busy","Too many tries. Wait a few minutes and try again.");
        throw err("bad","Incorrect details. Try again.");
      }
      const d=await db.doc("workers/"+cred.user.uid).get().catch(()=>null);
      if(!d||!d.exists){await auth.signOut();throw err("removed","This account has been removed. Ask the administrator.");}
      return wfrom(d);
    },
    /* unsaved stock/sales changes are sent before the account signs out */
    logout(){outP=(async()=>{await store.close();await auth.signOut();})();return outP;},
    openStore(adapter){return store.open(adapter);},
    syncStore(){store.sync();},
    /* re-check the signed-in worker's PIN before a destructive action */
    async verifyPin(pin){
      const u=auth.currentUser;if(!u)return false;
      try{await u.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(u.email,pw(pin)));return true;}
      catch(e){return false;}
    },
    /* admin adds a worker: the account is made on a second app instance so the admin stays signed in */
    async createWorker(w){
      const email=emailOf(w.name);
      const app2=firebase.apps.find(a=>a.name==="worker-create")||firebase.initializeApp(FB_CONFIG,"worker-create");
      const a2=app2.auth();await a2.setPersistence(firebase.auth.Auth.Persistence.NONE).catch(()=>{});
      let cred;
      try{cred=await a2.createUserWithEmailAndPassword(email,pw(w.pin));}
      catch(e){
        if(e.code==="auth/email-already-in-use")throw err("taken","A worker with this name already exists or was removed earlier. Use a slightly different name, for example add a middle initial.");
        if(net(e))throw err("network","Cannot reach the server. Check the internet connection.");
        throw err(e.code,"Could not create the worker. "+(e.message||""));
      }
      const uid=cred.user.uid;
      try{await a2.signOut();}catch(_){}
      try{
        await db.doc("workers/"+uid).set({name:w.name,nameLower:w.name.toLowerCase(),role:w.role,slot:w.slot,owner:false,access:w.access,created:ts()});
      }catch(e){throw err(e.code,"The account was made but could not be saved. Check your administrator access.");}
      return uid;
    },
    /* removing the worker document locks the account out of all data */
    removeWorker(uid){return db.doc("workers/"+uid).delete();},
    updateWorker(uid,patch){return db.doc("workers/"+uid).update(patch);},
    /* live list of workers (administrators only) */
    watchTeam(cb,onErr){
      return db.collection("workers").onSnapshot(s=>cb(s.docs.map(wfrom).sort((a,b)=>(a.slot||0)-(b.slot||0))),e=>{if(onErr)onErr(e);});
    },
    /* names shown on the sign-in screen (names only, no PINs); administrators keep the list up to date */
    async getRoster(){
      try{const s=await db.doc("meta/roster").get();const n=s.exists?(s.data()||{}).names:null;return Array.isArray(n)?n.filter(x=>typeof x==="string"):[];}
      catch(e){return [];}
    },
    saveRoster(names){return db.doc("meta/roster").set({names});},
    /* facility name/logo/receipt settings, shared by every device */
    watchFacility(cb){
      return db.doc("meta/facility").onSnapshot(s=>{if(s.exists)cb(s.data());},()=>{});
    },
    saveFacility(f){return db.doc("meta/facility").set(f);}
  };
})();
