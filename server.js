const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "public");
const port = process.env.PORT || 3000;
const AUCKLAND_CACHE_TTL_MS = 15 * 60 * 1000;

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon"
};

function sendJson(res, status, payload, extraHeaders = {}) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "public, max-age=60, stale-while-revalidate=900",
    ...extraHeaders
  });
  res.end(JSON.stringify(payload));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: { "user-agent": "CDI001/0.4 (+public development intelligence)" },
      timeout: 12000
    }, (upstream) => {
      let body = "";
      upstream.setEncoding("utf8");
      upstream.on("data", (chunk) => body += chunk);
      upstream.on("end", () => {
        if (upstream.statusCode < 200 || upstream.statusCode >= 300) {
          return reject(new Error(`Upstream status ${upstream.statusCode}`));
        }
        try { resolve(JSON.parse(body)); }
        catch (err) { reject(err); }
      });
    });
    request.on("timeout", () => request.destroy(new Error("Upstream timeout")));
    request.on("error", reject);
  });
}

function uniquePush(list, value) {
  if (value && !list.includes(value)) list.push(value);
}

function nzFoamAnalysis(description = "", subtype = "", value = 0) {
  const text = `${description} ${subtype}`.toLowerCase();
  let score = 25;
  const products = [];
  const reasons = [];

  const has = (...terms) => terms.some((term) => text.includes(term));
  const newBuild = has("new ", "construction", "construct", "proposed", "erect");
  const residential = has("dwelling", "residential", "townhouse", "apartment", "household unit", "house ");
  const multiResidential = residential && (
    /\b(?:[2-9]|[1-9][0-9])\s*x\s*/.test(text) ||
    has("multi-unit", "units 1", "townhouses", "apartments", "two dwellings", "three dwellings", "four dwellings", "five dwellings", "six dwellings", "seven dwellings", "eight dwellings", "nine dwellings", "ten dwellings", "eleven dwellings", "twelve dwellings")
  );
  const industrial = has("warehouse", "industrial", "factory", "workshop", "coolstore", "coolroom", "coolrooms", "cold room", "coldroom", "freezer", "chiller", "processing building", "storage building");
  const agriculture = has("agricultural", "farm ", "farm building", "rural shed", "implement shed", "milking", "horticulture");
  const commercial = !residential && has("commercial", "office building", "office-warehouse", "retail", "shop", "showroom", "supermarket", "school", "teaching", "health", "hospital", "fire station", "court", "accommodation", "hotel", "stadium", "conference centre");
  const roof = has("roof", "roofing", "skillion", "traydeck", "hi-bond");
  const container = has("container", "modular");
  const civil = !residential && has("civil works", "retaining wall", "trench", "earthworks", "lightweight fill", "void fill", "backfill", "in-ground pool", "in ground pool");
  const thermal = has("thermal", "refrigerated", "coolstore", "coolroom", "coolrooms", "cold room", "coldroom", "freezer", "chiller", "temperature controlled");
  const marine = has("marine", "boat", "vessel", "ship");
  const steel = has("steel", "metal");
  const interiorOnly = has("interior refurbishment", "internal refurbishment", "internal alteration") && !roof;
  const lowScope = has("sign", "demolition", "minor alteration");
  const platformOnly = has("steel platform", "support platform") && !has("building", "warehouse", "shed");

  if (industrial) {
    score += 40;
    uniquePush(products, "Commercial closed-cell spray foam");
    uniquePush(products, "WarmCore / roof-envelope review");
    reasons.push("industrial / warehouse-type project");
  }
  if (agriculture) {
    score += 40;
    uniquePush(products, "Agricultural closed-cell spray foam");
    uniquePush(products, "WarmCore / roof-envelope review");
    reasons.push("agricultural project");
  }
  if (residential) {
    score += 20;
    uniquePush(products, "Residential spray foam");
    uniquePush(products, "WarmCore / roof review");
    reasons.push("residential new-build potential");
  }
  if (multiResidential) {
    score += 10;
    reasons.push("multiple dwellings / units");
    if (/\b(?:1[0-9]|[2-9][0-9])\s*x\s*/.test(text) || has("ten dwellings", "eleven dwellings", "twelve dwellings")) {
      score += 5;
      reasons.push("larger multi-unit scale");
    }
  }
  if (commercial) {
    score += 14;
    uniquePush(products, "Commercial spray foam");
    reasons.push("commercial / institutional use");
  }
  if (roof) {
    score += 18;
    uniquePush(products, "WarmCore Roofing");
    reasons.push("roofing signal");
  }
  if (container) {
    score += 30;
    uniquePush(products, "Container insulation");
    reasons.push("container / modular signal");
  }
  if (civil) {
    score += 9;
    uniquePush(products, "Rapidfill — civil suitability review");
    reasons.push("civil / groundworks signal");
  }
  if (thermal) {
    score += 18;
    uniquePush(products, "Closed-cell spray foam");
    reasons.push("thermal-control use");
  }
  if (marine) {
    score += 30;
    uniquePush(products, "Marine closed-cell spray foam");
    reasons.push("marine signal");
  }
  if (steel && (industrial || agriculture || roof || container)) {
    score += 5;
    reasons.push("steel substrate / structure");
  }
  if (newBuild) {
    score += 5;
    reasons.push("new-build / construction signal");
  }

  if (value >= 10000000) {
    score += 12;
    reasons.push("project value above $10m");
  } else if (value >= 5000000) {
    score += 9;
    reasons.push("project value above $5m");
  } else if (value >= 2000000) {
    score += 6;
    reasons.push("project value above $2m");
  }

  if (interiorOnly) {
    score -= 22;
    reasons.push("interior-only scope reduces insulation fit");
  }
  if (platformOnly) {
    score -= 24;
    reasons.push("support-platform scope has weak envelope fit");
  }
  if (lowScope) {
    score -= 25;
    reasons.push("low-scope / non-envelope work");
  }

  score = Math.max(5, Math.min(95, score));
  if (!products.length) uniquePush(products, "Plan review required");

  let fit_band = "MONITOR";
  let recommended_action = "Monitor unless plans or project detail reveal a stronger insulation opportunity.";
  if (score >= 75) {
    fit_band = "HIGH";
    recommended_action = "Prioritise: identify builder, architect or project manager and request plans/specification details.";
  } else if (score >= 55) {
    fit_band = "QUALIFY";
    recommended_action = "Qualify: review plans and project team before assigning to sales.";
  }

  return { score, fit_band, products, reasons: reasons.slice(0, 5), recommended_action };
}

function dedupeByReference(features) {
  const seen = new Set();
  const unique = [];
  for (const feature of features || []) {
    const a = feature.attributes || {};
    const key = a.ConsentReference || `${a.ConsentDescription}|${a.ProjectValue}|${a.IssuedDate}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(feature);
  }
  return unique;
}

function recordKey(record) {
  return `${record.council || "Council"}::${record.consent_reference || record.address || record.description}`;
}

function readCanterburyPayload() {
  const raw = JSON.parse(fs.readFileSync(path.join(publicDir, "data", "live-opportunities.json"), "utf8"));
  const records = (raw.records || []).map((x) => ({
    council: x.council,
    consent_reference: x.external_reference || x.id,
    address: x.location || null,
    description: x.observed_description,
    status: x.observed_stage,
    project_value_nzd: null,
    issued_date: x.lodged_date || x.limited_notified_date || null,
    issued_period: null,
    consent_family: x.consent_family,
    source_confidence: x.source_confidence || "HIGH",
    nz_foam_preliminary_fit_score: x.nz_foam_preliminary_fit_score,
    nz_foam_fit_band: x.nz_foam_preliminary_fit_score >= 75 ? "HIGH" : x.nz_foam_preliminary_fit_score >= 55 ? "QUALIFY" : "MONITOR",
    nz_foam_product_candidates: x.likely_product_fit?.length ? x.likely_product_fit : ["Plan review required"],
    nz_foam_score_reasons: [x.development_category, x.consent_family + " consent"].filter(Boolean),
    recommended_action: x.recommended_action,
    fit_is_inferred: true,
    source_url: x.source_url
  }));
  return {
    dataset: raw.dataset,
    coverage_note: "Verified public Selwyn and Waimakariri signals used as Canterbury proof-of-ingestion; not complete Canterbury coverage.",
    scoring_note: raw.methodology_note,
    verified_at: raw.verified_at,
    records
  };
}

function readTaurangaPayload() {
  const raw = JSON.parse(fs.readFileSync(path.join(publicDir, "data", "tauranga-major-july-2026.json"), "utf8"));
  const records = (raw.records || []).map((x) => {
    const analysis = nzFoamAnalysis(x.description, "", x.project_value_nzd);
    return {
      council: "Tauranga City Council",
      consent_reference: x.id,
      address: x.address,
      description: x.description,
      status: "Issued",
      project_value_nzd: x.project_value_nzd,
      issued_period: raw.period,
      source_confidence: "HIGH",
      nz_foam_preliminary_fit_score: analysis.score,
      nz_foam_fit_band: analysis.fit_band,
      nz_foam_product_candidates: analysis.products,
      nz_foam_score_reasons: analysis.reasons,
      recommended_action: analysis.recommended_action,
      fit_is_inferred: true,
      source_url: raw.source_url
    };
  }).sort((a,b) => b.nz_foam_preliminary_fit_score - a.nz_foam_preliminary_fit_score || b.project_value_nzd - a.project_value_nzd);

  return {
    dataset: raw.dataset,
    period: raw.period,
    coverage_note: "Official Tauranga City Council monthly report; this endpoint contains the report's Major Consent Applications Issued Value over $1m table, not all Tauranga consents.",
    scoring_note: "NZ Foam fit is a CDI inference from the council description and published project value.",
    records
  };
}

async function fetchAucklandPayload() {
  const endpoint = "https://mapspublic.aucklandcouncil.govt.nz/arcgis3/rest/services/NonCouncil/LINZBuildingConsent/MapServer/0/query";
  const params = new URLSearchParams({
    where: "1=1",
    outFields: "ConsentReference,ConsentDescription,ConsentStatus,ProjectValue,IssuedDate,ApplicationSubType",
    returnGeometry: "false",
    returnDistinctValues: "true",
    orderByFields: "IssuedDate DESC,ProjectValue DESC",
    resultRecordCount: "100",
    f: "json"
  });
  const data = await fetchJson(`${endpoint}?${params.toString()}`);
  if (data.error) throw new Error(data.error.message || "ArcGIS query failed");

  const uniqueFeatures = dedupeByReference(data.features);
  const records = uniqueFeatures.slice(0, 75).map((f) => {
    const a = f.attributes || {};
    const analysis = nzFoamAnalysis(a.ConsentDescription, a.ApplicationSubType, a.ProjectValue);
    return {
      council: "Auckland Council",
      consent_reference: a.ConsentReference || null,
      description: a.ConsentDescription || null,
      status: a.ConsentStatus || null,
      project_value_nzd: a.ProjectValue || null,
      issued_date: a.IssuedDate ? new Date(a.IssuedDate).toISOString().slice(0,10) : null,
      application_subtype: a.ApplicationSubType || null,
      source_confidence: "HIGH",
      nz_foam_preliminary_fit_score: analysis.score,
      nz_foam_fit_band: analysis.fit_band,
      nz_foam_product_candidates: analysis.products,
      nz_foam_score_reasons: analysis.reasons,
      recommended_action: analysis.recommended_action,
      fit_is_inferred: true,
      source_url: "https://mapspublic.aucklandcouncil.govt.nz/arcgis3/rest/services/NonCouncil/LINZBuildingConsent/MapServer/0"
    };
  });

  return {
    dataset: "Auckland Council select operative high-value building consents",
    coverage_note: "Issued in the past two years with project value above NZ$1m, per Auckland Council layer description.",
    scoring_note: "NZ Foam fit is a CDI inference from published description, subtype and value. It is not confirmation of product specification or project suitability.",
    fetched_at: new Date().toISOString(),
    raw_features_received: (data.features || []).length,
    unique_consents_returned: records.length,
    records
  };
}

const aucklandCache = {
  payload: null,
  refreshedAt: 0,
  refreshing: null,
  lastError: null
};

async function refreshAucklandCache() {
  if (aucklandCache.refreshing) return aucklandCache.refreshing;
  aucklandCache.refreshing = fetchAucklandPayload()
    .then((payload) => {
      aucklandCache.payload = payload;
      aucklandCache.refreshedAt = Date.now();
      aucklandCache.lastError = null;
      return payload;
    })
    .catch((err) => {
      aucklandCache.lastError = err.message;
      throw err;
    })
    .finally(() => {
      aucklandCache.refreshing = null;
    });
  return aucklandCache.refreshing;
}

async function getAucklandPayload() {
  const age = Date.now() - aucklandCache.refreshedAt;
  if (aucklandCache.payload && age < AUCKLAND_CACHE_TTL_MS) return aucklandCache.payload;

  if (aucklandCache.payload) {
    refreshAucklandCache().catch(() => {});
    return aucklandCache.payload;
  }

  return refreshAucklandCache();
}

function readEnrichment() {
  return JSON.parse(fs.readFileSync(path.join(publicDir, "data", "project-enrichment.json"), "utf8"));
}

async function getLivePayload() {
  const [auckland, tauranga, canterbury] = await Promise.all([
    getAucklandPayload(),
    Promise.resolve(readTaurangaPayload()),
    Promise.resolve(readCanterburyPayload())
  ]);
  const all = [...auckland.records, ...tauranga.records, ...canterbury.records];
  return {
    generated_at: new Date().toISOString(),
    cache: {
      auckland_refreshed_at: aucklandCache.refreshedAt ? new Date(aucklandCache.refreshedAt).toISOString() : null,
      auckland_age_seconds: aucklandCache.refreshedAt ? Math.round((Date.now() - aucklandCache.refreshedAt) / 1000) : null
    },
    summary: {
      total_records: all.length,
      high_fit: all.filter(x => x.nz_foam_preliminary_fit_score >= 75).length,
      qualify: all.filter(x => x.nz_foam_preliminary_fit_score >= 55 && x.nz_foam_preliminary_fit_score < 75).length,
      published_value_high_and_qualify: all
        .filter(x => x.nz_foam_preliminary_fit_score >= 55)
        .reduce((sum, x) => sum + (Number(x.project_value_nzd) || 0), 0)
    },
    sources: { auckland, tauranga, canterbury }
  };
}

async function getProjectPayload(key) {
  let record = null;

  if (key.startsWith("Auckland Council::")) {
    const source = await getAucklandPayload();
    record = source.records.find(x => recordKey(x) === key) || null;
  } else if (key.startsWith("Tauranga City Council::")) {
    const source = readTaurangaPayload();
    record = source.records.find(x => recordKey(x) === key) || null;
  } else {
    const source = readCanterburyPayload();
    record = source.records.find(x => recordKey(x) === key) || null;
  }

  if (!record) return null;

  const enrichment = readEnrichment().projects?.[key] || null;
  return { record, enrichment };
}

const server = http.createServer(async (req, res) => {
  const parsed = new URL(req.url || "/", "http://localhost");

  if (parsed.pathname === "/health") {
    return sendJson(res, 200, {
      ok: true,
      service: "cdi001-nz",
      scope: "new-zealand",
      version: "0.4",
      auckland_cache_ready: Boolean(aucklandCache.payload),
      auckland_cache_age_seconds: aucklandCache.refreshedAt ? Math.round((Date.now() - aucklandCache.refreshedAt) / 1000) : null,
      auckland_cache_error: aucklandCache.lastError
    }, {"cache-control":"no-store"});
  }

  if (parsed.pathname === "/api/canterbury/verified") {
    try { return sendJson(res, 200, readCanterburyPayload()); }
    catch (err) { return sendJson(res, 500, {error:"Canterbury dataset unavailable", detail: err.message}); }
  }

  if (parsed.pathname === "/api/tauranga/major") {
    try { return sendJson(res, 200, readTaurangaPayload()); }
    catch (err) { return sendJson(res, 500, {error:"Tauranga dataset unavailable", detail: err.message}); }
  }

  if (parsed.pathname === "/api/auckland/high-value") {
    try { return sendJson(res, 200, await getAucklandPayload()); }
    catch (err) { return sendJson(res, 502, {error:"Auckland source temporarily unavailable", detail: err.message}); }
  }

  if (parsed.pathname === "/api/nz-foam/live") {
    try { return sendJson(res, 200, await getLivePayload()); }
    catch (err) { return sendJson(res, 502, {error:"Live NZ Foam feed temporarily unavailable", detail: err.message}); }
  }

  if (parsed.pathname === "/api/nz-foam/project") {
    try {
      const key = parsed.searchParams.get("key") || "";
      if (!key) return sendJson(res, 400, {error:"Project key required"});
      const project = await getProjectPayload(key);
      if (!project) return sendJson(res, 404, {error:"Project not found"});
      return sendJson(res, 200, project);
    } catch (err) {
      return sendJson(res, 500, {error:"Project lookup failed", detail: err.message});
    }
  }

  const clean = decodeURIComponent(parsed.pathname);
  const relative = clean === "/" ? "index.html" : clean.replace(/^\/+/, "");
  const filePath = path.normalize(path.join(publicDir, relative));

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  fs.stat(filePath, (err, stat) => {
    let target = filePath;
    if (!err && stat.isDirectory()) target = path.join(filePath, "index.html");

    fs.readFile(target, (readErr, data) => {
      if (readErr) {
        res.writeHead(404, {"content-type":"text/plain; charset=utf-8"});
        return res.end("Not found");
      }
      res.writeHead(200, {
        "content-type": types[path.extname(target)] || "application/octet-stream",
        "cache-control": path.extname(target) === ".html" ? "no-cache" : "public, max-age=3600"
      });
      res.end(data);
    });
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`CDI001 listening on port ${port}`);
  refreshAucklandCache()
    .then(() => console.log("Auckland consent cache pre-warmed"))
    .catch((err) => console.warn("Auckland cache pre-warm failed:", err.message));
});
