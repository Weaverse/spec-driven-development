// app/sections/featured-collection/index.tsx
// A Weaverse section with server-side data fetching via loader.

import { createSchema } from '@weaverse/hydrogen';
import type { ComponentLoaderArgs, HydrogenComponentProps } from '@weaverse/hydrogen';
import { Image, Money } from '@shopify/hydrogen';
import { forwardRef } from 'react';

// --- Data Types ---

type FeaturedCollectionData = {
  collection: { handle: string };
  productsCount: number;
  showPrice: boolean;
};

// --- Loader ---

export let loader = async ({ weaverse, data }: ComponentLoaderArgs<FeaturedCollectionData>) => {
  let { storefront } = weaverse;
  let handle = data?.collection?.handle;

  if (!handle) return null;

  return await storefront.query(COLLECTION_QUERY, {
    variables: {
      handle,
      first: data.productsCount ?? 8,
      language: storefront.i18n.language,
      country: storefront.i18n.country,
    },
  });

// --- Component ---

type Props = HydrogenComponentProps<Awaited<ReturnType<typeof loader>>> & FeaturedCollectionData;

let FeaturedCollection = forwardRef<HTMLElement, Props>((props, ref) => {
  let { loaderData, showPrice, children, ...rest } = props;
  let collection = loaderData?.collection;
  let products = collection?.products?.nodes ?? [];

  return (
    <section ref={ref} {...rest} className="py-16 px-4">
      {/* Children renders any heading/subheading child components */}
      {children}

      {!collection && (
        <p className="text-center text-gray-500">Select a collection in Weaverse Studio</p>
      )}

      {products.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8 max-w-7xl mx-auto">
          {products.map((product) => (
            <a
              key={product.id}
              href={`/products/${product.handle}`}
              className="group block"
            >
              {product.featuredImage && (
                <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                  <Image
                    data={product.featuredImage}
                    aspectRatio="1/1"
                    sizes="(min-width: 45em) 20vw, 50vw"
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>
              <h3 className="mt-3 font-medium text-gray-900">{product.title}</h3>
              {showPrice && product.priceRange?.minVariantPrice && (
                <Money
                  data={product.priceRange.minVariantPrice}
                  className="mt-1 text-sm text-gray-600"
            </a>
          ))}
    </section>
  );

export default FeaturedCollection;

// --- Schema ---

export let schema = createSchema({
  type: 'featured-collection',
  title: 'Featured Collection',
  settings: [
    {
      group: 'Content',
      inputs: [
          type: 'collection',
          name: 'collection',
          label: 'Collection',
          shouldRevalidate: true, // Re-fetch when merchant changes collection
          type: 'range',
          name: 'productsCount',
          label: 'Products to show',
          configs: { min: 2, max: 12, step: 1 },
          defaultValue: 8,
          shouldRevalidate: true,
          type: 'switch',
          name: 'showPrice',
          label: 'Show price',
          defaultValue: true,
      ],
  childTypes: ['heading', 'subheading'],
  presets: {
    productsCount: 8,
    showPrice: true,
    children: [
      { type: 'heading', content: 'Featured Collection' },

// --- GraphQL Query ---

const COLLECTION_QUERY = `#graphql
  query FeaturedCollection(
    $handle: String!
    $first: Int!
    $language: LanguageCode
    $country: CountryCode
  ) @inContext(language: $language, country: $country) {
    collection(handle: $handle) {
      id
      title
      handle
      products(first: $first, sortKey: BEST_SELLING) {
        nodes {
          featuredImage {
            url
            altText
            width
            height
          }
          priceRange {
            minVariantPrice {
              amount
              currencyCode
` as const;
