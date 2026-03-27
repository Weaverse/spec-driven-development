# Deployment

> Deploy your Weaverse Hydrogen storefront to production.

## Shopify Oxygen (Recommended)

Oxygen is Shopify's official hosting platform for Hydrogen storefronts.

### Setup

1. **Connect GitHub repo** to your Shopify store
2. **Set environment variables** in Shopify admin → Hydrogen → your storefront → Settings
3. **Push to main branch** → automatic deployment

### Required Environment Variables

```bash
SESSION_SECRET="your-session-secret"
PUBLIC_STORE_DOMAIN=your-store.myshopify.com
PUBLIC_STOREFRONT_API_TOKEN=your-storefront-api-token
WEAVERSE_PROJECT_ID=your-weaverse-project-id
PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID=your-client-id
PUBLIC_CHECKOUT_DOMAIN=your-checkout-domain
SHOP_ID=your-shop-id
```

### Oxygen-Specific Configuration

```tsx
// server.ts
import { createRequestHandler } from '@shopify/remix-oxygen';

export default {
  async fetch(request: Request, env: Env, executionContext: ExecutionContext) {
    const handleRequest = createRequestHandler({
      build: remixBuild,
      mode: process.env.NODE_ENV,
      getLoadContext: () => createAppLoadContext(request, env, executionContext),
    });
    return handleRequest(request);
  },
};
```

### Oxygen Deployment Commands

```bash
# Via Shopify CLI
shopify hydrogen deploy

# With preview URL
shopify hydrogen deploy --preview
```

### Weaverse Studio Connection

After deploying to Oxygen:
1. Go to Weaverse Studio → your project → Settings
2. Set the **Production URL** to your Oxygen URL
3. Test the preview connection

## Docker Deployment

### Dockerfile

```dockerfile
FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

EXPOSE 3000
CMD ["npm", "run", "start"]
```

### Fly.io Example

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Launch (first time)
fly launch

# Deploy
fly deploy

# Set secrets (env vars)
fly secrets set SESSION_SECRET="your-secret"
fly secrets set PUBLIC_STORE_DOMAIN="your-store.myshopify.com"
fly secrets set PUBLIC_STOREFRONT_API_TOKEN="your-token"
fly secrets set WEAVERSE_PROJECT_ID="your-project-id"
```

### fly.toml

```toml
app = "my-hydrogen-store"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 1

[env]
  NODE_ENV = "production"
```

## Cloudflare Workers

```tsx
// server.ts for Cloudflare Workers
import { createRequestHandler } from '@shopify/remix-oxygen';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const cache = await caches.open('hydrogen');
    const handleRequest = createRequestHandler({
      build: remixBuild,
      mode: process.env.NODE_ENV,
      getLoadContext: () => createAppLoadContext(request, env, ctx),
    });
    return handleRequest(request);
  },
};
```

### wrangler.toml

```toml
name = "my-hydrogen-store"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

[vars]
PUBLIC_STORE_DOMAIN = "your-store.myshopify.com"

# Secrets (set via wrangler CLI)
# wrangler secret put SESSION_SECRET
# wrangler secret put PUBLIC_STOREFRONT_API_TOKEN
# wrangler secret put WEAVERSE_PROJECT_ID
```

## Production Checklist

Before deploying:

- [ ] All environment variables are set
- [ ] `npm run build` completes without errors
- [ ] `npm run typecheck` passes
- [ ] Weaverse Studio preview connection works
- [ ] Core Web Vitals (LCP < 2.5s, CLS < 0.1, INP < 200ms)
- [ ] SEO: meta tags, sitemap, structured data
- [ ] SSL certificate configured
- [ ] Content Security Policy includes Weaverse domains
- [ ] Analytics and tracking configured

## Build Commands

```bash
# Development
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Type checking
npm run typecheck

# Codegen (generate Storefront API types)
npm run codegen
```

## Content Security Policy (CSP)

Weaverse requires specific CSP directives. Use the built-in helper:

```tsx
// app/weaverse/csp.ts
import type { AppLoadContext } from '@shopify/remix-oxygen';

export function getWeaverseCsp(request: Request, context: AppLoadContext) {
  return {
    connectSrc: [
      "'self'",
      'https://weaverse.io',
      'https://studio.weaverse.io',
      'https://*.weaverse.io',
    ],
    imgSrc: [
      "'self'",
      'https://cdn.shopify.com',
      'https://ucarecdn.com',
    ],
    frameSrc: [
      'https://studio.weaverse.io',
    ],
  };
}
```

Used in `entry.server.tsx`:

```tsx
import { createContentSecurityPolicy } from '@shopify/hydrogen';
import { getWeaverseCsp } from '~/weaverse/csp';

const { nonce, header, NonceProvider } = createContentSecurityPolicy({
  ...getWeaverseCsp(request, context),
  shop: {
    checkoutDomain: context.env?.PUBLIC_CHECKOUT_DOMAIN,
    storeDomain: context.env?.PUBLIC_STORE_DOMAIN,
  },
});
```
