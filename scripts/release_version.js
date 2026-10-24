#!/usr/bin/env node
/**
 * Automated Version Bump, Git Tag, and SHA-256 Audit Hash Generator
 * for Hospital UI (Cross-platform JavaScript / Node.js).
 *
 * Usage:
 *     node scripts/release_version.js <patch | minor | major | X.Y.Z>
 *
 * Examples:
 *     node scripts/release_version.js patch      # 2.0.0 -> 2.0.1
 *     node scripts/release_version.js minor      # 2.0.0 -> 2.1.0
 *     node scripts/release_version.js major      # 2.0.0 -> 3.0.0
 *     node scripts/release_version.js 2.5.0      # Explicit version
 *
 * IMPORTANT:
 *     Run this script from your DEPLOYMENT branch only (e.g. main / master / pre-develop),
 *     then push the commit and tag directly to that branch.
 */

const { execSync, spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function runGit(cmd, cwd) {
  try {
    return execSync(cmd, { cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (err) {
    const errorMsg = (err.stderr || err.stdout || err.message || '').toString().trim();
    console.error(`[ERROR] Command failed (${cmd}): ${errorMsg}`);
    process.exit(1);
  }
}

function bumpSemver(current, bumpType) {
  const match = current.match(/^(\d+)\.(\d+)\.(\d+)(.*)$/);
  if (!match) {
    console.error(`[ERROR] Current version '${current}' is not valid SemVer (MAJOR.MINOR.PATCH)`);
    process.exit(1);
  }

  let major = parseInt(match[1], 10);
  let minor = parseInt(match[2], 10);
  let patch = parseInt(match[3], 10);

  if (bumpType === 'major') {
    return `${major + 1}.0.0`;
  } else if (bumpType === 'minor') {
    return `${major}.${minor + 1}.0`;
  } else if (bumpType === 'patch') {
    return `${major}.${minor}.${patch + 1}`;
  } else {
    if (!/^\d+\.\d+\.\d+/.test(bumpType)) {
      console.error(`[ERROR] Invalid bump type or version '${bumpType}'. Must be 'patch', 'minor', 'major', or 'X.Y.Z'.`);
      process.exit(1);
    }
    return bumpType;
  }
}

async function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const versionFile = path.join(repoRoot, 'VERSION');

  const args = process.argv.slice(2);
  if (args.length === 0) {
    const current = fs.existsSync(versionFile) ? fs.readFileSync(versionFile, 'utf-8').trim() : 'unknown';
    console.log('='.repeat(65));
    console.log(' HOSPITAL UI - VERSION BUMP & AUDIT GENERATOR');
    console.log('='.repeat(65));
    console.log(` Current Version : ${current}`);
    console.log('\n Usage:');
    console.log('   node scripts/release_version.js <patch | minor | major | X.Y.Z>');
    console.log('\n Examples:');
    console.log('   node scripts/release_version.js patch    # Bumps patch (e.g. 2.0.0 -> 2.0.1)');
    console.log('   node scripts/release_version.js minor    # Bumps minor (e.g. 2.0.0 -> 2.1.0)');
    console.log('   node scripts/release_version.js major    # Bumps major (e.g. 2.0.0 -> 3.0.0)');
    console.log('   node scripts/release_version.js 2.5.0    # Set explicit version');
    console.log('='.repeat(65));
    process.exit(1);
  }

  const bumpArg = args[0].toLowerCase().trim();

  // 1. Check Git Branch
  let branch = '';
  try {
    branch = execSync('git branch --show-current', { cwd: repoRoot, encoding: 'utf-8' }).trim();
  } catch {
    branch = 'DETACHED_HEAD';
  }

  console.log('='.repeat(65));
  console.log(' HOSPITAL UI - RELEASE & AUDIT HASH AUTOMATION');
  console.log('='.repeat(65));
  console.log(`[*] Current Git Branch: ${branch}`);
  console.log('    -> Ensure you are running this from your DEPLOYMENT branch!');

  // 2. Read Current Version & Compute Next
  const currentVersion = fs.existsSync(versionFile) ? fs.readFileSync(versionFile, 'utf-8').trim() : '0.0.0';
  const newVersion = bumpSemver(currentVersion, bumpArg);
  console.log(`[*] Version Bump: ${currentVersion} -> ${newVersion}`);

  // 3. Check if Tag Already Exists
  try {
    const checkTag = execSync(`git tag -l ${newVersion}`, { cwd: repoRoot, encoding: 'utf-8' }).trim();
    if (checkTag === newVersion) {
      console.error(`[ERROR] Git tag '${newVersion}' already exists! Choose a higher version or delete the old tag.`);
      process.exit(1);
    }
  } catch {
    // Continue
  }

  // 4. Ensure .gitattributes exists with export-ignore for version files
  const gitattributesFile = path.join(repoRoot, '.gitattributes');
  const exportRule = 'public/version.json export-ignore\npublic/version export-ignore';
  if (!fs.existsSync(gitattributesFile) || !fs.readFileSync(gitattributesFile, 'utf-8').includes('public/version.json export-ignore')) {
    fs.appendFileSync(gitattributesFile, `\n${exportRule}\n`, 'utf-8');
  }

  // 5. Update VERSION file
  fs.writeFileSync(versionFile, `${newVersion}\n`, 'utf-8');
  console.log(`[*] Updated VERSION file to ${newVersion}`);

  // 6. Commit initial bump
  console.log(`[*] Committing version bump to branch '${branch}'...`);
  runGit('git add VERSION .gitattributes', repoRoot);
  runGit(`git commit -m "chore(release): bump version to ${newVersion}"`, repoRoot);

  const initialCommitSha = runGit('git rev-parse HEAD', repoRoot);

  // 7. Calculate Deterministic SHA-256 for Tag
  console.log(`[*] Calculating deterministic SHA-256 archive hash for version '${newVersion}'...`);
  const git = spawn('git', ['archive', '--format=tar', 'HEAD'], { cwd: repoRoot });
  const hash = crypto.createHash('sha256');

  git.stdout.on('data', chunk => hash.update(chunk));

  let stderr = '';
  git.stderr.on('data', chunk => {
    stderr += chunk.toString();
  });

  git.on('close', code => {
    if (code !== 0) {
      console.error(`[ERROR] git archive failed with exit code ${code}: ${stderr}`);
      process.exit(1);
    }

    const sha256 = hash.digest('hex').toUpperCase();
    const buildTimestamp = new Date().toISOString();

    const auditPayload = {
      service: 'hospital-ui',
      version: newVersion,
      git_commit: initialCommitSha,
      git_branch: branch,
      git_ref: newVersion,
      build_timestamp: buildTimestamp,
      source_sha256: sha256,
      hash_algorithm: 'SHA-256',
      verification_command: `git archive --format=tar ${newVersion} | sha256sum`,
      verification_powershell: `git archive --format=tar ${newVersion} -o temp.tar; (Get-FileHash temp.tar -Algorithm SHA256).Hash; Remove-Item temp.tar`,
    };

    const outDir = path.join(repoRoot, 'public');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const jsonStr = JSON.stringify(auditPayload, null, 2);
    fs.writeFileSync(path.join(outDir, 'version.json'), jsonStr, 'utf-8');
    fs.writeFileSync(path.join(outDir, 'version'), jsonStr, 'utf-8');
    console.log('[*] Generated public/version.json and public/version');

    // 8. Amend release commit to include public/version.json and public/version
    console.log('[*] Committing version files into release commit...');
    runGit('git add public/version.json public/version', repoRoot);
    runGit('git commit --amend --no-edit', repoRoot);

    const finalCommitSha = runGit('git rev-parse HEAD', repoRoot);

    // 9. Tag the amended commit
    console.log(`[*] Creating Git tag: ${newVersion} on commit ${finalCommitSha.substring(0, 8)}...`);
    runGit(`git tag ${newVersion}`, repoRoot);

    console.log('\n' + '='.repeat(65));
    console.log(' RELEASE & AUDIT HASH CREATED AND COMMITTED SUCCESSFULLY!');
    console.log('='.repeat(65));
    console.log(` Service                : ${auditPayload.service}`);
    console.log(` New Version            : ${auditPayload.version}`);
    console.log(` Git Commit             : ${finalCommitSha}`);
    console.log(` Git Tag                : ${newVersion}`);
    console.log(` Source SHA-256         : ${auditPayload.source_sha256}`);
    console.log(` Committed Files        : VERSION, public/version.json, public/version, .gitattributes`);
    console.log('-'.repeat(65));
    console.log(' NEXT STEP: Push commit & tag to your deployment branch:');
    if (branch && branch !== 'DETACHED_HEAD') {
      console.log(`   git push origin ${branch} --tags`);
    } else {
      console.log('   git push origin <your-deployment-branch> --tags');
    }
    console.log('='.repeat(65) + '\n');
  });
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
