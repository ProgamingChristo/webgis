const GETRA_LOGO_SRC =
  "/brand/getra-logo.png?v=20260826";

type GetraLogoProps = {
  className?: string;
  compact?: boolean;
};

export function GetraLogo({
  className = "",
  compact = false,
}: GetraLogoProps) {
  if (compact) {
    return (
      <span
        aria-label="GETRA"
        className={`getra-logo getra-logo--compact ${className}`}
      >
        G
      </span>
    );
  }

  return (
    // Static app chrome logo: use a plain image to keep SSR/client markup
    // deterministic in Client Providers and avoid Next Image hydration drift.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt="GETRA"
      className={`getra-logo getra-logo--full ${className}`}
      height={173}
      decoding="async"
      draggable={false}
      fetchPriority="high"
      loading="eager"
      src={GETRA_LOGO_SRC}
      width={486}
    />
  );
}
