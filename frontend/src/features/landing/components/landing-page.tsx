import { FeatureExplorerSection } from "./feature-explorer-section";
import { GisAiSection } from "./gis-ai-section";
import { LandingFooter } from "./landing-footer";
import { LandingFaqSection } from "./landing-faq-section";
import { LandingHeader } from "./landing-header";
import { LandingHero } from "./landing-hero";
import {
  AdvertisingSection,
  BusinessSpaceSection,
  CommunitySection,
  CommuterSection,
  DataTrustSection,
  FairDiscoverySection,
  FinalCtaSection,
  MerchantSubmissionSection,
  TechnologySection,
  UmkmSection,
} from "./product-story-sections";
import { WhatIsGetraSection } from "./what-is-getra-section";
import { WhyGetraSection } from "./why-getra-section";

export function LandingPage() {
  return (
    <div
      id="top"
      className="getra-landing min-h-screen overflow-x-clip bg-[#fdfdfb] text-[#464b71]"
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-[#118ab2] focus:px-4 focus:py-2 focus:text-sm focus:font-black focus:text-white"
      >
        Lewati ke konten utama
      </a>
      <LandingHeader />
      <main id="main-content" tabIndex={-1}>
        <LandingHero />
        <WhyGetraSection />
        <WhatIsGetraSection />
        <GisAiSection />
        <FeatureExplorerSection />
        <FairDiscoverySection />
        <CommuterSection />
        <CommunitySection />
        <UmkmSection />
        <MerchantSubmissionSection />
        <AdvertisingSection />
        <BusinessSpaceSection />
        <DataTrustSection />
        <TechnologySection />
        <LandingFaqSection />
        <FinalCtaSection />
      </main>
      <LandingFooter />
    </div>
  );
}
