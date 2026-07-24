import { Link } from "react-router-dom";
import type { IconType } from "react-icons";
import { FaInstagram, FaWhatsapp } from "react-icons/fa";
import { photographer } from "../data/photos";
import { NAV_LINKS } from "./Navbar";
import { useSectionNav } from "../hooks/useSectionNav";

type SocialLink = {
  label: string;
  href: string;
  icon: IconType;
};

const SOCIALS: SocialLink[] = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/3adasa.lb/",
    icon: FaInstagram,
  },
  {
    label: "WhatsApp",
    href: "https://wa.me/+96181872651",
    icon: FaWhatsapp,
  },
];

export default function Footer() {
  const year = new Date().getFullYear();
  const goToSection = useSectionNav();

  return (
    <footer className="relative overflow-hidden bg-bg pb-8 pt-16 md:pb-12 md:pt-20">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-8 border-t border-stroke px-6 pt-8 md:grid-cols-3 md:gap-12 md:px-10 lg:px-16">
        <div className="flex flex-col gap-3">
          <span className="font-display text-3xl justify-items-left md:text-4xl">
            <img src="/logo-nav.png" alt={`${photographer.name} logo`} width={80} height={80} className="object-contain" />
          </span>
          <p className="text-sm text-muted">{photographer.description}</p>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-xs uppercase tracking-[0.3em] text-muted">
            Quick links
          </span>
          <div className="flex flex-col gap-2">
            {NAV_LINKS.map((link) =>
              link.kind === "anchor" ? (
                <button
                  key={link.id}
                  onClick={() => goToSection(link.id)}
                  className="text-left text-sm text-muted transition-colors hover:text-text-primary"
                >
                  {link.label}
                </button>
              ) : (
                <Link
                  key={link.path}
                  to={link.path}
                  className="text-sm text-muted transition-colors hover:text-text-primary"
                >
                  {link.label}
                </Link>
              )
            )}
          </div>
        </div>

        <div className="flex flex-col items-start gap-4 md:items-end md:text-right">
          <div className="flex items-center gap-4">
            {SOCIALS.map((social) => {
              const Icon = social.icon;
              return (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="text-muted transition-colors hover:text-text-primary"
                >
                  <Icon size={20} aria-hidden />
                </a>
              );
            })}
          </div>

          <p className="text-xs text-muted">
            &copy; {year} {photographer.name}. All rights reserved.
          </p>
        </div>
        <div className="flex flex-col gap-3"></div>
      </div>
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-8 border-t border-stroke px-6 pt-8 md:grid-cols-1 md:gap-12 md:px-10 lg:px-16">
        <div className="flex flex-col gap-3">
          <span className="font-display text-lg italic text-text-primary md:text-xl text-center">
            Created by <a href="https://alaafayyad.vercel.app/" target="_blank" rel="noopener noreferrer nofollow" className="text-text-primary hover:underline">Alaa Fayyad</a>
          </span>
        </div>
       
      </div>
    </footer>
  );
}
