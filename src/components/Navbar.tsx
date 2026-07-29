import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { photographer } from "../data/photos";
import { useSectionNav } from "../hooks/useSectionNav";

export type NavLink =
  | { label: string; kind: "anchor"; id: string }
  | { label: string; kind: "route"; path: string };

export const NAV_LINKS: NavLink[] = [
  { label: "Gallery", kind: "route", path: "/gallery" },
  { label: "About", kind: "route", path: "/about" },
  { label: "Reservation", kind: "route", path: "/reservation" },
  { label: "Blog", kind: "route", path: "/blog" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const goToSection = useSectionNav();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 100);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = (link: NavLink) =>
    link.kind === "route" && location.pathname === link.path;

  return (
    <div className="fixed left-0 right-0 top-0 z-50 flex pointer-events-none justify-center px-4 pt-4 md:pt-6">
      <div
        className={`pointer-events-auto inline-flex items-center rounded-full border z-50 border-white/10 bg-surface px-2 py-2 backdrop-blur-md transition-shadow duration-300 ${
  scrolled ? "shadow-md shadow-black/10" : ""
}`}
      >
        <button
          onClick={() => goToSection("home")}
          className="group relative flex h-[52px] w-[52px] items-center justify-center rounded-full transition-transform duration-300 hover:scale-110"
          aria-label="Home"
        >
          <img
            src="/logo-nav.png"
            alt={`${photographer.name} logo`}
            width={50}
            height={50}
            loading="lazy"
            className="h-full w-full object-contain"
          />
        </button>

        <div className="mx-1 hidden h-5 w-px bg-stroke sm:block" />

        <nav className="flex items-center">
          {NAV_LINKS.map((link) => {
            const active = isActive(link);
            const linkClassName = `flex min-h-[40px] items-center justify-center rounded-full px-3 py-1.5 text-xs transition-colors sm:px-4 sm:py-2 sm:text-sm ${
              active
                ? "bg-stroke/50 text-text-primary"
                : "text-muted hover:bg-stroke/50 hover:text-text-primary"
            }`;

            if (link.kind === "route") {
              return (
                <Link key={link.path} to={link.path} className={linkClassName}>
                  {link.label}
                </Link>
              );
            }

            return (
              <button
                key={link.id}
                onClick={() => goToSection(link.id)}
                className={linkClassName}
              >
                {link.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
