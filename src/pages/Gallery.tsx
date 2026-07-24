import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Seo from "../components/Seo";
import GallerySection from "../sections/Gallery";

export default function Gallery() {
  return (
    <>
      <Seo
        title="Gallery — Portrait & Street Work"
        description="Browse the full photography portfolio of Jad Daou: portrait sessions, street photography, travel imagery, and event coverage from Beirut and beyond today."
      />
      <Navbar />
      <main className="bg-bg pt-24 md:pt-32">
        <GallerySection />
      </main>
      <Footer />
    </>
  );
}
