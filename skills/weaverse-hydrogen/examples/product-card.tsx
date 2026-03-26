// app/sections/product-card/index.tsx
// A child component — used inside parent sections via childTypes.

import { createSchema } from '@weaverse/hydrogen';
import type { HydrogenComponentProps } from '@weaverse/hydrogen';
import { Image, Money } from '@shopify/hydrogen';

interface ProductCardProps extends HydrogenComponentProps {
  product: {
    handle: string;
    title: string;
    featuredImage?: { url: string; altText?: string; width?: number; height?: number };
    priceRange?: { minVariantPrice: { amount: string; currencyCode: string } };
  };
  showVendor: boolean;
  imageAspectRatio: string;
}

function ProductCard({ product, showVendor, imageAspectRatio, ...rest }: ProductCardProps) {
  if (!product) {
    return (
      <div {...rest} className="animate-pulse rounded-lg bg-gray-100 aspect-square" />
    );

    <a
      href={`/products/${product.handle}`}
      {...rest}
      className="group block"
    >
      {product.featuredImage && (
        <div className="overflow-hidden rounded-lg bg-gray-100">
          <Image
            data={product.featuredImage}
            aspectRatio={imageAspectRatio}
            sizes="(min-width: 45em) 20vw, 50vw"
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        </div>
      )}
      <div className="mt-3">
        <h3 className="text-sm font-medium text-gray-900 group-hover:underline">
          {product.title}
        </h3>
        {product.priceRange?.minVariantPrice && (
          <Money
            data={product.priceRange.minVariantPrice}
            className="mt-1 text-sm text-gray-600"
    </a>

export default ProductCard;

export let schema = createSchema({
  type: 'product-card',
  title: 'Product Card',
  settings: [
    {
      group: 'Content',
      inputs: [
          type: 'product',
          name: 'product',
          label: 'Product',
        },
          type: 'switch',
          name: 'showVendor',
          label: 'Show vendor',
          defaultValue: false,
      ],
      group: 'Design',
          type: 'select',
          name: 'imageAspectRatio',
          label: 'Image aspect ratio',
          configs: {
            options: [
              { value: '1/1', label: 'Square (1:1)' },
              { value: '3/4', label: 'Portrait (3:4)' },
              { value: '4/3', label: 'Landscape (4:3)' },
              { value: '16/9', label: 'Wide (16:9)' },
          defaultValue: '3/4',
  // No childTypes — this is a leaf component
  presets: {
    showVendor: false,
    imageAspectRatio: '3/4',
});
