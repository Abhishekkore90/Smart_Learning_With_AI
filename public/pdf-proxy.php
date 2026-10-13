<?php
/**
 * PHP Proxy for Bunny CDN & Bunny Storage Files on LiteSpeed / Apache / Hostinger
 * Fixes CORS and access issues for Word (.docx), PDF, JSON, and media files.
 *
 * Usage:
 *   GET /pdf-proxy.php?url=https://sgkbrainova.b-cdn.net/...
 *   GET /api/pdf-proxy?url=https://sgkbrainova.b-cdn.net/...
 *   GET /api/bunny-storage/sgkbrainova/...
 */

// Allow CORS from any origin
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, HEAD, OPTIONS");
header("Access-Control-Allow-Headers: *");
header("Access-Control-Max-Age: 86400");

// Respond immediately to preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$storageZone = "sgkbrainova";
$apiKey = "bc06a0c2-aad1-436c-b88a1c197eca-d74a-44e8";

// Extract target URL or path
$targetUrl = isset($_GET['url']) ? trim($_GET['url']) : '';
$path = isset($_GET['path']) ? trim($_GET['path']) : '';

if (!$targetUrl && !$path) {
    http_response_code(400);
    header("Content-Type: application/json");
    echo json_encode(["error" => "Missing url or path parameter"]);
    exit;
}

$cleanPath = '';

if ($path) {
    $cleanPath = ltrim($path, '/');
    if (strpos($cleanPath, $storageZone . '/') === 0) {
        $cleanPath = substr($cleanPath, strlen($storageZone) + 1);
    }
} else if ($targetUrl) {
    $parsed = parse_url($targetUrl);
    $urlPath = isset($parsed['path']) ? rawurldecode($parsed['path']) : '';
    $cleanPath = ltrim($urlPath, '/');
    if (strpos($cleanPath, $storageZone . '/') === 0) {
        $cleanPath = substr($cleanPath, strlen($storageZone) + 1);
    }
}

$cleanPath = ltrim($cleanPath, '/');
if (!$cleanPath) {
    http_response_code(400);
    header("Content-Type: application/json");
    echo json_encode(["error" => "Empty file path"]);
    exit;
}

// Encode path segments properly for Bunny Storage
$segments = explode('/', $cleanPath);
$encodedSegments = array_map('rawurlencode', $segments);
$fetchUrl = "https://storage.bunnycdn.com/" . $storageZone . "/" . implode('/', $encodedSegments);

// Execute cURL request to Bunny Storage
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $fetchUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 45);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "AccessKey: " . $apiKey,
    "Accept: */*"
]);

$data = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
$curlError = curl_error($ch);
curl_close($ch);

if ($data === false || $httpCode < 200 || $httpCode >= 300) {
    http_response_code($httpCode ? $httpCode : 502);
    header("Content-Type: application/json");
    echo json_encode([
        "error" => "Failed to fetch file from storage",
        "status" => $httpCode,
        "detail" => $curlError,
        "url" => $fetchUrl
    ]);
    exit;
}

// Reject HTML fallback pages
if ($contentType && strpos($contentType, 'text/html') !== false) {
    $preview = substr($data, 0, 100);
    if (stripos($preview, '<!doctype') !== false || stripos($preview, '<html') !== false) {
        http_response_code(502);
        header("Content-Type: application/json");
        echo json_encode(["error" => "Received HTML instead of binary file"]);
        exit;
    }
}

// Determine accurate content-type by file extension
$ext = strtolower(pathinfo($cleanPath, PATHINFO_EXTENSION));
if ($ext === 'docx') {
    $contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
} else if ($ext === 'pdf') {
    $contentType = 'application/pdf';
} else if ($ext === 'json') {
    $contentType = 'application/json; charset=utf-8';
} else if ($ext === 'png') {
    $contentType = 'image/png';
} else if ($ext === 'jpg' || $ext === 'jpeg') {
    $contentType = 'image/jpeg';
} else if ($ext === 'webp') {
    $contentType = 'image/webp';
} else if (!$contentType || strpos($contentType, 'text/html') !== false) {
    $contentType = 'application/octet-stream';
}

header("Content-Type: " . $contentType);
header("Content-Length: " . strlen($data));
header("Content-Disposition: inline");
header("Cache-Control: public, max-age=86400");
header("X-Content-Type-Options: nosniff");

echo $data;
exit;
