# 07 — React Router v7

> Routes, layouts, loaders/actions, conventions, imports.

## Key Changes from Remix

Weaverse v5 uses React Router v7 (not Remix). All imports come from `react-router`:

```tsx
// ✅ React Router v7
import { useLoaderData, useNavigate, Link, Outlet } from 'react-router';
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';

// ❌ Remix (deprecated)
import { useLoaderData } from '@remix-run/react';
import type { LoaderFunctionArgs } from '@shopify/remix-oxygen';
```

## Configuration

### `react-router.config.ts`

import type { Config } from '@react-router/dev/config';

export default {
  appDirectory: 'app',
  buildDirectory: 'dist',
  ssr: true,
} satisfies Config;

### TypeScript

// tsconfig.json
{
  "include": [
    "./**/*.d.ts",
    "./**/*.ts",
    "./**/*.tsx",
    ".react-router/types/**/*"
  ],
  "compilerOptions": {
    "rootDirs": [".", "./.react-router/types"]
  }

### `.gitignore`

.react-router/

### `env.d.ts`

declare module 'react-router' {
  interface LoaderFunctionArgs {
    context: AppLoadContext;
  interface ActionFunctionArgs {

## Route File Convention

Routes live in `app/routes/` and follow file-based routing:

| File | URL |
|------|-----|
| `_index.tsx` | `/` |
| `products.$handle.tsx` | `/products/:handle` |
| `collections.$handle.tsx` | `/collections/:handle` |
| `($locale)._index.tsx` | `/:locale?/` |
| `($locale).products.$handle.tsx` | `/:locale?/products/:handle` |
| `pages.$handle.tsx` | `/pages/:handle` |
| `blogs.$blogHandle.$articleHandle.tsx` | `/blogs/:blogHandle/:articleHandle` |

## Route Structure with Weaverse

### Homepage

// app/routes/($locale)._index.tsx
import { WeaverseHydrogenRoot } from '@weaverse/hydrogen';
import type { LoaderFunctionArgs } from 'react-router';

export async function loader({ context }: LoaderFunctionArgs) {
  let weaverseData = await context.weaverse.loadPage({ type: 'INDEX' });
  return { weaverseData };

export default function Homepage() {
  return <WeaverseHydrogenRoot />;

### Product Page

// app/routes/($locale).products.$handle.tsx

export async function loader({ context, params }: LoaderFunctionArgs) {
  let { handle } = params;
  let { storefront, weaverse } = context;

  // Load Shopify product data
  let { product } = await storefront.query(PRODUCT_QUERY, {
    variables: { handle },
  });

  if (!product) throw new Response('Product not found', { status: 404 });

  // Load Weaverse page data
  let weaverseData = await weaverse.loadPage({
    type: 'PRODUCT',
    handle,

  return { product, weaverseData };

export default function ProductPage() {

### Collection Page

// app/routes/($locale).collections.$handle.tsx
  let weaverseData = await context.weaverse.loadPage({
    type: 'COLLECTION',

export default function CollectionPage() {

### Custom Page

// app/routes/($locale).pages.$handle.tsx
    type: 'PAGE',
    handle: params.handle,

## Entry Server

Uses `ServerRouter` instead of `RemixServer`:

// app/entry.server.tsx
import { ServerRouter } from 'react-router';

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  context: AppLoadContext,
) {
  let body = await renderToReadableStream(
    <NonceProvider>
      <ServerRouter context={routerContext} url={request.url} nonce={nonce} />
    </NonceProvider>,
    { nonce, signal: request.signal },
  );

  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,

## Loader Patterns

### Return data directly (RR7 style)

  let data = await context.weaverse.loadPage({ type: 'INDEX' });
  return { weaverseData: data };  // No json() wrapper needed in RR7

### Actions

export async function action({ request, context }: ActionFunctionArgs) {
  let formData = await request.formData();
  // Process form data
  return { success: true };

### Meta

export function meta({ data }: { data: LoaderData }) {
  return [
    { title: data.page?.title || 'My Store' },
    { name: 'description', content: data.page?.description || '' },
  ];

## Key Hooks

import {
  useLoaderData,    // Access loader data in components
  useActionData,    // Access action return data
  useNavigate,      // Programmatic navigation
  useParams,        // URL params
  useSearchParams,  // Query string params
  useLocation,      // Current location
  Link,             // Navigation link
  NavLink,          // Navigation link with active state
  Form,             // Form with action
  Outlet,           // Render child routes
} from 'react-router';
