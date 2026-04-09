#!/usr/bin/env node

/**
 * check_pilot_updates.mjs
 *
 * Checks for available Weaverse Pilot theme updates by comparing the local
 * package.json version against GitHub releases.
 *
 * Usage:
 *   node skills/theme-update/scripts/check_pilot_updates.mjs
 *   node skills/theme-update/scripts/check_pilot_updates.mjs --target v2026.4.7
 *
 * No external dependencies — Node.js 18+ only.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { https } from "node:https";

// ── Helpers ──────────────────────────────────────────────────────────────

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "User-Agent": "pilot-update-checker" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJSON(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
        catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.setTimeout(15_000, () => { req.destroy(); reject(new Error("Request timed out")); });
  });
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "User-Agent": "pilot-update-checker" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchText(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks).toString()));
    });
    req.on("error", reject);
    req.setTimeout(15_000, () => { req.destroy(); reject(new Error("Request timed out")); });
  });
}

/**
 * Parse a Pilot version string into a comparable tuple.
 * Date-based: "2026.4.7"  → [2026, 4, 7]
 * Semver:     "8.1.0"     → [0, 8, 1, 0]  (epoch 0 = semver era)
 */
function parseVersion(v) {
  const clean = v.replace(/^v/, "");
  const parts = clean.split(".").map(Number);
  // Date-based versions have year >= 2024
  if (parts[0] >= 2024) {
    return { epoch: 1, parts };
  }
  return { epoch: 0, parts };
}

function compareVersions(a, b) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  if (pa.epoch !== pb.epoch) return pa.epoch - pb.epoch;
  for (let i = 0; i < Math.max(pa.parts.length, pb.parts.length); i++) {
    const na = pa.parts[i] ?? 0;
    const nb = pb.parts[i] ?? 0;
    if (na !== nb) return na - nb;
  }
  return 0;
}

function versionTag(v) {
  return v.startsWith("v") ? v : `v${v}`;
}

function truncate(str, maxLen) {
  if (!str) return "";
  const s = str.replace(/\r\n/g, "\n").trim();
  return s.length > maxLen ? s.slice(0, maxLen - 3) + "..." : s;
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  let targetFlag = null;
  for (const arg of args) {
    if (arg.startsWith("--target=")) targetFlag = arg.slice("--target=".length);
    else if (arg === "--target" && args[args.indexOf(arg) + 1]) targetFlag = args[args.indexOf(arg) + 1];
  }

  // 1. Read local package.json
  const pkgPath = join(process.cwd(), "package.json");
  if (!existsSync(pkgPath)) {
    console.error("❌ No package.json found in current directory.");
    console.error("   Run this script from the root of your Pilot project.");
    process.exit(1);
  }

  let pkg;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  } catch {
    console.error("❌ Could not parse package.json.");
    process.exit(1);
  }

  const currentVersion = pkg.version;
  const pkgName = pkg.name;

  if (!currentVersion) {
    console.error("❌ No version field found in package.json.");
    process.exit(1);
  }

  console.log(`📦 Package: ${pkgName || "(unknown)"}`);
  console.log(`📍 Current version: ${currentVersion}`);
  console.log();

  // 2. Fetch releases
  console.log("🔄 Fetching releases from GitHub...");
  let releases;
  try {
    releases = await fetchJSON("https://api.github.com/repos/Weaverse/pilot/releases?per_page=30");
  } catch (e) {
    console.error(`❌ Failed to fetch releases: ${e.message}`);
    if (e.message.includes("403")) {
      console.error("   GitHub API rate limit hit. Try again in an hour or set GITHUB_TOKEN.");
    }
    process.exit(1);
  }

  if (!Array.isArray(releases) || releases.length === 0) {
    console.error("❌ No releases found.");
    process.exit(1);
  }

  // Filter out prereleases
  const stableReleases = releases.filter((r) => !r.prerelease);

  // 3. Determine available updates
  const currentTag = versionTag(currentVersion);
  const applicableReleases = stableReleases.filter(
    (r) => compareVersions(r.tag_name, currentTag) > 0
  );

  // Sort ascending (oldest first)
  applicableReleases.sort((a, b) => compareVersions(a.tag_name, b.tag_name));

  // Determine target
  let target;
  if (targetFlag) {
    const t = versionTag(targetFlag);
    target = stableReleases.find((r) => r.tag_name === t);
    if (!target) {
      console.error(`❌ Target version ${t} not found in releases.`);
      console.log("   Available versions:");
      stableReleases.slice(0, 10).forEach((r) => console.log(`     ${r.tag_name}`));
      process.exit(1);
    }
    // Filter to only releases up to target
    const filtered = applicableReleases.filter((r) => compareVersions(r.tag_name, t) <= 0);
    if (filtered.length === 0) {
      console.log(`✅ Already up to date. Current: ${currentTag}, Target: ${t}`);
      process.exit(0);
    }
    displayUpdates(currentTag, target.tag_name, filtered);
  } else {
    if (applicableReleases.length === 0) {
      console.log(`✅ Already on the latest version: ${currentTag}`);
      process.exit(0);
    }
    target = applicableReleases[applicableReleases.length - 1];
    displayUpdates(currentTag, target.tag_name, applicableReleases);
  }

  // 4. Show diff URL
  console.log();
  console.log("🔗 Diff URL:");
  console.log(`   https://github.com/Weaverse/pilot/compare/${currentTag}...${target.tag_name}`);
  console.log();
  console.log("   Raw diff:");
  console.log(`   https://github.com/Weaverse/pilot/compare/${currentTag}...${target.tag_name}.diff`);
}

function displayUpdates(currentTag, targetTag, releases) {
  console.log(`🎯 Target version: ${targetTag}`);
  console.log();

  if (releases.length === 1 && releases[0].tag_name === targetTag) {
    console.log(`1 release to apply:`);
  } else {
    console.log(`${releases.length} releases to apply (in order):`);
  }

  console.log("─".repeat(60));
  for (const r of releases) {
    const date = new Date(r.published_at).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric"
    });
    console.log();
    console.log(`  ${r.tag_name}  (${date})`);
    if (r.body) {
      const summary = truncate(r.body, 300);
      for (const line of summary.split("\n")) {
        if (line.trim()) console.log(`    ${line}`);
      }
    }
  }
  console.log();
  console.log("─".repeat(60));
}

main().catch((e) => {
  console.error(`❌ Unexpected error: ${e.message}`);
  process.exit(1);
});
