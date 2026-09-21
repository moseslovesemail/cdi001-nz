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

const REVIEW_KEY = "cdi-nzfoam-pilot-reviews-v1";
let liveAucklandRecords = [];
let liveFilter = "all";

function loadReviews(){
  try { return JSON.parse(localStorage.getItem(REVIEW_KEY) || "{}"); }
  catch { return {}; }
}
function saveReviews(reviews){
  localStorage.setItem(REVIEW_KEY, JSON.stringify(reviews));
}
function reviewFor(ref){
  return loadReviews()[ref] || {status:"",owner:"",notes:""};
}
function setReview(ref, patch){
  const reviews=loadReviews();
  reviews[ref]={...(reviews[ref]||{status:"",owner:"",notes:""}),...patch,updated_at:new Date().toISOString()};
  saveReviews(reviews);
  updatePilotStats();
  renderAuckland();
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
  const review=reviewFor(record.consent_reference || record.description);
  const fit = priorityForScore(record.nz_foam_preliminary_fit_score)[3];
  if(liveFilter === "all") return true;
  if(["high","qualify","monitor"].includes(liveFilter)) return fit === liveFilter;
  if(liveFilter === "reviewed") return Boolean(review.status);
  if(liveFilter === "unreviewed") return !review.status;
  return true;
}

function updateTopMetrics(){
  const high=liveAucklandRecords.filter(x=>x.nz_foam_preliminary_fit_score>=75);
  const qualify=liveAucklandRecords.filter(x=>x.nz_foam_preliminary_fit_score>=55 && x.nz_foam_preliminary_fit_score<75);
  const pipeline=[...high,...qualify].reduce((sum,x)=>sum+(Number(x.project_value_nzd)||0),0);
  const set=(id,value)=>{ const el=document.querySelector(id); if(el) el.textContent=value; };
  set("#metricLiveCount",liveAucklandRecords.length);
  set("#metricHighCount",high.length);
  set("#metricQualifyCount",qualify.length);
  set("#metricPipeline",compactMoney(pipeline));
}

function updatePilotStats(){
  const reviews=loadReviews();
  const statuses=liveAucklandRecords.map(x=>reviews[x.consent_reference || x.description]?.status || "");
  const set=(id,value)=>{ const el=document.querySelector(id); if(el) el.textContent=value; };
  set("#pilotReviewed",statuses.filter(Boolean).length);
  set("#pilotRelevant",statuses.filter(x=>x==="relevant").length);
  set("#pilotWatch",statuses.filter(x=>x==="watch").length);
  set("#pilotRejected",statuses.filter(x=>x==="rejected").length);
}

function reviewControls(record){
  const ref=record.consent_reference || record.description;
  const review=reviewFor(ref);
  const active=s=>review.status===s?" active":"";
  return `<details class="review-box">
    <summary>Sales review · <strong>${reviewLabel(review.status)}</strong></summary>
    <div class="review-inner">
      <div class="review-buttons">
        <button type="button" class="review-choice${active("relevant")}" data-review-ref="${foamEsc(ref)}" data-review-status="relevant">Relevant</button>
        <button type="button" class="review-choice${active("watch")}" data-review-ref="${foamEsc(ref)}" data-review-status="watch">Watch</button>
        <button type="button" class="review-choice${active("rejected")}" data-review-ref="${foamEsc(ref)}" data-review-status="rejected">Not relevant</button>
      </div>
      <label>Owner<input class="review-owner" data-review-ref="${foamEsc(ref)}" value="${foamEsc(review.owner||"")}" placeholder="Salesperson"></label>
      <label>Notes<textarea class="review-notes" data-review-ref="${foamEsc(ref)}" placeholder="Why useful / why not?">${foamEsc(review.notes||"")}</textarea></label>
    </div>
  </details>`;
}

function bindReviewControls(){
  document.querySelectorAll(".review-choice").forEach(btn=>{
    btn.addEventListener("click",()=>setReview(btn.dataset.reviewRef,{status:btn.dataset.reviewStatus}));
  });
  document.querySelectorAll(".review-owner").forEach(input=>{
    input.addEventListener("change",()=>setReview(input.dataset.reviewRef,{owner:input.value.trim()}));
  });
  document.querySelectorAll(".review-notes").forEach(input=>{
    input.addEventListener("change",()=>setReview(input.dataset.reviewRef,{notes:input.value.trim()}));
  });
}

function renderAuckland(){
  const root=document.querySelector("#aucklandFoamRecords");
  if(!root) return;
  const filtered=liveAucklandRecords.filter(reviewMatches);
  const visible=filtered.slice(0,30);
  root.innerHTML=visible.map(x=>{
    const [label,priorityClass,scoreClass]=priorityForScore(x.nz_foam_preliminary_fit_score);
    const products=(x.nz_foam_product_candidates||["Plan review required"]).map(p=>`<span>${foamEsc(p)}</span>`).join("");
    const reasons=(x.nz_foam_score_reasons||[]).slice(0,4).map(r=>foamEsc(r)).join(" · ");
    const review=reviewFor(x.consent_reference||x.description);
    const reviewChip=review.status?`<span class="review-chip review-${foamEsc(review.status)}">${reviewLabel(review.status)}</span>`:"";

    return `<article class="opportunity live-opportunity" data-fit-band="${foamEsc(x.nz_foam_fit_band||"")}">
      <div class="score ${scoreClass}"><span>${x.nz_foam_preliminary_fit_score}</span><small>/100</small></div>
      <div class="opp-main">
        <div class="opp-top"><span class="priority ${priorityClass}">${label}</span><span>Auckland Council · ${foamEsc(x.consent_reference||"reference unavailable")}</span>${reviewChip}</div>
        <h3>${foamEsc(x.description||x.application_subtype||"High-value building consent")}</h3>
        <p>${foamMoney(x.project_value_nzd)} · Issued ${foamEsc(x.issued_date||"date unavailable")} · ${foamEsc(x.status||"status unavailable")}</p>
        <div class="chips">${products}<span>Live council record</span></div>
        ${reasons ? `<p class="score-reason"><strong>Score basis:</strong> ${reasons}</p>` : ""}
        <a class="source-link" href="${x.source_url}" target="_blank" rel="noreferrer">Open Auckland Council source ↗</a>
        ${reviewControls(x)}
      </div>
      <div class="opp-action"><span>Recommended action</span><strong>${foamEsc(x.recommended_action||"Review plans and project team before sales contact.")}</strong></div>
    </article>`;
  }).join("") || `<div class="notice">No opportunities match this pilot filter.</div>`;

  const state=document.querySelector("#aucklandFoamStatus");
  if(state) state.textContent=`${liveAucklandRecords.length} unique live consents · showing ${visible.length} · ranked by NZ Foam fit`;
  bindReviewControls();
  updatePilotStats();
}

async function loadAucklandFoam(){
  const root=document.querySelector("#aucklandFoamRecords");
  const state=document.querySelector("#aucklandFoamStatus");
  if(!root||!state) return;

  try{
    const response=await fetch("/api/auckland/high-value");
    const data=await response.json();
    if(!response.ok) throw new Error(data.detail||data.error||"Unable to load Auckland data");

    liveAucklandRecords=[...data.records].sort((a,b) =>
      (b.nz_foam_preliminary_fit_score-a.nz_foam_preliminary_fit_score) ||
      (Number(b.project_value_nzd||0)-Number(a.project_value_nzd||0)) ||
      String(b.issued_date||"").localeCompare(String(a.issued_date||""))
    );

    updateTopMetrics();
    renderAuckland();
  }catch(error){
    state.textContent="Auckland source temporarily unavailable";
    root.innerHTML=`<div class="notice">Live Auckland adapter could not load: ${foamEsc(error.message)}</div>`;
  }
}

document.querySelectorAll(".live-filter").forEach(btn=>{
  btn.addEventListener("click",()=>{
    document.querySelectorAll(".live-filter").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    liveFilter=btn.dataset.liveFilter;
    renderAuckland();
  });
});

const exportButton=document.querySelector("#exportPilotCsv");
if(exportButton){
  exportButton.addEventListener("click",()=>{
    const reviews=loadReviews();
    const headers=["Consent Reference","Issued Date","Description","Project Value NZD","CDI Fit Score","Fit Band","Product Candidates","Score Reasons","Recommended Action","Sales Review","Owner","Notes","Source URL"];
    const rows=liveAucklandRecords.map(x=>{
      const review=reviews[x.consent_reference||x.description]||{};
      return [
        x.consent_reference,x.issued_date,x.description,x.project_value_nzd,x.nz_foam_preliminary_fit_score,x.nz_foam_fit_band,
        (x.nz_foam_product_candidates||[]).join("; "),(x.nz_foam_score_reasons||[]).join("; "),x.recommended_action,
        reviewLabel(review.status),review.owner||"",review.notes||"",x.source_url
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

loadAucklandFoam();
