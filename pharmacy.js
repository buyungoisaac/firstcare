const THEME_KEY="pharmacy-theme";
const SVG='<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';
const SUN=SVG+'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const MOON=SVG+'<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
const darkMQ=window.matchMedia?window.matchMedia("(prefers-color-scheme: dark)"):null;
function applyPharmacyTheme(pref){
  const p=["light","dark","auto"].includes(pref)?pref:"auto";
  const t=p==="auto"?(darkMQ&&darkMQ.matches?"dark":"light"):p;
  document.documentElement.dataset.theme=t;
  document.documentElement.dataset.themePref=p;
  document.querySelectorAll("[data-th]").forEach(b=>{const on=b.dataset.th===p;b.setAttribute("aria-checked",String(on));b.classList.toggle("on",on);});
  try{localStorage.setItem(THEME_KEY,p);}catch(e){console.warn("Theme preference could not be saved.");}
}
function initializePharmacyTheme(){
  let saved=null;
  try{saved=localStorage.getItem(THEME_KEY);}catch(e){}
  applyPharmacyTheme(saved||"auto");
  if(darkMQ&&darkMQ.addEventListener)darkMQ.addEventListener("change",()=>{if(document.documentElement.dataset.themePref==="auto")applyPharmacyTheme("auto");});
}
/* account menu (user icon in the header) */
function showUser(w){
  document.getElementById("who").textContent=w.name;
  document.getElementById("urole").textContent=w.role||"";
  document.getElementById("uinit").textContent=(w.name.trim()[0]||"?").toUpperCase();
  document.getElementById("userBtn").setAttribute("aria-label","Account menu, signed in as "+w.name);
  document.getElementById("umenu").hidden=false;
}
function hideUser(){document.getElementById("umenu").hidden=true;}
function closeUserMenu(focusBtn){
  const pn=document.getElementById("userPanel"),bt=document.getElementById("userBtn");
  if(!pn||pn.hidden)return;pn.hidden=true;bt.setAttribute("aria-expanded","false");if(focusBtn)bt.focus();
}
function openUserMenu(){
  const pn=document.getElementById("userPanel"),bt=document.getElementById("userBtn");
  pn.hidden=false;bt.setAttribute("aria-expanded","true");
  const f=pn.querySelector('[data-th].on')||pn.querySelector("button");if(f)f.focus();
}
initializePharmacyTheme();
const STYLE_KEY="pharmacy-style";
const STYLES={classic:"Standard",skeuo:"Skeuomorphic",glass:"Glassmorphism"};
function applyStyle(s,save){
  const v=STYLES[s]?s:"classic";
  document.documentElement.dataset.style=v;
  if(save)try{localStorage.setItem(STYLE_KEY,v);}catch(e){}
}
(function(){let s="classic";try{s=localStorage.getItem(STYLE_KEY)||"classic";}catch(e){}applyStyle(s,false);})();

const TODAY=(()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");})();
const FKEY="pharmacy-facility";
const state={view:"dash",q:"",msg:null,
facility:{name:"Macro Medical Centre",logo:"",phone:"",footer:"Thank you. Get well soon.",showCashier:true,showChange:true},draft:null,range:{k:"week",from:"",to:""},payMethod:"Cash",received:"",
meds:[
{id:1,name:"Amoxicillin 500 mg",qty:120,min:40,cost:500,sell:800,exp:"2027-08-01"},
{id:2,name:"Metformin 850 mg",qty:18,min:50,cost:300,sell:500,exp:"2027-03-15"},
{id:3,name:"Ibuprofen 400 mg",qty:200,min:60,cost:200,sell:400,exp:"2026-09-30"},
{id:4,name:"Lisinopril 10 mg",qty:75,min:30,cost:400,sell:700,exp:"2028-01-20"},
{id:5,name:"Cetirizine 10 mg",qty:9,min:25,cost:250,sell:500,exp:"2027-11-10"},
{id:6,name:"Amoxicillin 500 mg",qty:60,min:40,cost:500,sell:800,exp:"2027-01-15"}],
rx:[
{id:1,patient:"Maria Lopez",med:1,qty:21,status:"Pending"},
{id:2,patient:"James Carter",med:2,qty:60,status:"Pending"},
{id:3,patient:"Aisha Khan",med:4,qty:30,status:"Draft"},
{id:4,patient:"Tom Becker",med:5,qty:10,status:"Filled"}],
nextMed:7,nextRx:5,cart:[],sales:[],pq:"",nextSale:1,nextLine:1,rcpt:null,as:null,user:null,fails:0,slots:5,nextWorker:1,team:[]};
try{const s=JSON.parse(localStorage.getItem(FKEY));if(s&&typeof s.name==="string"&&s.name.trim())state.facility={name:s.name.trim(),logo:typeof s.logo==="string"&&s.logo.startsWith("data:image/")?s.logo:"",phone:typeof s.phone==="string"?s.phone:"",footer:typeof s.footer==="string"?s.footer:"Thank you. Get well soon.",showCashier:s.showCashier!==false,showChange:s.showChange!==false};}catch(e){}

/* workers live in Firebase (cloud.js); this device keeps only the signed-in worker and the list the admin may see */
/* ---- Expenses (kept on this device) and credit-sale form ---- */
const EKEY="pharmacy-expenses";
state.expenses=[];state.nextExp=1;state.rxCost=0;state.facTab="details";
state.cust={name:"",phone:"",dep:"",depm:"Cash",due:""};
try{const x=JSON.parse(localStorage.getItem(EKEY));if(Array.isArray(x)){state.expenses=x.filter(e=>e&&typeof e.desc==="string"&&e.amt>=0);state.nextExp=state.expenses.reduce((a,e)=>Math.max(a,+e.id||0),0)+1;}}catch(e){}
function saveExp(){try{localStorage.setItem(EKEY,JSON.stringify(state.expenses));return true;}catch(e){return false;}}
const EXCATS=["Rent","Salaries","Utilities","Transport","Supplies","Licences and fees","Other"];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=n=>"UGX "+Math.round(n).toLocaleString("en-US");
const badge=(cls,icon,text)=>`<span class="badge s-${cls}"><span aria-hidden="true">${icon}</span>${text}</span>`;
/* credit sales: a sale with .debt is on credit. Money paid so far = sum of its payments. */
const salePaid=s=>s.debt?s.debt.pays.reduce((a,p)=>a+p.amt,0):s.total;
const saleOwed=s=>s.debt?Math.max(0,s.total-salePaid(s)):0;
const saleCost=s=>s.lines.reduce((a,l)=>a+l.qty*(l.cost||0),0);
const owedTotal=()=>state.sales.reduce((a,s)=>a+saleOwed(s),0);
const saleBadge=s=>!s.debt?badge("success","&#10003;","Paid"):saleOwed(s)<=0?badge("success","&#10003;","Paid (was credit)"):salePaid(s)>0?badge("warning","&#9888;","Part paid"):badge("danger","&#9888;","On credit");
const rrow=(a,b,doc)=>doc?`<tr><td>${a}</td><td class="r">${b}</td></tr>`:`<div class="rl"><span>${a}</span><span>${b}</span></div>`;
function payRows(s,doc){
  if(!s.debt)return rrow("Payment",esc(s.method)+", Paid",doc);
  const o=saleOwed(s);
  return rrow("Payment","On credit",doc)+rrow("Customer",esc(s.debt.customer),doc)+rrow("Paid so far",money(salePaid(s)),doc)+rrow("Balance owed",o>0?money(o):"Fully paid",doc)+(o>0&&s.debt.due?rrow("Pay by",esc(s.debt.due),doc):"");
}
const CAPSULE="data:image/svg+xml,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><clipPath id="c"><rect x="56" y="156" width="400" height="200" rx="100"/></clipPath></defs><g transform="rotate(-45 256 256)"><g clip-path="url(#c)"><rect x="56" y="156" width="200" height="200" fill="#174A7E"/><rect x="256" y="156" width="200" height="200" fill="#F5B731"/><rect x="250" y="156" width="12" height="200" fill="#fff" opacity=".9"/><rect x="86" y="176" width="300" height="26" rx="13" fill="#fff" opacity=".28"/></g><rect x="56" y="156" width="400" height="200" rx="100" fill="none" stroke="#10365C" stroke-width="8"/></g></svg>');
const logoSrc=()=>state.facility.logo||CAPSULE;
const MQ=window.matchMedia("(max-width:720px)");
const isMobile=()=>MQ.matches;
const ICON=k=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+({
dash:'<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
inv:'<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
pos:'<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.5 12h11l2-8H6"/>',
rcpt:'<path d="M6 2h12v20l-3-2-3 2-3-2-3 2z"/><path d="M9 7h6M9 11h6M9 15h4"/>',
rx:'<rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 2h6v4H9zM12 10v6M9 13h6"/>',
team:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c2.8 0 4.5 1.8 4.5 4.5"/>',
debt:'<circle cx="12" cy="12" r="9"/><path d="M12 6.5v11M15.2 9.3c-.6-.9-1.8-1.4-3.2-1.4-1.8 0-3.1.9-3.1 2.2 0 3.1 6.4 1.5 6.4 4.4 0 1.300-1.400 2.200-3.300 2.200-1.400 0-2.600-.5-3.300-1.400"/>',
facility:'<path d="M4 21V5l8-3 8 3v16z"/><path d="M9 21v-5h6v5M9 9h2M13 9h2M9 12.5h2M13 12.5h2"/>'}[k]||'')+'</svg>';
function applyFacility(){
  const f=state.facility;
  document.getElementById("hname").textContent=f.name;
  document.title=f.name+" pharmacy";
  for(const id of ["hlogo","llogo"]){const i=document.getElementById(id);i.src=logoSrc();i.hidden=false;}
  const t=document.getElementById("ltitle");t.textContent=f.name;t.style.fontSize=f.name.length>28?"7px":f.name.length>22?"9px":"12px";
}
function medStatus(m){
  if(m.qty<=0)return {k:"Sold out",h:badge("neutral","&#9675;","Sold out")};
  if(m.exp<=TODAY)return {k:"Expired",h:badge("danger","&#10005;","Expired")};
  if(sellable(m.name)<=minOf(m.name))return {k:"Low stock",h:badge("warning","&#9888;","Low stock")};
  return {k:"In stock",h:badge("success","&#10003;","In stock")};
}
function rxBadge(s){
  return s==="Filled"?badge("success","&#10003;","Filled")
   :s==="Pending"?badge("info","&#9716;","Pending")
   :badge("neutral","&#9675;","Draft");
}
const medById=id=>state.meds.find(m=>m.id===id);
const keyOf=n=>String(n).trim().toLowerCase();
const byExp=(a,b)=>a.exp<b.exp?-1:a.exp>b.exp?1:a.id-b.id;
const products=()=>{const seen=new Map();state.meds.forEach(m=>{const k=keyOf(m.name);if(!seen.has(k))seen.set(k,m.name);});return [...seen.values()];};
const batchesOf=n=>state.meds.filter(m=>keyOf(m.name)===keyOf(n)).sort(byExp);
/* sellable batches of a product, nearest expiry first (FEFO) */
const batches=n=>batchesOf(n).filter(m=>m.qty>0&&m.exp>TODAY);
const sellable=n=>batches(n).reduce((a,m)=>a+m.qty,0);
state.rx.forEach(r=>{const m=medById(r.med);if(m)r.drug=m.name;});
state.catalog=[];state.nextCat=1;state.addMed=false;state.editMed=null;
state.meds.forEach(m=>{if(!state.catalog.some(c=>keyOf(c.name)===keyOf(m.name)))state.catalog.push({id:state.nextCat++,name:m.name,unit:"Tablet",price:m.sell,min:m.min});});
const catOf=n=>state.catalog.find(c=>keyOf(c.name)===keyOf(n));
const minOf=n=>{const c=catOf(n);return c&&c.min!=null?c.min:10;};
function deduct(n,qty){let r=qty,c=0;for(const b of batches(n)){const t=Math.min(r,b.qty);b.qty-=t;c+=t*b.cost;r-=t;if(r<=0)break;}return c;}

const DAY=864e5;
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x;};
const day0=d=>{const x=new Date(d);x.setHours(0,0,0,0);return x;};
const fdate=d=>d.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"});
const ymd=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const compact=n=>n>=1e6?(n/1e6).toFixed(n>=1e7?0:1).replace(/\.0$/,"")+"M":n>=1e3?(n/1e3).toFixed(n>=1e4?0:1).replace(/\.0$/,"")+"k":String(Math.round(n));
function niceMax(m){if(m<=0)return 1000;const p=Math.pow(10,Math.floor(Math.log10(m))),r=m/p;return (r<=1?1:r<=2?2:r<=5?5:10)*p;}
function rangeOf(){
  const r=state.range,t0=day0(new Date());
  if(r.k==="today")return {from:t0,to:addDays(t0,1),label:"Today"};
  if(r.k==="week")return {from:addDays(t0,-6),to:addDays(t0,1),label:"Last 7 days"};
  if(r.k==="month")return {from:addDays(t0,-29),to:addDays(t0,1),label:"Last 30 days"};
  let a=r.from?new Date(r.from+"T00:00:00"):t0,b=r.to?new Date(r.to+"T00:00:00"):t0;
  if(b<a){const x=a;a=b;b=x;}
  return {from:a,to:addDays(b,1),label:fdate(a)+(+a===+b?"":" to "+fdate(b))};
}
function salesStats(R){
  const ss=state.sales.filter(s=>s.ts>=+R.from&&s.ts<+R.to),total=ss.reduce((a,s)=>a+s.total,0),items=ss.reduce((a,s)=>a+s.lines.reduce((b,l)=>b+l.qty,0),0),prod={},pay={};
  ss.forEach(s=>{pay[s.method]=(pay[s.method]||0)+s.total;s.lines.forEach(l=>{const p=prod[l.name]||(prod[l.name]={name:l.name,rev:0,units:0});p.rev+=l.qty*l.price;p.units+=l.qty;});});
  return {ss,total,count:ss.length,items,avg:ss.length?total/ss.length:0,top:Object.values(prod).sort((a,b)=>b.rev-a.rev).slice(0,8),pay};
}
function lineChart(R,st){
  const days=Math.round((R.to-R.from)/DAY),mode=days<=1?"hour":days<=92?"day":"month",bs=[];let fm=0;
  if(mode==="hour")for(let h=0;h<24;h++)bs.push({label:h+":00",v:0});
  else if(mode==="day")for(let i=0;i<days;i++)bs.push({label:addDays(R.from,i).toLocaleDateString("en-GB",{day:"numeric",month:"short"}),v:0});
  else{fm=R.from.getFullYear()*12+R.from.getMonth();const ld=addDays(R.to,-1),lm=ld.getFullYear()*12+ld.getMonth();for(let m=fm;m<=lm;m++)bs.push({label:new Date(Math.floor(m/12),m%12,1).toLocaleDateString("en-GB",{month:"short",year:"2-digit"}),v:0});}
  st.ss.forEach(x=>{const d=new Date(x.ts),i=mode==="hour"?d.getHours():mode==="day"?Math.round((day0(d)-R.from)/DAY):d.getFullYear()*12+d.getMonth()-fm;if(bs[i])bs[i].v+=x.total;});
  const mob=isMobile(),W=mob?340:520,H=mob?220:240,L=mob?42:50,RR=26,T=14,B=32,iw=W-L-RR,ih=H-T-B,n=bs.length,max=niceMax(Math.max(0,...bs.map(b=>b.v)));
  const x=i=>L+(n===1?iw/2:i*iw/(n-1)),y=v=>T+ih-v/max*ih,pts=bs.map((b,i)=>x(i).toFixed(1)+","+y(b.v).toFixed(1)),step=Math.ceil(n/6);
  let g="";
  for(let k=0;k<=4;k++){const v=max*k/4,yy=y(v).toFixed(1);g+=`<line x1="${L}" x2="${W-RR}" y1="${yy}" y2="${yy}" stroke="var(--border)" stroke-width="1"/><text x="${L-8}" y="${(+yy+4).toFixed(1)}" text-anchor="end" font-size="12" fill="var(--text-secondary)">${compact(v)}</text>`;}
  bs.forEach((b,i)=>{if(i%step===0)g+=`<text x="${x(i).toFixed(1)}" y="${H-10}" text-anchor="middle" font-size="12" fill="var(--text-secondary)">${esc(b.label)}</text>`;});
  const area="M"+pts.join("L")+`L${x(n-1).toFixed(1)},${T+ih}L${x(0).toFixed(1)},${T+ih}Z`;
  const dots=n<=31?bs.map((b,i)=>`<circle cx="${x(i).toFixed(1)}" cy="${y(b.v).toFixed(1)}" r="3.5" fill="var(--surface)" stroke="var(--c1)" stroke-width="2"><title>${esc(b.label)}: ${money(b.v)}</title></circle>`).join(""):"";
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Sales over time, ${esc(R.label)}. Total ${money(st.total)}.">${g}<path d="${area}" fill="var(--c1)" opacity=".12"/><path d="M${pts.join("L")}" fill="none" stroke="var(--c1)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>${dots}${st.total?"":`<text x="${W/2}" y="${T+ih/2}" text-anchor="middle" font-size="14" fill="var(--text-secondary)">No sales in this period</text>`}</svg>`;
}
const PAYC={Cash:1,"Mobile money":2,Card:3,"On credit":4};
function donut(st){
  const e=Object.entries(st.pay).sort((a,b)=>b[1]-a[1]),tot=e.reduce((a,x)=>a+x[1],0);
  if(!tot)return `<div class="empty">No sales in this period.</div>`;
  const r=48,C=2*Math.PI*r;let off=0;
  const arcs=e.map(([m,v])=>{const len=v/tot*C,o=off;off+=len;return `<circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--c${PAYC[m]||1})" stroke-width="18" stroke-dasharray="${len.toFixed(2)} ${(C-len).toFixed(2)}" stroke-dashoffset="${(-o).toFixed(2)}" transform="rotate(-90 60 60)"><title>${esc(m)}: ${money(v)}</title></circle>`;}).join("");
  return `<div class="donutw"><svg viewBox="0 0 120 120" class="donut" role="img" aria-label="Sales by payment method"><circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--table-header)" stroke-width="18"/>${arcs}<text x="60" y="57" text-anchor="middle" font-size="10" fill="var(--text-secondary)">Total</text><text x="60" y="72" text-anchor="middle" font-size="13" font-weight="700" fill="var(--text-primary)">${compact(tot)}</text></svg>
  <ul class="leg">${e.map(([m,v])=>`<li><span class="sw2" style="background:var(--c${PAYC[m]||1})" aria-hidden="true"></span><span>${esc(m)}</span><b>${money(v)}</b><small>${Math.round(v/tot*100)}%</small></li>`).join("")}</ul></div>`;
}
function salesBlock(){
  const R=rangeOf(),st=salesStats(R),k=state.range.k,maxr=st.top.length?st.top[0].rev:1;
  const tabs=[["today","Today"],["week","Week"],["month","Month"],["custom","Custom"]];
  const to=addDays(R.to,-1);
  return `<div class="rng" role="group" aria-label="Date range">${tabs.map(([id,l])=>`<button type="button" class="btn ${k===id?"btn-primary":"btn-secondary"}" data-rng="${id}" aria-pressed="${k===id}">${l}</button>`).join("")}</div>
  ${k==="custom"?`<div class="grid2"><div><label for="rf">From</label><input id="rf" type="date" value="${state.range.from||ymd(R.from)}"></div><div><label for="rt">To</label><input id="rt" type="date" value="${state.range.to||ymd(to)}"></div></div>`:""}
  <p class="hint" style="margin-top:0">Showing: ${esc(R.label)}${k==="week"||k==="month"?" ("+fdate(R.from)+" to "+fdate(to)+")":""}</p>
  <div class="stats">
   <div class="card stat"><b>${money(st.total)}</b><span>Sales</span></div>
   <div class="card stat"><b>${st.count}</b><span>Number of sales</span></div>
   <div class="card stat"><b>${money(st.avg)}</b><span>Average sale</span></div>
   <div class="card stat"><b>${st.items}</b><span>Items sold</span></div>
  </div>
  <section class="card panel"><h2>Sales over time</h2>${lineChart(R,st)}</section>
  <section class="card panel"><h2>Top products</h2>${st.top.length?`<div class="hb">${st.top.map(p=>`<div class="hbr"><div class="hbn" title="${esc(p.name)}">${esc(p.name)}</div><div class="hbt"><span style="width:${Math.max(2,p.rev/maxr*100).toFixed(1)}%"></span></div><div class="hbv">${money(p.rev)}<small>${p.units} sold</small></div></div>`).join("")}</div>`:`<div class="empty">No sales in this period.</div>`}</section>
  <section class="card panel"><h2>Payment methods</h2>${donut(st)}</section>
  `;
}
function dash(){
  const expB=state.meds.filter(m=>m.qty>0&&m.exp<=TODAY),exp=expB.length;
  const lowP=products().filter(n=>sellable(n)<=minOf(n)),low=lowP.length;
  const pend=state.rx.filter(r=>r.status==="Pending").length;
  const val=state.meds.reduce((a,m)=>a+m.qty*m.cost,0);
  const alerts=[...expB.map(m=>({name:m.name,qty:m.qty,exp:m.exp,h:medStatus(m).h})),...lowP.map(n=>{const b=batches(n)[0];return {name:n,qty:sellable(n),exp:b?b.exp:"\u2014",h:badge("warning","&#9888;","Low stock")};})];
  return `<h1>Dashboard</h1>${salesBlock()}<h2>Stock</h2>
  <div class="stats">
   <div class="card stat"><b>${products().length}</b><span>Medicines in stock</span></div>
   <div class="card stat"><b>${pend}</b><span>Pending prescriptions</span></div>
   <div class="card stat"><b>${low}</b><span>Low stock</span></div>
   <div class="card stat"><b>${exp}</b><span>Expired</span></div>
   <div class="card stat"><b>${money(val)}</b><span>Stock value</span></div>
   <div class="card stat"><b>${money(owedTotal())}</b><span>Owed by customers</span></div>
  </div>
  <section class="card panel"><h2>Stock needing attention</h2>
  ${alerts.length?`<div class="wrap"><table><thead><tr><th>Medicine</th><th>In stock</th><th>Expiry</th><th>Status</th></tr></thead><tbody>${alerts.map(m=>`<tr><td>${esc(m.name)}</td><td>${m.qty}</td><td>${m.exp}</td><td>${m.h}</td></tr>`).join("")}</tbody></table></div>`:`<div class="empty">All stock is healthy.</div>`}
  </section>`;
}

function mrows(){
  const q=state.q.toLowerCase(),all=state.catalog.filter(c=>c.name.toLowerCase().includes(q)).sort((x,y)=>keyOf(x.name)<keyOf(y.name)?-1:keyOf(x.name)>keyOf(y.name)?1:0),r=all.slice(0,50);
  if(!r.length)return `<tr><td colspan="5">No medicines match your search.</td></tr>`;
  return r.map(c=>state.editMed===c.id
   ?`<tr><td><input id="en" value="${esc(c.name)}" aria-label="Name" maxlength="120"></td><td><input id="eu" value="${esc(c.unit)}" aria-label="Unit" maxlength="30"></td><td><input id="ep" type="number" min="0" value="${c.price}" aria-label="Sell price"></td><td><input id="em" type="number" min="0" value="${c.min}" aria-label="Reorder level"></td><td><div class="acts"><button class="btn btn-primary btn-sm" data-esave="${c.id}" type="button">Save</button><button class="btn btn-secondary btn-sm" id="ecancel" type="button">Cancel</button></div></td></tr>`
   :`<tr><td>${esc(c.name)}</td><td>${esc(c.unit||"\u2014")}</td><td>${money(c.price)}</td><td>${c.min}</td><td><div class="acts"><button class="btn btn-secondary btn-sm" data-eedit="${c.id}" type="button">Edit</button><button class="btn btn-secondary btn-sm" data-edel="${c.id}" type="button">Delete</button></div></td></tr>`).join("")
   +(all.length>50?`<tr><td colspan="5">Showing 50 of ${all.length}. Search to narrow the list.</td></tr>`:"");
}
/* administrators can delete one stock batch; confirmed with their PIN like the other deletes */
function batchDelBox(){
  const m=isAdmin()&&state.bdelAsk?medById(state.bdelAsk):null;
  if(!m)return "";
  return `<div class="dangerbox" role="alertdialog" aria-label="Confirm delete stock batch"><p><b>This cannot be undone.</b> The batch of <b>${esc(m.name)}</b> (${m.qty} in stock, expires ${esc(m.exp)}) will be deleted for good. The medicine stays in the medicine list.</p><label for="bdelpin">Enter your PIN to confirm</label><input id="bdelpin" type="password" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="4-digit PIN">${state.bdelErr?`<p class="lerr" role="alert" style="display:block;margin:6px 0 0">${esc(state.bdelErr)}</p>`:""}<div class="acts left" style="padding-left:0;margin-top:10px"><button class="btn btn-danger" data-bdelgo="${m.id}" type="button">Delete permanently</button><button class="btn btn-secondary" data-bdelcancel="1" type="button">Cancel</button></div></div>`;
}
function inv(){
  const cost=state.meds.reduce((a,m)=>a+m.qty*m.cost,0),units=state.meds.reduce((a,m)=>a+m.qty,0);
  const sorted=[...state.meds].sort((x,y)=>keyOf(x.name)<keyOf(y.name)?-1:keyOf(x.name)>keyOf(y.name)?1:byExp(x,y));
  return `<h1>Inventory</h1>${msg()}
  <section class="card panel">
   <div class="combo"><input class="pill" id="fn" role="combobox" aria-expanded="false" aria-controls="dd" placeholder="Search or enter product name\u2026" autocomplete="off" aria-label="Product name"><div id="dd" class="dd" hidden></div></div>
   <p class="hint">Start typing to find an existing product or insert a new one. Stock with the same expiry date joins the same batch.</p>
   <div class="grid2">
    <input id="fq" type="number" min="1" inputmode="numeric" placeholder="Quantity" aria-label="Quantity">
    <input id="fc" type="number" min="0" inputmode="decimal" placeholder="Cost price" aria-label="Cost price">
    <input id="fp" type="number" min="0" inputmode="decimal" placeholder="Selling price" aria-label="Selling price">
    <input id="fe" type="date" aria-label="Expiry date">
   </div>
   <button class="btn btn-primary wide" id="addMed" type="button">Add to batch</button>
  </section>
  <div class="stats3">
   <div class="card stat"><b>${money(cost)}</b><span>Total inventory cost</span></div>
   <div class="card stat"><b>${state.meds.length}</b><span>Stock entries</span></div>
   <div class="card stat"><b>${units}</b><span>Total units in stock</span></div>
  </div>
  <section class="card panel"><div class="wrap"><table><thead><tr><th>Products</th><th>Quantity</th><th>Cost price</th><th>Selling price</th><th>Expiry date</th><th>Line cost</th><th>Status</th>${isAdmin()?"<th></th>":""}</tr></thead><tbody>${sorted.length?sorted.map(m=>`<tr><td>${esc(m.name)}</td><td>${m.qty}</td><td>${money(m.cost)}</td><td>${money(m.sell)}</td><td>${m.exp}</td><td>${money(m.qty*m.cost)}</td><td>${medStatus(m).h}</td>${isAdmin()?`<td><div class="acts"><button class="btn btn-secondary btn-sm" data-bdelask="${m.id}" type="button">Delete</button></div></td>`:""}</tr>`).join(""):`<tr><td colspan="${isAdmin()?8:7}" class="empty">No products in inventory yet</td></tr>`}</tbody></table></div></section>
  ${batchDelBox()}
  <div class="total"><span>Total cost of inventory</span><b>${money(cost)}</b></div>
  <details class="manage"${state.open?" open":""} ontoggle="state.open=this.open"><summary>Manage medicines (${state.catalog.length})</summary>
   <div class="card panel"><div class="entry" style="padding-top:0"><h2 style="margin:0">Medicines</h2><button class="btn btn-primary btn-sm" id="addmedbtn" type="button">${state.addMed?"Close":"Add medicine"}</button></div>
   ${state.addMed?`<div class="grid2"><input id="an" placeholder="Medicine name" aria-label="Medicine name" maxlength="120"><input id="au" placeholder="Unit (e.g. Tablet)" aria-label="Unit" maxlength="30"><input id="ap" type="number" min="0" inputmode="decimal" placeholder="Sell price" aria-label="Sell price"><input id="am" type="number" min="0" inputmode="numeric" placeholder="Reorder level (default 10)" aria-label="Reorder level"></div><button class="btn btn-primary wide" id="asave" type="button">Save medicine</button>`:""}
   <div class="bar" style="margin-top:12px"><input id="search" type="search" aria-label="Search medicines" placeholder="Search medicines" value="${esc(state.q)}"></div>
   <div class="wrap"><table><thead><tr><th>Name</th><th>Unit</th><th>Sell price</th><th>Reorder at</th><th></th></tr></thead><tbody id="mrows">${mrows()}</tbody></table></div></div>
  </details>`;
}
function prows(){
  const q=state.pq.trim().toLowerCase();
  if(!q)return "";
  const r=products().filter(n=>n.toLowerCase().includes(q)&&sellable(n)>0).sort((x,y)=>(y.toLowerCase().startsWith(q)-x.toLowerCase().startsWith(q))||(x.toLowerCase()<y.toLowerCase()?-1:1)).slice(0,8);
  return r.length?r.map(n=>{const b=batches(n);return `<button type="button" role="option" data-cadd="${esc(n)}"><span><b>${esc(n)}</b><small>${sellable(n)} in stock, sells first: expires ${b[0].exp}${b.length>1?" ("+b.length+" batches)":""}</small></span><span>${money(b[0].sell)}</span></button>`;}).join(""):`<div class="ddnone">No product in stock matches &ldquo;${esc(state.pq.trim())}&rdquo;</div>`;
}
/* update cart numbers in place so a click on "Complete sale" is not lost to a re-render */
/* most of this product that can still go on this cart line */
function lineMax(l){return Math.max(1,sellable(l.name)-state.cart.filter(x=>x!==l&&keyOf(x.name)===keyOf(l.name)).reduce((a,x)=>a+x.qty,0));}
function cartLive(){
  state.cart.forEach(l=>{const i=document.getElementById("cp"+l.uid);if(!i)return;const sm=i.closest("div").querySelector("small");if(sm)sm.textContent="Subtotal "+money(l.qty*l.price);});
  const tb=document.querySelector("#main .total b");if(tb)tb.textContent=money(state.cart.reduce((a,l)=>a+l.qty*l.price,0));
  state.cart.forEach(l=>{const mx=lineMax(l),full=l.qty>=mx,q=document.getElementById("cq"+l.uid),n=document.getElementById("mx"+l.uid),pl=document.querySelector('[data-cinc="'+l.uid+'"]');
    if(q){q.classList.toggle("atmax",full);q.max=mx;}
    if(n)n.textContent=full?"Only "+sellable(l.name)+" in stock":"";
    if(pl)pl.disabled=full;});
  const c=document.getElementById("chg");if(c)c.textContent=chgText();
  const cb=document.getElementById("cbal");if(cb)cb.textContent=credText();
  const m=document.querySelector("#main .msg");if(m)m.remove();
}
function chgText(){
  const total=state.cart.reduce((a,l)=>a+l.qty*l.price,0),r=state.received;
  if(r===""||isNaN(+r))return "Enter the amount received to see the change.";
  return +r>=total?"Change to give: "+money(+r-total):"Short by "+money(total-+r);
}
const PAYM=["Cash","Mobile money","Card","On credit"];
function debtors(){
  const m=new Map();
  state.sales.forEach(x=>{const o=saleOwed(x);if(o<=0)return;const k=keyOf(x.debt.customer),d=m.get(k)||{name:x.debt.customer,phone:"",owed:0,n:0};
    d.owed+=o;d.n++;if(!d.phone&&x.debt.phone)d.phone=x.debt.phone;m.set(k,d);});
  return m;
}
function custNote(){
  const d=debtors().get(keyOf(state.cust.name));
  return d?d.name+" still owes "+money(d.owed)+" ("+d.n+" sale"+(d.n===1?"":"s")+"). This sale is added to the same customer.":"";
}
function credText(){
  const total=state.cart.reduce((a,l)=>a+l.qty*l.price,0),d=state.cust.dep;
  if(d===""||isNaN(+d)||+d<=0)return "Customer will owe the full "+money(total)+".";
  return +d>=total?"Paid now must be less than the total. For a full payment use Cash, Mobile money or Card.":"Customer will owe "+money(total-+d)+" after paying "+money(+d)+" now.";
}
function creditForm(){
  const c=state.cust;
  return `<div class="creditbox"><p class="hint" style="margin:0 0 6px"><b>Sale on credit.</b> The customer takes the products now and pays later. It is listed in Receipts, then Debts, until it is fully paid.</p>
   <label for="cn">Customer name</label><div class="combo"><input id="cn" role="combobox" aria-expanded="false" aria-controls="cdd" autocomplete="off" maxlength="60" placeholder="Search a customer who owes, or type a new name" value="${esc(c.name)}"><div id="cdd" class="dd" role="listbox" hidden></div></div>
   <p class="hint" id="cnote" role="status" style="margin:6px 4px 0">${esc(custNote())}</p>
   <label for="cph" class="gap">Customer phone (optional)</label><input id="cph" inputmode="tel" autocomplete="off" maxlength="30" placeholder="e.g. 0700 000 000" value="${esc(c.phone)}">
   <div class="grid2" style="margin-top:12px"><div><label for="cd">Paid now (optional)</label><input id="cd" type="number" min="0" inputmode="decimal" placeholder="0" value="${esc(c.dep)}"></div><div><label for="cdm">Paid now by</label><select id="cdm">${["Cash","Mobile money","Card"].map(o=>`<option${o===c.depm?" selected":""}>${o}</option>`).join("")}</select></div></div>
   <label for="cdue">Promised to pay by (optional)</label><input id="cdue" type="date" value="${esc(c.due)}">
   <p class="hint" id="cbal" role="status">${credText()}</p></div>`;
}
function pos(){
  const total=state.cart.reduce((a,l)=>a+l.qty*l.price,0);
  return `<h1>Point of sale</h1>${msg()}
  <section class="card panel"><div class="combo"><input class="pill" id="psearch" role="combobox" aria-expanded="false" aria-controls="pdd" type="search" aria-label="Search products" placeholder="Search products to add to the sale…" value="${esc(state.pq)}" autocomplete="off"><div id="pdd" class="dd" role="listbox" hidden></div></div></section>
  <section class="card panel"><h2>Cart</h2>
  ${state.cart.length?state.cart.map(l=>{const m={name:l.name},mx=lineMax(l);return `<div class="entry"><div><b>${esc(m.name)}</b><span class="line2"><label for="cp${l.uid}">Price each</label><input id="cp${l.uid}" class="price" type="number" min="0" inputmode="decimal" value="${l.price}" data-cprice="${l.uid}"></span><small>Subtotal ${money(l.qty*l.price)}</small><small class="maxnote" id="mx${l.uid}" role="status">${l.qty>=mx?"Only "+sellable(l.name)+" in stock":""}</small></div><div class="qty"><button class="btn btn-secondary btn-sm" data-cdec="${l.uid}" type="button" aria-label="Remove one ${esc(m.name)}">&minus;</button><input class="qtyin${l.qty>=mx?" atmax":""}" id="cq${l.uid}" type="number" min="0" max="${mx}" step="1" inputmode="numeric" value="${l.qty}" data-cqty="${l.uid}" aria-label="Quantity of ${esc(m.name)}"><button class="btn btn-secondary btn-sm" data-cinc="${l.uid}" type="button"${l.qty>=mx?" disabled":""} aria-label="Add one ${esc(m.name)}">+</button></div></div>`}).join(""):`<div class="empty">Cart is empty. Add a product to start a sale.</div>`}
  <div class="total"><span>Total</span><b>${money(total)}</b></div>
  <label for="pm">Payment method</label><select id="pm">${PAYM.map(o=>`<option${o===state.payMethod?" selected":""}>${o}</option>`).join("")}</select>
  ${state.payMethod==="On credit"?creditForm():""}
  ${state.payMethod==="Cash"?`<label for="pr" class="gap">Cash received (optional)</label><input id="pr" type="number" min="0" inputmode="decimal" placeholder="Amount given by the customer" value="${esc(state.received)}"><p class="hint" id="chg" role="status">${chgText()}</p>`:""}
  <button class="btn btn-primary wide" id="pay" type="button"${state.cart.length?"":" disabled"}>${state.payMethod==="On credit"?"Complete credit sale":"Complete sale"}</button></section>
  <h2>Recent sales</h2>
  <p class="hint">Edit a price to correct a sale. The total updates.</p>
  <section class="card list">${state.sales.length?state.sales.map(s=>`<div class="sale"><div class="entry"><b>Sale #${s.id}, ${money(s.total)}</b>${saleBadge(s)}</div>${s.lines.map((l,i)=>`<div class="line"><label for="sp${s.id}-${i}">${l.qty} × ${esc(l.name)}, price each</label><input id="sp${s.id}-${i}" class="price" type="number" min="0" inputmode="decimal" value="${l.price}" data-sprice="${s.id}:${i}"></div>`).join("")}<small class="meta">${s.debt?"On credit to "+esc(s.debt.customer)+(saleOwed(s)>0?", owes "+money(saleOwed(s)):", fully paid"):"Paid by "+esc(s.method)}</small></div>`).join(""):`<div class="empty">No sales yet.</div>`}</section>`;
}
let DL=null;
if(window.claude&&window.claude.use)window.claude.use("downloads").then(d=>{DL=d;if(state.view==="rcpt"&&state.rcpt)render();}).catch(()=>{});
function receiptDoc(s){
  const f=state.facility;
  const rows=s.lines.map(l=>`<tr><td>${esc(l.name)}<br><small>${l.qty} × ${money(l.price)}</small></td><td class="r">${money(l.qty*l.price)}</td></tr>`).join("");
  const logo=`<img src="${esc(logoSrc())}" alt="" style="display:block;max-height:64px;max-width:70%;margin:0 auto 8px">`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Receipt #${s.id}</title><style>body{font:15px/1.5 system-ui,sans-serif;color:#000;background:#fff;max-width:380px;margin:24px auto;padding:0 16px}h1{font-size:20px;text-align:center;margin:0}p{text-align:center;margin:2px 0 14px;color:#444}table{width:100%;border-collapse:collapse}td{padding:6px 0;border-bottom:1px dashed #888;vertical-align:top}.r{text-align:right;white-space:nowrap}small{color:#444}.t td{font-weight:700;font-size:18px;border-bottom:0}button{display:block;margin:20px auto;padding:10px 20px;font:inherit;font-weight:600}@media print{button{display:none}}</style></head><body>${logo}<h1>${esc(f.name)}</h1><p>Pharmacy receipt${f.phone?"<br>Tel: "+esc(f.phone):""}</p><table><tr><td>Receipt no.</td><td class="r">#${s.id}</td></tr><tr><td>Date</td><td class="r">${esc(s.time)}</td></tr>${rows}<tr class="t"><td>Total</td><td class="r">${money(s.total)}</td></tr>${payRows(s,1)}${f.showChange&&s.paid!=null?`<tr><td>Cash received</td><td class="r">${money(s.paid)}</td></tr><tr><td>Change</td><td class="r">${money(s.change)}</td></tr>`:""}${f.showCashier&&s.cashier?`<tr><td>Served by</td><td class="r">${esc(s.cashier)}</td></tr>`:""}</table>${f.footer?`<p>${esc(f.footer)}</p>`:""}<button onclick="window.print()">Print receipt</button></body></html>`;
}
state.rdelAsk=false;state.rdelErr="";
function isAdmin(){const me=state.team.find(w=>w.id===state.user);return !!me&&me.role==="Admin";}
function rcpt(){
  const s=state.sales.find(x=>x.id===state.rcpt),f=state.facility;
  if(s)return `<h1>Receipt</h1>${msg()}<section class="card receipt"><img class="rlogo" src="${esc(logoSrc())}" alt=""><h2>${esc(f.name)}</h2><p class="c">Pharmacy receipt${f.phone?"<br>Tel: "+esc(f.phone):""}</p>
   <div class="rl"><span>Receipt no.</span><b>#${s.id}</b></div>
   <div class="rl"><span>Date</span><span>${esc(s.time)}</span></div>
   ${s.lines.map(l=>`<div class="rl"><span>${esc(l.name)}<small>${l.qty} × ${money(l.price)}</small></span><b>${money(l.qty*l.price)}</b></div>`).join("")}
   <div class="rtot"><span>Total</span><span>${money(s.total)}</span></div>
   ${payRows(s,0)}
   ${f.showChange&&s.paid!=null?`<div class="rl"><span>Cash received</span><span>${money(s.paid)}</span></div><div class="rl"><span>Change</span><span>${money(s.change)}</span></div>`:""}
   ${f.showCashier&&s.cashier?`<div class="rl"><span>Served by</span><span>${esc(s.cashier)}</span></div>`:""}
   ${f.footer?`<p class="c">${esc(f.footer)}</p>`:""}</section>
   <div class="acts"><button class="btn btn-secondary" id="rback" type="button">Back to receipts</button><button class="btn btn-secondary" id="rprint" type="button">Print receipt</button>${DL?`<button class="btn btn-primary" id="rsave" type="button">Save receipt</button>`:""}${isAdmin()?`<button class="btn btn-danger" data-rdelask="1" type="button">Delete this receipt\u2026</button>`:""}</div>
   ${isAdmin()&&state.rdelAsk?`<div class="dangerbox" role="alertdialog" aria-label="Confirm delete receipt"><p><b>This cannot be undone.</b> Receipt #${s.id} (${money(s.total)}) will be deleted for good, and sales totals will drop to match. The stock is not put back.</p><label for="rdelpin">Enter your PIN to confirm</label><input id="rdelpin" type="password" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="4-digit PIN">${state.rdelErr?`<p class="lerr" role="alert" style="display:block;margin:6px 0 0">${esc(state.rdelErr)}</p>`:""}<div class="acts left" style="padding-left:0;margin-top:10px"><button class="btn btn-danger" data-rdelgo="${s.id}" type="button">Delete permanently</button><button class="btn btn-secondary" data-rdelcancel="1" type="button">Cancel</button></div></div>`:""}`;
  const nd=state.sales.filter(x=>saleOwed(x)>0).length,rt=state.rcptTab==="debts"?"debts":"all";
  const tabs=`<div class="tabs" role="tablist">${[["all","All receipts"],["debts","Debts"+(nd?" ("+nd+")":"")]].map(([k,l])=>`<button class="btn ${rt===k?"btn-primary":"btn-secondary"}" role="tab" aria-selected="${rt===k}" data-rt="${k}" type="button">${l}</button>`).join("")}</div>`;
  if(rt==="debts")return `<h1>Receipts</h1>${msg()}${tabs}${debtsTab()}`;
  return `<h1>Receipts</h1>${msg()}${tabs}<section class="card list">${state.sales.length?state.sales.map(s=>`<div class="entry"><div><b>Receipt #${s.id}, ${money(s.total)}</b><small>${esc(s.time)}, ${esc(s.method)}</small></div><div>${saleBadge(s)} <button class="btn btn-secondary btn-sm" data-rview="${s.id}" type="button">View</button></div></div>`).join(""):`<div class="empty">No receipts yet. Complete a sale in POS to create one.</div>`}</section>`;
}
const VIEWS={dash:"Dashboard",inv:"Inventory",pos:"POS",rcpt:"Receipts",rx:"Prescriptions",team:"Team",facility:"Facility"};
const ROLES={Cashier:["pos","rcpt"],Pharmacist:["dash","inv","rx","rcpt"],"Stock clerk":["inv"],Admin:Object.keys(VIEWS)};
/* remembered choices: the add-worker form and the edit panel keep the role and access ticks across redraws */
state.wf={role:"Cashier",acc:[...ROLES.Cashier]};state.wedit=null;state.wef=null;
const allowed=v=>{const w=state.team.find(x=>x.id===(state.as||state.user));return !!w&&w.access.includes(v);};
function banner(){const w=state.team.find(x=>x.id===state.as);return `<div class="msg" role="status">Previewing as ${esc(w.name)} (${esc(w.role)}). <button class="btn btn-secondary btn-sm" id="exitprev" type="button">Exit preview</button></div>`;}
function home(){
  const tiles=Object.keys(VIEWS).filter(allowed).map(k=>`<button class="tile" data-go="${k}" type="button"><span class="tic" aria-hidden="true">${ICON(k)}</span><span>${VIEWS[k]}</span></button>`).join("");
  const nd=state.sales.filter(x=>saleOwed(x)>0).length;
  const debtTile=allowed("rcpt")?`<button class="tile" data-godebts="1" type="button" aria-label="Debts${nd?", "+nd+" owing":""}"><span class="tic" aria-hidden="true">${ICON("debt")}${nd?`<span class="tbadge">${nd}</span>`:""}</span><span>Debts</span>${nd?`<small class="tsub">${money(owedTotal())} owed</small>`:""}</button>`:"";
  return `<h1>Home</h1>${msg()}<div class="home">${tiles}${debtTile}</div>`;
}
function facility(){
  const tab=state.facTab==="balance"?"balance":"details";
  return `<h1>Facility</h1>${msg()}<div class="tabs" role="tablist">${[["details","Details"],["balance","Balance sheet"]].map(([k,l])=>`<button class="btn ${tab===k?"btn-primary":"btn-secondary"}" role="tab" aria-selected="${tab===k}" data-ft="${k}" type="button">${l}</button>`).join("")}</div>`+(tab==="balance"?balanceTab():facilityDetails());
}
function bsRow(label,val,o){o=o||{};return `<div class="bsr${o.t?" t":""}"><span>${label}${o.note?`<small>${o.note}</small>`:""}</span><b${val<0?' class="neg"':""}>${money(val)}</b></div>`;}
function balanceTab(){
  const S=state.sales,sales=S.reduce((a,x)=>a+x.total,0),collected=S.reduce((a,x)=>a+salePaid(x),0),owed=owedTotal(),cogs=S.reduce((a,x)=>a+saleCost(x),0);
  const exp=state.expenses.reduce((a,e)=>a+e.amt,0),rxc=state.rxCost,gross=sales-cogs,net=gross-exp-rxc;
  const cash=collected-exp,invGood=state.meds.filter(m=>m.exp>TODAY).reduce((a,m)=>a+m.qty*m.cost,0),invExp=state.meds.filter(m=>m.exp<=TODAY).reduce((a,m)=>a+m.qty*m.cost,0),inv=invGood+invExp;
  const retail=state.meds.filter(m=>m.exp>TODAY).reduce((a,m)=>a+m.qty*m.sell,0);
  const assets=cash+owed+inv,cap=assets-net,credit=S.filter(x=>x.debt).reduce((a,x)=>a+x.total,0);
  const byCat={};state.expenses.forEach(e=>{byCat[e.cat]=(byCat[e.cat]||0)+e.amt;});
  const exs=[...state.expenses].sort((a,b)=>a.date<b.date?1:a.date>b.date?-1:b.id-a.id);
  return `<p class="hint" style="margin-top:0">Everything to date: all sales, the stock on the shelves and the money spent. Stock is valued at what it cost you.</p>
  <section class="card panel"><h2>Assets (what the pharmacy has)</h2>
   ${bsRow("Money received",collected,{note:S.length+" sale"+(S.length===1?"":"s")+", "+money(sales)+" sold"+(credit?", "+money(credit)+" of it on credit":"")})}
   ${bsRow("Less expenses paid",-exp,{note:state.expenses.length+" expense"+(state.expenses.length===1?"":"s")})}
   ${bsRow("Cash, mobile money and card in hand",cash,{t:1})}
   ${bsRow("Owed by customers",owed,{note:"Credit sales not yet paid. See Receipts, then Debts."})}
   ${bsRow("Stock that can be sold, at cost",invGood,{note:"Worth "+money(retail)+" at selling prices"})}
   ${bsRow("Expired stock, at cost",invExp,{note:"Cannot be sold"})}
   ${bsRow("Total assets",assets,{t:1})}
  </section>
  <section class="card panel"><h2>Owner’s equity (what it is worth to the owner)</h2>
   ${bsRow("Sales",sales)}
   ${bsRow("Less cost of the stock sold",-cogs)}
   ${bsRow("Gross profit",gross,{t:1})}
   ${bsRow("Less expenses",-exp)}
   ${rxc?bsRow("Less medicine given out on prescription",-rxc,{note:"At cost. Prescriptions are not billed in this app."}):""}
   ${bsRow("Net profit",net,{t:1})}
   ${bsRow("Stock and capital put in",cap,{note:"Balancing figure: your opening stock and any stock or money added"})}
   ${bsRow("Total liabilities and equity",cap+net,{t:1})}
   <p class="hint" role="status" style="margin-bottom:0">${Math.round(assets)===Math.round(cap+net)?"&#10003; The sheet balances: total assets equal liabilities plus equity. No supplier debts are tracked, so liabilities are zero.":"The sheet does not balance."}</p>
  </section>
  <section class="card panel"><h2>Add an expense</h2>
   <div class="grid2"><div><label for="exd">Date</label><input id="exd" type="date" value="${TODAY}"></div><div><label for="exc">Type</label><select id="exc">${EXCATS.map(c=>`<option>${c}</option>`).join("")}</select></div></div>
   <label for="exn">What was it for?</label><input id="exn" autocomplete="off" maxlength="80" placeholder="e.g. Shop rent for November">
   <label for="exa" class="gap">Amount (UGX)</label><input id="exa" type="number" min="0" inputmode="decimal" placeholder="0">
   <button class="btn btn-primary wide gap" id="exadd" type="button">Add expense</button>
  </section>
  <section class="card panel"><h2>Expenses (${money(exp)})</h2>
   ${Object.keys(byCat).length?`<p class="hint" style="margin-top:0">${Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([c,v])=>esc(c)+" "+money(v)).join(" · ")}</p>`:""}
   ${exs.length?exs.map(e=>`<div class="entry"><div><b>${esc(e.desc)}</b><small>${esc(e.cat)}, ${esc(e.date)}${e.by?", "+esc(e.by):""}</small></div><div><b>${money(e.amt)}</b> <button class="btn btn-secondary btn-sm" data-exdel="${e.id}" type="button" aria-label="Delete expense ${esc(e.desc)}">Delete</button></div></div>`).join(""):`<div class="empty">No expenses yet.</div>`}
  </section>`;
}
function facilityDetails(){
  if(!state.draft)state.draft={...state.facility};
  const d=state.draft;
  return `<section class="card panel"><h2>Facility details</h2>
   <label for="fname">Facility name</label><input id="fname" value="${esc(d.name)}" autocomplete="off" maxlength="60" placeholder="e.g. Macro Medical Centre">
   <label class="gap" for="flogo">Logo</label>
   <div class="logobox"><img class="flogo" src="${esc(d.logo||CAPSULE)}" alt="Facility logo preview"></div>
   <input id="flogo" type="file" accept="image/*">
   <p class="hint">Use a square or wide image. It is resized for you and shown in the header, sign-in screen and receipts.</p>
   <div class="acts left" style="padding-left:0">${d.logo?`<button class="btn btn-secondary btn-sm" id="flogoclear" type="button">Use default capsule logo</button>`:""}</div>
   <label class="gap" for="fphone">Phone number on receipts</label><input id="fphone" value="${esc(d.phone||"")}" maxlength="30" inputmode="tel" autocomplete="off" placeholder="e.g. 0700 000 000">
   <label class="gap" for="ffooter">Receipt footer line</label><input id="ffooter" value="${esc(d.footer||"")}" maxlength="80" autocomplete="off" placeholder="e.g. Thank you. Get well soon.">
   <fieldset class="acc"><legend>Show on receipts</legend><label class="chk"><input type="checkbox" id="fshowcashier"${d.showCashier?" checked":""}> Cashier name</label><label class="chk"><input type="checkbox" id="fshowchange"${d.showChange?" checked":""}> Cash received and change</label></fieldset>
   <button class="btn btn-primary wide gap" id="fsave" type="button">Save facility details</button>
  </section>`;
}
function readLogo(file){
  return new Promise((res,rej)=>{
    const r=new FileReader();r.onerror=rej;
    r.onload=()=>{const im=new Image();im.onerror=rej;
      im.onload=()=>{const w=im.width||256,h=im.height||256,k=Math.min(1,256/Math.max(w,h)),c=document.createElement("canvas");c.width=Math.max(1,Math.round(w*k));c.height=Math.max(1,Math.round(h*k));c.getContext("2d").drawImage(im,0,0,c.width,c.height);res(c.toDataURL("image/png"));};
      im.src=r.result;};
    r.readAsDataURL(file);
  });
}
function themeTab(){
  const cur=document.documentElement.dataset.style||"classic";
  const info={classic:["Flat, clean and fast. The original look.","sw-classic"],skeuo:["Raised keys, inset fields and a textured surface, like a real device.","sw-skeuo"],glass:["Frosted translucent panels over a soft colour backdrop.","sw-glass"]};
  return `<section class="card panel"><h2>App style</h2>
  <p class="hint" style="margin-top:0">Pick how the whole app looks. It works with both light and dark mode and is remembered on this device.</p>
  ${Object.keys(STYLES).map(k=>`<div class="opt${k===cur?" on":""}"><div class="sw ${info[k][1]}" aria-hidden="true"><span></span></div><div class="optx"><b>${STYLES[k]}</b><small>${info[k][0]}</small></div><button class="btn ${k===cur?"btn-secondary":"btn-primary"} btn-sm" data-style="${k}" type="button"${k===cur?" disabled":""}>${k===cur?"In use":"Use"}</button></div>`).join("")}
  </section>`;
}
/* ---- CSV import (Team > Import) ---- */
state.imp={type:"meds",mode:"skip",hasHeader:true,file:"",raw:null,hdr:[],map:{},res:null};
const HMAP={name:["name","product","products","medicine","medicines","item","productname","medicinename","description","productdescription","drug","drugname"],unit:["unit","uom"],sell:["sell","sellprice","sellingprice","selling","price","unitprice","retail","retailprice","salesprice"],cost:["cost","costprice","buyprice","buyingprice","buying","purchaseprice"],qty:["quantity","qty","stock","instock","onhand","qtyonhand"],exp:["expiry","expirydate","exp","expirationdate","expiration","expires","bestbefore"],min:["reorder","reorderlevel","reorderat","minimum","min","minstock"]};
function parseCSV(t){
  if(t.charCodeAt(0)===0xFEFF)t=t.slice(1);
  const first=t.split(/\r?\n/,1)[0],cnt=c=>first.split(c).length-1;
  const d=[",",";","\t"].sort((a,b)=>cnt(b)-cnt(a))[0],rows=[];let row=[],f="",q=false;
  for(let i=0;i<t.length;i++){const c=t[i];
    if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++;}else q=false;}else f+=c;}
    else if(c==='"')q=true;
    else if(c===d){row.push(f);f="";}
    else if(c==="\n"||c==="\r"){if(c==="\r"&&t[i+1]==="\n")i++;row.push(f);f="";rows.push(row);row=[];}
    else f+=c;}
  if(f!==""||row.length){row.push(f);rows.push(row);}
  return rows.filter(r=>r.some(x=>x.trim()!==""));
}
const num=v=>{const x=String(v).replace(/ugx|,|\s/gi,"");return x===""?null:(isNaN(+x)?NaN:+x);};
function parseDate(v){
  v=v.trim();let y,m,d,x;const pad=n=>String(n).padStart(2,"0");
  if(x=v.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/)){y=+x[1];m=+x[2];d=+x[3];}
  else if(x=v.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/)){d=+x[1];m=+x[2];y=+x[3];}
  else return null;
  const dt=new Date(y,m-1,d);
  if(dt.getFullYear()!==y||dt.getMonth()!==m-1||dt.getDate()!==d)return null;
  return y+"-"+pad(m)+"-"+pad(d);
}
const FIELDS={meds:[["name","Name",1],["unit","Unit",0],["sell","Sell price",1],["min","Reorder level",0]],stock:[["name","Name",1],["qty","Quantity",1],["cost","Cost price",0],["sell","Selling price",0],["exp","Expiry date",1]]};
function guessMap(hdr,type){
  const h=hdr.map(x=>String(x).toLowerCase().replace(/[^a-z0-9]/g,"")),m={},used=new Set();
  FIELDS[type].forEach(([k])=>{const i=h.findIndex((x,ix)=>!used.has(ix)&&HMAP[k].includes(x));m[k]=i;if(i>=0)used.add(i);});
  FIELDS[type].forEach(([k])=>{if(m[k]>=0)return;const i=h.findIndex((x,ix)=>!used.has(ix)&&x&&HMAP[k].some(a=>a.length>=3&&x.includes(a)));m[k]=i;if(i>=0)used.add(i);});
  return m;
}
function importRecalc(){
  const im=state.imp;if(!im.raw){im.res=null;return;}
  const width=Math.max(...im.raw.map(r=>r.length));
  im.hdr=im.hasHeader?im.raw[0].concat(Array(Math.max(0,width-im.raw[0].length)).fill("")).map((h,i)=>String(h).trim()||"Column "+(i+1)):Array.from({length:width},(_,i)=>"Column "+(i+1));
  const body=im.hasHeader?im.raw.slice(1):im.raw;
  if(!body.length){im.res={fatal:"The file has no data rows."};return;}
  if(body.length>20000){im.res={fatal:"The file has more than 20,000 rows. Split it into smaller files."};return;}
  const miss=FIELDS[im.type].filter(([k,,req])=>req&&!(im.map[k]>=0));
  if(miss.length){im.res={missing:miss.map(x=>x[1]),total:body.length};return;}
  im.res=importParse(body,im.map,im.type,im.hasHeader?2:1);
}
function importParse(body,map,type,firstLine){
  const out=[],errs=[],seen=new Map();
  body.forEach((r,idx)=>{
    const line=idx+firstLine,g=k=>map[k]>=0&&r[map[k]]!=null?String(r[map[k]]).trim():"",bad=m=>errs.push({line,msg:m});
    const name=g("name").replace(/\s+/g," ");
    if(!name)return bad("Name is empty.");
    if(name.length>120)return bad("Name is longer than 120 characters.");
    if(type==="meds"){
      const sell=num(g("sell"));if(sell===null||isNaN(sell)||sell<0)return bad("Sell price must be a number, 0 or more.");
      const unit=g("unit");if(unit.length>30)return bad("Unit is longer than 30 characters.");
      const mn=g("min")===""?null:num(g("min"));if(mn!==null&&(isNaN(mn)||mn<0))return bad("Reorder level must be a number, 0 or more.");
      const k=keyOf(name);if(seen.has(k))return bad("Repeats “"+name+"” from row "+seen.get(k)+".");seen.set(k,line);
      out.push({line,name,unit,sell,min:mn===null?null:Math.round(mn)});
    }else{
      const qty=num(g("qty"));if(qty===null||isNaN(qty)||!(qty>0)||!Number.isInteger(qty))return bad("Quantity must be a whole number above 0.");
      const exp=parseDate(g("exp"));if(!exp)return bad("Expiry date not understood. Use YYYY-MM-DD or DD/MM/YYYY.");
      const cost=g("cost")===""?null:num(g("cost")),sell=g("sell")===""?null:num(g("sell"));
      if(cost!==null&&(isNaN(cost)||cost<0))return bad("Cost price must be a number, 0 or more.");
      if(sell!==null&&(isNaN(sell)||sell<0))return bad("Selling price must be a number, 0 or more.");
      out.push({line,name,qty,cost,sell,exp});
    }
  });
  return {rows:out,errs,total:body.length};
}
function importMeds(rows,mode){
  let added=0,updated=0,skipped=0;
  rows.forEach(r=>{
    const c=catOf(r.name);
    if(!c){state.catalog.push({id:state.nextCat++,name:r.name,unit:r.unit,price:r.sell,min:r.min===null?10:r.min});added++;}
    else if(mode==="update"){
      if(r.unit)c.unit=r.unit;if(r.min!==null)c.min=r.min;
      if(r.sell!==c.price){state.meds.forEach(m=>{if(keyOf(m.name)===keyOf(c.name))m.sell=r.sell;});c.price=r.sell;}
      updated++;
    }else skipped++;
  });
  return {added,updated,skipped};
}
function importStock(rows){
  let batchesNew=0,merged=0,products=0;
  rows.forEach(r=>{
    let cat=catOf(r.name),name=cat?cat.name:r.name;
    const prev=cat?batchesOf(name).slice(-1)[0]:null,sellIn=r.sell!==null?r.sell:(cat?cat.price:0);
    if(!cat){state.catalog.push(cat={id:state.nextCat++,name,unit:"",price:sellIn,min:10});products++;}
    const ex=state.meds.find(m=>keyOf(m.name)===keyOf(name)&&m.exp===r.exp);
    if(ex){ex.qty+=r.qty;if(r.cost!==null)ex.cost=r.cost;if(r.sell!==null)ex.sell=r.sell;merged++;}
    else{state.meds.push({id:state.nextMed++,name,qty:r.qty,min:cat.min,cost:r.cost!==null?r.cost:(prev?prev.cost:0),sell:sellIn,exp:r.exp});batchesNew++;}
  });
  return {batchesNew,merged,products};
}
function downloadText(name,text){
  const b=new Blob(["﻿"+text],{type:"text/csv;charset=utf-8"}),a=document.createElement("a");
  a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
const TPL={meds:["medicines-template.csv","name,unit,sell price,reorder level\nParacetamol 500 mg,Tablet,500,20\nAmoxicillin 500 mg,Capsule,800,40\n"],stock:["inventory-template.csv","name,quantity,cost price,selling price,expiry date\nParacetamol 500 mg,100,300,500,2027-12-31\nAmoxicillin 500 mg,60,500,800,2027-06-30\n"]};
function importTab(){
  const im=state.imp,res=im.res,isM=im.type==="meds",F=FIELDS[im.type];
  let out=`<section class="card panel"><h2>Import from CSV</h2>
   <p class="hint" style="margin-top:0">Add many medicines or stock batches at once. Choose your CSV file, then match its columns to the ones in the system. Only CSV files (.csv) are accepted. In Excel use Save As, then CSV.</p>
   <label for="imptype">What are you importing?</label><select id="imptype"><option value="meds"${isM?" selected":""}>Medicines (the medicine list)</option><option value="stock"${isM?"":" selected"}>Inventory (stock batches)</option></select>
   <label class="gap" for="impfile">CSV file</label><input id="impfile" type="file" accept=".csv,text/csv">
   ${im.raw?`<p class="hint">Chosen file: <b>${esc(im.file)}</b></p>`:""}
   <div class="acts left" style="padding-left:0"><button class="btn btn-secondary btn-sm" data-tpl="${im.type}" type="button">Download a template</button></div>
  </section>`;
  if(im.raw){
    const body=im.hasHeader?im.raw.slice(1):im.raw,first=body[0]||[];
    const opts=sel=>`<option value="-1"${sel<0?" selected":""}>Not in my file</option>`+im.hdr.map((h,i)=>{const ex=String(first[i]==null?"":first[i]).trim();return `<option value="${i}"${sel===i?" selected":""}>${esc(h)}${ex?" (e.g. "+esc(ex.length>24?ex.slice(0,24)+"…":ex)+")":""}</option>`;}).join("");
    out+=`<section class="card panel"><h2>Match your columns</h2>
     <p class="hint" style="margin-top:0">For each item in the system, choose the column in your file that holds it. Items marked * are required. The best match is already picked for you.</p>
     <label class="chk" style="margin-bottom:10px"><input type="checkbox" id="imphdr"${im.hasHeader?" checked":""}> First row has the column names</label>
     ${F.map(([k,l,req])=>`<label for="map-${k}" class="gap">${l}${req?" *":""}</label><select id="map-${k}" data-map="${k}">${opts(im.map[k]==null?-1:im.map[k])}</select>`).join("")}
     ${isM?`<label for="impmode" class="gap">If a medicine is already in the list</label><select id="impmode"><option value="skip"${im.mode==="skip"?" selected":""}>Skip it (keep what is there)</option><option value="update"${im.mode==="update"?" selected":""}>Update its unit, price and reorder level</option></select>`:`<p class="hint">Stock with the same name and expiry date joins the same batch. A new name is also added to the medicine list. Dates can be YYYY-MM-DD or DD/MM/YYYY.</p>`}
    </section>`;
  }
  if(res&&res.fatal)out+=`<div class="msg err" role="alert">${esc(im.file)}: ${esc(res.fatal)}</div>`;
  else if(res&&res.missing)out+=`<div class="msg err" role="alert">Choose a column for: ${res.missing.map(esc).join(", ")}.</div>`;
  else if(res){
    const ok=res.rows.length,bad=res.errs.length;
    let sum;
    if(isM){const ex=res.rows.filter(r=>catOf(r.name)).length;sum=`${ok-ex} new, ${ex} already in the list (${im.mode==="update"?"will be updated":"will be skipped"})`;}
    else{const np=new Set(res.rows.filter(r=>!catOf(r.name)).map(r=>keyOf(r.name))).size;sum=`${ok} batch row${ok===1?"":"s"}${np?", "+np+" new product"+(np===1?"":"s")+" for the medicine list":""}`;}
    out+=`<section class="card panel"><h2>Preview</h2>
     <p class="hint" style="margin-top:0">${res.total} row${res.total===1?"":"s"} read. <b>${ok}</b> ready to import (${sum}). <b>${bad}</b> with problems${bad?" will be skipped":""}.</p>
     ${ok?`<div class="wrap"><table><thead><tr>${isM?"<th>Name</th><th>Unit</th><th>Sell price</th><th>Reorder at</th>":"<th>Name</th><th>Quantity</th><th>Cost price</th><th>Selling price</th><th>Expiry date</th>"}</tr></thead><tbody>${res.rows.slice(0,8).map(r=>isM?`<tr><td>${esc(r.name)}</td><td>${esc(r.unit||"—")}</td><td>${money(r.sell)}</td><td>${r.min===null?"—":r.min}</td></tr>`:`<tr><td>${esc(r.name)}</td><td>${r.qty}</td><td>${r.cost===null?"—":money(r.cost)}</td><td>${r.sell===null?"—":money(r.sell)}</td><td>${r.exp}</td></tr>`).join("")}</tbody></table></div>${ok>8?`<p class="hint">Showing the first 8 of ${ok}.</p>`:""}`:""}
     ${bad?`<h2 style="margin-top:16px">Problems</h2><ul class="errl">${res.errs.slice(0,20).map(e=>`<li>Row ${e.line}: ${esc(e.msg)}</li>`).join("")}</ul>${bad>20?`<p class="hint">And ${bad-20} more.</p>`:""}`:""}
     <div class="acts left" style="padding-left:0;margin-top:12px"><button class="btn btn-primary" data-impgo="1" type="button"${ok?"":" disabled"}>Import ${ok} row${ok===1?"":"s"}</button><button class="btn btn-secondary" data-impclear="1" type="button">Clear</button></div>
    </section>`;
  }
  return out;
}
/* ---- Team > Data: delete receipts / inventory ---- */
state.delRc={scope:"all",from:"",to:""};state.delInv={scope:"all"};state.delAsk=null;state.delErr="";
const csvCell=v=>{let x=String(v==null?"":v);if(/^[=+\-@\t\r]/.test(x)&&isNaN(+x))x="'"+x;return /[",\r\n]/.test(x)?'"'+x.replace(/"/g,'""')+'"':x;};
const csvRow=a=>a.map(csvCell).join(",");
function rcptMatches(){
  const d=state.delRc;if(d.scope==="all")return state.sales;
  const a=d.from?+new Date(d.from+"T00:00:00"):-Infinity,b=d.to?+addDays(new Date(d.to+"T00:00:00"),1):Infinity;
  return state.sales.filter(x=>x.ts>=a&&x.ts<b);
}
function invMatches(){
  const sc=state.delInv.scope;
  return sc==="soldout"?state.meds.filter(m=>m.qty<=0):sc==="expired"?state.meds.filter(m=>m.exp<=TODAY):state.meds;
}
const INV_SCOPES=[["all","All stock (the medicine list is kept)"],["soldout","Sold-out batches only"],["expired","Expired batches only"],["everything","Everything: all stock and the medicine list"]];
function applyDelete(kind){
  if(kind==="rcpt"){const ids=new Set(rcptMatches().map(x=>x.id));state.sales=state.sales.filter(x=>!ids.has(x.id));state.rcpt=null;return ids.size;}
  const n=invMatches().length,sc=state.delInv.scope,gone=new Set(invMatches());
  state.meds=state.meds.filter(m=>!gone.has(m));
  const cn=state.catalog.length;
  if(sc==="everything")state.catalog=[];
  state.cart=state.cart.filter(l=>sellable(l.name)>0);
  state.cart.forEach(l=>{l.qty=Math.min(l.qty,lineMax(l));});
  return n;
}
function dataTab(){
  const rm=rcptMatches(),im=invMatches(),d=state.delRc,ask=state.delAsk;
  const rn=rm.length,inn=im.length,ev=state.delInv.scope==="everything",cn=state.catalog.length;
  const confirmBox=(kind,text)=>ask!==kind?"":`<div class="dangerbox" role="alertdialog" aria-label="Confirm delete">
    <p><b>This cannot be undone.</b> ${text}</p>
    <label for="delpin">Enter your PIN to confirm</label>
    <input id="delpin" type="password" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="4-digit PIN">
    ${state.delErr?`<p class="lerr" role="alert" style="display:block;margin:6px 0 0">${esc(state.delErr)}</p>`:""}
    <div class="acts left" style="padding-left:0;margin-top:10px"><button class="btn btn-danger" data-delgo="${kind}" type="button">Delete permanently</button><button class="btn btn-secondary" data-delcancel="1" type="button">Cancel</button></div></div>`;
  return `<section class="card panel"><h2>Receipts</h2>
   <p class="hint" style="margin-top:0">Delete sales history. Deleting a receipt does not put the stock back.</p>
   <label for="delrscope">Which receipts?</label><select id="delrscope"><option value="all"${d.scope==="all"?" selected":""}>All receipts</option><option value="range"${d.scope==="range"?" selected":""}>Receipts in a date range</option></select>
   ${d.scope==="range"?`<div class="grid2" style="margin-top:8px"><div><label for="delrf">From</label><input id="delrf" type="date" value="${esc(d.from)}"></div><div><label for="delrt">To</label><input id="delrt" type="date" value="${esc(d.to)}"></div></div>`:""}
   <p class="hint"><b>${rn}</b> receipt${rn===1?"":"s"} match${rn===1?"es":""}${d.scope==="range"&&!d.from&&!d.to?". Choose at least one date.":"."}</p>
   <div class="acts left" style="padding-left:0"><button class="btn btn-secondary btn-sm" data-dlrcpt="1" type="button">Download a copy of all receipts (CSV)</button><button class="btn btn-danger btn-sm" data-delask="rcpt" type="button"${rn&&!(d.scope==="range"&&!d.from&&!d.to)?"":" disabled"}>Delete ${rn} receipt${rn===1?"":"s"}…</button></div>
   ${confirmBox("rcpt","You are about to delete <b>"+rn+" receipt"+(rn===1?"":"s")+"</b>. Sales totals on the dashboard will drop to match.")}
  </section>
  <section class="card panel"><h2>Inventory</h2>
   <p class="hint" style="margin-top:0">Delete stock batches. Medicine names and prices stay unless you choose Everything.</p>
   <label for="delisc">What to delete?</label><select id="delisc">${INV_SCOPES.map(([k,l])=>`<option value="${k}"${state.delInv.scope===k?" selected":""}>${l}</option>`).join("")}</select>
   <p class="hint"><b>${inn}</b> stock batch${inn===1?"":"es"} match${inn===1?"es":""}${ev?", and <b>"+cn+"</b> medicine"+(cn===1?"":"s")+" in the medicine list":""}.</p>
   <div class="acts left" style="padding-left:0"><button class="btn btn-secondary btn-sm" data-dlinv="1" type="button">Download a copy of all stock (CSV)</button><button class="btn btn-danger btn-sm" data-delask="inv" type="button"${inn||(ev&&cn)?"":" disabled"}>Delete ${inn} batch${inn===1?"":"es"}${ev?" and the medicine list":""}…</button></div>
   ${confirmBox("inv","You are about to delete <b>"+inn+" stock batch"+(inn===1?"":"es")+"</b>"+(ev?" and <b>the whole medicine list</b>":"")+". Items in the sales cart that run out are removed from it.")}
  </section>`;
}
function team(){
  const tab=["theme","import","data"].includes(state.teamTab)?state.teamTab:"workers";
  return `<h1>Team</h1>${msg()}<div class="tabs" role="tablist">${[["workers","Workers"],["theme","Theme"],["import","Import"],["data","Data"]].map(([k,l])=>`<button class="btn ${tab===k?"btn-primary":"btn-secondary"}" role="tab" aria-selected="${tab===k}" data-tt="${k}" type="button">${l}</button>`).join("")}</div>`+(tab==="theme"?themeTab():tab==="import"?importTab():tab==="data"?dataTab():workersTab());
}
function payCustomer(key,amt,meth){
  let left=amt,cleared=0;const by=(state.team.find(w=>w.id===state.user)||{}).name||"";
  state.sales.filter(x=>x.debt&&saleOwed(x)>0&&keyOf(x.debt.customer)===key).sort((a,b)=>a.ts-b.ts).forEach(x=>{
    if(left<=0)return;const t=Math.min(saleOwed(x),left);
    x.debt.pays.push({amt:t,method:meth,time:new Date().toLocaleString("en-GB"),ts:Date.now(),by});left-=t;if(saleOwed(x)<=0)cleared++;});
  return cleared;
}
function debtsTab(){
  const ds=state.sales.filter(x=>saleOwed(x)>0).sort((a,b)=>keyOf(a.debt.customer)<keyOf(b.debt.customer)?-1:keyOf(a.debt.customer)>keyOf(b.debt.customer)?1:a.ts-b.ts),dm=debtors(),tot=ds.reduce((a,x)=>a+saleOwed(x),0),people=new Set(ds.map(x=>keyOf(x.debt.customer))).size;
  return `<div class="stats3"><div class="card stat"><b>${money(tot)}</b><span>Total owed</span></div><div class="card stat"><b>${people}</b><span>Customer${people===1?"":"s"} owing</span></div></div>
  <p class="hint" style="margin-top:0">Customers who took products on credit. When a debt is paid in full it is removed from this list.</p>
  <section class="card list">${ds.length?ds.map((x,i)=>{const o=saleOwed(x),late=x.debt.due&&x.debt.due<TODAY,ck=keyOf(x.debt.customer),cd=dm.get(ck),first=i===0||keyOf(ds[i-1].debt.customer)!==ck;
   const custBox=first&&cd.n>1?`<div class="cpbox" data-ckey="${esc(ck)}"><b>Pay all debts for ${esc(cd.name)}</b><small>Owes ${money(cd.owed)} across ${cd.n} sales.</small><div class="grid2" style="margin:10px 0"><div><label>Amount paid</label><input type="number" min="0" inputmode="decimal" placeholder="${cd.owed}" aria-label="Amount paid by ${esc(cd.name)}"></div><div><label>Paid by</label><select aria-label="Payment method">${["Cash","Mobile money","Card"].map(m=>`<option>${m}</option>`).join("")}</select></div></div><div class="acts left" style="padding-left:0"><button class="btn btn-primary btn-sm" data-cpay="1" type="button">Pay this amount</button><button class="btn btn-secondary btn-sm" data-cfull="1" type="button">Pay everything (${money(cd.owed)})</button></div></div>`:"";
   return custBox+`<div class="sale debt"><div class="entry"><div><b>${esc(x.debt.customer)}</b><small>${x.debt.phone?esc(x.debt.phone)+", ":""}Receipt #${x.id}, ${esc(x.time)}</small>${dm.get(keyOf(x.debt.customer)).n>1?`<small><b>Owes ${money(dm.get(keyOf(x.debt.customer)).owed)} in total</b> (${dm.get(keyOf(x.debt.customer)).n} sales)</small>`:""}</div>${late?badge("danger","&#9888;","Overdue"):badge("warning","&#9888;","Owing")}</div>
    <div class="line"><span>Items</span><span>${x.lines.map(l=>l.qty+" × "+esc(l.name)).join(", ")}</span></div>
    <div class="line"><span>Total</span><span>${money(x.total)}</span></div>
    <div class="line"><span>Paid so far</span><span>${money(salePaid(x))}</span></div>
    <div class="line"><b>Balance owed</b><b>${money(o)}</b></div>
    ${x.debt.due?`<div class="line"><span>Promised to pay by</span><span>${esc(x.debt.due)}</span></div>`:""}
    ${x.debt.pays.map(p=>`<small class="meta">Paid ${money(p.amt)} by ${esc(p.method)}, ${esc(p.time)}</small>`).join("")}
    <div class="grid2" style="margin:10px 16px 0"><div><label for="dpa${x.id}">Amount paid now</label><input id="dpa${x.id}" type="number" min="0" inputmode="decimal" placeholder="${o}"></div><div><label for="dpm${x.id}">Paid by</label><select id="dpm${x.id}">${["Cash","Mobile money","Card"].map(m=>`<option>${m}</option>`).join("")}</select></div></div>
    <div class="acts left"><button class="btn btn-primary btn-sm" data-dpay="${x.id}" type="button">Record payment</button><button class="btn btn-secondary btn-sm" data-dfull="${x.id}" type="button">Paid in full (${money(o)})</button><button class="btn btn-secondary btn-sm" data-rview="${x.id}" type="button">View receipt</button></div></div>`;}).join(""):`<div class="empty">No debts. Everyone has paid.</div>`}</section>`;
}
/* change a worker's role and access (administrators only; the owner and yourself are not editable) */
function editBox(w){
  const f=state.wef;
  return `<div class="cpbox"><label for="erole">Role</label><select id="erole">${Object.keys(ROLES).map(r=>`<option${f.role===r?" selected":""}>${r}</option>`).join("")}</select>
   <fieldset class="acc"><legend>What this worker can access</legend>${Object.keys(VIEWS).map(k=>`<label class="chk"><input type="checkbox" data-eacc="${k}"${f.acc.includes(k)?" checked":""}> ${VIEWS[k]}</label>`).join("")}</fieldset>
   <div class="acts left" style="padding-left:0"><button class="btn btn-primary btn-sm" data-wsave="${w.id}" type="button">Save changes</button><button class="btn btn-secondary btn-sm" data-wcancel="1" type="button">Cancel</button></div></div>`;
}
function workersTab(){
  const free=[];for(let i=1;i<=state.slots;i++)if(!state.team.some(w=>w.slot===i))free.push(i);
  return `
  <div class="stats3"><div class="card stat"><b>${state.team.length} of ${state.slots}</b><span>Slots in use</span></div><div class="card stat"><b>${free.length}</b><span>Slots free</span></div></div>
  <section class="card panel"><h2>Add a worker</h2>
   <label for="wn">Full name</label><input id="wn" autocomplete="off" placeholder="e.g. Macro Trades">
   <label for="wpin">PIN (4 digits)</label><input id="wpin" type="password" inputmode="numeric" maxlength="4" autocomplete="new-password" placeholder="4-digit PIN">
   <label for="wrole" class="gap">Role</label><select id="wrole">${Object.keys(ROLES).map(r=>`<option${state.wf.role===r?" selected":""}>${r}</option>`).join("")}</select>
   <fieldset class="acc"><legend>What this worker can access</legend>${Object.keys(VIEWS).map(k=>`<label class="chk"><input type="checkbox" data-acc="${k}"${state.wf.acc.includes(k)?" checked":""}> ${VIEWS[k]}</label>`).join("")}</fieldset>
   <label for="wslot">Slot</label><select id="wslot">${free.map(i=>`<option value="${i}">Slot ${i}</option>`).join("")}</select>
   <button class="btn btn-primary wide gap" id="addWorker" type="button"${free.length?"":" disabled"}>Assign slot</button>
   ${free.length?"":`<p class="hint">All slots are in use. Remove a worker to free a slot.</p>`}
  </section>
  <h2>Workers</h2>
  <section class="card list">${state.team.map(w=>`<div class="wk"><div class="entry"><div><b>${esc(w.name)}</b><small>${esc(w.role)}, Slot ${w.slot}</small></div>${badge("success","&#10003;","Active")}</div><div class="line"><span>${w.access.map(k=>VIEWS[k]).join(", ")}</span></div><div class="acts left"><button class="btn btn-secondary btn-sm" data-prev="${w.id}" type="button">Preview access</button>${w.owner||w.id===state.user?"":`<button class="btn btn-secondary btn-sm" data-wedit="${w.id}" type="button">Edit</button><button class="btn btn-secondary btn-sm" data-rmw="${w.id}" type="button">Remove</button>`}</div>${state.wedit===w.id&&state.wef?editBox(w):""}</div>`).join("")}</section>`;
}
function rx(){
  return `<h1>Prescriptions</h1>${msg()}
  <section class="card panel"><h2>New prescription</h2>
  <div class="form">
   <div><label for="rp">Patient name</label><input id="rp" placeholder="Full name"></div>
   <div><label for="rm">Medicine</label><select id="rm">${products().map(n=>{const m=batches(n)[0]||batchesOf(n)[0];return `<option value="${m.id}">${esc(n)}</option>`;}).join("")}</select></div>
   <div><label for="rq">Quantity</label><input id="rq" type="number" min="1" value="10"></div>
   <button class="btn btn-primary" id="addRx" type="button">Save as draft</button>
  </div></section>
  <section class="card panel"><h2>Queue</h2>
  <div class="wrap"><table><thead><tr><th>Patient</th><th>Medicine</th><th>Qty</th><th>Status</th><th></th></tr></thead><tbody>
  ${state.rx.map(r=>{return `<tr><td>${esc(r.patient)}</td><td>${esc(r.drug||"(deleted item)")}</td><td>${r.qty}</td><td>${rxBadge(r.status)}</td><td>${r.status==="Draft"?`<button class="btn btn-secondary btn-sm" data-adv="${r.id}" type="button">Send to pharmacist</button>`:r.status==="Pending"?`<button class="btn btn-primary btn-sm" data-adv="${r.id}" type="button">Dispense</button>`:""}</td></tr>`}).join("")}
  </tbody></table></div></section>`;
}
function msg(){return state.msg?`<div class="msg ${state.msg.err?"err":""}" role="status">${esc(state.msg.t)}</div>`:"";}

function render(){
  if(cloud)cloud.syncStore(); /* save any change to stock or sales */
  applyFacility();
  const lg=document.getElementById("login");
  if(!state.user){document.getElementById("main").innerHTML="";lg.classList.remove("out");return;}
  lg.classList.add("out");
  document.querySelectorAll(".nav button").forEach(b=>b.toggleAttribute("aria-current",b.dataset.v===state.view)||0);
  document.querySelectorAll(".nav button").forEach(b=>{b.hidden=!allowed(b.dataset.v);if(b.dataset.v===state.view)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");});
  if(state.view==="home"&&!isMobile())state.view=Object.keys(VIEWS).find(allowed)||"dash";
  const back=isMobile()&&state.view!=="home"?`<button class="btn btn-secondary back" id="backhome" type="button">&larr; Home</button>`:"";
  document.getElementById("main").innerHTML=(state.as?banner():"")+back+({home,dash,inv,pos,rcpt,rx,team,facility})[state.view]();
  const s=document.getElementById("search");
  if(s)s.oninput=e=>{state.q=e.target.value;document.getElementById("mrows").innerHTML=mrows();};
  const fnI=document.getElementById("fn");
  if(fnI){const dd=document.getElementById("dd");
    const show=()=>{const q=fnI.value.trim(),k=keyOf(q);if(!q){dd.hidden=true;fnI.setAttribute("aria-expanded","false");return;}
      const m=state.catalog.filter(c=>keyOf(c.name).includes(k)).sort((x,y)=>(keyOf(y.name).startsWith(k)-keyOf(x.name).startsWith(k))||(keyOf(x.name)<keyOf(y.name)?-1:1)).slice(0,8);
      const exact=state.catalog.some(c=>keyOf(c.name)===k);
      dd.innerHTML=m.map(c=>`<button type="button" data-pick="${c.id}"><span>${esc(c.name)}</span><span>${money(c.price)}</span></button>`).join("")+(exact?"":`<button type="button" class="new" data-newprod="1">+ Insert new product: ${esc(q)}</button>`);
      dd.hidden=false;fnI.setAttribute("aria-expanded","true");};
    fnI.oninput=show;fnI.onfocus=show;fnI.onblur=()=>{dd.hidden=true;fnI.setAttribute("aria-expanded","false");};
    fnI.onkeydown=e=>{if(e.key==="Escape")dd.hidden=true;else if(e.key==="Enter"&&!dd.hidden){const b=dd.querySelector("button");if(b){e.preventDefault();b.click();}}};
    dd.onmousedown=e=>e.preventDefault();}
      const cnI=document.getElementById("cn");
  if(cnI){const dd=document.getElementById("cdd"),note=document.getElementById("cnote");
    const show=()=>{const k=keyOf(cnI.value);if(note)note.textContent=custNote();
      const m=[...debtors().entries()].filter(([key])=>!k||key.includes(k)).sort((a,b)=>(b[0].startsWith(k)-a[0].startsWith(k))||(a[0]<b[0]?-1:1)).slice(0,8);
      dd.innerHTML=m.map(([key,d])=>`<button type="button" data-cust="${esc(key)}"><span>${esc(d.name)}${d.phone?" · "+esc(d.phone):""}</span><span>owes ${money(d.owed)}</span></button>`).join("");
      const open=m.length>0&&!(m.length===1&&m[0][0]===k);dd.hidden=!open;cnI.setAttribute("aria-expanded",open?"true":"false");};
    cnI.oninput=show;cnI.onfocus=show;cnI.onblur=()=>{dd.hidden=true;cnI.setAttribute("aria-expanded","false");};
    cnI.onkeydown=e=>{if(e.key==="Escape")dd.hidden=true;else if(e.key==="Enter"&&!dd.hidden){const b=dd.querySelector("button");if(b){e.preventDefault();b.click();}}};
    dd.onmousedown=e=>e.preventDefault();}
  const ps=document.getElementById("psearch");
  if(ps){const dd=document.getElementById("pdd");
    const show=()=>{state.pq=ps.value;const h=prows();dd.innerHTML=h;dd.hidden=!h;ps.setAttribute("aria-expanded",h?"true":"false");};
    const hide=e=>{if(e&&e.relatedTarget&&dd.contains(e.relatedTarget))return;dd.hidden=true;ps.setAttribute("aria-expanded","false");};
    ps.oninput=show;ps.onfocus=()=>{if(ps.value.trim())show();};ps.onblur=hide;dd.onfocusout=e=>{if(e.relatedTarget!==ps)hide(e);};
    dd.onmousedown=e=>e.preventDefault();
    ps.onkeydown=e=>{
      if(e.key==="Escape"){dd.hidden=true;}
      else if(e.key==="Enter"&&!dd.hidden){const b=dd.querySelector("button");if(b){e.preventDefault();b.click();}}
      else if(e.key==="ArrowDown"&&!dd.hidden){const b=dd.querySelector("button");if(b){e.preventDefault();b.focus();}}
    };
    dd.onkeydown=e=>{
      const bs=[...dd.querySelectorAll("button")],i=bs.indexOf(document.activeElement);
      if(e.key==="ArrowDown"){e.preventDefault();(bs[i+1]||bs[0]).focus();}
      else if(e.key==="ArrowUp"){e.preventDefault();(i<=0?ps:bs[i-1]).focus();}
      else if(e.key==="Escape"){dd.hidden=true;ps.focus();}
    };
  }
}
function go(v){
  if(isMobile()&&v!=="home"&&state.view==="home")try{history.pushState({v},"",location.pathname+location.search+"#"+v);}catch(e){}
  state.view=v;state.msg=null;state.rcpt=null;state.draft=null;state.teamTab="workers";state.facTab="details";state.rcptTab="all";state.bdelAsk=null;state.wedit=null;render();window.scrollTo(0,0);
}
window.addEventListener("popstate",()=>{if(!state.user)return;state.msg=null;state.rcpt=null;state.draft=null;if(isMobile())state.view="home";render();});
if(MQ.addEventListener)MQ.addEventListener("change",()=>render());
document.querySelectorAll(".nav button").forEach(b=>b.onclick=()=>go(b.dataset.v));

document.getElementById("main").addEventListener("input",e=>{const i=e.target.id,d=state.draft;
  if(d){if(i==="fname")d.name=e.target.value;else if(i==="fphone")d.phone=e.target.value;else if(i==="ffooter")d.footer=e.target.value;}
  if(i==="cn")state.cust.name=e.target.value;else if(i==="cph")state.cust.phone=e.target.value;else if(i==="cdue")state.cust.due=e.target.value;
  else if(i==="cd"){state.cust.dep=e.target.value;const cb=document.getElementById("cbal");if(cb)cb.textContent=credText();}
  if(i==="pr"){state.received=e.target.value;const c=document.getElementById("chg");if(c)c.textContent=chgText();}
  if(e.target.dataset.cqty){
    const l=state.cart.find(x=>x.uid===+e.target.dataset.cqty),raw=e.target.value;if(!l||raw==="")return;
    const n=Math.floor(+raw);if(isNaN(n)||n<1)return;
    const mx=lineMax(l);if(n>mx)e.target.value=mx;
    l.qty=Math.min(n,mx);cartLive();
  }
});
document.getElementById("main").addEventListener("keydown",e=>{if(e.target.dataset&&e.target.dataset.cqty&&["e","E","+","-",".",","].includes(e.key))e.preventDefault();});
document.getElementById("main").addEventListener("click",e=>{
  const t=e.target.closest("button");if(!t)return;
  if(t.id==="backhome"){if(history.state&&history.state.v)history.back();else go("home");
      }else if(t.dataset.cust){
    const d=debtors().get(t.dataset.cust);if(!d)return;
    state.cust.name=d.name;if(!state.cust.phone.trim())state.cust.phone=d.phone;render();
    const dep=document.getElementById("cd");if(dep)dep.focus();
  }else if(t.dataset.godebts){go("rcpt");state.rcptTab="debts";render();
  }else if(t.dataset.go){go(t.dataset.go);  }else if(t.dataset.cpay||t.dataset.cfull){
    const box=t.closest(".cpbox"),key=box.dataset.ckey,d=debtors().get(key);if(!d)return;
    const meth=box.querySelector("select").value;let amt=d.owed;
    if(t.dataset.cpay){const raw=box.querySelector("input").value;amt=+raw;
      if(raw===""||isNaN(amt)||amt<=0){state.msg={t:"Enter the amount "+d.name+" paid.",err:1};return render();}
      if(amt>d.owed){state.msg={t:d.name+" only owes "+money(d.owed)+" in total. Enter that amount or less.",err:1};return render();}}
    const n=payCustomer(key,amt,meth),left=debtors().get(key);
    state.msg={t:left?"Payment of "+money(amt)+" recorded. "+n+" debt"+(n===1?"":"s")+" cleared. "+d.name+" still owes "+money(left.owed)+".":d.name+" has paid everything ("+money(amt)+"). All "+n+" debts are cleared and removed from this list."};render();window.scrollTo(0,0);
  }else if(t.dataset.dpay||t.dataset.dfull){
    const id=+(t.dataset.dpay||t.dataset.dfull),x=state.sales.find(z=>z.id===id);if(!x||!x.debt)return;
    const o=saleOwed(x),meth=(document.getElementById("dpm"+id)||{}).value||"Cash";
    let amt=o;
    if(t.dataset.dpay){const raw=(document.getElementById("dpa"+id)||{}).value||"";amt=+raw;
      if(raw===""||isNaN(amt)||amt<=0){state.msg={t:"Enter the amount the customer paid.",err:1};return render();}
      if(amt>o){state.msg={t:x.debt.customer+" only owes "+money(o)+". Enter that amount or less.",err:1};return render();}}
    x.debt.pays.push({amt,method:meth,time:new Date().toLocaleString("en-GB"),ts:Date.now(),by:(state.team.find(w=>w.id===state.user)||{}).name||""});
    state.msg={t:saleOwed(x)<=0?x.debt.customer+" has paid in full. The debt is cleared and removed from this list.":"Payment of "+money(amt)+" recorded. "+x.debt.customer+" still owes "+money(saleOwed(x))+"."};render();window.scrollTo(0,0);
  }else if(t.dataset.rt){state.rcptTab=t.dataset.rt;state.msg=null;render();
  }else if(t.dataset.ft){state.facTab=t.dataset.ft;state.msg=null;render();
  }else if(t.id==="exadd"){
    const keep=["exd","exc","exn","exa"].map(k=>[k,document.getElementById(k).value]),fail=m=>{state.msg={t:m,err:1};render();keep.forEach(([k,v])=>{const el=document.getElementById(k);if(el)el.value=v;});};
    const [date,cat,desc,amt]=keep.map(k=>k[1]);
    if(!desc.trim())return fail("Describe the expense, for example “Shop rent for November”.");
    if(!date)return fail("Choose the date of the expense.");
    if(!(+amt>0))return fail("Enter the amount spent.");
    state.expenses.push({id:state.nextExp++,date,cat,desc:desc.trim(),amt:+amt,by:(state.team.find(w=>w.id===state.user)||{}).name||""});
    const ok=saveExp();state.msg={t:"Expense of "+money(+amt)+" added."+(ok?"":" It could not be kept after you close the page."),err:!ok};render();
  }else if(t.dataset.exdel){
    const e=state.expenses.find(z=>z.id===+t.dataset.exdel);if(!e||!confirm("Delete this expense: "+e.desc+" ("+money(e.amt)+")?"))return;
    state.expenses=state.expenses.filter(z=>z!==e);saveExp();state.msg={t:"Expense deleted."};render();
  }else if(t.dataset.tt){state.teamTab=t.dataset.tt;state.msg=null;state.delAsk=null;state.delErr="";render();
  }else if(t.dataset.style){applyStyle(t.dataset.style,true);state.msg={t:"Style changed to "+STYLES[t.dataset.style]+"."};render();
  }else if(t.id==="fsave"){
    const name=state.draft.name.trim();
    if(!name){state.msg={t:"Enter the facility name.",err:1};return render();}
    state.facility={name,logo:state.draft.logo||"",phone:(state.draft.phone||"").trim(),footer:(state.draft.footer||"").trim(),showCashier:!!state.draft.showCashier,showChange:!!state.draft.showChange};state.draft=null;
    try{localStorage.setItem(FKEY,JSON.stringify(state.facility));}catch(err){}
    state.msg={t:"Saving facility details\u2026"};render();
    (cloud?cloud.saveFacility(state.facility):Promise.reject()).then(()=>{state.msg={t:"Facility details saved for every device."};render();}).catch(()=>{state.msg={t:"Saved on this device only. The server could not be reached.",err:1};render();});
  }else if(t.id==="flogoclear"){state.draft.logo="";state.msg=null;render();
  }else if(t.id==="addMed"){
    let name=fn.value.trim();const exp=fe.value,qty=+fq.value,keep=["fn","fq","fc","fp","fe"].map(id=>[id,document.getElementById(id).value]);
    const fail=t=>{state.msg={t,err:1};render();keep.forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.value=v;});};
    if(!name||!exp||!(qty>0))return fail("Enter a product name, quantity and expiry date to add a batch.");
    let cat=catOf(name);if(cat)name=cat.name;
    const prev=cat?batchesOf(name).slice(-1)[0]:null,sellIn=fp.value!==""?+fp.value:(cat?cat.price:0);
    if(!cat)state.catalog.push(cat={id:state.nextCat++,name,unit:"",price:sellIn,min:10});
    const ex=state.meds.find(m=>keyOf(m.name)===keyOf(name)&&m.exp===exp);
    if(ex){ex.qty+=qty;if(fc.value!=="")ex.cost=+fc.value;if(fp.value!=="")ex.sell=+fp.value;
      state.msg={t:"Added "+qty+" \u00d7 "+name+" to the existing batch expiring "+exp+" ("+ex.qty+" units now)."};}
    else{state.meds.push({id:state.nextMed++,name,qty,min:cat.min,cost:fc.value!==""?+fc.value:(prev?prev.cost:0),sell:sellIn,exp});
      state.msg={t:(prev?"New batch created for ":"Added ")+qty+" \u00d7 "+name+", expires "+exp+"."};}
    render();
  }else if(t.dataset.cadd){
    state.pq="";
    const n=t.dataset.cadd,tot=sellable(n),l=state.cart.filter(x=>keyOf(x.name)===keyOf(n)).reduce((a,x)=>a+x.qty,0);
    if(!tot||l>=tot)state.msg={t:"Only "+tot+" of "+n+" in stock.",err:1};
    else{state.msg=null;const ex=state.cart.find(x=>keyOf(x.name)===keyOf(n));if(ex)ex.qty++;else state.cart.push({uid:state.nextLine++,name:n,qty:1,price:batches(n)[0].sell});}
    render();
    if(!isMobile()){const q=document.getElementById("psearch");if(q)q.focus();}
  }else if(t.dataset.cinc||t.dataset.cdec){
    const uid=+(t.dataset.cinc||t.dataset.cdec),l=state.cart.find(x=>x.uid===uid),tot=sellable(l.name),inCart=state.cart.filter(x=>keyOf(x.name)===keyOf(l.name)).reduce((a,x)=>a+x.qty,0);
    if(t.dataset.cinc){if(inCart<tot){l.qty++;state.msg=null;}else state.msg={t:"Only "+tot+" of "+l.name+" in stock.",err:1};}
    else{l.qty--;if(l.qty<1)state.cart=state.cart.filter(x=>x!==l);state.msg=null;}
    render();
  }else if(t.id==="pay"){
    const need={};state.cart.forEach(l=>{const k=keyOf(l.name);need[k]=(need[k]||0)+l.qty;});
    const bad=state.cart.find(l=>sellable(l.name)<need[keyOf(l.name)]);
    if(bad){state.msg={t:"Not enough "+bad.name+" in stock for this sale.",err:1};return render();}
    const total=state.cart.reduce((a,l)=>a+l.qty*l.price,0);
    const method=pm.value,prEl=document.getElementById("pr"),raw=method==="Cash"&&prEl?prEl.value.trim():"";let paid=null,change=null,debt=null;
    if(method==="On credit"){
      const c=state.cust,nm=c.name.trim(),dep=c.dep===""?0:+c.dep;
      if(!nm){state.msg={t:"Enter the customer\u2019s name for a sale on credit.",err:1};return render();}
      if(isNaN(dep)||dep<0||dep>=total){state.msg={t:dep>=total&&total>0?"Paid now must be less than the total. For a full payment use Cash, Mobile money or Card.":"Enter a valid amount for Paid now, or leave it empty.",err:1};return render();}
      const known=debtors().get(keyOf(nm));
      debt={customer:known?known.name:nm,phone:c.phone.trim()||(known?known.phone:""),due:c.due,pays:dep>0?[{amt:dep,method:c.depm,time:new Date().toLocaleString("en-GB"),ts:Date.now(),by:(state.team.find(w=>w.id===state.user)||{}).name||""}]:[]};
    }else
    if(raw!==""){paid=+raw;state.received=raw;if(!(paid>=total)){state.msg={t:"Cash received is less than the total of "+money(total)+".",err:1};return render();}change=paid-total;}
    const costs=state.cart.map(l=>deduct(l.name,l.qty)); /* nearest expiry batch first; keeps what the stock cost us */
    const me=state.team.find(w=>w.id===state.user);
    state.sales.unshift({id:state.nextSale++,total,method,time:new Date().toLocaleString("en-GB"),ts:Date.now(),cashier:me?me.name:"",paid,change,debt,lines:state.cart.map((l,i)=>({name:l.name,qty:l.qty,price:l.price,cost:costs[i]/l.qty}))});
    const dn=debt?debt.customer:"";
    state.cart=[];state.received="";if(debt)state.cust={name:"",phone:"",dep:"",depm:"Cash",due:""};
    state.msg={t:debt?"Credit sale recorded: "+dn+" owes "+money(total-salePaid(state.sales[0]))+". See Receipts, then Debts.":"Sale complete: "+money(total)+" paid by "+method+"."+(change!=null?" Change to give: "+money(change)+".":"")};render();
  }else if(t.dataset.rview){state.rcpt=+t.dataset.rview;state.rdelAsk=false;state.rdelErr="";render();window.scrollTo(0,0);
  }else if(t.id==="rback"){state.rcpt=null;state.rdelAsk=false;state.rdelErr="";render();
  }else if(t.dataset.rdelask){if(!isAdmin())return;state.rdelAsk=true;state.rdelErr="";render();const pe=document.getElementById("rdelpin");if(pe)pe.focus();
  }else if(t.dataset.rdelcancel){state.rdelAsk=false;state.rdelErr="";render();
  }else if(t.dataset.rdelgo){
    const pin=(document.getElementById("rdelpin")||{}).value||"",id=+t.dataset.rdelgo;
    if(!isAdmin())return;
    cloud.verifyPin(pin).then(ok=>{
      if(!ok){state.rdelErr="Incorrect PIN. Nothing was deleted.";render();const pe=document.getElementById("rdelpin");if(pe)pe.focus();return;}
      state.sales=state.sales.filter(x=>x.id!==id);state.rcpt=null;state.rdelAsk=false;state.rdelErr="";
      state.msg={t:"Receipt #"+id+" deleted."};render();window.scrollTo(0,0);
    });
  }else if(t.dataset.bdelask){if(!isAdmin())return;state.bdelAsk=+t.dataset.bdelask;state.bdelErr="";render();const pe=document.getElementById("bdelpin");if(pe)pe.focus();
  }else if(t.dataset.bdelcancel){state.bdelAsk=null;state.bdelErr="";render();
  }else if(t.dataset.bdelgo){
    const pin=(document.getElementById("bdelpin")||{}).value||"",id=+t.dataset.bdelgo;
    if(!isAdmin())return;
    cloud.verifyPin(pin).then(ok=>{
      if(!ok){state.bdelErr="Incorrect PIN. Nothing was deleted.";render();const pe=document.getElementById("bdelpin");if(pe)pe.focus();return;}
      const m=medById(id);state.meds=state.meds.filter(x=>x.id!==id);
      state.cart=state.cart.filter(l=>sellable(l.name)>0);state.cart.forEach(l=>{l.qty=Math.min(l.qty,lineMax(l));});
      state.bdelAsk=null;state.bdelErr="";state.msg={t:"Deleted the "+(m?m.name:"")+" stock batch."};render();window.scrollTo(0,0);
    });
  }else if(t.id==="addWorker"){
    const name=wn.value.trim(),access=[...document.querySelectorAll("[data-acc]:checked")].map(c=>c.dataset.acc),slot=+wslot.value,pin=wpin.value.trim();
    if(pin.length!==4||isNaN(+pin)){state.msg={t:"Enter a 4-digit PIN for the worker.",err:1};return render();}
    if(!name||!access.length){state.msg={t:"Enter the worker\u2019s name and choose at least one area they can access.",err:1};return render();}
    if(!isAdmin())return;
    if(state.team.some(w=>w.name.toLowerCase()===name.toLowerCase())){state.msg={t:"A worker with that name already exists.",err:1};return render();}
    t.disabled=true;state.msg={t:"Adding "+name+"\u2026"};render();
    cloud.createWorker({name,pin,role:wrole.value,slot,access}).then(()=>{state.wf={role:"Cashier",acc:[...ROLES.Cashier]};state.msg={t:name+" is assigned to slot "+slot+" with access to "+access.length+" areas. They can now sign in on any device with their name and PIN."};render();})
      .catch(err=>{state.msg={t:err.message||"Could not add the worker.",err:1};render();});
  }else if(t.dataset.prev){
    state.as=t.dataset.prev;state.msg=null;state.rcpt=null;state.draft=null;
    state.view=isMobile()?"home":(Object.keys(VIEWS).find(allowed)||state.view);render();
  }else if(t.id==="exitprev"){state.as=null;state.draft=null;state.view=allowed("team")?"team":Object.keys(VIEWS).find(allowed)||"dash";render();
  }else if(t.dataset.wedit){
    if(!isAdmin())return;const w=state.team.find(x=>x.id===t.dataset.wedit);if(!w||w.owner||w.id===state.user)return;
    state.wedit=w.id;state.wef={role:w.role,acc:[...w.access]};state.msg=null;render();
  }else if(t.dataset.wcancel){state.wedit=null;state.wef=null;render();
  }else if(t.dataset.wsave){
    if(!isAdmin())return;const id=t.dataset.wsave,w=state.team.find(x=>x.id===id),f=state.wef;
    if(!w||!f||state.wedit!==id)return;
    if(!f.acc.length){state.msg={t:"Choose at least one area this worker can access.",err:1};return render();}
    t.disabled=true;
    cloud.updateWorker(id,{role:f.role,access:f.acc}).then(()=>{state.wedit=null;state.wef=null;state.msg={t:w.name+" is now "+f.role+" with access to "+f.acc.length+" area"+(f.acc.length===1?"":"s")+". It applies the next time they sign in."};render();})
      .catch(()=>{state.msg={t:"Could not save the changes. Try again.",err:1};render();});
  }else if(t.dataset.rmw){
    if(!isAdmin())return;
    cloud.removeWorker(t.dataset.rmw).then(()=>{state.msg={t:"Worker removed. They can no longer sign in, and their slot is free."};render();})
      .catch(()=>{state.msg={t:"Could not remove the worker. Try again.",err:1};render();});
  }else if(t.id==="rprint"){window.print();
  }else if(t.id==="rsave"){
    const s=state.sales.find(x=>x.id===state.rcpt);
    DL.save({filename:"receipt-"+s.id+".html",data:receiptDoc(s)}).then(()=>{state.msg={t:"Receipt saved. Open the file to print it."};render();}).catch(err=>{if(!err||err.code!=="declined"){state.msg={t:"The receipt could not be saved here. Use Print receipt instead.",err:1};render();}});
  }else if(t.dataset.dlrcpt){
    const rows=[csvRow(["Receipt no.","Date and time","Payment","Total","Items","Cashier","Customer (credit)","Balance owed"])].concat(state.sales.map(x=>csvRow([x.id,x.time,x.method,x.total,x.lines.map(l=>l.name+" x"+l.qty+" @ "+l.price).join("; "),x.cashier||"",x.debt?x.debt.customer:"",saleOwed(x)])));
    downloadText("receipts.csv",rows.join("\r\n")+"\r\n");
  }else if(t.dataset.dlinv){
    const rows=[csvRow(["name","quantity","cost price","selling price","expiry date"])].concat(state.meds.map(m=>csvRow([m.name,m.qty,m.cost,m.sell,m.exp])));
    downloadText("inventory.csv",rows.join("\r\n")+"\r\n");
  }else if(t.dataset.delask){state.delAsk=t.dataset.delask;state.delErr="";render();const pe=document.getElementById("delpin");if(pe)pe.focus();
  }else if(t.dataset.delcancel){state.delAsk=null;state.delErr="";render();
  }else if(t.dataset.delgo){
    const pin=(document.getElementById("delpin")||{}).value||"",kind=t.dataset.delgo;
    cloud.verifyPin(pin).then(ok=>{
      if(!ok){state.delErr="Incorrect PIN. Nothing was deleted.";render();const pe=document.getElementById("delpin");if(pe)pe.focus();return;}
      const n=applyDelete(kind);state.delAsk=null;state.delErr="";
      state.msg={t:kind==="rcpt"?"Deleted "+n+" receipt"+(n===1?"":"s")+".":"Deleted "+n+" stock batch"+(n===1?"":"es")+(state.delInv.scope==="everything"?" and the medicine list":"")+"."};render();window.scrollTo(0,0);
    });
  }else if(t.dataset.tpl){const T=TPL[t.dataset.tpl];downloadText(T[0],T[1]);
  }else if(t.dataset.impclear){state.imp.res=null;state.imp.raw=null;state.imp.file="";state.msg=null;render();
  }else if(t.dataset.impgo){
    const res=state.imp.res;if(!res||!res.rows||!res.rows.length)return;
    const bad=res.errs.length,note=bad?" "+bad+" problem row"+(bad===1?" was":"s were")+" skipped.":"";
    if(state.imp.type==="meds"){const r=importMeds(res.rows,state.imp.mode);state.msg={t:"Imported "+r.added+" new medicine"+(r.added===1?"":"s")+(r.updated?", updated "+r.updated:"")+(r.skipped?", skipped "+r.skipped+" already in the list":"")+"."+note};}
    else{const r=importStock(res.rows);state.msg={t:"Imported stock: "+r.batchesNew+" new batch"+(r.batchesNew===1?"":"es")+", "+r.merged+" added to existing batches"+(r.products?", "+r.products+" new product"+(r.products===1?"":"s")+" added to the medicine list":"")+"."+note};}
    state.imp.res=null;state.imp.raw=null;state.imp.file="";render();window.scrollTo(0,0);
  }else if(t.dataset.rng){
    const k=t.dataset.rng;state.range.k=k;
    if(k==="custom"&&!state.range.from){state.range.from=ymd(addDays(day0(new Date()),-6));state.range.to=ymd(day0(new Date()));}
    render();
  }else if(t.dataset.pick){
    const c=state.catalog.find(x=>x.id===+t.dataset.pick);fn.value=c.name;fp.value=c.price;
    document.getElementById("dd").hidden=true;fq.focus();
  }else if(t.dataset.newprod){document.getElementById("dd").hidden=true;fq.focus();
  }else if(t.id==="addmedbtn"){state.addMed=!state.addMed;state.open=true;state.msg=null;render();
  }else if(t.id==="asave"){
    const n=an.value.trim(),keep=["an","au","ap","am"].map(id=>[id,document.getElementById(id).value]);
    const fail=x=>{state.msg={t:x,err:1};state.open=true;render();keep.forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.value=v;});};
    if(!n)return fail("Enter the medicine name.");
    if(catOf(n))return fail(n+" is already in the medicine list.");
    state.catalog.push({id:state.nextCat++,name:n,unit:au.value.trim(),price:Math.max(0,+ap.value||0),min:am.value!==""?Math.max(0,+am.value||0):10});
    state.addMed=false;state.open=true;state.msg={t:n+" added to the medicine list."};render();
  }else if(t.dataset.eedit){state.editMed=+t.dataset.eedit;state.open=true;state.msg=null;render();
  }else if(t.id==="ecancel"){state.editMed=null;state.open=true;render();
  }else if(t.dataset.esave){
    const c=state.catalog.find(x=>x.id===+t.dataset.esave),n=en.value.trim(),price=Math.max(0,+ep.value||0),min=em.value!==""?Math.max(0,+em.value||0):10;
    if(!n){state.msg={t:"Enter the medicine name.",err:1};state.open=true;return render();}
    const dup=catOf(n);if(dup&&dup!==c){state.msg={t:n+" is already in the medicine list.",err:1};state.open=true;return render();}
    state.meds.forEach(m=>{if(keyOf(m.name)===keyOf(c.name)){m.name=n;if(price!==c.price)m.sell=price;}});
        c.name=n;c.unit=eu.value.trim();c.price=price;c.min=min;state.editMed=null;state.open=true;state.msg={t:n+" updated."};render();
  }else if(t.dataset.edel){
    const c=state.catalog.find(x=>x.id===+t.dataset.edel);state.open=true;
    if(batchesOf(c.name).some(m=>m.qty>0)){state.msg={t:c.name+" still has stock. Sell or remove it before deleting.",err:1};return render();}
    if(!confirm("Delete "+c.name+" from the medicine list?"))return;
    state.meds=state.meds.filter(m=>keyOf(m.name)!==keyOf(c.name));state.catalog=state.catalog.filter(x=>x!==c);
    state.msg={t:c.name+" deleted."};render();
  }else if(t.id==="addRx"){
    const p=rp.value.trim();
    if(!p){state.msg={t:"Enter the patient\u2019s name to save a prescription.",err:1};return render();}
    const dm=medById(+rm.value);
    if(!dm){state.msg={t:"There is no medicine in stock to prescribe. Add stock first.",err:1};return render();}
    state.rx.unshift({id:state.nextRx++,patient:p,med:dm.id,drug:dm.name,qty:Math.max(1,+rq.value||1),status:"Draft"});
    state.msg={t:"Prescription saved as draft."};render();
  }else if(t.dataset.adv){
    const r=state.rx.find(x=>x.id===+t.dataset.adv);
    if(r.status==="Draft"){r.status="Pending";state.msg={t:"Sent to pharmacist for review."};}
    else{
      const m={name:r.drug||"This medicine"},tot=sellable(m.name);
      if(!r.drug||!batchesOf(m.name).length)state.msg={t:m.name+" is no longer in stock. Add it back before dispensing.",err:1};
      else if(tot===0&&batchesOf(m.name).some(b=>b.qty>0))state.msg={t:m.name+" is expired. Remove it from stock before dispensing.",err:1};
      else if(tot<r.qty)state.msg={t:"Only "+tot+" of "+m.name+" in stock. Restock to dispense "+r.qty+".",err:1};
      else{state.rxCost+=deduct(m.name,r.qty);r.status="Filled";state.msg={t:"Dispensed "+r.qty+" \u00d7 "+m.name+" to "+r.patient+"."};}
    }
    render();
  }
});
document.getElementById("main").addEventListener("change",e=>{
  const t=e.target,v=Math.max(0,+t.value||0);
  if(t.id==="fshowcashier"&&state.draft){state.draft.showCashier=t.checked;return;}
  if(t.id==="fshowchange"&&state.draft){state.draft.showChange=t.checked;return;}
  if(t.id==="pm"){state.payMethod=t.value;render();return;}
  if(t.id==="cdm"){state.cust.depm=t.value;return;}
  if(t.id==="cdue"){state.cust.due=t.value;return;}
  if(t.id==="pr"){state.received=t.value;return;}
  if(t.id==="rf"||t.id==="rt"){state.range[t.id==="rf"?"from":"to"]=t.value;render();return;}
  if(t.id==="delrscope"){state.delRc.scope=t.value;state.delAsk=null;render();return;}
  if(t.id==="delrf"||t.id==="delrt"){state.delRc[t.id==="delrf"?"from":"to"]=t.value;state.delAsk=null;render();return;}
  if(t.id==="delisc"){state.delInv.scope=t.value;state.delAsk=null;render();return;}
  if(t.id==="imptype"){state.imp.type=t.value;state.msg=null;if(state.imp.raw){state.imp.map=guessMap(state.imp.hasHeader?state.imp.raw[0]:[],t.value);}importRecalc();render();return;}
  if(t.id==="impmode"){state.imp.mode=t.value;render();return;}
  if(t.id==="imphdr"){const im=state.imp;im.hasHeader=t.checked;const w=Math.max(...im.raw.map(r=>r.length));im.map=guessMap(im.hasHeader?im.raw[0]:Array(w).fill(""),im.type);importRecalc();render();return;}
  if(t.dataset.map){state.imp.map[t.dataset.map]=+t.value;importRecalc();render();return;}
  if(t.id==="impfile"){
    const f=t.files&&t.files[0];if(!f)return;
    const im=state.imp,fail=m=>{im.raw=null;im.res=null;state.msg={t:m,err:1};render();};
    if(!/\.csv$/i.test(f.name))return fail("Only CSV files (.csv) can be imported. In Excel use Save As, then CSV.");
    if(f.size>2*1024*1024)return fail("That file is larger than 2 MB. Split it into smaller files.");
    const r=new FileReader();r.onerror=()=>fail("The file could not be read.");
    r.onload=()=>{state.msg=null;const rows=parseCSV(String(r.result));
      if(!rows.length)return fail("The file is empty.");
      im.file=f.name;im.raw=rows;im.hasHeader=true;im.map=guessMap(rows[0],im.type);importRecalc();render();};
    r.readAsText(f);return;
  }
  if(t.id==="wrole"){state.wf={role:t.value,acc:[...ROLES[t.value]]};document.querySelectorAll("[data-acc]").forEach(c=>c.checked=state.wf.acc.includes(c.dataset.acc));return;}
  if(t.dataset.acc){state.wf.acc=[...document.querySelectorAll("[data-acc]:checked")].map(c=>c.dataset.acc);return;}
  if(t.id==="erole"&&state.wef){state.wef={role:t.value,acc:[...ROLES[t.value]]};document.querySelectorAll("[data-eacc]").forEach(c=>c.checked=state.wef.acc.includes(c.dataset.eacc));return;}
  if(t.dataset.eacc&&state.wef){state.wef.acc=[...document.querySelectorAll("[data-eacc]:checked")].map(c=>c.dataset.eacc);return;}
  if(t.id==="flogo"){
    const f=t.files&&t.files[0];if(!f||!state.draft)return;
    readLogo(f).then(url=>{state.draft.logo=url;state.msg=null;render();}).catch(()=>{state.msg={t:"That image could not be read. Try a PNG or JPG file.",err:1};render();});
    return;
  }
  if(t.dataset.cqty){
    const l=state.cart.find(x=>x.uid===+t.dataset.cqty);if(!l)return;
    const raw=t.value.trim(),n=Math.floor(+raw);
    if(raw===""||isNaN(n)){render();return;}
    if(n<1){state.cart=state.cart.filter(x=>x!==l);state.msg=null;render();return;}
    const others=state.cart.filter(x=>x!==l&&keyOf(x.name)===keyOf(l.name)).reduce((a,x)=>a+x.qty,0),max=sellable(l.name)-others;
    if(n>max){l.qty=Math.max(1,max);state.msg={t:"Only "+sellable(l.name)+" of "+l.name+" in stock. Quantity set to "+l.qty+".",err:1};}
    else{l.qty=n;state.msg=null;cartLive();return;}
    render();return;
  }
  if(t.dataset.cprice){state.cart.find(x=>x.uid===+t.dataset.cprice).price=v;state.msg=null;cartLive();}
  else if(t.dataset.sprice){
    const [sid,i]=t.dataset.sprice.split(":").map(Number),s=state.sales.find(x=>x.id===sid);
    s.lines[i].price=v;s.total=s.lines.reduce((a,l)=>a+l.qty*l.price,0);
    state.msg={t:"Sale #"+sid+" updated: new total "+money(s.total)+"."};render();
  }
});
const LASTKEY="pharmacy-lastname";
const lastName=()=>{try{return localStorage.getItem(LASTKEY)||"";}catch(e){return "";}};
const setLastName=n=>{try{localStorage.setItem(LASTKEY,n);}catch(e){}};
let unsubTeam=null,busy=false,setupDone=false;
const normFac=f=>({name:typeof f.name==="string"&&f.name.trim()?f.name.trim():state.facility.name,logo:typeof f.logo==="string"&&f.logo.startsWith("data:image/")?f.logo:"",phone:typeof f.phone==="string"?f.phone:"",footer:typeof f.footer==="string"?f.footer:state.facility.footer,showCashier:f.showCashier!==false,showChange:f.showChange!==false});
/* facility name, logo and receipt text are shared by every device */
if(cloud)cloud.watchFacility(f=>{
  state.facility=normFac(f);try{localStorage.setItem(FKEY,JSON.stringify(state.facility));}catch(e){}
  applyFacility();if(state.user&&!state.draft&&["facility","home"].includes(state.view))render();
});
function showLoginMode(m){
  document.getElementById("lconn").hidden=m!=="conn";
  document.getElementById("lsetup").hidden=m!=="setup";
  document.getElementById("lsign").hidden=m!=="sign";
}
async function checkSetup(){
  const c=document.getElementById("lconn");showLoginMode("conn");applyFacility();
  c.onclick=e=>{if(e.target.id==="lretry")checkSetup();};
  if(!cloud){c.innerHTML='Could not load the sign-in service. Check the internet connection.<br><button type="button" class="btn btn-secondary" id="lretry" style="margin-top:10px">Reload</button>';c.onclick=()=>location.reload();return;}
  c.textContent="Connecting\u2026";
  try{setupDone=await cloud.isSetup();fillLogin();}
  catch(e){c.innerHTML=esc(e.message)+'<br><button type="button" class="btn btn-secondary" id="lretry" style="margin-top:10px">Try again</button>';}
}
function fillLogin(){
  const ln=document.getElementById("lname");ln.value=lastName();
  document.getElementById("lp").value="";document.getElementById("lerr").textContent="";document.getElementById("lserr").textContent="";
  for(const id of ["sn","sp","sp2"])document.getElementById(id).value="";
  pinSel=!ln.value;showLoginMode(setupDone?"sign":"setup");
  ln.oninput=()=>syncPinPad();
  syncPinPad();
  /* the staff names are read again each time the sign-in screen is shown */
  loadRoster().then(()=>{ln.setAttribute("inputmode",isMobile()&&roster.length?"none":"text");});
}
/* sign-in name list: tap the name box and pick a name. The list (names only) is kept in meta/roster by administrators. */
let roster=[],rosterKey="";
async function loadRoster(){try{roster=cloud?await cloud.getRoster():[];}catch(e){roster=[];}}
function syncRoster(list){
  const names=list.map(w=>w.name).sort((a,b)=>a.localeCompare(b)),k=JSON.stringify(names);
  if(k===rosterKey)return;rosterKey=k;
  cloud.saveRoster(names).catch(()=>{rosterKey="";});
}
(function(){
  const ln=document.getElementById("lname"),box=document.createElement("div"),dd=document.createElement("div");
  box.className="combo";dd.className="dd";dd.id="lnames";dd.hidden=true;dd.setAttribute("role","listbox");dd.setAttribute("aria-label","Staff names");
  ln.parentNode.insertBefore(box,ln);box.appendChild(ln);box.appendChild(dd);
  const list=()=>{const v=ln.value.trim().toLowerCase();return !v||roster.some(n=>n.toLowerCase()===v)?roster:roster.filter(n=>n.toLowerCase().includes(v));};
  const show=()=>{const m=list();if(!m.length){dd.hidden=true;return;}dd.innerHTML=m.map(n=>`<button type="button" role="option" data-n="${esc(n)}">${esc(n)}</button>`).join("");dd.hidden=false;};
  ln.addEventListener("focus",show);ln.addEventListener("click",show);ln.addEventListener("input",show);
  ln.addEventListener("keydown",e=>{if(e.key==="Escape")dd.hidden=true;});
  dd.addEventListener("mousedown",e=>e.preventDefault());
  dd.addEventListener("click",e=>{
    const b=e.target.closest("[data-n]");if(!b)return;
    ln.value=b.dataset.n;dd.hidden=true;pinSel=false;document.getElementById("lerr").textContent="";syncPinPad();
    if(!isMobile())document.getElementById("lp").focus();
  });
  document.addEventListener("click",e=>{if(e.target!==ln&&!e.target.closest("#lnames"))dd.hidden=true;});
})();
/* stock and sales are saved in Firestore (cloud.js): they survive a reload and every device sees the same ones */
let storeDirty=false;
const typingNow=()=>{const a=document.activeElement;return !!a&&/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)&&!!a.closest("main");};
const storeAdapter={
  get:()=>({meds:state.meds,catalog:state.catalog,sales:state.sales,nextMed:state.nextMed,nextCat:state.nextCat,nextSale:state.nextSale}),
  set:d=>{state.meds=d.meds;state.catalog=d.catalog;state.sales=d.sales;state.nextMed=1;state.nextCat=1;state.nextSale=1;},
  counters:(m,c,s)=>{state.nextMed=Math.max(state.nextMed,m);state.nextCat=Math.max(state.nextCat,c);state.nextSale=Math.max(state.nextSale,s);},
  /* another device changed something: refresh the screen, but never while someone is typing */
  changed:()=>{if(!state.user||state.view==="team")return;if(typingNow()){storeDirty=true;return;}render();},
  error:t=>{state.msg={t,err:1};if(state.user)render();}
};
document.addEventListener("focusout",()=>{if(storeDirty)setTimeout(()=>{if(storeDirty&&state.user&&!typingNow()){storeDirty=false;render();}},60);});
async function onSignedIn(w,first){
  if(cloud){try{await cloud.openStore(storeAdapter);}catch(e){try{await cloud.logout();}catch(_){}throw e;}}
  state.fails=0;state.user=w.id;state.as=null;state.msg=null;state.rcpt=null;state.draft=null;state.cart=[];
  state.team=[w];
  if(unsubTeam){unsubTeam();unsubTeam=null;}
  if(w.role==="Admin")unsubTeam=cloud.watchTeam(list=>{if(!state.user)return;state.team=list;syncRoster(list);if(state.view==="team"&&!state.rdelAsk&&!state.delAsk)render();},()=>{});
  if(first){state.view="facility";state.msg={t:"Welcome, "+w.name+". You are the administrator. Set your facility name and logo."};}
  else state.view=isMobile()?"home":(Object.keys(VIEWS).find(allowed)||"dash");
  try{history.replaceState(null,"",location.pathname+location.search);}catch(e){}
  showUser(w);render();
}
async function register(){
  if(busy)return;
  const e=document.getElementById("lserr"),name=document.getElementById("sn").value.trim(),pin=document.getElementById("sp").value,pin2=document.getElementById("sp2").value;
  pinSel=false;if(typeof syncPinPad==="function")syncPinPad();
  if(!name){e.textContent="Enter your full name.";return;}
  if(pin.length!==4||isNaN(+pin)){e.textContent="Choose a 4-digit PIN.";return;}
  if(pin!==pin2){e.textContent="The PINs do not match.";return;}
  busy=true;e.textContent="Creating the account\u2026";
  try{const w=await cloud.registerOwner(name,pin);setupDone=true;setLastName(name);await onSignedIn(w,true);}
  catch(err){
    e.textContent=err.message||"Could not create the account.";
    if(err.code==="closed"){setupDone=true;setTimeout(fillLogin,2500);}
    if(err.code==="store")setTimeout(fillLogin,2500);
  }finally{busy=false;}
}
async function signIn(){
  if(busy)return false;
  const err=document.getElementById("lerr"),btn=document.getElementById("lgo"),pe=document.getElementById("lp");
  const name=document.getElementById("lname").value.trim(),pin=pe.value;
  if(!name){err.textContent="Enter your full name.";pinSel=true;syncPinPad();return false;}
  if(pin.length!==4||isNaN(+pin)){err.textContent="Enter your 4-digit PIN.";return false;}
  busy=true;err.textContent="Signing in\u2026";
  try{
    const w=await cloud.login(name,pin);
    setLastName(name);pe.value="";err.textContent="";await onSignedIn(w,false);return true;
  }catch(ex){
    pe.value="";
    if(ex.code==="bad"){
      state.fails++;
      if(state.fails>=3){
        state.fails=0;btn.disabled=true;let s=30;err.textContent="Too many tries. Wait "+s+" seconds.";
        const t=setInterval(()=>{s--;if(s<=0){clearInterval(t);btn.disabled=false;err.textContent="";}else err.textContent="Too many tries. Wait "+s+" seconds.";},1000);
      }else err.textContent="Incorrect details. Try again.";
    }else err.textContent=ex.message||"Could not sign in.";
    return false;
  }finally{busy=false;}
}
/* ---- iPhone-style PIN pad (phones only). #lp still holds the digits, so signIn() is unchanged. ---- */
const PINL={2:"ABC",3:"DEF",4:"GHI",5:"JKL",6:"MNO",7:"PQRS",8:"TUV",9:"WXYZ"};
let pinSel=false;
(function(){
  let h="";for(let n=1;n<=9;n++)h+=`<button type="button" data-pk="${n}" aria-label="${n}">${n}${PINL[n]?`<small aria-hidden="true">${PINL[n]}</small>`:""}</button>`;
  h+=`<span aria-hidden="true"></span><button type="button" data-pk="0" aria-label="0">0</button><button type="button" class="pdel" data-pk="del" aria-label="Delete the last digit">Delete</button>`;
  document.getElementById("pkeys").innerHTML=h;
})();
function syncPinPad(){
  const m=isMobile(),ls=document.getElementById("lsign"),lp=document.getElementById("lp"),ln=document.getElementById("lname");
  ls.classList.toggle("pinmode",m);document.getElementById("pinpad").hidden=!m;if(!m)return;
  ls.classList.toggle("showsel",pinSel);
  document.getElementById("pwho").textContent=ln.value.trim()||"Your name";
  document.getElementById("pwr").textContent=pinSel?"Type your full name above":"";
  document.getElementById("pchange").textContent=pinSel?"Hide the name box":"Not you? Change";
  document.getElementById("pchange").hidden=false;
  document.querySelectorAll("#pdots span").forEach((d,i)=>d.classList.toggle("on",i<lp.value.length));
}
function pinAdd(d){
  const lp=document.getElementById("lp");if(document.getElementById("lgo").disabled)return;
  if(d==="del")lp.value=lp.value.slice(0,-1);else if(lp.value.length<4)lp.value+=d;
  syncPinPad();if(lp.value.length===4)setTimeout(pinGo,160);
}
function pinGo(){
  const lp=document.getElementById("lp");if(lp.value.length!==4||state.user||busy)return;
  signIn().then(ok=>{syncPinPad();
    if(!ok&&!state.user){const p=document.getElementById("pdots");p.classList.remove("shake");void p.offsetWidth;p.classList.add("shake");try{navigator.vibrate&&navigator.vibrate(120);}catch(e){}}});
}
document.getElementById("pkeys").onclick=e=>{const b=e.target.closest("[data-pk]");if(b)pinAdd(b.dataset.pk);};
document.getElementById("pchange").onclick=()=>{pinSel=!pinSel;syncPinPad();if(pinSel)document.getElementById("lname").focus();};
document.addEventListener("keydown",e=>{
  const lg=document.getElementById("login");if(lg.classList.contains("out")||document.getElementById("pinpad").hidden||document.getElementById("lsign").hidden)return;
  if(/^(INPUT|SELECT|TEXTAREA)$/.test((document.activeElement||{}).tagName))return;
  if(/^[0-9]$/.test(e.key))pinAdd(e.key);else if(e.key==="Backspace")pinAdd("del");
});
MQ.addEventListener?MQ.addEventListener("change",syncPinPad):MQ.addListener(syncPinPad);
document.getElementById("lgo").onclick=()=>{signIn();};
document.getElementById("lname").onkeydown=e=>{if(e.key==="Enter")document.getElementById("lp").focus();};
document.getElementById("lp").onkeydown=e=>{if(e.key==="Enter")signIn();};
document.getElementById("lsgo").onclick=()=>{register();};
document.getElementById("sp2").onkeydown=e=>{if(e.key==="Enter")register();};
document.getElementById("userBtn").onclick=()=>{document.getElementById("userPanel").hidden?openUserMenu():closeUserMenu(true);};
document.querySelectorAll("[data-th]").forEach(b=>b.onclick=()=>applyPharmacyTheme(b.dataset.th));
document.addEventListener("click",e=>{if(!e.target.closest("#umenu"))closeUserMenu(false);});
document.addEventListener("keydown",e=>{
  const pn=document.getElementById("userPanel");if(!pn||pn.hidden)return;
  if(e.key==="Escape"){closeUserMenu(true);return;}
  if(e.key==="ArrowDown"||e.key==="ArrowUp"){const bs=[...pn.querySelectorAll("button")],i=bs.indexOf(document.activeElement);if(i<0)return;e.preventDefault();bs[(i+(e.key==="ArrowDown"?1:-1)+bs.length)%bs.length].focus();}
});
document.getElementById("umenu").addEventListener("focusout",e=>{if(e.relatedTarget&&!e.relatedTarget.closest("#umenu"))closeUserMenu(false);});
applyPharmacyTheme(document.documentElement.dataset.themePref);
document.getElementById("signout").onclick=()=>{closeUserMenu(false);
  state.user=null;state.as=null;state.draft=null;state.team=[];if(unsubTeam){unsubTeam();unsubTeam=null;}if(cloud)cloud.logout();hideUser();fillLogin();render();
  const lg=document.getElementById("login");lg.style.display="none";void lg.offsetHeight;lg.style.display="";
};
checkSetup();
render();