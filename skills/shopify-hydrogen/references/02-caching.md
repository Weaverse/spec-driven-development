# Caching

Source: https://github.com/Shopify/hydrogen/blob/main/packages/hydrogen/src/cache/strategies.ts

## Cache Strategies

All strategies are imported from `@shopify/hydrogen` and passed as the `cache` option to `storefront.query()`.

```ts
import {CacheNone, CacheShort, CacheLong, CacheCustom} from '@shopify/hydrogen'
```

### CacheNone

Returns `{mode: 'no-store'}`. Use for user-specific or real-time data — cart, account, live inventory.

```ts
storefront.query(CART_QUERY, {cache: CacheNone()})
```

### CacheShort

```ts
// Defaults:
{mode: 'public', maxAge: 1, staleWhileRevalidate: 9}
```

Use for frequently updated data — product prices, availability.

```ts
storefront.query(PRODUCT_QUERY, {cache: CacheShort()})
// Override defaults:
storefront.query(PRODUCT_QUERY, {cache: CacheShort({maxAge: 5})})
```

### CacheLong

```ts
// Defaults:
{mode: 'public', maxAge: 3600, staleWhileRevalidate: 82800}
// = 1 hour maxAge, 23 hours staleWhileRevalidate
```

Use for stable, rarely-changing data — navigation menus, shop settings, collection structure.

```ts
storefront.query(SHOP_QUERY, {cache: CacheLong()})
```

### CacheCustom

Pass your own options directly. Full control.

```ts
storefront.query(QUERY, {
  cache: CacheCustom({
    mode: 'public',
    maxAge: 60 * 30,              // 30 minutes
    staleWhileRevalidate: 60 * 60 * 23,
    sMaxAge: 60 * 60,             // shared cache max-age
    staleIfError: 60 * 60 * 24,  // serve stale on error for 24hrs
  }),
})
```

## AllCacheOptions Type

```ts
interface AllCacheOptions {
  /** 'public', 'private', or 'no-store' */
  mode?: string
  /** max-age in seconds */
  maxAge?: number
  /** stale-while-revalidate in seconds */
  staleWhileRevalidate?: number
  /** s-maxage in seconds (shared caches only) */
  sMaxAge?: number
  /** stale-if-error in seconds */
  staleIfError?: number
}
```

> **Note:** When using `CacheShort` or `CacheLong` with overrides, `mode` must be `'public'` or `'private'`. Any other value throws: `"'mode' must be either 'public' or 'private'"`.

## generateCacheControlHeader

Converts a `CachingStrategy` object into a `Cache-Control` header string:

```ts
import {generateCacheControlHeader} from '@shopify/hydrogen'

generateCacheControlHeader({mode: 'public', maxAge: 60, staleWhileRevalidate: 3600})
// → 'public, max-age=60, stale-while-revalidate=3600'

generateCacheControlHeader({mode: 'no-store'})
// → 'no-store'
```

## What to Cache

| Data | Strategy | Reasoning |
|------|----------|-----------|
| Shop info, menus, policies | `CacheLong()` | Rarely changes |
| Collections, blogs | `CacheLong()` | Rarely changes |
| Product pages | `CacheShort()` | Price/availability can change |
| Search results | `CacheShort()` | Dynamic but acceptable lag |
| Cart | `CacheNone()` | Always user-specific |
| Account / orders | `CacheNone()` | Always user-specific |
| Predictive search | `CacheNone()` | Real-time |
