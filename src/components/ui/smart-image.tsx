"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";
import { FALLBACK_DISH_IMAGE } from "@/lib/constants";

interface SmartImageProps extends Omit<ImageProps, "src" | "alt"> {
  src?: string | null;
  alt: string;
  fallbackSrc?: string;
}

/**
 * Uses next/image for local and allow-listed remote images and degrades to a
 * local branded placeholder instead of showing a broken image.
 */
export function SmartImage({
  src,
  alt,
  fallbackSrc = FALLBACK_DISH_IMAGE,
  ...props
}: SmartImageProps) {
  const [current, setCurrent] = useState(src || fallbackSrc);
  return (
    <Image
      {...props}
      src={current}
      alt={alt}
      onError={() => {
        if (current !== fallbackSrc) setCurrent(fallbackSrc);
      }}
    />
  );
}
