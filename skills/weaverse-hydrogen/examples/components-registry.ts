// app/weaverse/components.ts
// Component registry — ALL Weaverse sections must be registered here.
//
// Rules:
// 1. ALWAYS use namespace imports: import * as X from '~/sections/x'
// 2. NEVER use default imports: import X from '~/sections/x'  ← WRONG
// 3. Add new components to the array after creating them
// 4. Restart dev server after adding new components

import type { HydrogenComponent } from '@weaverse/hydrogen';

// Sections (parent components with full page-width layouts)
import * as HeroBanner from '~/sections/hero-banner';
import * as FeaturedCollection from '~/sections/featured-collection';
import * as ImageWithText from '~/sections/image-with-text';
import * as Testimonials from '~/sections/testimonials';
import * as Newsletter from '~/sections/newsletter';
import * as RichText from '~/sections/rich-text';
import * as VideoSection from '~/sections/video';
import * as CollectionBanner from '~/sections/collection-banner';
import * as ProductInformation from '~/sections/product-information';
import * as RelatedProducts from '~/sections/related-products';
import * as BlogPosts from '~/sections/blog-posts';
import * as ContactForm from '~/sections/contact-form';

// Child components (used inside sections via childTypes)
import * as Heading from '~/sections/shared/heading';
import * as SubHeading from '~/sections/shared/sub-heading';
import * as Paragraph from '~/sections/shared/paragraph';
import * as ButtonComponent from '~/sections/shared/button';
import * as ImageComponent from '~/sections/shared/image';
import * as ProductCard from '~/sections/product-card';

export let components: HydrogenComponent[] = [
  // Sections
  HeroBanner,
  FeaturedCollection,
  ImageWithText,
  Testimonials,
  Newsletter,
  RichText,
  VideoSection,
  CollectionBanner,
  ProductInformation,
  RelatedProducts,
  BlogPosts,
  ContactForm,

  // Shared child components
  Heading,
  SubHeading,
  Paragraph,
  ButtonComponent,
  ImageComponent,
  ProductCard,
];
