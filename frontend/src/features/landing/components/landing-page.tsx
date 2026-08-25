import { FeatureExplorerSection } from "./feature-explorer-section";
import { GisAiSection } from "./gis-ai-section";
import { LandingFooter } from "./landing-footer";
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
    <main
      id="top"
      className="getra-landing min-h-screen bg-[radial-gradient(circle_at_18%_0%,rgba(41,199,216,0.18),transparent_30%),radial-gradient(circle_at_84%_16%,rgba(122,212,59,0.12),transparent_28%),linear-gradient(180deg,#07111f_0%,#081827_38%,#07111f_72%,#050b14_100%)] text-white"
    >
      <a
        href="#tentang"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-getra-cyan focus:px-4 focus:py-2 focus:text-sm focus:font-black focus:text-slate-950"
      >
        Lewati ke konten utama
      </a>
      <LandingHeader />
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
      <FinalCtaSection />
      <LandingFooter />
    </main>
  );
}
