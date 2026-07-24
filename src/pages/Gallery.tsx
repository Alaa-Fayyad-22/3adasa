import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Seo from "../components/Seo";
import GallerySection from "../sections/Gallery";

export default function Gallery() {
  return (
    <>
      <Seo
        title="Gallery"
        description="The full portfolio — portraits, landscapes, editorial, and street work."
      />
      <Navbar />
      <main className="bg-bg pt-24 md:pt-32">
        <GallerySection />
      </main>
      <Footer />
    </>
  );
}
