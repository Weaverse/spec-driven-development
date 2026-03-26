# Setup: createHydrogenContext

Source: https://github.com/Shopify/hydrogen/blob/main/packages/hydrogen/src/createHydrogenContext.ts

## Overview

`createHydrogenContext` is the single entry point to set up all Hydrogen services in `server.ts`. It creates and wires together `storefront`, `customerAccount`, and `cart`, and returns a React Router context provider.

## Full Type Signature

```ts
function createHydrogenContext<TAdditionalContext>(
  options: HydrogenContextOptions,
  additionalContext?: TAdditionalContext,
): HydrogenRouterContextProvider & TAdditionalContext
```

## HydrogenContextOptions

```ts
type HydrogenContextOptions = {
  /** Environment variables from the fetch function */
  env: HydrogenEnv

  /** Request object from the fetch function */
  request: CrossRuntimeRequest

  /** An instance implementing the Cache API */
  cache?: Cache

  /** Keep request/response lifecycle alive after response is sent */
  waitUntil?: WaitUntil

  /** Cookie session implementation */
  session: HydrogenSession

  /** Country code and language code for i18n */
  i18n?: {language: string; country: string}

  /** Whether to print GraphQL errors automatically. Defaults to true */
  logErrors?: boolean | ((error?: Error) => boolean)

  /** Storefront client overrides */
  storefront?: {
    headers?: StorefrontHeaders      // default: parsed from request
    apiVersion?: string              // override Storefront API version
  }

  /** Customer Account client overrides */
  customerAccount?: {
    apiVersion?: string
    authUrl?: string                 // default: '/account/authorize'
    customAuthStatusHandler?: () => Response | NonNullable<unknown> | null
  }

  /** Cart handler overrides */
  cart?: {
    getId?: () => string | undefined
    setId?: (cartId: string) => Headers
    queryFragment?: string           // override cart.get() query
    mutateFragment?: string          // override mutation fragment
    customMethods?: Record<string, Function>
  }

  /** Default buyer identity passed to cartCreate */
  buyerIdentity?: CartBuyerIdentityInput
}
```

## Required Env Vars

```bash
PUBLIC_STORE_DOMAIN=                    # e.g. mystore.myshopify.com
PUBLIC_STOREFRONT_API_TOKEN=            # public token
PRIVATE_STOREFRONT_API_TOKEN=           # private token (server-only)
PUBLIC_STOREFRONT_ID=                   # storefront ID
PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID=  # customer account client ID
SHOP_ID=                                # shop ID
PUBLIC_CHECKOUT_DOMAIN=                 # checkout domain for CSP
```

## Minimal server.ts

```ts
import {createHydrogenContext} from '@shopify/hydrogen'
import {AppSession} from '~/lib/session'

export default {
  async fetch(request: Request, env: Env, executionContext: ExecutionContext) {
    const session = await AppSession.init(request, [env.SESSION_SECRET])

    const hydrogenContext = createHydrogenContext(
      {
        env,
        request,
        cache: await caches.open('hydrogen'),
        waitUntil: executionContext.waitUntil.bind(executionContext),
        session,
        i18n: getLocaleFromRequest(request),
      },
      // Optional additional context — e.g. CMS client, feature flags
      // {weaverse: new WeaverseClient({...})}
    )

    // hydrogenContext exposes: storefront, customerAccount, cart
    // plus React Router context provider methods

    return handleRequest(request, {context: hydrogenContext})
  },
}
```

## Accessing Context in Routes

```ts
// In loaders and actions:
export async function loader({context}: LoaderFunctionArgs) {
  const {storefront, cart, customerAccount} = context

  const {product} = await storefront.query(PRODUCT_QUERY, {
    variables: {handle: params.handle},
    cache: CacheShort(),
  })

  return {product}
}
```

## Custom Cart Methods

```ts
const hydrogenContext = createHydrogenContext({
  // ...
  cart: {
    customMethods: {
      addLineWithAnalytics: async (lines, params) => {
        // custom logic
        return cart.addLines(lines, params)
      },
    },
  },
})

// Then in routes:
const {cart} = context
await cart.addLineWithAnalytics(lines)
```

## Session Implementation

Hydrogen ships with `HydrogenSession`. Typical implementation:

```ts
import {createCookieSessionStorage} from 'react-router'
import type {HydrogenSession} from '@shopify/hydrogen'

export class AppSession implements HydrogenSession {
  public isPending = false
  #sessionStorage
  #session

  static async init(request: Request, secrets: string[]) {
    const storage = createCookieSessionStorage({
      cookie: {
        name: 'session',
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secrets,
      },
    })
    const session = await storage.getSession(request.headers.get('Cookie'))
    return new AppSession(storage, session)
  }

  get(key: string) { return this.#session.get(key) }
  set(key: string, value: unknown) {
    this.isPending = true
    this.#session.set(key, value)
  }
  unset(key: string) {
    this.isPending = true
    this.#session.unset(key)
  }
  commit() {
    this.isPending = false
    return this.#sessionStorage.commitSession(this.#session)
  }
  destroy() { return this.#sessionStorage.destroySession(this.#session) }
}
```
