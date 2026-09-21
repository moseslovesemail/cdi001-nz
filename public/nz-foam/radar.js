const buttons = [...document.querySelectorAll(".radar-filter")];
const opportunities = [...document.querySelectorAll("#opportunityList .opportunity")];
const search = document.querySelector("#projectSearch");
let category = "all";

function applyFilters() {
  if (!search) return;
  const q = (search.value || "").trim().toLowerCase();
  opportunities.forEach((item) => {
    const categoryMatch = category === "all" || item.dataset.category === category;
    const searchMatch = !q || (item.dataset.search || "").includes(q) || item.textContent.toLowerCase().includes(q);
    item.hidden = !(categoryMatch && searchMatch);
  });
}
buttons.forEach((button) => {
  button.addEventListener("click", () => {
    buttons.forEach((b) => b.classList.remove("active"));
    button.classList.add("active");
    category = button.dataset.filter;
    applyFilters();
  });
});
if (search) search.addEventListener("input", applyFilters);

const foamMoney = n => n ? new Intl.NumberFormat("en-NZ",{style:"currency",currency:"NZD",maximumFractionDigits:0}).format(n) : "Value not published";
const compactMoney = n => {
  if (!n) return "$0";
  if (n >= 1_000_000_000) return "$" + (n/1_000_000_000).toFixed(1).replace(".0","") + "b";
  if (n >= 1_000_000) return "$" + (n/1_000_000).toFixed(1).replace(".0","") + "m";
  if (n >= 1_000) return "$" + Math.round(n/1_000) + "k";
  return "$" + n;
};
const foamEsc = s => String(s ?? "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));
const csvEsc = s => {
  const v = String(s ?? "");
  return /[",\n]/.test(v) ? '"' + v.replaceAll('"','""') + '"' : v;
};

const REVIEW_KEY = "cdi-nzfoam-pilot-reviews-v2";
let liveAucklandRecords = [];
let liveTaurangaRecords = [];
let liveFilter = "all";

function allLiveRecords(){ return [...liveAucklandRecords,...liveTaurangaRecords]; }
function recordKey(record){ return `${record.council||"Council"}::${record.consent_reference || record.address || record.description}`; }

function loadReviews(){
  try { return JSON.parse(localStorage.getItem(REVIEW_KEY) || "{}"); }
  catch { return {}; }
}
function saveReviews(reviews){ localStorage.setItem(REVIEW_KEY, JSON.stringify(reviews)); }
function reviewFor(record){ return loadReviews()[recordKey(record)] || {status:"",owner:"",notes:""}; }
function setReview(key, patch){
  const reviews=loadReviews();
  reviews[key]={...(reviews[key]||{status:"",owner:"",notes:""}),...patch,updated_at:new Date().toISOString()};
  saveReviews(reviews);
  renderAllLive();
}

function priorityForScore(score){
  if(score >= 75) return ["High priority","high","score-high","high"];
  if(score >= 55) return ["Qualify","medium","score-medium","qualify"];
  return ["Monitor","low","score-low","monitor"];
}
function reviewLabel(status){
  return status === "relevant" ? "Relevant" :
         status === "watch" ? "Watch" :
         status === "rejected" ? "Not relevant" : "Unreviewed";
}
function reviewMatches(record){
  const review=reviewFor(record);
  const fit = priorityForScore(record.nz_foam_preliminary_fit_score)[3];
  if(liveFilter === "all") return true;
  if(["high","qualify","monitor"].includes(liveFilter)) return fit === liveFilter;
  if(liveFilter === "reviewed") return Boolean(review.status);
  if(liveFilter === "unreviewed") return !review.status;
  return true;
}

function updateTopMetrics(){
  const records=allLiveRecords();
  const high=records.filter(x=>x.nz_foam_preliminary_fit_score>=75);
  const qualify=records.filter(x=>x.nz_foam_preliminary_fit_score>=55 && x.nz_foam_preliminary_fit_score<75);
  const pipeline=[...high,...qualify].reduce((sum,x)=>sum+(Number(x.project_value_nzd)||0),0);
  const set=(id,value)=>{ const el=document.querySelector(id); if(el) el.textContent=value; };
  set("#metricLiveCount",records.length);
  set("#metricHighCount",high.length);
  set("#metricQualifyCount",qualify.length);
  set("#metricPipeline",compactMoney(pipeline));
}

function updatePilotStats(){
  const statuses=allLiveRecords().map(x=>reviewFor(x).status || "");
  const set=(id,value)=>{ const el=document.querySelector(id); if(el) el.textContent=value; };
  set("#pilotReviewed",statuses.filter(Boolean).length);
  set("#pilotRelevant",statuses.filter(x=>x==="relevant").length);
  set("#pilotWatch",statuses.filter(x=>x==="watch").length);
  set("#pilotRejected",statuses.filter(x=>x==="rejected").length);
}

function reviewControls(record){
  const key=recordKey(record);
  const review=reviewFor(record);
  const active=s=>review.status===s?" active":"";
  return `<details class="review-box">
    <summary>Sales review · <strong>${reviewLabel(review.status)}</strong></summary>
    <div class="review-inner">
      <div class="review-buttons">
        <button type="button" class="review-choice${active("relevant")}" data-review-key="${foamEsc(key)}" data-review-status="relevant">Relevant</button>
        <button type="button" class="review-choice${active("watch")}" data-review-key="${foamEsc(key)}" data-review-status="watch">Watch</button>
        <button type="button" class="review-choice${active("rejected")}" data-review-key="${foamEsc(key)}" data-review-status="rejected">Not relevant</button>
      </div>
      <label>Owner<input class="review-owner" data-review-key="${foamEsc(key)}" value="${foamEsc(review.owner||"")}" placeholder="Salesperson"></label>
      <label>Notes<textarea class="review-notes" data-review-key="${foamEsc(key)}" placeholder="Why useful / why not?">${foamEsc(review.notes||"")}</textarea></label>
    </div>
  </details>`;
}

function bindReviewControls(){
  document.querySelectorAll(".review-choice").forEach(btn=>{
    btn.addEventListener("click",()=>setReview(btn.dataset.reviewKey,{status:btn.dataset.reviewStatus}));
  });
  document.querySelectorAll(".review-owner").forEach(input=>{
    input.addEventListener("change",()=>setReview(input.dataset.reviewKey,{owner:input.value.trim()}));
  });
  document.querySelectorAll(".review-notes").forEach(input=>{
    input.addEventListener("change",()=>setReview(input.dataset.reviewKey,{notes:input.value.trim()}));
  });
}

function renderRecord(record){
  const [label,priorityClass,scoreClass]=priorityForScore(record.nz_foam_preliminary_fit_score);
  const products=(record.nz_foam_product_candidates||["Plan review required"]).map(p=>`<span>${foamEsc(p)}</span>`).join("");
  const reasons=(record.nz_foam_score_reasons||[]).slice(0,4).map(r=>foamEsc(r)).join(" · ");
  const review=reviewFor(record);
  const reviewChip=review.status?`<span class="review-chip review-${foamEsc(review.status)}">${reviewLabel(review.status)}</span>`:"";
  const location=record.address?` · ${foamEsc(record.address)}`:"";
  const timing=record.issued_date?`Issued ${foamEsc(record.issued_date)}`:(record.issued_period||record.status||"Issued");

  return `<article class="opportunity live-opportunity">
    <div class="score ${scoreClass}"><span>${record.nz_foam_preliminary_fit_score}</span><small>/100</small></div>
    <div class="opp-main">
      <div class="opp-top"><span class="priority ${priorityClass}">${label}</span><span>${foamEsc(record.council)} · ${foamEsc(record.consent_reference||"reference unavailable")}${location}</span>${reviewChip}</div>
      <h3>${foamEsc(record.description||"Building consent")}</h3>
      <p>${foamMoney(record.project_value_nzd)} · ${foamEsc(timing)} · ${foamEsc(record.status||"Issued")}</p>
      <div class="chips">${products}<span>Verified council record</span></div>
      ${reasons ? `<p class="score-reason"><strong>Score basis:</strong> ${reasons}</p>` : ""}
      <a class="source-link" href="${record.source_url}" target="_blank" rel="noreferrer">Open council source ↗</a>
      ${reviewControls(record)}
    </div>
    <div class="opp-action"><span>Recommended action</span><strong>${foamEsc(record.recommended_action||"Review plans and project team before sales contact.")}</strong></div>
  </article>`;
}

function renderSource(records,rootId,stateId,label,maxVisible=30){
  const root=document.querySelector(rootId);
  const state=document.querySelector(stateId);
  if(!root) return;
  const filtered=records.filter(reviewMatches);
  const visible=filtered.slice(0,maxVisible);
  root.innerHTML=visible.map(renderRecord).join("") || `<div class="notice">No ${foamEsc(label)} opportunities match this pilot filter.</div>`;
  if(state) state.textContent=`${records.length} verified records · showing ${visible.length} · ranked by NZ Foam fit`;
}

function renderAllLive(){
  renderSource(liveAucklandRecords,"#aucklandFoamRecords","#aucklandFoamStatus","Auckland",30);
  renderSource(liveTaurangaRecords,"#taurangaFoamRecords","#taurangaFoamStatus","Tauranga",20);
  bindReviewControls();
  updateTopMetrics();
  updatePilotStats();
}

async function loadLiveSources(){
  const [akl,tga]=await Promise.allSettled([
    fetch("/api/auckland/high-value").then(async r=>{const d=await r.json(); if(!r.ok) throw new Error(d.detail||d.error); return d;}),
    fetch("/api/tauranga/major").then(async r=>{const d=await r.json(); if(!r.ok) throw new Error(d.detail||d.error); return d;})
  ]);

  if(akl.status==="fulfilled"){
    liveAucklandRecords=[...akl.value.records].sort((a,b)=>
      (b.nz_foam_preliminary_fit_score-a.nz_foam_preliminary_fit_score) ||
      (Number(b.project_value_nzd||0)-Number(a.project_value_nzd||0))
    );
  }else{
    const state=document.querySelector("#aucklandFoamStatus");
    if(state) state.textContent="Auckland source temporarily unavailable";
  }

  if(tga.status==="fulfilled"){
    liveTaurangaRecords=[...tga.value.records].sort((a,b)=>
      (b.nz_foam_preliminary_fit_score-a.nz_foam_preliminary_fit_score) ||
      (Number(b.project_value_nzd||0)-Number(a.project_value_nzd||0))
    );
  }else{
    const state=document.querySelector("#taurangaFoamStatus");
    if(state) state.textContent="Tauranga source temporarily unavailable";
  }

  renderAllLive();
}

document.querySelectorAll(".live-filter").forEach(btn=>{
  btn.addEventListener("click",()=>{
    document.querySelectorAll(".live-filter").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    liveFilter=btn.dataset.liveFilter;
    renderAllLive();
  });
});

const exportButton=document.querySelector("#exportPilotCsv");
if(exportButton){
  exportButton.addEventListener("click",()=>{
    const headers=["Council","Consent Reference","Address","Issued Date / Period","Description","Project Value NZD","CDI Fit Score","Fit Band","Product Candidates","Score Reasons","Recommended Action","Sales Review","Owner","Notes","Source URL"];
    const rows=allLiveRecords().map(x=>{
      const review=reviewFor(x);
      return [
        x.council,x.consent_reference,x.address||"",x.issued_date||x.issued_period||"",x.description,x.project_value_nzd,
        x.nz_foam_preliminary_fit_score,x.nz_foam_fit_band,(x.nz_foam_product_candidates||[]).join("; "),
        (x.nz_foam_score_reasons||[]).join("; "),x.recommended_action,reviewLabel(review.status),review.owner||"",review.notes||"",x.source_url
      ];
    });
    const csv=[headers,...rows].map(row=>row.map(csvEsc).join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download="NZ-Foam-Project-Radar-Pilot.csv";
    document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
  });
}

loadLiveSources();
