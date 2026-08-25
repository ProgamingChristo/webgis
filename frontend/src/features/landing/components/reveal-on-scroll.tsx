"use client";

import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import { useReducedMotion } from "../hooks/use-reduced-motion";

type RevealOnScrollProps = {
  children: ReactNode;
  className?: string;
};

export function RevealOnScroll({
  children,
  className = "",
}: RevealOnScrollProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const isVisible =
    visible || reducedMotion;

  useEffect(() => {
    if (reducedMotion) {
      return;
    }

    const node = ref.current;

    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "0px 0px -12% 0px",
        threshold: 0.16,
      },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [reducedMotion]);

  return (
    <div
      ref={ref}
      className={`getra-reveal ${isVisible ? "getra-reveal--visible" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
