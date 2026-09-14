# Docker Hub CI/CD & Oracle Cloud Deployment Guide

This guide explains how to configure GitHub Actions to build and push Docker images for **Hospital UI** (and **TV Legacy Display**) to **Docker Hub**, and automatically deploy them to your Oracle Cloud VM.

---

## 1. Prerequisites & Why Docker Hub?

Oracle Cloud Infrastructure Registry (OCIR) enforces tenancy policies and storage limits that can block free-tier accounts from pushing or pulling images. By switching to Docker Hub:
- You avoid OCIR free-tier policy and quota restrictions.
- GitHub Actions builds multi-platform images (`linux/amd64` and `linux/arm64`) with GitHub Actions cache.
- The Oracle Cloud VM pulls directly from Docker Hub.

---

## 2. Generate a Docker Hub Personal Access Token (PAT)

1. Log in to [Docker Hub](https://hub.docker.com/).
2. Click your username in the top right corner and select **Account Settings**.
3. In the left navigation menu, click **Security**.
4. Click **New Access Token**.
5. Give your token a description (e.g. `github-actions-hospital-ui`).
6. Set permissions to **Read & Write**.
7. Click **Generate** and copy your Personal Access Token immediately (you won't be able to see it again).

---

## 3. Configure GitHub Repository Secrets

In your GitHub repository (`https://github.com/HunnyChawla/hospital-ui`):
1. Go to **Settings** > **Secrets and variables** > **Actions**.
2. Under **Repository secrets**, click **New repository secret** and add:

| Secret Name | Value | Description |
|---|---|---|
| `DOCKERHUB_USERNAME` | `technesian` (or your Docker Hub username) | Your Docker Hub account or organization username |
| `DOCKERHUB_TOKEN` | `dckr_pat_...` | The Docker Hub Personal Access Token created in step 2 |
| `OCI_HOST` | `<Oracle-VM-Public-IP>` | Public IP address of your Oracle Cloud VM |
| `OCI_SSH_PRIVATE_KEY` | `-----BEGIN OPENSSH PRIVATE KEY----- ...` | Private SSH key used to connect to the Oracle VM |
| `OCI_USER` *(Optional)* | `ubuntu` | SSH user for the Oracle VM (defaults to `ubuntu`) |

*(Note: Secrets named `DOCKER_HUB_USERNAME` and `DOCKER_HUB_TOKEN` are also supported as automatic fallbacks).*

### Variables You No Longer Need
You can safely remove the following OCIR-specific secrets if they were previously configured:
- `OCI_OCIR_USERNAME`
- `OCI_AUTH_TOKEN`
- `OCI_REGION_KEY`
- `OCI_TENANCY_NAMESPACE`

---

## 4. Optional Repository Variables

Under **Settings** > **Secrets and variables** > **Actions** > **Variables**, you may optionally define:

| Variable Name | Default Value | Description |
|---|---|---|
| `DOCKERHUB_UI_REPOSITORY` | `hospital-ui` | The Docker Hub repository name for Hospital UI |
| `DOCKERHUB_TV_REPOSITORY` | `tv-legacy-display` | The Docker Hub repository name for TV Legacy |
| `NEXT_PUBLIC_API_BASE_URL` | `/api` | Base API URL injected into the Next.js app |
| `NEXT_PUBLIC_DOMAIN_URL` | *(empty)* | Domain URL for the frontend |

---

## 5. How the CI/CD Pipeline Works

Workflow file: [deploy-pre-develop.yml](file:///Users/hunnychawla/Documents/HMS/hospital-ui/.github/workflows/deploy-pre-develop.yml)

### A. Build and Push (`build-and-push` job)
1. Checks out the repository code.
2. Validates that Docker Hub credentials are present.
3. Sets up QEMU and Docker Buildx.
4. Logs into Docker Hub using `docker/login-action@v3`.
5. Builds multi-architecture images (`linux/amd64`, `linux/arm64`) for:
   - `${DOCKERHUB_USERNAME}/hospital-ui:${{ github.sha }}`
   - `${DOCKERHUB_USERNAME}/hospital-ui:pre-develop`
   - `${DOCKERHUB_USERNAME}/hospital-ui:latest`
   - `${DOCKERHUB_USERNAME}/tv-legacy-display:${{ github.sha }}`
   - `${DOCKERHUB_USERNAME}/tv-legacy-display:pre-develop`
   - `${DOCKERHUB_USERNAME}/tv-legacy-display:latest`
6. Pushes all tags to Docker Hub.

### B. Deployment to Oracle Cloud VM (`deploy` job)
1. Connects to your Oracle Cloud VM over SSH using `appleboy/ssh-action@v1.0.3`.
2. Authenticates Docker with Docker Hub on the VM (if credentials provided).
3. Ensures Docker network `hms-network` exists.
4. Pulls the exact commit image (`${DOCKERHUB_USERNAME}/hospital-ui:${{ github.sha }}`).
5. Gracefully stops and replaces the `hospital-ui` and `tv-legacy` containers.
6. Connects the containers to the Caddy reverse proxy network.
7. Triggers Caddy configuration reload (`caddy reload`).
8. Verifies container health via HTTP loop on `http://localhost/`.
9. Prunes dangling images to conserve VM disk space.

---

## 6. Triggering the Deployment

- **Automatic**: Push any commit to the `pre-develop` branch:
  ```bash
  git add .
  git commit -m "update frontend"
  git push origin pre-develop
  ```
- **Manual**: Go to **GitHub Actions** > **Build, Push to Docker Hub, and Deploy to Oracle Cloud (pre-develop)** > Click **Run workflow**.

---

## 7. Verifying Deployment on the Oracle VM

To verify the containers manually on your Oracle VM:

```bash
# Check running containers
sudo docker ps --filter "name=hospital-ui"

# View logs of the frontend
sudo docker logs hospital-ui --tail=50 -f

# Verify Caddy connectivity
curl -I http://localhost/
```
