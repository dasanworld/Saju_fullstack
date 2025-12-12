"use client";

import { useEffect } from "react";
import { LandingHeader } from "./(landing)/components/landing-header";
import { HeroSection } from "./(landing)/components/hero-section";
import { ServiceSection } from "./(landing)/components/service-section";
import { PricingSection } from "./(landing)/components/pricing-section";
import { FaqSection } from "./(landing)/components/faq-section";

export default function Home() {
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const element = document.querySelector(hash);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />
      <main>
        <HeroSection />
        <ServiceSection />
        <PricingSection />
        <FaqSection />
      </main>
    </div>
  );
}
