import type { ReactNode } from "react";

import { RevealOnScroll } from "./reveal-on-scroll";

type SectionShellProps = {
  id?: string;
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
};

export function SectionShell({
  id,
  eyebrow,
  title,
  description,
  children,
}: SectionShellProps) {
  return (
    <section
      id={id}
      className="landing-section relative isolate scroll-mt-24 overflow-hidden px-4 py-20 sm:px-6 lg:px-8"
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_10%_8%,rgba(17,138,178,0.055),transparent_25%),radial-gradient(circle_at_88%_82%,rgba(98,214,200,0.08),transparent_24%)]"
        aria-hidden="true"
      />
      <RevealOnScroll className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <span className="text-xs font-black uppercase tracking-[0.2em] text-[#118ab2]">
            {eyebrow}
          </span>
          <h2 className="mt-4 text-3xl font-black tracking-[-0.05em] text-[#464b71] sm:text-4xl lg:text-5xl">
            {title}
          </h2>
          {description ? (
            <p className="mt-4 text-sm leading-7 text-[#66708d] sm:text-base">
              {description}
            </p>
          ) : null}
        </div>

        <div className="mt-10">
          {children}
        </div>
      </RevealOnScroll>
    </section>
  );
}
