<?php
/**
 * Centralized Configuration Constants
 * 
 * Change these values when deploying to infinityfree hosting
 */

// Base URL for API endpoints
// For localhost development:
//define('API_BASE_URL', 'http://localhost:8000/api');

// For infinityfree hosting (change this when deploying):
 define('API_BASE_URL', '');

// Site URL
// For localhost development:
//define('SITE_URL', 'http://localhost:5173');

// For infinityfree hosting (change this when deploying):
 define('SITE_URL', '');

// Upload directory paths (relative to web root)
define('UPLOAD_DIR', 'uploads/');
define('PROFILE_IMAGES_DIR', 'uploads/profiles/');
define('BOOK_COVERS_DIR', 'uploads/covers/');
define('BOOK_PDFS_DIR', 'uploads/pdfs/');

// Full filesystem paths for uploads
define('UPLOAD_PATH', __DIR__ . '/../../uploads/');
define('PROFILE_IMAGES_PATH', __DIR__ . '/../../uploads/profiles/');
define('BOOK_COVERS_PATH', __DIR__ . '/../../uploads/covers/');
define('BOOK_PDFS_PATH', __DIR__ . '/../../uploads/pdfs/');

// Full URLs for accessing uploaded files
define('PROFILE_IMAGES_URL', API_BASE_URL . '/../uploads/profiles/');
define('BOOK_COVERS_URL', API_BASE_URL . '/../uploads/covers/');
define('BOOK_PDFS_URL', API_BASE_URL . '/../uploads/pdfs/');

// Session configuration
define('SESSION_NAME', 'iitshelf_session');
define('SESSION_LIFETIME', 86400); // 24 hours

// OTP configuration
define('OTP_LIFETIME', 600); // 10 minutes
define('OTP_MAX_ATTEMPTS', 5);

// Pagination
define('ITEMS_PER_PAGE', 20);

// File upload limits
define('MAX_FILE_SIZE', 10 * 1024 * 1024); // 10MB
define('ALLOWED_IMAGE_TYPES', ['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
define('ALLOWED_PDF_TYPES', ['application/pdf']);

// CORS settings
define('CORS_ALLOWED_ORIGINS', '*'); // Change to specific domain in production
define('CORS_ALLOWED_METHODS', 'GET, POST, PUT, DELETE, OPTIONS');
define('CORS_ALLOWED_HEADERS', 'Content-Type, Authorization');
?>