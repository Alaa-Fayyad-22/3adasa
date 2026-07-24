import { Helmet } from "react-helmet-async";
import {  photographer } from "../data/photos";

const SITE_NAME = `${photographer.name} — Photography`;
const DEFAULT_IMAGE = "https://3adasa-lb.vercel.app/about-image_logo.jpeg";

type SeoProps = {
  title: string;
  description: string;
  image?: string;
  type?: "website" | "article";
};

export default function Seo({
  title,
  description,
  image = DEFAULT_IMAGE,
  type = "website",
}: SeoProps) {
  const fullTitle = title === SITE_NAME ? title : `${title} | ${SITE_NAME}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
}
