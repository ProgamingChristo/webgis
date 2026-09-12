"use client";

import { useEffect } from "react";

import { useReducedMotion } from "../hooks/use-reduced-motion";

const REVEAL_TARGETS = [
  ".getra-figma-intro > *",
  ".getra-figma-personas__header",
  ".getra-figma-story",
  ".getra-figma-capabilities header",
  ".getra-figma-capability-card",
  ".getra-figma-action-map header",
  ".getra-figma-action-map__stage",
  ".getra-figma-opportunity__copy",
  ".getra-figma-opportunity__visual",
  ".getra-figma-community-validation header",
  ".getra-figma-community-validation__cards > article",
  ".getra-figma-how-it-works header",
  ".getra-figma-how-it-works__steps > article",
  ".getra-figma-editorial-quote blockquote",
  ".getra-figma-faq header",
  ".getra-figma-faq__accordion",
  ".getra-figma-final-cta > div",
  ".getra-figma-footer__brand",
  ".getra-figma-footer__links",
].join(",");

export function LandingPolish() {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const root = document.querySelector("main.getra-landing");
    if (!root) return;

    const opportunity = root.querySelector<HTMLElement>(".getra-figma-opportunity");
    if (opportunity) opportunity.id = "peluang";

    const targets = Array.from(root.querySelectorAll<HTMLElement>(REVEAL_TARGETS));
    if (reducedMotion) {
      targets.forEach((target) => target.classList.add("getra-scroll-reveal--visible"));
      return;
    }

    targets.forEach((target) => target.classList.add("getra-scroll-reveal"));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("getra-scroll-reveal--visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.16 });

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [reducedMotion]);

  return null;
}
