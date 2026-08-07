# TV Legacy Display

A lightweight Node.js application for displaying patient queues on TV screens in hospitals. Built with vanilla HTML, CSS, and JavaScript to ensure compatibility with older browsers and legacy TV systems.

## Features

- **Legacy Browser Support**: Uses vanilla HTML/CSS/JS without modern dependencies
- **Simple HTTP Server**: Lightweight Node.js server serving static files
- **TV-Optimized UI**: Designed for display on television screens
- **Patient Queue Display**: Shows real-time patient queue information
- **Login System**: Secure authentication for TV displays
- **Audio Notifications**: Sound alerts for queue updates

## Quick Start

### Running Locally

```bash
# Install dependencies (if any)
npm install

# Start the server
npm start

# Or use node directly
node server.js
```

The server will start on port 5500 by default. Access the application at:
- Login page: `http://localhost:5500/`
- Display page: `http://localhost:5500/display.html`

### Environment Variables

- `PORT` - Server port (default: 5500)
- `API_BASE_URL` - Backend API URL (default: http://localhost:8080)
- `TTS_API_URL` - Text-to-speech service URL (announcements are silent if unset)
- `TV_REFRESH_SECONDS` - Queue poll interval (default: 5)
- `TV_COLUMNS` - Which two queues to show, as JSON (see below)

## Configuring the queues

The two panels used to be hard-wired to the eye-hospital optometrist and doctor
queues — not just their URLs, but the status strings behind every card label,
badge count and spoken announcement. A general hospital has no optometrist
stage, so both panels came back empty.

They are now described by `TV_COLUMNS`. **The defaults reproduce the previous
behaviour exactly**, so an eye hospital sets nothing and an already-installed
screen keeps making byte-identical requests. That matters here: these screens
hang on walls, often unattended, and cannot be force-refreshed on demand.

Any other speciality points the columns at the pathway queue instead and names
that pathway's own stages:

```bash
TV_COLUMNS='[
  {"key":"optometrist","title":"Waiting for Nurse",
   "endpoint":"/pathways/queue?stage_codes=awaiting_nurse,nurse_assigned&doctor_id={doctorId}",
   "waiting":["awaiting_nurse"],"active":["nurse_assigned"],
   "announce":["nurse_assigned"],
   "announcement":"please proceed to the nurse'"'"'s room."},
  {"key":"doctor","title":"Waiting for Doctor",
   "endpoint":"/pathways/queue?stage_codes=awaiting_doctor,doctor_assigned,consultation_in_progress&doctor_id={doctorId}&include_covering_doctors=true",
   "waiting":["awaiting_doctor"],
   "active":["doctor_assigned","consultation_in_progress"],
   "inProgress":["consultation_in_progress"],
   "announce":["doctor_assigned"],
   "announcement":"your consultation is ready."}
]'
```

| Field | Meaning |
|---|---|
| `key` | Which panel renders it: `optometrist` (left) or `doctor` (right). These are **positions**, not specialities. |
| `endpoint` | Path appended to `API_BASE_URL`; `{doctorId}` is substituted with the selected doctor. |
| `title` | Heading above the panel. |
| `waiting` | Statuses counted in the "Waiting" badge. |
| `active` | Statuses counted in "In Progress" and drawn highlighted. |
| `inProgress` | Subset of `active` drawn with the in-progress style. |
| `announce` | Statuses that trigger the chime and the spoken call-out. |
| `labels` | Status → card text. Omit it against `/pathways/queue`, which returns each stage's own label. |
| `cabinField` | Field on the queue item holding the room/cabin name. |
| `announcement` | How the spoken sentence ends when the patient has no cabin to be sent to. |

Invalid JSON is logged and ignored rather than applied — a bad value must never
blank a waiting-room screen.

### Tests

```bash
npm test
```

`test/display.test.js` loads the real `public/app.js` under a stub DOM and
drives it end to end. It pins the eye-hospital defaults (URLs, counts, card
wording, announcements, poll interval) and checks a pathway-configured screen
renders from `stage.code` / `stage.label`. No dependencies, no build step.

## Docker

### Building the Docker Image

```bash
# Build for local use (single platform)
./docker-build.sh build

# Build and push to Docker Hub
./docker-build.sh build-push --username=<your-dockerhub-username>

# Build for multiple platforms
./docker-build.sh build --platform=linux/amd64,linux/arm64
```

### Using the Pre-built Image

```bash
# Pull the image
docker pull <username>/tv-legacy-display:latest

# Run the container
docker run -d -p 5500:5500 --name tv-display <username>/tv-legacy-display:latest

# Access the application
# Open browser to http://localhost:5500
```

### Docker Run Options

```bash
# Run with custom port mapping
docker run -d -p 8080:5500 --name tv-display <username>/tv-legacy-display:latest

# Run with environment variables
docker run -d -p 5500:5500 -e PORT=5500 -e API_BASE_URL=http://your-backend:8080 --name tv-display <username>/tv-legacy-display:latest

# Run with restart policy
docker run -d -p 5500:5500 --restart=unless-stopped --name tv-display <username>/tv-legacy-display:latest
```

### Docker Compose

Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  tv-display:
    image: <username>/tv-legacy-display:latest
    ports:
      - "5500:5500"
    environment:
      - PORT=5500
      - API_BASE_URL=http://your-backend:8080  # Configure your backend URL here
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:5500/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 5s
```

Run with:
```bash
docker-compose up -d
```

## Development

### Project Structure

```
tv-legacy/
├── server.js           # Node.js HTTP server (serves /config, incl. TV_COLUMNS)
├── api/config.js       # Same /config endpoint for Vercel deployments
├── public/
│   ├── index.html      # Login page
│   ├── display.html    # Patient queue display page
│   ├── app.js          # Client-side JavaScript
│   ├── styles.css      # Application styles
│   └── assets/         # Static assets (images, sounds)
├── test/display.test.js # Queue rendering tests (`npm test`)
├── package.json        # Project metadata
├── Dockerfile          # Docker image definition
├── .dockerignore       # Docker build exclusions
├── docker-build.sh     # Docker build script
├── push-to-dockerhub.sh # Docker push script
└── README.md           # This file
```

### Building for Production

The Docker image uses a multi-stage build process optimized for production:

1. **Base**: Node.js 20 Alpine Linux (minimal footprint)
2. **Security**: Runs as non-root user
3. **Health Checks**: Automated container health monitoring
4. **Multi-Platform**: Supports AMD64 and ARM64 architectures

## Docker Build Scripts

### docker-build.sh

Comprehensive build script with multiple commands:

```bash
# Available commands
./docker-build.sh build        # Build locally
./docker-build.sh push         # Push to registry
./docker-build.sh build-push   # Build and push
./docker-build.sh tag          # Tag image
./docker-build.sh clean        # Clean up

# Options
--username=USER     # Docker Hub username
--tag=TAG          # Image tag
--platform=PLAT    # Target platforms
--cache=MODE       # Cache mode (registry/local/none)
--ci               # CI mode (no prompts)
--no-cache         # Disable caching
--dry-run          # Show commands without executing
```

### push-to-dockerhub.sh

Simplified push script:

```bash
# Quick push
./push-to-dockerhub.sh

# With custom parameters
./push-to-dockerhub.sh <username> <image-name> <tag>

# Multi-platform build
./push-to-dockerhub.sh --multi-platform
./push-to-dockerhub.sh --platform=linux/amd64,linux/arm64
```

### Environment Variables for Build

```bash
export DOCKERHUB_USERNAME=myuser
export DOCKERHUB_IMAGE=tv-legacy-display
export DOCKERHUB_TAG=v1.0.0
export DOCKER_PLATFORMS=linux/amd64,linux/arm64
export CACHE_MODE=registry

./docker-build.sh build-push
```

## Troubleshooting

### Container Won't Start

Check the logs:
```bash
docker logs tv-display
```

Verify the container is running:
```bash
docker ps -a
```

### Health Check Failing

Inspect the health status:
```bash
docker inspect --format='{{json .State.Health}}' tv-display
```

### Port Already in Use

Use a different host port:
```bash
docker run -d -p 8080:5500 --name tv-display <username>/tv-legacy-display:latest
```

### Cannot Access from Other Devices

Ensure Docker is binding to all interfaces (0.0.0.0):
```bash
docker run -d -p 0.0.0.0:5500:5500 --name tv-display <username>/tv-legacy-display:latest
```

## License

ISC

## Version

1.0.0
