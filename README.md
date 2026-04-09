# Shopify Hydrogen Skills

Agent skills for building, maintaining, and upgrading Shopify Hydrogen storefronts with [Weaverse](https://weaverse.io). Works with **Claude Code, Cursor, GitHub Copilot, Windsurf, OpenCode, OpenClaw, Gemini CLI**, and any agent that supports markdown skill files.

> **Why skills, not docs?** Skills are concise, agent-optimized knowledge that your coding agent loads before working on a task — structured for LLMs, not humans. Pair them with live doc search for the best results.

## Quick Install

```bash
npx skills add Weaverse/shopify-hydrogen-skills
```

Auto-detects your coding agents and installs to all of them. Powered by [skills.sh](https://skills.sh).

For manual per-agent setup, see [INSTALL.md](INSTALL.md).

---

## Skills

| Skill | What the agent learns | When to load |
|-------|----------------------|--------------|
| [`shopify-hydrogen`](./skills/shopify-hydrogen/SKILL.md) | Core Hydrogen APIs — `createHydrogenContext`, cart handler, caching, pagination, SEO, CSP | Working with `@shopify/hydrogen` APIs |
| [`weaverse-hydrogen`](./skills/weaverse-hydrogen/SKILL.md) | Weaverse components, schemas, loaders, theming, deployment | Any Hydrogen + Weaverse project |
| [`hydrogen-cookbooks`](./skills/hydrogen-cookbooks/SKILL.md) | Step-by-step guides — bundles, combined listings, 3D models, customer accounts, performance | Building specific features |
| [`hydrogen-upgrades`](./skills/hydrogen-upgrades/SKILL.md) | Breaking changes and migration steps for Hydrogen framework versions | Upgrading Hydrogen framework |
| [`theme-update`](./skills/theme-update/SKILL.md) | Safe Pilot theme updates — detect version, plan changes, preserve customizations, verify build | Updating a customer's Pilot theme |
| [`weaverse-integration`](./skills/weaverse-integration/SKILL.md) | Integrate Weaverse into an existing Hydrogen project — analyze codebase, convert components, set up SDK, configure routes | Adding Weaverse to a project that doesn't use it yet |

---

## Live Docs

Instead of baking static API docs into skill files (which go stale), this repo ships **live doc fetching scripts** that query official sources at runtime:

```bash
# Search Shopify Hydrogen docs (shopify.dev)
node scripts/search_shopify_docs.mjs "createHydrogenContext"
node scripts/search_shopify_docs.mjs "CartForm actions"

# Search Weaverse docs (docs.weaverse.io)
node scripts/search_weaverse_docs.mjs "component schema"

# Fetch a specific Weaverse doc page
node scripts/get_weaverse_page.mjs "development-guide/component-schema"

# Check for Pilot theme updates
node skills/theme-update/scripts/check_pilot_updates.mjs
```

The `references/` folders in each skill serve as **offline fallback** — cached snapshots for when live search is unavailable.

| Script | Source | Endpoint |
|--------|--------|----------|
| `search_shopify_docs.mjs` | shopify.dev | Hydrogen API search |
| `search_weaverse_docs.mjs` | docs.weaverse.io | Weaverse docs search (Mintlify MCP) |
| `get_weaverse_page.mjs` | docs.weaverse.io | Full page fetch by path |
| `check_pilot_updates.mjs` | github.com | Pilot release version check |

All scripts are **zero-dependency** — Node.js 18+ built-ins only.

---

## Repo Structure

```
├── skills/
│   ├── shopify-hydrogen/          # Core Hydrogen APIs
│   │   ├── SKILL.md
│   │   └── references/            # Setup, caching, cart patterns
│   │
│   ├── weaverse-hydrogen/         # Weaverse CMS integration
│   │   ├── SKILL.md
│   │   ├── references/            # 13 deep-dive guides
│   │   └── examples/              # Production-ready component code
│   │
│   ├── hydrogen-cookbooks/        # Feature recipes
│   │   ├── SKILL.md
│   │   └── references/            # Bundles, combined listings, 3D, etc.
│   │
│   ├── hydrogen-upgrades/         # Framework version migrations
│   │   ├── SKILL.md
│   │   └── references/            # 2024.4.7 → … → 2026.1.0
│   │
│   └── theme-update/              # Pilot theme updater
│       ├── SKILL.md
│       └── scripts/
│           └── check_pilot_updates.mjs
│
│   └── weaverse-integration/     # Integrate into existing Hydrogen
│       └── SKILL.md
│
├── scripts/                       # Live doc fetching (shared)
│   ├── search_shopify_docs.mjs
│   ├── search_weaverse_docs.mjs
│   └── get_weaverse_page.mjs
│
├── .cursorrules                   # Cursor agent rules
├── AGENTS.md                      # Repo guidance for AI agents
├── INSTALL.md                     # Manual per-agent install guide
└── package.json
```

---

## Contributing

PRs welcome — especially for:
- New cookbooks (feature implementation guides)
- Upgrade guides for newer Hydrogen versions
- Improved offline references
- New live doc scripts for other sources

## License

MIT — [Weaverse](https://weaverse.io)
