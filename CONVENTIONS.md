# Spec-Driven Development Conventions

This document defines the spec format, rules, and methodology for SDD. It is the authoritative reference for how specs are written, where they live, what they contain, and how they are enforced. When this document conflicts with any other source, this document wins.

---

## Core Principles

- The spec is the source of truth for a feature, not the code
- Specs describe INTENT (why it exists, what problem it solves) and BOUNDARIES (what files, what dependencies, what interfaces), not implementation details
- Code describes HOW. Specs describe WHY, WHAT, and WHAT MUST NOT BREAK.
- Every feature MUST have a `SPEC.md` before implementation begins
- When modifying a feature, the spec MUST be updated in the same PR
- Agents update the changelog; humans own intent and invariants

---

## The Spec File

### Naming and Location

- File name: `SPEC.md` (uppercase, consistent across all features)
- Location: co-located with the feature code, not in a separate directory
- Example: `src/features/auth/SPEC.md` lives alongside `src/features/auth/auth.service.ts`

Co-location matters because git log shows spec and code changes together. PRs that touch code without touching the spec are visually obvious. A centralized `/specs/` directory creates a parallel tree that drifts.

### Required Sections

Every `SPEC.md` MUST contain all of the following sections in this order:

```markdown
# Feature: [Name]

## Owner
Primary: @developer | Last modified: YYYY-MM-DD

## Purpose
One paragraph. Why this feature exists. What user or business problem it solves.
Not HOW it works — the WHY.

## Boundaries

### Files Owned
Every file this feature owns. If it's not listed, it's not part of this feature.
- filename.ts — brief description of role

### Dependencies
- **Uses**: other features or services this depends on (with brief reason)
- **Used by**: features that depend on this (with brief reason)

### Public Interfaces
Exported functions, API endpoints, events emitted, shared types.
These are the feature's contract with the outside world.

## Invariants
Rules that MUST remain true regardless of implementation changes.
These are guardrails for both humans and AI agents.
Examples:
- "Access tokens expire in 15 minutes"
- "All endpoints return { error, code } on failure"
- "Events are idempotent"

## Changelog
| Date | Author | Summary |
|------|--------|---------|
| YYYY-MM-DD | @dev | Description of change |
```

### Optional Sections

Add these when the situation calls for them, not by default:

- **Architecture Decisions** — when non-obvious choices were made (why X, not Y)
- **Non-Functional Requirements** — when there are specific performance, security, or scalability targets
- **Known Limitations / Tech Debt** — when there are known shortcuts or planned future work
- **Removal / Migration Notes** — when the feature is likely to be removed or significantly restructured
- **Testing Strategy** — when the testing approach isn't obvious from the test files themselves

---

## Rules

### For Developers

1. **New features**: write `SPEC.md` BEFORE implementation
2. **Modifying features**: read `SPEC.md` BEFORE touching code, update it in the same PR
3. **Removing features**: the `SPEC.md` deletion IS the removal record (git history preserves it)
4. **Cross-feature changes**: if your change touches files outside your feature's Boundaries, update BOTH specs
5. **Invariant changes**: require explicit review. These are the most important lines in the spec.

### For AI Agents

Before modifying ANY file in a feature directory:

```
1. READ the feature's SPEC.md
2. Extract Boundaries — these are the ONLY files you may touch
3. Extract Invariants — these are constraints you MUST NOT violate
4. Plan changes — validate plan against Invariants

After modifying:
5. UPDATE the Changelog in SPEC.md
6. If changes require files OUTSIDE Boundaries → STOP, flag to human
7. If Invariants may have changed → STOP, flag for human review
```

Agents MUST NOT auto-update the Purpose or Invariants sections. These represent human intent. An agent that rewrites invariants to match its own code changes inverts the entire source-of-truth relationship and defeats the system.

The Changelog is the only section agents may update autonomously.

---

## Enforcement

Three tiers, adopted progressively.

### Tier 1: CI File Check (Day 1)

Any PR touching feature code MUST also touch its `SPEC.md`. This is a simple path-matching script. It catches roughly 60% of spec drift and takes 30 minutes to set up.

### Tier 2: Structural Validation (Week 2)

- Lint that `SPEC.md` contains all required sections
- Validate that files listed in Boundaries actually exist in the repo
- Check that the Changelog has an entry matching the PR date

### Tier 3: AI-Assisted Review (Later)

CI bot reads the diff alongside the spec and flags inconsistencies. Example output: "You changed the token expiry logic but the spec says tokens expire in 15 minutes — is the spec still accurate?"

---

## Cross-Feature Concerns

### SYSTEM.md

- Top-level file at the repo root for architecture overview and feature index
- Lists all features with one-line descriptions
- Documents cross-cutting concerns: shared infrastructure, auth model, event bus, etc.
- Manually maintained until roughly 15 features, then auto-generate the index

### Dependency Management

- Dependencies in specs MUST be bidirectional. If A depends on B, both specs say so.
- CI can validate dependency symmetry by parsing the `Uses` and `Used by` fields
- Shared interfaces between features SHOULD be documented in both specs

---

## Granularity Guidelines

- One spec per ownership boundary, typically one per feature directory or module
- The test: "What's the minimum someone needs to understand to safely modify this?" = one spec
- If a project has more than 30 specs and isn't large, some are too granular
- If a non-trivial app has fewer than 5 specs, they're too broad
- When debating "is this one feature or three?": default to one. Split later when it hurts.

---

## Anti-Patterns

**Writing specs after implementation.** The spec becomes documentation, not source of truth. Intent gets reconstructed from code instead of the other way around.

**Over-specifying.** A 500-line spec nobody reads is worse than no spec. Keep required sections to five. Everything else is optional.

**Letting agents rewrite Invariants.** This inverts the source-of-truth relationship. The spec constrains the code; the code never re-defines the spec.

**Generating specs from code.** Code analysis produces descriptions of implementation, not statements of intent. These look like specs but provide none of the value.

**Making spec updates optional for small changes.** Every change is small to its author. The rule is the rule.

**Centralized `/specs/` directory.** Creates a parallel directory tree that drifts from the code. Co-locate or don't bother.
