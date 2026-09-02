import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Seo from "../components/Seo";
import JsonLd from "../components/JsonLd";
import GallerySection from "../sections/Gallery";
import { absoluteUrl } from "../lib/seo";
import { photographer, galleryPhotos } from "../data/photos";

export default function Gallery() {
  return (
    <>
      <Seo
        title="Gallery — Portrait, Street & Landscape Work in Beirut"
        description="Browse the photography portfolio of Jad Daou: portrait sessions, street photography, landscape imagery, and event coverage from Beirut and across Lebanon."
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Gallery — Jad Daou Photography",
          url: absoluteUrl("/gallery"),
          about: `Photography portfolio of ${photographer.name}, based in ${photographer.city}.`,
          mainEntity: {
            "@type": "ImageGallery",
            name: "Jad Daou — selected work",
            image: galleryPhotos.slice(0, 24).map((p) => ({
              "@type": "ImageObject",
              contentUrl: absoluteUrl(p.src),
              name: p.title,
              ...(p.width && p.height
                ? { width: p.width, height: p.height }
                : {}),
            })),
          },
        }}
      />
      <Navbar />
      <main className="bg-bg pt-24 md:pt-32">
        <GallerySection />
      </main>
      <Footer />
    </>
  );
}
