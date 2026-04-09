# Shopify Hydrogen Skills

Agent skills for building, maintaining, and upgrading Shopify Hydrogen storefronts with Weaverse. Works with Claude Code, Cursor, GitHub Copilot, Windsurf, OpenCode, OpenClaw, Gemini CLI, and any agent that supports markdown skill files.

## Quick Install

```bash
npx skills add Weaverse/shopify-hydrogen-skills
```

This auto-detects which coding agents you have installed (Claude Code, Cursor, OpenCode, OpenClaw, Codex, Windsurf, Gemini CLI, GitHub Copilot, and 40+ more) and installs the skills to all of them. Powered by [skills.sh](https://skills.sh).

> The repo will also appear on the [skills.sh leaderboard](https://skills.sh) automatically — no manual submission needed.

### Manual Install

If you prefer per-agent setup, read [INSTALL.md](INSTALL.md) for step-by-step instructions for each supported agent.

## Live Docs Strategy

Instead of baking static API docs into skill files, this repo ships **live doc fetching scripts** that query official sources at runtime:

| Script | Source | What it does |
|--------|--------|--------------|
| `scripts/search_shopify_docs.mjs` | `shopify.dev` | Search Hydrogen API docs (same backend Shopify's AI Toolkit uses) |
| `scripts/search_weaverse_docs.mjs` | `docs.weaverse.io` | Search Weaverse documentation |
| `scripts/get_weaverse_page.mjs` | `docs.weaverse.io` | Fetch a full doc page by path |

```bash
# Search Shopify Hydrogen docs
node scripts/search_shopify_docs.mjs "createHydrogenContext"
node scripts/search_shopify_docs.mjs "CartForm actions"

# Search Weaverse docs
node scripts/search_weaverse_docs.mjs "component schema"
node scripts/search_weaverse_docs.mjs "data fetching"

# Fetch a specific Weaverse page
node scripts/get_weaverse_page.mjs "development-guide/component-schema"
```

The `references/` folders remain as offline fallback — they're cached snapshots that may not reflect the latest API changes.

## Skills Overview

| Skill | What the agent learns |
|-------|-----------------------|
| [`skills/shopify-hydrogen/`](#shopify-hydrogen) | Core Hydrogen APIs — `createHydrogenContext`, cart handler, caching, pagination, SEO, analytics, CSP |
| [`skills/hydrogen-cookbooks/`](#hydrogen-cookbooks) | Step-by-step guides for bundles, combined listings, 3D models, customer accounts, performance, and more |
| [`skills/hydrogen-upgrades/`](#hydrogen-upgrades) | Breaking changes and migration steps for every Hydrogen version from 2024.4.7 to 2026.1.0 |
| [`skills/weaverse-hydrogen/`](#weaverse-hydrogen) | Weaverse components, schemas, loaders, theming, Hydrogen fundamentals, deployment |
| [`skills/theme-update/`](#theme-update) | Pilot theme update — detect version, plan changes, preserve customizations, verify build |
| [`skills/theme-update/`](#theme-update) | Safely update Pilot theme — detect version, plan changes, preserve customizations, verify build |

---

## shopify-hydrogen

Core APIs from `@shopify/hydrogen` — live docs via `scripts/search_shopify_docs.mjs` plus offline references for setup, caching, and cart patterns.

```
skills/shopify-hydrogen/
├── SKILL.md
└── references/
    ├── 01-setup.md
    ├── 02-caching.md
    └── 03-cart.md
```

---

## hydrogen-cookbooks

Self-contained feature recipes with live doc search fallback. Each cookbook covers prerequisites, step-by-step implementation, and troubleshooting.

```
skills/hydrogen-cookbooks/
├── SKILL.md
└── references/
    ├── bundles.md
    ├── combined-listings.md
    ├── customer-account-api.md
    ├── hydrogen-react-router.md
    ├── model-viewer.md
    ├── performance-best-practices.md
    ├── variant-media-grouping.md
    └── weaverse-hydrogen-integration.md
```

---

## hydrogen-upgrades

Version-by-version migration guides with live doc search for the latest breaking changes.

```
skills/hydrogen-upgrades/
├── SKILL.md
└── references/
    ├── upgrade-2024.4.7-to-2024.7.1.md
    ├── upgrade-2024.10.1-to-2025.1.0.md
    ├── upgrade-2025.1.0-to-2025.1.1.md
    ├── upgrade-2025.1.2-to-2025.1.3.md
    ├── upgrade-2025.1.3-to-2025.1.4.md
    ├── upgrade-2025.5.0-to-2025.7.0.md
    └── upgrade-2025.7.0-to-2026.1.0.md
```

## weaverse-hydrogen

Everything needed to build a Shopify Hydrogen storefront with Weaverse — with live docs via `scripts/search_weaverse_docs.mjs` and `scripts/get_weaverse_page.mjs`.

```
skills/weaverse-hydrogen/
├── SKILL.md
├── references/
│   ├── 01-project-structure.md
│   ├── 02-creating-components.md
│   ├── 03-component-schema.md
│   ├── 04-input-settings.md
│   ├── 05-data-fetching.md
│   ├── 06-styling-theming.md
│   ├── 07-react-router-7.md
│   ├── 08-hydrogen-fundamentals.md
│   ├── 09-deployment.md
│   ├── 10-weaverse-api.md
│   ├── 11-advanced-features.md
│   ├── 12-pilot-theme.md
│   └── 13-migration-v5.md
└── examples/
    ├── hero-banner.tsx
    ├── featured-collection.tsx
    ├── product-card.tsx
    └── components-registry.ts
```

---

## theme-update

Safely update a customer's Weaverse Pilot theme to a newer release — detects the current version, fetches diffs from GitHub, categorizes changes by risk level, preserves customizations, and verifies the build.

```
skills/theme-update/
└── SKILL.md                          # Full update procedure (detection → planning → execution → verification)

scripts/
└── check_pilot_updates.mjs           # Standalone version check script (Node 18+, zero deps)
```

### Quick check for updates

```bash
node scripts/check_pilot_updates.mjs
node scripts/check_pilot_updates.mjs --target v2026.4.7
```

### When to use this skill

- A customer asks to update their Pilot theme
- You see `@weaverse/pilot` in `package.json` and need to check for updates
- A user reports an issue fixed in a newer Pilot release

---

The Weaverse Team
