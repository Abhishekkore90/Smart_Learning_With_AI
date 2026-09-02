<?php
// Set CORS headers so your React frontend can call this PHP script safely
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

header("Content-Type: application/json");

// Your Razorpay Live API Credentials
$key_id = "rzp_live_TRgZXfPjk5xEuo";
$key_secret = "jYgzCW21a..."; // REPLACE WITH YOUR ACTUAL RAZORPAY LIVE SECRET KEY

// Read JSON input from React frontend
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);

$amount = isset($input['amount']) ? intval($input['amount']) : 149;
$amountInPaise = $amount * 100;
$moduleId = isset($input['moduleId']) ? $input['moduleId'] : 'module_unlock';
$moduleTitle = isset($input['moduleTitle']) ? $input['moduleTitle'] : 'Module Unlock';

// Razorpay Order Payload
$orderData = array(
    'receipt'         => 'rcpt_' . time() . '_' . rand(100, 999),
    'amount'          => $amountInPaise,
    'currency'        => 'INR',
    'payment_capture' => 1,
    'notes'           => array(
        'moduleId'    => $moduleId,
        'moduleTitle' => $moduleTitle
    )
);

// Call Razorpay Live Orders API via cURL
$ch = curl_init("https://api.razorpay.com/v1/orders");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($orderData));
curl_setopt($ch, CURLOPT_USERPWD, $key_id . ":" . $key_secret);
curl_setopt($ch, CURLOPT_HTTPHEADER, array("Content-Type: application/json"));

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);

if (PHP_VERSION_ID < 80500 && is_resource($ch)) {
    @curl_close($ch);
}

if ($curlError) {
    http_response_code(500);
    echo json_encode(array("error" => "cURL Error: " . $curlError));
    exit();
}

http_response_code($httpCode);
echo $response;
?>
