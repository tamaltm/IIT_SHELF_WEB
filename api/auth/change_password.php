<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../lib/auth_helpers.php';

$database = new Database();
$db = $database->getConnection();

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$email = isset($input['email']) ? strtolower(trim($input['email'])) : '';
$currentPassword = $input['current_password'] ?? '';
$newPassword = $input['new_password'] ?? '';
$confirmPassword = $input['confirm_password'] ?? '';

// Validate inputs
if ($email === '' || $currentPassword === '' || $newPassword === '' || $confirmPassword === '') {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Email, current password, new password, and confirmation are required.',
    ]);
    exit;
}

// Check if new password matches confirmation
if ($newPassword !== $confirmPassword) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'New password and confirmation do not match.',
    ]);
    exit;
}

// Check if new password is at least 6 characters
if (strlen($newPassword) < 6) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'New password must be at least 6 characters long.',
    ]);
    exit;
}

// Fetch user from database
$stmt = $db->prepare('SELECT password_hash FROM Users WHERE email = :email');
$stmt->execute([':email' => $email]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    http_response_code(404);
    echo json_encode([
        'success' => false,
        'message' => 'User not found.',
    ]);
    exit;
}

// Verify current password
if (!password_verify($currentPassword, $user['password_hash'])) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'Current password is incorrect.',
    ]);
    exit;
}

// Update password
$newHash = password_hash($newPassword, PASSWORD_BCRYPT);
$update = $db->prepare('UPDATE Users SET password_hash = :ph WHERE email = :email');
$update->execute([
    ':ph' => $newHash,
    ':email' => $email,
]);

http_response_code(200);
echo json_encode([
    'success' => true,
    'message' => 'Password changed successfully.',
]);
?>
