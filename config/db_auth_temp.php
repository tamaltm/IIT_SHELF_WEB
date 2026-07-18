<?php
// Separate database for temporary authentication data (OTP, verification)

class AuthTempDatabase {
    // For localhost development (comment infinityfree below, uncomment this):
    // private string $host = 'localhost';
    // private string $db_name = 'iit_shelf_auth_temp';
    // private string $db_user = 'root';
    // private string $db_pass = '1';
    
    // For infinityfree hosting (uncomment, comment localhost above):
    private string $host = 'sql200.infinityfree.com';
    private string $db_name = 'if0_42388196_iit_shelf_auth_temp';
    private string $db_user = 'if0_42388196';
    private string $db_pass = 'nSaPxqULdbYlLm';
    private ?PDO $conn = null;

    public function connect(): PDO {
        try {
            $dsn = 'mysql:host=' . $this->host . ';dbname=' . $this->db_name . ';charset=utf8mb4';
            $this->conn = new PDO($dsn, $this->db_user, $this->db_pass);
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        } catch (PDOException $e) {
            die('Auth Temp Database Connection Error: ' . $e->getMessage());
        }

        return $this->conn;
    }
}
?>
