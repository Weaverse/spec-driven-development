# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## What This Repo Is

A collection of agent skills for working with Shopify Hydrogen storefronts. Skills are markdown knowledge bases that agents (Claude, Copilot, Cursor, etc.) load to gain context before working on a Hydrogen project.

## Repository Structure

```
SKILL.md                          # Root entry point — index of all skills
.cursorrules                      # Mirror of root SKILL.md (for Cursor)
skills/
  weaverse-hydrogen/              # Weaverse CMS + Hydrogen fundamentals
    SKILL.md
    references/                   # 13 deep-dive reference files
    examples/                     # 4 production-ready code examples
  hydrogen-cookbooks/             # Feature implementation guides
    SKILL.md
    references/                   # One file per feature/cookbook
  hydrogen-upgrades/              # Version migration guides
    SKILL.md
    references/                   # One file per version jump
```

## Content Sources — Critical Rule

**Every skill file must come from an authoritative source. Never write content from memory or training data.**

| Skill | Authoritative Source |
|-------|---------------------|
| `weaverse-hydrogen/` | https://github.com/Weaverse/skills — fetch raw files directly |
| `hydrogen-cookbooks/references/` | Local: `/Users/hta218/Documents/work/workspace/pilot/.guides/cookbooks/` |
| `hydrogen-upgrades/references/` | Local: `/Users/hta218/Documents/work/workspace/pilot/.guides/hydrogen-upgrades/` |

The only files in this repo that are authored here (not sourced) are the `SKILL.md` index files and `AGENTS.md` itself.

## How to Add a New Cookbook or Upgrade Guide

1. Add the source file to the appropriate folder in `pilot/.guides/`
2. Copy it into the corresponding `references/` folder here
3. Update the `SKILL.md` index table for that skill

## How to Sync weaverse-hydrogen With Weaverse/skills

Fetch raw files directly from GitHub:

```bash
curl -o skills/weaverse-hydrogen/SKILL.md \
  https://raw.githubusercontent.com/Weaverse/skills/main/SKILL.md
```

Repeat for each file in `references/` and `examples/`. Do not manually edit these files — changes should flow from the upstream source.

## Skill File Format

Each `SKILL.md` follows this structure:

```yaml
---
name: skill-name
description: "One-line description of what this skill covers and when to use it."
---
```

Followed by:
- A brief intro explaining the skill's scope
- A table of available references with short descriptions
- Usage notes for when/how to load the skill

Reference files are freeform markdown — format follows whatever the source uses.

## .cursorrules

Always kept in sync with the root `SKILL.md`. If the root `SKILL.md` is updated, update `.cursorrules` to match.
