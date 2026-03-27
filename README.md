# Shopify Hydrogen Skills

A collection of agent skills for building, maintaining, and upgrading Shopify Hydrogen storefronts with Weaverse. Works with Claude Code, Cursor, GitHub Copilot, and any agent that supports markdown skill files.

## Installation

```bash
claude skill install Weaverse/shopify-hydrogen-skills
```

Or manually reference any skill file directly in your agent's context.

## Skills Overview

| Skill | What the agent learns |
|-------|-----------------------|
| [`skills/shopify-hydrogen/`](#shopify-hydrogen) | Core Hydrogen APIs — `createHydrogenContext`, cart handler, caching, pagination, SEO, analytics, CSP |
| [`skills/hydrogen-cookbooks/`](#hydrogen-cookbooks) | Step-by-step guides for bundles, combined listings, 3D models, customer accounts, performance, and more |
| [`skills/hydrogen-upgrades/`](#hydrogen-upgrades) | Breaking changes and migration steps for every Hydrogen version from 2024.4.7 to 2026.1.0 |
| [`skills/weaverse-hydrogen/`](#weaverse-hydrogen) | Weaverse components, schemas, loaders, theming, Hydrogen fundamentals, deployment |

---

## shopify-hydrogen

Core APIs from `@shopify/hydrogen` — everything needed to set up and work with a Hydrogen project: server context, cart handler, caching strategies, pagination, SEO meta, sitemaps, analytics, and CSP.

```
skills/shopify-hydrogen/
├── SKILL.md
└── references/
    ├── 01-setup.md
    ├── 02-caching.md
    └── 03-cart.md
```

> Sourced from [github.com/Shopify/hydrogen](https://github.com/Shopify/hydrogen/tree/main/packages/hydrogen/src)

---

## hydrogen-cookbooks

Self-contained feature recipes. Each cookbook covers prerequisites, step-by-step implementation, and troubleshooting. File names reference the Hydrogen skeleton — adapt paths to your project.

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

Version-by-version migration guides covering breaking changes, required code diffs, and step-by-step instructions. For multi-version jumps, apply each guide in order.

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

---

## weaverse-hydrogen

Everything needed to build a Shopify Hydrogen storefront with Weaverse — component anatomy, schema authoring, data fetching, styling, the Weaverse API, React Router v7 conventions, deployment, and advanced features.

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

> Sourced from [github.com/Weaverse/skills](https://github.com/Weaverse/skills)

---

## Manual Setup

If your agent doesn't support the `claude skill install` command, add the relevant `SKILL.md` path to your agent's context manually:

**Cursor** — the `.cursorrules` file at the root is automatically picked up.

**Claude Code** — add to your project's `CLAUDE.md`:
```
Read skills/weaverse-hydrogen/SKILL.md before working on Weaverse components.
```

**GitHub Copilot** — add to `.github/copilot-instructions.md`:
```
Refer to skills/weaverse-hydrogen/SKILL.md for Weaverse Hydrogen patterns.
```

---

The Weaverse Team
