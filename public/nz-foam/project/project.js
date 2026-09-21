const REVIEW_KEY="cdi-nzfoam-pilot-reviews-v2";
const money=n=>n?new Intl.NumberFormat("en-NZ",{style:"currency",currency:"NZD",maximumFractionDigits:0}).format(n):"Value not published";
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));
const params=new URLSearchParams(location.search);
const projectKey=params.get("key")||"";

function recordKey(record){return `${record.council||"Council"}::${record.consent_reference||record.address||record.description}`;}
function blankReview(){return {status:"",owner:"",notes:"",contacted:false,plans:false,quote_value:0,outcome:"open",revenue_won:0};}
function loadReviews(){try{return JSON.parse(localStorage.getItem(REVIEW_KEY)||"{}")}catch{return {}}}
function reviewFor(record){return {...blankReview(),...(loadReviews()[recordKey(record)]||{})}}
function saveReview(record,patch){
  const reviews=loadReviews(),key=recordKey(record);
  reviews[key]={...blankReview(),...(reviews[key]||{}),...patch,updated_at:new Date().toISOString()};
  localStorage.setItem(REVIEW_KEY,JSON.stringify(reviews));
  const status=document.querySelector("#saveStatus");
  if(status){status.textContent="Saved in this browser · "+new Date().toLocaleTimeString("en-NZ",{hour:"2-digit",minute:"2-digit"});}
}
async function getJson(url){const r=await fetch(url);const d=await r.json();if(!r.ok)throw new Error(d.detail||d.error||"Unable to load");return d;}

function fitClass(score){return score>=75?"score-high":score>=55?"score-medium":"score-low";}
function fallbackRole(record){
  const status=(record.status||"").toLowerCase();
  const family=(record.consent_family||"").toLowerCase();
  if(family==="resource"||status.includes("notified")||status.includes("lodged")) return "Target the developer/client, architect or project manager while design decisions may still be open.";
  if(status.includes("issued")) return "Target the main contractor or project manager first; ask who owns the insulation, roofing or building-envelope package.";
  return "Target the project manager, architect or main contractor and verify who controls the relevant package.";
}
function outreachFor(record,enrichment,best){
  const project=enrichment?.project_name||record.description||"project";
  const recipient=best?.direct_person_contact&&best?.person?best.person:(best?.organisation?best.organisation+" team":"there");
  const route=best?.contact_note ? "\n\nI’m hoping you can point me to the person responsible for this package." : "";
  return `Hi ${recipient},

I’m getting in touch regarding ${project}${record.address?" at "+record.address:""}.

NZ Foam works on spray-applied insulation, commercial/industrial insulation and WarmCore roofing systems. Based on the published project information, this looks like a project where it may be useful for us to review the plans before the insulation or roof-envelope package is fully committed.

If those decisions are still open, we’d be happy to review the drawings and provide recommendations and pricing.${route}

Are you the right person to speak with, or could you point me toward whoever is managing that part of the project?

Thanks,
NZ Foam`;
}

function contactButtons(entity,record,enrichment){
  const project=enrichment?.project_name||record.description||"project";
  const subject=encodeURIComponent(`NZ Foam — ${project}`);
  const body=encodeURIComponent(outreachFor(record,enrichment,entity));
  const parts=[];
  if(entity.email) parts.push(`<a class="button primary" href="mailto:${esc(entity.email)}?subject=${subject}&body=${body}">Email</a>`);
  if(entity.phone) parts.push(`<a class="button" href="tel:${esc(entity.phone.replace(/\s/g,""))}">Call</a>`);
  if(entity.website) parts.push(`<a class="button" href="${esc(entity.website)}" target="_blank" rel="noreferrer">Website</a>`);
  if(entity.profile_url) parts.push(`<a class="button" href="${esc(entity.profile_url)}" target="_blank" rel="noreferrer">Profile</a>`);
  return parts.join("");
}

function renderContact(entity,record,enrichment){
  return `<article class="contact-card ${entity.recommended?"best-contact":""}">
    <div>
      ${entity.recommended?'<div class="best-badge">Recommended contact route</div>':""}
      <h3>${esc(entity.organisation)}</h3>
      <div class="contact-role">${esc(entity.role)}${entity.person?" · "+esc(entity.person)+(entity.person_role?" — "+esc(entity.person_role):""):""}</div>
      <div class="confidence-row">
        <span>Project link: ${esc(entity.project_relationship_confidence)}</span>
        <span>Contact route: ${esc(entity.contact_route_confidence)}</span>
      </div>
    </div>
    <div>
      <p class="contact-note">${esc(entity.contact_note||"")}</p>
      <p class="contact-note"><strong>Source:</strong> ${esc(entity.source_label||"Public professional source")}</p>
    </div>
    <div class="contact-buttons">${contactButtons(entity,record,enrichment)}</div>
  </article>`;
}

function renderFacts(record){
  const rows=[
    ["Council",record.council],
    ["Reference",record.consent_reference],
    ["Address",record.address],
    ["Stage",record.status],
    ["Consent family",record.consent_family],
    ["Project value",record.project_value_nzd?money(record.project_value_nzd):null],
    ["Issued / detected",record.issued_date||record.issued_period],
    ["Source confidence",record.source_confidence]
  ].filter(x=>x[1]);
  return rows.map(([a,b])=>`<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join("");
}

function bindReview(record){
  const review=reviewFor(record);
  const fields={
    detailStatus:["status",review.status],
    detailOwner:["owner",review.owner],
    detailContacted:["contacted",String(Boolean(review.contacted))],
    detailPlans:["plans",String(Boolean(review.plans))],
    detailQuote:["quote_value",review.quote_value||""],
    detailOutcome:["outcome",review.outcome||"open"],
    detailRevenue:["revenue_won",review.revenue_won||""],
    detailNotes:["notes",review.notes||""]
  };
  Object.entries(fields).forEach(([id,[field,value]])=>{
    const el=document.getElementById(id); if(!el)return; el.value=value;
    el.addEventListener("change",()=>{
      let v=el.value;
      if(field==="contacted"||field==="plans")v=v==="true";
      if(field==="quote_value"||field==="revenue_won")v=Number(v)||0;
      saveReview(record,{[field]:v});
    });
  });
  const mark=document.querySelector("#markContacted");
  if(mark){
    mark.textContent=review.contacted?"Contacted ✓":"Mark contacted";
    mark.addEventListener("click",()=>{saveReview(record,{contacted:true});mark.textContent="Contacted ✓";document.querySelector("#detailContacted").value="true";});
  }
}

async function loadProject(){
  const loading=document.querySelector("#projectLoading"),app=document.querySelector("#projectApp"),error=document.querySelector("#projectError");
  try{
    if(!projectKey)throw new Error("No project key was supplied.");
    const [can,akl,tga,enrich]=await Promise.all([
      getJson("/api/canterbury/verified"),getJson("/api/auckland/high-value"),getJson("/api/tauranga/major"),getJson("/data/project-enrichment.json")
    ]);
    const all=[...(akl.records||[]),...(tga.records||[]),...(can.records||[])];
    const record=all.find(x=>recordKey(x)===projectKey);
    if(!record)throw new Error("This project could not be found in the current live feed.");
    const enrichment=enrich.projects?.[projectKey]||null;
    const entities=enrichment?.entities||[];
    const best=entities.find(x=>x.recommended)||entities[0]||null;

    document.title=(enrichment?.project_name||record.description||"Project")+" — NZ Foam Project Radar";
    document.querySelector("#projectCouncil").textContent=record.council+" · "+(record.consent_reference||"verified signal");
    document.querySelector("#projectTitle").textContent=enrichment?.project_name||record.description||"Project";
    document.querySelector("#projectMeta").textContent=[record.address,record.project_value_nzd?money(record.project_value_nzd):null,record.status].filter(Boolean).join(" · ");
    document.querySelector("#projectSource").href=record.source_url;
    const score=document.querySelector("#projectScore");score.className="score "+fitClass(record.nz_foam_preliminary_fit_score);score.querySelector("span").textContent=record.nz_foam_preliminary_fit_score;
    document.querySelector("#projectFitBand").textContent=record.nz_foam_fit_band||"MONITOR";
    document.querySelector("#fitProducts").innerHTML=(record.nz_foam_product_candidates||["Plan review required"]).map(x=>`<span>${esc(x)}</span>`).join("");
    document.querySelector("#scoreReasons").innerHTML="<strong>Score basis:</strong> "+esc((record.nz_foam_score_reasons||[]).join(" · ")||"Published council description and project context.");
    document.querySelector("#recommendedAction").textContent=record.recommended_action||fallbackRole(record);
    document.querySelector("#projectFacts").innerHTML=renderFacts(record);
    document.querySelector("#stageNote").textContent=enrichment?.stage_note||"No additional linked-stage note is loaded yet.";
    document.querySelector("#contactStrategy").textContent=enrichment?.recommended_contact_strategy||fallbackRole(record);

    if(entities.length){
      document.querySelector("#contactList").innerHTML=entities.map(x=>renderContact(x,record,enrichment)).join("");
      document.querySelector("#contactability").textContent=`${entities.length} verified project/business contact route${entities.length===1?"":"s"} loaded`;
    }else{
      document.querySelector("#contactEmpty").hidden=false;
      document.querySelector("#fallbackContactAdvice").textContent=fallbackRole(record);
      document.querySelector("#contactability").textContent="Contact enrichment pending";
    }

    const draft=outreachFor(record,enrichment,best);
    document.querySelector("#outreachDraft").value=draft;
    const email=document.querySelector("#emailBestContact");
    if(best?.email){
      email.hidden=false;
      email.href=`mailto:${best.email}?subject=${encodeURIComponent("NZ Foam — "+(enrichment?.project_name||record.description))}&body=${encodeURIComponent(draft)}`;
    }
    document.querySelector("#copyOutreach").addEventListener("click",async()=>{
      await navigator.clipboard.writeText(document.querySelector("#outreachDraft").value);
      const btn=document.querySelector("#copyOutreach");btn.textContent="Copied ✓";setTimeout(()=>btn.textContent="Copy message",1500);
    });

    const linked=enrichment?.linked_records||[];
    document.querySelector("#linkedRecords").innerHTML=linked.length?linked.map(x=>`<div class="linked-item"><span>${esc(x.type)}</span><p><strong>${esc(x.reference||"")}</strong> ${esc(x.description||"")}</p><a href="${esc(x.source_url)}" target="_blank" rel="noreferrer">Source ↗</a></div>`).join(""):'<p class="project-copy">No linked consent or project evidence has been added yet.</p>';

    bindReview(record);
    loading.hidden=true;app.hidden=false;
  }catch(err){
    loading.hidden=true;error.hidden=false;error.textContent=err.message;
  }
}
loadProject();
