/**
 * TV Legacy Display - Simple HTTP Server
 * Serves static files on port 5500
 * 
 * Usage: node server.js
 * Or: npm start
 */

var http = require('http');
var fs = require('fs');
var path = require('path');

// Load environment variables from .env file if it exists
try {
    var envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        var envContent = fs.readFileSync(envPath, 'utf8');
        var lines = envContent.split('\n');
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (line && line.indexOf('#') !== 0 && line.indexOf('=') !== -1) {
                var parts = line.split('=');
                var key = parts[0].trim();
                var value = parts.slice(1).join('=').trim();
                // Remove quotes if present
                if ((value.indexOf('"') === 0 && value.lastIndexOf('"') === value.length - 1) ||
                    (value.indexOf("'") === 0 && value.lastIndexOf("'") === value.length - 1)) {
                    value = value.substring(1, value.length - 1);
                }
                if (!process.env[key]) {
                    process.env[key] = value;
                }
            }
        }
    }
} catch (e) {
    console.error('Error loading .env file:', e);
}

var PORT = process.env.PORT || 5500;
var API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080';

// MIME types for serving files
var mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg'
};

var server = http.createServer(function (req, res) {
    // Log request
    console.log(new Date().toISOString() + ' ' + req.method + ' ' + req.url);

    // Parse URL
    var urlPath = req.url.split('?')[0];

    // Handle config endpoint
    if (urlPath === '/config') {
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache'
        });
        res.end(JSON.stringify({
            apiBaseUrl: API_BASE_URL
        }));
        return;
    }

    // Default to index.html
    if (urlPath === '/') {
        urlPath = '/index.html';
    }

    // Build file path
    var filePath = path.join(__dirname, urlPath);

    // Get file extension
    var ext = path.extname(filePath).toLowerCase();
    var contentType = mimeTypes[ext] || 'application/octet-stream';

    // Read and serve file
    fs.readFile(filePath, function (err, data) {
        if (err) {
            if (err.code === 'ENOENT') {
                // File not found
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 Not Found</h1><p>The requested file was not found.</p>');
            } else {
                // Server error
                res.writeHead(500, { 'Content-Type': 'text/html' });
                res.end('<h1>500 Internal Server Error</h1>');
            }
        } else {
            // Success - add CORS headers for API requests
            res.writeHead(200, {
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            });
            res.end(data);
        }
    });
});

server.listen(PORT, function () {
    console.log('========================================');
    console.log('TV Legacy Display Server');
    console.log('========================================');
    console.log('Server running at: http://localhost:' + PORT);
    console.log('API Base URL:      ' + API_BASE_URL);
    console.log('');
    console.log('Open your browser and navigate to:');
    console.log('  http://localhost:' + PORT);
    console.log('');
    console.log('Press Ctrl+C to stop the server.');
    console.log('========================================');
});
