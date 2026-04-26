"use client";

type Props = {
  size?: number;
  showText?: boolean;
};

export default function ReputaterLogo({ size = 28, showText = true }: Props) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <img
        src="/logo.png"
        alt="Reputater"
        width={size}
        height={size * 1.3}
        style={{ objectFit: "contain" }}
      />
      {showText && (
        <span
          style={{
            fontSize: size * 0.72,
            fontWeight: 900,
            letterSpacing: "-0.03em",
            color: "var(--color-accent)",
            lineHeight: 1,
          }}
        >
          reputater
        </span>
      )}
    </span>
  );
}
