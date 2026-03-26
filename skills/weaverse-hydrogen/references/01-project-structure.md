# 01 — Project Structure

> Anatomy of a Weaverse Hydrogen theme.

## Directory Layout

```
my-theme/
├── app/
│   ├── components/          # Reusable UI components (Button, Icon, etc.)
│   ├── graphql/             # GraphQL queries and fragments
│   ├── hooks/               # Custom React hooks
│   ├── routes/              # React Router v7 route files
│   ├── sections/            # Weaverse section components
│   ├── styles/              # Global CSS, Tailwind base
│   ├── types/               # TypeScript type definitions
│   ├── utils/               # Helper functions
│   ├── weaverse/
│   │   ├── components.ts    # Component registry
│   │   ├── schema.server.ts # Theme schema (global settings)
│   │   ├── csp.ts           # CSP config for Weaverse
│   │   └── create-weaverse.server.ts  # WeaverseClient factory (optional)
│   ├── entry.client.tsx     # Client entry point
│   ├── entry.server.tsx     # Server entry (uses ServerRouter)
│   └── root.tsx             # Root app (wrapped with withWeaverse)
├── public/                  # Static assets
├── server.ts                # Server config + WeaverseClient init
├── vite.config.ts           # Vite build config
├── react-router.config.ts   # React Router v7 config
├── tailwind.config.js       # Tailwind CSS config
├── tsconfig.json            # TypeScript config
└── .env                     # Environment variables

## Key Directories

### `app/sections/`

This is where all Weaverse section components live. Each section is either:

- A **single file**: `app/sections/hero-banner.tsx`
- A **directory**: `app/sections/hero-banner/index.tsx` (for complex components with sub-files)

Every section exports:
1. **`default`** — The React component
2. **`schema`** — The `createSchema()` configuration
3. **`loader`** (optional) — Server-side data fetching function

### `app/weaverse/`

Core Weaverse configuration:

- **`components.ts`** — Registers all section components:
  ```tsx
  import type { HydrogenComponent } from '@weaverse/hydrogen';
  import * as HeroBanner from '~/sections/hero-banner';
  export let components: HydrogenComponent[] = [HeroBanner];

- **`schema.server.ts`** — Defines global theme settings (colors, typography, layout):
  import type { HydrogenThemeSchema } from '@weaverse/hydrogen';
  export let themeSchema: HydrogenThemeSchema = {
    info: { version: '1.0.0', author: 'Weaverse', name: 'My Theme' },
    settings: [
      {
        group: 'Colors',
        inputs: [
          { type: 'color', name: 'colorPrimary', label: 'Primary', defaultValue: '#000000' },
        ],
      },
  };

- **`csp.ts`** — Content Security Policy directives for Weaverse:
  export function getWeaverseCsp(request: Request, context: AppLoadContext) {
    return {
      frameAncestors: ['https://studio.weaverse.io', 'https://*.myshopify.com'],
      // ... other CSP directives
  }

### `app/routes/`

React Router v7 file-based routes. Weaverse pages are loaded in route loaders:

// app/routes/($locale)._index.tsx
export async function loader({ context }: LoaderFunctionArgs) {
  let weaverseData = await context.weaverse.loadPage({ type: 'INDEX' });
  return { weaverseData };
export default function Homepage() {
  return <WeaverseHydrogenRoot />;

## Essential Files

### `server.ts`

Initializes `WeaverseClient` and injects it into the app load context:

import { WeaverseClient } from '@weaverse/hydrogen';
import { components } from '~/weaverse/components';
import { themeSchema } from '~/weaverse/schema.server';

export async function createAppLoadContext(request, env, executionContext) {
  let hydrogenContext = createHydrogenContext({
    env, request, cache, waitUntil, session,
    i18n: getLocaleFromRequest(request),
    cart: { queryFragment: CART_QUERY_FRAGMENT },
  });

    ...hydrogenContext,
    weaverse: new WeaverseClient({
      request, cache, themeSchema, components,
    }),

### `root.tsx`

Must be wrapped with `withWeaverse`:

import { withWeaverse } from '@weaverse/hydrogen';

function App() {
  return (
    <html>
      <head><meta charSet="utf-8" /></head>
      <body>
        <Outlet />
      </body>
    </html>
  );

export default withWeaverse(App);

### `entry.server.tsx`

Uses `ServerRouter` from React Router v7 (not `RemixServer`):

import { ServerRouter } from 'react-router';
import { createContentSecurityPolicy } from '@shopify/hydrogen';
import { getWeaverseCsp } from '~/weaverse/csp';

export default async function handleRequest(request, responseStatusCode, responseHeaders, routerContext, context) {
  const { nonce, header, NonceProvider } = createContentSecurityPolicy({
    ...getWeaverseCsp(request, context),
    shop: {
      checkoutDomain: context.env?.PUBLIC_CHECKOUT_DOMAIN || context.env?.PUBLIC_STORE_DOMAIN,
      storeDomain: context.env?.PUBLIC_STORE_DOMAIN,

  const body = await renderToReadableStream(
    <NonceProvider>
      <ServerRouter context={routerContext} url={request.url} nonce={nonce} />
    </NonceProvider>,
    { nonce, signal: request.signal },

  responseHeaders.set('Content-Type', 'text/html');
  responseHeaders.set('Content-Security-Policy-Report-Only', header);
  return new Response(body, { headers: responseHeaders, status: responseStatusCode });

### `.env`

Required environment variables:

```bash
SESSION_SECRET="your-secret"
PUBLIC_STORE_DOMAIN=your-store.myshopify.com
PUBLIC_STOREFRONT_API_TOKEN=your-token
WEAVERSE_PROJECT_ID=your-project-id

# Optional
PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID=your-client-id
PUBLIC_CHECKOUT_DOMAIN=your-checkout-domain
SHOP_ID=your-shop-id

### `react-router.config.ts`

import type { Config } from '@react-router/dev/config';

export default {
  appDirectory: 'app',
  buildDirectory: 'dist',
  ssr: true,
} satisfies Config;

### `.gitignore` (must include)

.react-router/
node_modules/
dist/
