#!/bin/bash

# IIT Shelf Backend Startup Script

echo "================================"
echo "Starting IIT Shelf Backend"
echo "================================"
echo

# Check if MariaDB is running
if ! systemctl is-active --quiet mariadb; then
    echo "Starting MariaDB..."
    sudo systemctl start mariadb
    sleep 2
fi

# Check if database exists
if ! sudo mariadb -e "USE iit_shelf;" 2>/dev/null; then
    echo "Database not found. Creating database..."
    SCHEMA_PATH="$(dirname "$0")/database/schema.sql"
    if [ -f "$SCHEMA_PATH" ]; then
        sudo mariadb < "$SCHEMA_PATH"
    else
        echo "WARNING: Schema file not found at $SCHEMA_PATH"
    fi
fi

# Kill any existing PHP server
if pgrep -f "php -S.*8000" > /dev/null; then
    echo "Stopping existing PHP server..."
    killall php 2>/dev/null
    sleep 1
fi

# Start PHP development server with router.php
echo "Starting PHP development server on ..."
cd "$(dirname "$0")"
nohup php -S 0.0.0.0:8000 router.php > /tmp/php_server.log 2>&1 &

sleep 2

# Check if server started successfully
if pgrep -f "php -S.*8000" > /dev/null; then
    echo "✓ PHP server started successfully!"
    echo "✓ API is available at: "
    echo
    echo "Test endpoints:"
    echo "  - GET  /api/books/get_books.php"
    echo "  - POST /api/auth/login.php"
    echo "  - POST /api/auth/register.php"
    echo
    echo "Run './test_api.sh' to test all endpoints"
    echo
    echo "Server logs: tail -f /tmp/php_server.log"
else
    echo "✗ Failed to start PHP server"
    echo "Check logs: cat /tmp/php_server.log"
    exit 1
fi

echo "================================"
