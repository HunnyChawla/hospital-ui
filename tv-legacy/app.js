/**
 * TV Legacy Display - JavaScript Application
 * ES5 Compatible (no arrow functions, const/let, template literals, etc.)
 * Uses XMLHttpRequest instead of fetch
 * Uses polling instead of SSE
 */

(function () {
    'use strict';

    // ================================================
    // CONFIGURATION
    // ================================================

    var CONFIG = {
        POLL_INTERVAL: 15000,  // Poll every 15 seconds
        CLOCK_INTERVAL: 1000, // Update clock every second
        DEFAULT_API_URL: 'http://localhost:8080',  // Will be updated from /config endpoint
        API_URL: null,  // Will be set after loading config
        ANNOUNCEMENT_API_URL: null, // TTS service URL, loaded from /config
        DEBUG_ANNOUNCEMENTS: false  // Set to true for verbose announcement logs
    };

    // ================================================
    // STORAGE HELPERS
    // ================================================

    function getItem(key) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            return null;
        }
    }

    function setItem(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            // localStorage not available
        }
    }

    function updateCurrentYear() {
        var year = 2026;
        var elements = document.getElementsByClassName('current-year');
        for (var i = 0; i < elements.length; i++) {
            elements[i].innerHTML = year;
        }
    }

    window.toggleHeader = function (hide) {
        if (hide) {
            document.body.className += ' header-hidden';
        } else {
            document.body.className = document.body.className.replace(' header-hidden', '');
        }
        setItem('tv_hide_header', hide ? 'true' : 'false');
    };

    function applyHeaderPreference() {
        var hide = getItem('tv_hide_header') === 'true';
        var checkbox = document.getElementById('toggle-header');
        if (checkbox) {
            checkbox.checked = hide;
        }
        if (hide) {
            document.body.className += ' header-hidden';
        }
    }

    function removeItem(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            // localStorage not available
        }
    }

    function getApiUrl() {
        // Use runtime config if available, otherwise fall back to localStorage or default
        return CONFIG.API_URL || getItem('tv_api_url') || CONFIG.DEFAULT_API_URL;
    }

    function getAuthToken() {
        return getItem('tv_auth_token');
    }

    function getTenantId() {
        return getItem('tv_tenant_id');
    }

    function getSelectedDoctorId() {
        return getItem('tv_selected_doctor');
    }

    function setSelectedDoctorId(id) {
        setItem('tv_selected_doctor', id);
    }

    function getHospitalId() {
        return getItem('tv_hospital_id');
    }

    function setHospitalId(id) {
        setItem('tv_hospital_id', id);
    }

    // ================================================
    // ANNOUNCEMENT SETTINGS HELPERS
    // ================================================

    function getAnnouncementsEnabled() {
        var val = getItem('tv_announcements_enabled');
        return val === null ? true : val === 'true';
    }

    function setAnnouncementsEnabled(enabled) {
        setItem('tv_announcements_enabled', enabled ? 'true' : 'false');
    }

    function getAnnounceBothLanguages() {
        var val = getItem('tv_announce_both_languages');
        return val === null ? true : val === 'true';
    }

    function setAnnounceBothLanguages(both) {
        setItem('tv_announce_both_languages', both ? 'true' : 'false');
    }

    function getDebugAnnouncements() {
        return CONFIG.DEBUG_ANNOUNCEMENTS || getItem('tv_debug_announcements') === 'true';
    }

    function getTtsApiUrl() {
        return CONFIG.ANNOUNCEMENT_API_URL ||
               getItem('tv_announcement_api_url') ||
               '';
    }

    function debugLog() {
        if (!getDebugAnnouncements()) return;
        var args = Array.prototype.slice.call(arguments);
        args.unshift('[Announcement]');
        console.log.apply(console, args);
    }

    // ================================================
    // ANNOUNCEMENT TEXT GENERATOR
    // ================================================

    /**
     * Build a clear English announcement sentence for TTS.
     * The backend will translate to Hindi automatically when language='hi'.
     *
     * Examples:
     *   "Patient John Doe, token number 25, please proceed to Room 3."
     *   "Patient John Doe, token number 25, please proceed for consultation."
     */
    var AnnouncementTextGenerator = {
        build: function (patientName, tokenNumber, destination) {
            var name = (patientName || 'the patient').trim();
            var token = tokenNumber || '';
            var dest = (destination || '').trim();

            if (!dest) {
                dest = 'the consultation area';
            }

            var text = 'Patient ' + name + ', token number ' + token +
                       ', please proceed to ' + dest + '.';
            return text;
        }
    };

    // ================================================
    // ANNOUNCEMENT SERVICE  (XHR + Audio Blob)
    // ================================================

    /**
     * Calls the gTTS API for a single language, plays the returned MP3 blob.
     * onDone() is called after audio ends. onError(msg) is called on failure.
     */
    function playTTSAudio(text, lang, onDone, onError) {
        var ttsUrl = getTtsApiUrl();
        if (!ttsUrl) {
            debugLog('TTS API URL not configured - skipping language: ' + lang);
            onDone && onDone();
            return;
        }

        debugLog('POST /api/v1/speech', { text: text, language: lang });

        var xhr = new XMLHttpRequest();
        xhr.open('POST', ttsUrl.replace(/\/$/, '') + '/api/v1/speech', true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.responseType = 'blob';

        xhr.onload = function () {
            debugLog('API response status: ' + xhr.status + ' lang=' + lang);
            if (xhr.status >= 200 && xhr.status < 300) {
                var blob = xhr.response;
                debugLog('Audio blob size: ' + blob.size + ' bytes');
                var objectUrl = URL.createObjectURL(blob);
                var audio = new Audio(objectUrl);

                audio.oncanplaythrough = null; // Not needed but good practice

                audio.onended = function () {
                    debugLog('Audio playback ended (' + lang + ')');
                    URL.revokeObjectURL(objectUrl);
                    onDone && onDone();
                };

                audio.onerror = function (e) {
                    console.error('[Announcement] Audio playback error (' + lang + '):', e);
                    URL.revokeObjectURL(objectUrl);
                    onError && onError('Audio playback error for language: ' + lang);
                };

                debugLog('Starting audio playback (' + lang + ')');
                audio.play();
            } else {
                var msg = 'API returned HTTP ' + xhr.status + ' for language: ' + lang;
                console.error('[Announcement]', msg);
                onError && onError(msg);
            }
        };

        xhr.onerror = function () {
            var msg = 'Network error reaching TTS API for language: ' + lang;
            console.error('[Announcement]', msg);
            onError && onError(msg);
        };

        xhr.ontimeout = function () {
            var msg = 'TTS API request timed out for language: ' + lang;
            console.error('[Announcement]', msg);
            onError && onError(msg);
        };

        xhr.timeout = 15000; // 15 second timeout
        xhr.send(JSON.stringify({ text: text, language: lang, slow: false }));
    }

    /**
     * Plays English announcement, then Hindi if bothLanguages=true.
     * Both use the same English text; backend auto-translates Hindi.
     */
    var AnnouncementService = {
        play: function (text, bothLanguages, onDone, onError) {
            debugLog('Playing announcement:', text, '| bothLanguages:', bothLanguages);

            playTTSAudio(text, 'en', function () {
                if (bothLanguages) {
                    debugLog('English done - starting Hindi');
                    playTTSAudio(text, 'hi', function () {
                        debugLog('Hindi done - announcement complete');
                        onDone && onDone();
                    }, function (errMsg) {
                        console.error('[Announcement] Hindi failed:', errMsg);
                        // Hindi failure is non-blocking - consider announcement done
                        onDone && onDone();
                    });
                } else {
                    debugLog('English done - announcement complete');
                    onDone && onDone();
                }
            }, function (errMsg) {
                console.error('[Announcement] English failed:', errMsg);
                onError && onError(errMsg);
            });
        }
    };

    // ================================================
    // ANNOUNCEMENT QUEUE  (Sequential, Dedup-safe)
    // ================================================

    var AnnouncementQueue = (function () {
        var _queue = [];
        var _processing = false;
        var _registry = {}; // key: visit_id + '::' + status -> timestamp

        // Load persisted registry from localStorage
        function _loadRegistry() {
            try {
                var raw = getItem('tv_announced_registry');
                if (raw) {
                    var parsed = JSON.parse(raw);
                    var now = Date.now();
                    var ttl = 12 * 60 * 60 * 1000; // 12 hours
                    // Prune stale entries
                    for (var key in parsed) {
                        if (parsed.hasOwnProperty(key)) {
                            if (now - parsed[key] < ttl) {
                                _registry[key] = parsed[key];
                            }
                        }
                    }
                }
            } catch (e) {
                _registry = {};
            }
        }

        function _saveRegistry() {
            try {
                setItem('tv_announced_registry', JSON.stringify(_registry));
            } catch (e) {
                // Ignore storage errors
            }
        }

        function _makeKey(visitId, status) {
            return visitId + '::' + status;
        }

        function _isAnnounced(visitId, status) {
            return !!_registry[_makeKey(visitId, status)];
        }

        function _markAnnounced(visitId, status) {
            _registry[_makeKey(visitId, status)] = Date.now();
            _saveRegistry();
        }

        function _processNext() {
            if (_queue.length === 0) {
                _processing = false;
                debugLog('Queue empty - processing stopped');
                _updateQueueStatusUI();
                return;
            }

            _processing = true;
            var item = _queue.shift();
            debugLog('Processing announcement:', item, '| Remaining in queue:', _queue.length);
            _updateQueueStatusUI();

            var text = AnnouncementTextGenerator.build(
                item.patient_name,
                item.token_number,
                item.destination
            );

            var bothLangs = getAnnounceBothLanguages();

            AnnouncementService.play(text, bothLangs,
                function () {
                    // Success - process next
                    debugLog('Announcement done for', item.patient_name);
                    _processNext();
                },
                function (errMsg) {
                    // Error - log and skip to next to keep queue moving
                    console.error('[AnnouncementQueue] Skipping failed announcement:', errMsg);
                    _processNext();
                }
            );
        }

        function _updateQueueStatusUI() {
            var el = document.getElementById('announcement-queue-status');
            if (!el) return;
            if (_processing) {
                el.innerHTML = 'Playing... (' + (_queue.length) + ' pending)';
                el.className = 'ann-status ann-status-playing';
            } else if (_queue.length > 0) {
                el.innerHTML = 'Queued: ' + _queue.length;
                el.className = 'ann-status ann-status-queued';
            } else {
                el.innerHTML = 'Idle';
                el.className = 'ann-status ann-status-idle';
            }
        }

        // Initialize on module creation
        _loadRegistry();

        return {
            add: function (item) {
                if (!getAnnouncementsEnabled()) {
                    debugLog('Announcements disabled - skipping:', item.patient_name);
                    return;
                }
                if (!getTtsApiUrl()) {
                    debugLog('TTS API URL not set - skipping:', item.patient_name);
                    return;
                }
                if (_isAnnounced(item.visit_id, item.status)) {
                    debugLog('Duplicate skipped:', item.visit_id, item.status);
                    return;
                }

                _markAnnounced(item.visit_id, item.status);
                _queue.push(item);
                debugLog('Queued:', item.patient_name, '| Queue length:', _queue.length);
                _updateQueueStatusUI();

                if (!_processing) {
                    _processNext();
                }
            },

            playDirect: function (text, bothLanguages, onDone, onError) {
                // Used by the test panel - bypasses queue and dedup
                debugLog('Direct play (test):', text);
                AnnouncementService.play(text, bothLanguages, onDone, onError);
            },

            reset: function () {
                _queue = [];
                _processing = false;
                debugLog('Queue reset');
                _updateQueueStatusUI();
            },

            getStats: function () {
                return { queueLength: _queue.length, processing: _processing };
            }
        };
    })();

    // ================================================
    // AJAX HELPER (XMLHttpRequest for old browsers)
    // ================================================

    function ajax(options) {
        var xhr;

        // Create XMLHttpRequest (IE6+ compatible)
        if (window.XMLHttpRequest) {
            xhr = new XMLHttpRequest();
        } else if (window.ActiveXObject) {
            try {
                xhr = new ActiveXObject('Msxml2.XMLHTTP');
            } catch (e) {
                try {
                    xhr = new ActiveXObject('Microsoft.XMLHTTP');
                } catch (e2) {
                    options.error && options.error({ message: 'XMLHttpRequest not supported' });
                    return;
                }
            }
        }

        var method = options.method || 'GET';
        var url = options.url;
        var data = options.data;
        var headers = options.headers || {};

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                var response;
                try {
                    response = JSON.parse(xhr.responseText);
                } catch (e) {
                    response = xhr.responseText;
                }

                if (xhr.status >= 200 && xhr.status < 300) {
                    options.success && options.success(response, xhr.status);
                } else {
                    options.error && options.error(response, xhr.status);
                }
            }
        };

        xhr.open(method, url, true);

        // Set headers
        xhr.setRequestHeader('Content-Type', 'application/json');
        for (var key in headers) {
            if (headers.hasOwnProperty(key)) {
                xhr.setRequestHeader(key, headers[key]);
            }
        }

        // Send request
        if (data) {
            xhr.send(JSON.stringify(data));
        } else {
            xhr.send();
        }
    }

    // ================================================
    // CONFIG LOADING
    // ================================================

    function loadConfig(callback) {
        // Try to load config from /config endpoint
        ajax({
            method: 'GET',
            url: '/config',
            success: function (response) {
                if (response && response.apiBaseUrl) {
                    CONFIG.API_URL = response.apiBaseUrl;
                    CONFIG.DEFAULT_API_URL = response.apiBaseUrl;
                }
                if (response && response.ttsApiUrl) {
                    CONFIG.ANNOUNCEMENT_API_URL = response.ttsApiUrl;
                }
                callback && callback();
            },
            error: function () {
                // If config endpoint fails, use defaults
                callback && callback();
            }
        });
    }

    // ================================================
    // LOGIN FUNCTIONS
    // ================================================

    window.handleLogin = function (event) {
        event.preventDefault();

        var hospitalId = document.getElementById('hospital_id').value;
        setHospitalId(hospitalId); // Save hospital id for next time

        var email = document.getElementById('email').value;
        var password = document.getElementById('password').value;
        var apiUrl = getApiUrl();

        var errorEl = document.getElementById('error-message');
        var btnText = document.getElementById('btn-text');
        var btnLoading = document.getElementById('btn-loading');
        var loginBtn = document.getElementById('login-btn');

        // Show loading state
        errorEl.style.display = 'none';
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline';
        loginBtn.disabled = true;

        // Make login request
        ajax({
            method: 'POST',
            url: apiUrl.replace(/\/$/, '') + '/auth/login',
            data: {
                email: email,
                password: password,
                hospital_id: hospitalId
            },
            success: function (response) {
                // Store auth data
                if (response.token && response.token.access_token) {
                    setItem('tv_auth_token', response.token.access_token);
                } else if (response.access_token) {
                    setItem('tv_auth_token', response.access_token);
                }
                setItem('tv_user_id', response.user_id || '');
                setItem('tv_tenant_id', response.tenant_id || '');
                setItem('tv_role', response.role || '');

                // Redirect to display page
                window.location.href = 'display.html';
            },
            error: function (response, status) {
                // Show error message
                var message = 'Login failed. Please check your credentials.';
                if (response && response.message) {
                    message = response.message;
                } else if (response && response.detail) {
                    message = response.detail;
                } else if (status === 0) {
                    message = 'Cannot connect to server. Please check the backend URL.';
                }

                errorEl.innerHTML = message;
                errorEl.style.display = 'block';

                // Reset button state
                btnText.style.display = 'inline';
                btnLoading.style.display = 'none';
                loginBtn.disabled = false;
            }
        });

        return false;
    };

    window.handleLogout = function () {
        removeItem('tv_auth_token');
        removeItem('tv_user_id');
        removeItem('tv_tenant_id');
        removeItem('tv_role');
        removeItem('tv_selected_doctor');
        window.location.href = 'index.html';
    };

    // ================================================
    // QR LOGIN FUNCTIONS
    // ================================================

    var qrPollInterval = null;
    var qrSessionCode = null;
    var qrExpiryTime = null;
    var qrTimerInterval = null;

    window.toggleLoginMethod = function () {
        var form = document.getElementById('login-form');
        var qrContainer = document.getElementById('qr-login-container');
        var toggleLink = document.getElementById('toggle-method');
        var hospitalIdInput = document.getElementById('hospital_id');
        var hospitalId = hospitalIdInput ? hospitalIdInput.value.trim() : '';

        if (form.style.display !== 'none') {
            // Switch to QR
            if (!hospitalId) {
                alert('Please enter Hospital ID first');
                hospitalIdInput.focus();
                return;
            }
            setHospitalId(hospitalId); // Save hospital id

            form.style.display = 'none';
            qrContainer.style.display = 'block';
            toggleLink.innerHTML = 'Switch to Password Login';
            initQRLogin(hospitalId);
        } else {
            // Switch to Password
            stopQRLogin();
            qrContainer.style.display = 'none';
            form.style.display = 'block';
            toggleLink.innerHTML = 'Switch to QR Code Login';
        }
    };

    function initQRLogin(hospitalId) {
        var apiUrl = getApiUrl();
        var imgEl = document.getElementById('qr-code-img');
        var loadingEl = document.getElementById('qr-loading');
        var timerEl = document.getElementById('qr-timer');

        // Reset state
        imgEl.style.display = 'none';
        loadingEl.style.display = 'block';
        timerEl.innerHTML = '';
        qrSessionCode = null;

        ajax({
            method: 'POST',
            url: apiUrl.replace(/\/$/, '') + '/auth/tv/session',
            data: {
                hospital_id: hospitalId
            },
            success: function (response) {
                qrSessionCode = response.session_code;
                qrExpiryTime = new Date(response.expires_at).getTime();

                // Set image source
                imgEl.src = response.qr_image_url;
                imgEl.onload = function () {
                    loadingEl.style.display = 'none';
                    imgEl.style.display = 'inline-block';
                };

                // Start polling
                startQRPolling();
                startQRTimer();
            },
            error: function (response) {
                loadingEl.innerHTML = 'Error generating QR code.<br>Please try again.';
                console.error('QR Init Error:', response);
            }
        });
    }

    function stopQRLogin() {
        if (qrPollInterval) clearInterval(qrPollInterval);
        if (qrTimerInterval) clearInterval(qrTimerInterval);
        qrPollInterval = null;
        qrTimerInterval = null;
    }

    function startQRPolling() {
        if (qrPollInterval) clearInterval(qrPollInterval);
        qrPollInterval = setInterval(function () {
            checkSessionStatus();
        }, 3000); // Poll every 3 seconds
    }

    function checkSessionStatus() {
        if (!qrSessionCode) return;

        var apiUrl = getApiUrl();

        ajax({
            method: 'GET',
            url: apiUrl.replace(/\/$/, '') + '/auth/tv/session/' + qrSessionCode + '/status',
            success: function (response) {
                if (response.status === 'authenticated') {
                    // Login successful
                    stopQRLogin();

                    if (response.access_token) {
                        setItem('tv_auth_token', response.access_token);
                        setItem('tv_user_id', response.user_id || '');
                        setItem('tv_tenant_id', response.tenant_id || '');
                        setItem('tv_role', response.role || '');

                        // Redirect
                        window.location.href = 'display.html';
                    }
                } else if (response.status === 'expired') {
                    stopQRLogin();
                    document.getElementById('qr-timer').innerHTML = '<span style="color: red">Session expired. Please refresh.</span>';
                }
            },
            error: function () {
                // Ignore network errors during polling, just retry next time
            }
        });
    }

    function startQRTimer() {
        if (qrTimerInterval) clearInterval(qrTimerInterval);

        function updateTimer() {
            var now = new Date().getTime();
            var distance = qrExpiryTime - now;

            if (distance < 0) {
                clearInterval(qrTimerInterval);
                document.getElementById('qr-timer').innerHTML = "EXPIRED";
                return;
            }

            var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            var seconds = Math.floor((distance % (1000 * 60)) / 1000);

            document.getElementById('qr-timer').innerHTML = "Expires in " + minutes + "m " + seconds + "s";
        }

        updateTimer();
        qrTimerInterval = setInterval(updateTimer, 1000);
    }

    // ================================================
    // DISPLAY PAGE FUNCTIONS
    // ================================================

    var pollInterval = null;
    var clockInterval = null;
    var previousOptQueue = [];
    var previousDocQueue = [];

    window.initDisplay = function () {
        // Check if logged in
        if (!getAuthToken()) {
            window.location.href = 'index.html';
            return;
        }

        // Load config first, then initialize display
        loadConfig(function () {
            // Update year
            updateCurrentYear();

            // Apply header preference
            applyHeaderPreference();

            // Apply announcement settings (syncs footer checkboxes)
            applyAnnouncementSettings();

            // Start clock
            updateClock();
            clockInterval = setInterval(updateClock, CONFIG.CLOCK_INTERVAL);

            // Load doctors
            loadDoctors();
        });
    };

    function updateClock() {
        var now = new Date();
        var hours = now.getHours();
        var minutes = now.getMinutes();
        var seconds = now.getSeconds();

        // Pad with zeros
        hours = hours < 10 ? '0' + hours : hours;
        minutes = minutes < 10 ? '0' + minutes : minutes;
        seconds = seconds < 10 ? '0' + seconds : seconds;

        var clockEl = document.getElementById('clock');
        if (clockEl) {
            clockEl.innerHTML = hours + ':' + minutes + ':' + seconds;
        }
    }

    function updateLastUpdateTime() {
        var now = new Date();
        var hours = now.getHours();
        var minutes = now.getMinutes();
        var seconds = now.getSeconds();

        hours = hours < 10 ? '0' + hours : hours;
        minutes = minutes < 10 ? '0' + minutes : minutes;
        seconds = seconds < 10 ? '0' + seconds : seconds;

        var el = document.getElementById('last-update');
        if (el) {
            el.innerHTML = hours + ':' + minutes + ':' + seconds;
        }
    }

    function setConnectionStatus(status) {
        var dot = document.getElementById('status-dot');
        var text = document.getElementById('status-text');

        if (!dot || !text) return;

        dot.className = '';

        if (status === 'connected') {
            dot.className = 'status-connected';
            text.innerHTML = 'Live';
        } else if (status === 'connecting') {
            dot.className = 'status-connecting';
            text.innerHTML = 'Connecting...';
        } else {
            dot.className = 'status-error';
            text.innerHTML = 'Error';
        }
    }

    function loadDoctors() {
        var apiUrl = getApiUrl();
        var token = getAuthToken();

        ajax({
            method: 'GET',
            url: apiUrl + '/doctors',
            headers: {
                'Authorization': 'Bearer ' + token
            },
            success: function (response) {
                var doctors = response.data || response || [];
                var selector = document.getElementById('doctor-selector');

                if (!selector) return;

                // Clear existing options
                selector.innerHTML = '';

                if (doctors.length === 0) {
                    var opt = document.createElement('option');
                    opt.value = '';
                    opt.innerHTML = 'No doctors available';
                    selector.appendChild(opt);
                    return;
                }

                // Add doctor options
                for (var i = 0; i < doctors.length; i++) {
                    var doc = doctors[i];
                    var opt = document.createElement('option');
                    opt.value = doc.id;
                    opt.innerHTML = doc.user_name || doc.name || ('Dr. ' + (doc.specialization || 'Unknown'));
                    selector.appendChild(opt);
                }

                // Select previously selected doctor or first one
                var savedDoctorId = getSelectedDoctorId();
                if (savedDoctorId) {
                    selector.value = savedDoctorId;
                } else if (doctors.length > 0) {
                    selector.value = doctors[0].id;
                    setSelectedDoctorId(doctors[0].id);
                }

                // Start polling
                startPolling();
            },
            error: function (response, status) {
                var selector = document.getElementById('doctor-selector');
                if (selector) {
                    selector.innerHTML = '<option value="">Error loading doctors</option>';
                }
                setConnectionStatus('error');

                // Handle 401 - redirect to login
                if (status === 401) {
                    handleLogout();
                }
            }
        });
    }

    window.handleDoctorChange = function () {
        var selector = document.getElementById('doctor-selector');
        if (selector && selector.value) {
            setSelectedDoctorId(selector.value);
            // Clear previous queues
            previousOptQueue = [];
            previousDocQueue = [];
            // Reset announcement queue so stale items from previous doctor are dropped
            AnnouncementQueue.reset();
            // Fetch immediately
            fetchQueues();
        }
    };

    function startPolling() {
        // Initial fetch
        fetchQueues();

        // Start polling interval
        if (pollInterval) {
            clearInterval(pollInterval);
        }
        pollInterval = setInterval(fetchQueues, CONFIG.POLL_INTERVAL);
    }

    function fetchQueues() {
        var doctorId = getSelectedDoctorId();
        if (!doctorId) return;

        var apiUrl = getApiUrl();
        var token = getAuthToken();

        setConnectionStatus('connecting');

        // Fetch optometrist queue
        ajax({
            method: 'GET',
            url: apiUrl + '/opd/eye-hospital/optometrist-queue/' + doctorId + '?status=awaiting_optometrist,optometrist_assigned',
            headers: {
                'Authorization': 'Bearer ' + token
            },
            success: function (response) {
                var patients = parseQueueResponse(response);
                renderOptometristQueue(patients);
                updateOptometristStats(patients);
                checkForNewAssignments(patients, previousOptQueue, 'optometrist');
                previousOptQueue = patients;
                setConnectionStatus('connected');
                updateLastUpdateTime();
            },
            error: function (response, status) {
                if (status === 401) {
                    handleLogout();
                }
                setConnectionStatus('error');
            }
        });

        // Fetch doctor queue
        ajax({
            method: 'GET',
            url: apiUrl + '/opd/eye-hospital/group-queue/' + doctorId + '?status=awaiting_doctor,doctor_assigned,consultation_in_progress',
            headers: {
                'Authorization': 'Bearer ' + token
            },
            success: function (response) {
                var patients = parseQueueResponse(response);
                renderDoctorQueue(patients);
                updateDoctorStats(patients);
                checkForNewAssignments(patients, previousDocQueue, 'doctor');
                previousDocQueue = patients;
                setConnectionStatus('connected');
                updateLastUpdateTime();
            },
            error: function (response, status) {
                if (status === 401) {
                    handleLogout();
                }
                setConnectionStatus('error');
            }
        });
    }

    function parseQueueResponse(response) {
        if (!response) return [];
        if (Array.isArray(response)) return response;
        if (response.items && Array.isArray(response.items)) return response.items;
        if (response.data && Array.isArray(response.data)) return response.data;
        if (response.queue && Array.isArray(response.queue)) return response.queue;
        if (response.slots && Array.isArray(response.slots)) return response.slots;
        if (response.entries && Array.isArray(response.entries)) return response.entries;
        return [];
    }

    function checkForNewAssignments(current, previous, queueType) {
        debugLog('Polling cycle -', queueType, '| current:', current.length, '| previous:', previous.length);

        var soundPlayed = false;

        // Check for newly assigned patients
        for (var i = 0; i < current.length; i++) {
            var curr = current[i];

            // Eligible statuses for announcements
            var isAssigned = (queueType === 'optometrist' && curr.status === 'optometrist_assigned') ||
                             (queueType === 'doctor'      && curr.status === 'doctor_assigned');

            if (!isAssigned) continue;

            // Check if this patient+status was already in the previous snapshot
            var wasAssigned = false;
            for (var j = 0; j < previous.length; j++) {
                var prev = previous[j];
                if (prev.visit_id === curr.visit_id && prev.status === curr.status) {
                    wasAssigned = true;
                    break;
                }
            }

            if (!wasAssigned) {
                // --- Notification chime (one per poll cycle) ---
                if (!soundPlayed) {
                    playNotificationSound();
                    soundPlayed = true;
                }

                // --- Queue TTS announcement ---
                var destination = '';
                if (queueType === 'optometrist') {
                    destination = curr.optometrist_cabin || 'eye examination';
                } else {
                    destination = curr.doctor_cabin || 'consultation';
                }

                debugLog('New eligible patient:', curr.patient_name, '| token:', curr.token_number,
                         '| destination:', destination, '| status:', curr.status);

                AnnouncementQueue.add({
                    visit_id:     curr.visit_id || curr.item_id || '',
                    patient_name: curr.patient_name || 'Unknown',
                    token_number: curr.token_number || curr.token || '',
                    destination:  destination,
                    status:       curr.status,
                    timestamp:    Date.now()
                });
            }
        }
    }

    function playNotificationSound() {
        var audio = document.getElementById('notification-sound');
        if (audio) {
            try {
                audio.currentTime = 0;
                audio.play();
            } catch (e) {
                // Sound not supported
            }
        }
    }

    function renderOptometristQueue(patients) {
        var container = document.getElementById('optometrist-queue');
        if (!container) return;

        if (patients.length === 0) {
            container.innerHTML = '<p class="empty-message">No patients in queue</p>';
            return;
        }

        var html = '';
        for (var i = 0; i < patients.length; i++) {
            html += renderPatientCard(patients[i], 'optometrist');
        }
        container.innerHTML = html;
    }

    function renderDoctorQueue(patients) {
        var container = document.getElementById('doctor-queue');
        if (!container) return;

        if (patients.length === 0) {
            container.innerHTML = '<p class="empty-message">No patients in queue</p>';
            return;
        }

        var html = '';
        for (var i = 0; i < patients.length; i++) {
            html += renderPatientCard(patients[i], 'doctor');
        }
        container.innerHTML = html;
    }

    function renderPatientCard(patient, queueType) {
        var cardClass = 'patient-card';
        var statusClass = 'status-waiting';
        var statusText = 'Waiting';
        var cabin = '';

        if (queueType === 'optometrist') {
            if (patient.status === 'optometrist_assigned') {
                cardClass += ' status-assigned';
                statusClass = 'status-active';
                statusText = 'Called';
                cabin = patient.optometrist_cabin || '';
            }
        } else {
            if (patient.status === 'doctor_assigned') {
                cardClass += ' status-assigned';
                statusClass = 'status-active';
                statusText = 'Called';
                cabin = patient.doctor_cabin || '';
            } else if (patient.status === 'consultation_in_progress') {
                cardClass += ' status-in-progress';
                statusClass = 'status-active';
                statusText = 'In Consultation';
                cabin = patient.doctor_cabin || '';
            }
        }

        if (patient.visit_type === 'emergency') {
            cardClass += ' emergency';
        }

        var tokenNumber = patient.token_number || patient.token || '--';
        var patientName = patient.patient_name || 'Unknown';
        var uhid = patient.patient_uhid || patient.uhid || '';

        var html = '<div class="' + cardClass + '">';
        html += '<table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>';
        html += '<td width="80" valign="middle"><div class="token-number">' + tokenNumber + '</div></td>';
        html += '<td valign="middle" style="padding-left: 15px;">';
        html += '<div class="patient-name"><strong>' + patientName + '</strong></div>';
        if (uhid) {
            html += '<div class="patient-uhid">UHID: ' + uhid + '</div>';
        }
        html += '</td>';
        html += '<td width="120" align="center" valign="middle">';
        html += '<span class="patient-status ' + statusClass + '">' + statusText + '</span>';
        html += '</td>';
        if (cabin) {
            html += '<td width="100" align="right" valign="middle">';
            html += '<span class="cabin-info">' + cabin + '</span>';
            html += '</td>';
        }
        html += '</tr></table></div>';

        return html;
    }

    function updateOptometristStats(patients) {
        var waiting = 0;
        var inProgress = 0;

        for (var i = 0; i < patients.length; i++) {
            if (patients[i].status === 'awaiting_optometrist') {
                waiting++;
            } else if (patients[i].status === 'optometrist_assigned') {
                inProgress++;
            }
        }

        var waitingEl = document.getElementById('opt-waiting');
        var progressEl = document.getElementById('opt-progress');

        if (waitingEl) waitingEl.innerHTML = waiting;
        if (progressEl) progressEl.innerHTML = inProgress;
    }

    function updateDoctorStats(patients) {
        var waiting = 0;
        var inProgress = 0;

        for (var i = 0; i < patients.length; i++) {
            var status = patients[i].status;
            if (status === 'awaiting_doctor') {
                waiting++;
            } else if (status === 'doctor_assigned' || status === 'consultation_in_progress') {
                inProgress++;
            }
        }

        var waitingEl = document.getElementById('doc-waiting');
        var progressEl = document.getElementById('doc-progress');

        if (waitingEl) waitingEl.innerHTML = waiting;
        if (progressEl) progressEl.innerHTML = inProgress;
    }

    // ================================================
    // ANNOUNCEMENT UI FUNCTIONS
    // ================================================

    /**
     * Sync announcement-related checkboxes to saved localStorage state.
     * Called during initDisplay.
     */
    function applyAnnouncementSettings() {
        var enabledCheckbox = document.getElementById('toggle-announcements');
        if (enabledCheckbox) {
            enabledCheckbox.checked = getAnnouncementsEnabled();
        }

        var bothLangsCheckbox = document.getElementById('toggle-both-languages');
        if (bothLangsCheckbox) {
            bothLangsCheckbox.checked = getAnnounceBothLanguages();
        }
    }

    window.toggleAnnouncements = function (enabled) {
        setAnnouncementsEnabled(enabled);
        debugLog('Announcements', enabled ? 'enabled' : 'disabled');
    };

    window.toggleBothLanguages = function (both) {
        setAnnounceBothLanguages(both);
        debugLog('Both languages', both ? 'enabled' : 'disabled');
    };

    window.openTestPanel = function () {
        var panel = document.getElementById('announcement-test-panel');
        if (panel) {
            panel.style.display = 'flex';
            // Pre-fill textarea with example text if empty
            var textarea = document.getElementById('test-announcement-text');
            if (textarea && !textarea.value.trim()) {
                textarea.value = 'Patient Test User, token number 100, please proceed to Room 1.';
            }
            // Reset status
            var status = document.getElementById('test-announcement-status');
            if (status) {
                status.innerHTML = 'Ready';
                status.className = 'test-ann-status test-ann-idle';
            }
        }
    };

    window.closeTestPanel = function () {
        var panel = document.getElementById('announcement-test-panel');
        if (panel) {
            panel.style.display = 'none';
        }
    };

    /**
     * Called by test panel buttons.
     * mode: 'en' | 'hi' | 'both'
     */
    window.runTestAnnouncement = function (mode) {
        var textarea = document.getElementById('test-announcement-text');
        var statusEl = document.getElementById('test-announcement-status');
        var text = textarea ? textarea.value.trim() : '';

        if (!text) {
            if (statusEl) {
                statusEl.innerHTML = 'Error: Please enter announcement text.';
                statusEl.className = 'test-ann-status test-ann-error';
            }
            return;
        }

        if (!getTtsApiUrl()) {
            if (statusEl) {
                statusEl.innerHTML = 'Error: TTS API URL not configured. Check .env TTS_API_URL.';
                statusEl.className = 'test-ann-status test-ann-error';
            }
            return;
        }

        function setStatus(msg, cls) {
            if (statusEl) {
                statusEl.innerHTML = msg;
                statusEl.className = 'test-ann-status ' + (cls || 'test-ann-playing');
            }
        }

        if (mode === 'en') {
            setStatus('⏳ Generating English audio...');
            playTTSAudio(text, 'en', function () {
                setStatus('✓ English playback complete.', 'test-ann-done');
            }, function (err) {
                setStatus('✗ English failed: ' + err, 'test-ann-error');
            });
        } else if (mode === 'hi') {
            setStatus('⏳ Generating Hindi audio...');
            playTTSAudio(text, 'hi', function () {
                setStatus('✓ Hindi playback complete.', 'test-ann-done');
            }, function (err) {
                setStatus('✗ Hindi failed: ' + err, 'test-ann-error');
            });
        } else if (mode === 'both') {
            setStatus('⏳ Playing English...');
            playTTSAudio(text, 'en', function () {
                setStatus('⏳ English done. Playing Hindi...');
                playTTSAudio(text, 'hi', function () {
                    setStatus('✓ Both languages complete.', 'test-ann-done');
                }, function (err) {
                    setStatus('✗ Hindi failed: ' + err, 'test-ann-error');
                });
            }, function (err) {
                setStatus('✗ English failed: ' + err, 'test-ann-error');
            });
        } else if (mode === 'queue') {
            // Queue test: add three consecutive test announcements
            var msgs = [
                { text: 'Patient Test Alpha, token number 101, please proceed to Room 1.', id: 'test-101' },
                { text: 'Patient Test Beta, token number 102, please proceed to Counter 2.', id: 'test-102' },
                { text: 'Patient Test Gamma, token number 103, please proceed for consultation.', id: 'test-103' }
            ];
            setStatus('⏳ Queuing 3 test announcements...');
            for (var i = 0; i < msgs.length; i++) {
                AnnouncementQueue.add({
                    visit_id:     msgs[i].id + '-' + Date.now() + '-' + i,
                    patient_name: msgs[i].text,   // pass full text as name for test
                    token_number: '',
                    destination:  '',
                    status:       'test',
                    timestamp:    Date.now() + i
                });
            }
            // Override with direct playback for queue test
            // (the add() above won't work right since we pass full text as name)
            // Reset and play directly in sequence instead
            setStatus('⏳ Queue test: playing 3 sequential announcements...');
            var idx = 0;
            function playNext() {
                if (idx >= msgs.length) {
                    setStatus('✓ Queue stress test complete (' + msgs.length + ' announcements).', 'test-ann-done');
                    return;
                }
                var msg = msgs[idx];
                idx++;
                setStatus('⏳ Playing ' + idx + ' of ' + msgs.length + ': ' + msg.text.substring(0, 40) + '...');
                AnnouncementQueue.playDirect(
                    msg.text,
                    getAnnounceBothLanguages(),
                    playNext,
                    function (err) {
                        setStatus('✗ Failed on message ' + idx + ': ' + err, 'test-ann-error');
                        playNext(); // continue despite error
                    }
                );
            }
            playNext();
        }
    };

    // ================================================
    // CLEANUP
    // ================================================

    window.onbeforeunload = function () {
        if (pollInterval) {
            clearInterval(pollInterval);
        }
        if (clockInterval) {
            clearInterval(clockInterval);
        }
    };

    // ================================================
    // INITIALIZATION
    // ================================================

    window.initLogin = function () {
        var hospitalIdInput = document.getElementById('hospital_id');
        if (hospitalIdInput) {
            var savedId = getHospitalId();
            if (savedId) {
                hospitalIdInput.value = savedId;
            }

            // Save on every change
            hospitalIdInput.onchange = function () {
                setHospitalId(this.value);
            };
            // Also on input for real-time update in case they don't trigger change
            hospitalIdInput.oninput = function () {
                setHospitalId(this.value);
            };
        }
    };

    // Load config on page load
    loadConfig();
    updateCurrentYear();
    initLogin();

})();
