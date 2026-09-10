import Image from "next/image";

const GETRA_LOGO_SRC = "/brand/getra-logo.png";
const GETRA_LOGO_ALT = "GETRA — Peta Transit dan Usaha";

type GetraLogoProps = {
  className?: string;
  priority?: boolean;
  variant?: "header" | "footer";
};

type GetraBrandMarkProps = {
  className?: string;
  showTagline?: boolean;
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

export function GetraBrandMark({
  className = "",
  showTagline = false,
}: GetraBrandMarkProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`.trim()}>
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#118ab2] shadow-[0_8px_16px_rgba(17,138,178,0.24)]">
        <Image
          src="/brand/getra-figma-mark.svg"
          alt=""
          width={20}
          height={20}
          className="size-5"
        />
      </span>
      <span className="font-black tracking-[-0.04em] text-[#464b71]">GETRA</span>
      {showTagline ? (
        <span className="border-l border-[#464b71]/20 pl-2 text-xs font-medium text-[#464b71]/60">
          Peta Cerdas Kota
        </span>
      ) : null}
    </span>
  );
}

export const getraLogo = {
  alt: GETRA_LOGO_ALT,
  height: 173,
  src: GETRA_LOGO_SRC,
  width: 486,
} as const;
