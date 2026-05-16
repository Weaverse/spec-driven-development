# Cart-Attribute Stash — Bridging the Webhook Cookie Gap

The single most reliable pattern for getting per-user identifiers (ad-click IDs, browser pixel cookies, GA client IDs) from a Hydrogen storefront into the **Shopify Orders webhook** for server-side conversion forwarders (Meta CAPI, Google Ads Enhanced Conversions, Traffic Junky, GoAffpro, Awin, etc.).

If you've ever wondered "why does my Meta CAPI Purchase event have no `fbp`/`fbc`?" or "why does Traffic Junky show conversions with no `aclid`?", this is the answer.

---

## The problem in one diagram

```
Browser                  Hydrogen worker        Shopify              Your webhook
─────────────────────    ──────────────────     ────────────        ─────────────
Cookies on .segai.cc:    Reads cookies from     Receives cart       Receives webhook
  _ga, _fbp, _fbc,         req.headers.Cookie   create / lines      WITHOUT cookies
  segai_attr (gclid,       on every storefront  mutation. Stores    (server-to-server
  tj_clickid, ref…)        request.             cart attributes.    POST from Shopify.)

         │                       │                    │                   │
         │  Add-to-Cart          │                    │                   │
         │ ──────────────────►   │  cart.updateAttrs  │                   │
         │                       │ ─────────────────► │                   │
         │                       │                    │ ─────────────────►│
         │                       │                    │  order.note_      │
         │                       │                    │  attributes has   │
         │                       │                    │  every stashed    │
         │                       │                    │  identifier ──────┘
```

**The Shopify Orders webhook is a server-to-server POST from Shopify's infrastructure to your endpoint. It carries no user cookies.** The user's `_fbp`/`_fbc`/`_ga`/`gclid` lived in their browser and never crossed the network on the webhook hop. Any forwarder that reads from request context (which is the natural pattern for a `/api/track` browser endpoint) will silently degrade on the webhook path.

The fix: snapshot every identifier the user has on their browser into the cart's `attributes` (Storefront API) / `note_attributes` (Admin API / webhook payload) at the moment they touch the cart server-side. The webhook handler reads them back from `order.note_attributes`.

---

## Identifiers that need stashing

| Cookie              | Purpose                                        | Forwarder using it          |
| ------------------- | ---------------------------------------------- | --------------------------- |
| `_ga`               | GA4 client_id (`_ga` cookie's `<rand>.<ts>` tail) | GA4 Measurement Protocol  |
| `_fbp`              | Meta browser id                                | Meta Conversions API        |
| `_fbc`              | Meta click id (fbclid wrap)                    | Meta Conversions API        |
| `_gcl_aw` (or own) | Google Ads click id (gclid)                    | Google Ads Enhanced Conv.   |
| custom attribution  | tj_clickid, ref (GoAffpro), awc (Awin), …      | Affiliate S2S postbacks     |

If you maintain your own first-party cross-subdomain attribution cookie (recommended: it survives ITP / consent-denied / browser-blocked first-party `_gcl_aw`), keep `gclid`, `tj_clickid`, `ref`, `aff`, etc. in there.

---

## Where to stash: the two cart entry paths

This is the trap most implementations fall into. There are **two** Hydrogen routes that mutate the cart, and your stash logic needs to run in **both**:

### Path 1 — POST `/cart` action handler

The regular Add-to-Cart flow. Driven by `<CartForm action={CartForm.ACTIONS.LinesAdd}>` (and `LinesUpdate`, `BuyerIdentityUpdate`, etc.). Handled by `app/routes/cart/cart-page.tsx` (or `app/routes/cart.tsx` in older templates).

```ts
// app/routes/cart/cart-page.tsx
import { buildAttributionCartAttrsFromCookies } from "~/utils/attribution";

export async function action({ request, context }: ActionFunctionArgs) {
  const { cart } = context;
  const formData = await request.formData();
  const { action: cartFormAction, inputs } = CartForm.getFormInput(formData);

  let result: CartQueryDataReturn;
  switch (cartFormAction) {
    case CartForm.ACTIONS.LinesAdd:
      result = await cart.addLines(inputs.lines as CartLineInput[]);
      break;
    // ... other actions
  }

  // After ANY successful cart mutation, merge attribution identifiers
  // into cart.attributes. Idempotent — skips when the cart already
  // carries them.
  if (result?.cart) {
    const desired = buildAttributionCartAttrsFromCookies(
      request.headers.get("Cookie"),
    );
    if (desired.length > 0) {
      const existing = (result.cart as { attributes?: Array<{key:string;value:string}> })
        .attributes ?? [];
      const missing = desired.filter(
        (d) => !existing.some((e) => e.key === d.key && e.value === d.value),
      );
      if (missing.length > 0) {
        const preserveKeys = new Set(desired.map((d) => d.key));
        const merged = [
          ...existing.filter((e) => !preserveKeys.has(e.key)),
          ...desired,
        ];
        try {
          const attrResult = await cart.updateAttributes(merged);
          if (attrResult?.cart) result = attrResult;
        } catch {
          // best-effort — don't fail the cart mutation if this hiccups
        }
      }
    }
  }

  return data({ cart: result?.cart, ... });
}
```

The merge step matters: Shopify's `cartAttributesUpdate` mutation **replaces** the full attributes set, so you must send the union to avoid clobbering whatever the storefront has already written (e.g. by a 3rd-party app's tracker).

### Path 2 — GET `/cart/<variantId>:<qty>?checkout` loader

The **Buy-now / instant-checkout** flow. Generated by buttons like:

```tsx
<Link to={`/cart/${variantId}:${qty}?checkout`} ...>Buy now</Link>
```

Handled by `app/routes/cart/lines.tsx` — a LOADER (GET, no form data) that calls `cart.create()` directly and redirects to checkout. **This route never touches the POST action.** Without the stash here, every Buy-now purchase lands in Shopify with empty `note_attributes`.

```ts
// app/routes/cart/lines.tsx
import { buildAttributionCartAttrsFromCookies } from "~/utils/attribution";

export async function loader({ request, context, params }: LoaderFunctionArgs) {
  const { cart } = context;
  // ... parse lines from params

  // Stash attribution at cart creation. Shopify's cartCreate input
  // accepts `attributes`, so this is a single round-trip — no separate
  // updateAttributes call needed.
  const attributionAttrs = buildAttributionCartAttrsFromCookies(
    request.headers.get("Cookie"),
  );

  const result = await cart.create({
    lines: linesMap,
    discountCodes: discountArray,
    ...(attributionAttrs.length > 0 ? { attributes: attributionAttrs } : {}),
  });

  // ... redirect to cartResult.checkoutUrl
}
```

If your template has additional cart-mutating routes (e.g. a `/cart/upsell` endpoint, a "save for later" feature), apply the same pattern there.

---

## The cookie reader

A single helper that reads every identifier from `request.headers.Cookie` and returns the `[{key, value}]` shape Shopify expects.

```ts
// app/utils/attribution.ts

export function readNamedCookieFromHeader(
  cookieHeader: string | null | undefined,
  name: string,
): string | undefined {
  if (!cookieHeader) return undefined;
  const prefix = `${name}=`;
  const match = cookieHeader.split(/;\s*/).find((c) => c.startsWith(prefix));
  if (!match) return undefined;
  const value = match.slice(prefix.length);
  return value || undefined;
}

/** Parse `_ga` → GA4 client_id ("<rand>.<ts>"). */
export function readGaClientIdFromCookieHeader(
  cookieHeader: string | null | undefined,
): string | undefined {
  const raw = readNamedCookieFromHeader(cookieHeader, "_ga");
  if (!raw) return undefined;
  const parts = raw.split(".");
  return parts.length >= 4 ? `${parts[2]}.${parts[3]}` : undefined;
}

export function buildAttributionCartAttrsFromCookies(
  cookieHeader: string | null | undefined,
): Array<{ key: string; value: string }> {
  // Your own cross-subdomain attribution cookie (gclid, tj_clickid, ref, …)
  const attribution = readAttributionFromCookieHeader(cookieHeader);
  const clientId = readGaClientIdFromCookieHeader(cookieHeader);
  const fbp = readNamedCookieFromHeader(cookieHeader, "_fbp");
  const fbc = readNamedCookieFromHeader(cookieHeader, "_fbc");
  const gclid = attribution.gclid;
  const tjClickId = attribution.tj_clickid;
  // GoAffpro's loader normalises ref/aff/gfp_ref to one cookie; mirror.
  const goaffproRef =
    attribution.gfp_ref ?? attribution.ref ?? attribution.aff;

  const attrs: Array<{ key: string; value: string }> = [];
  // Prefix with `_` so they sort/cluster in the Shopify Order Admin UI
  // and don't collide with the merchant's own attribute keys.
  if (clientId) attrs.push({ key: "_segai_ga_client_id", value: clientId });
  if (fbp) attrs.push({ key: "_segai_fbp", value: fbp });
  if (fbc) attrs.push({ key: "_segai_fbc", value: fbc });
  if (gclid) attrs.push({ key: "_segai_gclid", value: gclid });
  if (tjClickId) attrs.push({ key: "_segai_tj_clickid", value: tjClickId });
  if (goaffproRef) attrs.push({ key: "_segai_goaffpro_ref", value: goaffproRef });
  return attrs;
}
```

(Rename the `_segai_` prefix to your own brand. Keep `_` leading-underscore — it conventionally signals "internal" in Shopify cart-attribute UIs and is preserved through to the order.)

---

## Reading them back in the webhook

```ts
// app/.server/tracking/shopify-order.ts
export function shopifyOrderToTrackEvent(order: ShopifyOrderPayload): TrackEvent {
  const noteAttr = (key: string): string | undefined =>
    order.note_attributes?.find((a) => a.name === key)?.value ?? undefined;

  const clientId    = noteAttr("_segai_ga_client_id");
  const fbp         = noteAttr("_segai_fbp");
  const fbc         = noteAttr("_segai_fbc");
  const gclid       = noteAttr("_segai_gclid");
  const tjClickId   = noteAttr("_segai_tj_clickid");
  const goaffproRef = noteAttr("_segai_goaffpro_ref");

  return {
    event_id: `purchase_${order.id}`, // deterministic dedup key
    event_name: "purchase",
    custom_data: {
      transaction_id: String(order.id),
      currency: order.currency,
      value: Number(order.total_price),
      items: /* ... */,
      // Forward identifiers under canonical keys each forwarder expects:
      ...(tjClickId   ? { tj_clickid:   tjClickId }   : {}),
      ...(goaffproRef ? { goaffpro_ref: goaffproRef } : {}),
      ...(fbp         ? { fbp }                       : {}),
      ...(fbc         ? { fbc }                       : {}),
      ...(gclid       ? { gclid }                     : {}),
    },
    user_data: {
      email: order.email,                            // hashed downstream
      phone: order.customer?.phone,                  // hashed downstream
      external_id: order.customer?.id?.toString(),
      client_id: clientId,                           // GA4 MP needs this
    },
    consent: {
      // Shopify's checkout enforced the customer's choice. The PII fields
      // wouldn't be on the order if the customer declined them, so we
      // declare full grant here to let downstream forwarders use them.
      analytics_storage: "granted",
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
    },
  };
}
```

Then forwarders fall back to `event.custom_data.fbp` / `.fbc` / `.gclid` when their request context doesn't have them (i.e. on the webhook path):

```ts
// app/.server/tracking/forwarders/meta-capi.ts
function buildUserData(event: ValidatedEvent, ctx: RequestContext): MetaUserData {
  const out: MetaUserData = {};
  // ...
  out.fbp = ctx.fbp ?? asString(event.custom_data?.fbp);
  out.fbc = ctx.fbc ?? asString(event.custom_data?.fbc);
  if (!out.fbp) delete out.fbp;
  if (!out.fbc) delete out.fbc;
  return out;
}
```

The Google Ads forwarder already accepts `event.custom_data.gclid` in most reference implementations. TJ / GoAffpro / Awin forwarders should read their identifier under a canonical key (e.g. `event.custom_data.tj_clickid`).

---

## Why not client-side stash?

A tempting alternative is to do the stash in a React `useEffect` somewhere — typically in the cart drawer or `<CartSummary>` component:

```tsx
// ❌ DON'T DO THIS — racy, mounts only when cart UI is rendered
useEffect(() => {
  const attribution = getAttribution();
  fetcher.submit({ cartFormInput: JSON.stringify({
    action: CartForm.ACTIONS.AttributesUpdateInput,
    inputs: { attributes: [...] },
  })}, { method: "POST", action: "/cart" });
}, [cart]);
```

This breaks in two ways:

1. **It only runs when the component mounts.** If the user goes PDP → "Buy now" → checkout, the cart drawer/page is never rendered → effect never runs → cart attrs stay empty.

2. **Race against checkout click.** Even when the drawer does open, the user can click "Continue to checkout" within ~200ms — before the async fetcher mutation completes — and navigate away with no attributes set.

The server-side stash runs in the same network round-trip as the cart mutation itself, so there's no race and no UI-mount dependency.

---

## What to verify after deploying

1. Visit `<site>.com/?tj_clickid=TEST_001&gclid=GCL_TEST&fbclid=FB_TEST` in incognito.
2. Add any item to cart (any flow — Add-to-Cart drawer, /cart page, or "Buy now").
3. In DevTools Network → the most recent `/cart` or `/cart/<id>:<qty>` request's response cart should now carry the `_*` attributes.
4. Complete checkout with the Bogus Gateway.
5. **Shopify Order Admin → Additional Details** lists every populated key.
6. **Meta Events Manager → Test Events**: the Purchase event shows `fbp` / `fbc` populated. Match-quality score for the Purchase event goes up.
7. **Google Ads conversion diagnostics**: Purchase matches on `gclid`. Enhanced Conversions match rate increases.
8. **GA4 DebugView**: the server-side purchase event arrives with the correct `client_id` (same as the user's storefront session).

---

## What's still racy: the cookie capture itself

This whole pattern presumes the user's cookies are already set when they touch the cart. There's a separate hydration-race concern:

```
SSR page render (0ms)
  ↓
hydration starts (~50–200ms)
  ↓
useEffect runs → captureAttributionFromUrl() writes segai_attr cookie  ← LATE
  ↓
user clicks "Buy now" → POST /cart/... with the cookie
```

If the user clicks faster than hydration completes, the cookie isn't set yet → cart-attribute stash sees an empty cookie → empty attrs on cart. This is a separate issue from what this doc covers. Options:

1. **Set the attribution cookie server-side from URL params** in your storefront route loader (e.g. add `Set-Cookie` to the root route's response). Trade-off: this disables Oxygen full-page cache for that response — see [`oxygen-full-page-cache.md`](./oxygen-full-page-cache.md).
2. **Read URL params directly in `lines.tsx`** as a fallback when the cookie isn't set yet:
   ```ts
   const cookieAttrs = buildAttributionCartAttrsFromCookies(request.headers.get("Cookie"));
   const urlAttrs = buildAttributionCartAttrsFromSearch(url.search); // mirror function
   const merged = mergeCartAttrs(urlAttrs, cookieAttrs); // url wins on absent keys
   ```
   (Doesn't help the POST /cart action path because the request URL there is `/cart` with no attribution params.)

For most flows where the user lands, browses, then converts, hydration completes long before any cart interaction. The race only matters for extremely fast "land → click Buy now" flows.

---

## Related references

- [`architecture.md`](./architecture.md) — the full client/server tracking topology
- [`webhook-forwarding-via-builder.md`](./webhook-forwarding-via-builder.md) — the Shopify Orders webhook → `/api/track` flow
- [`gotchas.md`](./gotchas.md) — assorted other traps
