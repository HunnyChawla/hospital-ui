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
var TTS_API_URL = process.env.TTS_API_URL || '';

/**
 * Display configuration.
 *
 * The two queue columns used to be hard-coded in public/app.js, along with the
 * statuses in their query strings and in every render/stats/announcement
 * branch. That made this display eye-hospital-only: a general hospital has no
 * optometrist stage, so both columns came back empty.
 *
 * THE DEFAULTS BELOW REPRODUCE THE PREVIOUS BEHAVIOUR EXACTLY — same URLs, same
 * statuses, same wording, same 5-second poll. An existing screen with no
 * TV_COLUMNS set makes byte-identical requests to the ones it made before,
 * which is what lets these screens be updated one at a time: they hang on
 * walls, often unattended, and cannot be force-refreshed on demand.
 *
 * Fields, all optional except `key` and `endpoint`:
 *
 *   key         which panel renders it — must be "optometrist" (left) or
 *               "doctor" (right); these are panel positions, not specialities
 *   endpoint    path appended to the API base; {doctorId} is substituted
 *   title       heading text above the panel
 *   waiting     statuses counted in the "Waiting" badge
 *   active      statuses counted in "In Progress" and drawn highlighted
 *   inProgress  subset of `active` drawn with the in-progress style
 *   announce    statuses that trigger the chime and the spoken call-out
 *   labels      status -> card text; unlisted statuses fall back to the stage
 *               label returned by the API
 *   cabinField  field on the queue item holding the room/cabin name
 *   announcement  how the spoken call-out ends when the patient has no cabin
 *               to be sent to, e.g. "please proceed to the nurse's room."
 *
 * A general hospital points both columns at the pathway queue instead, e.g.
 *
 *   TV_COLUMNS='[
 *     {"key":"optometrist","title":"Waiting for Nurse",
 *      "endpoint":"/pathways/queue?stage_codes=awaiting_nurse,nurse_assigned&doctor_id={doctorId}",
 *      "waiting":["awaiting_nurse"],"active":["nurse_assigned"],
 *      "announce":["nurse_assigned"],
 *      "announcement":"please proceed to the nurse's room."},
 *     {"key":"doctor","title":"Waiting for Doctor",
 *      "endpoint":"/pathways/queue?stage_codes=awaiting_doctor,doctor_assigned,consultation_in_progress&doctor_id={doctorId}&include_covering_doctors=true",
 *      "waiting":["awaiting_doctor"],
 *      "active":["doctor_assigned","consultation_in_progress"],
 *      "inProgress":["consultation_in_progress"],
 *      "announce":["doctor_assigned"]}
 *   ]'
 *
 * Omitting `labels` there is deliberate: the pathway queue returns each stage's
 * own label, so the cards read correctly without restating it here.
 */
var DEFAULT_COLUMNS = [
    {
        key: 'optometrist',
        title: 'Optometrist Queue',
        endpoint: '/pathways/queue'
            + '?doctor_id={doctorId}'
            + '&stage_codes=awaiting_optometrist,optometrist_assigned',
        waiting: ['awaiting_optometrist'],
        active: ['optometrist_assigned'],
        inProgress: [],
        announce: ['optometrist_assigned'],
        labels: {
            awaiting_optometrist: 'Waiting',
            optometrist_assigned: 'Called'
        },
        cabinRole: 'optometrist',
        cabinField: 'optometrist_cabin',
        announcement: 'please proceed for eye examination.'
    },
    {
        key: 'doctor',
        title: 'Doctor Queue',
        endpoint: '/pathways/queue'
            + '?doctor_id={doctorId}&include_covering_doctors=true'
            + '&stage_codes=awaiting_doctor,doctor_assigned,consultation_in_progress',
        waiting: ['awaiting_doctor'],
        active: ['doctor_assigned', 'consultation_in_progress'],
        inProgress: ['consultation_in_progress'],
        announce: ['doctor_assigned'],
        labels: {
            awaiting_doctor: 'Waiting',
            doctor_assigned: 'Called',
            consultation_in_progress: 'In Consultation'
        },
        cabinRole: 'doctor',
        cabinField: 'doctor_cabin',
        announcement: 'your consultation is ready.'
    }
];

function readColumns() {
    if (!process.env.TV_COLUMNS) return DEFAULT_COLUMNS;
    try {
        var parsed = JSON.parse(process.env.TV_COLUMNS);
        if (Object.prototype.toString.call(parsed) === '[object Array]' && parsed.length) {
            return parsed;
        }
        console.error('TV_COLUMNS is not a non-empty array; using defaults');
    } catch (e) {
        // Never let bad configuration blank a waiting-room screen.
        console.error('TV_COLUMNS is not valid JSON; using defaults:', e.message);
    }
    return DEFAULT_COLUMNS;
}

// 5 seconds is what public/app.js polled at before this was configurable.
var DISPLAY_CONFIG = {
    refreshSeconds: parseInt(process.env.TV_REFRESH_SECONDS || '5', 10),
    columns: readColumns()
};

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
            apiBaseUrl: API_BASE_URL,
            ttsApiUrl: TTS_API_URL,
            display: DISPLAY_CONFIG
        }));
        return;
    }

    // Default to index.html
    if (urlPath === '/') {
        urlPath = '/index.html';
    }

    // Build file path
    var filePath = path.join(__dirname, 'public', urlPath);

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
    console.log('TTS API URL:       ' + (TTS_API_URL || '(not configured)'));
    console.log('');
    console.log('Open your browser and navigate to:');
    console.log('  http://localhost:' + PORT);
    console.log('');
    console.log('Press Ctrl+C to stop the server.');
    console.log('========================================');
});
