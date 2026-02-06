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
        API_URL: null  // Will be set after loading config
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
        // Check for newly assigned patients
        for (var i = 0; i < current.length; i++) {
            var curr = current[i];
            var isAssigned = (queueType === 'optometrist' && curr.status === 'optometrist_assigned') ||
                (queueType === 'doctor' && curr.status === 'doctor_assigned');

            if (isAssigned) {
                var wasAssigned = false;
                for (var j = 0; j < previous.length; j++) {
                    var prev = previous[j];
                    if (prev.visit_id === curr.visit_id && prev.status === curr.status) {
                        wasAssigned = true;
                        break;
                    }
                }

                if (!wasAssigned) {
                    // Play notification sound
                    playNotificationSound();
                    break; // Only one notification per update
                }
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
        html += '<div class="patient-name">' + patientName + '</div>';
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

    // Load config on page load
    loadConfig();

})();
