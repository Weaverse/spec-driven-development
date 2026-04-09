#!/usr/bin/env node
// Check available Weaverse Pilot theme updates
// Usage: node check_pilot_updates.mjs [--target vX.X.X]
import { readFileSync } from "fs";
import { resolve } from "path";

const args = process.argv.slice(2);
let targetTag = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--target" || args[i] === "-t") targetTag = args[++i];
  else if (args[i] === "--help" || args[i] === "-h") {
    console.log(`Usage: node check_pilot_updates.mjs [--target vX.X.X]
Options:
  --target, -t   Target version to update to (default: latest)
  --help, -h     Show this help`);
    process.exit(0);
  }
}

// Read local package.json
let localVersion;
try {
  const pkg = JSON.parse(readFileSync(resolve("package.json"), "utf-8"));
  localVersion = pkg.version;
  if (!localVersion) {
    console.error("Error: No version field in package.json");
    process.exit(1);
  }
} catch {
  console.error("Error: Cannot read package.json in current directory");
  console.error("Run this script from the root of your Pilot theme project.");
  process.exit(1);
}

console.log(`Current version: ${localVersion}`);

// Fetch releases from GitHub
const response = await fetch(
  "https://api.github.com/repos/Weaverse/pilot/releases?per_page=50",
  { headers: { Accept: "application/vnd.github+json" } }
);

if (!response.ok) {
  console.error(`GitHub API error: ${response.status}`);
  process.exit(1);
}

const releases = await response.json();

// Normalize version: strip leading "v" for comparison
const normalize = (v) => v.replace(/^v/, "");
const localNorm = normalize(localVersion);

// Find current release index
const currentIdx = releases.findIndex(
  (r) => normalize(r.tag_name) === localNorm
);

if (currentIdx === -1) {
  console.log(
    `\n⚠️  Version ${localVersion} not found in releases. Showing recent releases:\n`
  );
  for (const r of releases.slice(0, 10)) {
    console.log(`  ${r.tag_name}  (${r.published_at?.slice(0, 10)})`);
  }
  process.exit(0);
}

if (currentIdx === 0) {
  console.log("\n✅ Already on the latest version!");
  process.exit(0);
}

// Determine target
let targetIdx = 0;
if (targetTag) {
  targetIdx = releases.findIndex(
    (r) => normalize(r.tag_name) === normalize(targetTag)
  );
  if (targetIdx === -1) {
    console.error(`Target version ${targetTag} not found in releases`);
    process.exit(1);
  }
}

const pending = releases.slice(targetIdx, currentIdx);

console.log(`Latest version:  ${releases[0].tag_name}`);
if (targetTag) console.log(`Target version:  ${targetTag}`);
console.log(`\n📦 ${pending.length} update(s) available:\n`);

for (const r of pending) {
  console.log(`━━━ ${r.tag_name} (${r.published_at?.slice(0, 10)}) ━━━`);
  if (r.body) {
    const lines = r.body.split("\n").slice(0, 15);
    console.log(lines.join("\n"));
    if (r.body.split("\n").length > 15) console.log("  ...(truncated)");
  }
  console.log();
}

console.log(
  `🔗 Compare: https://github.com/Weaverse/pilot/compare/v${localNorm}...${releases[targetIdx].tag_name}`
);
