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
        POLL_INTERVAL: 5000,  // Poll every 5 seconds
        CLOCK_INTERVAL: 1000, // Update clock every second
        DEFAULT_API_URL: 'http://localhost:8080',  // Will be updated from /config endpoint
        API_URL: null,        // Will be set after loading config
        TTS_API_URL: null,    // Will be set after loading config (from TTS_API_URL env)
        ANNOUNCEMENT_DEBUG: true  // Set to false to silence announcement debug logs
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

    window.toggleFullscreen = function (fullscreen) {
        if (fullscreen) {
            var docEl = document.documentElement;
            if (docEl.requestFullscreen) {
                docEl.requestFullscreen();
            } else if (docEl.mozRequestFullScreen) { /* Firefox */
                docEl.mozRequestFullScreen();
            } else if (docEl.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
                docEl.webkitRequestFullscreen();
            } else if (docEl.msRequestFullscreen) { /* IE/Edge */
                docEl.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.mozCancelFullScreen) { /* Firefox */
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) { /* Chrome, Safari and Opera */
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) { /* IE/Edge */
                document.msExitFullscreen();
            }
        }
    };

    // Keep fullscreen checkbox in sync when user exits fullscreen with Escape key
    function setupFullscreenListener() {
        var events = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
        for (var i = 0; i < events.length; i++) {
            document.addEventListener(events[i], function () {
                var checkbox = document.getElementById('toggle-fullscreen');
                if (checkbox) {
                    checkbox.checked = !!(
                        document.fullscreenElement ||
                        document.webkitFullscreenElement ||
                        document.mozFullScreenElement ||
                        document.msFullscreenElement
                    );
                }
            });
        }
    }

    setupFullscreenListener();

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
                    CONFIG.TTS_API_URL = response.ttsApiUrl;
                    announcementDebug('CONFIG', 'TTS API URL loaded: ' + response.ttsApiUrl);
                } else {
                    announcementDebug('CONFIG', 'TTS API URL not set — announcement audio disabled');
                }
                callback && callback();
            },
            error: function () {
                // If config endpoint fails, use defaults
                callback && callback();
            }
        });
    }

    function getTtsApiUrl() {
        return CONFIG.TTS_API_URL || getItem('tv_tts_api_url') || '';
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
        disconnectSSE();
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

        var requestData = {};
        if (hospitalId) {
            requestData.hospital_id = hospitalId;
        }

        ajax({
            method: 'POST',
            url: apiUrl.replace(/\/$/, '') + '/auth/tv/session',
            data: requestData,
            success: function (response) {
                qrSessionCode = response.session_code;
                qrExpiryTime = new Date(response.expires_at).getTime();

                // Set image source using configured API URL directly (prevents timeout on wrong host IP in response.qr_image_url)
                var qrImgUrl = apiUrl.replace(/\/$/, '') + '/auth/tv/qr/' + response.session_code;
                imgEl.onload = function () {
                    loadingEl.style.display = 'none';
                    imgEl.style.display = 'inline-block';
                };
                imgEl.onerror = function () {
                    loadingEl.innerHTML = 'Error loading QR image.<br>Please try again.';
                };
                imgEl.src = qrImgUrl;

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

    function setConnectionStatus(status, mode) {
        var dot = document.getElementById('status-dot');
        var text = document.getElementById('status-text');

        if (!dot || !text) return;

        dot.className = '';

        if (status === 'connected') {
            if (mode === 'polling') {
                dot.className = 'status-polling';
                text.innerHTML = 'Live (Polling)';
            } else {
                dot.className = 'status-connected';
                text.innerHTML = 'Live (SSE Stream)';
            }
        } else if (status === 'connecting') {
            dot.className = 'status-connecting';
            text.innerHTML = 'Connecting...';
        } else {
            dot.className = 'status-error';
            text.innerHTML = 'Connection Error';
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

                // Connect queues (via SSE stream if supported, otherwise polling)
                connectQueues();
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
            // Reset announcement state for new doctor context
            resetAnnouncementState();
            // Connect immediately
            connectQueues();
        }
    };

    // ================================================
    // SSE STREAM & POLLING MANAGEMENT
    // ================================================

    var sseOptometristController = null;
    var sseDoctorController = null;
    var isSseActive = false;

    function isSSESupported() {
        return (typeof window.EventSource !== 'undefined') ||
               (typeof window.fetch !== 'undefined' && typeof window.ReadableStream !== 'undefined');
    }

    function isHeartbeatMessage(data) {
        if (!data || data === null || data === undefined) return true;
        if (data.type === 'heartbeat' || data.type === 'ping' || data.type === 'keepalive') return true;
        if (typeof data === 'object' && !Array.isArray(data)) {
            if (Object.keys(data).length === 0) return true;
            if (data.timestamp && !data.patient_id && !data.visit_id && !data.id && !data.queue && !data.items && !data.data && !data.entries && !data.slots) return true;
        }
        return false;
    }

    function disconnectSSE() {
        if (sseOptometristController) {
            try {
                if (sseOptometristController.abort) sseOptometristController.abort();
                if (sseOptometristController.close) sseOptometristController.close();
            } catch (e) {}
            sseOptometristController = null;
        }
        if (sseDoctorController) {
            try {
                if (sseDoctorController.abort) sseDoctorController.abort();
                if (sseDoctorController.close) sseDoctorController.close();
            } catch (e) {}
            sseDoctorController = null;
        }
        isSseActive = false;
    }

    function connectStream(url, onMessage, onError) {
        var token = getAuthToken();
        if (typeof window.fetch !== 'undefined' && typeof window.ReadableStream !== 'undefined' && typeof AbortController !== 'undefined') {
            var controller = new AbortController();
            fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'text/event-stream',
                    'Authorization': 'Bearer ' + token
                },
                signal: controller.signal
            }).then(function (response) {
                if (!response.ok) {
                    onError && onError(new Error('HTTP error ' + response.status));
                    return;
                }
                if (!response.body) {
                    onError && onError(new Error('ReadableStream not supported'));
                    return;
                }
                var reader = response.body.getReader();
                var decoder = new TextDecoder();
                var buffer = '';

                function readChunk() {
                    reader.read().then(function (result) {
                        if (result.done) {
                            return;
                        }
                        buffer += decoder.decode(result.value, { stream: true });
                        var parts = buffer.split('\n\n');
                        buffer = parts.pop() || '';

                        for (var i = 0; i < parts.length; i++) {
                            var part = parts[i];
                            var lines = part.split('\n');
                            var eventName = 'message';
                            var currentData = [];
                            for (var j = 0; j < lines.length; j++) {
                                var line = lines[j];
                                if (line.indexOf('event: ') === 0) {
                                    eventName = line.slice(7).trim();
                                } else if (line.indexOf('data: ') === 0) {
                                    currentData.push(line.slice(6));
                                }
                            }
                            if (eventName === 'heartbeat' || eventName === 'ping' || eventName === 'keepalive') {
                                continue;
                            }
                            if (currentData.length > 0) {
                                var dataStr = currentData.join('\n');
                                try {
                                    var parsed = JSON.parse(dataStr);
                                    if (!isHeartbeatMessage(parsed)) {
                                        onMessage(parsed);
                                    }
                                } catch (e) {
                                    if (!isHeartbeatMessage(dataStr)) {
                                        onMessage(dataStr);
                                    }
                                }
                            }
                        }
                        readChunk();
                    }).catch(function (err) {
                        if (err.name !== 'AbortError') {
                            onError && onError(err);
                        }
                    });
                }

                readChunk();
            }).catch(function (err) {
                if (err.name !== 'AbortError') {
                    onError && onError(err);
                }
            });
            return controller;
        } else if (typeof window.EventSource !== 'undefined') {
            var es = new EventSource(url);
            es.onmessage = function (event) {
                try {
                    var parsed = JSON.parse(event.data);
                    onMessage(parsed);
                } catch (e) {
                    onMessage(event.data);
                }
            };
            es.onerror = function (err) {
                onError && onError(err);
            };
            return es;
        } else {
            onError && onError(new Error('SSE not supported'));
            return null;
        }
    }

    function connectQueues() {
        var doctorId = getSelectedDoctorId();
        if (!doctorId) return;

        disconnectSSE();

        if (isSSESupported()) {
            if (pollInterval) {
                clearInterval(pollInterval);
                pollInterval = null;
            }

            setConnectionStatus('connecting');

            var apiUrl = getApiUrl();
            var optUrl = apiUrl + '/opd/eye-hospital/optometrist-queue/' + doctorId + '/stream?status=awaiting_optometrist,optometrist_assigned';
            var docUrl = apiUrl + '/opd/eye-hospital/group-queue/' + doctorId + '/stream?status=awaiting_optometrist,optometrist_assigned,optometrist_investigation_in_progress,optometrist_investigation_completed,awaiting_doctor,doctor_assigned,consultation_in_progress,dilation_in_progress,dilation_completed,consultation_completed,completed,no_show,checked_in,scheduled';

            var sseFailed = false;
            function handleStreamError(err) {
                announcementDebug('SSE', 'Stream connection error/closed: ' + (err ? err.message : 'Unknown error'));
                if (!sseFailed && isSseActive) {
                    sseFailed = true;
                    disconnectSSE();
                    announcementDebug('SSE', 'Falling back to polling mode');
                    startPolling();
                }
            }

            isSseActive = true;
            sseOptometristController = connectStream(optUrl, function (data) {
                if (isHeartbeatMessage(data)) return;
                var patients = parseQueueResponse(data);
                renderOptometristQueue(patients);
                updateOptometristStats(patients);
                checkForNewAssignments(patients, previousOptQueue, 'optometrist');
                previousOptQueue = patients;
                setConnectionStatus('connected', 'sse');
                updateLastUpdateTime();
            }, handleStreamError);

            sseDoctorController = connectStream(docUrl, function (data) {
                if (isHeartbeatMessage(data)) return;
                var patients = parseQueueResponse(data);
                renderDoctorQueue(patients);
                updateDoctorStats(patients);
                checkForNewAssignments(patients, previousDocQueue, 'doctor');
                previousDocQueue = patients;
                setConnectionStatus('connected', 'sse');
                updateLastUpdateTime();
            }, handleStreamError);
        } else {
            announcementDebug('SSE', 'SSE not supported by browser — using polling mode');
            startPolling();
        }
    }

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
                setConnectionStatus('connected', 'polling');
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
                setConnectionStatus('connected', 'polling');
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

    /**
     * Resolve the best available unique identifier from a patient record.
     *
     * The API returns the queue entry as `id` (not `visit_id`).
     * We fall back through several fields to guarantee a non-undefined key:
     *   id  →  visit_id  →  appointment_id  →  patient_id + token_number
     *
     * Returns null only if the record is entirely devoid of identifiers
     * (which should never happen in a real response).
     *
     * @param {Object} patient - Raw patient object from the API
     * @returns {string|null}
     */
    function getPatientId(patient) {
        if (!patient) return null;
        if (patient.id)             return String(patient.id);
        if (patient.visit_id)       return String(patient.visit_id);
        if (patient.appointment_id) return String(patient.appointment_id);
        // Last-resort composite key — unique enough for dedup purposes
        if (patient.patient_id && (patient.token_number || patient.token)) {
            return String(patient.patient_id) + '_' + String(patient.token_number || patient.token);
        }
        return null;
    }

    function checkForNewAssignments(current, previous, queueType) {
        announcementDebug('POLL', 'Checking ' + queueType + ' queue — ' + current.length + ' patient(s)');

        // Check for newly assigned patients
        for (var i = 0; i < current.length; i++) {
            var curr = current[i];
            var isAssigned = (queueType === 'optometrist' && curr.status === 'optometrist_assigned') ||
                (queueType === 'doctor' && curr.status === 'doctor_assigned');

            if (!isAssigned) continue;

            // Resolve a reliable identifier for this patient
            var currId = getPatientId(curr);

            if (!currId) {
                // Cannot reliably identify this patient — skip to avoid creating broken dedup keys
                announcementDebug('POLL', 'WARNING: Could not resolve ID for patient "' +
                    (curr.patient_name || 'Unknown') + '" — skipping announcement');
                continue;
            }

            // Check if this patient was already in the assigned status in the previous poll
            var wasAssigned = false;
            for (var j = 0; j < previous.length; j++) {
                var prev = previous[j];
                var prevId = getPatientId(prev);
                if (prevId === currId && prev.status === curr.status) {
                    wasAssigned = true;
                    break;
                }
            }

            if (!wasAssigned) {
                announcementDebug('POLL', 'New assignment detected: ' + curr.patient_name +
                    ' [id=' + currId + '] (token ' + (curr.token_number || curr.token) +
                    ') status=' + curr.status);

                // Play notification chime immediately
                playNotificationSound();

                // Build announcement text
                var cabin = queueType === 'optometrist'
                    ? (curr.optometrist_cabin || null)
                    : (curr.doctor_cabin || null);

                var announcementText = generateAnnouncementText(
                    curr.patient_name,
                    curr.token_number || curr.token,
                    cabin,
                    queueType
                );

                // Enqueue with the resolved, non-undefined ID
                enqueueAnnouncement(currId, curr.status, announcementText);
                break; // Only one new assignment detection per poll cycle
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
    // ANNOUNCEMENT SYSTEM
    // ================================================

    // ---- Debug Logger ----
    function announcementDebug(category, message) {
        if (CONFIG.ANNOUNCEMENT_DEBUG) {
            console.log('[ANNOUNCEMENT:' + category + '] ' + message);
        }
    }

    // ---- AnnouncementTextGenerator ----

    /**
     * Build the English TTS sentence from patient data.
     * Backend will auto-translate this to Hindi when language='hi' is requested.
     *
     * Examples:
     *   "Patient John Doe, token number 25, please proceed to Room 3."
     *   "Patient John Doe, token number 25, please proceed for eye examination."
     *   "Patient John Doe, token number 25, your consultation is ready."
     */
    function generateAnnouncementText(patientName, tokenNumber, cabin, queueType) {
        var name = patientName || 'Unknown';
        var token = tokenNumber || '--';

        if (cabin) {
            return 'Patient ' + name + ', token number ' + token +
                ', please proceed to ' + cabin + '.';
        }

        if (queueType === 'optometrist') {
            return 'Patient ' + name + ', token number ' + token +
                ', please proceed for eye examination.';
        }

        // Doctor queue without cabin
        return 'Patient ' + name + ', token number ' + token +
            ', your consultation is ready.';
    }

    // ---- AnnouncementService ----

    /**
     * POST to /api/v1/speech and return the audio as an Object URL.
     * Uses XMLHttpRequest with responseType='arraybuffer' for ES5 compatibility.
     *
     * @param {string}   text      - English text to synthesize
     * @param {string}   language  - 'en' or 'hi'
     * @param {Function} callback  - function(err, objectUrl)
     */
    function fetchSpeechAudio(text, language, callback) {
        var ttsUrl = getTtsApiUrl();
        if (!ttsUrl) {
            announcementDebug('API', 'TTS URL not configured — skipping ' + language + ' audio');
            callback('TTS URL not configured', null);
            return;
        }

        var endpoint = ttsUrl.replace(/\/$/, '') + '/api/v1/speech';
        announcementDebug('API', 'POST ' + endpoint + ' lang=' + language + ' text="' + text + '"');

        var xhr;
        if (window.XMLHttpRequest) {
            xhr = new XMLHttpRequest();
        } else if (window.ActiveXObject) {
            try { xhr = new ActiveXObject('Msxml2.XMLHTTP'); }
            catch (e) {
                try { xhr = new ActiveXObject('Microsoft.XMLHTTP'); }
                catch (e2) { callback('XMLHttpRequest not supported', null); return; }
            }
        }

        xhr.responseType = 'arraybuffer';

        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) return;

            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    var blob = new Blob([xhr.response], { type: 'audio/mpeg' });
                    var objectUrl = URL.createObjectURL(blob);
                    announcementDebug('API', 'Audio received for lang=' + language +
                        ' size=' + xhr.response.byteLength + ' bytes');
                    callback(null, objectUrl);
                } catch (e) {
                    announcementDebug('API', 'Error creating Blob URL: ' + e.message);
                    callback(e, null);
                }
            } else {
                announcementDebug('API', 'TTS request failed: HTTP ' + xhr.status +
                    ' lang=' + language);
                callback('HTTP ' + xhr.status, null);
            }
        };

        xhr.onerror = function () {
            announcementDebug('API', 'TTS network error for lang=' + language);
            callback('Network error', null);
        };

        xhr.open('POST', endpoint, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify({ text: text, language: language, slow: false }));
    }

    // ---- AudioPlaybackService ----

    /**
     * Play an audio Object URL and invoke onComplete when done (or on error/skip).
     * Automatically revokes the Object URL after playback.
     *
     * @param {string}   objectUrl  - URL.createObjectURL blob URL
     * @param {Function} onComplete - called when playback finishes or fails
     */
    function playAudioUrl(objectUrl, onComplete) {
        try {
            var audio = new Audio(objectUrl);

            audio.onended = function () {
                announcementDebug('AUDIO', 'Playback complete');
                try { URL.revokeObjectURL(objectUrl); } catch (e) { /* ignore */ }
                onComplete();
            };

            audio.onerror = function (e) {
                announcementDebug('AUDIO', 'Playback error — skipping: ' +
                    (audio.error ? audio.error.message : 'unknown'));
                try { URL.revokeObjectURL(objectUrl); } catch (e2) { /* ignore */ }
                onComplete();
            };

            var playPromise = audio.play();
            if (playPromise && typeof playPromise.then === 'function') {
                playPromise.catch(function (err) {
                    announcementDebug('AUDIO', 'play() rejected: ' + err.message);
                    try { URL.revokeObjectURL(objectUrl); } catch (e) { /* ignore */ }
                    onComplete();
                });
            }

            announcementDebug('AUDIO', 'Playback started for: ' + objectUrl);
        } catch (e) {
            announcementDebug('AUDIO', 'Audio() constructor failed: ' + e.message);
            try { URL.revokeObjectURL(objectUrl); } catch (e2) { /* ignore */ }
            onComplete();
        }
    }

    // ---- AnnouncementQueueManager ----

    var announcementQueue     = [];  // Array of { visitId, status, text }
    var isAnnouncementPlaying = false;
    var announcedCount        = 0;   // Session-level counter — for debug panel only (does NOT block re-announcements)

    /**
     * Reset announcement state (called on doctor change).
     * Clears pending queue. In-flight audio is allowed to finish naturally.
     * The previousQueue arrays in the polling section act as the sole dedup — they
     * are also reset by handleDoctorChange(), so a doctor switch correctly re-arms
     * announcements for the new doctor context.
     */
    function resetAnnouncementState() {
        announcementQueue    = [];
        announcedCount       = 0;
        // Note: isAnnouncementPlaying is NOT reset — in-flight audio completes naturally,
        // then processAnnouncementQueue() finds an empty queue and exits.
        announcementDebug('QUEUE', 'State reset (doctor change)');
        updateQueueDebugPanel();
    }

    /**
     * Add an announcement to the queue and kick off processing.
     *
     * DEDUP STRATEGY: This function does NOT block based on a registry.
     * The caller (checkForNewAssignments) already guarantees this is only
     * called when the patient's status genuinely changed in the LAST poll.
     * Blocking here would prevent re-announcement after legitimate status
     * re-transitions (e.g. patient re-assigned after being moved).
     *
     * @param {string} patientId - resolved patient/record ID
     * @param {string} status    - the triggering status
     * @param {string} text      - English announcement text
     */
    function enqueueAnnouncement(patientId, status, text) {
        announcementQueue.push({ visitId: patientId, status: status, text: text });
        announcedCount++;

        announcementDebug('QUEUE', 'Enqueued [' + patientId + '_' + status + '] "' + text +
            '" — queue length: ' + announcementQueue.length +
            ' | session total: ' + announcedCount);
        updateQueueDebugPanel();
        processAnnouncementQueue();
    }

    /**
     * Dequeue and play the next announcement.
     * Auto-advances until the queue is empty.
     */
    function processAnnouncementQueue() {
        if (isAnnouncementPlaying) {
            announcementDebug('QUEUE', 'Already playing — will resume after current finishes');
            return;
        }
        if (announcementQueue.length === 0) {
            announcementDebug('QUEUE', 'Queue empty — done');
            updateQueueDebugPanel();
            return;
        }

        isAnnouncementPlaying = true;
        var item = announcementQueue.shift();

        announcementDebug('QUEUE', 'Processing: [' + item.visitId + '_' + item.status + 
            '] "' + item.text + '" — remaining: ' + announcementQueue.length);
        updateQueueDebugPanel();

        playAnnouncementItem(item, function () {
            isAnnouncementPlaying = false;
            announcementDebug('QUEUE', 'Item complete — advancing queue');
            updateQueueDebugPanel();
            processAnnouncementQueue();
        });
    }

    /**
     * Play a single announcement item: English audio, then Hindi audio (backend translates).
     * Same English text is sent for both; backend handles translation for 'hi'.
     *
     * @param {{ visitId: string, status: string, text: string }} item
     * @param {Function} onDone - called when both languages are done (or on failure)
     */
    function playAnnouncementItem(item, onDone) {
        var ttsUrl = getTtsApiUrl();
        if (!ttsUrl) {
            announcementDebug('QUEUE', 'TTS not configured — skipping item');
            onDone();
            return;
        }

        // Step 1: Fetch and play English audio
        announcementDebug('AUDIO', 'Fetching English audio for: "' + item.text + '"');
        fetchSpeechAudio(item.text, 'en', function (err, enUrl) {
            if (err) {
                announcementDebug('AUDIO', 'English fetch failed: ' + err + ' — skipping item');
                onDone();
                return;
            }

            playAudioUrl(enUrl, function () {
                // Step 2: Fetch and play Hindi audio (same text — backend translates)
                announcementDebug('AUDIO', 'Fetching Hindi audio for: "' + item.text + '"');
                fetchSpeechAudio(item.text, 'hi', function (err2, hiUrl) {
                    if (err2) {
                        announcementDebug('AUDIO', 'Hindi fetch failed: ' + err2 + ' — skipping Hindi');
                        onDone();
                        return;
                    }
                    playAudioUrl(hiUrl, onDone);
                });
            });
        });
    }

    // ---- Test Announcement Functions ----

    /**
     * Show/hide the test announcement panel in the footer.
     */
    window.toggleTestPanel = function () {
        var body = document.getElementById('test-panel-body');
        var btn  = document.getElementById('test-panel-toggle-btn');
        if (!body) return;
        if (body.style.display === 'none' || body.style.display === '') {
            body.style.display = 'block';
            if (btn) btn.innerHTML = '🔊 Hide Test Panel';
        } else {
            body.style.display = 'none';
            if (btn) btn.innerHTML = '🔊 Test Announcement';
        }
    };

    /**
     * Trigger a single-language test announcement from the test panel textarea.
     * @param {string} lang - 'en' or 'hi'
     */
    window.testAnnouncement = function (lang) {
        var textEl   = document.getElementById('test-announcement-text');
        var statusEl = document.getElementById('test-announcement-status');
        if (!textEl || !statusEl) return;

        var text = textEl.value.trim();
        if (!text) { statusEl.innerHTML = '<span style="color:#e55;">Please enter announcement text.</span>'; return; }

        var ttsUrl = getTtsApiUrl();
        if (!ttsUrl) {
            statusEl.innerHTML = '<span style="color:#e55;">TTS API URL not configured. Check .env and restart server.</span>';
            return;
        }

        statusEl.innerHTML = '<span style="color:#f90;">⏳ Fetching ' + lang.toUpperCase() + ' audio...</span>';

        fetchSpeechAudio(text, lang, function (err, objectUrl) {
            if (err) {
                statusEl.innerHTML = '<span style="color:#e55;">❌ Error: ' + err + '</span>';
                return;
            }
            statusEl.innerHTML = '<span style="color:#3a3;">▶ Playing ' + lang.toUpperCase() + ' audio...</span>';
            playAudioUrl(objectUrl, function () {
                statusEl.innerHTML = '<span style="color:#3a3;">✅ Playback complete (' + lang.toUpperCase() + ')</span>';
            });
        });
    };

    /**
     * Test both English + Hindi sequentially through the queue system.
     */
    window.testBothLanguages = function () {
        var textEl   = document.getElementById('test-announcement-text');
        var statusEl = document.getElementById('test-announcement-status');
        if (!textEl || !statusEl) return;

        var text = textEl.value.trim();
        if (!text) { statusEl.innerHTML = '<span style="color:#e55;">Please enter announcement text.</span>'; return; }

        var ttsUrl = getTtsApiUrl();
        if (!ttsUrl) {
            statusEl.innerHTML = '<span style="color:#e55;">TTS API URL not configured.</span>';
            return;
        }

        // Use a unique test ID so it bypasses the dedup registry each time
        var testId  = 'test_' + Date.now();
        var testKey = testId + '_test';

        statusEl.innerHTML = '<span style="color:#f90;">⏳ Queued — playing English then Hindi...</span>';

        // Directly push to queue bypassing dedup (it's a manual test)
        announcementQueue.push({ visitId: testId, status: 'test', text: text });
        announcementDebug('TEST', 'Manual test enqueued: "' + text + '"');
        updateQueueDebugPanel();
        processAnnouncementQueue();

        statusEl.innerHTML = '<span style="color:#3a3;">▶ Processing queue... check debug panel</span>';
    };

    /**
     * Test two consecutive announcements to verify queue sequencing.
     */
    window.testQueueSequencing = function () {
        var statusEl = document.getElementById('test-announcement-status');
        if (statusEl) statusEl.innerHTML = '<span style="color:#f90;">⏳ Adding 2 test items to queue...</span>';

        var msgs = [
            'Patient Test User, token number 100, please proceed to Room 1.',
            'Patient Test User, your consultation is ready. Please proceed to Counter 2.'
        ];

        for (var i = 0; i < msgs.length; i++) {
            var testId = 'seq_test_' + Date.now() + '_' + i;
            announcementQueue.push({ visitId: testId, status: 'test', text: msgs[i] });
        }

        announcementDebug('TEST', 'Queue sequencing test: 2 items added');
        updateQueueDebugPanel();
        processAnnouncementQueue();

        if (statusEl) statusEl.innerHTML = '<span style="color:#3a3;">▶ 2 items queued — playing sequentially...</span>';
    };

    /**
     * Update the live queue debug panel in the test UI.
     */
    function updateQueueDebugPanel() {
        var el = document.getElementById('queue-debug-info');
        if (!el) return;

        var status = isAnnouncementPlaying ? '🔊 Playing' : '⏸ Idle';
        var qLen   = announcementQueue.length;
        var ttsUrl = getTtsApiUrl();

        el.innerHTML =
            '<strong>Queue Status:</strong> ' + status + '<br>' +
            '<strong>Pending Items:</strong> ' + qLen + '<br>' +
            '<strong>Session Announcements:</strong> ' + announcedCount + '<br>' +
            '<strong>TTS API:</strong> ' + (ttsUrl ? '<span style="color:#3a3;">' + ttsUrl + '</span>' : '<span style="color:#e55;">Not configured</span>');
    }

    // Refresh queue debug panel every 2 seconds when open
    setInterval(function () {
        var body = document.getElementById('test-panel-body');
        if (body && body.style.display !== 'none' && body.style.display !== '') {
            updateQueueDebugPanel();
        }
    }, 2000);

    // ================================================
    // CLEANUP
    // ================================================

    window.onbeforeunload = function () {
        disconnectSSE();
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
    loadConfig(function () {
        // If we are already authenticated, redirect to display.html
        if (getAuthToken() && document.getElementById('qr-login-container')) {
            window.location.href = 'display.html';
            return;
        }

        // Automatically start QR login if we are on the login page (index.html) and not logged in
        if (!getAuthToken() && document.getElementById('qr-login-container')) {
            initQRLogin(null);
        }
    });
    updateCurrentYear();
    initLogin();

})();
