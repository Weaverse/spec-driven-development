# Gotchas — Things That Bite Every Tracking Implementation

Real bugs encountered in production. Read this first when something isn't working.

## "Add-to-cart event is in GTM Preview but not in GA4"

**Symptom:** GTM Preview shows the `add_to_cart` dataLayer push event in the timeline. Right-pane "Output of G-XXXXXXX" says `此代码未发送任何命中` / "no hits sent".

**Cause:** No GA4 Event tag in GTM is configured with a Custom Event trigger for `add_to_cart`. The push lands in dataLayer but nothing forwards it.

**Fix:** Add a tag. See [`gtm-meta-implementation.md`](./gtm-meta-implementation.md) for the recipe. Bonus tip: audit your whole container's e-comm coverage — typically only `purchase` is set up and everything else (view_item, add_to_cart, begin_checkout, view_cart, generate_lead) is missing.

## "GA4 shows view_item → purchase, skipping view_cart and add_to_cart entirely"

**Cause #1:** Buy-now buttons that use Shopify cart permalinks (`/cart/{variantId}:{quantity}?checkout`) teleport directly to Shopify's checkout subdomain. They bypass Hydrogen's cart, so:

- Hydrogen's `AnalyticsEvent.PRODUCT_ADD_TO_CART` never dispatches (nothing called `cart.linesAdd`).
- The Hydrogen cart's checkout button is never clicked, so `AnalyticsEvent.CART_VIEWED` / `begin_checkout` doesn't fire either.

**Fix:** In the Buy-now `onClick`, manually fire both:

```tsx
<a
  href={`/cart/${variantId}:${quantity}?checkout`}
  onClick={() => {
    trackEvent({ event_name: "add_to_cart", custom_data: { currency, value, items } });
    trackEvent({ event_name: "begin_checkout", custom_data: { currency, value, items } });
  }}
>
  Buy now
</a>
```

`sendBeacon` survives the navigation that follows. Each `trackEvent` returns its own UUID `event_id`; they're independent events for dedup purposes.

**Cause #2 (related):** Hydrogen's `PRODUCT_ADD_TO_CART` is dispatched by **diffing cart state after revalidation**, which has unreliable timing. Events often miss GA4 DebugView entirely. **Fix:** fire `add_to_cart` directly from the button onClick, not via the Hydrogen subscriber.

## "Meta CAPI shows no AddToCart events"

**Cause:** Meta CAPI's strict consent gate drops the event entirely when `ad_storage !== "granted"`. If your test session had cookies denied, no event is sent.

**Fix #1 — test correctly:** in incognito, accept the cookie banner BEFORE adding to cart. Then check Meta Events Manager → Test Events with your `META_TEST_EVENT_CODE`.

**Fix #2 — relax the gate (recommended):** rewrite the Meta forwarder so consent denial drops PII but still sends the event with `data_processing_options: ["LDU"]`. See [`gtm-meta-implementation.md`](./gtm-meta-implementation.md) §5.

## "view_item dataLayer push doesn't fire on PDP"

**Cause:** `<Analytics.ProductView>` is conditionally rendered:

```tsx
{selectedVariant && <Analytics.ProductView data={...} />}
```

For combined listings (or any product where the variant resolves after hydration), `selectedVariant` is `null` on first render. The analytics component never mounts and `PRODUCT_VIEWED` doesn't dispatch.

**Fix:** Remove the gate. Use safe fallbacks for variant-specific fields:

```tsx
<Analytics.ProductView
  data={{
    products: [{
      id: product.id,
      title: product.title,
      price: selectedVariant?.price?.amount || "0",
      vendor: product.vendor,
      variantId: selectedVariant?.id || "",
      variantTitle: selectedVariant?.title || "",
      quantity: 1,
    }],
  }}
/>
```

## "GTM Container Diagnostics: Unsupported tag implementation detected on Shopify"

**Cause:** Someone has pasted gtag.js / GA4 config into a Shopify Customer Events Custom Pixel (Settings → Customer events). At the same time you have the Google & YouTube sales channel app firing GA4. Both ship to the same `G-XXXXXXX` measurement ID.

**Effect:** Purchase events, page_views from the thank-you page, etc. are **double-counted**. Your GA4 reports show 2x the actual conversion rate.

**Fix:** Delete the duplicate Google tag from the Custom Pixel. Keep tracking only via the Google & YouTube sales channel app (Shopify-blessed, Google's modeled conversions only trust this route).

## "Tag Assistant standalone says 0 Google tags found"

**Cause:** GTM is loaded via Hydrogen's `<Script waitForHydration>` (or `requestIdleCallback`-based defer). The `<script>` tag is injected AFTER React hydrates, so Tag Assistant's initial HTML scan sees nothing.

**Fix:** Load GTM as a regular `<script async nonce={nonce}>` in `<head>` instead. See [`gtm-meta-implementation.md`](./gtm-meta-implementation.md) §1. Alternative: verify via GTM Preview's "Connected" mode (which uses runtime postMessage, doesn't care when the script loaded).

## "Custom Events Pixel for Meta double-fires Purchase"

**Cause:** Meta CAPI server webhook AND Customer Events Pixel both send a `Purchase` event for the same order, but with different `event_id` values. Meta's dedup contract is `(event_name, event_id)` — different ids = no dedup = double count.

**Fix:** Use a **deterministic** event_id derived from the Shopify order ID, on BOTH sides:

```ts
// Both Customer Events Pixel (browser) AND orders/create webhook (server)
event_id: `purchase_${order.id}`
```

This also makes the webhook idempotent on Shopify retry. No need to thread a UUID through cart attributes.

## "GTM tag fires inline scripts, CSP violations spam the console"

**Cause:** Custom HTML tags in GTM inject `<script>` blocks at runtime without the page nonce. Per CSP3 spec, when `nonce-XXX` is present in `script-src`, `'unsafe-inline'` is IGNORED — so un-nonced inline scripts get blocked.

**Fix:** Add `'strict-dynamic'` to `script-src`. This tells the browser to trust whatever the nonced root scripts (gtm.js, your inline `<head>` bootstrap) dynamically load — including Custom HTML tag inline scripts. See [`csp-for-tracking.md`](./csp-for-tracking.md).

## "GA4 Measurement Protocol events skip with reason: no_client_id"

**Cause:** Your server-side GA4 forwarder requires `client_id` to send to GA4 MP, but the request had none. This happens when:

- Visitor declined the cookie banner → no `_ga` cookie → no client_id → server skips.
- First visit + cookie banner not yet accepted → same.

**This is correct behavior** — sending events with random client_ids would pollute your GA4 property with "phantom" sessions that don't tie to any real user.

**If you really want partial coverage:** generate a stable fallback client_id from `crypto.randomUUID()` per session, store in `sessionStorage`, and use it as the fallback. Be aware that these sessions show as "Direct / None" and may inflate session counts.

## "_shopify_essential cookie disables Oxygen full-page cache"

**Cause:** Hydrogen's Storefront API client attaches `Set-Cookie: _shopify_essential=...` to every response that ran `storefront.query()`. Oxygen FPC's contract disallows `Set-Cookie` on cacheable responses, so even with a correct `Oxygen-Cache-Control` header you get `oxygen-cache-status: uncacheable`.

**Fix:** In `entry.server.tsx`, strip `Set-Cookie` from responses that opted into FPC. See [`oxygen-full-page-cache.md`](./oxygen-full-page-cache.md).

## "Shopify Plus checkout doesn't get my GTM container"

**Cause:** Shopify Plus checkout pages (`/checkouts/cn/*`) lock down the page to Shopify-managed scripts only. Your merchant GTM container (GTM-XXXXX) **cannot** be injected, by design.

**This is not a bug.** The Shopify-blessed pattern is:

- **Google (GA4, Google Ads, Merchant Center)** → fire from the "Google & YouTube" Sales Channel app (its own tag ID, e.g. `GT-XXXXXXXX`, posting to the same measurement IDs you configured in your GTM).
- **Non-Google vendors (Meta Pixel + CAPI, TikTok, etc.)** → use a Custom Customer Events Pixel under Shopify Admin → Settings → Customer events.

**To prove tracking is still working on checkout:** pull a HAR of `/checkouts/cn/*` and grep for `analytics.google.com/g/collect` (GA4) and `googleadservices.com` + `gcs=G111` (Google Ads consent-signal-granted). GA4 will receive purchase events from the sales channel even though GTM Preview shows nothing on those pages.

## "View Source has no GA4 / GTM scripts but they DO load"

Probably normal. `<Script waitForHydration>`, `requestIdleCallback`, and most analytics defer patterns inject scripts via DOM manipulation AFTER initial HTML parse. View Source shows initial HTML only; DevTools → Elements shows the post-hydration DOM, which DOES include the injected scripts.

To verify: in DevTools → Network → filter `gtm.js` → reload. Status 200 = GTM is loading.

## "`form_start` appears in GA4 DebugView, where does it come from?"

GA4 Enhanced Measurement auto-events. `form_start` fires the first time a visitor focuses/types in any `<form>` element on a page where the GA4 tag is loaded. Enabled by default in GA4 → Admin → Data Streams → Enhanced Measurement → "Form interactions".

It's NOT something you push to dataLayer. If you see it appearing around the time of `add_to_cart` failures, **don't conflate them** — `form_start` is fired by GA4 itself when the user clicks into the Shopify checkout's email field; the `add_to_cart` issue is separate.

## "PUBLIC_STORE_DOMAIN is a read-only env var managed by Hydrogen, and it's a bare hostname"

You can't modify it in Oxygen admin. The bare-hostname format (e.g. `your-shop.myshopify.com`) breaks the Shopify Storefront Web Components' `<shopify-store store-domain>` attribute, which expects a full URL.

**Fix:** normalize in your component:

```tsx
const storeDomainUrl = publicStoreDomain
  ? publicStoreDomain.startsWith("http")
    ? publicStoreDomain
    : `https://${publicStoreDomain}`
  : undefined;
```

Defensive guard: if `storeDomainUrl` is undefined (env not set), render a placeholder icon instead of mounting `<shopify-store store-domain="">` which would build the malformed `https://.your-domain.com/...` URL.

## "Webhook receiver returns 401 invalid_signature for every event"

**Cause #1:** You parsed the body as JSON and re-stringified it for HMAC verification. JSON serialisation isn't byte-stable — key order and whitespace differ. The signature won't match.

**Fix:** Always read the body as TEXT first, verify HMAC against the raw bytes, then `JSON.parse()` for actual use.

```ts
const rawBody = await request.text();
const hmacHeader = request.headers.get("x-shopify-hmac-sha256");
const valid = await verifyShopifyHmac(rawBody, hmacHeader, secret);
if (!valid) return new Response("invalid_signature", { status: 401 });
const order = JSON.parse(rawBody);  // ← parse AFTER verification
```

**Cause #2:** Wrong secret. If you're using Weaverse's webhook-forwarding feature (see [`webhook-forwarding-via-builder.md`](./webhook-forwarding-via-builder.md)), the secret you store as `SHOPIFY_WEBHOOK_SECRET` is the **per-forward signing secret returned when you created the forward**, NOT Shopify's app secret. Easy to confuse.

## "I rotated GA4_API_SECRET but events still hit the old secret"

**Cause:** Oxygen env var changes don't trigger an automatic worker restart. The change is staged but the running worker holds the old value.

**Fix:** Trigger a deploy (any commit + push), OR in Oxygen admin manually click "Deploy" on the storefront. New workers will pick up the new secret.

## "secrets leaked in chat / Slack / git"

If `SESSION_SECRET`, `SHOPIFY_WEBHOOK_SECRET`, `GA4_API_SECRET`, `META_CAPI_ACCESS_TOKEN`, or any private key was ever in clear text in a message that reached an external service (chat, AI assistant, screenshot in a JIRA ticket), **rotate immediately**:

- **`SESSION_SECRET`** — generate new in Oxygen env → redeploy.
- **`SHOPIFY_WEBHOOK_SECRET`** — Shopify admin → Notifications → re-issue, OR (if using Weaverse forwarding) `POST /api/webhook-forwards/{id}/rotate`.
- **`GA4_API_SECRET`** — GA4 Admin → Data Streams → Measurement Protocol API secrets → delete + create new.
- **`META_CAPI_ACCESS_TOKEN`** — Meta Business Manager → Pixel settings → re-issue.

Public-by-design IDs (`META_PIXEL_ID`, `GA4_MEASUREMENT_ID`, `GTM_ID`, `WEAVERSE_PROJECT_ID`) don't need rotation — they appear in the page's HTML anyway.
