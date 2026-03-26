---
name: shopify-hydrogen-skill
description: "Skills for building, upgrading, and maintaining Shopify Hydrogen storefronts — includes core Hydrogen patterns, Weaverse integration, feature cookbooks, and upgrade guides."
---

# Shopify Hydrogen Skills

A collection of agent skills for working with Shopify Hydrogen storefronts — covering core framework patterns, Weaverse CMS integration, feature cookbooks, and upgrade guides.

## Available Skills

| Skill | Description | When to load |
|-------|-------------|--------------|
| [weaverse-hydrogen](./skills/weaverse-hydrogen/SKILL.md) | Weaverse CMS integration — components, schemas, loaders, theming, Hydrogen fundamentals | Any Hydrogen + Weaverse project work |
| [hydrogen-cookbooks](./skills/hydrogen-cookbooks/SKILL.md) | Step-by-step guides for building common Hydrogen features | Building specific features |
| [hydrogen-upgrades](./skills/hydrogen-upgrades/SKILL.md) | Hydrogen version migration guides and upgrade process | Upgrading Hydrogen |

## When to Load Which Skill

- **Working on a Hydrogen + Weaverse project** → load `weaverse-hydrogen`
- **Building a specific feature** (bundles, combined listings, 3D models...) → load `hydrogen-cookbooks`
- **Upgrading Hydrogen version** → load `hydrogen-upgrades`

## About Shopify Hydrogen

Hydrogen is Shopify's React-based framework for building custom storefronts. It is built on top of [Remix](https://remix.run/) and [Vite](https://vitejs.dev/), and provides first-class support for the Shopify Storefront API.

Key packages:
- `@shopify/hydrogen` — core utilities (cart, SEO, media, analytics, i18n)
- `@shopify/hydrogen-react` — headless React components and hooks
- `@shopify/remix-oxygen` — Remix adapter for Oxygen (Shopify's hosting platform)
