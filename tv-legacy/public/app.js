/**
 * TV Legacy Display - JavaScript Application
 * ES5 Compatible (Strictly vanilla JS for old TVs: WebOS 3+, Tizen 3+, Android TV)
 * Clean, flexible multi-queue engine with Split & Side-by-Side layouts
 */

(function () {
    'use strict';

    // ================================================
    // CONFIGURATION & DEFAULTS
    // ================================================

    function getDefaultApiUrl() {
        if (typeof window !== 'undefined' && window.location) {
            var hostname = window.location.hostname;
            if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
                return '/api';
            }
        }
        return 'http://localhost:8080';
    }

    var CONFIG = {
        POLL_INTERVAL: 4000,
        CLOCK_INTERVAL: 1000,
        DEFAULT_API_URL: getDefaultApiUrl(),
        API_URL: null,
        TTS_API_URL: null,
        ANNOUNCEMENT_DEBUG: true
    };

    // Color accents for practitioner headers & tokens
    var ACCENTS = ['accent-cyan', 'accent-emerald', 'accent-amber', 'accent-purple'];
    var TOKEN_ACCENTS = ['accent-cyan-token', 'accent-emerald-token', 'accent-amber-token', 'accent-purple-token'];

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

    function removeItem(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            // ignore
        }
    }

    function getApiUrl() {
        return CONFIG.API_URL || getItem('tv_api_url') || CONFIG.DEFAULT_API_URL;
    }

    function getAuthToken() {
        return getItem('tv_auth_token');
    }

    function getTenantId() {
        var tid = getItem('tv_tenant_id');
        if (tid) return tid;

        // Fallback: parse from JWT token payload if available
        var token = getAuthToken();
        if (token) {
            try {
                var parts = token.split('.');
                if (parts.length >= 2) {
                    var payloadStr = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
                    var payload = JSON.parse(payloadStr);
                    if (payload && payload.tenant_id) {
                        setItem('tv_tenant_id', payload.tenant_id);
                        return payload.tenant_id;
                    }
                }
            } catch (e) {
                // ignore
            }
        }
        return null;
    }

    function getHospitalId() {
        return getItem('tv_hospital_id') || '';
    }

    var DEFAULT_TICKER_TEXT = 'Regular health check-ups every 6 months \u2022 Practice 20-20-20 rule for digital screens \u2022 Stay hydrated throughout the day \u2022 Practice deep breathing for stress relief \u2022 Eat fresh fruits and vegetables daily \u2022 Maintain good posture while sitting \u2022 Consult your doctor before taking self-medication';

    function setHospitalId(id) {
        setItem('tv_hospital_id', id);
    }

    function isTickerActive(cfg) {
        if (!cfg) return true;
        if (cfg.showTicker === false || cfg.showHealthTips === false) return false;
        if (cfg.show_ticker === false || cfg.show_health_tips === false) return false;
        return true;
    }

    // Display configuration loader & saver
    function getDisplayConfig() {
        var defaultCfg = {
            showExaminer: true,
            doctorIds: [],
            layout: 'split', // 'split' | 'columns'
            theme: 'dark',
            showHealthTips: true,
            showTicker: true,
            tickerTitle: 'HEALTH TIP',
            tickerText: DEFAULT_TICKER_TEXT,
            voiceAlerts: true
        };

        var saved = getItem('tv_display_config');
        if (saved) {
            try {
                var parsed = JSON.parse(saved);
                if (parsed && typeof parsed === 'object') {
                    if (typeof parsed.showExaminer === 'boolean') defaultCfg.showExaminer = parsed.showExaminer;
                    if (typeof parsed.show_examiner === 'boolean') defaultCfg.showExaminer = parsed.show_examiner;

                    if (Array.isArray(parsed.doctorIds)) defaultCfg.doctorIds = parsed.doctorIds;
                    if (Array.isArray(parsed.doctor_ids)) defaultCfg.doctorIds = parsed.doctor_ids;

                    if (parsed.layout) defaultCfg.layout = parsed.layout;
                    if (parsed.theme) defaultCfg.theme = parsed.theme;

                    // Marquee visibility: support all key variations
                    if (typeof parsed.showTicker === 'boolean') {
                        defaultCfg.showTicker = parsed.showTicker;
                        defaultCfg.showHealthTips = parsed.showTicker;
                    } else if (typeof parsed.showHealthTips === 'boolean') {
                        defaultCfg.showTicker = parsed.showHealthTips;
                        defaultCfg.showHealthTips = parsed.showHealthTips;
                    } else if (typeof parsed.show_ticker === 'boolean') {
                        defaultCfg.showTicker = parsed.show_ticker;
                        defaultCfg.showHealthTips = parsed.show_ticker;
                    } else if (typeof parsed.show_health_tips === 'boolean') {
                        defaultCfg.showTicker = parsed.show_health_tips;
                        defaultCfg.showHealthTips = parsed.show_health_tips;
                    }

                    if (parsed.tickerTitle) defaultCfg.tickerTitle = parsed.tickerTitle;
                    else if (parsed.ticker_title) defaultCfg.tickerTitle = parsed.ticker_title;

                    if (parsed.tickerText) defaultCfg.tickerText = parsed.tickerText;
                    else if (parsed.ticker_text) defaultCfg.tickerText = parsed.ticker_text;

                    if (typeof parsed.voiceAlerts === 'boolean') defaultCfg.voiceAlerts = parsed.voiceAlerts;
                    else if (typeof parsed.voice_alerts === 'boolean') defaultCfg.voiceAlerts = parsed.voice_alerts;
                }
            } catch (e) {
                // ignore
            }
        }
        return defaultCfg;
    }

    function saveDisplayConfig(cfg) {
        try {
            setItem('tv_display_config', JSON.stringify(cfg));
        } catch (e) {
            // ignore
        }
    }

    // ================================================
    // AJAX (Vanilla XMLHttpRequest for old TVs)
    // ================================================

    function ajax(options) {
        var xhr = new XMLHttpRequest();
        var method = options.method || 'GET';
        var url = options.url;
        var async = options.async !== false;

        xhr.open(method, url, async);

        if (options.headers) {
            for (var header in options.headers) {
                if (options.headers.hasOwnProperty(header)) {
                    xhr.setRequestHeader(header, options.headers[header]);
                }
            }
        }

        if (options.data && (method === 'POST' || method === 'PUT')) {
            if (!options.headers || !options.headers['Content-Type']) {
                xhr.setRequestHeader('Content-Type', 'application/json');
            }
        }

        xhr.timeout = options.timeout || 10000;

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status >= 200 && xhr.status < 300) {
                    var response = xhr.responseText;
                    try {
                        response = JSON.parse(xhr.responseText);
                    } catch (e) {
                        // Keep text
                    }
                    if (options.success) options.success(response, xhr.status);
                } else {
                    var errorResponse = xhr.responseText;
                    try {
                        errorResponse = JSON.parse(xhr.responseText);
                    } catch (e) {
                        // Keep text
                    }
                    if (options.error) options.error(errorResponse, xhr.status);
                }
            }
        };

        xhr.ontimeout = function () {
            if (options.error) options.error({ message: 'Request timeout' }, 0);
        };

        xhr.onerror = function () {
            if (options.error) options.error({ message: 'Network error' }, 0);
        };

        var sendData = null;
        if (options.data) {
            sendData = typeof options.data === 'string' ? options.data : JSON.stringify(options.data);
        }

        xhr.send(sendData);
        return xhr;
    }

    // Config endpoint
    function loadConfig(callback) {
        ajax({
            method: 'GET',
            url: '/config',
            success: function (res) {
                if (res.apiBaseUrl) CONFIG.API_URL = res.apiBaseUrl;
                if (res.ttsApiUrl) CONFIG.TTS_API_URL = res.ttsApiUrl;
                if (callback) callback();
            },
            error: function () {
                if (callback) callback();
            }
        });
    }

    // ================================================
    // THEME & DISPLAY PREFERENCES
    // ================================================

    window.isDarkModeActive = function () {
        return (document.body.className || '').indexOf('theme-dark') !== -1;
    };

    window.toggleTheme = function (isDark) {
        var body = document.body;
        var current = body.className || '';
        if (isDark) {
            current = current.replace(/\btheme-light\b/g, '').trim();
            if (current.indexOf('theme-dark') === -1) {
                current += ' theme-dark';
            }
        } else {
            current = current.replace(/\btheme-dark\b/g, '').trim();
            if (current.indexOf('theme-light') === -1) {
                current += ' theme-light';
            }
        }
        body.className = current.replace(/\s+/g, ' ').trim();

        var themeBtn = document.getElementById('theme-toggle-btn');
        if (themeBtn) {
            themeBtn.innerHTML = isDark ? '☀️ Light' : '🌙 Dark';
            themeBtn.setAttribute('title', isDark ? 'Switch to Cura Light Theme' : 'Switch to Dark Clinic Theme');
        }

        var cfg = getDisplayConfig();
        cfg.theme = isDark ? 'dark' : 'light';
        saveDisplayConfig(cfg);
    };

    function applyThemePreference() {
        var cfg = getDisplayConfig();
        var isDark = cfg.theme !== 'light';
        window.toggleTheme(isDark);
    }

    function applyTickerPreference() {
        var cfg = getDisplayConfig();
        var banner = document.getElementById('ticker-banner');
        if (!banner) return;

        var isVisible = isTickerActive(cfg);
        banner.style.display = isVisible ? 'flex' : 'none';

        if (isVisible) {
            var labelEl = document.getElementById('ticker-label');
            var textEl = document.getElementById('ticker-text');
            var iconEl = document.getElementById('ticker-icon');

            var title = (cfg.tickerTitle && cfg.tickerTitle.trim()) ? cfg.tickerTitle.trim() : 'HEALTH TIP';
            var text = (cfg.tickerText && cfg.tickerText.trim()) ? cfg.tickerText.trim() : DEFAULT_TICKER_TEXT;

            if (labelEl) {
                if (labelEl.textContent !== undefined) labelEl.textContent = title;
                else labelEl.innerText = title;
            }
            if (textEl) {
                if (textEl.textContent !== undefined) textEl.textContent = text;
                else textEl.innerText = text;
            }
            if (iconEl) {
                var lower = title.toLowerCase();
                if (lower.indexOf('notice') !== -1 || lower.indexOf('announcement') !== -1) {
                    iconEl.innerHTML = '&#128227;'; // Megaphone
                } else if (lower.indexOf('hour') !== -1 || lower.indexOf('time') !== -1) {
                    iconEl.innerHTML = '&#128338;'; // Clock
                } else if (lower.indexOf('camp') !== -1 || lower.indexOf('free') !== -1) {
                    iconEl.innerHTML = '&#129658;'; // Stethoscope
                } else {
                    iconEl.innerHTML = '&#128161;'; // Light bulb
                }
            }
        }
    }

    window.isFullscreenActive = function () {
        return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement);
    };

    window.toggleFullscreen = function (fullscreen) {
        var docEl = document.documentElement;
        if (fullscreen) {
            if (docEl.requestFullscreen) docEl.requestFullscreen();
            else if (docEl.webkitRequestFullscreen) docEl.webkitRequestFullscreen();
            else if (docEl.mozRequestFullScreen) docEl.mozRequestFullScreen();
            else if (docEl.msRequestFullscreen) docEl.msRequestFullscreen();
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
            else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
            else if (document.msExitFullscreen) document.msExitFullscreen();
        }
    };

    // ================================================
    // QR CODE LOGIN (index.html)
    // ================================================

    var qrPollInterval = null;
    var qrSessionCode = null;
    var qrExpiryTime = null;
    var qrTimerInterval = null;
    var qrPollErrors = 0;

    window.initQRLogin = function (hospitalId) {
        var apiUrl = getApiUrl();
        var imgEl = document.getElementById('qr-code-img');
        var loadingEl = document.getElementById('qr-loading');
        var timerEl = document.getElementById('qr-timer');

        if (!imgEl || !loadingEl) return;

        imgEl.style.display = 'none';
        loadingEl.style.display = 'block';
        if (timerEl) timerEl.innerHTML = '';
        qrSessionCode = null;

        var pairingCodeEl = document.getElementById('tv-pairing-code');
        if (pairingCodeEl) pairingCodeEl.innerHTML = '--------';

        var urlTextEl = document.getElementById('tv-login-url-text');
        if (urlTextEl) urlTextEl.innerHTML = window.location.host + '/tv-login';

        var requestData = {};
        if (hospitalId) requestData.hospital_id = hospitalId;

        ajax({
            method: 'POST',
            url: apiUrl.replace(/\/$/, '') + '/auth/tv/session',
            data: requestData,
            success: function (response) {
                qrSessionCode = response.session_code;
                qrExpiryTime = new Date(response.expires_at).getTime();

                if (pairingCodeEl) {
                    pairingCodeEl.innerHTML = response.session_code;
                }

                var directQrUrl = apiUrl.replace(/\/$/, '') + '/auth/tv/qr/' + qrSessionCode;
                var qrSrc = response.qr_image_url || directQrUrl;

                imgEl.onload = function () {
                    loadingEl.style.display = 'none';
                    imgEl.style.display = 'block';
                };
                imgEl.onerror = function () {
                    if (imgEl.src !== directQrUrl) {
                        imgEl.src = directQrUrl;
                    } else {
                        loadingEl.innerHTML = '<span style="color:#ef4444;">Failed to load QR image.</span>';
                    }
                };
                imgEl.src = qrSrc;

                startQRPolling();
                startQRTimer();
            },
            error: function (err) {
                loadingEl.innerHTML = '<span style="color:#ef4444;">Error generating QR code.</span>';
            }
        });
    };

    function startQRPolling() {
        qrPollErrors = 0;
        if (qrPollInterval) clearInterval(qrPollInterval);
        qrPollInterval = setInterval(checkSessionStatus, 3000);
    }

    function stopQRLogin() {
        if (qrPollInterval) clearInterval(qrPollInterval);
        if (qrTimerInterval) clearInterval(qrTimerInterval);
        qrPollInterval = null;
        qrTimerInterval = null;
    }

    function checkSessionStatus() {
        if (!qrSessionCode) return;
        var apiUrl = getApiUrl();

        ajax({
            method: 'GET',
            url: apiUrl.replace(/\/$/, '') + '/auth/tv/session/' + qrSessionCode + '/status',
            success: function (res) {
                qrPollErrors = 0;
                if (res.status === 'authenticated') {
                    stopQRLogin();
                    if (res.access_token) {
                        setItem('tv_auth_token', res.access_token);
                        setItem('tv_user_id', res.user_id || '');
                        setItem('tv_tenant_id', res.tenant_id || '');
                        setItem('tv_role', res.role || '');

                        // Save applied display config from mobile setup wizard
                        if (res.display_config) {
                            saveDisplayConfig(res.display_config);
                        }

                        window.location.href = 'display.html';
                    }
                } else if (res.status === 'expired') {
                    stopQRLogin();
                    var timerEl = document.getElementById('qr-timer');
                    if (timerEl) timerEl.innerHTML = '<span style="color:#ef4444; cursor:pointer;" onclick="initQRLogin()">Session expired. <u>Click here to refresh</u></span>';
                    var codeEl = document.getElementById('tv-pairing-code');
                    if (codeEl) codeEl.innerHTML = 'EXPIRED';
                }
            },
            error: function () {
                qrPollErrors++;
                if (qrPollErrors >= 8) {
                    stopQRLogin();
                }
            }
        });
    }

    function startQRTimer() {
        if (qrTimerInterval) clearInterval(qrTimerInterval);

        function update() {
            var now = new Date().getTime();
            var distance = qrExpiryTime - now;
            var timerEl = document.getElementById('qr-timer');
            if (!timerEl) return;

            if (distance < 0) {
                clearInterval(qrTimerInterval);
                timerEl.innerHTML = '<span style="color:#ef4444; cursor:pointer;" onclick="initQRLogin()">Code expired. <u>Click to refresh</u></span>';
                var codeEl = document.getElementById('tv-pairing-code');
                if (codeEl) codeEl.innerHTML = 'EXPIRED';
                return;
            }

            var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            var seconds = Math.floor((distance % (1000 * 60)) / 1000);
            seconds = seconds < 10 ? '0' + seconds : seconds;
            timerEl.innerHTML = 'Expires in ' + minutes + ':' + seconds;
        }

        update();
        qrTimerInterval = setInterval(update, 1000);
    }

    window.handleLogin = function (event) {
        if (event && event.preventDefault) event.preventDefault();

        var hospitalIdEl = document.getElementById('hospital_id');
        var hospitalId = hospitalIdEl ? hospitalIdEl.value.trim() : '';
        if (hospitalId) setHospitalId(hospitalId);

        var emailEl = document.getElementById('email');
        var passEl = document.getElementById('password');
        var email = emailEl ? emailEl.value.trim() : '';
        var password = passEl ? passEl.value : '';
        var apiUrl = getApiUrl();

        var errorEl = document.getElementById('error-message');
        var btnText = document.getElementById('btn-text');
        var btnLoading = document.getElementById('btn-loading');
        var loginBtn = document.getElementById('login-btn');

        if (errorEl) errorEl.style.display = 'none';
        if (btnText) btnText.style.display = 'none';
        if (btnLoading) btnLoading.style.display = 'inline';
        if (loginBtn) loginBtn.disabled = true;

        ajax({
            method: 'POST',
            url: apiUrl.replace(/\/$/, '') + '/auth/login',
            data: {
                email: email,
                password: password,
                hospital_id: hospitalId
            },
            success: function (response) {
                if (response.token && response.token.access_token) {
                    setItem('tv_auth_token', response.token.access_token);
                } else if (response.access_token) {
                    setItem('tv_auth_token', response.access_token);
                }
                setItem('tv_user_id', response.user_id || '');
                setItem('tv_tenant_id', response.tenant_id || '');
                setItem('tv_role', response.role || '');

                window.location.href = 'display.html';
            },
            error: function (response) {
                var message = 'Login failed. Please check credentials.';
                if (response && response.message) message = response.message;
                else if (response && response.detail) message = response.detail;

                if (errorEl) {
                    errorEl.innerHTML = message;
                    errorEl.style.display = 'block';
                }
                if (btnText) btnText.style.display = 'inline';
                if (btnLoading) btnLoading.style.display = 'none';
                if (loginBtn) loginBtn.disabled = false;
            }
        });

        return false;
    };

    window.toggleLoginMethod = function () {
        var form = document.getElementById('login-form');
        var qrContainer = document.getElementById('qr-login-container');
        var toggleLink = document.getElementById('toggle-method');
        if (!form || !qrContainer) return;

        if (form.style.display !== 'none') {
            form.style.display = 'none';
            qrContainer.style.display = 'block';
            if (toggleLink) toggleLink.innerHTML = 'Switch to Password Login';
            window.initQRLogin();
        } else {
            stopQRLogin();
            qrContainer.style.display = 'none';
            form.style.display = 'block';
            if (toggleLink) toggleLink.innerHTML = 'Switch to QR Code Login';
        }
    };

    window.handleLogout = function () {
        removeItem('tv_auth_token');
        removeItem('tv_user_id');
        removeItem('tv_role');
        window.location.href = 'index.html';
    };

    // ================================================
    // DISPLAY PAGE CONTROLLER (display.html)
    // ================================================

    var activeDoctors = []; // All available doctors from API
    var configuredDoctors = []; // Doctors currently displayed
    var queuePollInterval = null;
    var clockInterval = null;
    var previousServingTokens = {}; // doctorId -> serving token string
    var totalPatientsCount = 0;

    window.initDisplay = function () {
        if (!getAuthToken()) {
            window.location.href = 'index.html';
            return;
        }

        loadConfig(function () {
            applyThemePreference();
            applyTickerPreference();
            updateClock();
            clockInterval = setInterval(updateClock, CONFIG.CLOCK_INTERVAL);

            // Fetch hospital profile & doctors
            loadHospitalInfo();
            loadAllDoctors(function () {
                setupConfiguredQueues();
                startQueuePolling();
            });
        });
    };

    function updateClock() {
        var now = new Date();
        var hours = now.getHours();
        var minutes = now.getMinutes();
        var seconds = now.getSeconds();

        var ampm = hours >= 12 ? 'PM' : 'AM';
        var h12 = hours % 12;
        h12 = h12 ? h12 : 12; // 0 becomes 12
        h12 = h12 < 10 ? '0' + h12 : h12;
        minutes = minutes < 10 ? '0' + minutes : minutes;
        seconds = seconds < 10 ? '0' + seconds : seconds;

        var clockTimeEl = document.getElementById('clock-time');
        if (clockTimeEl) {
            clockTimeEl.innerHTML = h12 + ':' + minutes + ':' + seconds + ' ' + ampm;
        }

        var clockDateEl = document.getElementById('clock-date');
        if (clockDateEl) {
            var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            clockDateEl.innerHTML = days[now.getDay()] + ', ' + now.getDate() + ' ' + months[now.getMonth()] + ' ' + now.getFullYear();
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
            text.innerHTML = 'Offline';
        }
    }

    function loadHospitalInfo() {
        var apiUrl = getApiUrl();
        var token = getAuthToken();
        var tenantId = getTenantId();

        if (!token || !tenantId) return;

        ajax({
            method: 'GET',
            url: apiUrl + '/tenants/' + tenantId,
            headers: { 'Authorization': 'Bearer ' + token },
            success: function (res) {
                var name = res.name || res.hospital_name;
                var address = res.address || res.location || 'Outpatient Department (OPD)';
                var clinicNameEl = document.getElementById('clinic-name');
                var clinicLocEl = document.getElementById('clinic-location');
                if (name && clinicNameEl) clinicNameEl.innerHTML = name;
                if (address && clinicLocEl) clinicLocEl.innerHTML = address;
            },
            error: function () {
                // Keep default clinic title
            }
        });
    }

    function loadAllDoctors(callback) {
        var apiUrl = getApiUrl();
        var token = getAuthToken();

        ajax({
            method: 'GET',
            url: apiUrl + '/doctors',
            headers: { 'Authorization': 'Bearer ' + token },
            success: function (res) {
                activeDoctors = res.data || res || [];
                if (callback) callback();
            },
            error: function (err, status) {
                if (status === 401) {
                    handleLogout();
                    return;
                }
                activeDoctors = [];
                if (callback) callback();
            }
        });
    }

    // ================================================
    // DYNAMIC LAYOUT & QUEUE BUILDER
    // ================================================

    function setupConfiguredQueues() {
        var cfg = getDisplayConfig();
        var container = document.getElementById('queue-view-container');
        if (!container) return;

        // Determine configured doctors
        configuredDoctors = [];
        if (cfg.doctorIds && cfg.doctorIds.length > 0) {
            for (var i = 0; i < cfg.doctorIds.length; i++) {
                var dId = cfg.doctorIds[i];
                for (var j = 0; j < activeDoctors.length; j++) {
                    if (activeDoctors[j].id === dId) {
                        configuredDoctors.push(activeDoctors[j]);
                        break;
                    }
                }
            }
        }

        // Fallback: If no doctors matched or none selected, pick up to 2 active doctors
        if (configuredDoctors.length === 0 && activeDoctors.length > 0) {
            configuredDoctors = activeDoctors.slice(0, 2);
        }

        // Decide effective layout
        var isSplit = cfg.layout === 'split' && cfg.showExaminer && configuredDoctors.length >= 2;
        container.className = 'queue-view-container ' + (isSplit ? 'layout-split' : 'layout-columns-' + (configuredDoctors.length + (cfg.showExaminer ? 1 : 0)));

        var html = '';

        if (isSplit) {
            // Split layout: Left col = Examiner (Full Height), Right col = 2 Stacked Doctors
            html += '<div class="split-col-left">';
            html += buildQueuePanelHtml('examiner', 'EXAMINATION / OPTOMETRY', 'Eye Examination & Triage', 'Room 1', ACCENTS[2], TOKEN_ACCENTS[2], false);
            html += '</div>';

            html += '<div class="split-col-right">';
            for (var k = 0; k < 2; k++) {
                var doc = configuredDoctors[k];
                var docName = doc.user_name || doc.name || 'Doctor ' + (k + 1);
                var docRole = (doc.specialization || 'OPD Consultant') + ' - OPD';
                var cabin = 'Cabin ' + (k + 1);
                var accentIdx = k % ACCENTS.length;
                html += buildQueuePanelHtml('doctor-' + doc.id, docName, docRole, cabin, ACCENTS[accentIdx], TOKEN_ACCENTS[accentIdx], true);
            }
            html += '</div>';
        } else {
            // Equal Side-by-Side Columns
            var colIdx = 0;
            if (cfg.showExaminer) {
                html += buildQueuePanelHtml('examiner', 'EXAMINATION / OPTOMETRY', 'Eye Examination & Triage', 'Room 1', ACCENTS[colIdx % ACCENTS.length], TOKEN_ACCENTS[colIdx % ACCENTS.length], false);
                colIdx++;
            }

            for (var d = 0; d < configuredDoctors.length; d++) {
                var docItem = configuredDoctors[d];
                var dName = docItem.user_name || docItem.name || 'Dr. Consultant';
                var dRole = (docItem.specialization || 'Consultant') + ' - OPD';
                var dCabin = 'Cabin ' + (d + 1);
                var cAccent = ACCENTS[colIdx % ACCENTS.length];
                var cTokenAccent = TOKEN_ACCENTS[colIdx % ACCENTS.length];
                html += buildQueuePanelHtml('doctor-' + docItem.id, dName, dRole, dCabin, cAccent, cTokenAccent, false);
                colIdx++;
            }
        }

        container.innerHTML = html;
        applyTickerPreference();
    }

    function buildQueuePanelHtml(panelId, title, role, cabin, accentClass, tokenAccentClass, isStacked) {
        var stackedClass = isStacked ? ' is-stacked' : '';
        var html = '';
        html += '<div id="panel-' + panelId + '" class="queue-panel' + stackedClass + '">';

        // Practitioner Header Pill
        html += '<div class="practitioner-pill ' + accentClass + '">';
        html += '  <div class="practitioner-info">';
        html += '    <div class="practitioner-name">' + title + '</div>';
        html += '    <div class="practitioner-role">' + role + '</div>';
        html += '  </div>';
        html += '  <div class="practitioner-cabin-tag">' + cabin + '</div>';
        html += '</div>';

        // Hero "NOW SERVING" Box
        html += '<div class="now-serving-box" id="hero-box-' + panelId + '">';
        html += '  <div class="serving-sublabel">NOW SERVING</div>';
        html += '  <div class="hero-token-number ' + tokenAccentClass + '" id="token-' + panelId + '">--</div>';
        html += '  <div class="hero-patient-name" id="name-' + panelId + '">Ready for Patient</div>';
        html += '  <div class="hero-cabin-badge" id="cabin-' + panelId + '" style="display:none;">' + cabin + '</div>';
        html += '</div>';

        // "WAITING QUEUE" List
        html += '<div class="waiting-section">';
        html += '  <div class="queue-section-header">WAITING QUEUE</div>';
        html += '  <div class="waiting-list-scroll" id="waiting-list-' + panelId + '">';
        html += '    <div class="empty-queue-message">No waiting patients</div>';
        html += '  </div>';
        html += '</div>';

        html += '</div>';
        return html;
    }

    // ================================================
    // QUEUE POLLING & LIVE UPDATES
    // ================================================

    function startQueuePolling() {
        if (queuePollInterval) clearInterval(queuePollInterval);
        fetchQueues();
        queuePollInterval = setInterval(fetchQueues, CONFIG.POLL_INTERVAL);
    }

    function fetchQueues() {
        var cfg = getDisplayConfig();
        var apiUrl = getApiUrl();
        var token = getAuthToken();
        var totalActive = 0;

        // 1. Fetch Examiner Queue if enabled
        if (cfg.showExaminer && configuredDoctors.length > 0) {
            var primaryDocId = configuredDoctors[0].id;
            var examinerUrl = apiUrl + '/opd/eye-hospital/optometrist-queue/' + primaryDocId + '?status=awaiting_optometrist,optometrist_assigned,optometrist_investigation_in_progress';

            ajax({
                method: 'GET',
                url: examinerUrl,
                headers: { 'Authorization': 'Bearer ' + token },
                success: function (res) {
                    var items = parseQueueResponse(res);
                    updateQueuePanel('examiner', items, 'Examiner Room 1');
                    totalActive += items.length;
                    updateTotalPatientCount(totalActive);
                    setConnectionStatus('connected');
                },
                error: function () {
                    // Try general examiner queue fallback
                    ajax({
                        method: 'GET',
                        url: apiUrl + '/opd/general/examiner-queue/' + primaryDocId + '?status=awaiting_examiner,examiner_assigned,examination_in_progress',
                        headers: { 'Authorization': 'Bearer ' + token },
                        success: function (res2) {
                            var items2 = parseQueueResponse(res2);
                            updateQueuePanel('examiner', items2, 'Examiner Room 1');
                            totalActive += items2.length;
                            updateTotalPatientCount(totalActive);
                            setConnectionStatus('connected');
                        }
                    });
                }
            });
        }

        // 2. Fetch Queues for each configured doctor
        for (var i = 0; i < configuredDoctors.length; i++) {
            (function (doc, index) {
                var docPanelId = 'doctor-' + doc.id;
                var cabinLabel = 'Cabin ' + (index + 1);
                var docQueueUrl = apiUrl + '/opd/eye-hospital/group-queue/' + doc.id + '?status=awaiting_doctor,doctor_assigned,consultation_in_progress,dilation_in_progress,dilation_completed';

                ajax({
                    method: 'GET',
                    url: docQueueUrl,
                    headers: { 'Authorization': 'Bearer ' + token },
                    success: function (res) {
                        var items = parseQueueResponse(res);
                        updateQueuePanel(docPanelId, items, cabinLabel, doc.user_name || doc.name);
                        totalActive += items.length;
                        updateTotalPatientCount(totalActive);
                        setConnectionStatus('connected');
                    },
                    error: function () {
                        // General OPD fallback
                        ajax({
                            method: 'GET',
                            url: apiUrl + '/opd/general/group-queue/' + doc.id + '?status=awaiting_doctor,doctor_assigned,consultation_in_progress',
                            headers: { 'Authorization': 'Bearer ' + token },
                            success: function (res2) {
                                var items2 = parseQueueResponse(res2);
                                updateQueuePanel(docPanelId, items2, cabinLabel, doc.user_name || doc.name);
                                totalActive += items2.length;
                                updateTotalPatientCount(totalActive);
                                setConnectionStatus('connected');
                            }
                        });
                    }
                });
            })(configuredDoctors[i], i);
        }

        var lastUpdateEl = document.getElementById('last-update');
        if (lastUpdateEl) {
            var now = new Date();
            var h = now.getHours();
            var m = now.getMinutes();
            var s = now.getSeconds();
            lastUpdateEl.innerHTML = (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
        }
    }

    function parseQueueResponse(res) {
        if (!res) return [];
        if (Array.isArray(res)) return res;
        if (Array.isArray(res.data)) return res.data;
        if (Array.isArray(res.items)) return res.items;
        return [];
    }

    function updateTotalPatientCount(count) {
        if (count > totalPatientsCount) totalPatientsCount = count;
        var el = document.getElementById('total-patients-count');
        if (el) el.innerHTML = totalPatientsCount;
    }

    function isServingStatus(status) {
        return status === 'consultation_in_progress' ||
            status === 'doctor_assigned' ||
            status === 'examination_in_progress' ||
            status === 'examiner_assigned' ||
            status === 'optometrist_assigned' ||
            status === 'optometrist_investigation_in_progress';
    }

    function updateQueuePanel(panelId, patients, cabinLabel, doctorName) {
        var tokenEl = document.getElementById('token-' + panelId);
        var nameEl = document.getElementById('name-' + panelId);
        var cabinEl = document.getElementById('cabin-' + panelId);
        var listEl = document.getElementById('waiting-list-' + panelId);
        var heroBox = document.getElementById('hero-box-' + panelId);

        if (!tokenEl || !nameEl || !listEl) return;

        var servingPatient = null;
        var waitingPatients = [];

        for (var i = 0; i < patients.length; i++) {
            var p = patients[i];
            if (!servingPatient && isServingStatus(p.status)) {
                servingPatient = p;
            } else if (p.status !== 'completed' && p.status !== 'cancelled') {
                waitingPatients.push(p);
            }
        }

        // Render Hero NOW SERVING
        if (servingPatient) {
            var tokenNum = servingPatient.token_number || servingPatient.token || 'T-000';
            var pName = servingPatient.patient_name || 'Patient';
            var demo = '';
            if (servingPatient.patient_age) demo += servingPatient.patient_age;
            if (servingPatient.patient_gender) demo += (demo ? '' : '') + servingPatient.patient_gender.charAt(0).toUpperCase();
            if (demo) pName += ' (' + demo + ')';

            tokenEl.innerHTML = tokenNum;
            nameEl.innerHTML = pName;
            if (cabinEl) {
                cabinEl.innerHTML = cabinLabel;
                cabinEl.style.display = 'inline-block';
            }

            // Check if this is a newly called token
            if (previousServingTokens[panelId] !== tokenNum) {
                previousServingTokens[panelId] = tokenNum;
                onTokenCalled(tokenNum, pName, cabinLabel, doctorName, heroBox);
            }
        } else {
            tokenEl.innerHTML = '--';
            nameEl.innerHTML = 'Ready for Next Patient';
            if (cabinEl) cabinEl.style.display = 'none';
            if (heroBox) heroBox.className = 'now-serving-box';
        }

        // Render WAITING QUEUE
        if (waitingPatients.length === 0) {
            listEl.innerHTML = '<div class="empty-queue-message">No waiting patients</div>';
        } else {
            var listHtml = '';
            for (var w = 0; w < waitingPatients.length; w++) {
                var wp = waitingPatients[w];
                var wToken = wp.token_number || wp.token || '--';
                var wName = wp.patient_name || 'Patient';
                var wDemo = '';
                if (wp.patient_age) wDemo += wp.patient_age;
                if (wp.patient_gender) wDemo += (wDemo ? '' : '') + wp.patient_gender.charAt(0).toUpperCase();

                var isNext = (w === 0);
                var rowClass = 'waiting-row' + (isNext ? ' is-next-row' : '');

                listHtml += '<div class="' + rowClass + '">';
                listHtml += '  <span class="wait-token">' + wToken + '</span>';
                if (isNext) {
                    listHtml += '  <span class="badge-next">NEXT</span>';
                }
                listHtml += '  <span class="wait-name">' + wName + '</span>';
                if (wDemo) {
                    listHtml += '  <span class="wait-demo">' + wDemo + '</span>';
                }
                listHtml += '</div>';
            }
            listEl.innerHTML = listHtml;
        }
    }

    // ================================================
    // AUDIO & SPEECH ANNOUNCEMENT ENGINE
    // ================================================

    function onTokenCalled(tokenNum, patientName, cabin, docName, heroBox) {
        // Visual pulse
        if (heroBox) {
            heroBox.className = 'now-serving-box token-call-active';
            setTimeout(function () {
                heroBox.className = 'now-serving-box';
            }, 6000);
        }

        var cfg = getDisplayConfig();
        if (cfg.voiceAlerts === false) return;

        // Play chime audio
        playChime(function () {
            // Speak token announcement
            var destination = docName ? (docName + ', ' + cabin) : cabin;
            var text = 'Token ' + tokenNum + ', ' + patientName + ', please proceed to ' + destination;
            speakText(text, 'en');
        });
    }

    function playChime(callback) {
        var sound = document.getElementById('notification-sound');
        if (sound) {
            sound.currentTime = 0;
            var playPromise = sound.play();
            if (playPromise && playPromise.then) {
                playPromise.then(function () {
                    setTimeout(callback, 1200);
                }).catch(function () {
                    if (callback) callback();
                });
            } else {
                setTimeout(callback, 1200);
            }
        } else {
            if (callback) callback();
        }
    }

    function speakText(text, lang) {
        if ('speechSynthesis' in window) {
            try {
                window.speechSynthesis.cancel();
                var utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-US';
                utterance.rate = 0.95;
                utterance.pitch = 1.0;
                window.speechSynthesis.speak(utterance);
            } catch (e) {
                // Speech synthesis failed
            }
        }
    }

    // Audio test tool
    window.toggleTestPanel = function () {
        var panel = document.getElementById('test-panel-body');
        if (!panel) return;
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    };

    window.testAnnouncement = function (lang) {
        var textEl = document.getElementById('test-announcement-text');
        var statusEl = document.getElementById('test-announcement-status');
        var text = textEl ? textEl.value : 'Token T-012, Meera Devi, please proceed to Consultation Room 1';

        if (statusEl) statusEl.innerHTML = 'Playing chime...';
        playChime(function () {
            if (statusEl) statusEl.innerHTML = 'Speaking (' + lang + ')...';
            speakText(text, lang);
            setTimeout(function () {
                if (statusEl) statusEl.innerHTML = 'Complete';
            }, 3000);
        });
    };

    // ================================================
    // ON-SCREEN TV SETUP MODAL
    // ================================================

    window.openSetupModal = function () {
        var overlay = document.getElementById('setup-modal-overlay');
        if (!overlay) return;

        var cfg = getDisplayConfig();

        // Set Layout radio
        var layoutRadios = document.getElementsByName('modal-layout');
        for (var i = 0; i < layoutRadios.length; i++) {
            layoutRadios[i].checked = (layoutRadios[i].value === cfg.layout);
        }

        // Set Optometrist checkbox
        var optToggle = document.getElementById('modal-optometrist-toggle');
        if (optToggle) optToggle.checked = !!cfg.showExaminer;

        // Set Ticker & Audio
        var voiceToggle = document.getElementById('modal-voice-toggle');
        if (voiceToggle) voiceToggle.checked = (cfg.voiceAlerts !== false);

        var tickerToggle = document.getElementById('modal-ticker-toggle');
        var tickerActive = isTickerActive(cfg);
        if (tickerToggle) {
            tickerToggle.checked = tickerActive;
            window.handleModalTickerToggle(tickerActive);
        }

        var tickerLabelInput = document.getElementById('modal-ticker-label');
        if (tickerLabelInput) {
            tickerLabelInput.value = cfg.tickerTitle || 'HEALTH TIP';
        }

        var tickerTextInput = document.getElementById('modal-ticker-text');
        if (tickerTextInput) {
            tickerTextInput.value = cfg.tickerText || DEFAULT_TICKER_TEXT;
        }

        // Render Doctor checkboxes
        var docListEl = document.getElementById('modal-doctors-list');
        if (docListEl) {
            if (activeDoctors.length === 0) {
                docListEl.innerHTML = '<p class="empty-list-note">No doctors available</p>';
            } else {
                var docHtml = '';
                var selectedSet = {};
                for (var s = 0; s < cfg.doctorIds.length; s++) {
                    selectedSet[cfg.doctorIds[s]] = true;
                }

                for (var d = 0; d < activeDoctors.length; d++) {
                    var doc = activeDoctors[d];
                    var isChecked = selectedSet[doc.id] || (cfg.doctorIds.length === 0 && d < 2);
                    var docName = doc.user_name || doc.name || 'Doctor';
                    var spec = doc.specialization || 'Consultant';

                    docHtml += '<label class="modal-doc-item">';
                    docHtml += '  <input type="checkbox" name="modal-doc-checkbox" value="' + doc.id + '"' + (isChecked ? ' checked' : '') + '>';
                    docHtml += '  <span class="modal-doc-name">' + docName + '</span>';
                    docHtml += '  <span class="modal-doc-spec">(' + spec + ')</span>';
                    docHtml += '</label>';
                }
                docListEl.innerHTML = docHtml;
            }
        }

        overlay.style.display = 'flex';
    };

    window.closeSetupModal = function () {
        var overlay = document.getElementById('setup-modal-overlay');
        if (overlay) overlay.style.display = 'none';
    };

    window.handleModalLayoutChange = function (val) {
        // Just for visual selection feedback if needed
    };

    window.handleModalTickerToggle = function (isChecked) {
        var details = document.getElementById('modal-ticker-details');
        if (details) {
            details.style.opacity = isChecked ? '1' : '0.4';
            details.style.pointerEvents = isChecked ? 'auto' : 'none';
        }
    };

    window.applyModalTickerPreset = function (type) {
        var labelInput = document.getElementById('modal-ticker-label');
        var textInput = document.getElementById('modal-ticker-text');
        if (!labelInput || !textInput) return;

        if (type === 'tips') {
            labelInput.value = 'HEALTH TIP';
            textInput.value = 'Regular health check-ups every 6 months \u2022 Practice 20-20-20 rule for digital screens \u2022 Stay hydrated throughout the day \u2022 Practice deep breathing for stress relief \u2022 Eat fresh fruits and vegetables daily \u2022 Maintain good posture while sitting \u2022 Consult your doctor before taking self-medication';
        } else if (type === 'notice') {
            labelInput.value = 'CLINIC NOTICE';
            textInput.value = 'Please keep your mobile phones on silent mode in the consultation area \u2022 Report to reception desk if you need immediate assistance \u2022 Sanitizer dispensers are available near all room entrances';
        } else if (type === 'hours') {
            labelInput.value = 'VISITING HOURS';
            textInput.value = 'OPD Consultation: Mon - Sat 9:00 AM to 7:00 PM \u2022 Pharmacy & Diagnostic Services: 8:00 AM to 9:00 PM \u2022 Emergency Services open 24/7';
        } else if (type === 'camp') {
            labelInput.value = 'FREE HEALTH CAMP';
            textInput.value = 'Free Blood Sugar & BP Screening this Saturday 10:00 AM - 2:00 PM \u2022 Register at reception desk for complimentary eye checkup and consultation';
        }
    };

    window.saveSetupModal = function () {
        var cfg = getDisplayConfig();

        // Read Layout
        var layoutRadios = document.getElementsByName('modal-layout');
        for (var i = 0; i < layoutRadios.length; i++) {
            if (layoutRadios[i].checked) {
                cfg.layout = layoutRadios[i].value;
                break;
            }
        }

        // Read Optometrist
        var optToggle = document.getElementById('modal-optometrist-toggle');
        if (optToggle) cfg.showExaminer = optToggle.checked;

        // Read Voice
        var voiceToggle = document.getElementById('modal-voice-toggle');
        if (voiceToggle) cfg.voiceAlerts = voiceToggle.checked;

        // Read Ticker settings
        var tickerToggle = document.getElementById('modal-ticker-toggle');
        var tickerLabelInput = document.getElementById('modal-ticker-label');
        var tickerTextInput = document.getElementById('modal-ticker-text');

        if (tickerToggle) {
            var isTickerOn = tickerToggle.checked;
            cfg.showTicker = isTickerOn;
            cfg.showHealthTips = isTickerOn;
        }

        if (tickerLabelInput && tickerLabelInput.value) {
            cfg.tickerTitle = tickerLabelInput.value.replace(/^\s+|\s+$/g, '');
        }

        if (tickerTextInput && tickerTextInput.value) {
            cfg.tickerText = tickerTextInput.value.replace(/^\s+|\s+$/g, '');
        }

        // Read Selected Doctors
        var docCheckboxes = document.getElementsByName('modal-doc-checkbox');
        var selectedIds = [];
        for (var d = 0; d < docCheckboxes.length; d++) {
            if (docCheckboxes[d].checked) {
                selectedIds.push(docCheckboxes[d].value);
            }
        }
        cfg.doctorIds = selectedIds;

        // Save & apply
        saveDisplayConfig(cfg);
        applyTickerPreference();
        closeSetupModal();

        // Re-render layout immediately
        setupConfiguredQueues();
        fetchQueues();
    };

    // Keyboard shortcut: Press 'S' to open TV settings modal
    document.addEventListener('keydown', function (e) {
        if (e.key === 's' || e.key === 'S') {
            if (document.getElementById('setup-modal-overlay')) {
                window.openSetupModal();
            }
        }
    });

})();
