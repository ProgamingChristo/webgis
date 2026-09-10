import Image from "next/image";

type GetraLogoProps = {
  className?: string;
  compact?: boolean;
};

/**
 * App chrome uses the same compact mark as the public Figma-aligned landing
 * page, while retaining a text label for accessible authenticated navigation.
 */
export function GetraLogo({
  className = "",
  compact = false,
}: GetraLogoProps) {
  return (
    <span
      className={`getra-app-logo ${compact ? "getra-app-logo--compact" : ""} ${className}`.trim()}
    >
      <span className="getra-app-logo__mark" aria-hidden="true">
        <Image
          src="/brand/getra-figma-mark.svg"
          alt=""
          width={20}
          height={20}
          priority
        />
      </span>
      {!compact ? (
        <span className="getra-app-logo__copy">
          <strong>GETRA</strong>
          <small>Peta Cerdas Kota</small>
        </span>
      ) : null}
    </span>
  );
}
