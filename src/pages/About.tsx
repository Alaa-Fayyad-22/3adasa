import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Seo from "../components/Seo";
import JsonLd from "../components/JsonLd";
import AboutSection from "../sections/About";
import { absoluteUrl, AREA_SERVED } from "../lib/seo";
import { aboutPortrait, photographer } from "../data/photos";

export default function About() {
  return (
    <>
      <Seo
        title="About Jad Daou — Photographer"
        description="Meet Jad Daou, a Beirut-based photographer covering portraits, street scenes, landscape, and events. Read the story and specialties behind the camera here."
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
          areaServed: AREA_SERVED,
        }}
      />
      <Navbar />
      <main className="bg-bg pt-24 md:pt-32">
        <AboutSection />
      </main>
      <Footer />
    </>
  );
}
