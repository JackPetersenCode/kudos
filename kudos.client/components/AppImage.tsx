"use client";

import Image from "next/image";

type AppImageProps = {
  src: string;
  alt: string;
  borderRadius?: number;
  height?: number;
  maxWidth?: number | string;
  background?: string;
  border?: string;
  /** Set on the largest above-the-fold image (the LCP element) to load it eagerly. */
  priority?: boolean;
};

export default function AppImage({
  src,
  alt,
  borderRadius = 12,
  height = 260,
  maxWidth = "100%",
  background = "#f5f5f5",
  border,
  priority = false,
}: AppImageProps) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth,
        height,
        background,
        borderRadius,
        overflow: "hidden",
        border,
      }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes="(max-width: 768px) 100vw, 700px"
        style={{ objectFit: "cover", objectPosition: "center" }}
      />
    </div>
  );
}