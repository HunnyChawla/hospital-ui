# Code Versioning & SHA-256 Audit Verification Guide (Frontend)

This document explains how software versioning, Git tagging, and cryptographic SHA-256 integrity checksums are managed, generated, and verified for **security audits and compliance** (e.g., ABDM certification, ISO 27001, SOC 2).

---

## 1. Overview & Golden Rule

> [!IMPORTANT]
> **DEPLOYMENT BRANCH RULE**:
> Always switch to your **deployment/release branch** (e.g. `main`, `master`, or `develop`) **BEFORE** running the release script. The script will commit and tag on your active branch, which you will then push directly upstream.

The single cross-platform script:
```
scripts/release_version.js
```
completely automates:
1. Calculating the next **SemVer** (`patch`, `minor`, `major`, or custom version).
2. Updating the `VERSION` file.
3. Creating the Git commit: `chore(release): bump version to <version>`.
4. Creating the Git release tag: `git tag <version>`.
5. Calculating the deterministic **SHA-256** checksum of the source archive for that tag.
6. Generating `public/version.json` and `public/version` for static Nginx serving.

---

## 2. How to Bump Version & Release (Single Command)

From `hospital-ui`, run:

### Bump Patch (`2.0.0` ➔ `2.0.1`)
```bash
node scripts/release_version.js patch
# OR via npm:
npm run release patch
```

### Bump Minor (`2.0.0` ➔ `2.1.0`)
```bash
node scripts/release_version.js minor
# OR via npm:
npm run release minor
```

### Bump Major (`2.0.0` ➔ `3.0.0`)
```bash
node scripts/release_version.js major
# OR via npm:
npm run release major
```

### Explicit Version
```bash
node scripts/release_version.js 2.5.0
```

---

## 3. Post-Release: Push to Deployment Branch

After the script completes, push the new release commit and tag directly to your deployment branch:

```bash
git push origin <deployment-branch> --tags
```
*(Example: `git push origin master --tags`)*

Then build and push your Docker image:
```cmd
docker-build.bat build-push
```

---

## 4. How Production Serves the Audit Metadata

You do **not** need any manual setup in production:

1. **Automatic Build Packaging**:
   When Next.js runs `npm run build`, all files inside `public/` (including `version.json` and `version`) are exported directly into `out/`.
2. **Nginx High-Speed Serving**:
   The Docker container copies `/app/out` to `/usr/share/nginx/html`. Nginx serves static JSON with 0 ms server delay.
3. **Public Endpoints**:
   - `GET /version.json` ➔ Directly served by Nginx.
   - `GET /version` ➔ Directly served by Nginx.
   - `GET /api/version` ➔ Handled by Next.js route handler (`src/app/api/version/route.ts`).

### Example Audit Response:
```json
{
  "service": "hospital-ui",
  "version": "2.0.1",
  "build_timestamp": "2026-10-24T06:55:13.368Z",
  "source_sha256": "F0C0743C8EE534919CBD9F234E8283282C9CD7C8F0844AED5D9E69027D1892F8",
  "hash_algorithm": "SHA-256",
  "verification_command": "git archive --format=tar 2.0.1 | sha256sum",
  "verification_powershell": "git archive --format=tar 2.0.1 -o temp.tar; (Get-FileHash temp.tar -Algorithm SHA256).Hash; Remove-Item temp.tar"
}
```

---

## 5. How Auditors Verify the Hash

Auditors can independently verify that your running production application matches the certified source code repository:

### On Linux / macOS / Git Bash:
```bash
git archive --format=tar 2.1.0 | sha256sum
```

### On Windows PowerShell:
```powershell
git archive --format=tar 2.1.0 -o temp.tar; (Get-FileHash temp.tar -Algorithm SHA256).Hash; Remove-Item temp.tar
```

The resulting hash matches character-for-character with `source_sha256` from your live `/version.json` endpoint.
