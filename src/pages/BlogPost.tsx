import { Link, Navigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Seo from "../components/Seo";
import JsonLd from "../components/JsonLd";
import { photographer } from "../data/photos";
import { posts } from "../data/posts";

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = posts.find((p) => p.slug === slug);

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  const formattedDate = new Date(post.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <Seo
        title={post.title}
        description={post.excerpt}
        image={post.coverImage}
        type="article"
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: post.excerpt,
          image: post.coverImage,
          datePublished: post.date,
          author: {
            "@type": "Person",
            name: photographer.name,
          },
        }}
      />
      <Navbar />
      <main className="min-h-screen bg-bg px-6 pb-16 pt-24 md:px-10 md:pt-32 lg:px-16">
        <article className="mx-auto max-w-[800px]">
          <Link
            to="/blog"
            className="mb-8 inline-block text-sm text-muted transition-colors hover:text-text-primary"
          >
            ← Back to blog
          </Link>

          <time
            dateTime={post.date}
            className="text-xs uppercase tracking-[0.2em] text-muted"
          >
            {formattedDate}
          </time>
          <h1 className="mb-6 mt-4 font-display text-3xl italic text-text-primary md:text-5xl">
            {post.title}
          </h1>

          <div className="mb-10 aspect-[16/9] overflow-hidden rounded-3xl border border-stroke bg-surface">
            <img
              src={post.coverImage}
              alt={post.title}
              className="h-full w-full object-cover"
            />
          </div>

          <p className="text-base leading-relaxed text-muted md:text-lg">
            {post.content}
          </p>
        </article>
      </main>
      <Footer />
    </>
  );
}
