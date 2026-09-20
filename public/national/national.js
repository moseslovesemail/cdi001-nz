const money=n=>n?new Intl.NumberFormat("en-NZ",{style:"currency",currency:"NZD",maximumFractionDigits:0}).format(n):"Value not published";
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));

async function loadAuckland(){
 const state=document.querySelector("#liveState"), root=document.querySelector("#aucklandRecords");
 try{
  const r=await fetch("/api/auckland/high-value");
  const data=await r.json();
  if(!r.ok) throw new Error(data.detail||data.error||"Unable to load");
  state.textContent=`${data.records.length} latest records returned · live API`;
  root.innerHTML=data.records.map(x=>`<article class="national-card">
   <div><div class="value">${money(x.project_value_nzd)}</div><div class="fit">NZ Foam fit ${x.nz_foam_preliminary_fit_score}/100</div></div>
   <div><h3>${esc(x.description||x.application_subtype||"Building consent")}</h3><p>${esc(x.consent_reference||"No public reference")} · ${esc(x.application_subtype||"Subtype not published")}</p></div>
   <div class="meta"><span>Issued: ${esc(x.issued_date||"—")}</span><span>Status: ${esc(x.status||"—")}</span><a href="${x.source_url}" target="_blank" rel="noreferrer">Council source ↗</a></div>
  </article>`).join("");
 }catch(e){state.textContent="Live source temporarily unavailable";root.innerHTML=`<div class="notice">Auckland adapter error: ${esc(e.message)}. The CDI site remains available while the council source is retried.</div>`;}
}

function statusClass(s){return s.startsWith("LIVE")?"live":"ready"}
async function loadCoverage(){
 const root=document.querySelector("#coverageTable");
 const r=await fetch("/data/national-coverage.json"); const data=await r.json();
 root.innerHTML=`<div class="coverage-row head"><div>Council</div><div>Region</div><div>Building</div><div>Resource</div><div>Access</div></div>`+
 data.authorities.map(x=>`<div class="coverage-row">
  <div><strong>${esc(x.name)}</strong><div class="source-note">${esc(x.notes)}</div></div>
  <div>${esc(x.region)}</div>
  <div class="status ${statusClass(x.building_status)}">${esc(x.building_status.replaceAll("_"," "))}</div>
  <div class="status ${statusClass(x.resource_status)}">${esc(x.resource_status.replaceAll("_"," "))}</div>
  <div>${esc(x.cost)}<div class="source-note">${esc(x.method)}</div></div>
 </div>`).join("");
}
loadAuckland(); loadCoverage();