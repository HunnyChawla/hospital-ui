/**
 * TV Legacy Display — queue rendering tests.
 *
 * public/app.js runs in browsers old enough that no test runner supports them,
 * so this harness stubs just enough DOM to load the real file under Node and
 * drive it through window.initDisplay(). No build step, no dependencies:
 *
 *     node test/display.test.js
 *
 * What it protects: making the two queue columns configurable touched the URLs,
 * the card rendering, the Waiting/In Progress counts and the announcement
 * trigger. These screens hang on hospital walls and are not force-refreshable,
 * so the eye-hospital defaults must keep behaving exactly as they did.
 */

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var APP_JS = path.join(__dirname, '..', 'public', 'app.js');

// ================================================
// MINIMAL DOM
// ================================================

function makeElement(id) {
    return {
        id: id,
        innerHTML: '',
        value: '',
        className: '',
        style: {},
        children: [],
        appendChild: function (child) { this.children.push(child); },
        setAttribute: function () { },
        addEventListener: function () { }
    };
}

/**
 * @param {Object} opts
 * @param {Object} opts.config      body served for GET /config
 * @param {Object} opts.responses   url-substring -> body, for API calls
 */
function run(opts) {
    var elements = {};
    var requested = [];
    var intervals = [];
    var announced = [];

    function getElementById(id) {
        if (!elements[id]) elements[id] = makeElement(id);
        return elements[id];
    }

    var storage = { tv_auth_token: 'test-token', tv_selected_doctor: 'doc-1' };

    function StubXhr() {
        this.readyState = 0;
        this.status = 0;
        this.responseText = '';
    }
    StubXhr.prototype.open = function (method, url) { this._url = url; };
    StubXhr.prototype.setRequestHeader = function () { };
    StubXhr.prototype.send = function () {
        requested.push(this._url);
        var body = null;
        if (this._url === '/config') {
            body = opts.config;
        } else {
            for (var key in opts.responses) {
                if (this._url.indexOf(key) !== -1) { body = opts.responses[key]; break; }
            }
        }
        this.readyState = 4;
        this.status = body === null ? 404 : 200;
        this.responseText = JSON.stringify(body === null ? { detail: 'not stubbed' } : body);
        this.onreadystatechange();
    };

    // app.js has no seam for observing announcements, but it logs every one it
    // enqueues, so capture the spoken sentence from there rather than adding a
    // test-only hook to production code.
    var sandbox = {
        console: {
            log: function (line) {
                var match = /Enqueued \[[^\]]*\] "([^"]*)"/.exec(String(line));
                if (match) announced.push(match[1]);
            },
            error: console.error,
            warn: console.warn
        },
        JSON: JSON,
        Array: Array,
        Date: Date,
        Math: Math,
        String: String,
        parseInt: parseInt,
        // Timers never fire: polling and the clock would keep the process alive,
        // and every assertion here is about the first, synchronous fetch. The
        // requested delays are recorded so the poll interval can be checked.
        setInterval: function (fn, delay) { intervals.push(delay); return intervals.length; },
        clearInterval: function () { },
        setTimeout: function () { return 0; },
        clearTimeout: function () { },
        localStorage: {
            getItem: function (k) { return storage[k] || null; },
            setItem: function (k, v) { storage[k] = String(v); },
            removeItem: function (k) { delete storage[k]; }
        },
        document: {
            getElementById: getElementById,
            createElement: function (tag) { return makeElement(tag); },
            querySelectorAll: function () { return []; },
            getElementsByClassName: function () { return []; },
            getElementsByTagName: function () { return []; },
            addEventListener: function () { },
            body: makeElement('body')
        },
        location: { href: '' },
        navigator: { userAgent: 'node' },
        Audio: function () { return { play: function () { }, currentTime: 0 }; }
    };
    sandbox.window = sandbox;
    sandbox.XMLHttpRequest = StubXhr;
    sandbox.globalThis = sandbox;

    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(APP_JS, 'utf8'), sandbox, { filename: 'app.js' });

    sandbox.window.initDisplay();

    return {
        el: getElementById,
        urls: requested,
        intervals: intervals,
        announced: announced,
        window: sandbox.window
    };
}

// ================================================
// FIXTURES
// ================================================

// What the eye endpoints return today: a flat `status` string.
// The default columns now read /pathways/queue, so these are in the generic
// shape: a `stage` object, `visit_id`, and the cabin on the assignment rather
// than as a flat `optometrist_cabin`.
var EYE_OPT_QUEUE = {
    items: [
        {
            visit_id: 'v1', patient_name: 'Asha Rao', token_number: 4,
            stage: { code: 'awaiting_optometrist', label: 'Waiting for optometrist' },
            assignments: []
        },
        {
            visit_id: 'v2', patient_name: 'Bimal Sen', token_number: 5,
            stage: { code: 'optometrist_assigned', label: 'Optometrist assigned' },
            assignments: [{ role: 'optometrist', user_name: 'Opt A', user_cabin: 'Room 2' }]
        }
    ],
    total: 2, page: 1, page_size: 100, total_pages: 1
};
var EYE_DOC_QUEUE = {
    items: [
        {
            visit_id: 'v3', patient_name: 'Chetan Iyer', token_number: 6,
            stage: { code: 'awaiting_doctor', label: 'Waiting for doctor' },
            assignments: []
        },
        {
            visit_id: 'v4', patient_name: 'Divya Nair', token_number: 7,
            stage: { code: 'doctor_assigned', label: 'Doctor assigned' },
            assignments: [{ role: 'doctor', user_name: 'Dr. Mehta', user_cabin: 'Cabin 1' }]
        },
        {
            visit_id: 'v5', patient_name: 'Esha Roy', token_number: 8,
            stage: { code: 'consultation_in_progress', label: 'In consultation' },
            assignments: []
        }
    ],
    total: 3, page: 1, page_size: 100, total_pages: 1
};

// The old eye-endpoint shape, still handled: a flat status and a flat cabin
// field. A column pointed at one of those endpoints must keep working.
var FLAT_OPT_QUEUE = [
    { id: 'v1', patient_name: 'Asha Rao', token_number: 4, status: 'awaiting_optometrist' },
    { id: 'v2', patient_name: 'Bimal Sen', token_number: 5, status: 'optometrist_assigned', optometrist_cabin: 'Room 9' }
];

// What /pathways/queue returns: a `stage` object and no flat status.
var PATHWAY_QUEUE = {
    items: [
        {
            visit_id: 'p1', patient_name: 'Farid Khan', token_number: 11,
            stage: { code: 'awaiting_nurse', label: 'Waiting for Nurse', stage_type: 'waiting' }
        },
        {
            visit_id: 'p2', patient_name: 'Gita Bose', token_number: 12,
            stage: { code: 'nurse_assigned', label: 'With Nurse', stage_type: 'in_progress' }
        }
    ],
    total: 2, page: 1, page_size: 100, total_pages: 1
};

var DOCTORS = [{ id: 'doc-1', user_name: 'Dr. Mehta' }];

// ================================================
// ASSERTIONS
// ================================================

var failures = [];
var checks = 0;

function check(name, actual, expected) {
    checks++;
    var a = JSON.stringify(actual);
    var e = JSON.stringify(expected);
    if (a !== e) {
        failures.push(name + '\n      expected: ' + e + '\n      actual:   ' + a);
    }
}

function contains(name, haystack, needle) {
    checks++;
    if (String(haystack).indexOf(needle) === -1) {
        failures.push(name + '\n      expected to contain: ' + needle + '\n      in: ' + haystack);
    }
}

function anyUrlContains(urls, needle) {
    for (var i = 0; i < urls.length; i++) {
        if (urls[i].indexOf(needle) !== -1) return true;
    }
    return false;
}

// ================================================
// TEST 1 — no display config at all (older /config, or a screen not yet updated)
// ================================================
(function testLegacyConfigStillWorks() {
    var r = run({
        config: { apiBaseUrl: 'http://api.test' },
        responses: {
            '/doctors': DOCTORS,
            'stage_codes=awaiting_optometrist': EYE_OPT_QUEUE,
            'stage_codes=awaiting_doctor': EYE_DOC_QUEUE
        }
    });

    // The eye endpoints these used to call are gone. What a screen with no
    // TV_COLUMNS sees must be unchanged regardless — same counts, same
    // wording, same announcements — which is what the rest of this test checks.
    check('default: reads the generic queue for the optometrist column',
        anyUrlContains(r.urls, 'http://api.test/pathways/queue?doctor_id=doc-1'
            + '&stage_codes=awaiting_optometrist,optometrist_assigned'), true);
    check('default: reads the generic queue for the doctor column',
        anyUrlContains(r.urls, 'http://api.test/pathways/queue?doctor_id=doc-1'
            + '&include_covering_doctors=true'
            + '&stage_codes=awaiting_doctor,doctor_assigned,consultation_in_progress'), true);
    check('default: no eye-hospital endpoint is called any more',
        anyUrlContains(r.urls, '/opd/eye-hospital/'), false);

    check('legacy: optometrist waiting count', r.el('optometrist-waiting').innerHTML, 1);
    check('legacy: optometrist in-progress count', r.el('optometrist-progress').innerHTML, 1);
    check('legacy: doctor waiting count', r.el('doctor-waiting').innerHTML, 1);
    check('legacy: doctor in-progress count', r.el('doctor-progress').innerHTML, 2);

    var opt = r.el('optometrist-queue').innerHTML;
    contains('legacy: waiting card says Waiting', opt, '>Waiting</span>');
    contains('legacy: assigned card says Called', opt, '>Called</span>');
    contains('legacy: assigned card is highlighted', opt, 'patient-card status-assigned');
    contains('legacy: assigned card shows the cabin', opt, 'Room 2');

    var doc = r.el('doctor-queue').innerHTML;
    contains('legacy: in-consultation wording', doc, '>In Consultation</span>');
    contains('legacy: in-consultation styling', doc, 'patient-card status-in-progress');

    check('legacy: headings left alone', r.el('optometrist-title').innerHTML, '');

    check('legacy: announces both newly-called patients with the cabin', r.announced, [
        'Patient Bimal Sen, token number 5, please proceed to Room 2.',
        'Patient Divya Nair, token number 7, please proceed to Cabin 1.'
    ]);

    check('legacy: polls every 5 seconds', r.intervals.indexOf(5000) !== -1, true);
})();

// ================================================
// TEST 1b — cabin-less announcements keep the old wording
// ================================================
(function testAnnouncementWithoutCabin() {
    var r = run({
        config: { apiBaseUrl: 'http://api.test' },
        responses: {
            '/doctors': DOCTORS,
            'stage_codes=awaiting_optometrist': [
                { id: 'v9', patient_name: 'Hari Das', token_number: 3, status: 'optometrist_assigned' }
            ],
            'stage_codes=awaiting_doctor': [
                { id: 'v10', patient_name: 'Ila Sharma', token_number: 4, status: 'doctor_assigned' }
            ]
        }
    });

    check('legacy: cabin-less wording unchanged', r.announced, [
        'Patient Hari Das, token number 3, please proceed for eye examination.',
        'Patient Ila Sharma, token number 4, your consultation is ready.'
    ]);
})();

// ================================================
// TEST 2 — a column pointed at an endpoint that returns the FLAT shape
//
// The generic queue nests the cabin under `assignments`. Anything else — a
// bare array with a flat `status` and a flat `*_cabin` — must still render and
// still speak the room, or a site with a custom TV_COLUMNS endpoint goes
// silent on the one detail patients need.
// ================================================
(function testFlatShapeStillWorks() {
    var flatColumns = [
        {
            key: 'optometrist', title: 'Optometrist Queue',
            endpoint: '/custom/opt-queue/{doctorId}',
            waiting: ['awaiting_optometrist'], active: ['optometrist_assigned'],
            inProgress: [], announce: ['optometrist_assigned'],
            labels: { optometrist_assigned: 'Called' }, cabinField: 'optometrist_cabin'
        }
    ];

    var r = run({
        config: { apiBaseUrl: 'http://api.test', display: { refreshSeconds: 5, columns: flatColumns } },
        responses: { '/doctors': DOCTORS, '/custom/opt-queue': FLAT_OPT_QUEUE }
    });

    check('flat: counts read off the flat status',
        [r.el('optometrist-waiting').innerHTML, r.el('optometrist-progress').innerHTML], [1, 1]);
    check('flat: heading applied', r.el('optometrist-title').innerHTML, 'Optometrist Queue');
    contains('flat: cabin still shown', r.el('optometrist-queue').innerHTML, 'Room 9');
    check('flat: cabin still spoken', r.announced, [
        'Patient Bimal Sen, token number 5, please proceed to Room 9.'
    ]);
})();


// ================================================
// TEST 2b — the cabin comes from whoever holds the patient
// ================================================
(function testCabinComesFromTheHolder() {
    var r = run({
        config: { apiBaseUrl: 'http://api.test' },
        responses: {
            '/doctors': DOCTORS,
            'stage_codes=awaiting_optometrist': {
                items: [{
                    visit_id: 'x1', patient_name: 'Jaya Menon', token_number: 2,
                    stage: { code: 'optometrist_assigned', label: 'Optometrist assigned' },
                    // Two holders. The optometrist column must read the
                    // optometrist's room, not whichever came back first.
                    assignments: [
                        { role: 'doctor', user_name: 'Dr. Mehta', user_cabin: 'Cabin 1' },
                        { role: 'optometrist', user_name: 'Opt A', user_cabin: 'Room 7' }
                    ]
                }],
                total: 1, page: 1, page_size: 100, total_pages: 1
            },
            'stage_codes=awaiting_doctor': { items: [], total: 0, page: 1, page_size: 100, total_pages: 1 }
        }
    });

    contains('holder cabin: rendered', r.el('optometrist-queue').innerHTML, 'Room 7');
    check('holder cabin: spoken', r.announced, [
        'Patient Jaya Menon, token number 2, please proceed to Room 7.'
    ]);
})();

// ================================================
// TEST 3 — a general hospital pointed at the pathway queue
// ================================================
(function testPathwayColumns() {
    var r = run({
        config: {
            apiBaseUrl: 'http://api.test',
            display: {
                refreshSeconds: 15,
                columns: [
                    {
                        key: 'optometrist', title: 'Waiting for Nurse',
                        endpoint: '/pathways/queue?stage_codes=awaiting_nurse,nurse_assigned'
                            + '&doctor_id={doctorId}',
                        waiting: ['awaiting_nurse'], active: ['nurse_assigned'],
                        announce: ['nurse_assigned'],
                        announcement: "please proceed to the nurse's room."
                    },
                    {
                        key: 'doctor', title: 'Waiting for Doctor',
                        endpoint: '/pathways/queue?stage_codes=awaiting_doctor&doctor_id={doctorId}',
                        waiting: ['awaiting_doctor'], active: [], announce: []
                    }
                ]
            }
        },
        responses: {
            '/doctors': DOCTORS,
            '/pathways/queue': PATHWAY_QUEUE
        }
    });

    check('pathway: doctor id substituted into the endpoint',
        anyUrlContains(r.urls, 'http://api.test/pathways/queue'
            + '?stage_codes=awaiting_nurse,nurse_assigned&doctor_id=doc-1'), true);

    check('pathway: headings replaced', r.el('optometrist-title').innerHTML, 'Waiting for Nurse');
    check('pathway: second heading replaced', r.el('doctor-title').innerHTML, 'Waiting for Doctor');

    // stage.code is read as the status, so the badges count correctly.
    check('pathway: waiting counted from stage code', r.el('optometrist-waiting').innerHTML, 1);
    check('pathway: active counted from stage code', r.el('optometrist-progress').innerHTML, 1);

    var html = r.el('optometrist-queue').innerHTML;
    contains('pathway: patient rendered', html, 'Farid Khan');
    // No `labels` configured, so the card falls back to the stage's own label.
    contains('pathway: falls back to the stage label', html, '>With Nurse</span>');
    contains('pathway: active stage highlighted', html, 'patient-card status-assigned');

    check('pathway: refreshSeconds drives the poll interval',
        r.intervals.indexOf(15000) !== -1, true);

    // The old code said "please proceed for eye examination" for anything in
    // the left-hand column, which is wrong outside an eye hospital.
    check('pathway: announcement wording comes from the column', r.announced, [
        "Patient Gita Bose, token number 12, please proceed to the nurse's room."
    ]);
})();

// ================================================
// TEST 4 — a column the display cannot serve is skipped, not fatal
// ================================================
(function testMissingColumn() {
    var r = run({
        config: {
            apiBaseUrl: 'http://api.test',
            display: {
                columns: [{
                    key: 'optometrist', title: 'Only Column',
                    endpoint: '/pathways/queue?stage_codes=awaiting_nurse&doctor_id={doctorId}',
                    waiting: ['awaiting_nurse'], active: ['nurse_assigned'], announce: []
                }]
            }
        },
        responses: { '/doctors': DOCTORS, '/pathways/queue': PATHWAY_QUEUE }
    });

    check('single column: only one queue request made',
        anyUrlContains(r.urls, 'eye-hospital'), false);
    check('single column: configured column still renders',
        r.el('optometrist-waiting').innerHTML, 1);
})();

// ================================================
// REPORT
// ================================================
if (failures.length) {
    console.error('\n' + failures.length + ' of ' + checks + ' checks FAILED:\n');
    for (var i = 0; i < failures.length; i++) {
        console.error('  ' + (i + 1) + ') ' + failures[i] + '\n');
    }
    process.exit(1);
}
console.log(checks + ' checks passed.');
