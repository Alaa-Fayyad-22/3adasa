import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import Index from "./pages/Index";
import About from "./pages/About";
import Gallery from "./pages/Gallery";
import Reservation from "./pages/Reservation";
import BookingAction from "./pages/BookingAction";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import NotFound from "./pages/NotFound";

// During the build-time prerender pass (scripts/prerender.ts sets this flag
// before any app code runs) render Framer Motion elements in their static
// initial state — no mount animations run in the headless browser, so the
// captured HTML matches what every client produces on its first hydration
// render. On a real client the flag is undefined, so motion behaves normally.
const isPrerender =
  typeof window !== "undefined" && window.__PRERENDER__ === true;

function App() {
  return (
    <MotionConfig isStatic={isPrerender}>
      <BrowserRouter>
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
      </BrowserRouter>
    </MotionConfig>
  );
}

export default App;
