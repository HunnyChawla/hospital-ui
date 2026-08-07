// Vercel Serverless Function to serve dynamic API configuration to the TV Legacy client.
export default function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Queue columns. Defaults reproduce the previous hard-coded behaviour
  // exactly, so an un-updated screen keeps working. See server.js for the
  // full field reference and an example of overriding them — keep the two
  // copies in step.
  const DEFAULT_COLUMNS = [
    {
      key: 'optometrist',
      title: 'Optometrist Queue',
      endpoint:
        '/opd/eye-hospital/optometrist-queue/{doctorId}' +
        '?status=awaiting_optometrist,optometrist_assigned',
      waiting: ['awaiting_optometrist'],
      active: ['optometrist_assigned'],
      inProgress: [],
      announce: ['optometrist_assigned'],
      labels: { optometrist_assigned: 'Called' },
      cabinField: 'optometrist_cabin',
      announcement: 'please proceed for eye examination.'
    },
    {
      key: 'doctor',
      title: 'Doctor Queue',
      endpoint:
        '/opd/eye-hospital/group-queue/{doctorId}' +
        '?status=awaiting_doctor,doctor_assigned,consultation_in_progress',
      waiting: ['awaiting_doctor'],
      active: ['doctor_assigned', 'consultation_in_progress'],
      inProgress: ['consultation_in_progress'],
      announce: ['doctor_assigned'],
      labels: {
        doctor_assigned: 'Called',
        consultation_in_progress: 'In Consultation'
      },
      cabinField: 'doctor_cabin',
      announcement: 'your consultation is ready.'
    }
  ];

  let columns = DEFAULT_COLUMNS;
  if (process.env.TV_COLUMNS) {
    try {
      const parsed = JSON.parse(process.env.TV_COLUMNS);
      if (Array.isArray(parsed) && parsed.length) columns = parsed;
    } catch (e) {
      // Never let bad configuration blank a waiting-room screen.
      console.error('TV_COLUMNS is not valid JSON; using defaults:', e.message);
    }
  }

  res.status(200).json({
    apiBaseUrl: process.env.API_BASE_URL || 'https://13.60.213.156.sslip.io',
    ttsApiUrl: process.env.TTS_API_URL || '',
    display: {
      // 5 seconds is what public/app.js polled at before this was configurable.
      refreshSeconds: parseInt(process.env.TV_REFRESH_SECONDS || '5', 10),
      columns: columns
    }
  });
}

