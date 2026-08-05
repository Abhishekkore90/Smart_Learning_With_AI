/**
 * Vercel Serverless Function: /api/pdf-proxy
 *
 * Proxies PDF files from Bunny Storage with server-side AccessKey authentication.
 * This prevents CORS / X-Frame-Options issues when loading PDFs on any PC/browser.
 *
 * Usage:
 *   GET /api/pdf-proxy?url=https://sgkbrainova.b-cdn.net/path/to/file.pdf
 *
 * The AccessKey is stored securely as a Vercel Environment Variable (BUNNY_STORAGE_API_KEY)
 * and never exposed to the client/browser.
 */

export default async function handler(req, res) {
  // Allow only GET requests
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url } = req.query;

  // Validate URL param exists
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
  const allowedHosts = [
    "b-cdn.net",
    "storage.bunnycdn.com",
    "bunnycdn.com",
  ];
  const isAllowed = allowedHosts.some((host) => targetUrl.includes(host));
  if (!isAllowed) {
    return res.status(403).json({ error: "Forbidden: Only Bunny CDN URLs are allowed" });
  }

  // Build Bunny Storage REST API URL if it's a CDN pull URL
  // CDN URL format: https://sgkbrainova.b-cdn.net/path/file.pdf
  // Storage URL format: https://storage.bunnycdn.com/sgkbrainova/path/file.pdf
  let fetchUrl = targetUrl;
  const storageZone = process.env.BUNNY_STORAGE_ZONE || "sgkbrainova";

  if (targetUrl.includes("b-cdn.net")) {
    try {
      const urlObj = new URL(targetUrl);
      const filePath = urlObj.pathname.replace(/^\//, "");
      fetchUrl = `https://storage.bunnycdn.com/${storageZone}/${filePath}`;
    } catch (e) {
      // If parsing fails, try with original CDN URL directly
      fetchUrl = targetUrl;
    }
  }

  const apiKey = process.env.BUNNY_STORAGE_API_KEY;
  if (!apiKey) {
    console.error("BUNNY_STORAGE_API_KEY environment variable is not set on Vercel.");
    return res.status(500).json({ error: "Server configuration error: Missing API key" });
  }

  try {
    // Fetch the file from Bunny Storage with AccessKey header (server-side, secure)
    const bunnyResponse = await fetch(fetchUrl, {
      method: "GET",
      headers: {
        AccessKey: apiKey,
        Accept: "application/pdf,application/octet-stream,*/*",
      },
    });

    if (!bunnyResponse.ok) {
      console.error(`Bunny Storage fetch failed: ${bunnyResponse.status} ${bunnyResponse.statusText} for ${fetchUrl}`);
      return res.status(bunnyResponse.status).json({
        error: `Failed to fetch file from storage (${bunnyResponse.status})`,
      });
    }

    // Get the file as a buffer
    const arrayBuffer = await bunnyResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Detect content type
    const contentType = bunnyResponse.headers.get("content-type") || "application/pdf";

    // Security: Make sure we got a PDF, not an HTML error page
    if (contentType.includes("text/html")) {
      return res.status(502).json({ error: "Received HTML instead of PDF from storage" });
    }

    // Set response headers to allow embedding in iframe
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Content-Disposition", "inline");

    // Cache for 1 hour (reduces repeated fetches)
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");

    // CORS headers so any origin can load it (needed for iframe embedding)
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");
    res.setHeader("X-Content-Type-Options", "nosniff");

    return res.status(200).send(buffer);
  } catch (err) {
    console.error("PDF Proxy error:", err);
    return res.status(500).json({ error: "Internal server error while proxying PDF" });
  }
}
