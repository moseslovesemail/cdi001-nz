const jacobMoney=n=>n?new Intl.NumberFormat("en-NZ",{style:"currency",currency:"NZD",maximumFractionDigits:0}).format(n):"Value not published";
const jacobEsc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));

async function getJson(url){
  const response=await fetch(url);
  const data=await response.json();
  if(!response.ok) throw new Error(data.detail||data.error||"Unable to load live data");
  return data;
}

async function loadJacobProof(){
  const state=document.querySelector("#jacobLiveState");
  const root=document.querySelector("#jacobLiveRecords");
  if(!state||!root) return;
  try{
    const data=await getJson("/api/nz-foam/live");
    const all=[
      ...(data.sources?.auckland?.records||[]),
      ...(data.sources?.tauranga?.records||[]),
      ...(data.sources?.canterbury?.records||[])
    ];
    const top=[...all]
      .sort((a,b)=>(b.nz_foam_preliminary_fit_score-a.nz_foam_preliminary_fit_score)||((b.project_value_nzd||0)-(a.project_value_nzd||0)))
      .slice(0,6);
    const high=data.summary?.high_fit ?? all.filter(x=>x.nz_foam_preliminary_fit_score>=75).length;
    const qualify=data.summary?.qualify ?? all.filter(x=>x.nz_foam_preliminary_fit_score>=55&&x.nz_foam_preliminary_fit_score<75).length;
    state.textContent=`${all.length} verified records across 3 live source groups · ${high} high fit · ${qualify} qualify · showing top 6`;
    root.innerHTML=top.map(x=>`<article class="opportunity">
      <div class="score ${x.nz_foam_preliminary_fit_score>=75?"score-high":"score-medium"}"><span>${x.nz_foam_preliminary_fit_score}</span><small>/100</small></div>
      <div class="opp-main">
        <div class="opp-top"><span class="priority ${x.nz_foam_preliminary_fit_score>=75?"high":"medium"}">${jacobEsc(x.nz_foam_fit_band)}</span><span>${jacobEsc(x.council)} · ${jacobEsc(x.consent_reference||"verified signal")}${x.address?" · "+jacobEsc(x.address):""}</span></div>
        <h3>${jacobEsc(x.description)}</h3>
        <p>${jacobMoney(x.project_value_nzd)} · ${jacobEsc(x.issued_date||x.issued_period||x.status||"")}</p>
        <div class="chips">${(x.nz_foam_product_candidates||[]).map(p=>`<span>${jacobEsc(p)}</span>`).join("")}</div>
        <p class="score-reason"><strong>Why it scored:</strong> ${jacobEsc((x.nz_foam_score_reasons||[]).slice(0,4).join(" · "))}</p>
        <a class="source-link" href="${x.source_url}" target="_blank" rel="noreferrer">Open council source ↗</a>
      </div>
      <div class="opp-action">
        <span>Recommended action</span>
        <strong>${jacobEsc(x.recommended_action)}</strong>
        <a class="button project-open-button" href="/nz-foam/project/?key=${encodeURIComponent((x.council||"Council")+"::"+(x.consent_reference||x.address||x.description))}">Open project →</a>
      </div>
    </article>`).join("");
  }catch(error){
    state.textContent="Live source temporarily unavailable";
    root.innerHTML=`<div class="notice">${jacobEsc(error.message)}</div>`;
  }
}
loadJacobProof();
