<?php
// Set timezone to Asia/Dhaka
date_default_timezone_set('Asia/Dhaka');

// Load centralized constants
require_once __DIR__ . '/../api/config/constants.php';

// CORS headers
header("Access-Control-Allow-Origin: " . CORS_ALLOWED_ORIGINS);
header("Access-Control-Allow-Methods: " . CORS_ALLOWED_METHODS);
header("Access-Control-Allow-Headers: " . CORS_ALLOWED_HEADERS);
header("Content-Type: application/json; charset=UTF-8");

class Database {
    // Database credentials - Change these when deploying to infinityfree
    // ==========================================================
    // MODE: INFINITYFREE (active)
    private $host = "sql200.infinityfree.com";
    private $db_name = "if0_42388196_iit_shelf";
    private $username = "if0_42388196";
    private $password = "nSaPxqULdbYlLm";
    
    // For localhost development (comment infinityfree above, uncomment below):
    // private $host = "localhost";
    // private $db_name = "iit_shelf";
    // private $username = "root";
    // private $password = "1";
    public $conn;

    public function getConnection() {
        $this->conn = null;
        
        try {
            $this->conn = new PDO(
                "mysql:host=" . $this->host . ";dbname=" . $this->db_name,
                $this->username,
                $this->password
            );
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->exec("set names utf8");
          // Set session timezone for MySQL
            $this->conn->exec("SET time_zone = '+06:00'");
        } catch(PDOException $exception) {
            echo json_encode([
                "success" => false,
                "message" => "Connection error: " . $exception->getMessage()
            ]);
        }
        
        return $this->conn;
    }
}
?>
