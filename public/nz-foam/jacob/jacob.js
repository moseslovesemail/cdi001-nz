const jacobMoney=n=>n?new Intl.NumberFormat("en-NZ",{style:"currency",currency:"NZD",maximumFractionDigits:0}).format(n):"Value not published";
const jacobEsc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));

async function loadJacobProof(){
  const state=document.querySelector("#jacobLiveState");
  const root=document.querySelector("#jacobLiveRecords");
  if(!state||!root) return;
  try{
    const response=await fetch("/api/auckland/high-value");
    const data=await response.json();
    if(!response.ok) throw new Error(data.detail||data.error||"Unable to load live data");
    const top=[...data.records]
      .sort((a,b)=>(b.nz_foam_preliminary_fit_score-a.nz_foam_preliminary_fit_score)||((b.project_value_nzd||0)-(a.project_value_nzd||0)))
      .slice(0,3);
    state.textContent=`${data.unique_consents_returned} unique Auckland consents currently available · showing top 3 by NZ Foam fit`;
    root.innerHTML=top.map(x=>`<article class="opportunity">
      <div class="score ${x.nz_foam_preliminary_fit_score>=75?"score-high":"score-medium"}"><span>${x.nz_foam_preliminary_fit_score}</span><small>/100</small></div>
      <div class="opp-main">
        <div class="opp-top"><span class="priority ${x.nz_foam_preliminary_fit_score>=75?"high":"medium"}">${jacobEsc(x.nz_foam_fit_band)}</span><span>Auckland Council · ${jacobEsc(x.consent_reference)}</span></div>
        <h3>${jacobEsc(x.description)}</h3>
        <p>${jacobMoney(x.project_value_nzd)} · Issued ${jacobEsc(x.issued_date)}</p>
        <div class="chips">${(x.nz_foam_product_candidates||[]).map(p=>`<span>${jacobEsc(p)}</span>`).join("")}</div>
        <p class="score-reason"><strong>Why it scored:</strong> ${jacobEsc((x.nz_foam_score_reasons||[]).slice(0,4).join(" · "))}</p>
      </div>
      <div class="opp-action"><span>Recommended action</span><strong>${jacobEsc(x.recommended_action)}</strong></div>
    </article>`).join("");
  }catch(error){
    state.textContent="Live source temporarily unavailable";
    root.innerHTML=`<div class="notice">${jacobEsc(error.message)}</div>`;
  }
}
loadJacobProof();