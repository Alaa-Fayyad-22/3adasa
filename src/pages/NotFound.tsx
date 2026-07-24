import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Seo from "../components/Seo";

export default function NotFound() {
  return (
    <>
      <Seo
        title="Page Not Found"
        description="The page you're looking for doesn't exist or may have moved."
        noindex
      />
      <Navbar />
      <main className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 pt-24 text-center md:pt-32">
        <span className="mb-4 text-xs uppercase tracking-[0.3em] text-muted">
          404
        </span>
        <h1 className="font-display text-4xl italic text-text-primary md:text-6xl">
          Page not found
        </h1>
        <p className="mt-6 max-w-md text-sm text-muted md:text-base">
          The page you&apos;re looking for doesn&apos;t exist or may have
          moved.
        </p>

        <Link
          to="/"
          className="group relative mt-10 rounded-full text-sm font-medium transition-transform hover:scale-105"
        >
          <span className="accent-gradient absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <span className="relative flex items-center justify-center rounded-full bg-text-primary px-7 py-3.5 text-bg transition-colors duration-300 group-hover:bg-bg group-hover:text-text-primary">
            Back to Home
          </span>
        </Link>
      </main>
      <Footer />
    </>
  );
}
