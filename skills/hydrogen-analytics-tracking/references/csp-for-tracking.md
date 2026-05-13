# Content Security Policy for Tracking

CSP is the most common blocker for "my tracking works locally but not in prod". A wrong directive silently drops requests, the browser console fills with violations, and Tag Assistant reports an empty container.

## Hydrogen's CSP — where it lives

Hydrogen's `createContentSecurityPolicy()` builds the CSP header from a config object. In a Weaverse-based Hydrogen project the config is at `app/weaverse/csp.ts`; in a vanilla Hydrogen project it's typically inline in `entry.server.tsx`.

The default config is too restrictive for any storefront with ads/analytics. You'll need to allow at minimum:

- Google Tag Manager (`*.googletagmanager.com`)
- Google Analytics 4 (`*.google-analytics.com`, `analytics.google.com`)
- Google Ads (`*.googleadservices.com`, `*.googlesyndication.com`, `*.google.com`, `*.doubleclick.net`)
- Meta (`*.facebook.com`, `*.facebook.net` — but Meta CAPI is server-side so usually only the Pixel needs browser-side allowance)
- Shopify storefront APIs (`https://cdn.shopify.com`, `*.shopify.com`, `*.myshopify.com`, `*.shopifysvc.com`)
- Hotjar / Clarity / similar (`*.hotjar.com`, `static.hotjar.com`, `script.hotjar.com`, `wss://*.hotjar.com`)

## Minimum working config (Weaverse Hydrogen)

```ts
// app/weaverse/csp.ts
export function getWeaverseCsp(request: Request, context: HydrogenRouterContextProvider) {
  const weaverseHost = new URL(request.url).searchParams.get("weaverseHost") ?? context.env.WEAVERSE_HOST;
  const weaverseHosts = ["*.weaverse.io", "*.shopify.com", "*.myshopify.com"];
  if (weaverseHost) weaverseHosts.push(weaverseHost);

  return {
    defaultSrc: [
      "data:",
      "*.youtube.com",
      "*.vimeo.com",
      "*.google.com",
      "*.google-analytics.com",
      "*.googletagmanager.com",
      "*.googleadservices.com",
      "*.googlesyndication.com",
      ...weaverseHosts,
    ],
    scriptSrc: [
      // CSP3 strict-dynamic: trust whatever the nonced root scripts
      // (gtm.js, our inline blocks) dynamically load. GTM Custom HTML tags
      // (Hotjar, AliReviews) cannot carry the page nonce themselves but
      // they're loaded by gtm.js, so strict-dynamic trusts them.
      //
      // When strict-dynamic is set, domain allowlists and 'unsafe-inline'
      // are IGNORED by CSP3-compliant browsers. The domain entries below
      // remain as fallback for older browsers.
      "'strict-dynamic'",
      "https://cdn.shopify.com",
      "*.googletagmanager.com",
      "*.google-analytics.com",
      "*.googleadservices.com",
      "*.googlesyndication.com",
      "*.google.com",
      "*.doubleclick.net",
      "https://static.hotjar.com",
      "https://script.hotjar.com",
      "'unsafe-inline'",  // fallback for non-strict-dynamic browsers
      "'unsafe-eval'",
    ],
    connectSrc: [
      "vimeo.com",
      "*.google-analytics.com",
      "analytics.google.com",
      "*.googletagmanager.com",
      "*.googleadservices.com",
      "*.googlesyndication.com",
      "*.google.com",
      "*.doubleclick.net",
      "*.hotjar.com",
      "content.hotjar.io",
      "wss://*.hotjar.com",
      "*.shopifysvc.com",
      "https://cdn.shopify.com/",
      "https://monorail-edge.shopifysvc.com",
      `https://${context.env.PUBLIC_CHECKOUT_DOMAIN}`,
      ...weaverseHosts,
    ],
    styleSrc: [...weaverseHosts, "https://static.hotjar.com"],
  };
}
```

## Common CSP failures and what they mean

| Console warning | What's broken | Fix |
|---|---|---|
| `Refused to load the script 'https://pagead2.googlesyndication.com/...'` | Google Ads conversion measurement | Add `*.googlesyndication.com` to `scriptSrc` AND `connectSrc` |
| `Refused to connect to 'https://www.googleadservices.com/...'` | Google Ads server collect | Add `*.googleadservices.com` to `connectSrc` |
| `Refused to load the script 'https://www.googletagmanager.com/gtm.js'` | GTM itself | Add `*.googletagmanager.com` to `scriptSrc` |
| `Refused to connect to 'https://your-shop.myshopify.com/api/...'` | Shopify Storefront API | Add the bare myshopify domain to `connectSrc` (with `https://` prefix) |
| `Refused to connect to 'https://.your-domain.com/...'` (malformed URL) | Storefront web component `<shopify-store store-domain>` missing the `https://` prefix on `PUBLIC_STORE_DOMAIN` | Normalize the prop: `store-domain={domain.startsWith("http") ? domain : "https://" + domain}` |

## strict-dynamic vs domain allowlist

The CSP3 `'strict-dynamic'` source expression says: *trust any script loaded by a script we already trust (because it has the page nonce or matches a hash)*. When set, it **disables** domain-based allowlists in `script-src`.

### Why strict-dynamic is the right answer for GTM

GTM Custom HTML tags (Hotjar pixel snippet, AliReviews widget, third-party affiliate scripts) inject `<script>` blocks at runtime via `document.write` or DOM appendChild. These scripts **cannot carry the page nonce** because GTM doesn't know what the nonce is. With a nonce-only CSP they'd be blocked.

Solutions:

1. **`'strict-dynamic'`** — gtm.js itself has the nonce → strict-dynamic trusts everything it loads → Custom HTML tags fire correctly. ✅ recommended.

2. **`'unsafe-inline'` without nonce** — works but disables CSP's main protection. Per CSP3 spec, when both a nonce AND `'unsafe-inline'` are present, the nonce wins and `'unsafe-inline'` is IGNORED. So you can't just "add both" — the browser ignores unsafe-inline.

3. **Hash list** — generate a SHA-256 hash for each inline script your GTM fires. Maintenance hell — every script update breaks CSP until you regenerate the hash.

4. **Drop CSP for inline scripts** — works, eliminates the protection. Compliance teams will be unhappy.

### Loading gtm.js with a nonce

```tsx
// app/root.tsx
const nonce = useNonce();

return (
  <head>
    {/* Inline bootstrap MUST run first, synchronously, nonced */}
    <script
      nonce={nonce}
      dangerouslySetInnerHTML={{
        __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('consent', 'default', { /* defaults */ });
          window.dataLayer.push({'gtm.start': Date.now(), event: 'gtm.js'});
        `,
      }}
    />

    {/* gtm.js external — nonced, async */}
    {googleGtmID && (
      <script
        src={`https://www.googletagmanager.com/gtm.js?id=${googleGtmID}`}
        async
        nonce={nonce}
      />
    )}
  </head>
);
```

**Do NOT use Hydrogen's `<Script waitForHydration>` for GTM.** It can't take a nonce, which prevents `'strict-dynamic'` from working, AND it hides GTM from Tag Assistant standalone scans (which detect GTM by reading the initial HTML).

## Report-only vs enforced CSP

- **`Content-Security-Policy-Report-Only`** — violations are logged in the console and reported to your endpoint, but nothing is actually blocked. Use this during initial rollout while you iron out the directive list.
- **`Content-Security-Policy`** — enforced. Violating scripts are blocked.

Hydrogen's `createContentSecurityPolicy()` returns the header but doesn't set the response header — you choose which to use in `entry.server.tsx`:

```ts
// During rollout — report only, nothing blocked
responseHeaders.set("Content-Security-Policy-Report-Only", header);

// After 1 week of clean reports — enforce
responseHeaders.set("Content-Security-Policy", header);
```

Graduate from report-only to enforced only after a sustained period (a week+) of zero unexpected violations in production logs.

## CSP for the Shopify Storefront Web Components

The new (2025+) Shopify Storefront Web Components (`<shopify-store>`, `<shopify-account>`, `<shopify-product>`, etc.) load from `https://cdn.shopify.com/storefront/web-components.js` and connect to your store's myshopify domain.

```
script-src:  https://cdn.shopify.com (already covered above)
connect-src: https://{shop}.myshopify.com  (e.g. https://your-shop.myshopify.com)
```

**Important:** the `<shopify-store store-domain>` attribute requires the **full URL with protocol**. Shopify Oxygen injects `PUBLIC_STORE_DOMAIN` as a **bare hostname** (no `https://`). Normalize before passing:

```tsx
const storeDomainUrl = publicStoreDomain
  ? publicStoreDomain.startsWith("http")
    ? publicStoreDomain
    : `https://${publicStoreDomain}`
  : undefined;

if (!storeDomainUrl) return <UserIconPlaceholder />;

return (
  <shopify-store store-domain={storeDomainUrl} public-access-token={publicAccessToken}>
    <shopify-account sign-in-url="/account/login" />
  </shopify-store>
);
```

Without the protocol the bundle constructs a malformed URL like `https://.your-domain.com/api/unstable/graphql.json` → DNS fails with `ERR_NAME_NOT_RESOLVED` + CSP violation on the `connect-src` directive.

Also: use the **umbrella bundle** URL, not the per-component one:
- ✅ `https://cdn.shopify.com/storefront/web-components.js` (registers `shopify-store`, `shopify-account`, `shopify-context`, `shopify-data`, …)
- ❌ `https://cdn.shopify.com/storefront/web-components/account.js` (registers only `shopify-account`; `<shopify-store>` won't be defined → console warning + non-functional widget)
