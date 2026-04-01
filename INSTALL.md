# Shopify Hydrogen Skills — Installer

You are an AI agent. Read this file carefully and follow every step in order.
Do **not** skip ahead — wait for the user's response before proceeding.

---

## Step 1 — Choose Installation Scope

Ask the user:

> "Where would you like to install the Shopify Hydrogen skills?
>
> 1. **Global** — available across all your projects (installed into each agent's global skills directory)
> 2. **Local** — only for the current project (installed into the project's `skills/` directory)"

Store the answer as `SCOPE` (`global` or `local`).

---

## Step 2 — Choose Agent(s)

Ask the user which AI agent(s) they want to install the skills for (they can pick multiple):

> "Which agent(s) do you use? (you can select more than one)
>
> 1. Claude Code
> 2. Cursor
> 3. GitHub Copilot
> 4. Windsurf
> 5. OpenCode
> 6. Other (I'll describe it)"

Store the selections as `AGENTS`.

If the user selects **Other**, ask them to describe their agent's config file location and format, then adapt Step 3 accordingly.

---

## Step 3 — Install for Each Selected Agent

For each agent in `AGENTS`, follow the relevant section below.

The **skills source** is: `https://github.com/Weaverse/shopify-hydrogen-skills`

Clone it temporarily, then copy the 4 skill folders directly into the agent's skills directory:

```
shopify-hydrogen/
hydrogen-cookbooks/
hydrogen-upgrades/
weaverse-hydrogen/
```

These 4 folders should land flat inside the destination — **not** wrapped in a subfolder.

---

### Claude Code

**Skills destination:**
| Scope    | Path                        |
| -------- | --------------------------- |
| `global` | `~/.claude/skills/`         |
| `local`  | `./skills/`                 |

**Copy the skills:**
```bash
git clone https://github.com/Weaverse/shopify-hydrogen-skills /tmp/h-skills --depth=1

# Global
cp -r /tmp/h-skills/skills/shopify-hydrogen    ~/.claude/skills/
cp -r /tmp/h-skills/skills/hydrogen-cookbooks  ~/.claude/skills/
cp -r /tmp/h-skills/skills/hydrogen-upgrades   ~/.claude/skills/
cp -r /tmp/h-skills/skills/weaverse-hydrogen   ~/.claude/skills/

# Local
cp -r /tmp/h-skills/skills/shopify-hydrogen    ./skills/
cp -r /tmp/h-skills/skills/hydrogen-cookbooks  ./skills/
cp -r /tmp/h-skills/skills/hydrogen-upgrades   ./skills/
cp -r /tmp/h-skills/skills/weaverse-hydrogen   ./skills/
```

**Config file to update:**
| Scope    | File                  |
| -------- | --------------------- |
| `global` | `~/.claude/CLAUDE.md` |
| `local`  | `./CLAUDE.md`         |

**Append** this block (create the file if it doesn't exist):

```markdown
## Shopify Hydrogen Skills

Before working on any Shopify Hydrogen or Weaverse-related task, read:

- {SKILLS_DESTINATION}/shopify-hydrogen/SKILL.md
- {SKILLS_DESTINATION}/hydrogen-cookbooks/SKILL.md
- {SKILLS_DESTINATION}/hydrogen-upgrades/SKILL.md
- {SKILLS_DESTINATION}/weaverse-hydrogen/SKILL.md
```

Replace `{SKILLS_DESTINATION}` with the actual destination path from the table above.

---

### Cursor

**Skills destination:**
| Scope    | Path                        |
| -------- | --------------------------- |
| `global` | `~/.cursor/skills/`         |
| `local`  | `./skills/`                 |

**Copy the skills:**
```bash
# Global
cp -r /tmp/h-skills/skills/shopify-hydrogen    ~/.cursor/skills/
cp -r /tmp/h-skills/skills/hydrogen-cookbooks  ~/.cursor/skills/
cp -r /tmp/h-skills/skills/hydrogen-upgrades   ~/.cursor/skills/
cp -r /tmp/h-skills/skills/weaverse-hydrogen   ~/.cursor/skills/

# Local — same as Claude Code local above
```

**Config file to update:**
| Scope    | File                                          |
| -------- | --------------------------------------------- |
| `global` | `~/.cursor/rules/shopify-hydrogen.mdc`        |
| `local`  | `./.cursor/rules/shopify-hydrogen.mdc`        |

Create the file with this content:

```markdown
---
description: Shopify Hydrogen and Weaverse skills
alwaysApply: true
---

Before working on any Shopify Hydrogen or Weaverse-related task, read:

- {SKILLS_DESTINATION}/shopify-hydrogen/SKILL.md
- {SKILLS_DESTINATION}/hydrogen-cookbooks/SKILL.md
- {SKILLS_DESTINATION}/hydrogen-upgrades/SKILL.md
- {SKILLS_DESTINATION}/weaverse-hydrogen/SKILL.md
```

Replace `{SKILLS_DESTINATION}` with the actual destination path from the table above.

---

### GitHub Copilot

GitHub Copilot instructions are project-scoped only. If the user selected `global`, inform them that Copilot doesn't support global instructions and proceed with a local install.

**Skills destination:** `./skills/`

**Copy the skills** (local variant from Claude Code section above).

**Config file to update:** `./.github/copilot-instructions.md`

Create `.github/` if it doesn't exist, then **append**:

```markdown
## Shopify Hydrogen Skills

Before working on any Shopify Hydrogen or Weaverse-related task, refer to:

- ./skills/shopify-hydrogen/SKILL.md
- ./skills/hydrogen-cookbooks/SKILL.md
- ./skills/hydrogen-upgrades/SKILL.md
- ./skills/weaverse-hydrogen/SKILL.md
```

---

### Windsurf

**Skills destination:**
| Scope    | Path                        |
| -------- | --------------------------- |
| `global` | `~/.windsurf/skills/`       |
| `local`  | `./skills/`                 |

**Copy the skills:**
```bash
# Global
cp -r /tmp/h-skills/skills/shopify-hydrogen    ~/.windsurf/skills/
cp -r /tmp/h-skills/skills/hydrogen-cookbooks  ~/.windsurf/skills/
cp -r /tmp/h-skills/skills/hydrogen-upgrades   ~/.windsurf/skills/
cp -r /tmp/h-skills/skills/weaverse-hydrogen   ~/.windsurf/skills/

# Local — same as Claude Code local above
```

**Config file to update:**
| Scope    | File                                     |
| -------- | ---------------------------------------- |
| `global` | `~/.windsurf/rules/shopify-hydrogen.md`  |
| `local`  | `./.windsurfrules`                       |

**Append** this block (create the file if it doesn't exist):

```markdown
## Shopify Hydrogen Skills

Before working on any Shopify Hydrogen or Weaverse-related task, read:

- {SKILLS_DESTINATION}/shopify-hydrogen/SKILL.md
- {SKILLS_DESTINATION}/hydrogen-cookbooks/SKILL.md
- {SKILLS_DESTINATION}/hydrogen-upgrades/SKILL.md
- {SKILLS_DESTINATION}/weaverse-hydrogen/SKILL.md
```

Replace `{SKILLS_DESTINATION}` with the actual destination path from the table above.

---

### OpenCode

**Skills destination:**
| Scope    | Path                        |
| -------- | --------------------------- |
| `global` | `~/.opencode/skills/`       |
| `local`  | `./skills/`                 |

**Copy the skills:**
```bash
# Global
cp -r /tmp/h-skills/skills/shopify-hydrogen    ~/.opencode/skills/
cp -r /tmp/h-skills/skills/hydrogen-cookbooks  ~/.opencode/skills/
cp -r /tmp/h-skills/skills/hydrogen-upgrades   ~/.opencode/skills/
cp -r /tmp/h-skills/skills/weaverse-hydrogen   ~/.opencode/skills/

# Local — same as Claude Code local above
```

**Config file to update:**
| Scope    | File                    |
| -------- | ----------------------- |
| `global` | `~/.opencode/AGENTS.md` |
| `local`  | `./AGENTS.md`           |

**Append** this block (create the file if it doesn't exist):

```markdown
## Shopify Hydrogen Skills

Before working on any Shopify Hydrogen or Weaverse-related task, read:

- {SKILLS_DESTINATION}/shopify-hydrogen/SKILL.md
- {SKILLS_DESTINATION}/hydrogen-cookbooks/SKILL.md
- {SKILLS_DESTINATION}/hydrogen-upgrades/SKILL.md
- {SKILLS_DESTINATION}/weaverse-hydrogen/SKILL.md
```

Replace `{SKILLS_DESTINATION}` with the actual destination path from the table above.

---

## Step 4 — Confirm Installation

After completing all changes, report back to the user with a summary:

```
✅ Shopify Hydrogen Skills installed!

Scope:   global / local
Agents:  Claude Code, Cursor, ...

Skills copied to:
  - ~/.claude/skills/          (Claude Code, global)
  - ~/.cursor/skills/          (Cursor, global)
  - ... (list all destinations)

  Each destination now contains:
  ├── shopify-hydrogen/
  ├── hydrogen-cookbooks/
  ├── hydrogen-upgrades/
  └── weaverse-hydrogen/

Config files updated:
  - ~/.claude/CLAUDE.md
  - ~/.cursor/rules/shopify-hydrogen.mdc
  - ... (list all files touched)

You're ready to build Hydrogen storefronts with full skill context.
```
