const buttons = [...document.querySelectorAll(".radar-filter")];
const examples = [...document.querySelectorAll("#opportunityList .opportunity")];
const search = document.querySelector("#projectSearch");
let category = "all";

function applyFilters() {
  if (!search) return;
  const q = (search.value || "").trim().toLowerCase();
  examples.forEach((item) => {
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
  return "$" + Math.round(n);
};
const foamEsc = s => String(s ?? "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));
const csvEsc = s => {
  const v = String(s ?? "");
  return /[",\n]/.test(v) ? '"' + v.replaceAll('"','""') + '"' : v;
};

const REVIEW_KEY = "cdi-nzfoam-pilot-reviews-v2";
let liveCanterburyRecords = [];
let liveAucklandRecords = [];
let liveTaurangaRecords = [];
let liveFilter = "all";

function allLiveRecords(){ return [...liveAucklandRecords,...liveTaurangaRecords,...liveCanterburyRecords]; }
function recordKey(record){ return `${record.council||"Council"}::${record.consent_reference || record.address || record.description}`; }
function blankReview(){ return {status:"",owner:"",notes:"",contacted:false,plans:false,quote_value:0,outcome:"open",revenue_won:0}; }

let reviewState = null;
function loadReviews(){
  if (reviewState) return reviewState;
  try { reviewState = JSON.parse(localStorage.getItem(REVIEW_KEY) || "{}"); }
  catch { reviewState = {}; }
  return reviewState;
}
function saveReviews(reviews){
  reviewState = reviews;
  localStorage.setItem(REVIEW_KEY, JSON.stringify(reviews));
}
function reviewFor(record){ return {...blankReview(),...(loadReviews()[recordKey(record)]||{})}; }
function setReview(key, patch, rerender=true){
  const reviews=loadReviews();
  reviews[key]={...blankReview(),...(reviews[key]||{}),...patch,updated_at:new Date().toISOString()};
  saveReviews(reviews);
  if(rerender) renderAllLive();
  else updatePilotStats();
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
function outcomeLabel(outcome){
  return outcome === "won" ? "Won" :
         outcome === "lost" ? "Lost" :
         outcome === "no-fit" ? "No fit" : "Open";
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
  const reviews=allLiveRecords().map(reviewFor);
  const set=(id,value)=>{ const el=document.querySelector(id); if(el) el.textContent=value; };
  set("#pilotReviewed",reviews.filter(x=>Boolean(x.status)).length);
  set("#pilotRelevant",reviews.filter(x=>x.status==="relevant").length);
  set("#pilotContacted",reviews.filter(x=>Boolean(x.contacted)).length);
  set("#pilotPlans",reviews.filter(x=>Boolean(x.plans)).length);
  set("#pilotQuotePipeline",compactMoney(reviews.reduce((sum,x)=>sum+(Number(x.quote_value)||0),0)));
  set("#pilotWonRevenue",compactMoney(reviews.reduce((sum,x)=>sum+(Number(x.revenue_won)||0),0)));
}

function reviewControls(record){
  const key=recordKey(record);
  const review=reviewFor(record);
  const active=s=>review.status===s?" active":"";
  return `<details class="review-box">
    <summary>Sales review · <strong>${reviewLabel(review.status)}</strong>${review.outcome==="won" ? " · WON" : ""}</summary>
    <div class="review-inner review-inner-full">
      <div class="review-buttons">
        <button type="button" class="review-choice${active("relevant")}" data-review-key="${foamEsc(key)}" data-review-status="relevant">Relevant</button>
        <button type="button" class="review-choice${active("watch")}" data-review-key="${foamEsc(key)}" data-review-status="watch">Watch</button>
        <button type="button" class="review-choice${active("rejected")}" data-review-key="${foamEsc(key)}" data-review-status="rejected">Not relevant</button>
      </div>
      <label>Owner<input class="review-field" data-review-key="${foamEsc(key)}" data-review-field="owner" value="${foamEsc(review.owner||"")}" placeholder="Salesperson"></label>
      <label>Contacted<select class="review-field" data-review-key="${foamEsc(key)}" data-review-field="contacted"><option value="false"${!review.contacted?" selected":""}>No</option><option value="true"${review.contacted?" selected":""}>Yes</option></select></label>
      <label>Plans received<select class="review-field" data-review-key="${foamEsc(key)}" data-review-field="plans"><option value="false"${!review.plans?" selected":""}>No</option><option value="true"${review.plans?" selected":""}>Yes</option></select></label>
      <label>Quote value NZD<input class="review-field" type="number" min="0" step="100" data-review-key="${foamEsc(key)}" data-review-field="quote_value" value="${Number(review.quote_value)||""}" placeholder="0"></label>
      <label>Outcome<select class="review-field" data-review-key="${foamEsc(key)}" data-review-field="outcome"><option value="open"${review.outcome==="open"?" selected":""}>Open</option><option value="won"${review.outcome==="won"?" selected":""}>Won</option><option value="lost"${review.outcome==="lost"?" selected":""}>Lost</option><option value="no-fit"${review.outcome==="no-fit"?" selected":""}>No fit</option></select></label>
      <label>Revenue won NZD<input class="review-field" type="number" min="0" step="100" data-review-key="${foamEsc(key)}" data-review-field="revenue_won" value="${Number(review.revenue_won)||""}" placeholder="0"></label>
      <label class="review-notes-label">Notes<textarea class="review-field" data-review-key="${foamEsc(key)}" data-review-field="notes" placeholder="Why useful / why not? What happened next?">${foamEsc(review.notes||"")}</textarea></label>
    </div>
  </details>`;
}

function bindReviewControls(){
  document.querySelectorAll(".review-choice").forEach(btn=>{
    btn.addEventListener("click",()=>setReview(btn.dataset.reviewKey,{status:btn.dataset.reviewStatus}));
  });
  document.querySelectorAll(".review-field").forEach(input=>{
    input.addEventListener("change",()=>{
      const field=input.dataset.reviewField;
      let value=input.value;
      if(field==="contacted" || field==="plans") value=value==="true";
      if(field==="quote_value" || field==="revenue_won") value=Number(value)||0;
      setReview(input.dataset.reviewKey,{[field]:value},false);
    });
  });
}

function renderRecord(record){
  const [label,priorityClass,scoreClass]=priorityForScore(record.nz_foam_preliminary_fit_score);
  const products=(record.nz_foam_product_candidates||["Plan review required"]).map(p=>`<span>${foamEsc(p)}</span>`).join("");
  const reasons=(record.nz_foam_score_reasons||[]).slice(0,4).map(r=>foamEsc(r)).join(" · ");
  const review=reviewFor(record);
  const reviewChip=review.status?`<span class="review-chip review-${foamEsc(review.status)}">${reviewLabel(review.status)}</span>`:"";
  const outcomeChip=review.outcome && review.outcome!=="open" ? `<span class="review-chip outcome-${foamEsc(review.outcome)}">${outcomeLabel(review.outcome)}</span>` : "";
  const location=record.address?` · ${foamEsc(record.address)}`:"";
  const timing=record.issued_date?`Issued ${foamEsc(record.issued_date)}`:(record.issued_period||record.status||"Issued");

  return `<article class="opportunity live-opportunity">
    <div class="score ${scoreClass}"><span>${record.nz_foam_preliminary_fit_score}</span><small>/100</small></div>
    <div class="opp-main">
      <div class="opp-top"><span class="priority ${priorityClass}">${label}</span><span>${foamEsc(record.council)} · ${foamEsc(record.consent_reference||"reference unavailable")}${location}</span>${reviewChip}${outcomeChip}</div>
      <h3>${foamEsc(record.description||"Consent signal")}</h3>
      <p>${foamMoney(record.project_value_nzd)} · ${foamEsc(timing)} · ${foamEsc(record.status||"Signal")}</p>
      <div class="chips">${products}<span>Verified council record</span></div>
      ${reasons ? `<p class="score-reason"><strong>Score basis:</strong> ${reasons}</p>` : ""}
      <a class="source-link" href="${record.source_url}" target="_blank" rel="noreferrer">Open council source ↗</a>
      ${reviewControls(record)}
    </div>
    <div class="opp-action">
      <span>Recommended action</span>
      <strong>${foamEsc(record.recommended_action||"Review plans and project team before sales contact.")}</strong>
      <a class="button project-open-button" href="/nz-foam/project/?key=${encodeURIComponent(recordKey(record))}">Open project →</a>
    </div>
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
  renderSource(liveCanterburyRecords,"#canterburyFoamRecords","#canterburyFoamStatus","Canterbury",20);
  renderSource(liveAucklandRecords,"#aucklandFoamRecords","#aucklandFoamStatus","Auckland",30);
  renderSource(liveTaurangaRecords,"#taurangaFoamRecords","#taurangaFoamStatus","Tauranga",20);
  bindReviewControls();
  updateTopMetrics();
  updatePilotStats();
}

async function fetchJsonEndpoint(url){
  const r=await fetch(url);
  const d=await r.json();
  if(!r.ok) throw new Error(d.detail||d.error||"Unable to load");
  return d;
}

async function loadLiveSources(){
  try{
    const data=await fetchJsonEndpoint("/api/nz-foam/live");
    liveCanterburyRecords=[...(data.sources?.canterbury?.records||[])].sort((a,b)=>b.nz_foam_preliminary_fit_score-a.nz_foam_preliminary_fit_score);
    liveAucklandRecords=[...(data.sources?.auckland?.records||[])].sort((a,b)=>(b.nz_foam_preliminary_fit_score-a.nz_foam_preliminary_fit_score)||(Number(b.project_value_nzd||0)-Number(a.project_value_nzd||0)));
    liveTaurangaRecords=[...(data.sources?.tauranga?.records||[])].sort((a,b)=>(b.nz_foam_preliminary_fit_score-a.nz_foam_preliminary_fit_score)||(Number(b.project_value_nzd||0)-Number(a.project_value_nzd||0)));
    renderAllLive();
  }catch(error){
    ["#canterburyFoamStatus","#aucklandFoamStatus","#taurangaFoamStatus"].forEach(selector=>{
      const el=document.querySelector(selector);
      if(el) el.textContent="Live feed temporarily unavailable";
    });
    const root=document.querySelector("#aucklandFoamRecords");
    if(root) root.innerHTML=`<div class="notice">${foamEsc(error.message||"Unable to load live feed")}</div>`;
  }
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
    const headers=["Council","Consent Reference","Address","Issued Date / Period","Description","Project Value NZD","NZ Foam Fit Score","Fit Band","Product Candidates","Score Reasons","Recommended Action","Sales Review","Owner","Contacted","Plans Received","Quote Value NZD","Outcome","Revenue Won NZD","Notes","Source URL"];
    const rows=allLiveRecords().map(x=>{
      const review=reviewFor(x);
      return [
        x.council,x.consent_reference,x.address||"",x.issued_date||x.issued_period||"",x.description,x.project_value_nzd,
        x.nz_foam_preliminary_fit_score,x.nz_foam_fit_band,(x.nz_foam_product_candidates||[]).join("; "),
        (x.nz_foam_score_reasons||[]).join("; "),x.recommended_action,reviewLabel(review.status),review.owner||"",
        review.contacted?"Yes":"No",review.plans?"Yes":"No",review.quote_value||0,outcomeLabel(review.outcome),review.revenue_won||0,review.notes||"",x.source_url
      ];
    });
    const csv=[headers,...rows].map(row=>row.map(csvEsc).join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download="NZ-Foam-Project-Reviews.csv";
    document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
  });
}

loadLiveSources();
