import Image from "next/image";

const GETRA_LOGO_SRC = "/brand/getra-logo-final.png";
const GETRA_LOGO_ALT = "GETRA — Geo-Enabled Transit & Retail Analytics";

type GetraLogoProps = {
  className?: string;
  priority?: boolean;
  variant?: "header" | "footer";
};

export function GetraLogo({
  className = "",
  priority = false,
  variant = "header",
}: GetraLogoProps) {
  const isFooter = variant === "footer";
  const viewportStyle = {
    position: "relative" as const,
    display: "inline-block",
    width: isFooter ? 110 : 100,
    height: isFooter ? 70 : 64,
    flex: "0 0 auto",
    overflow: "hidden",
  };

  return (
    <span className={`getra-final-logo getra-final-logo--${variant} ${className}`.trim()} style={viewportStyle}>
      <Image
        src={GETRA_LOGO_SRC}
        alt={GETRA_LOGO_ALT}
        width={1920}
        height={1920}
        priority={priority}
        sizes="(min-width: 1024px) 180px, 96px"
        style={{ position: "absolute", top: isFooter ? -20 : -18, left: 0, width: "100%", height: "auto", maxWidth: "none", objectFit: "contain" }}
      />
    </span>
  );
}

export const getraLogo = {
  alt: GETRA_LOGO_ALT,
  height: 1920,
  src: GETRA_LOGO_SRC,
  width: 1920,
} as const;
