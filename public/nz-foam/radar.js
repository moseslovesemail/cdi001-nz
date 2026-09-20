const buttons = [...document.querySelectorAll(".radar-filter")];
const opportunities = [...document.querySelectorAll(".opportunity")];
const search = document.querySelector("#projectSearch");
let category = "all";

function applyFilters() {
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

search.addEventListener("input", applyFilters);


const foamMoney = n => n ? new Intl.NumberFormat("en-NZ",{style:"currency",currency:"NZD",maximumFractionDigits:0}).format(n) : "Value not published";
const foamEsc = s => String(s ?? "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));

function priorityForScore(score){
  if(score >= 75) return ["High priority","high","score-high"];
  if(score >= 55) return ["Qualify","medium","score-medium"];
  return ["Monitor","low","score-low"];
}

async function loadAucklandFoam(){
  const root=document.querySelector("#aucklandFoamRecords");
  const state=document.querySelector("#aucklandFoamStatus");
  if(!root||!state) return;
  try{
    const response=await fetch("/api/auckland/high-value");
    const data=await response.json();
    if(!response.ok) throw new Error(data.detail||data.error||"Unable to load Auckland data");
    state.textContent=`${data.records.length} latest records returned from council API`;
    root.innerHTML=data.records.map(x=>{
      const [label,priorityClass,scoreClass]=priorityForScore(x.nz_foam_preliminary_fit_score);
      return `<article class="opportunity">
        <div class="score ${scoreClass}"><span>${x.nz_foam_preliminary_fit_score}</span><small>/100</small></div>
        <div class="opp-main">
          <div class="opp-top"><span class="priority ${priorityClass}">${label}</span><span>Auckland Council · ${foamEsc(x.consent_reference||"reference unavailable")}</span></div>
          <h3>${foamEsc(x.description||x.application_subtype||"High-value building consent")}</h3>
          <p>${foamMoney(x.project_value_nzd)} · Issued ${foamEsc(x.issued_date||"date unavailable")} · ${foamEsc(x.application_subtype||"type not published")}</p>
          <div class="chips"><span>$1m+ council layer</span><span>Building consent</span><span>Plan review required</span></div>
          <a class="source-link" href="${x.source_url}" target="_blank" rel="noreferrer">Open Auckland Council source ↗</a>
        </div>
        <div class="opp-action"><span>Recommended action</span><strong>${x.nz_foam_preliminary_fit_score>=75?"Prioritise plan/specification research and identify builder, architect or project manager.":x.nz_foam_preliminary_fit_score>=55?"Review description and plans before assigning to sales.":"Monitor unless project detail reveals stronger insulation relevance."}</strong></div>
      </article>`;
    }).join("");
  }catch(error){
    state.textContent="Auckland source temporarily unavailable";
    root.innerHTML=`<div class="notice">Live Auckland adapter could not load: ${foamEsc(error.message)}</div>`;
  }
}
loadAucklandFoam();
