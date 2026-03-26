---
name: shopify-hydrogen
description: "Core Shopify Hydrogen APIs — createHydrogenContext, cart handler, CartForm, caching strategies, pagination, SEO, variant selection, analytics, and CSP. Based on source at github.com/Shopify/hydrogen."
---

# Shopify Hydrogen

Hydrogen is Shopify's opinionated stack for headless commerce, built on React Router v7. It provides utilities, handlers, and components for building storefronts on top of the Shopify Storefront API.

**All exports come from `@shopify/hydrogen`**, which re-exports everything from `@shopify/hydrogen-react`.

> Source: https://github.com/Shopify/hydrogen/tree/main/packages/hydrogen/src

---

## createHydrogenContext

The recommended single entry point to set up all Hydrogen services in `server.ts`. Creates and wires together `storefront`, `customerAccount`, and `cart`.

```ts
import {createHydrogenContext} from '@shopify/hydrogen'

export async function createAppLoadContext(request, env, executionContext) {
  const hydrogenContext = createHydrogenContext({
    env,
    request,
    cache: await caches.open('hydrogen'),
    waitUntil: executionContext.waitUntil.bind(executionContext),
    session,
    i18n: {language: 'EN', country: 'US'},
    // Optional overrides:
    storefront: {apiVersion: '2026-01'},
    customerAccount: {authUrl: '/account/authorize'},
    cart: {
      queryFragment: CUSTOM_CART_FRAGMENT,
      mutateFragment: CUSTOM_MUTATE_FRAGMENT,
      customMethods: {},
    },
  })
  return {...hydrogenContext}
}
```

**Required env vars:**
- `PUBLIC_STORE_DOMAIN`
- `PUBLIC_STOREFRONT_API_TOKEN`
- `PRIVATE_STOREFRONT_API_TOKEN`
- `PUBLIC_STOREFRONT_ID`
- `PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID`
- `SHOP_ID`

**Returns:** `{ storefront, customerAccount, cart }` — plus React Router context provider.

See [references/01-setup.md](references/01-setup.md).

---

## Caching

```ts
import {CacheNone, CacheShort, CacheLong, CacheCustom, generateCacheControlHeader} from '@shopify/hydrogen'
```

| Strategy | `maxAge` | `staleWhileRevalidate` | Use for |
|----------|----------|------------------------|---------|
| `CacheNone()` | — | — | User-specific or real-time data |
| `CacheShort()` | 1s | 9s | Frequently changing data |
| `CacheLong()` | 1hr (3600s) | 23hr (82800s) | Stable data (shop info, menus) |
| `CacheCustom({...})` | custom | custom | Fine-grained control |

```ts
const {product} = await storefront.query(PRODUCT_QUERY, {
  variables: {handle},
  cache: CacheShort(),
})
```

All strategies accept optional override options. `mode` must be `'public'` or `'private'` — any other value throws.

```ts
// Generate a Cache-Control header string manually:
const header = generateCacheControlHeader({
  mode: 'public',
  maxAge: 60,
  staleWhileRevalidate: 3600,
})
// → 'public, max-age=60, stale-while-revalidate=3600'
```

See [references/02-caching.md](references/02-caching.md).

---

## Cart

### createCartHandler

```ts
import {createCartHandler, cartGetIdDefault, cartSetIdDefault} from '@shopify/hydrogen'

const cart = createCartHandler({
  storefront,
  customerAccount,
  getCartId: cartGetIdDefault(request.headers),
  setCartId: cartSetIdDefault(),
  cartQueryFragment: CUSTOM_CART_FRAGMENT,    // optional
  cartMutateFragment: CUSTOM_MUTATE_FRAGMENT, // optional
  customMethods: {},                          // optional
})
```

**All cart methods:**

| Method | Description |
|--------|-------------|
| `cart.get()` | Fetch current cart |
| `cart.create(input)` | Create a new cart |
| `cart.addLines(lines)` | Add items (creates cart if needed) |
| `cart.updateLines(lines)` | Update line quantities |
| `cart.removeLines(lineIds)` | Remove lines |
| `cart.updateDiscountCodes(codes)` | Apply/remove discount codes |
| `cart.addGiftCardCodes(codes)` | Add gift card codes |
| `cart.updateGiftCardCodes(codes)` | Update gift card codes |
| `cart.removeGiftCardCodes(codes)` | Remove gift card codes |
| `cart.updateBuyerIdentity(identity)` | Update buyer info |
| `cart.updateNote(note)` | Update cart note |
| `cart.updateAttributes(attributes)` | Update cart attributes |
| `cart.updateSelectedDeliveryOption(input)` | Update delivery option |
| `cart.setMetafields(metafields)` | Add/update metafields |
| `cart.deleteMetafield(metafield)` | Delete a metafield |
| `cart.addDeliveryAddresses(addresses)` | Add delivery addresses |
| `cart.removeDeliveryAddresses(addressIds)` | Remove delivery addresses |
| `cart.updateDeliveryAddresses(addresses)` | Update delivery addresses |
| `cart.replaceDeliveryAddresses(addresses)` | Replace all delivery addresses |

### CartForm

Form component for cart mutations. Submits to a route action via React Router's `useFetcher`.

```tsx
import {CartForm} from '@shopify/hydrogen'

<CartForm
  route="/cart"
  action={CartForm.ACTIONS.LinesAdd}
  inputs={{lines: [{merchandiseId: variantId, quantity: 1}]}}
>
  {(fetcher) => (
    <button type="submit" disabled={fetcher.state !== 'idle'}>
      Add to cart
    </button>
  )}
</CartForm>
```

**All `CartForm.ACTIONS`:**

| Action | inputs required |
|--------|----------------|
| `LinesAdd` | `lines: OptimisticCartLineInput[]` |
| `LinesUpdate` | `lines: CartLineUpdateInput[]` |
| `LinesRemove` | `lineIds: string[]` |
| `DiscountCodesUpdate` | `discountCodes: string[]` |
| `GiftCardCodesAdd` | `giftCardCodes: string[]` |
| `GiftCardCodesUpdate` | `giftCardCodes: string[]` |
| `GiftCardCodesRemove` | `giftCardCodes: string[]` |
| `BuyerIdentityUpdate` | `buyerIdentity: CartBuyerIdentityInput` |
| `NoteUpdate` | `note: string` |
| `AttributesUpdateInput` | `attributes: AttributeInput[]` |
| `SelectedDeliveryOptionsUpdate` | `selectedDeliveryOptions: CartSelectedDeliveryOptionInput[]` |
| `MetafieldsSet` | `metafields: MetafieldWithoutOwnerId[]` |
| `MetafieldDelete` | `key: string` |
| `DeliveryAddressesAdd` | `addresses: CartSelectableAddressInput[]` |
| `DeliveryAddressesUpdate` | `addresses: CartSelectableAddressUpdateInput[]` |
| `DeliveryAddressesRemove` | `addressIds: string[]` |
| `DeliveryAddressesReplace` | `addresses: CartSelectableAddressInput[]` |

**In the cart route action:**
```ts
const {action, inputs} = CartForm.getFormInput(formData)
// Checkbox values are automatically coerced: 'on' → true, 'off' → false
```

### useOptimisticCart

Applies pending cart mutations locally for instant UI feedback before the server responds. Requires passing `selectedVariant` in `LinesAdd` inputs.

```tsx
import {useOptimisticCart} from '@shopify/hydrogen'

function Cart({cart: serverCart}) {
  const cart = useOptimisticCart(serverCart)
  // cart.lines.nodes — lines with isOptimistic: true are not yet confirmed
  // cart.isOptimistic — true when any optimistic state is pending
  // cart.totalQuantity — recalculated optimistically
}
```

**Important:** Pass `selectedVariant` in `LinesAdd` inputs, otherwise `useOptimisticCart` will log an error and skip the optimistic update:

```tsx
<CartForm
  action={CartForm.ACTIONS.LinesAdd}
  inputs={{lines: [{merchandiseId: variantId, quantity: 1, selectedVariant}]}}
>
```

See [references/03-cart.md](references/03-cart.md).

---

## Pagination

```ts
import {getPaginationVariables, Pagination} from '@shopify/hydrogen'

// In loader:
const variables = getPaginationVariables(request, {
  pageBy: 12,
  namespace: '',  // use when multiple Pagination components are on the same page
})
```

```tsx
<Pagination connection={collection.products} namespace="">
  {({nodes, PreviousLink, NextLink, isLoading, hasPreviousPage, hasNextPage, state}) => (
    <>
      {hasPreviousPage && <PreviousLink>Load previous</PreviousLink>}
      <ProductGrid products={nodes} />
      {hasNextPage && <NextLink>{isLoading ? 'Loading...' : 'Load more'}</NextLink>}
    </>
  )}
</Pagination>
```

- `PreviousLink` / `NextLink` render `null` automatically when there's no adjacent page
- GraphQL query **must** include `pageInfo { hasPreviousPage hasNextPage startCursor endCursor }`
- Use `namespace` when multiple `Pagination` components share the same page to avoid URL param conflicts

---

## SEO

### getSeoMeta

Generates a React Router `meta` array from one or more SEO config objects. Works like `Object.assign` — later values overwrite earlier ones. Exception: `jsonLd` is **concatenated**, so each route keeps its own structured data.

```tsx
import {getSeoMeta} from '@shopify/hydrogen'

export const meta = ({data, matches}) => {
  return getSeoMeta(
    matches[0]?.data?.seo,  // parent route (lower priority)
    data?.seo,              // current route (higher priority)
  )
}
```

**`SeoConfig` shape:**
```ts
type SeoConfig = {
  title?: string            // → <title>, og:title, twitter:title
  titleTemplate?: string    // e.g. '%s | My Store'
  description?: string      // → <meta name="description">, og:description, twitter:description
  url?: string              // → <link rel="canonical">, og:url (trailing slash + query params stripped)
  handle?: string           // Twitter @handle → twitter:site, twitter:creator
  media?: {url, width, height, altText, type?} | string
  jsonLd?: WithContext<Thing>  // Schema.org — concatenated across routes
  robots?: {
    noIndex?: boolean
    noFollow?: boolean
    noArchive?: boolean
    noSnippet?: boolean
    noImageIndex?: boolean
    noTranslate?: boolean
    maxImagePreview?: string
    maxSnippet?: number
    maxVideoPreview?: number
    unavailableAfter?: string
  }
  alternates?: Array<{url: string; language?: string; default?: boolean}>
}
```

### getSitemapIndex + getSitemap

Two-level sitemap. Requires Storefront API **2024-10 or later**.

```ts
// app/routes/sitemap[.xml].tsx — index
import {getSitemapIndex} from '@shopify/hydrogen'

export async function loader({request, context: {storefront}}) {
  return getSitemapIndex({
    storefront,
    request,
    types: ['products', 'collections', 'pages', 'articles', 'blogs', 'metaObjects'],
    customChildSitemaps: ['/sitemap/custom/1.xml'],
  })
}

// app/routes/sitemap.$type.$page[.xml].tsx — per-type pages
import {getSitemap} from '@shopify/hydrogen'

export async function loader({request, params, context: {storefront}}) {
  return getSitemap({
    storefront,
    request,
    params,
    locales: ['EN-US', 'FR-CA'],
    getLink: ({type, baseUrl, handle, locale}) =>
      locale ? `${baseUrl}/${locale}/${type}/${handle}` : `${baseUrl}/${type}/${handle}`,
  })
}
```

---

## Content Security Policy

```ts
import {createContentSecurityPolicy, useNonce} from '@shopify/hydrogen'

// In entry.server.tsx:
const {nonce, header, NonceProvider} = createContentSecurityPolicy({
  shop: {
    checkoutDomain: env.PUBLIC_CHECKOUT_DOMAIN,
    storeDomain: env.PUBLIC_STORE_DOMAIN,
  },
  // Add extra sources as needed:
  scriptSrc: ['https://www.googletagmanager.com'],
  connectSrc: ['https://vitals.vercel-insights.com'],
})

responseHeaders.set('Content-Security-Policy', header)

const body = await renderToReadableStream(
  <NonceProvider>
    <ServerRouter context={remixContext} url={request.url} nonce={nonce} />
  </NonceProvider>,
  {nonce, signal: request.signal}
)

// In any component:
const nonce = useNonce()
```

---

## References

| File | Contents |
|------|----------|
| [references/01-setup.md](references/01-setup.md) | Full `server.ts` setup, env vars, session, `createHydrogenContext` options |
| [references/02-caching.md](references/02-caching.md) | Cache strategies, `AllCacheOptions` type, `generateCacheControlHeader` |
| [references/03-cart.md](references/03-cart.md) | Cart route setup, `CartForm` examples, `useOptimisticCart` patterns |
