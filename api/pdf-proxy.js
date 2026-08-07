/**
 * Vercel Serverless Function: /api/pdf-proxy
 *
 * Proxies PDF files AND JSON data files from Bunny Storage with server-side AccessKey.
 * Fixes CORS / X-Frame-Options / CDN redirect issues on all devices.
 *
 * Usage:
 *   GET /api/pdf-proxy?url=https://sgkbrainova.b-cdn.net/path/to/file.pdf
 *   GET /api/pdf-proxy?url=https://sgkbrainova.b-cdn.net/academic_plannings_parsed/record.json
 */

function buildStorageFetchUrl(targetUrl, storageZone) {
  try {
    const urlObj = new URL(targetUrl);
    const rawPath = decodeURIComponent(urlObj.pathname).replace(/^\//, "");

    if (targetUrl.includes("b-cdn.net")) {
      const segments = rawPath.split("/").map((seg) => encodeURIComponent(seg));
      return `https://storage.bunnycdn.com/${storageZone}/${segments.join("/")}`;
    }

    if (targetUrl.includes("storage.bunnycdn.com")) {
      const pathWithoutZone = rawPath.startsWith(storageZone + "/")
        ? rawPath.slice(storageZone.length + 1)
        : rawPath;
      const segments = pathWithoutZone.split("/").map((seg) => encodeURIComponent(seg));
      return `https://storage.bunnycdn.com/${storageZone}/${segments.join("/")}`;
    }

    return targetUrl;
  } catch (e) {
    console.error("buildStorageFetchUrl error:", e);
    return targetUrl;
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: "Missing 'url' query parameter" });
  }

  let targetUrl;
  try {
    targetUrl = decodeURIComponent(url);
  } catch (e) {
    return res.status(400).json({ error: "Invalid URL encoding" });
  }

  // Security: Only allow Bunny CDN / Storage URLs
  const allowedHosts = ["b-cdn.net", "storage.bunnycdn.com", "bunnycdn.com"];
  if (!allowedHosts.some((host) => targetUrl.includes(host))) {
    return res.status(403).json({ error: "Forbidden: Only Bunny CDN URLs are allowed" });
  }

  const apiKey = process.env.BUNNY_STORAGE_API_KEY || process.env.VITE_BUNNY_STORAGE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server configuration error: Missing API key" });
  }

  const storageZone = process.env.BUNNY_STORAGE_ZONE || process.env.VITE_BUNNY_STORAGE_ZONE || "sgkbrainova";
  const fetchUrl = buildStorageFetchUrl(targetUrl, storageZone);
  console.log(`[pdf-proxy] Fetching: ${fetchUrl}`);

  try {
    const bunnyResponse = await fetch(fetchUrl, {
      method: "GET",
      headers: {
        AccessKey: apiKey,
        Accept: "application/pdf,application/json,application/octet-stream,*/*",
      },
    });

    if (!bunnyResponse.ok) {
      return res.status(bunnyResponse.status).json({
        error: `Failed to fetch file from storage (${bunnyResponse.status})`,
        fetchUrl,
      });
    }

    const arrayBuffer = await bunnyResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = bunnyResponse.headers.get("content-type") || "application/octet-stream";

    // Reject HTML error pages
    if (contentType.includes("text/html")) {
      return res.status(502).json({ error: "Received HTML instead of file from storage" });
    }

    // Detect correct Content-Type
    const isJson = targetUrl.endsWith(".json") || contentType.includes("json");
    const isPdf = targetUrl.endsWith(".pdf") || contentType.includes("pdf");
    const responseContentType = isJson ? "application/json; charset=utf-8"
      : isPdf ? "application/pdf"
      : contentType;

    res.setHeader("Content-Type", responseContentType);
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");
    res.setHeader("X-Content-Type-Options", "nosniff");

    return res.status(200).send(buffer);
  } catch (err) {
    console.error("[pdf-proxy] Error:", err);
    return res.status(500).json({ error: "Internal server error while proxying file" });
  }
}
