const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "public");
const port = process.env.PORT || 3000;

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
    "cache-control": "public, max-age=300",
    ...extraHeaders
  });
  res.end(JSON.stringify(payload));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "user-agent": "CDI001/0.2 (+public development intelligence)" } }, (upstream) => {
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
    }).on("error", reject);
  });
}

function nzFoamScore(description = "", subtype = "", value = 0) {
  const text = `${description} ${subtype}`.toLowerCase();
  let score = 35;
  const high = ["warehouse","industrial","coolstore","storage","factory","workshop","commercial","agricultural","farm","shed","roof"];
  const medium = ["dwelling","residential","apartment","townhouse","accommodation","school","health","office"];
  const low = ["demolition","swimming pool","retaining wall","sign","minor alteration"];
  high.forEach(k => { if (text.includes(k)) score += 10; });
  medium.forEach(k => { if (text.includes(k)) score += 5; });
  low.forEach(k => { if (text.includes(k)) score -= 8; });
  if (value >= 10000000) score += 12;
  else if (value >= 5000000) score += 9;
  else if (value >= 2000000) score += 5;
  return Math.max(5, Math.min(95, score));
}

const server = http.createServer(async (req, res) => {
  if (req.url === "/health") {
    return sendJson(res, 200, {ok:true, service:"cdi001-nz", scope:"new-zealand"});
  }

  if ((req.url || "").startsWith("/api/auckland/high-value")) {
    try {
      const endpoint = "https://mapspublic.aucklandcouncil.govt.nz/arcgis3/rest/services/NonCouncil/LINZBuildingConsent/MapServer/0/query";
      const params = new URLSearchParams({
        where: "1=1",
        outFields: "ConsentReference,ConsentDescription,ConsentStatus,ProjectValue,IssuedDate,ApplicationSubType",
        returnGeometry: "false",
        orderByFields: "IssuedDate DESC",
        resultRecordCount: "25",
        f: "json"
      });
      const data = await fetchJson(`${endpoint}?${params.toString()}`);
      if (data.error) throw new Error(data.error.message || "ArcGIS query failed");
      const records = (data.features || []).map((f) => {
        const a = f.attributes || {};
        return {
          council: "Auckland Council",
          consent_reference: a.ConsentReference || null,
          description: a.ConsentDescription || null,
          status: a.ConsentStatus || null,
          project_value_nzd: a.ProjectValue || null,
          issued_date: a.IssuedDate ? new Date(a.IssuedDate).toISOString().slice(0,10) : null,
          application_subtype: a.ApplicationSubType || null,
          source_confidence: "HIGH",
          nz_foam_preliminary_fit_score: nzFoamScore(a.ConsentDescription, a.ApplicationSubType, a.ProjectValue),
          source_url: "https://mapspublic.aucklandcouncil.govt.nz/arcgis3/rest/services/NonCouncil/LINZBuildingConsent/MapServer/0"
        };
      });
      return sendJson(res, 200, {
        dataset: "Auckland Council select operative high-value building consents",
        coverage_note: "Issued in the past two years with project value above NZ$1m, per Auckland Council layer description.",
        fetched_at: new Date().toISOString(),
        records
      });
    } catch (err) {
      return sendJson(res, 502, {error:"Auckland source temporarily unavailable", detail: err.message});
    }
  }

  const clean = decodeURIComponent((req.url || "/").split("?")[0]);
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
});
