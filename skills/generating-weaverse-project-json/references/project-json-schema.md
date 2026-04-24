# Weaverse Project Export JSON Schema Guide

This guide explains how to define a project export JSON file that matches the current Weaverse import/export contract in this repo.

It is a docs-only reference. The runtime validation still lives in `app/schemas/import.ts` and the export shape is produced by `app/routes/api/projects/import-export/export.ts` plus `app/routes/api/projects/import-export/export-helpers.ts`.

## Purpose

Use this document when you need to:

- hand-author a project export JSON file
- generate one with an AI workflow such as `wv-generate-project-data`
- review whether an export file is structurally ready for import

## Top-Level Shape

The current importable file shape is:

```json
{
  "version": "1.0.0",
  "exportedAt": "2026-03-24T12:00:00.000Z",
  "project": {
    "name": "Example Project",
    "config": {
      "previewHost": "http://localhost:3456",
      "theme": {},
      "defaultLocale": {
        "label": "English (United States)",
        "language": "en",
        "country": "US",
        "pathPrefix": "en-us"
      },
      "recentColors": ["#111111", "#F5F1E8"]
    }
  },
  "pages": [],
  "pageAssignments": []
}
```

## Required Fields

These fields are required by the current import schema:

- `version`: string
- `exportedAt`: string, usually an ISO timestamp
- `project`: object
- `project.name`: string
- `project.config`: object

These fields are optional in the current import schema, but usually needed for a meaningful import:

- `pages`: array
- `pageAssignments`: array
- `project.config.previewHost`
- `project.config.theme`
- `project.config.defaultLocale`
- `project.config.recentColors`

## Field Reference

### `version`

- Type: string
- Expected value today: `1.0.0`
- Purpose: export format version marker

### `exportedAt`

- Type: string
- Recommended format: ISO timestamp, for example `2026-03-24T12:00:00.000Z`
- Purpose: records when the export was generated

### `project`

- Type: object
- Purpose: project-level metadata and config

#### `project.name`

- Type: string
- Purpose: editor-facing project name

#### `project.config`

- Type: object
- Purpose: project configuration shell
- Accepted keys in the current schema:
  - `previewHost?: string`
  - `theme?: Record<string, unknown>`
  - `defaultLocale?: { label, language, country, pathPrefix }`
  - `recentColors?: string[]`

Do not assume arbitrary config keys are safe just because a demo export contains them. Keep this object intentional.

### `pages`

- Type: array of page objects
- Purpose: flat page payloads for import

Each page must contain:

- `id`: string
- `name`: string
- `rootId`: string
- `items`: array of item objects

### `pageAssignments`

- Type: array of page assignment objects
- Purpose: tells Weaverse how imported pages map to routes/locales

Each page assignment must contain:

- `pageId`: string, must match a page `id`
- `type`: valid page type string
- `handle`: string
- `locale`: string

## Page Shape

Each page object uses this shape:

```json
{
  "id": "page-home-001",
  "name": "Homepage",
  "rootId": "root-home-001",
  "items": [
    {
      "id": "root-home-001",
      "type": "main",
      "data": {},
      "children": [{ "id": "hero-001" }, { "id": "featured-001" }]
    },
    {
      "id": "hero-001",
      "type": "hero",
      "data": {
        "heading": "Build better storefronts"
      },
      "children": []
    },
    {
      "id": "featured-001",
      "type": "featured-collection",
      "data": {
        "heading": "Featured products"
      },
      "children": []
    }
  ]
}
```

## Item Shape

Each item object uses this shape:

```json
{
  "id": "hero-001",
  "type": "hero",
  "data": {
    "heading": "Build better storefronts"
  },
  "children": [{ "id": "hero-block-001" }]
}
```

Rules:

- `id` must be unique within the export
- `type` must be a real registered section or block type
- `data` is REQUIRED on every item — use `{}` when no non-default values are needed
- `children` is REQUIRED on every item — use `[]` for leaf items, `[{ "id": string }]` for parents
- `children` stores references only, not nested item objects

**CRITICAL:** The Weaverse importer requires both `data` and `children` to be present on every item. Omitting either field causes silent import failures where the page renders empty. Always include both, even when their values are `{}` and `[]`.

## Page Assignment Shape

Each page assignment uses this shape:

```json
{
  "pageId": "page-home-001",
  "type": "INDEX",
  "handle": "home",
  "locale": "en-us"
}
```

Rules:

- `pageId` must point to a page that exists in `pages`
- `type` should match the allowed page type values used by the app
- `handle` should match the intended route handle
- `locale` should match the intended market locale such as `en-us`

## Minimal Valid Example

This is the smallest practical export file shape to use as a starting point:

```json
{
  "version": "1.0.0",
  "exportedAt": "2026-03-24T12:00:00.000Z",
  "project": {
    "name": "Example Project",
    "config": {
      "previewHost": "http://localhost:3456"
    }
  },
  "pages": [
    {
      "id": "page-home-001",
      "name": "Homepage",
      "rootId": "root-home-001",
      "items": [
        {
          "id": "root-home-001",
          "type": "main",
          "data": {},
          "children": []
        }
      ]
    }
  ],
  "pageAssignments": [
    {
      "pageId": "page-home-001",
      "type": "INDEX",
      "handle": "home",
      "locale": "en-us"
    }
  ]
}
```

## Reference Integrity Rules

Before calling an export ready, verify all of these:

- every page `id` is unique
- every page `rootId` matches an item id inside that page's `items`
- every item `id` is unique
- every child reference points to an item id that exists
- every `pageAssignments[].pageId` matches a real page id
- every page keeps its own item graph self-contained

## Practical Guidance

- Prefer real section and block `type` values already registered by the project
- Keep `items` flat; hierarchy belongs in `children`
- Use stable, readable ids when hand-authoring files
- Keep `project.config.theme` limited to values you actually understand and intend to import
- If you do not know a Shopify product, collection, or media reference yet, mark it clearly before handoff rather than guessing

## Common Mistakes

- omitting `data` or `children` on items — both are required, use `{}` and `[]` when empty
- nesting full child objects inside `children` instead of using `{ "id": "..." }`
- setting `rootId` to an id that is missing from `items`
- using item types that are not registered by the storefront
- reusing the same id in multiple places
- copying a large demo `theme` object without checking whether those keys are valid for the target project
- omitting `pageAssignments` even though the imported pages need route assignments

## Relationship to Runtime Validation

This guide mirrors the current docs-level contract from:

- `app/schemas/import.ts`
- `app/routes/api/projects/import-export/import-validation.ts`
- `app/routes/api/projects/import-export/export.ts`
- `app/routes/api/projects/import-export/export-helpers.ts`

If runtime validation changes later, update this document and the `wv-generate-project-data` skill together.
