# Cart

Sources:
- https://github.com/Shopify/hydrogen/blob/main/packages/hydrogen/src/cart/createCartHandler.ts
- https://github.com/Shopify/hydrogen/blob/main/packages/hydrogen/src/cart/CartForm.tsx

## Cart Route Setup

All cart mutations are handled via a dedicated cart route action:

```ts
// app/routes/cart.tsx
import {json} from 'react-router'
import {CartForm} from '@shopify/hydrogen'
import type {ActionFunctionArgs} from 'react-router'

export async function action({context, request}: ActionFunctionArgs) {
  const {cart} = context
  const formData = await request.formData()
  const {action, inputs} = CartForm.getFormInput(formData)

  switch (action) {
    case CartForm.ACTIONS.LinesAdd:
      return json(await cart.addLines(inputs.lines))
    case CartForm.ACTIONS.LinesUpdate:
      return json(await cart.updateLines(inputs.lines))
    case CartForm.ACTIONS.LinesRemove:
      return json(await cart.removeLines(inputs.lineIds))
    case CartForm.ACTIONS.DiscountCodesUpdate:
      return json(await cart.updateDiscountCodes(inputs.discountCodes))
    case CartForm.ACTIONS.BuyerIdentityUpdate:
      return json(await cart.updateBuyerIdentity(inputs.buyerIdentity))
    case CartForm.ACTIONS.NoteUpdate:
      return json(await cart.updateNote(inputs.note))
    default:
      throw new Error(`Unknown cart action: ${action}`)
  }
}

export async function loader({context}: LoaderFunctionArgs) {
  return json(await context.cart.get())
}
```

## CartForm

A form component that uses React Router's `useFetcher` internally. Submits a hidden `cartFormInput` field containing the serialized action and inputs.

```tsx
import {CartForm} from '@shopify/hydrogen'

// Children can be a render prop — receives the fetcher
<CartForm
  route="/cart"
  action={CartForm.ACTIONS.LinesAdd}
  inputs={{lines: [{merchandiseId: variantId, quantity: 1, selectedVariant}]}}
>
  {(fetcher) => (
    <button type="submit" disabled={fetcher.state !== 'idle'}>
      {fetcher.state !== 'idle' ? 'Adding...' : 'Add to cart'}
    </button>
  )}
</CartForm>

// Or plain children
<CartForm route="/cart" action={CartForm.ACTIONS.LinesRemove} inputs={{lineIds: [lineId]}}>
  <button type="submit">Remove</button>
</CartForm>
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `action` | `CartForm.ACTIONS[key]` | The cart action to perform |
| `inputs` | object | Action-specific inputs (see below) |
| `route` | `string` | Route to submit to. Defaults to current route |
| `fetcherKey` | `string` | Optional key for `useFetcher` |
| `children` | `ReactNode \| (fetcher) => ReactNode` | Render prop receives fetcher |

## CartForm.ACTIONS

```ts
CartForm.ACTIONS = {
  AttributesUpdateInput: 'AttributesUpdateInput',
  BuyerIdentityUpdate: 'BuyerIdentityUpdate',
  Create: 'Create',
  DiscountCodesUpdate: 'DiscountCodesUpdate',
  GiftCardCodesUpdate: 'GiftCardCodesUpdate',
  GiftCardCodesAdd: 'GiftCardCodesAdd',
  GiftCardCodesRemove: 'GiftCardCodesRemove',
  LinesAdd: 'LinesAdd',
  LinesRemove: 'LinesRemove',
  LinesUpdate: 'LinesUpdate',
  NoteUpdate: 'NoteUpdate',
  SelectedDeliveryOptionsUpdate: 'SelectedDeliveryOptionsUpdate',
  MetafieldsSet: 'MetafieldsSet',
  MetafieldDelete: 'MetafieldDelete',
  DeliveryAddressesAdd: 'DeliveryAddressesAdd',
  DeliveryAddressesUpdate: 'DeliveryAddressesUpdate',
  DeliveryAddressesRemove: 'DeliveryAddressesRemove',
  DeliveryAddressesReplace: 'DeliveryAddressesReplace',
}
```

**Inputs per action:**

| Action | Required inputs |
|--------|----------------|
| `LinesAdd` | `lines: OptimisticCartLineInput[]` — include `selectedVariant` for optimistic UI |
| `LinesUpdate` | `lines: CartLineUpdateInput[]` |
| `LinesRemove` | `lineIds: string[]` |
| `DiscountCodesUpdate` | `discountCodes: string[]` |
| `GiftCardCodesUpdate` | `giftCardCodes: string[]` |
| `GiftCardCodesAdd` | `giftCardCodes: string[]` |
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

## CartForm.getFormInput

Parses a `FormData` object into a `CartActionInput`. Checkbox values are auto-coerced: `'on'` → `true`, `'off'` → `false`. Other form fields are merged into `inputs`.

```ts
const {action, inputs} = CartForm.getFormInput(formData)
```

## useOptimisticCart

Applies pending cart mutations optimistically before the server responds. Requires `selectedVariant` to be passed in `LinesAdd` inputs.

```tsx
import {useOptimisticCart} from '@shopify/hydrogen'

function Cart({cart: serverCart}) {
  const cart = useOptimisticCart(serverCart)

  return (
    <ul>
      {cart.lines.nodes.map((line) => (
        <li key={line.id} style={{opacity: line.isOptimistic ? 0.5 : 1}}>
          {line.merchandise.product.title}
          {line.isOptimistic && ' (adding...)'}
        </li>
      ))}
    </ul>
  )
}
```

**Optimistic cart properties:**

| Property | Description |
|----------|-------------|
| `cart.isOptimistic` | `true` when any optimistic state is pending |
| `line.isOptimistic` | `true` for lines not yet confirmed by the server |
| `cart.totalQuantity` | Recalculated to include optimistic lines |
| `cart.cost` | Recalculated optimistically when possible |

> If `selectedVariant` is missing from a `LinesAdd` input, `useOptimisticCart` logs a warning and skips the optimistic update for that line.

## Auto-creating the Cart

Several methods automatically create a new cart if none exists:

- `addLines` — creates cart with the lines
- `updateDiscountCodes` — creates cart with discount codes
- `updateGiftCardCodes` — creates cart with gift card codes
- `updateBuyerIdentity` — creates cart with buyer identity
- `updateNote` — creates cart with note
- `updateAttributes` — creates cart with attributes
- `setMetafields` — creates cart with metafields

Methods that do NOT auto-create (they require an existing cart ID):
`updateLines`, `removeLines`, `removeGiftCardCodes`, `updateSelectedDeliveryOption`, `deleteMetafield`, all delivery address methods.

## Custom Methods

```ts
const cart = createCartHandler({
  storefront,
  getCartId: cartGetIdDefault(request.headers),
  setCartId: cartSetIdDefault(),
  customMethods: {
    // Override existing method
    addLines: async (lines, params) => {
      // custom logic before/after
      return cartHandler.addLines(lines, params)
    },
    // Add new method
    addLineWithTracking: async (line, params) => {
      trackEvent('add_to_cart', line)
      return cartHandler.addLines([line], params)
    },
  },
})
```
