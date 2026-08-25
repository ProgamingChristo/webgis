import Image from "next/image";

const GETRA_LOGO_SRC = "/brand/getra-logo.png";
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
  const widthClass =
    variant === "footer"
      ? "w-[190px] lg:w-[220px]"
      : "w-[140px] sm:w-[160px] lg:w-[190px]";

  return (
    <Image
      src={GETRA_LOGO_SRC}
      alt={GETRA_LOGO_ALT}
      width={486}
      height={173}
      priority={priority}
      sizes="(min-width: 1024px) 210px, 168px"
      className={`h-auto ${widthClass} rounded-lg object-contain ${className}`.trim()}
    />
  );
}

export const getraLogo = {
  alt: GETRA_LOGO_ALT,
  height: 173,
  src: GETRA_LOGO_SRC,
  width: 486,
} as const;
