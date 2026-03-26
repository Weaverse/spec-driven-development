// app/sections/hero-banner/index.tsx
// A complete Weaverse section with schema, settings groups, childTypes, and presets.

import { createSchema } from '@weaverse/hydrogen';
import type { HydrogenComponentProps } from '@weaverse/hydrogen';
import { forwardRef } from 'react';

interface HeroBannerProps extends HydrogenComponentProps {
  heading: string;
  description: string;
  buttonText: string;
  buttonLink: string;
  backgroundImage: string;
  overlayOpacity: number;
  contentAlignment: 'left' | 'center' | 'right';
  minHeight: number;
}

let HeroBanner = forwardRef<HTMLElement, HeroBannerProps>((props, ref) => {
  let {
    heading,
    description,
    buttonText,
    buttonLink,
    backgroundImage,
    overlayOpacity,
    contentAlignment,
    minHeight,
    children,
    ...rest
  } = props;

  let alignClass = {
    left: 'text-left items-start',
    center: 'text-center items-center',
    right: 'text-right items-end',
  }[contentAlignment];

  return (
    <section
      ref={ref}
      {...rest}
      className="relative flex items-center justify-center bg-cover bg-center"
      style={{
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
        minHeight: `${minHeight}px`,
      }}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black"
        style={{ opacity: overlayOpacity / 100 }}
      />

      {/* Content */}
      <div className={`relative z-10 flex flex-col ${alignClass} max-w-4xl mx-auto px-4`}>
        {heading && (
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            {heading}
          </h1>
        )}
        {description && (
          <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl">
            {description}
          </p>
        {buttonText && buttonLink && (
          <a
            href={buttonLink}
            className="inline-block bg-white text-black px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            {buttonText}
          </a>
        {children}
      </div>
    </section>
  );
});

export default HeroBanner;

export let schema = createSchema({
  type: 'hero-banner',
  title: 'Hero Banner',
  settings: [
    {
      group: 'Content',
      inputs: [
          type: 'text',
          name: 'heading',
          label: 'Heading',
          defaultValue: 'Welcome to Our Store',
          placeholder: 'Enter heading text',
        },
          type: 'textarea',
          name: 'description',
          label: 'Description',
          defaultValue: 'Discover amazing products and exceptional service.',
          placeholder: 'Enter description text',
          name: 'buttonText',
          label: 'Button Text',
          defaultValue: 'Shop Now',
          type: 'url',
          name: 'buttonLink',
          label: 'Button Link',
          defaultValue: '/collections/all',
      ],
      group: 'Design',
          type: 'image',
          name: 'backgroundImage',
          label: 'Background Image',
          type: 'range',
          name: 'overlayOpacity',
          label: 'Overlay Opacity',
          configs: { min: 0, max: 100, step: 5, unit: '%' },
          defaultValue: 40,
          name: 'minHeight',
          label: 'Minimum Height',
          configs: { min: 300, max: 800, step: 50, unit: 'px' },
          defaultValue: 500,
          type: 'toggle-group',
          name: 'contentAlignment',
          label: 'Content Alignment',
          configs: {
            options: [
              { value: 'left', label: 'Left' },
              { value: 'center', label: 'Center' },
              { value: 'right', label: 'Right' },
          defaultValue: 'center',
  childTypes: ['subheading', 'paragraph', 'button'],
  presets: {
    heading: 'Welcome to Our Store',
    description: 'Discover amazing products and exceptional service.',
    buttonText: 'Shop Now',
    buttonLink: '/collections/all',
    overlayOpacity: 40,
    minHeight: 500,
    contentAlignment: 'center',
    children: [
      { type: 'subheading', content: 'Limited Time Offer' },
