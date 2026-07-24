import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Seo from "../components/Seo";
import AboutSection from "../sections/About";
import { photographer } from "../data/photos";

export default function About() {
  return (
    <>
      <Seo title="About" description={photographer.description} />
      <Navbar />
      <main className="bg-bg pt-24 md:pt-32">
        <AboutSection />
      </main>
      <Footer />
    </>
  );
}
