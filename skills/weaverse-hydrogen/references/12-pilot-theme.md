# Pilot Theme Patterns & Conventions

> Reference for the official Weaverse Pilot starter theme.

## Overview

Pilot is the official Weaverse Hydrogen starter theme. It demonstrates best practices for building production-grade Shopify Hydrogen storefronts with Weaverse.

**GitHub:** https://github.com/Weaverse/pilot
**Template:** `npx @weaverse/cli create --template=pilot`

## Project Structure Conventions

```
templates/pilot/
├── app/
│   ├── components/         # Shared UI (Section, Heading, Button, ProductCard, etc.)
│   ├── graphql/            # Reusable GraphQL fragments
│   ├── sections/           # 100+ registered Weaverse sections
│   ├── weaverse/
│   │   ├── components.ts   # All sections registered here
│   │   ├── schema.server.ts  # Theme-wide settings (colors, fonts, layout)
│   │   ├── csp.ts          # Weaverse CSP config
│   │   ├── style.tsx       # GlobalStyle component (CSS variables)
│   │   └── index.tsx       # WeaverseContent wrapper
│   └── routes/             # Standard Hydrogen routes

## Reusable Base Components

Pilot uses shared base components that sections build on:

### Section Component

```tsx
// app/components/section.tsx
import { forwardRef } from 'react';
import { cn } from '~/lib/utils';

export interface SectionProps {
  as?: React.ElementType;
  className?: string;
  gap?: number;
  width?: 'full' | 'stretch' | 'fixed';
  overflow?: 'hidden' | 'unset';
  verticalPadding?: 'none' | 'small' | 'medium' | 'large';
  borderRadius?: number;
  backgroundColor?: string;
  children?: React.ReactNode;
}

export let Section = forwardRef<HTMLElement, SectionProps>((props, ref) => {
  let {
    as: Tag = 'section',
    className,
    gap,
    width = 'fixed',
    overflow,
    verticalPadding = 'medium',
    borderRadius,
    backgroundColor,
    children,
    ...rest
  } = props;

  let maxWidth = width === 'fixed' ? 'var(--page-width)' : undefined;

  return (
    <Tag
      ref={ref}
      {...rest}
      className={cn('w-full mx-auto', className)}
      style={{
        maxWidth,
        gap: gap ? `${gap}px` : undefined,
        borderRadius: borderRadius ? `${borderRadius}px` : undefined,
        paddingTop: verticalPadding !== 'none' ? `var(--padding-${verticalPadding})` : undefined,
        paddingBottom: verticalPadding !== 'none' ? `var(--padding-${verticalPadding})` : undefined,
      }}
    >
      {children}
    </Tag>
  );
});

### Shared Layout Inputs

// Reusable schema inputs for section layout
export let layoutInputs = [
  {
    type: 'select' as const,
    name: 'width',
    label: 'Content width',
    configs: {
      options: [
        { value: 'full', label: 'Full page' },
        { value: 'stretch', label: 'Stretch' },
        { value: 'fixed', label: 'Fixed' },
      ],
    },
    defaultValue: 'fixed',
    type: 'range' as const,
    name: 'gap',
    label: 'Items spacing',
    configs: { min: 0, max: 60, step: 4, unit: 'px' },
    defaultValue: 20,
    name: 'verticalPadding',
    label: 'Vertical padding',
        { value: 'none', label: 'None' },
        { value: 'small', label: 'Small' },
        { value: 'medium', label: 'Medium' },
        { value: 'large', label: 'Large' },
    defaultValue: 'medium',
];

### Heading Component

// app/components/heading.tsx
export interface HeadingProps {
  content: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  size?: string;
  mobileSize?: string;
  desktopSize?: string;
  color?: string;
  weight?: string;
  letterSpacing?: string;
  alignment?: 'left' | 'center' | 'right';
  minSize?: number;
  maxSize?: number;

export let headingInputs = [
  { type: 'text' as const, name: 'content', label: 'Content', defaultValue: 'Heading' },
    type: 'select' as const, name: 'as', label: 'HTML tag',
        { value: 'h1', label: 'H1' },
        { value: 'h2', label: 'H2' },
        { value: 'h3', label: 'H3' },
        { value: 'h4', label: 'H4' },
    defaultValue: 'h2',
    type: 'select' as const, name: 'alignment', label: 'Alignment',
        { value: 'left', label: 'Left' },
        { value: 'center', label: 'Center' },
        { value: 'right', label: 'Right' },
    defaultValue: 'center',

## Section Patterns

### Content Section (no data fetching)

// app/sections/image-with-text/index.tsx
import { createSchema } from '@weaverse/hydrogen';
import type { HydrogenComponentProps } from '@weaverse/hydrogen';
import { Image } from '@shopify/hydrogen';
import { Section, layoutInputs } from '~/components/section';

interface ImageWithTextProps extends HydrogenComponentProps {
  imagePosition: 'left' | 'right';

let ImageWithText = forwardRef<HTMLElement, ImageWithTextProps>((props, ref) => {
  let { imagePosition, children, ...rest } = props;

    <Section ref={ref} {...rest}>
      <div className={`flex ${imagePosition === 'right' ? 'flex-row-reverse' : ''}`}>
      </div>
    </Section>

export default ImageWithText;

export let schema = createSchema({
  type: 'image-with-text',
  title: 'Image with Text',
  settings: [
    { group: 'Layout', inputs: layoutInputs },
      group: 'Content',
      inputs: [
          type: 'toggle-group',
          name: 'imagePosition',
          label: 'Image position',
          defaultValue: 'left',
  childTypes: ['heading', 'paragraph', 'image', 'button'],
  presets: {
    children: [
      { type: 'image' },
      { type: 'heading', content: 'About Our Store' },
      { type: 'paragraph', content: 'We create amazing products...' },

### Data-Driven Section

// app/sections/featured-products/index.tsx
import type { ComponentLoaderArgs, HydrogenComponentProps } from '@weaverse/hydrogen';
import { ProductCard } from '~/components/product/product-card';
import Heading, { headingInputs } from '~/components/heading';

type LoaderData = { collection: { handle: string } };

export let loader = async ({ weaverse, data }: ComponentLoaderArgs<LoaderData>) => {
  let { storefront } = weaverse;
  let handle = data?.collection?.handle;

  if (!handle) return null;

  return await storefront.query(COLLECTION_QUERY, {
    variables: {
      handle,
      first: 8,
      language: storefront.i18n.language,
      country: storefront.i18n.country,
};

type Props = HydrogenComponentProps<Awaited<ReturnType<typeof loader>>> & LoaderData;

function FeaturedProducts(props: Props) {
  let { loaderData, children, ...rest } = props;
  let products = loaderData?.collection?.products?.nodes ?? [];

    <Section {...rest}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}

export default FeaturedProducts;

  type: 'featured-products',
  title: 'Featured Products',
          type: 'collection',
          name: 'collection',
          label: 'Collection',
          shouldRevalidate: true,
  childTypes: ['heading'],
    gap: 20,
    children: [{ type: 'heading', content: 'Featured Products' }],

const COLLECTION_QUERY = `#graphql
  query FeaturedCollection($handle: String!, $first: Int!, $language: LanguageCode, $country: CountryCode)
  @inContext(language: $language, country: $country) {
    collection(handle: $handle) {
      title
      products(first: $first) {
        nodes {
          id
          handle
          featuredImage { url altText width height }
          priceRange {
            minVariantPrice { amount currencyCode }
` as const;

### Page-Restricted Section

  type: 'related-products',
  title: 'Related Products',
  limit: 1,
  enabledOn: {
    pages: ['PRODUCT'],  // Only available on product pages
  presets: { gap: 32 },

## Theme Schema Conventions

Pilot organizes theme settings into logical groups:

// app/weaverse/schema.server.ts
export let themeSchema: HydrogenThemeSchema = {
  info: {
    version: '7.0.0',
    author: 'Weaverse',
    name: 'Pilot',
    documentationUrl: 'https://docs.weaverse.io',
    supportUrl: 'https://help.weaverse.io',
    { group: 'Layout', inputs: [/* pageWidth, navHeight, gridGap */] },
    { group: 'Colors', inputs: [/* background, foreground, primary, secondary */] },
    { group: 'Typography', inputs: [/* bodyFont, headingFont, baseSize */] },
    { group: 'Buttons', inputs: [/* primaryBg, primaryText, borderRadius */] },
    { group: 'Header', inputs: [/* sticky, transparent, logo, height */] },
    { group: 'Footer', inputs: [/* columns, copyright, social links */] },
    { group: 'Product', inputs: [/* imageRatio, showVendor, showRating */] },
    { group: 'Cart', inputs: [/* cartType (drawer/page), showNotes */] },

## Key Conventions

1. **Use `Section` wrapper** — all sections extend the base `Section` component for consistent layout
2. **Share inputs** — `layoutInputs`, `headingInputs` are shared across sections to maintain consistency
3. **Namespace imports** — always `import * as X` in components.ts
4. **Consistent group ordering** — Layout → Content → Style → Advanced
5. **Child components** — use `childTypes` for composable sections, render `{children}`
6. **forwardRef** — use for React 18 compatibility, optional in React 19
7. **TypeScript strict** — all components fully typed with interfaces
8. **GraphQL fragments** — define in `app/graphql/` and reuse across loaders
9. **`shouldRevalidate: true`** — on inputs that change loader data (e.g., collection picker)
10. **kebab-case types** — `hero-banner`, not `heroBanner` or `HeroBanner`
