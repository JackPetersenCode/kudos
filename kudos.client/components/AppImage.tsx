"use client";

import React from "react";

type AppImageProps = {
  src: string;
  alt: string;
  borderRadius?: number;
  height?: number;
  maxWidth?: number | string;
  background?: string;
  border?: string;
};

export default function AppImage({
  src,
  alt,
  borderRadius = 12,
  height = 260,
  maxWidth = "100%",
  background = "#f5f5f5",
  border,
}: AppImageProps) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth,
        height,
        background,
        borderRadius,
        overflow: "hidden",
        border,
      }}
    >
      <img
        src={src}
        alt={alt}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center"
        }}
      />
    </div>
  );
}