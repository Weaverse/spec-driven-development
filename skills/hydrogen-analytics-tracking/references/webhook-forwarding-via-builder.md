# Shopify Webhooks via Weaverse Builder — Internal Integration

How a Weaverse-hosted Hydrogen storefront should receive Shopify webhooks **without** leaking the multi-tenant Weaverse app client secret.

This pattern is the right answer for any storefront where Weaverse manages the Shopify app credentials (i.e. the customer doesn't have their own custom Shopify partner app). Server-side tracking (Meta CAPI, GA4 Measurement Protocol, Google Ads Enhanced Conversions) all need the `orders/create` webhook as their canonical Purchase trigger.

## The problem

The Weaverse Studio exposes a Shopify Admin API Proxy (`/api/admin-graphql`) using **Weaverse's own app credentials**. This works for reads (products, orders, customers) but breaks for **webhooks**:

- Shopify signs webhooks with the **app's API client secret**.
- If we subscribe a customer webhook via the Weaverse-app credentials, Shopify signs it with **Weaverse's secret**.
- For the customer's storefront to verify the signature, they'd have to:
  1. Receive Weaverse's client secret (cross-tenant data leak — every customer would have it).
  2. Skip signature verification (anyone can inject fake Purchase events).
  3. Set up a separate custom Shopify partner app (which is exactly the partner-permission friction the proxy was meant to remove).

None of the three is acceptable.

## The solution — webhook forwarding layer in builder

**Weaverse receives the webhook, verifies its own HMAC, then re-signs the body with a per-store secret the customer controls and POSTs to the customer's URL.**

```
Shopify ──orders/create (signed w/ Weaverse client secret)──► builder /api/webhooks/shopify
                                                                       │
                                                       WebhookValidator.verifyShopifyHMAC
                                                                       │
                                                                       ▼
                                                       lookup WebhookForward rows:
                                                       findMany({ shopDomain, topic, enabled })
                                                                       │
                                                                       ▼ (parallel, fire-and-forget, 5s timeout)
                                                          ┌────────────┴────────────┐
                                                      forward A                forward B
                                                  re-sign w/                 re-sign w/
                                                  forward.signingSecret      forward.signingSecret
                                                  POST                       POST
                                                          │                           │
                                                          ▼                           ▼
                                                  https://customer-a.com/  https://customer-b.com/
                                                  api/webhooks/            api/webhooks/
                                                  orders-create            orders-create
```

The customer endpoint sees what looks like a native Shopify webhook signed with **their own** secret. They verify with the standard `verifyShopifyHmac` pattern — no special Weaverse-aware client lib needed.

## Data model (`builder/prisma/schema.prisma`)

```prisma
model WebhookForward {
  id             String    @id @default(cuid())
  shopDomain     String    // e.g. "your-shop.myshopify.com"
  topic          String    // e.g. "orders/create" (slash-delimited, matches X-Shopify-Topic)
  callbackUrl    String    @db.VarChar(2048)
  // 32-byte hex from crypto.randomBytes. Returned ONCE on creation.
  // For v1 stored raw because we need it to sign outbound POSTs.
  // Hashed-only storage would require KMS for signing — over-engineering for v1.
  signingSecret  String    @db.VarChar(128)
  enabled        Boolean   @default(true)
  failureCount   Int       @default(0)
  lastFiredAt    DateTime?
  lastErrorAt    DateTime?
  lastError      String?   @db.VarChar(512)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  @@index([shopDomain, topic, enabled])
}
```

## Public API surface (v1, builder-side)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/webhook-forwards` | Create. Body: `{ topic, callbackUrl }`. **Returns `{ id, signingSecret }` — secret shown ONCE**. |
| `GET` | `/api/webhook-forwards` | List forwards for the authenticated shop. |
| `DELETE` | `/api/webhook-forwards/:id` | Remove. Auto-unsubscribes from Shopify if last forward for the topic. |
| `POST` | `/api/webhook-forwards/:id/rotate` | Rotate signing secret. Returns new secret ONCE. |

Auth: same Bearer-token mechanism as `/api/admin-graphql` (Weaverse API key), scoped to the calling shop.

### Auto-subscribe on create

When the first `WebhookForward` for `(shopDomain, topic)` is created, builder calls Shopify's `webhookSubscriptionCreate` with `callbackUrl = {builderHost}/api/webhooks/shopify` using the Weaverse app credentials. Scope availability is checked first — if `read_orders` is missing for an `orders/create` forward, the API returns `400` with a clear message pointing the customer at the scopes UI.

### Auto-unsubscribe on delete

When the last forward for `(shopDomain, topic)` is removed, builder calls `webhookSubscriptionDelete` to clean up. No orphan subscriptions left in the customer's Shopify.

## Outbound POST shape (what the customer storefront receives)

```
POST {callbackUrl}
Content-Type:           application/json
X-Shopify-Topic:        orders/create          ← passed through verbatim
X-Shopify-Shop-Domain:  store.myshopify.com    ← passed through
X-Shopify-Hmac-Sha256:  <base64 HMAC-SHA256 of body using forward.signingSecret>
X-Weaverse-Forwarded:   1                      ← marker, future-proofs if we ever proxy other sources
User-Agent:             Weaverse-Webhook-Forwarder/1.0

<original Shopify webhook body, byte-for-byte>
```

**Key property:** body is forwarded **verbatim**. No re-serialisation, no reformatting. This is critical because the customer's HMAC verifier hashes the raw bytes; any whitespace or key-order change would invalidate the signature.

## Customer storefront — receiver code (no special handling needed)

The exact same `/api/webhooks/orders-create` route that would work with a native Shopify webhook works unchanged:

```ts
// app/routes/api/webhooks-orders-create.ts
export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== "POST") return new Response("method_not_allowed", { status: 405 });

  const secret = context.env.SHOPIFY_WEBHOOK_SECRET;  // ← THE FORWARD'S SECRET, not Weaverse's
  if (!secret) return new Response("not_configured", { status: 503 });

  // Read the raw body for HMAC — never re-serialise from parsed JSON.
  const rawBody = await request.text();
  const hmacHeader = request.headers.get("x-shopify-hmac-sha256");
  const valid = await verifyShopifyHmac(rawBody, hmacHeader, secret);
  if (!valid) return new Response("invalid_signature", { status: 401 });

  const order = JSON.parse(rawBody);
  const event = shopifyOrderToTrackEvent(order);

  await Promise.all([
    forwardToGa4(event, context.env, {}),
    forwardToMetaCapi(event, context.env, {}),
    forwardToGoogleAds(event, context.env, {}),
  ]);

  return new Response("ok", { status: 200 });
}
```

The receiver doesn't know (or care) whether the webhook came from Shopify directly or via Weaverse's forwarder. Same code path, same HMAC scheme, same secret algorithm — just a different secret value.

### Optional: distinguish forwarded vs native

If you want to log / alert differently for forwarded webhooks, check the header:

```ts
const forwarded = request.headers.get("x-weaverse-forwarded") === "1";
```

99% of the time you don't need to. The contract is intentionally identical to a native webhook so customer code doesn't need to know.

## Setting up a new storefront — operator flow

```bash
# 1. Customer calls Weaverse API (Studio UI in Phase 2; curl for now)
curl -X POST https://builder.weaverse.io/api/webhook-forwards \
  -H "Authorization: Bearer ${WEAVERSE_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "orders/create",
    "callbackUrl": "https://www.customer-store.com/api/webhooks/orders-create"
  }'

# Response (capture signingSecret IMMEDIATELY — shown only once):
# {
#   "id": "clxyz1234",
#   "signingSecret": "9b8a7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b"
# }

# 2. Set the secret on the storefront's Oxygen env vars
# (Shopify admin → Hydrogen → Storefront → Environments → Custom variables)
SHOPIFY_WEBHOOK_SECRET=9b8a7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b

# 3. Trigger a test order in Shopify. Confirm /api/webhooks/orders-create responds 200
# and the audit log shows forwarder results for GA4 / Meta / Google Ads.
```

### What if the topic is already subscribed?

Builder de-duplicates subscriptions on `(shopDomain, topic)`. Adding a second `WebhookForward` for `(customer-shop.myshopify.com, orders/create)` after the first will:
- Reuse the existing Shopify subscription (one is enough — Shopify will deliver to the same builder URL).
- Insert a new `WebhookForward` row with its own signing secret.
- Builder fans out to BOTH forwards in parallel on each webhook delivery.

Useful for staging + prod URLs, or multi-recipient (e.g. forward to both the customer's storefront and an analytics aggregator).

## Failure model

- **5s timeout per forward.** If the customer endpoint hangs, the request is abandoned. Shopify never sees the failure (we always ack 200 to Shopify regardless of customer endpoint health).
- **On non-2xx or timeout:** increment `failureCount`, set `lastError` + `lastErrorAt`. No in-request retry.
- **After 100 consecutive failures:** auto-disable (`enabled = false`) + Studio notification. Threshold tunable.
- **No replay queue in v1.** Shopify retries non-2xx for ~48h with backoff, but builder always ack 200, so we don't benefit from Shopify's retry. Phase 3 may add a queue if customer endpoints prove unreliable.

## Security properties

- **Per-row signing secret.** 32 bytes from `crypto.randomBytes`, hex-encoded. Compromise of one customer's secret affects only that customer.
- **HTTPS-only.** Plain HTTP `callbackUrl` rejected on create.
- **No internal/private IPs.** SSRF prevention — internal `10.*`, `192.168.*`, `localhost`, etc. blocked at create-time and at outbound-POST time.
- **Verbatim body.** Builder does not introspect or rewrite the payload. PII handling stays on the customer side where their privacy policy + DPA apply.

## Comparing the two paths

| Aspect | Direct Shopify webhook (via custom partner app) | Builder webhook forwarding |
|---|---|---|
| Setup steps | Create custom Shopify partner app → install → grant scopes → copy webhook secret | Single API call to builder; secret returned in response |
| Per-store secret | ✅ (each store's app has its own secret) | ✅ (each `WebhookForward` row has its own secret) |
| Multi-tenant Weaverse secret exposure | N/A (no Weaverse involvement) | ❌ never leaves builder |
| Auto-unsubscribe on cleanup | Manual | ✅ automatic on last delete |
| Maintenance overhead | Customer manages app lifecycle | None — builder owns the subscription |
| Works for storefronts without their own Shopify partner app | ❌ | ✅ |

The builder path is the right answer when:
- Weaverse manages the Shopify app credentials for the customer (most Weaverse-hosted storefronts).
- The customer doesn't need direct OAuth-level Shopify access.
- You want to centralise webhook reliability monitoring at the platform level.

Direct webhooks are still appropriate when:
- The customer already has their own Shopify partner app (e.g. larger merchants with their own dev team).
- They need topics not on Weaverse's app scope list.

## Status as of last update (2026-05-13)

Phase 1 implemented in `builder/feat/shopify-webhook-forwarding` branch. Pending:
- Prisma `db push` (coordinate with backend lead before pushing).
- First-customer cutover from their current direct-webhook setup to forwarded.
- Phase 2: Studio Account UI for managing forwards (curl-only for now).

## Reference

- Spec: `builder/.specs/2026-05-04--shopify-webhook-forwarding/README.md`
- HMAC verification on customer side: same `verifyShopifyHmac` implementation as for native Shopify webhooks. See [`architecture.md`](./architecture.md) for the storefront-side receiver code.
