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
      className="relative overflow-hidden px-4 py-18 sm:px-6 lg:px-8"
    >
      <RevealOnScroll className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <span className="text-xs font-black uppercase tracking-[0.2em] text-getra-cyan">
            {eyebrow}
          </span>
          <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">
            {title}
          </h2>
          {description ? (
            <p className="mt-4 text-sm leading-7 text-slate-400 sm:text-base">
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
