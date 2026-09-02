import { Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import About from "./pages/About";
import Gallery from "./pages/Gallery";
import Reservation from "./pages/Reservation";
import BookingAction from "./pages/BookingAction";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import NotFound from "./pages/NotFound";

/**
 * The route table, shared by the client entry (wrapped in <BrowserRouter> in
 * App.tsx) and the build-time prerender entry (wrapped in <StaticRouter> in
 * entry-server.tsx). Keeping it in one place means both renders resolve every
 * path to exactly the same component tree.
 */
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/about" element={<About />} />
      <Route path="/gallery" element={<Gallery />} />
      <Route path="/reservation" element={<Reservation />} />
      <Route path="/booking-action" element={<BookingAction />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/blog/:slug" element={<BlogPost />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
