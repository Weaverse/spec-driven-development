# 05 — Data Fetching

> Loaders, Storefront API, caching, parallel fetching, fetchWithCache.

## Core Concept

Weaverse components fetch their own data via **loader functions**. The loader runs on the server, and its return value is passed to the component as `props.loaderData`.

```tsx
import type { ComponentLoaderArgs, HydrogenComponentProps } from '@weaverse/hydrogen';

type InputData = { productHandle: string };

// Server-side data fetching
export let loader = async ({ weaverse, data }: ComponentLoaderArgs<InputData>) => {
  let { storefront } = weaverse;
  if (!data.productHandle) return null;
  return await storefront.query(PRODUCT_QUERY, {
    variables: { handle: data.productHandle },
  });
};

// Typed props from loader
type Props = HydrogenComponentProps<Awaited<ReturnType<typeof loader>>> & InputData;

function MyComponent({ loaderData, ...rest }: Props) {
  let product = loaderData?.product;
  if (!product) return <div {...rest}>Select a product</div>;
  return <div {...rest}><h2>{product.title}</h2></div>;
}

export default MyComponent;
```

## ComponentLoaderArgs

type ComponentLoaderArgs<T> = {
  weaverse: WeaverseClient;  // Access to storefront, fetchWithCache, env
  data: T;                   // Component's current settings data

### `weaverse` Properties

| Property | Usage |
|----------|-------|
| `weaverse.storefront` | Shopify Storefront API client |
| `weaverse.storefront.query()` | Execute GraphQL queries |
| `weaverse.storefront.i18n` | Current locale (`language`, `country`) |
| `weaverse.fetchWithCache()` | Fetch external APIs with caching |
| `weaverse.env` | Environment variables |

### `data` Properties

The `data` object contains the component's current settings as configured by the merchant in Studio. Its shape matches the `name` fields in your schema inputs.

---

## Shopify Storefront API

export let loader = async ({ weaverse, data }: ComponentLoaderArgs<CollectionData>) => {

  return await storefront.query(COLLECTION_QUERY, {
    variables: {
      handle: data.collection?.handle,
      first: data.productsCount || 4,
      language: storefront.i18n.language,
      country: storefront.i18n.country,
    },

const COLLECTION_QUERY = `#graphql
  query CollectionProducts(
    $handle: String!,
    $first: Int!,
    $language: LanguageCode,
    $country: CountryCode
  ) @inContext(language: $language, country: $country) {
    collection(handle: $handle) {
      id
      title
      handle
      products(first: $first) {
        nodes {
          priceRange {
            minVariantPrice {
              amount
              currencyCode
          featuredImage {
            url
            altText
            width
            height
` as const;


## External APIs with fetchWithCache

For non-Shopify APIs, use `weaverse.fetchWithCache()`:

export let loader = async ({ weaverse, data }: ComponentLoaderArgs<WeatherData>) => {
  let { fetchWithCache, env } = weaverse;

  return await fetchWithCache<WeatherResponse>(
    `https://api.weather.example/forecast?city=${data.city}`,
    {
      headers: { 'API-Key': env.WEATHER_API_KEY },
      strategy: {
        maxAge: 300,                // Cache 5 minutes
        staleWhileRevalidate: 3600, // Stale-while-revalidate 1 hour
  );


## Parallel Fetching

Fetch from multiple sources simultaneously for better performance:

export let loader = async ({ weaverse, data }: ComponentLoaderArgs<ProductDetailData>) => {
  let { storefront, fetchWithCache, env } = weaverse;

  let [productData, reviewsData] = await Promise.all([
    storefront.query(PRODUCT_QUERY, {
    }),
    fetchWithCache(`https://api.reviews.example/product/${data.productHandle}`, {
      headers: { Authorization: `Bearer ${env.REVIEWS_API_KEY}` },
  ]);

  return {
    product: productData.product,
    reviews: reviewsData.reviews || [],


## Conditional Fetching

export let loader = async ({ weaverse, data }: ComponentLoaderArgs<DataSourceData>) => {

  switch (data.source) {
    case 'collection':
        variables: { handle: data.collectionHandle },
    case 'external':
      return await fetchWithCache(`https://api.example.com/products`, {
        headers: { 'API-Key': env.EXTERNAL_API_KEY },
    default:
      return { products: [] };


## Dependent Queries

When one query depends on another:

export let loader = async ({ weaverse, data }: ComponentLoaderArgs<RelatedProductsData>) => {

  // Step 1: Get the product type
  let { product } = await storefront.query(PRODUCT_BASIC_QUERY, {

  if (!product) return { relatedProducts: [] };

  // Step 2: Find related products by type
  let { products } = await storefront.query(RELATED_PRODUCTS_QUERY, {
      productType: product.productType,
      excludeId: product.id,
      first: 4,

  return { relatedProducts: products.nodes };


## Error Handling

export let loader = async ({ weaverse, data }: ComponentLoaderArgs<ApiData>) => {
  try {
    let result = await weaverse.fetchWithCache(data.apiUrl);
    if (!result || !Array.isArray(result.items)) {
      console.warn('Invalid API response format');
      return { items: [], error: 'invalid_format' };
    return { items: result.items, error: null };
  } catch (error) {
    console.error('API fetch error:', error);
    return { items: [], error: error instanceof Error ? error.message : 'unknown' };


## Data Revalidation

Mark inputs with `shouldRevalidate: true` to re-run the loader when they change in Studio:

settings: [
    group: 'Settings',
    inputs: [
        type: 'select',
        name: 'sortBy',
        label: 'Sort By',
        shouldRevalidate: true,  // ← Triggers loader re-run
        defaultValue: 'BEST_SELLING',
        configs: {
          options: [
            { value: 'BEST_SELLING', label: 'Best Selling' },
            { value: 'CREATED_AT', label: 'Newest' },
            { value: 'PRICE', label: 'Price' },
          ],
        type: 'range',
        name: 'productsCount',
        label: 'Products to Show',
        shouldRevalidate: true,  // ← Also triggers loader re-run
        defaultValue: 4,
        configs: { min: 1, max: 12, step: 1 },
        name: 'viewStyle',
        label: 'View Style',
        // No shouldRevalidate — UI-only, no loader needed

**Auto-revalidating inputs** (don't need `shouldRevalidate`):
- `product`
- `collection`
- `blog`
- `product-list`
- `collection-list`
