import { FigmaActionMapSection } from "./figma-action-map-section";
import { FigmaCapabilitiesSection } from "./figma-capabilities-section";
import { LandingFooter } from "./landing-footer";
import { LandingHeader } from "./landing-header";
import { LandingHero } from "./landing-hero";
import { FigmaIntroSection } from "./figma-intro-section";
import { FigmaPersonaStoriesSection } from "./figma-persona-stories-section";
import { FigmaCommunityValidationSection, FigmaOpportunitySection } from "./figma-opportunity-community-sections";
import { FigmaEditorialQuoteSection, FigmaHowItWorksSection } from "./figma-how-it-works-quote-sections";
import { FigmaFaqSection, FigmaFinalCtaSection } from "./figma-faq-final-cta";
import { LandingPolish } from "./landing-polish";

export function LandingPage() {
  return (
    <main
      id="top"
      className="getra-landing min-h-screen"
    >
      <a
        href="#tentang"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-getra-cyan focus:px-4 focus:py-2 focus:text-sm focus:font-black focus:text-slate-950"
      >
        Lewati ke konten utama
      </a>
      <LandingHeader />
      <LandingPolish />
      <LandingHero />
      <FigmaIntroSection />
      <FigmaPersonaStoriesSection />
      <FigmaCapabilitiesSection />
      <FigmaActionMapSection />
      <FigmaOpportunitySection />
      <FigmaCommunityValidationSection />
      <FigmaHowItWorksSection />
      <FigmaEditorialQuoteSection />
      <FigmaFaqSection />
      <FigmaFinalCtaSection />
      <LandingFooter />
    </main>
  );
}
