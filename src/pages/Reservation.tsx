import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Seo from "../components/Seo";

export default function Reservation() {
  return (
    <>
      <Seo
        title="Book a Photography Session"
        description="Reserve a portrait, street, travel, or event photography session with Jad Daou in Beirut. Availability and booking details are coming soon right here."
      />
      <Navbar />
      <main className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 pt-24 text-center md:pt-32">
        <span className="mb-4 text-xs uppercase tracking-[0.3em] text-muted">
          Reservation
        </span>
        <h1 className="font-display text-4xl italic text-text-primary md:text-6xl">
          Book a session
        </h1>
        <p className="mt-6 max-w-md text-sm text-muted md:text-base">
          Availability and booking details are coming soon.
        </p>
      </main>
      <Footer />
    </>
  );
}
