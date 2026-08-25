import Image from "next/image";

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
        className={`inline-grid size-10 place-items-center rounded-2xl border border-cyan-300/40 bg-cyan-300/10 text-sm font-black text-cyan-200 shadow-[0_0_28px_rgba(34,211,238,0.14)] ${className}`}
      >
        G
      </span>
    );
  }

  return (
    <Image
      alt="GETRA"
      className={`h-auto w-36 rounded-xl object-contain sm:w-40 ${className}`}
      height={173}
      priority
      src="/brand/getra-logo.png"
      width={486}
    />
  );
}
