import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Seo from "../components/Seo";
import JsonLd from "../components/JsonLd";
import { absoluteUrl } from "../lib/seo";
import { posts, formatPostDate } from "../data/posts";

export default function Blog() {
  return (
    <>
      <Seo
        title="Blog — Notes from the Field"
        description="Read notes on photography from Jad Daou: behind-the-scenes stories from portrait sessions, editorial sets, street photography, and landscape shoots today."
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Blog — Notes from the Field",
          url: absoluteUrl("/blog"),
          mainEntity: {
            "@type": "ItemList",
            itemListElement: posts.map((post, index) => ({
              "@type": "ListItem",
              position: index + 1,
              url: absoluteUrl(`/blog/${post.slug}`),
              name: post.title,
            })),
          },
        }}
      />
      <Navbar />
      <main className="min-h-screen bg-bg px-6 pb-16 pt-24 md:px-10 md:pt-32 lg:px-16">
        <div className="mx-auto max-w-[1200px]">
          <span className="text-xs uppercase tracking-[0.3em] text-muted">
            Blog
          </span>
          <h1 className="mb-10 mt-4 font-display text-4xl text-text-primary md:text-5xl">
            Notes from the <span className="italic">field</span>
          </h1>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {posts.map((post) => (
              <Link
                key={post.slug}
                to={`/blog/${post.slug}`}
                className="group flex flex-col overflow-hidden rounded-3xl border border-stroke bg-surface"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={post.coverImage}
                    alt={post.coverAlt}
                    loading="lazy"
                    className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                      post.coverFocus === "top" ? "object-top" : "object-center"
                    }`}
                  />
                </div>
                <div className="flex flex-1 flex-col gap-2 p-6">
                  <time
                    dateTime={post.date}
                    className="text-xs uppercase tracking-[0.2em] text-muted"
                  >
                    {formatPostDate(post.date)}
                  </time>
                  <h2 className="font-display text-xl text-text-primary md:text-2xl">
                    {post.title}
                  </h2>
                  <p className="text-sm text-muted">{post.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
