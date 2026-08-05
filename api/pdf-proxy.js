/**
 * Vercel Serverless Function: /api/pdf-proxy
 *
 * Proxies PDF files from Bunny Storage with server-side AccessKey authentication.
 * This prevents CORS / X-Frame-Options issues when loading PDFs on any PC/browser.
 *
 * Usage:
 *   GET /api/pdf-proxy?url=https://sgkbrainova.b-cdn.net/path/to/file.pdf
 *
 * The AccessKey is stored securely as a Vercel Environment Variable.
 */

/**
 * Builds a proper Bunny Storage fetch URL from any CDN or storage URL.
 * Handles Marathi/Unicode filenames correctly using encodeURIComponent on each path segment.
 */
function buildStorageFetchUrl(targetUrl, storageZone) {
  try {
    const urlObj = new URL(targetUrl);

    // Extract path segments and re-encode each one properly for Unicode filenames
    const rawPath = decodeURIComponent(urlObj.pathname).replace(/^\//, "");

    // If it's a CDN URL (b-cdn.net), prepend the storage zone
    if (targetUrl.includes("b-cdn.net")) {
      // rawPath = "academic_plannings/filename.pdf" → encode each segment
      const segments = rawPath.split("/").map((seg) => encodeURIComponent(seg));
      return `https://storage.bunnycdn.com/${storageZone}/${segments.join("/")}`;
    }

    // If it's already a storage URL, just re-encode the path segments properly
    if (targetUrl.includes("storage.bunnycdn.com")) {
      // rawPath = "sgkbrainova/academic_plannings/filename.pdf"
      // Remove leading zone prefix if present
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
  // Allow only GET requests
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

  // Security: Only allow Bunny CDN / Bunny Storage URLs
  const allowedHosts = ["b-cdn.net", "storage.bunnycdn.com", "bunnycdn.com"];
  if (!allowedHosts.some((host) => targetUrl.includes(host))) {
    return res.status(403).json({ error: "Forbidden: Only Bunny CDN URLs are allowed" });
  }

  const apiKey = process.env.BUNNY_STORAGE_API_KEY || process.env.VITE_BUNNY_STORAGE_API_KEY;
  if (!apiKey) {
    console.error("No Bunny API key found in environment variables.");
    return res.status(500).json({ error: "Server configuration error: Missing API key" });
  }

  const storageZone = process.env.BUNNY_STORAGE_ZONE || process.env.VITE_BUNNY_STORAGE_ZONE || "sgkbrainova";

  // Build properly encoded storage fetch URL
  const fetchUrl = buildStorageFetchUrl(targetUrl, storageZone);
  console.log(`[pdf-proxy] Fetching: ${fetchUrl}`);

  try {
    const bunnyResponse = await fetch(fetchUrl, {
      method: "GET",
      headers: {
        AccessKey: apiKey,
        Accept: "application/pdf,application/octet-stream,*/*",
      },
    });

    if (!bunnyResponse.ok) {
      console.error(`[pdf-proxy] Bunny returned ${bunnyResponse.status} for: ${fetchUrl}`);
      return res.status(bunnyResponse.status).json({
        error: `Failed to fetch file from storage (${bunnyResponse.status})`,
        fetchUrl,
      });
    }

    const arrayBuffer = await bunnyResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Safety check: reject HTML responses
    const contentType = bunnyResponse.headers.get("content-type") || "application/pdf";
    if (contentType.includes("text/html")) {
      return res.status(502).json({ error: "Received HTML instead of PDF from storage" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");
    res.setHeader("X-Content-Type-Options", "nosniff");

    return res.status(200).send(buffer);
  } catch (err) {
    console.error("[pdf-proxy] Error:", err);
    return res.status(500).json({ error: "Internal server error while proxying PDF" });
  }
}
