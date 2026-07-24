import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { photographer, aboutPortrait } from "../data/photos";
import { absoluteUrl } from "../lib/seo";

const SITE_NAME = `${photographer.name} — Photography`;
const DEFAULT_IMAGE = absoluteUrl(aboutPortrait);

type SeoProps = {
  title: string;
  description: string;
  image?: string;
  type?: "website" | "article";
  noindex?: boolean;
  /** Set false for a page that already supplies its own complete, branded title (e.g. Home). */
  suffixSiteName?: boolean;
};

export default function Seo({
  title,
  description,
  image = DEFAULT_IMAGE,
  type = "website",
  noindex = false,
  suffixSiteName = true,
}: SeoProps) {
  const location = useLocation();
  const fullTitle = suffixSiteName ? `${title} | ${SITE_NAME}` : title;
  const canonicalUrl = absoluteUrl(location.pathname);
  const resolvedImage = absoluteUrl(image);

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={resolvedImage} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={resolvedImage} />
    </Helmet>
  );
}
