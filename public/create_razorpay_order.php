<?php
// CORS headers — must be very first output
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Max-Age: 86400");
header("Content-Type: application/json; charset=UTF-8");

// Handle OPTIONS preflight — return 200 immediately
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo '{}';
    exit();
}

// Read raw POST data
$inputData = file_get_contents('php://input');
$data      = json_decode($inputData, true);

// Amount validation & sanitization
$rawAmount   = isset($data['amount']) ? $data['amount'] : 50;
$cleanAmount = preg_replace('/[^\d]/', '', (string)$rawAmount);
$amountNum   = max(0, (int)$cleanAmount);

if ($amountNum <= 0) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid amount. Must be greater than zero."]);
    exit();
}

// Convert to paise if value is in rupees (< 1000)
$amountInPaise = $amountNum;
if (empty($data['amount_in_paise']) && $amountNum < 1000) {
    $amountInPaise = $amountNum * 100;
}

$currency  = isset($data['currency'])  ? $data['currency']  : 'INR';
$receipt   = isset($data['receipt'])   ? $data['receipt']   : 'rcpt_' . time();
$moduleId  = isset($data['moduleId'])  ? $data['moduleId']  : 'module_unlock';
$moduleTitle = isset($data['moduleTitle']) ? $data['moduleTitle'] : 'Module Unlock';

// ── LIVE keys (default for production sgkbrainova.com) ──
$keyId     = 'rzp_live_TRgZXfPjk5xEuo';
$keySecret = 'jYgzCW21ajQTQMbbk9YWYIlK'; // SGK Brainova Live Secret Key

// ── Auto-switch to TEST keys when request comes from localhost ──
$origin      = $_SERVER['HTTP_ORIGIN']   ?? $_SERVER['HTTP_REFERER'] ?? '';
$remoteAddr  = $_SERVER['REMOTE_ADDR']   ?? '';
$isLocalhost =
    strpos($origin, 'localhost')  !== false ||
    strpos($origin, '127.0.0.1') !== false ||
    in_array($remoteAddr, ['127.0.0.1', '::1']);

if ($isLocalhost) {
    $keyId     = 'rzp_test_TdQJUNjMtn0i6U';
    $keySecret = 'IlSDsGMynxPJ1xdzOIlOHVz5'; // SGK Brainova test secret key
}

$isLiveKey = strpos($keyId, 'rzp_live_') === 0;

// ── Call Razorpay API to create Order ──
$url        = "https://api.razorpay.com/v1/orders";
$postFields = json_encode([
    "amount"          => $amountInPaise,
    "currency"        => $currency,
    "receipt"         => $receipt,
    "payment_capture" => 1,
    "notes"           => [
        "moduleId"    => $moduleId,
        "moduleTitle" => $moduleTitle,
    ]
]);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL,            $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST,           true);
curl_setopt($ch, CURLOPT_POSTFIELDS,     $postFields);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "Authorization: Basic " . base64_encode($keyId . ":" . $keySecret),
]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, $isLiveKey); // SSL ON for live, OFF for test/localhost
curl_setopt($ch, CURLOPT_TIMEOUT,        30);

$response       = curl_exec($ch);
$httpStatusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError      = curl_error($ch);
curl_close($ch);

// cURL network error
if ($curlError) {
    http_response_code(500);
    echo json_encode([
        "error"       => "cURL Error: " . $curlError,
        "isLocalhost" => $isLocalhost,
        "key_used"    => substr($keyId, 0, 14) . "...",
    ]);
    exit();
}

// Razorpay API error
if ($httpStatusCode !== 200) {
    $decoded = json_decode($response, true);
    http_response_code($httpStatusCode);
    echo json_encode([
        "error"        => "Razorpay API Error (HTTP $httpStatusCode)",
        "razorpay_msg" => $decoded['error']['description'] ?? $response,
        "isLocalhost"  => $isLocalhost,
        "key_used"     => substr($keyId, 0, 14) . "...",
    ]);
    exit();
}

// ✅ Success — return order data + key_id so frontend uses same key
$orderData          = json_decode($response, true);
$orderData['key_id'] = $keyId; // ← Frontend will use this exact key

http_response_code(200);
echo json_encode($orderData);
?>