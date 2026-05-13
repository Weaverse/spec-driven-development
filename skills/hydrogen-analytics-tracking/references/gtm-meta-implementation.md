# GTM, GA4, and Meta CAPI — Implementation Patterns

Concrete code patterns. Adapted from production deployments.

## 1. GTM bootstrap in `<head>` (synchronous + nonced)

`root.tsx`:

```tsx
<head>
  {/*
    Inline bootstrap MUST run BEFORE gtm.js loads:
    1. Initialise dataLayer + gtag
    2. Set Consent Mode v2 defaults (deny-all) — GTM reads this when loading
    3. Push gtm.start marker
  */}
  <script
    nonce={nonce}
    suppressHydrationWarning
    dangerouslySetInnerHTML={{
      __html: `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('consent', 'default', {
          'ad_storage': 'denied',
          'analytics_storage': 'denied',
          'ad_user_data': 'denied',
          'ad_personalization': 'denied',
          'wait_for_update': 500
        });
        gtag('set', 'ads_data_redaction', true);
        gtag('set', 'url_passthrough', true);
        window.dataLayer.push({'gtm.start': Date.now(), event: 'gtm.js'});
      `,
    }}
  />

  {/* External gtm.js — async, NONCED. Do NOT use Hydrogen <Script waitForHydration>
      here; it can't take a nonce and hides GTM from Tag Assistant scans. */}
  {googleGtmID ? (
    <script
      src={`https://www.googletagmanager.com/gtm.js?id=${googleGtmID}`}
      async
      nonce={nonce}
    />
  ) : null}
</head>

<body>
  {/* noscript fallback */}
  {googleGtmID ? (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${googleGtmID}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
      />
    </noscript>
  ) : null}
  …
</body>
```

### Why this order is non-negotiable

If gtm.js loads before the `gtag('consent', 'default', …)` block runs, GTM briefly initialises all tags with no consent state — meaning ad-storage-dependent tags can fire in "granted" mode for the first few milliseconds. Some pixels (Meta in particular) will dispatch a `PageView` with full PII before consent has been collected. That's a compliance violation.

The fix is strict ordering: inline `<script nonce>` block (synchronous, blocks parser briefly but is tiny) → external gtm.js (`async`, runs whenever it lands). Both nonced so CSP `strict-dynamic` trusts them.

## 2. Hydrogen Analytics → dataLayer bridge

`app/components/root/custom-analytics.tsx`:

```tsx
import { AnalyticsEvent, useAnalytics } from "@shopify/hydrogen";
import { useEffect } from "react";
import { trackEvent } from "~/utils/track-client";

export function CustomAnalytics() {
  const { subscribe } = useAnalytics();

  useEffect(() => {
    subscribe(AnalyticsEvent.PAGE_VIEWED, (data) => {
      trackEvent({ event_name: "page_view", custom_data: { page_location: data.url } });
    });

    subscribe(AnalyticsEvent.PRODUCT_VIEWED, (data) => {
      const product = data.products?.[0];
      if (!product) return;
      const item = {
        item_id: product.id,
        item_name: product.title,
        item_brand: product.vendor,
        item_variant: product.variantTitle,
        price: product.price,
        quantity: product.quantity || 1,
      };
      trackEvent({
        event_name: "view_item",
        custom_data: {
          currency: data.shop?.currency,
          value: Number(item.price) * item.quantity,
          items: [item],
        },
      });
    });

    subscribe(AnalyticsEvent.COLLECTION_VIEWED, (data) => {
      trackEvent({
        event_name: "view_item_list",
        custom_data: {
          item_list_id: data.collection?.id,
          item_list_name: data.collection?.handle,
        },
      });
    });

    subscribe(AnalyticsEvent.CART_VIEWED, (data) => {
      const items = (data.cart?.lines?.nodes ?? []).map(cartLineToGA4Item);
      trackEvent({
        event_name: "view_cart",
        custom_data: {
          currency: data.cart?.cost?.totalAmount?.currencyCode,
          value: Number(data.cart?.cost?.totalAmount?.amount ?? 0),
          items,
        },
      });
    });

    subscribe(AnalyticsEvent.PRODUCT_REMOVED_FROM_CART, (data) => {
      const item = cartLineToGA4Item(data.prevLine);
      if (!item) return;
      trackEvent({
        event_name: "remove_from_cart",
        custom_data: {
          currency: data.cart?.cost?.totalAmount?.currencyCode,
          value: Number(item.price) * (item.quantity || 1),
          items: [item],
        },
      });
    });

    // NOTE: do NOT subscribe to PRODUCT_ADD_TO_CART here. Hydrogen diffs cart
    // state after revalidation, which has unreliable timing — events often
    // miss GA4 DebugView entirely. Fire add_to_cart directly from the button
    // onClick handler (see below).
  }, []);

  return null;
}
```

## 3. `add_to_cart` and `begin_checkout` — fire from the button, not Hydrogen events

`app/components/product/add-to-cart-button.tsx`:

```tsx
function handleAddToCartClick() {
  if (disabled || isLoading) return;

  // Build the GA4 items[] array from the variant/line data we already have
  // in the component props.
  const items = (lines ?? []).map((line) => ({
    item_id: line.selectedVariant?.product?.id,
    item_name: line.selectedVariant?.product?.title,
    item_brand: line.selectedVariant?.product?.vendor,
    item_variant: line.selectedVariant?.title,
    price: line.selectedVariant?.price?.amount,
    quantity: line.quantity,
  }));
  const currency = lines?.[0]?.selectedVariant?.price?.currencyCode;
  const value = items.reduce((sum, i) => sum + Number(i.price ?? 0) * (i.quantity ?? 1), 0);

  // sendBeacon survives the form submit that fires immediately after.
  trackEvent({
    event_name: "add_to_cart",
    custom_data: { currency, value, items },
  });
}

return (
  <Button type="submit" onClick={handleAddToCartClick} disabled={disabled}>
    Add to cart
  </Button>
);
```

For `begin_checkout`: fire it on the checkout button's onClick, NOT from a Hydrogen subscriber. Same `trackEvent()` pattern.

### "Buy now" buttons that use Shopify cart permalinks

```tsx
// Buy-now button uses /cart/{variantId}:{qty}?checkout — teleports to Shopify
// checkout, bypassing Hydrogen's cart entirely. NEITHER add_to_cart NOR
// begin_checkout will fire via Hydrogen's analytics.
//
// Fire BOTH manually in the onClick:
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

Each `trackEvent` returns its own `event_id` — distinct events, distinct ids. They're not deduplicated against each other; they ARE deduplicated against their respective server-side hits.

## 4. GTM container — minimum tag set

For a complete funnel you need **one GA4 Event tag per dataLayer event**. They all follow the same recipe:

| Field | Value |
|---|---|
| Tag type | Google Analytics: GA4 Event (`gaawe`) |
| Configuration tag | Existing GA4 Configuration tag (`G-XXXXXXX`) |
| Event Name | The GA4 standard name (`view_item`, `add_to_cart`, `purchase`, etc.) |
| Send Ecommerce data | **Off** (use explicit `eventSettingsTable` instead — see below) |
| Event Parameters | `currency` ← `{{DLV - currency}}`<br>`value` ← `{{DLV - value}}`<br>`items` ← `{{DLV - items}}`<br>`event_id` ← `{{DLV - event_id}}` ← **critical for dedup with server CAPI** |
| Trigger | Custom Event, Event name = the GA4 name |

### Common GTM JSON shape for a GA4 Event tag

```json
{
  "name": "GA4 - add_to_cart",
  "type": "gaawe",
  "parameter": [
    { "type": "BOOLEAN", "key": "sendEcommerceData", "value": "false" },
    { "type": "LIST", "key": "eventSettingsTable", "list": [
      { "type": "MAP", "map": [
        { "type": "TEMPLATE", "key": "parameter", "value": "currency" },
        { "type": "TEMPLATE", "key": "parameterValue", "value": "{{DLV - currency}}" }
      ]},
      { "type": "MAP", "map": [
        { "type": "TEMPLATE", "key": "parameter", "value": "value" },
        { "type": "TEMPLATE", "key": "parameterValue", "value": "{{DLV - value}}" }
      ]},
      { "type": "MAP", "map": [
        { "type": "TEMPLATE", "key": "parameter", "value": "items" },
        { "type": "TEMPLATE", "key": "parameterValue", "value": "{{DLV - items}}" }
      ]},
      { "type": "MAP", "map": [
        { "type": "TEMPLATE", "key": "parameter", "value": "event_id" },
        { "type": "TEMPLATE", "key": "parameterValue", "value": "{{DLV - event_id}}" }
      ]}
    ]},
    { "type": "TEMPLATE", "key": "eventName", "value": "add_to_cart" },
    { "type": "TEMPLATE", "key": "measurementIdOverride", "value": "G-XXXXXXX" }
  ],
  "firingTriggerId": [ "<trigger-id-for-CE-add_to_cart>" ],
  "tagFiringOption": "ONCE_PER_EVENT",
  "consentSettings": { "consentStatus": "NOT_SET" }
}
```

### Custom Event trigger shape

```json
{
  "name": "CE - add_to_cart",
  "type": "CUSTOM_EVENT",
  "customEventFilter": [{
    "type": "EQUALS",
    "parameter": [
      { "type": "TEMPLATE", "key": "arg0", "value": "{{_event}}" },
      { "type": "TEMPLATE", "key": "arg1", "value": "add_to_cart" }
    ]
  }]
}
```

### Generating GTM patches programmatically

When auditing an existing GTM container, **export the workspace JSON** (Admin → Export Container), parse it, and generate a patch file that adds the missing tags + triggers + DLVs. Re-import with **Merge → Rename conflicting** to add new entries without touching existing ones.

Useful audit query against the export:

```bash
jq -r '.containerVersion.tag[]? | "[\(.tagId)] \(.name)  type=\(.type)  trigger=\(.firingTriggerId)"' workspace.json
jq -r '.containerVersion.trigger[]? | "[\(.triggerId)] \(.name)  filter=\(.customEventFilter[]?.parameter[]?.value)"' workspace.json
```

This is faster than clicking through the GTM UI and catches the asymmetric setups (e.g. `purchase` tag exists, `add_to_cart` doesn't) that are common in inherited containers.

## 5. Meta CAPI — server-side forwarder

`app/.server/tracking/forwarders/meta-capi.ts`:

```ts
const EVENT_NAME_MAP: Record<string, string> = {
  page_view: "PageView",
  view_item: "ViewContent",
  view_item_list: "ViewContent",
  add_to_cart: "AddToCart",
  view_cart: "ViewContent",
  begin_checkout: "InitiateCheckout",
  add_payment_info: "AddPaymentInfo",
  search: "Search",
  view_search_results: "Search",
  purchase: "Purchase",
  sign_up: "CompleteRegistration",
  generate_lead: "Lead",
  // remove_from_cart intentionally omitted — Meta has no inverse event.
};

export async function forwardToMetaCapi(event, env, ctx) {
  if (!env.META_PIXEL_ID || !env.META_CAPI_ACCESS_TOKEN) {
    return { forwarder: "meta_capi", ok: true, skipped: true, reason: "meta_env_missing" };
  }

  // Relaxed consent (recommended over the strict drop pattern):
  //   ad_storage granted  → full event with hashed PII (em, ph, external_id)
  //   ad_storage denied   → event without PII, only ip/ua/fbp/fbc, flagged LDU
  const adStorageGranted = event.consent?.ad_storage === "granted";

  let userData = buildUserData(event, ctx);
  if (!adStorageGranted) {
    userData = {
      ...(userData.client_ip_address && { client_ip_address: userData.client_ip_address }),
      ...(userData.client_user_agent && { client_user_agent: userData.client_user_agent }),
      ...(userData.fbp && { fbp: userData.fbp }),
      ...(userData.fbc && { fbc: userData.fbc }),
    };
  }

  if (Object.keys(userData).length === 0) {
    return { forwarder: "meta_capi", ok: true, skipped: true, reason: "no_user_match_keys" };
  }

  const metaEvent = {
    event_name: EVENT_NAME_MAP[event.event_name] ?? event.event_name,
    event_time: Math.floor(event.event_time / 1000),  // Meta wants seconds
    event_id: event.event_id,                          // ← dedup key vs browser pixel
    action_source: "website",
    event_source_url: event.page_url,
    user_data: userData,
    custom_data: mapCustomData(event.custom_data),
    ...(!adStorageGranted && {
      data_processing_options: ["LDU"],
      data_processing_options_country: 0,
      data_processing_options_state: 0,
    }),
  };

  const body = {
    data: [metaEvent],
    ...(env.META_TEST_EVENT_CODE && { test_event_code: env.META_TEST_EVENT_CODE }),
  };

  const url = new URL(`https://graph.facebook.com/v23.0/${env.META_PIXEL_ID}/events`);
  url.searchParams.set("access_token", env.META_CAPI_ACCESS_TOKEN);

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return {
      forwarder: "meta_capi",
      ok: false,
      error: `${err.error?.code ?? res.status}: ${err.error?.message ?? "unknown"}`,
    };
  }
  return { forwarder: "meta_capi", ok: true };
}
```

### Meta CAPI custom_data mapping (GA4 → Meta)

```ts
function mapCustomData(ga4) {
  const out = {};
  if (ga4.currency) out.currency = ga4.currency;
  if (ga4.value !== undefined) out.value = Number(ga4.value);
  if (ga4.transaction_id) out.order_id = ga4.transaction_id;
  if (ga4.search_term) out.search_string = ga4.search_term;

  const items = Array.isArray(ga4.items) ? ga4.items : [];
  const contents = items
    .map((item) => {
      const id = item.item_id ?? item.id;
      if (!id) return null;
      return {
        id: String(id),
        quantity: item.quantity != null ? Number(item.quantity) : undefined,
        item_price: item.price != null ? Number(item.price) : undefined,
      };
    })
    .filter(Boolean);

  if (contents.length) {
    out.contents = contents;
    out.content_ids = contents.map((c) => c.id);
    out.content_type = "product";
    out.num_items = contents.reduce((sum, c) => sum + (c.quantity ?? 1), 0);
  }

  return Object.keys(out).length ? out : undefined;
}
```

## 6. GA4 Measurement Protocol — server-side forwarder

```ts
export async function forwardToGa4(event, env, ctx) {
  if (!env.GA4_MEASUREMENT_ID || !env.GA4_API_SECRET) {
    return { forwarder: "ga4", ok: true, skipped: true, reason: "ga4_env_missing" };
  }

  // GA4 MP needs a stable client_id for sessionisation. Without it we can't
  // deliver the event meaningfully — log + skip rather than spray anonymous
  // pings that pollute the property.
  const clientId = event.user_data.client_id;
  if (!clientId) {
    return { forwarder: "ga4", ok: true, skipped: true, reason: "no_client_id" };
  }

  const body = {
    client_id: clientId,
    user_id: event.user_data.user_id,
    timestamp_micros: event.event_time * 1000,
    consent: {
      ad_user_data: event.consent?.ad_user_data ?? "DENIED",
      ad_personalization: event.consent?.ad_personalization ?? "DENIED",
    },
    events: [{
      name: event.event_name,
      params: {
        ...event.custom_data,
        engagement_time_msec: 100,
        session_id: event.user_data.session_id,  // optional but improves match
      },
    }],
  };

  const url = new URL(
    env.GA4_DEBUG === "1"
      ? "https://www.google-analytics.com/debug/mp/collect"
      : "https://www.google-analytics.com/mp/collect",
  );
  url.searchParams.set("measurement_id", env.GA4_MEASUREMENT_ID);
  url.searchParams.set("api_secret", env.GA4_API_SECRET);

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return { forwarder: "ga4", ok: false, error: `http_${res.status}` };
  }
  return { forwarder: "ga4", ok: true };
}
```

### Where `client_id` comes from

Read it from the `_ga` cookie on the client and stash on `event.user_data.client_id`:

```ts
function readGaClientId(): string | undefined {
  const m = document.cookie.match(/(?:^|; )_ga=GA\d\.\d+\.([^;]+)/);
  return m?.[1];
}
```

This makes the GA4 MP event land in the **same** GA4 session as the browser-side gtag hits, enabling proper attribution.

## 7. Shopify `orders/create` webhook → Purchase event

`app/routes/api/webhooks-orders-create.ts`:

```ts
import { verifyShopifyHmac } from "~/.server/tracking/shopify-hmac";
import { shopifyOrderToTrackEvent } from "~/.server/tracking/shopify-order";
import { forwardToGa4, forwardToMetaCapi, forwardToGoogleAds } from "~/.server/tracking";

export async function action({ request, context }: ActionFunctionArgs) {
  const raw = await request.text();
  const hmac = request.headers.get("x-shopify-hmac-sha256");
  if (!verifyShopifyHmac(raw, hmac, context.env.SHOPIFY_WEBHOOK_SECRET)) {
    return new Response("forbidden", { status: 401 });
  }

  const order = JSON.parse(raw);
  const event = shopifyOrderToTrackEvent(order);  // produces the TrackEvent shape

  // Bypass /api/track (avoid a second HTTP roundtrip) — call forwarders directly.
  await Promise.all([
    forwardToGa4(event, context.env, /* ctx */ {}),
    forwardToMetaCapi(event, context.env, {}),
    forwardToGoogleAds(event, context.env, {}),
  ]);

  return new Response("ok", { status: 200 });
}
```

`shopifyOrderToTrackEvent`:

```ts
export function shopifyOrderToTrackEvent(order: ShopifyOrder): TrackEvent {
  const items = (order.line_items ?? []).map((line) => ({
    item_id: line.sku ?? (line.variant_id ? String(line.variant_id) : undefined),
    item_name: line.title,
    item_brand: line.vendor,
    item_variant: line.variant_title,
    price: Number(line.price),
    quantity: line.quantity,
  }));

  // Deterministic event_id: idempotent on webhook retry + dedups against
  // the Customer Events Pixel's browser Purchase event using the same scheme.
  const event_id = `purchase_${order.id}`;

  return {
    event_id,
    event_name: "purchase",
    event_time: Date.now(),
    custom_data: {
      transaction_id: String(order.id),
      order_number: order.order_number ?? order.name,
      currency: order.currency,
      value: Number(order.total_price),
      tax: Number(order.total_tax),
      shipping: Number(order.total_shipping_price_set?.shop_money?.amount ?? 0),
      items,
    },
    user_data: {
      email: order.customer?.email ?? order.email ?? undefined,
      phone: order.customer?.phone ?? order.phone ?? undefined,
      external_id: order.customer?.id ? String(order.customer.id) : undefined,
      // Read GA4 client_id stashed by the storefront in cart.note_attributes
      // at begin_checkout (optional B3 enhancement; without it MP still works
      // but lands in a "direct" session).
      client_id: order.note_attributes?.find((a) => a.name === "_ga_client_id")?.value,
    },
    // Order webhooks fire after consent has been resolved in Shopify checkout.
    // Pass full grant so PII actually reaches CAPI/Enhanced Conversions.
    consent: {
      analytics_storage: "granted",
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
    },
  };
}
```

### Cross-side dedup contract for purchase

| Source | event_id |
|---|---|
| Shopify Customer Events Custom Pixel (browser, thank-you page) | `"purchase_" + orderId` |
| `orders/create` webhook (server) | `"purchase_" + orderId` |

Meta dedups on `(event_name, event_id)` automatically. GA4 dedups within a measurement protocol session via the same key.

If you want to also dedup against the BROWSER GA4 hit fired by the Customer Events Pixel, the pixel needs to include `event_id` in its `gtag('event', 'purchase', { event_id, ... })` call. The "Google & YouTube" sales channel app does NOT do this by default — you'd need a custom pixel.
