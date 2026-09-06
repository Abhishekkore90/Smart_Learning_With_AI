/**
 * Vercel Serverless Function: /api/bunny-storage
 *
 * Proxies requests to Bunny Storage REST API with server-side AccessKey authentication.
 * Solves 401 Unauthorized / CORS issues on Vercel for evidence photos & documents.
 */

export default async function handler(req, res) {
  // CORS Preflight
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, AccessKey");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const apiKey = process.env.BUNNY_STORAGE_API_KEY || process.env.VITE_BUNNY_STORAGE_API_KEY || "bc06a0c2-aad1-436c-b88a1c197eca-d74a-44e8";

  // Determine path from query param or raw URL
  let storagePath = "";
  if (req.query && req.query.path) {
    storagePath = Array.isArray(req.query.path) ? req.query.path.join("/") : req.query.path;
  } else if (req.url) {
    storagePath = req.url.replace(/^\/api\/bunny-storage\/?/, "").split("?")[0];
  }

  if (!storagePath) {
    return res.status(400).json({ error: "Missing storage path" });
  }

  // Ensure path starts cleanly
  const targetUrl = `https://storage.bunnycdn.com/${storagePath.replace(/^\//, "")}`;

  try {
    const headers = {
      "AccessKey": apiKey,
    };

    if (req.headers["content-type"]) {
      headers["Content-Type"] = req.headers["content-type"];
    }

    const fetchOptions = {
      method: req.method,
      headers: headers,
    };

    if (req.method === "PUT" || req.method === "POST") {
      fetchOptions.body = req.body;
    }

    const bunnyRes = await fetch(targetUrl, fetchOptions);

    if (!bunnyRes.ok) {
      const errText = await bunnyRes.text().catch(() => "");
      return res.status(bunnyRes.status).send(errText);
    }

    if (req.method === "PUT" || req.method === "DELETE") {
      const respData = await bunnyRes.text().catch(() => "{}");
      return res.status(bunnyRes.status).send(respData);
    }

    const contentType = bunnyRes.headers.get("content-type") || "application/octet-stream";
    const arrayBuffer = await bunnyRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");

    return res.status(200).send(buffer);
  } catch (err) {
    console.error("[bunny-storage proxy] Error:", err);
    return res.status(500).json({ error: "Internal server error while proxying storage file" });
  }
}
