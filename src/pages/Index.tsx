import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import LoadingScreen from "../components/LoadingScreen";
import Footer from "../components/Footer";
import Seo from "../components/Seo";
import JsonLd from "../components/JsonLd";
import { absoluteUrl, AREA_SERVED } from "../lib/seo";
import { aboutPortrait, photographer } from "../data/photos";
import Hero from "../sections/Hero";
import AboutTeaser from "../sections/AboutTeaser";
import GalleryTeaser from "../sections/GalleryTeaser";
import BehindTheLens from "../sections/BehindTheLens";
import Stats from "../sections/Stats";

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    document.body.style.overflow = isLoading ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isLoading]);

  useEffect(() => {
    if (isLoading || !location.hash) return;
    const id = location.hash.slice(1);
    const frame = requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    });
    return () => cancelAnimationFrame(frame);
  }, [isLoading, location.hash]);

  return (
    <>
      <Seo
        title="Jad Daou — Photographer in Beirut & across Lebanon"
        description="Jad Daou is a Beirut-based photographer shooting portraits, street, landscape, and events across Lebanon. Browse the full portfolio and book a session."
        suffixSiteName={false}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Person",
          "@id": `${absoluteUrl("/")}#person`,
          name: photographer.name,
          jobTitle: photographer.roles[0],
          description: photographer.description,
          image: absoluteUrl(aboutPortrait),
          url: absoluteUrl("/"),
          sameAs: ["https://www.instagram.com/3adasa.lb/"],
          worksFor: { "@id": `${absoluteUrl("/")}#business` },
          address: {
            "@type": "PostalAddress",
            addressLocality: "Beirut",
            addressCountry: "LB",
          },
          areaServed: AREA_SERVED,
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ProfessionalService",
          "@id": `${absoluteUrl("/")}#business`,
          additionalType: "https://www.wikidata.org/wiki/Q33231",
          name: `${photographer.name} Photography`,
          description:
            "Jad Daou is a Beirut-based photographer working across Lebanon in portrait, street, landscape, and event photography. Sessions are built around real, unscripted moments — light, shadow, and stillness over poses.",
          image: absoluteUrl(aboutPortrait),
          url: absoluteUrl("/"),
          priceRange: "$$",
          sameAs: ["https://www.instagram.com/3adasa.lb/"],
          founder: { "@id": `${absoluteUrl("/")}#person` },
          knowsAbout: [
            "Portrait photography",
            "Street photography",
            "Landscape photography",
            "Event photography",
            "Wedding photography",
          ],
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: "Photography sessions",
            itemListElement: [
              {
                "@type": "Offer",
                itemOffered: {
                  "@type": "Service",
                  name: "Portrait photography session",
                },
              },
              {
                "@type": "Offer",
                itemOffered: {
                  "@type": "Service",
                  name: "Street photography session",
                },
              },
              {
                "@type": "Offer",
                itemOffered: {
                  "@type": "Service",
                  name: "Landscape photography session",
                },
              },
              {
                "@type": "Offer",
                itemOffered: {
                  "@type": "Service",
                  name: "Event photography session",
                },
              },
            ],
          },
          address: {
            "@type": "PostalAddress",
            addressLocality: "Beirut",
            addressCountry: "LB",
          },
          areaServed: AREA_SERVED,
        }}
      />

      <AnimatePresence>
        {isLoading && (
          <LoadingScreen onComplete={() => setIsLoading(false)} />
        )}
      </AnimatePresence>

      <Hero />
      <AboutTeaser />
      <GalleryTeaser />
      <BehindTheLens />
      <Stats />
      <Footer />
    </>
  );
}
