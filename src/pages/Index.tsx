import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import LoadingScreen from "../components/LoadingScreen";
import Footer from "../components/Footer";
import Seo from "../components/Seo";
import JsonLd from "../components/JsonLd";
import { absoluteUrl } from "../lib/seo";
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
        title="Jad Daou Photography — Portraits & Street in Beirut"
        description="Jad Daou is a Beirut-based photographer shooting portraits, street scenes, travel, and events. Browse the full photography portfolio and book a session."
        suffixSiteName={false}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: photographer.name,
          jobTitle: photographer.roles[0],
          description: photographer.description,
          image: absoluteUrl(aboutPortrait),
          address: {
            "@type": "PostalAddress",
            addressLocality: photographer.city,
          },
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
