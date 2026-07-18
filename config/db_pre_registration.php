<?php
// Load centralized constants
require_once __DIR__ . '/../api/config/constants.php';

class PreRegistrationDatabase {
    // Database credentials - Change these when deploying to infinityfree
    // ==========================================================
    // MODE: INFINITYFREE (active)
    private $host = 'sql200.infinityfree.com';
    private $db_name = 'if0_42388196_iit_shelf_prereg'; // Separate pre-registration database
    private $username = 'if0_42388196';
    private $password = 'nSaPxqULdbYlLm';
    
    // For localhost development (comment infinityfree above, uncomment below):
    // private $host = 'localhost';
    // private $db_name = 'iit_shelf_prereg';
    // private $username = 'root';
    // private $password = '1';
    private $conn;

    public function connect() {
        $this->conn = null;
        
        try {
            $this->conn = new PDO(
                'mysql:host=' . $this->host . ';dbname=' . $this->db_name,
                $this->username,
                $this->password
            );
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        } catch(PDOException $e) {
            error_log('PreReg DB Connection Error: ' . $e->getMessage());
            return null;
        }
        
        return $this->conn;
    }
}
?>
